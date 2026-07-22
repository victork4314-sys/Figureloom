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
