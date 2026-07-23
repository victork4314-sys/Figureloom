from __future__ import annotations

from pathlib import Path
import ast
import tempfile
import unittest

from figureloom_bio import Runner
from figureloom_bio.desktop_tools import run_quick_test
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.volcano_plot import volcano_self_test


ROOT = Path(__file__).resolve().parents[1]


class ReleaseRepairFinalTests(unittest.TestCase):
    def test_common_volcano_spelling_and_alias_are_accepted(self) -> None:
        instructions = parse("Draw a vulcano plot from effect and p_value.")
        self.assertEqual(len(instructions), 1)
        self.assertEqual(instructions[0].action, "volcano_plot")

    def test_unknown_instruction_has_detailed_simple_help(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Create something scientific somehow.")
        message = caught.exception.plain_message()
        self.assertIn("What happened", message)
        self.assertIn("How to fix it", message)
        self.assertIn("Instruction read", message)

    def test_runtime_errors_explain_the_fix(self) -> None:
        error = FigureLoomBioError("I could not find the column missing.", line_number=3)
        message = error.plain_message()
        self.assertIn("Line 3", message)
        self.assertIn("What happened", message)
        self.assertIn("How to fix it", message)
        self.assertIn("first row", message)

    def test_real_volcano_plot_has_thresholds_groups_and_labels(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "expression.csv").write_text(
                "gene,effect,p_value\n"
                "up,2.4,0.0005\n"
                "down,-2.1,0.002\n"
                "flat,0.2,0.8\n",
                encoding="utf-8",
            )
            program = root / "volcano.flbio"
            program.write_text(
                "Open the file expression.csv.\n"
                "Create a volcano plot using effect and p_value.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            svg = (root / "volcano-plot.svg").read_text(encoding="utf-8")
            self.assertIn('data-significance="higher"', svg)
            self.assertIn('data-significance="lower"', svg)
            self.assertIn("stroke-dasharray", svg)
            self.assertIn("up", svg)
            self.assertIn("Significantly higher", output)
            self.assertIn("Significantly lower", output)

    def test_desktop_quick_test_requires_the_thresholded_volcano(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            success, report, root = run_quick_test(Path(folder) / "quick-test")
            self.assertTrue(success, report)
            self.assertTrue((root / "quick-volcano.svg").is_file())
            self.assertIn("real thresholded volcano plot", report)

    def test_internal_volcano_self_test(self) -> None:
        self.assertTrue(volcano_self_test()["real_volcano_svg"])

    def test_desktop_reliability_modules_are_valid_and_permanent(self) -> None:
        final = ROOT / "figureloom_bio" / "platform_qt_final.py"
        stability = ROOT / "figureloom_bio" / "native_stability.py"
        for path in (final, stability):
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        final_source = final.read_text(encoding="utf-8")
        stability_source = stability.read_text(encoding="utf-8")
        self.assertIn("MIN_INSTALLER_BYTES", final_source)
        self.assertIn("_wait_for_test", final_source)
        self.assertIn("QTimer.singleShot(150, window.close)", final_source)
        self.assertIn('workspace.active_file = "large-result.svg"', stability_source)
        self.assertIn("set_program_mode(looks_like_program(name))", stability_source)
        self.assertIn("QSvgWidget", stability_source)


if __name__ == "__main__":
    unittest.main()
