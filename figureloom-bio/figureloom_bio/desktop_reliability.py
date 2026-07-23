from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import platform
import sys
import tempfile
import traceback
from time import monotonic
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PySide6.QtCore import QEventLoop, QObject, QTimer, Signal, Slot
from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox


def simple_explanation(
    title: str,
    what_happened: str,
    how_to_fix: str,
    *,
    technical_detail: str = "",
) -> str:
    parts = [title, "", "What happened", what_happened.strip(), "", "How to fix it", how_to_fix.strip()]
    if technical_detail.strip():
        parts.extend(["", "Technical detail", technical_detail.strip()])
    return "\n".join(parts).strip()


def crash_report(name: str, error: BaseException) -> Path:
    candidates = [Path.home() / "Desktop", Path.home(), Path(tempfile.gettempdir())]
    folder = next((item for item in candidates if item.exists() and os.access(item, os.W_OK)), Path(tempfile.gettempdir()))
    path = folder / f"FigureLoom-Bio-{name}-Crash.txt"
    report = (
        f"FIGURELOOM BIO {name.upper()} CRASH\n\n"
        f"Time: {datetime.now().isoformat(timespec='seconds')}\n"
        f"Platform: {platform.platform()}\n"
        f"Python: {sys.version}\n\n"
        f"{''.join(traceback.format_exception(type(error), error, error.__traceback__))}"
    )
    try:
        path.write_text(report, encoding="utf-8")
    except OSError:
        path = Path(tempfile.gettempdir()) / path.name
        path.write_text(report, encoding="utf-8")
    return path


def update_downloads_folder() -> Path:
    folder = Path.home() / "Downloads" / "FigureLoom Bio Updates"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _thread_running(window: Any) -> bool:
    thread = getattr(window, "_thread", None)
    return thread is not None and bool(thread.isRunning())


def _validate_installer(path: Path, signature: bytes) -> None:
    size = path.stat().st_size
    if size < 64 * 1024:
        raise OSError(
            f"The downloaded file is only {size:,} bytes. That is too small to be the real FigureLoom Bio installer."
        )
    with path.open("rb") as handle:
        header = handle.read(max(4, len(signature)))
    if not header.startswith(signature):
        raise OSError(
            f"The downloaded file is not the expected installer type. Expected {signature!r}, received {header[:4]!r}."
        )


def _download_error(error: BaseException, destination: Path | None) -> str:
    if isinstance(error, HTTPError):
        what = f"GitHub returned error {error.code} instead of the installer."
        fix = "Wait a moment, check that GitHub opens in a browser, and press Install or update again."
    elif isinstance(error, URLError):
        what = "The updater could not reach GitHub. The connection, DNS, firewall, VPN, or GitHub itself stopped the download."
        fix = "Check the internet connection and that GitHub downloads are allowed, then try again."
    elif isinstance(error, PermissionError):
        what = "FigureLoom Bio could not write the installer into your Downloads folder."
        fix = "Allow FigureLoom Bio to write to Downloads, close security prompts, and try again."
    else:
        what = "The update stopped before the normal installer could begin. The updater did not open an unverified file."
        fix = "Read the technical detail below, correct that problem, and press Install or update again."
    saved = f"\nDownloaded file: {destination}" if destination and destination.exists() else ""
    return simple_explanation(
        "The FigureLoom Bio update could not start.",
        what,
        fix,
        technical_detail=f"{error}{saved}",
    )


