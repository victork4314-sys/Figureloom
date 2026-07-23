from figureloom_bio import platform_qt_tools
from figureloom_bio.desktop_reliability import install_desktop_tool_reliability


install_desktop_tool_reliability(platform_qt_tools)


if __name__ == "__main__":
    raise SystemExit(platform_qt_tools.show_test_window())
