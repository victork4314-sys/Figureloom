from pathlib import Path
import tempfile
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class FigureLoomBioCoreTests(unittest.TestCase):
    def test_plain_sentence_program_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,status\n"
                "one,treated,passed\n"
                "two,control,passed\n"
                "three,treated,failed\n",
                encoding="utf-8",
            )
            program = root / "analysis.flbio"
            program.write_text(
                "Open the file samples.csv.\n"
                "Keep only rows marked treated under condition.\n"
                "Remove rows marked failed under status.\n"
                "Count the rows.\n"
                "Show the result.\n"
                "Save the result as clean.csv.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()

            self.assertIn("Rows\n\n1", output)
            self.assertIn("one", output)
            self.assertNotIn("three", output)
            self.assertEqual(
                (root / "clean.csv").read_text(encoding="utf-8"),
                "sample,condition,status\n"
                "one,treated,passed\n",
            )

    def test_program_can_repeat_and_number_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,status\none,passed\ntwo,failed\n", encoding="utf-8"
            )
            program = root / "repeat.flbio"
            program.write_text(
                "Run this program 3 times.\n\n"
                "Open the file samples.csv.\n"
                "Keep only rows marked passed under status.\n"
                "Save the result as clean.csv.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()

            for number in range(1, 4):
                self.assertEqual(
                    (root / f"clean-{number}.csv").read_text(encoding="utf-8"),
                    "sample,status\none,passed\n",
                )
                self.assertIn(f"Run {number} of 3", output)
            self.assertFalse((root / "clean.csv").exists())

    def test_program_can_repeat_fastq_and_number_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(
                "@good\nACGTACGT\n+\nIIIIIIII\n"
                "@bad\nACGT\n+\n!!!!\n",
                encoding="utf-8",
            )
            program = root / "repeat-fastq.flbio"
            program.write_text(
                "Run this program 3 times.\n\n"
                "Open the file reads.fastq.\n"
                "Keep reads with average quality at least 20.\n"
                "Trim 2 bases from the start.\n"
                "Save the reads as clean.fastq.\n",
                encoding="utf-8",
            )

            Runner(program).run(parse(program.read_text(encoding="utf-8")))

            for number in range(1, 4):
                self.assertEqual(
                    (root / f"clean-{number}.fastq").read_text(encoding="utf-8"),
                    "@good\nGTACGT\n+\nIIIIII\n",
                )

    def test_repeat_instruction_must_be_first(self) -> None:
        instructions = parse(
            "Say Starting.\n"
            "Run this program 2 times.\n"
        )
        with self.assertRaisesRegex(FigureLoomBioError, "beginning"):
            Runner(Path("analysis.flbio")).run(instructions)

    def test_table_preparation_sentences_run_together(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,status,age,unused\n"
                "sample-01,treated,passed,5,a\n"
                "sample-01,treated,failed,99,b\n"
                "sample-02,control,,12,c\n"
                "sample-03,treated,failed,,d\n",
                encoding="utf-8",
            )
            (root / "metadata.csv").write_text(
                "sample,lab\n"
                "sample-01,south\n"
                "sample-02,north\n"
                "sample-03,west\n",
                encoding="utf-8",
            )
            program = root / "prepare.flbio"
            program.write_text(
                "Open the file samples.csv.\n"
                "Remove duplicate rows using sample.\n"
                "Replace empty values under status with unknown.\n"
                "Change control to untreated under condition.\n"
                "Combine it with metadata.csv using sample.\n"
                "Keep only the columns sample, condition, status, age, and lab.\n"
                "Rename the column condition to group.\n"
                "Put the largest age first.\n"
                "Save the result as prepared.csv.\n",
                encoding="utf-8",
            )

            Runner(program).run(parse(program.read_text(encoding="utf-8")))

            self.assertEqual(
                (root / "prepared.csv").read_text(encoding="utf-8"),
                "sample,group,status,age,lab\n"
                "sample-02,untreated,unknown,12,north\n"
                "sample-01,treated,passed,5,south\n"
                "sample-03,treated,failed,,west\n",
            )

    def test_smallest_and_normal_order_sort_numbers_as_numbers(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "numbers.csv").write_text(
                "sample,age\nold,100\nyoung,9\nmiddle,20\n",
                encoding="utf-8",
            )
            program = root / "sort.flbio"
            program.write_text(
                "Open the file numbers.csv.\n"
                "Put the rows in order by age.\n"
                "Save the result as ordered.csv.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "ordered.csv").read_text(encoding="utf-8"),
                "sample,age\nyoung,9\nmiddle,20\nold,100\n",
            )

            program.write_text(
                "Open the file numbers.csv.\n"
                "Put the smallest age first.\n"
                "Save the result as smallest.csv.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "smallest.csv").read_text(encoding="utf-8"),
                "sample,age\nyoung,9\nmiddle,20\nold,100\n",
            )

    def test_fasta_workflow_filters_transforms_and_saves(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">alpha first\nATGCGTAA\n"
                ">beta\nNNATG\n"
                ">tiny\nAT\n",
                encoding="utf-8",
            )
            program = root / "sequences.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Keep sequences at least 5 bases long.\n"
                "Keep sequences containing ATG.\n"
                "Find the reverse complement.\n"
                "Calculate the GC content.\n"
                "Count the sequences.\n"
                "Save the sequences as cleaned.fasta.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()

            self.assertIn("Sequences\n\n2", output)
            self.assertIn("GC content", output)
            self.assertEqual(
                (root / "cleaned.fasta").read_text(encoding="utf-8"),
                ">alpha first\nTTACGCAT\n"
                ">beta\nCATNN\n",
            )

    def test_translate_and_compare_sequences(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "coding.fasta").write_text(
                ">same\nATGGCC\n>changed\nATGAAA\n",
                encoding="utf-8",
            )
            (root / "reference.fasta").write_text(
                ">same\nATGGCC\n>changed\nATGAAG\n",
                encoding="utf-8",
            )
            compare_program = root / "compare.flbio"
            compare_program.write_text(
                "Open the file coding.fasta.\n"
                "Compare the sequences with reference.fasta.\n",
                encoding="utf-8",
            )

            output = Runner(compare_program).run(
                parse(compare_program.read_text(encoding="utf-8"))
            ).render()

            self.assertIn("Exact matches\n1", output)
            self.assertIn("83.33", output)

            translate_program = root / "translate.flbio"
            translate_program.write_text(
                "Open the file coding.fasta.\n"
                "Translate the sequences.\n"
                "Save the sequences as proteins.fasta.\n",
                encoding="utf-8",
            )
            Runner(translate_program).run(
                parse(translate_program.read_text(encoding="utf-8"))
            )
            self.assertEqual(
                (root / "proteins.fasta").read_text(encoding="utf-8"),
                ">same\nMA\n>changed\nMK\n",
            )

    def test_fastq_quality_requires_fastq(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(">one\nACGT\n", encoding="utf-8")
            program = root / "bad.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Keep reads with average quality at least 20.\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(FigureLoomBioError, "FASTQ quality"):
                Runner(program).run(parse(program.read_text(encoding="utf-8")))

    def test_instruction_keeps_periods_inside_filename(self) -> None:
        instruction = parse("Open the file samples.csv.")[0]
        self.assertEqual(instruction.values, ("samples.csv",))

    def test_instructions_need_periods(self) -> None:
        with self.assertRaisesRegex(FigureLoomBioError, "needs a period"):
            parse("Open the file samples.csv")

    def test_column_errors_are_plain(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,status\none,passed\n", encoding="utf-8"
            )
            program = root / "analysis.flbio"
            program.write_text(
                "Open the file samples.csv.\n"
                "Keep only rows marked treated under condition.\n",
                encoding="utf-8",
            )

            with self.assertRaises(FigureLoomBioError) as caught:
                Runner(program).run(parse(program.read_text(encoding="utf-8")))

            message = caught.exception.plain_message()
            self.assertIn("I could not find a column called condition", message)
            self.assertIn("sample", message)
            self.assertIn("status", message)


if __name__ == "__main__":
    unittest.main()
