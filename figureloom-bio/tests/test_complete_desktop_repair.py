from __future__ import annotations

import ast
from pathlib import Path
import tempfile
import unittest

from figureloom_bio import Runner
from figureloom_bio import desktop_tools, native_core, parser as parser_module
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.language_diagnostics import language_diagnostics_self_test
from figureloom_bio.parser import parse
from figureloom_bio.volcano_plot import volcano_self_test


ROOT = Path(__file__).resolve().parents[1]
RELIABILITY = ROOT / "figureloom_bio" / "desktop_reliability.py"
STABILITY = ROOT / "figureloom_bio" / "native_stability.py"
MACOS_TEST_SAFETY = ROOT / "figureloom_bio" / "macos_test_safety.py"
IDE_ENTRY = ROOT / "platform" / "ide_entry.py"
MANAGER_ENTRY = ROOT / "platform" / "manager_entry.py"
TEST_ENTRY = ROOT / "platform" / "test_entry.py"


class CompleteDesktopRepairTests(unittest.TestCase):
    def test_new_desktop_modules_and_entries_are_valid_python(self) -> None:
        for path in (
            RELIABILITY,
            STABILITY,
            MACOS_TEST_SAFETY,
            IDE_ENTRY,
            MANAGER_ENTRY,
            TEST_ENTRY,
        ):
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

    def test_actual_desktop_runtimes_use_the_final_diagnostic_parser(self) -> None:
        self.assertIs(native_core.parse, parser_module.parse)
        self.assertIs(desktop_tools.parse, parser_module.parse)
        for runtime_parse in (native_core.parse, desktop_tools.parse):
            instructions = runtime_parse("Draw a vulcano chart from effect and p_value.")
            self.assertEqual(len(instructions), 1)
            with self.assertRaises(FigureLoomBioError) as caught:
                runtime_parse("Create something scientific somehow.")
            message = caught.exception.plain_message()
            self.assertIn("What happened", message)
            self.assertTrue("How to fix it" in message or "What to do" in message)
            self.assertIn("I read", message)

    def test_every_runtime_error_gets_a_simple_next_step(self) -> None:
        examples = (
            FigureLoomBioError("I could not find the column missing.", line_number=3),
            FigureLoomBioError("score does not contain numeric values.", line_number=4),
            FigureLoomBioError("There is no open table yet.", line_number=2),
        )
        for error in examples:
            with self.subTest(message=error.message):
                message = error.plain_message()
                self.assertIn("What happened", message)
                self.assertIn("How to fix it", message)

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

    def test_quick_test_proves_the_real_volcano_plot(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            success, report, root = desktop_tools.run_quick_test(Path(folder) / "quick-test")
            self.assertTrue(success, report)
            svg = (root / "quick-volcano.svg").read_text(encoding="utf-8")
            self.assertIn('data-significance="higher"', svg)
            self.assertIn('data-significance="lower"', svg)
            self.assertIn("stroke-dasharray", svg)
            self.assertIn("real thresholded volcano plot", report)

    def test_startup_and_worker_crash_paths_are_permanent(self) -> None:
        stability = STABILITY.read_text(encoding="utf-8")
        reliability = RELIABILITY.read_text(encoding="utf-8")
        macos_test_safety = MACOS_TEST_SAFETY.read_text(encoding="utf-8")
        ide = IDE_ENTRY.read_text(encoding="utf-8")
        manager = MANAGER_ENTRY.read_text(encoding="utf-8")
        test = TEST_ENTRY.read_text(encoding="utf-8")
        self.assertIn('workspace.active_file = "large-result.svg"', stability)
        self.assertIn("set_program_mode(looks_like_program(name))", stability)
        self.assertIn("QSvgWidget", stability)
        self.assertIn("install_native_stability", ide)
        self.assertIn("install_native_run_safety", ide)
        self.assertIn("panel_2", ide)
        self.assertIn("install_platform_tool_safety", manager)
        self.assertIn("install_desktop_tool_reliability", manager)
        self.assertIn("install_platform_tool_safety", test)
        self.assertIn("install_desktop_tool_reliability", test)
        self.assertIn("install_macos_test_safety", test)
        self.assertGreaterEqual(reliability.count("event.ignore()"), 2)
        self.assertIn("QEventLoop", reliability)
        self.assertIn("TestWindow(auto_run=True)", reliability)
        self.assertIn("update_downloads_folder", reliability)
        self.assertIn("close_when_idle", reliability)
        self.assertIn("Crash report", reliability)
        self.assertIn("finish_and_exit_headless", macos_test_safety)
        self.assertIn('QT_QPA_PLATFORM", ""', macos_test_safety)
        self.assertIn("app.quit", macos_test_safety)

    def test_internal_self_tests(self) -> None:
        diagnostics = language_diagnostics_self_test()
        self.assertTrue(diagnostics["known_typo_resolved"])
        self.assertTrue(diagnostics["runtime_references_routed"])
        self.assertTrue(volcano_self_test()["real_volcano_svg"])


if __name__ == "__main__":
    unittest.main()
