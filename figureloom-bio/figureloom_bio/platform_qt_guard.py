from __future__ import annotations

from time import monotonic
from typing import Any

from PySide6.QtCore import QEventLoop, QTimer
from PySide6.QtWidgets import QMainWindow, QMessageBox


def _thread_is_running(window: Any) -> bool:
    thread = getattr(window, "_thread", None)
    return thread is not None and bool(thread.isRunning())


def _busy_close_message(kind: str) -> tuple[str, str, str]:
    if kind == "updater":
        return (
            "The updater is still working.",
            "The installer download or verification has not finished yet.",
            "Wait until the updater shows a finished or failed message. Then close it normally.",
        )
    return (
        "The automatic test is still running.",
        "FigureLoom Bio is still checking the language and creating the test results.",
        "Wait for Quick test passed or Quick test failed. Then close the test window normally.",
    )


def _install_close_guards(platform_qt_module: Any) -> None:
    def manager_close_event(self: Any, event: Any) -> None:
        if _thread_is_running(self):
            title, what_happened, how_to_fix = _busy_close_message("updater")
            QMessageBox.information(
                self,
                platform_qt_module.APP_NAME,
                platform_qt_module.simple_explanation(title, what_happened, how_to_fix),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(self, event)

    def test_close_event(self: Any, event: Any) -> None:
        if _thread_is_running(self):
            title, what_happened, how_to_fix = _busy_close_message("test")
            QMessageBox.information(
                self,
                platform_qt_module.APP_NAME,
                platform_qt_module.simple_explanation(title, what_happened, how_to_fix),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(self, event)

    platform_qt_module.ManagerWindow.closeEvent = manager_close_event
    platform_qt_module.TestWindow.closeEvent = test_close_event


def _run_visible_window_smoke_test(window: Any, *, milliseconds: int = 250) -> None:
    window.show()
    loop = QEventLoop()
    QTimer.singleShot(milliseconds, loop.quit)
    loop.exec()
    if not window.isVisible():
        raise RuntimeError(f"{window.windowTitle()} did not remain open during its event-loop smoke test.")
    window.close()


def _run_test_worker_smoke_test(platform_qt_module: Any) -> None:
    """Run the normal TestWindow worker path inside a real Qt event loop."""

    window = platform_qt_module.TestWindow(auto_start=True)
    window.show()
    loop = QEventLoop()
    deadline = monotonic() + 90.0
    timer = QTimer()
    timer.setInterval(25)

    def poll() -> None:
        finished = (
            not _thread_is_running(window)
            and window._thread is None
            and window.status.text() in {"Quick test passed", "Quick test failed"}
        )
        if finished or monotonic() >= deadline:
            timer.stop()
            loop.quit()

    timer.timeout.connect(poll)
    timer.start()
    QTimer.singleShot(0, poll)
    loop.exec()

    if _thread_is_running(window):
        # The worker is a finite local test, so waiting here is safer than allowing
        # Qt to destroy an active QThread while the self-test process exits.
        window._thread.quit()
        window._thread.wait(30_000)
    if _thread_is_running(window):
        raise RuntimeError("The automatic test worker did not finish within 120 seconds.")
    if window.status.text() != "Quick test passed":
        raise RuntimeError(window.report.toPlainText() or "The automatic test window did not pass.")
    window.close()


def install_platform_qt_guard(platform_qt_module: Any) -> None:
    if getattr(platform_qt_module, "_platform_qt_guard_installed", False):
        return

    _install_close_guards(platform_qt_module)
    original_manager_self_test = platform_qt_module.manager_self_test
    original_test_app_self_test = platform_qt_module.test_app_self_test

    def manager_self_test() -> int:
        result = original_manager_self_test()
        app = platform_qt_module._app(["--window-smoke-test"])
        window = platform_qt_module.ManagerWindow()
        _run_visible_window_smoke_test(window)
        app.processEvents()
        return result

    def test_app_self_test() -> int:
        result = original_test_app_self_test()
        app = platform_qt_module._app(["--worker-smoke-test"])
        _run_test_worker_smoke_test(platform_qt_module)
        app.processEvents()
        return result

    platform_qt_module.manager_self_test = manager_self_test
    platform_qt_module.test_app_self_test = test_app_self_test
    platform_qt_module._platform_qt_guard_installed = True


__all__ = ["install_platform_qt_guard"]
