from pathlib import Path
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class ApprovedWorkflowTests(unittest.TestCase):
    def test_approved_sentences_parse(self) -> None:
        source = (
            "Keep only sequences longer than 500 bases.\n"
            "Keep only sequences containing ATG.\n"
            "Use the sequence named sample-17.\n"
            "Convert the DNA to RNA.\n"
            "Convert the RNA to DNA.\n"
            "Translate the DNA into protein.\n"
            "Show the first 10 sequences.\n"
            "Check the quality.\n"
            "Show the quality report.\n"
            "Remove reads with low quality.\n"
            "Remove adapter sequences.\n"
            "Cut 10 bases from the beginning of each read.\n"
            "Cut 5 bases from the end of each read.\n"
            "Open the files forward.fastq and reverse.fastq as a pair.\n"
            "Save the pair as clean-forward.fastq and clean-reverse.fastq.\n"
        )
        actions = [instruction.action for instruction in parse(source)]
        self.assertEqual(
            actions,
            [
                "keep_strict_length",
                "keep_motif",
                "use_sequence",
                "to_rna",
                "to_dna",
                "translate",
                "show_first_sequences",
                "check_quality",
                "show_quality_report",
                "remove_low_quality_default",
                "remove_adapters",
                "cut_start",
                "cut_end",
                "open_pair",
                "save_pair",
            ],
        )

    def test_approved_fasta_workflow_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">sample-17 chosen\nATGGCCATTGTAATGGGCCGCTGA\n"
                ">short\nATG\n"
                ">ambiguous\nATGNNNCCC\n",
                encoding="utf-8",
            )
            program = root / "approved-fasta.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Keep only sequences longer than 3 bases.\n"
                "Remove sequences containing N.\n"
                "Keep only sequences containing ATG.\n"
                "Use the sequence named sample-17.\n"
                "Translate the DNA into protein.\n"
                "Show the first 10 sequences.\n"
                "Save the result as proteins.fasta.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertIn("sample-17", output)
            self.assertIn("MAIVMGR*", (root / "proteins.fasta").read_text(encoding="utf-8"))

    def test_approved_fastq_quality_and_adapter_workflow_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            adapter = "AGATCGGAAGAGCACACGTCTGAACTCCAGTCA"
            (root / "reads.fastq").write_text(
                "@low\nACGTACGT\n+\n########\n"
                f"@adapter\nACGTACGT{adapter}\n+\n" + "I" * (8 + len(adapter)) + "\n",
                encoding="utf-8",
            )
            program = root / "approved-fastq.flbio"
            program.write_text(
                "Open the file reads.fastq.\n"
                "Check the quality.\n"
                "Remove reads with low quality.\n"
                "Remove adapter sequences.\n"
                "Cut 2 bases from the beginning of each read.\n"
                "Cut 2 bases from the end of each read.\n"
                "Check the quality again.\n"
                "Show the quality report.\n"
                "Save the result as clean.fastq.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertEqual(
                (root / "clean.fastq").read_text(encoding="utf-8"),
                "@adapter\nGTAC\n+\nIIII\n",
            )
            self.assertIn("Quality report", output)
            self.assertIn("40.0", output)

    def test_repeated_paired_fastq_outputs_stay_matched(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "forward.fastq").write_text(
                "@one/1\nACGTAC\n+\nIIIIII\n"
                "@two/1\nACGTAC\n+\nIIIIII\n",
                encoding="utf-8",
            )
            (root / "reverse.fastq").write_text(
                "@one/2\nTGCATG\n+\nIIIIII\n"
                "@two/2\nTGCATG\n+\n######\n",
                encoding="utf-8",
            )
            program = root / "approved-pair.flbio"
            program.write_text(
                "Run this program 2 times.\n"
                "Open the files forward.fastq and reverse.fastq as a pair.\n"
                "Remove reads with low quality.\n"
                "Save the pair as clean-forward.fastq and clean-reverse.fastq.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            for run in (1, 2):
                self.assertEqual(
                    (root / f"clean-forward-{run}.fastq").read_text(encoding="utf-8"),
                    "@one/1\nACGTAC\n+\nIIIIII\n",
                )
                self.assertEqual(
                    (root / f"clean-reverse-{run}.fastq").read_text(encoding="utf-8"),
                    "@one/2\nTGCATG\n+\nIIIIII\n",
                )


if __name__ == "__main__":
    unittest.main()
