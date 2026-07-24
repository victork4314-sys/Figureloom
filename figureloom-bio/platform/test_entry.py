import os
from pathlib import Path
import sys


SELF_TEST = "--self-test" in sys.argv
if SELF_TEST:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from figureloom_bio import platform_qt_tools
from figureloom_bio.desktop_tools import run_quick_test


def run_macos_self_test() -> int:
    """Prove the real installed Test app without any worker/event-loop wrapper."""

    app = platform_qt_tools.application()
    window = platform_qt_tools.TestWindow(auto_run=False)
    window.show()
    app.processEvents()
    window.repaint()
    window.report.viewport().update()
    app.processEvents()
    if not window.isVisible():
        raise RuntimeError("The native Test FigureLoom Bio window did not open.")

    success, report, folder = run_quick_test(platform_qt_tools.test_folder())
    platform_qt_tools.TestWindow._test_finished(window, success, report, str(folder))
    app.processEvents()

    result_file = Path(folder) / "TEST-RESULT.txt"
    volcano_file = Path(folder) / "quick-volcano.svg"
    if not success:
        raise RuntimeError(report or "The installed FigureLoom Bio quick test failed.")
    if window.status.text() != "Quick test passed":
        raise RuntimeError("The native Test window did not display Quick test passed.")
    if not result_file.is_file():
        raise RuntimeError("The Test app did not save TEST-RESULT.txt.")
    if "FIGURELOOM BIO QUICK TEST PASSED" not in result_file.read_text(encoding="utf-8"):
        raise RuntimeError("The Test app result did not contain its required passed marker.")
    if not volcano_file.is_file() or volcano_file.stat().st_size == 0:
        raise RuntimeError("The Test app did not create the real volcano plot.")

    window.close()
    app.processEvents()
    return 0


if SELF_TEST and sys.platform == "darwin":
    raise SystemExit(run_macos_self_test())

from figureloom_bio.desktop_reliability import install_desktop_tool_reliability
from figureloom_bio.macos_test_safety import install_macos_test_safety
from figureloom_bio.platform_tool_safety import install_platform_tool_safety


install_platform_tool_safety(platform_qt_tools)
install_desktop_tool_reliability(platform_qt_tools)
install_macos_test_safety(platform_qt_tools)


if __name__ == "__main__":
    raise SystemExit(platform_qt_tools.show_test_window())