def install_desktop_tool_reliability(platform_qt_module: Any) -> None:
    if getattr(platform_qt_module, "_reliable_desktop_tools_installed", False):
        return

    class ReliableDownloadWorker(QObject):
        progress = Signal(int, str)
        log = Signal(str)
        finished = Signal(bool, str, str)

        @Slot()
        def run(self) -> None:
            destination: Path | None = None
            try:
                url, suffix, signature = platform_qt_module.platform_installer()
                destination = update_downloads_folder() / f"FigureLoom-Bio-Installer-{datetime.now():%Y%m%d-%H%M%S}{suffix}"
                self.progress.emit(5, "Connecting to the official FigureLoom Bio download")
                self.log.emit(f"Official download: {url}")
                request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater/1.0"})
                with urlopen(request, timeout=120) as response, destination.open("wb") as output:
                    total = int(response.headers.get("Content-Length", "0") or 0)
                    received = 0
                    while True:
                        block = response.read(256 * 1024)
                        if not block:
                            break
                        output.write(block)
                        received += len(block)
                        if total:
                            percent = min(90, 8 + int(received / total * 82))
                            self.progress.emit(percent, "Downloading the current installer")
                self.progress.emit(94, "Checking the downloaded installer")
                _validate_installer(destination, signature)
                self.log.emit(f"Checked installer: {destination} ({destination.stat().st_size:,} bytes)")
                self.finished.emit(True, "The installer is ready to open", str(destination))
            except Exception as error:
                explanation = _download_error(error, destination)
                self.log.emit(explanation)
                self.finished.emit(False, "The installer could not be downloaded", str(destination or ""))

    platform_qt_module.DownloadWorker = ReliableDownloadWorker

    original_manager_finished = platform_qt_module.ManagerWindow._download_finished

    def manager_finished(window: Any, success: bool, message: str, path: str) -> None:
        original_manager_finished(window, success, message, path)
        if not success:
            return

        def close_when_idle() -> None:
            if _thread_running(window):
                QTimer.singleShot(100, close_when_idle)
            else:
                window.close()

        # The normal OS installer is already open. Releasing this updater allows
        # Windows to replace the installed updater executable during the repair.
        QTimer.singleShot(250, close_when_idle)

    platform_qt_module.ManagerWindow._download_finished = manager_finished

    def manager_close_event(window: Any, event: Any) -> None:
        if _thread_running(window):
            QMessageBox.information(
                window,
                platform_qt_module.APP_NAME,
                simple_explanation(
                    "The updater is still working.",
                    "The installer download or verification has not finished yet.",
                    "Wait until the updater shows a finished or failed message. Then close it normally.",
                ),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(window, event)

    def test_close_event(window: Any, event: Any) -> None:
        if _thread_running(window):
            QMessageBox.information(
                window,
                platform_qt_module.APP_NAME,
                simple_explanation(
                    "The automatic test is still running.",
                    "FigureLoom Bio is still checking the language and creating the test results.",
                    "Wait for Quick test passed or Quick test failed. Then close the window normally.",
                ),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(window, event)

    platform_qt_module.ManagerWindow.closeEvent = manager_close_event
    platform_qt_module.TestWindow.closeEvent = test_close_event

    original_manager_self_test = platform_qt_module.manager_window_self_test
    original_test_self_test = platform_qt_module.test_window_self_test

    def manager_self_test() -> int:
        result = original_manager_self_test()
        app = platform_qt_module.application()
        window = platform_qt_module.ManagerWindow()
        window.show()
        loop = QEventLoop()
        QTimer.singleShot(250, loop.quit)
        loop.exec()
        if not window.isVisible():
            raise RuntimeError("The updater did not remain open in a real Qt event loop.")
        window.close()
        app.processEvents()
        return result

    def test_self_test() -> int:
        result = original_test_self_test()
        app = platform_qt_module.application()
        window = platform_qt_module.TestWindow(auto_run=True)
        window.show()
        loop = QEventLoop()
        deadline = monotonic() + 90.0
        timer = QTimer()
        timer.setInterval(25)

        def poll() -> None:
            finished = (
                not _thread_running(window)
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
        if _thread_running(window):
            window._thread.quit()
            window._thread.wait(30_000)
        if _thread_running(window):
            raise RuntimeError("The automatic test worker did not finish within 120 seconds.")
        if window.status.text() != "Quick test passed":
            raise RuntimeError(window.report.toPlainText() or "The automatic test window did not pass.")
        window.close()
        app.processEvents()
        return result

    platform_qt_module.manager_window_self_test = manager_self_test
    platform_qt_module.test_window_self_test = test_self_test

    original_show_manager = platform_qt_module.show_manager_window
    original_show_test = platform_qt_module.show_test_window

    def safe_show_manager() -> int:
        try:
            return original_show_manager()
        except Exception as error:
            return _show_startup_crash(
                platform_qt_module,
                "Updater",
                error,
                "reinstall FigureLoom Bio from the official download",
            )

    def safe_show_test() -> int:
        try:
            return original_show_test()
        except Exception as error:
            return _show_startup_crash(
                platform_qt_module,
                "Test-Tool",
                error,
                "run Repair from the updater",
            )

    platform_qt_module.show_manager_window = safe_show_manager
    platform_qt_module.show_test_window = safe_show_test
    platform_qt_module._reliable_desktop_tools_installed = True


def _show_startup_crash(platform_qt_module: Any, name: str, error: BaseException, fix: str) -> int:
    report = crash_report(name, error)
    try:
        app = QApplication.instance() or platform_qt_module.application()
        QMessageBox.critical(
            None,
            platform_qt_module.APP_NAME,
            simple_explanation(
                f"The FigureLoom Bio {name.replace('-', ' ').lower()} could not open.",
                "The app stopped during startup instead of silently disappearing.",
                f"Open the crash report below, then {fix}.",
                technical_detail=f"{error}\n\nCrash report: {report}",
            ),
        )
        app.processEvents()
    except Exception:
        print(f"FigureLoom Bio {name} could not open. Crash report: {report}", file=sys.stderr)
    return 1


__all__ = [
    "crash_report",
    "install_desktop_tool_reliability",
    "simple_explanation",
    "update_downloads_folder",
]
