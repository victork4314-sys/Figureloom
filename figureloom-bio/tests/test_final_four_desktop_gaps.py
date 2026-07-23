from __future__ import annotations

import ast
from pathlib import Path
import tempfile
import unittest

from figureloom_bio import Runner
from figureloom_bio.desktop_tools import run_quick_test
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse


ROOT = Path(__file__).resolve().parents[1]


class FinalFourDesktopGapTests(unittest.TestCase):
    def test_vulcano_spelling_retries_into_the_real_command(self) -> None:
        instructions = parse("Draw a vulcano plot from effect and p_value.")
        self.assertEqual(len(instructions), 1)
        self.assertEqual(instructions[0].action, "volcano_plot")

    def test_unknown_instruction_has_simple_specific_help(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Create something scientific somehow.")
        message = caught.exception.plain_message()
        self.assertIn("What happened", message)
        self.assertIn("How to fix it", message)
        self.assertIn("Instruction read", message)

    def test_runtime_error_has_a_fix_not_only_the_raw_message(self) -> None:
        message = FigureLoomBioError("I could not find the column missing.", line_number=4).plain_message()
        self.assertIn("Line 4", message)
        self.assertIn("What happened", message)
        self.assertIn("How to fix it", message)
        self.assertIn("first row", message)

    def test_real_volcano_contains_groups_and_cutoff_lines(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "expression.csv").write_text(
                "gene,effect,p_value\nup,2.4,0.0005\ndown,-2.1,0.002\nflat,0.2,0.8\n",
                encoding="utf-8",
            )
            program = root / "volcano.flbio"
            program.write_text(
                "Open the file expression.csv.\nCreate a volcano plot using effect and p_value.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            svg = (root / "volcano-plot.svg").read_text(encoding="utf-8")
            self.assertIn('data-significance="higher"', svg)
            self.assertIn('data-significance="lower"', svg)
            self.assertIn('data-significance="not-significant"', svg)
            self.assertIn("stroke-dasharray", svg)
            self.assertIn("Significantly higher", output)
            self.assertIn("Significantly lower", output)

    def test_quick_test_rejects_a_fake_volcano_file(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            success, report, root = run_quick_test(Path(folder) / "quick")
            self.assertTrue(success, report)
            svg = (root / "quick-volcano.svg").read_text(encoding="utf-8")
            self.assertIn('data-significance="higher"', svg)
            self.assertIn('data-significance="lower"', svg)
            self.assertIn("stroke-dasharray", svg)
            self.assertIn("thresholded volcano plot", report)

    def test_platform_patch_is_valid_and_requires_real_work(self) -> None:
        path = ROOT / "figureloom_bio" / "final_platform_gaps.py"
        source = path.read_text(encoding="utf-8")
        ast.parse(source, filename=str(path))
        self.assertIn("MIN_INSTALLER_BYTES = 64 * 1024", source)
        self.assertIn('"Downloads" / "FigureLoom Bio Updates"', source)
        self.assertIn("TestWindow(auto_run=True)", source)
        self.assertIn("_wait_for_real_test", source)
        self.assertIn("The updater accepted an undersized installer", source)

    def test_existing_platform_safety_is_preserved_before_final_patch(self) -> None:
        manager = (ROOT / "platform" / "manager_entry.py").read_text(encoding="utf-8")
        test = (ROOT / "platform" / "test_entry.py").read_text(encoding="utf-8")
        for source in (manager, test):
            self.assertLess(source.index("install_platform_tool_safety"), source.index("install_final_platform_gaps"))


if __name__ == "__main__":
    unittest.main()
