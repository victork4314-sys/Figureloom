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
