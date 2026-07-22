from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.translators import TARGET_EXTENSIONS, translate_source


class InteroperabilityTests(unittest.TestCase):
    def test_parser_accepts_bridge_commands(self) -> None:
        instructions = parse(
            "Merge the files first.fasta and second.fasta.\n"
            "Add the rows from more.csv.\n"
            "Run the tool fastqc with reads.fastq --outdir qc.\n"
        )
        self.assertEqual(
            [item.action for item in instructions],
            ["merge_files", "append_rows", "run_tool"],
        )

    def test_merge_files_appends_sequence_records(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "first.fasta").write_text(">one\nAAAA\n", encoding="utf-8")
            (root / "second.fasta").write_text(">two\nCCCC\n", encoding="utf-8")
            program = root / "merge.flbio"
            program.write_text(
                "Merge the files first.fasta and second.fasta.\n"
                "Save the result as merged.fasta.\n",
                encoding="utf-8",
            )

            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "merged.fasta").read_text(encoding="utf-8"),
                ">one\nAAAA\n>two\nCCCC\n",
            )

    def test_append_rows_uses_the_union_of_columns(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "first.csv").write_text(
                "sample,status\na,passed\n",
                encoding="utf-8",
            )
            (root / "more.csv").write_text(
                "sample,group\nb,treated\n",
                encoding="utf-8",
            )
            program = root / "append.flbio"
            program.write_text(
                "Open the file first.csv.\n"
                "Add the rows from more.csv.\n"
                "Save the result as combined.csv.\n",
                encoding="utf-8",
            )

            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "combined.csv").read_text(encoding="utf-8"),
                "sample,status,group\na,passed,\nb,,treated\n",
            )

    def test_installed_tools_are_denied_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            program = Path(folder) / "tool.flbio"
            program.write_text(
                "Run the tool fastqc with reads.fastq.\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(Exception, "--allow-tools"):
                Runner(program).run(parse(program.read_text(encoding="utf-8")))

    @patch("figureloom_bio.workflow_bridge.shutil.which", return_value="/usr/bin/fastqc")
    @patch("figureloom_bio.workflow_bridge.subprocess.run")
    def test_installed_tools_use_an_argument_list(self, run_mock, _which_mock) -> None:
        run_mock.return_value = subprocess.CompletedProcess(
            ["/usr/bin/fastqc", "reads.fastq"],
            0,
            stdout="report ready\n",
            stderr="",
        )
        with tempfile.TemporaryDirectory() as folder:
            program = Path(folder) / "tool.flbio"
            program.write_text(
                "Run the tool fastqc with reads.fastq --outdir qc.\n",
                encoding="utf-8",
            )
            runner = Runner(program)
            runner.allow_tools = True
            output = runner.run(parse(program.read_text(encoding="utf-8"))).render()

        command = run_mock.call_args.args[0]
        self.assertEqual(
            command,
            ["/usr/bin/fastqc", "reads.fastq", "--outdir", "qc"],
        )
        self.assertFalse(run_mock.call_args.kwargs.get("shell", False))
        self.assertIn("Ran fastqc", output)
        self.assertIn("report ready", output)

    def test_every_translation_target_generates_a_workflow(self) -> None:
        source = (
            "Open the file reads.fastq.\n"
            "Remove reads shorter than 50 bases.\n"
            "Save the result as clean.fastq.\n"
        )
        for target, extension in TARGET_EXTENSIONS.items():
            with self.subTest(target=target):
                translated = translate_source(source, target, program_name="clean.flbio")
                self.assertEqual(translated.extension, extension)
                self.assertTrue(translated.content.strip())
                self.assertIn("clean.fastq", translated.content)
                self.assertIn("seqkit", translated.requirements)

    def test_tool_commands_are_preserved_in_translation(self) -> None:
        translated = translate_source(
            "Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq.\n",
            "bash",
        )
        self.assertIn("minimap2", translated.content)
        self.assertIn("minimap2", translated.requirements)


if __name__ == "__main__":
    unittest.main()
