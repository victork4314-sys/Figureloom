from figureloom_bio import platform_qt
from figureloom_bio.platform_qt_guard import install_platform_qt_guard


install_platform_qt_guard(platform_qt)


if __name__ == "__main__":
    raise SystemExit(platform_qt.run_manager())
