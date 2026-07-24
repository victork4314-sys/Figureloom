from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PARITY = ROOT / "figureloom_bio" / "native_web_parity.py"
EXACT = ROOT / "figureloom_bio" / "native_desktop_exact.py"
ENTRY = ROOT / "platform" / "ide_entry.py"


class NativeWebParityTests(unittest.TestCase):
    def test_parity_exact_layout_and_entry_are_valid_python(self) -> None:
        ast.parse(PARITY.read_text(encoding="utf-8"))
        ast.parse(EXACT.read_text(encoding="utf-8"))
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

    def test_visible_desktop_structure_matches_web_in_both_themes(self) -> None:
        source = EXACT.read_text(encoding="utf-8")
        self.assertIn("web_palette_stylesheet(dark)", source)
        self.assertIn("c = DARK if dark else LIGHT", source)
        self.assertIn("header.setFixedHeight(62)", source)
        self.assertIn("bar.setFixedHeight(70)", source)
        self.assertIn("files.setFixedWidth(230)", source)
        self.assertIn("results.setMinimumWidth(320)", source)
        self.assertIn("results.setMaximumWidth(420)", source)
        self.assertIn('heading = QLabel("FILES")', source)
        self.assertIn('heading = QLabel("RESULTS")', source)
        self.assertIn('language = QLabel("FigureLoom Bio")', source)
        self.assertIn('self.tabs.tabBar().hide()', source)
        self.assertNotIn("QSplitter", source)
        self.assertNotIn('self._tool_group("Desktop"', source)
        self.assertNotIn('layout.addWidget(self.delete_file_button)', source)
        self.assertNotIn('layout.addWidget(self.allow_tools)', source)

    def test_every_native_function_is_preserved_without_changing_primary_layout(self) -> None:
        source = EXACT.read_text(encoding="utf-8")
        visible_features = {
            "account", "theme", "manual", "figureloom", "run", "new", "open", "save",
            "examples", "builder", "tidy", "clear_results", "add_file",
        }
        native_only_features = {
            "translate", "sentences", "export_results", "delete_file", "text_mode", "blocks_mode",
        }
        for feature in visible_features | native_only_features:
            self.assertIn(f'name="{feature}"', source)
        self.assertIn('QCheckBox("Allow installed tools"', source)
        self.assertIn("self.file_tree.delete_requested.connect(self.delete_file)", source)
        self.assertIn("Open blocks editor", source)
        self.assertIn("Translate program", source)
        self.assertIn("Open words and terms library", source)
        self.assertIn("Export results", source)
        self.assertIn("Allow installed tools", source)
        self.assertIn("self._desktop_controls.hide()", source)

    def test_exact_layout_wrap_is_installed_before_run_safety(self) -> None:
        entry = ENTRY.read_text(encoding="utf-8")
        account_position = entry.index("native_account.install_native_account(native_ide)")
        parity_position = entry.index("install_web_parity(native_ide)")
        exact_position = entry.index("install_exact_desktop(native_ide)")
        safety_position = entry.index("install_native_run_safety(native_ide)")
        self.assertLess(account_position, parity_position)
        self.assertLess(parity_position, exact_position)
        self.assertLess(exact_position, safety_position)

    def test_mac_safe_token_coloring_is_installed_after_account_support(self) -> None:
        parity = PARITY.read_text(encoding="utf-8")
        entry = ENTRY.read_text(encoding="utf-8")
        self.assertIn("class WebSyntaxHighlighter(QSyntaxHighlighter)", parity)
        for token in ("syntax_command", "syntax_file", "syntax_value", "syntax_field", "syntax_comment"):
            self.assertIn(token, parity)
        account_position = entry.index("native_account.install_native_account(native_ide)")
        parity_position = entry.index("install_web_parity(native_ide)")
        self.assertLess(account_position, parity_position)

    def test_web_palette_keeps_the_line_number_painter_compatibility_key(self) -> None:
        entry = ENTRY.read_text(encoding="utf-8")
        light_alias = 'native_widgets.LIGHT.setdefault("panel_2", native_widgets.LIGHT["editor_gutter"])'
        dark_alias = 'native_widgets.DARK.setdefault("panel_2", native_widgets.DARK["editor_gutter"])'
        syntax_install = entry.index("install_exact_web_syntax()")
        self.assertIn(light_alias, entry)
        self.assertIn(dark_alias, entry)
        self.assertLess(entry.index(light_alias), syntax_install)
        self.assertLess(entry.index(dark_alias), syntax_install)


if __name__ == "__main__":
    unittest.main()
