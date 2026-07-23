from __future__ import annotations

from typing import Any


def install_platform_tool_safety(platform_tools_module: Any) -> None:
    """Make installed utility self-tests prove the final windows can show and paint."""

    if getattr(platform_tools_module, "_figureloom_painted_tool_tests_installed", False):
        return

    def painted_test_window_self_test() -> int:
        app = platform_tools_module.application()
        window = platform_tools_module.TestWindow(auto_run=False)
        required = (window.status, window.report, window.run_button, window.files_button)
        if not all(required):
            return 1
        window.show()
        app.processEvents()
        window.repaint()
        window.report.viewport().update()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError("The installed Test FigureLoom Bio window did not become visible.")
        window.close()
        app.processEvents()
        return 0

    def painted_manager_window_self_test() -> int:
        app = platform_tools_module.application()
        window = platform_tools_module.ManagerWindow()
        required = (
            window.status,
            window.progress,
            window.log,
            window.install_button,
            window.repair_button,
            window.test_button,
            window.ide_button,
            window.files_button,
        )
        if not all(required):
            return 1
        window.show()
        app.processEvents()
        window.repaint()
        window.log.viewport().update()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError(
                "The installed Install or Update FigureLoom Bio window did not become visible."
            )
        window.close()
        app.processEvents()
        return 0

    platform_tools_module.test_window_self_test = painted_test_window_self_test
    platform_tools_module.manager_window_self_test = painted_manager_window_self_test
    platform_tools_module._figureloom_painted_tool_tests_installed = True


__all__ = ["install_platform_tool_safety"]
