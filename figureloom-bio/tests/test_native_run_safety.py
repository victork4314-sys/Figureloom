from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SAFETY = ROOT / "figureloom_bio" / "native_run_safety.py"
ENTRY = ROOT / "platform" / "ide_entry.py"


class NativeRunSafetyTests(unittest.TestCase):
    def test_safety_layer_and_entry_are_valid_python(self) -> None:
        ast.parse(SAFETY.read_text(encoding="utf-8"))
        ast.parse(ENTRY.read_text(encoding="utf-8"))

    def test_running_program_blocks_unsafe_window_close(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn("thread.isRunning()", source)
        self.assertIn("event.ignore()", source)
        self.assertIn("The program is still running", source)
        self.assertNotIn("requestInterruption()", source)

    def test_unexpected_worker_error_is_simple_and_saves_technical_details(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn('"What happened\\n"', source)
        self.assertIn('"What to do\\n"', source)
        self.assertIn('"last-run-error.txt"', source)
        self.assertIn("traceback.format_exc()", source)
        self.assertIn("Your program and workspace files were not deleted", source)

    def test_chained_internal_error_does_not_look_like_a_normal_language_error(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn("cause = error.__cause__", source)
        self.assertIn("cause is not None", source)
        self.assertIn("not isinstance(cause, FigureLoomBioError)", source)
        self.assertIn("_unexpected_run_message(cause, details_path)", source)
        self.assertIn("error.plain_message()", source)

    def test_installed_self_test_shows_and_paints_the_final_window(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn("def painted_self_test() -> int", source)
        self.assertIn("window.show()", source)
        self.assertGreaterEqual(source.count("app.processEvents()"), 3)
        self.assertIn("window.editor.viewport().update()", source)
        self.assertIn("window.editor.line_number_area.update()", source)
        self.assertIn("window.isVisible()", source)
        self.assertIn("native_ide_module.native_self_test = painted_self_test", source)

    def test_installed_self_test_proves_accepted_words_receive_real_colors(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn('window.editor.setPlainText("Open the file samples.csv.")', source)
        self.assertIn("window.editor.highlighter.rehighlight()", source)
        self.assertIn("def _foreground_colors", source)
        for token_format in ("command", "file", "word", "punctuation"):
            self.assertIn(f"highlighter.{token_format}.foreground().color().name()", source)
        self.assertIn("expected_colors - actual_colors", source)
        self.assertIn("did not paint all accepted-instruction token colors", source)

    def test_safety_is_installed_after_final_ui_wrapping(self) -> None:
        entry = ENTRY.read_text(encoding="utf-8")
        account = entry.index("native_account.install_native_account(native_ide)")
        parity = entry.index("install_web_parity(native_ide)")
        safety = entry.index("install_native_run_safety(native_ide)")
        syntax = entry.index("install_exact_web_syntax()")
        self.assertLess(account, parity)
        self.assertLess(parity, safety)
        self.assertLess(safety, syntax)


if __name__ == "__main__":
    unittest.main()
