from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PARITY = ROOT / "figureloom_bio" / "native_web_parity.py"
ENTRY = ROOT / "platform" / "ide_entry.py"


class NativeWebParityTests(unittest.TestCase):
    def test_parity_module_and_entry_are_valid_python(self) -> None:
        ast.parse(PARITY.read_text(encoding="utf-8"))
        ast.parse(ENTRY.read_text(encoding="utf-8"))

    def test_desktop_title_and_exact_web_palette_are_present(self) -> None:
        source = PARITY.read_text(encoding="utf-8")
        self.assertIn('APP_NAME = "FigureLoom Bio Desktop"', source)
        for color in (
            "#f4f7f6", "#ffffff", "#edf3f1", "#dce9e5", "#172321",
            "#60706c", "#cddbd7", "#2f7468", "#195c51", "#dff1ec",
            "#181d1c", "#222927", "#2a3431", "#35413e", "#eef7f4",
            "#aebdb8", "#43514d", "#78c4b5", "#a1ddcf", "#253e38",
        ):
            self.assertIn(color, source)

    def test_every_existing_native_control_is_preserved(self) -> None:
        source = PARITY.read_text(encoding="utf-8")
        features = {
            "account", "theme", "manual", "figureloom", "run", "new", "open", "save",
            "examples", "builder", "translate", "sentences", "tidy", "export_results",
            "clear_results", "add_file", "delete_file",
        }
        for feature in features:
            self.assertIn(f'name="{feature}"', source)
        self.assertIn('self.tabs.addTab(self.editor, "Text")', source)
        self.assertIn('self.tabs.addTab(self.blocks, "Blocks")', source)
        self.assertIn('QCheckBox("Allow installed tools")', source)
        self.assertIn("super().__init__(*args, **kwargs)", source)
        self.assertIn("super().load_active_file()", source)

    def test_mac_safe_token_coloring_is_installed_after_account_support(self) -> None:
        parity = PARITY.read_text(encoding="utf-8")
        entry = ENTRY.read_text(encoding="utf-8")
        self.assertIn("class WebSyntaxHighlighter(QSyntaxHighlighter)", parity)
        for token in ("syntax_command", "syntax_file", "syntax_value", "syntax_field", "syntax_comment"):
            self.assertIn(token, parity)
        account_position = entry.index("native_account.install_native_account(native_ide)")
        parity_position = entry.index("install_web_parity(native_ide)")
        self.assertLess(account_position, parity_position)


if __name__ == "__main__":
    unittest.main()
