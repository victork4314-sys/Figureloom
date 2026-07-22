from pathlib import Path
import tempfile
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class FigureLoomBioRegressionTests(unittest.TestCase):
    def test_repeat_instruction_must_be_first(self) -> None:
        instructions = parse("Say Starting.\nRun this program 2 times.\n")
        with self.assertRaisesRegex(FigureLoomBioError, "beginning"):
            Runner(Path("analysis.flbio")).run(instructions)

    def test_normal_order_sorts_numbers_as_numbers(self) -> None:
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

    def test_column_errors_are_plain(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,status\none,passed\n",
                encoding="utf-8",
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
