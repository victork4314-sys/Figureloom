from pathlib import Path
import gzip
import tempfile
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.translators import translate_source


class PlatformExpansionTests(unittest.TestCase):
    def test_streaming_fasta_merge_filter_and_save(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "first.fasta").write_text(
                ">one\nAAAA\n>two\nAA\n",
                encoding="utf-8",
            )
            (root / "second.fasta").write_text(
                ">three\nCCCCCC\n",
                encoding="utf-8",
            )
            program = root / "merge.flbio"
            program.write_text(
                "Open the large file first.fasta.\n"
                "Merge the result with second.fasta.\n"
                "Keep only sequences longer than 3 bases.\n"
                "Count the sequences.\n"
                "Save the result as merged.fasta.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertIn("Opened in streaming mode", output)
            self.assertIn("Sequences\n\n2", output)
            self.assertEqual(
                (root / "merged.fasta").read_text(encoding="utf-8"),
                ">one\nAAAA\n>three\nCCCCCC\n",
            )

    def test_gzipped_fasta_streaming(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with gzip.open(root / "genome.fasta.gz", "wt", encoding="utf-8") as handle:
                handle.write(">genome\nACGTACGT\n")
            program = root / "gzip.flbio"
            program.write_text(
                "Open the file genome.fasta.gz.\n"
                "Find the reverse complement.\n"
                "Save the result as reverse.fasta.gz.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            with gzip.open(root / "reverse.fasta.gz", "rt", encoding="utf-8") as handle:
                self.assertEqual(handle.read(), ">genome\nACGTACGT\n")

    def test_append_table_rows_with_union_columns(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "a.csv").write_text("sample,status\na,ok\n", encoding="utf-8")
            (root / "b.csv").write_text("sample,group\nb,test\n", encoding="utf-8")
            program = root / "tables.flbio"
            program.write_text(
                "Open the file a.csv.\n"
                "Add the rows from b.csv.\n"
                "Save the result as merged.csv.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "merged.csv").read_text(encoding="utf-8"),
                "sample,status,group\na,ok,\nb,,test\n",
            )

    def test_external_tool_needs_explicit_permission(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            program = root / "tool.flbio"
            program.write_text("Run the tool echo with hello.\n", encoding="utf-8")
            with self.assertRaises(FigureLoomBioError) as raised:
                Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertIn("--allow-tools", str(raised.exception))

    def test_translates_to_common_workflow_languages(self) -> None:
        source = (
            "Open the file reads.fastq.\n"
            "Remove reads shorter than 50 bases.\n"
            "Save the result as clean.fastq.\n"
        )
        bash = translate_source(source, "bash", program_name="clean.flbio")
        python = translate_source(source, "python", program_name="clean.flbio")
        r = translate_source(source, "r", program_name="clean.flbio")
        snakemake = translate_source(source, "snakemake", program_name="clean.flbio")
        nextflow = translate_source(source, "nextflow", program_name="clean.flbio")
        self.assertIn("seqkit seq -m 50", bash.content)
        self.assertIn("subprocess.run", python.content)
        self.assertIn("system2", r.content)
        self.assertIn("rule figureloom_bio", snakemake.content)
        self.assertIn("process FIGURELOOM_BIO", nextflow.content)


if __name__ == "__main__":
    unittest.main()
