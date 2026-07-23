from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
QT_TOOLS = ROOT / "figureloom_bio" / "platform_qt.py"
STABILITY = ROOT / "figureloom_bio" / "native_stability.py"
MANAGER_ENTRY = ROOT / "platform" / "manager_entry.py"
TEST_ENTRY = ROOT / "platform" / "test_entry.py"
IDE_ENTRY = ROOT / "platform" / "ide_entry.py"
WINDOWS_BUILD = ROOT / "windows" / "build-installer.ps1"
MAC_BUILD = ROOT / "macos" / "build-installer.sh"


class DesktopToolEntrypointTests(unittest.TestCase):
    def test_new_desktop_modules_are_valid_python(self) -> None:
        for path in (QT_TOOLS, STABILITY, MANAGER_ENTRY, TEST_ENTRY, IDE_ENTRY):
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

    def test_updater_and_test_app_use_qt_not_tkinter(self) -> None:
        qt_source = QT_TOOLS.read_text(encoding="utf-8")
        manager = MANAGER_ENTRY.read_text(encoding="utf-8")
        test = TEST_ENTRY.read_text(encoding="utf-8")
        self.assertIn("from PySide6", qt_source)
        self.assertNotIn("tkinter", qt_source)
        self.assertIn("run_manager", manager)
        self.assertIn("run_test_app", test)
        self.assertNotIn("platform_desktop", manager)
        self.assertNotIn("platform_desktop", test)

    def test_all_three_desktop_apps_have_real_package_self_tests(self) -> None:
        windows = WINDOWS_BUILD.read_text(encoding="utf-8")
        mac = MAC_BUILD.read_text(encoding="utf-8")
        for name in ("FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(f'Test-FigureLoomDesktopExecutable -Name "{name}"', windows)
            self.assertIn(f'test_app "{name}"', mac)

    def test_large_svg_startup_and_visible_svg_preview_are_permanent(self) -> None:
        source = STABILITY.read_text(encoding="utf-8")
        self.assertIn("MAX_HIGHLIGHT_LINE", source)
        self.assertIn('workspace.active_file = "large-result.svg"', source)
        self.assertIn("highlighter.set_program_mode(looks_like_program(name))", source)
        self.assertIn("QSvgWidget", source)
        self.assertIn("Generated figure preview", source)


if __name__ == "__main__":
    unittest.main()
