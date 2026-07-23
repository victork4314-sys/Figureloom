from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
QT_TOOLS = ROOT / "figureloom_bio" / "platform_qt.py"
QT_GUARD = ROOT / "figureloom_bio" / "platform_qt_guard.py"
STABILITY = ROOT / "figureloom_bio" / "native_stability.py"
MANAGER_ENTRY = ROOT / "platform" / "manager_entry.py"
TEST_ENTRY = ROOT / "platform" / "test_entry.py"
IDE_ENTRY = ROOT / "platform" / "ide_entry.py"
WINDOWS_BUILD = ROOT / "windows" / "build-installer.ps1"
MAC_BUILD = ROOT / "macos" / "build-installer.sh"


class DesktopToolEntrypointTests(unittest.TestCase):
    def test_new_desktop_modules_are_valid_python(self) -> None:
        for path in (QT_TOOLS, QT_GUARD, STABILITY, MANAGER_ENTRY, TEST_ENTRY, IDE_ENTRY):
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

    def test_updater_and_test_app_use_qt_not_tkinter(self) -> None:
        qt_source = QT_TOOLS.read_text(encoding="utf-8")
        manager = MANAGER_ENTRY.read_text(encoding="utf-8")
        test = TEST_ENTRY.read_text(encoding="utf-8")
        self.assertIn("from PySide6", qt_source)
        self.assertNotIn("tkinter", qt_source)
        self.assertIn("platform_qt.run_manager", manager)
        self.assertIn("platform_qt.run_test_app", test)
        self.assertIn("install_platform_qt_guard", manager)
        self.assertIn("install_platform_qt_guard", test)
        self.assertNotIn("platform_desktop", manager)
        self.assertNotIn("platform_desktop", test)

    def test_active_worker_threads_cannot_be_destroyed_by_closing_the_window(self) -> None:
        source = QT_GUARD.read_text(encoding="utf-8")
        self.assertIn("def manager_close_event", source)
        self.assertIn("def test_close_event", source)
        self.assertGreaterEqual(source.count("event.ignore()"), 2)
        self.assertIn("_thread_is_running", source)
        self.assertIn("The updater is still working", source)
        self.assertIn("The automatic test is still running", source)

    def test_package_self_tests_run_real_qt_event_loops(self) -> None:
        source = QT_GUARD.read_text(encoding="utf-8")
        self.assertIn("QEventLoop", source)
        self.assertIn("window.show()", source)
        self.assertIn("TestWindow(auto_start=True)", source)
        self.assertIn("Quick test passed", source)
        self.assertIn("_run_visible_window_smoke_test", source)
        self.assertIn("_run_test_worker_smoke_test", source)

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
