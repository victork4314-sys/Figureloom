from pathlib import Path
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class GenomicsCoreTests(unittest.TestCase):
    def test_merge_statistics_validation_and_unique_names(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "a.fasta").write_text(
                ">sample\nACGTNN\n>sample\nACGT--\n", encoding="utf-8"
            )
            (root / "b.fasta").write_text(">other\nGGGG\n", encoding="utf-8")
            program = root / "merge.flbio"
            program.write_text(
                "Open the file a.fasta.\n"
                "Merge the sequences with b.fasta.\n"
                "Make duplicate sequence names unique.\n"
                "Remove gaps from the sequences.\n"
                "Calculate sequence statistics.\n"
                "Validate the sequences.\n"
                "Save the result as merged.fasta.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertIn("Sequence statistics", output)
            self.assertIn("Sequence validation", output)
            result = (root / "merged.fasta").read_text(encoding="utf-8")
            self.assertIn(">sample\nACGTNN", result)
            self.assertIn(">sample-2\nACGT", result)
            self.assertIn(">other\nGGGG", result)

    def test_name_and_ambiguous_filters(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "input.fasta").write_text(
                ">keep-one\nACGT\n>keep-two\nACGN\n>drop\nNNNN\n",
                encoding="utf-8",
            )
            program = root / "filter.flbio"
            program.write_text(
                "Open the file input.fasta.\n"
                "Keep sequences with names containing keep.\n"
                "Keep sequences with at most 1 ambiguous bases.\n"
                "Save the result as kept.fasta.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            result = (root / "kept.fasta").read_text(encoding="utf-8")
            self.assertIn(">keep-one", result)
            self.assertIn(">keep-two", result)
            self.assertNotIn(">drop", result)

    def test_split_sequences(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "input.fasta").write_text(
                ">a\nAAAA\n>b\nCCCC\n>c\nGGGG\n", encoding="utf-8"
            )
            program = root / "split.flbio"
            program.write_text(
                "Open the file input.fasta.\n"
                "Split the sequences into files with 2 sequences each as chunk.fasta.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertTrue((root / "chunk-part-1.fasta").exists())
            self.assertTrue((root / "chunk-part-2.fasta").exists())
            self.assertIn(">c", (root / "chunk-part-2.fasta").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
