import os
import sys


if "--self-test" in sys.argv:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from figureloom_bio import platform_qt_tools
from figureloom_bio.platform_tool_safety import install_platform_tool_safety


install_platform_tool_safety(platform_qt_tools)


if __name__ == "__main__":
    raise SystemExit(platform_qt_tools.show_test_window())
