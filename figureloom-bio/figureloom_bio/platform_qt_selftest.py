from __future__ import annotations

from typing import Any

from .platform_qt_tools import ManagerWindow, TestWindow, application


def _paint_window(window: Any, name: str) -> int:
    app = application()
    window.show()
    app.processEvents()
    window.repaint()
    if window.centralWidget() is not None:
        window.centralWidget().repaint()
    app.processEvents()
    if not window.isVisible():
        raise RuntimeError(f"The installed {name} window did not become visible during its startup test.")
    window.close()
    app.processEvents()
    return 0


def paint_test_window() -> int:
    return _paint_window(TestWindow(auto_run=False), "Test FigureLoom Bio")


def paint_manager_window() -> int:
    return _paint_window(ManagerWindow(), "Install or Update FigureLoom Bio")


__all__ = ["paint_manager_window", "paint_test_window"]
