from pathlib import Path
import os
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.streaming_fasta import run_streaming_if_needed


class StreamingFastaTests(unittest.TestCase):
    def test_large_fasta_streams_merges_and_saves(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "a.fasta").write_text(
                ">one\nACGTNN\n>dup\nACGT\n", encoding="utf-8"
            )
            (root / "b.fasta").write_text(">dup\nGGGG\n", encoding="utf-8")
            program = root / "program.flbio"
            source = (
                "Open the file a.fasta.\n"
                "Merge the sequences with b.fasta.\n"
                "Make duplicate sequence names unique.\n"
                "Keep sequences with at most 2 ambiguous bases.\n"
                "Calculate sequence statistics.\n"
                "Save the result as merged.fasta.\n"
            )
            program.write_text(source, encoding="utf-8")
            previous = os.environ.get("FIGURELOOM_STREAM_THRESHOLD")
            os.environ["FIGURELOOM_STREAM_THRESHOLD"] = "1"
            try:
                output = run_streaming_if_needed(program, parse(source))
            finally:
                if previous is None:
                    os.environ.pop("FIGURELOOM_STREAM_THRESHOLD", None)
                else:
                    os.environ["FIGURELOOM_STREAM_THRESHOLD"] = previous
            self.assertIsNotNone(output)
            self.assertIn("Huge FASTA streaming", output.render())
            result = (root / "merged.fasta").read_text(encoding="utf-8")
            self.assertIn(">dup-2", result)
            self.assertIn(">one", result)

    def test_large_fasta_split(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "input.fasta").write_text(
                ">a\nAAAA\n>b\nCCCC\n>c\nGGGG\n", encoding="utf-8"
            )
            program = root / "program.flbio"
            source = (
                "Open the file input.fasta.\n"
                "Split the sequences into files with 2 sequences each as part.fasta.\n"
            )
            program.write_text(source, encoding="utf-8")
            previous = os.environ.get("FIGURELOOM_STREAM_THRESHOLD")
            os.environ["FIGURELOOM_STREAM_THRESHOLD"] = "1"
            try:
                run_streaming_if_needed(program, parse(source))
            finally:
                if previous is None:
                    os.environ.pop("FIGURELOOM_STREAM_THRESHOLD", None)
                else:
                    os.environ["FIGURELOOM_STREAM_THRESHOLD"] = previous
            self.assertTrue((root / "part-part-1.fasta").exists())
            self.assertTrue((root / "part-part-2.fasta").exists())


if __name__ == "__main__":
    unittest.main()
