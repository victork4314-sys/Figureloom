from pathlib import Path
import os
import tempfile
import unittest
from unittest.mock import patch

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.streaming_fasta import run_streaming_if_needed
from figureloom_bio.translators import translate_source
from figureloom_bio.workflow_expansion import normalize_streaming_instructions


class WorkflowExpansionTests(unittest.TestCase):
    def test_table_rows_append_with_union_columns(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "first.csv").write_text("sample,status\na,ok\n", encoding="utf-8")
            (root / "second.csv").write_text("sample,group\nb,test\n", encoding="utf-8")
            program = root / "append.flbio"
            program.write_text(
                "Open the file first.csv.\n"
                "Add the rows from second.csv.\n"
                "Save the result as merged.csv.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "merged.csv").read_text(encoding="utf-8"),
                "sample,status,group\na,ok,\nb,,test\n",
            )

    def test_open_sequence_files_together(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "one.fasta").write_text(">one\nAAAA\n", encoding="utf-8")
            (root / "two.fasta").write_text(">two\nCCCC\n", encoding="utf-8")
            program = root / "merge.flbio"
            program.write_text(
                "Open the files one.fasta, two.fasta together.\n"
                "Save the result as merged.fasta.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "merged.fasta").read_text(encoding="utf-8"),
                ">one\nAAAA\n>two\nCCCC\n",
            )

    def test_friendly_fasta_merge_uses_disk_streaming(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "one.fasta").write_text(">one\nAAAA\n", encoding="utf-8")
            (root / "two.fasta").write_text(">two\nCCCC\n", encoding="utf-8")
            program = root / "stream-merge.flbio"
            program.write_text(
                "Open the files one.fasta, two.fasta together.\n"
                "Save the result as streamed.fasta.\n",
                encoding="utf-8",
            )
            instructions = normalize_streaming_instructions(
                parse(program.read_text(encoding="utf-8"))
            )
            self.assertEqual(
                [instruction.action for instruction in instructions],
                ["open_file", "merge_sequences", "save_result"],
            )
            with patch.dict(os.environ, {"FIGURELOOM_STREAM_THRESHOLD": "1"}):
                output = run_streaming_if_needed(program.resolve(), instructions)
            self.assertIsNotNone(output)
            self.assertEqual(
                (root / "streamed.fasta").read_text(encoding="utf-8"),
                ">one\nAAAA\n>two\nCCCC\n",
            )

    def test_tool_execution_requires_explicit_permission(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            program = root / "tool.flbio"
            program.write_text("Run the tool echo with hello.\n", encoding="utf-8")
            with self.assertRaises(FigureLoomBioError) as raised:
                Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertIn("--allow-tools", str(raised.exception))

    def test_translates_current_genomics_commands(self) -> None:
        source = (
            "Open the file genome.fasta.\n"
            "Merge the sequences with more.fasta.\n"
            "Remove gaps from the sequences.\n"
            "Convert the DNA to RNA.\n"
            "Put the longest sequences first.\n"
            "Calculate sequence statistics.\n"
            "Save the result as prepared.fasta.\n"
        )
        bash = translate_source(source, "bash", program_name="genome.flbio")
        python = translate_source(source, "python", program_name="genome.flbio")
        r = translate_source(source, "r", program_name="genome.flbio")
        snakemake = translate_source(source, "snakemake", program_name="genome.flbio")
        nextflow = translate_source(source, "nextflow", program_name="genome.flbio")

        self.assertIn("seq --dna2rna", bash.content)
        self.assertIn("sort -l -r -2", bash.content)
        self.assertIn("seqkit stats -a -T", bash.content)
        self.assertIn("subprocess.run", python.content)
        self.assertIn("system2", r.content)
        self.assertIn("rule figureloom_bio", snakemake.content)
        self.assertIn("process FIGURELOOM_BIO", nextflow.content)
        self.assertIn("launchDir", nextflow.content)


if __name__ == "__main__":
    unittest.main()
