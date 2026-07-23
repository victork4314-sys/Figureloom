from figureloom_bio import platform_qt_tools
from figureloom_bio.desktop_reliability import install_desktop_tool_reliability


install_desktop_tool_reliability(platform_qt_tools)
show_manager_window = platform_qt_tools.show_manager_window


if __name__ == "__main__":
    raise SystemExit(show_manager_window())
