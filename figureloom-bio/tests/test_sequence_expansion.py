from pathlib import Path
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class SequenceExpansionTests(unittest.TestCase):
    def test_named_sequence_and_name_tools(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">sample-17\nATGCGT\n>other\nATGCGT\n>third\nAAAA\n",
                encoding="utf-8",
            )
            program = root / "names.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Remove duplicate sequences.\n"
                "Use the sequence named sample-17.\n"
                "Rename the sequence sample-17 to chosen.\n"
                "Add run- to the start of every sequence name.\n"
                "Add -clean to the end of every sequence name.\n"
                "Save the result as chosen.fasta.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "chosen.fasta").read_text(encoding="utf-8"),
                ">run-chosen-clean\nATGCGT\n",
            )

    def test_lengths_range_and_quality(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(
                "@long\nAACCGGTT\n+\nIIIIIIII\n@short\nACGT\n+\n!!!!\n",
                encoding="utf-8",
            )
            program = root / "quality.flbio"
            program.write_text(
                "Open the file reads.fastq.\n"
                "Check the quality.\n"
                "Put the longest sequences first.\n"
                "Show the sequence lengths.\n"
                "Keep bases 2 to 4.\n"
                "Save the result as ranged.fastq.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertIn("Read quality", output)
            self.assertIn("Sequence lengths", output)
            self.assertEqual(
                (root / "ranged.fastq").read_text(encoding="utf-8"),
                "@long\nACC\n+\nIII\n@short\nCGT\n+\n!!!\n",
            )

    def test_approved_aliases(self) -> None:
        instructions = parse(
            "Keep only sequences longer than 500 bases.\n"
            "Keep only sequences containing ATG.\n"
            "Convert the DNA to RNA.\n"
            "Convert the RNA to DNA.\n"
        )
        self.assertEqual(
            [instruction.action for instruction in instructions],
            ["keep_longer_than", "keep_only_motif", "dna_to_rna", "rna_to_dna"],
        )


if __name__ == "__main__":
    unittest.main()
