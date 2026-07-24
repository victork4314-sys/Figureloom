import os
import sys


if "--self-test" in sys.argv:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from figureloom_bio import platform_qt_tools
from figureloom_bio.desktop_reliability import install_desktop_tool_reliability
from figureloom_bio.macos_test_safety import install_macos_test_safety
from figureloom_bio.platform_tool_safety import install_platform_tool_safety


install_platform_tool_safety(platform_qt_tools)
install_desktop_tool_reliability(platform_qt_tools)
install_macos_test_safety(platform_qt_tools)


if __name__ == "__main__":
    raise SystemExit(platform_qt_tools.show_test_window())
