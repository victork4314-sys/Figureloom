from pathlib import Path
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class SequenceManagementTests(unittest.TestCase):
    def test_sequence_names_duplicates_order_and_range(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">sample-17\nAACCGGTT\n"
                ">duplicate\nAACCGGTT\n"
                ">short\nACGT\n",
                encoding="utf-8",
            )
            program = root / "manage.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Remove duplicate sequences.\n"
                "Put the longest sequences first.\n"
                "Show the sequence lengths.\n"
                "Rename the sequence sample-17 to chosen.\n"
                "Add run- to the start of every sequence name.\n"
                "Add -clean to the end of every sequence name.\n"
                "Keep bases 2 to 4.\n"
                "Save the result as managed.fasta.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(
                parse(program.read_text(encoding="utf-8"))
            ).render()

            self.assertIn("Sequence lengths", output)
            self.assertEqual(
                (root / "managed.fasta").read_text(encoding="utf-8"),
                ">run-chosen-clean\nACC\n"
                ">run-short-clean\nCGT\n",
            )

    def test_find_and_remove_named_sequence(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">long\nAACCGGTT\n>short\nACGT\n",
                encoding="utf-8",
            )
            program = root / "find.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Find the shortest sequence.\n"
                "Find the longest sequence.\n"
                "Remove the sequence named short.\n"
                "Save the result as remaining.fasta.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(
                parse(program.read_text(encoding="utf-8"))
            ).render()

            self.assertIn("Shortest sequence", output)
            self.assertIn("Longest sequence", output)
            self.assertEqual(
                (root / "remaining.fasta").read_text(encoding="utf-8"),
                ">long\nAACCGGTT\n",
            )


if __name__ == "__main__":
    unittest.main()
