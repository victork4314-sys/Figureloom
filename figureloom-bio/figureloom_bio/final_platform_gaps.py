from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import tempfile
from time import monotonic
from typing import Any
from urllib.request import Request, urlopen

from PySide6.QtCore import QEventLoop, QTimer, Slot


MIN_INSTALLER_BYTES = 64 * 1024


def downloads_folder() -> Path:
    folder = Path.home() / "Downloads" / "FigureLoom Bio Updates"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def validate_installer(path: Path, suffix: str, signature: bytes) -> None:
    size = path.stat().st_size
    if size < MIN_INSTALLER_BYTES:
        raise OSError(
            f"The installer file is only {size:,} bytes. That is too small to be the real FigureLoom Bio installer."
        )
    header = path.read_bytes()[: max(4, len(signature))]
    if not header.startswith(signature):
        raise OSError(
            f"The downloaded file does not have the expected {suffix} installer signature. "
            "The updater stopped instead of opening an unsafe or incomplete file."
        )


def _install_download_worker(tools: Any) -> None:
    @Slot()
    def run(worker: Any) -> None:
        destination = Path()
        try:
            url, suffix, signature = tools.platform_installer()
            destination = downloads_folder() / f"FigureLoom-Bio-Installer-{datetime.now():%Y%m%d-%H%M%S}{suffix}"
            request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater/1.0"})
            worker.log.emit("Connecting to the official FigureLoom Bio download…")
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
                        worker.progress.emit(
                            min(94, 8 + int(received / total * 86)),
                            f"Downloading {received / 1024 / 1024:.1f} MB",
                        )
            worker.progress.emit(96, "Checking the downloaded installer")
            validate_installer(destination, suffix, signature)
            worker.log.emit(f"Downloaded and checked {destination} ({destination.stat().st_size:,} bytes).")
            worker.finished.emit(True, "The installer is ready to open", str(destination))
        except Exception as error:
            worker.log.emit(tools.simple_error("Downloading the FigureLoom Bio installer", error))
            worker.finished.emit(False, "The installer could not be downloaded", str(destination))

    tools.DownloadWorker.run = run


def _wait_for_real_test(window: Any, timeout_seconds: float = 90.0) -> None:
    loop = QEventLoop()
    timer = QTimer()
    timer.setInterval(25)
    deadline = monotonic() + timeout_seconds

    def poll() -> None:
        thread = getattr(window, "_thread", None)
        running = thread is not None and thread.isRunning()
        finished = not running and thread is None and window.status.text() in {"Quick test passed", "Quick test failed"}
        if finished or monotonic() >= deadline:
            timer.stop()
            loop.quit()

    timer.timeout.connect(poll)
    timer.start()
    QTimer.singleShot(0, poll)
    loop.exec()
    thread = getattr(window, "_thread", None)
    if thread is not None and thread.isRunning():
        thread.quit()
        thread.wait(30_000)
    if getattr(window, "_thread", None) is not None:
        raise RuntimeError("The automatic test worker did not finish within 90 seconds.")
    if window.status.text() != "Quick test passed":
        raise RuntimeError(window.report.toPlainText() or "The automatic test window did not pass.")


def _install_real_self_tests(tools: Any) -> None:
    def test_window_self_test() -> int:
        app = tools.application()
        window = tools.TestWindow(auto_run=True)
        window.show()
        app.processEvents()
        window.repaint()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError("The installed Test FigureLoom Bio window did not become visible.")
        _wait_for_real_test(window)
        window.close()
        app.processEvents()
        print("FIGURELOOM BIO TEST APP REAL WORKER SELF TEST PASSED")
        return 0

    def manager_window_self_test() -> int:
        app = tools.application()
        window = tools.ManagerWindow()
        window.show()
        app.processEvents()
        window.repaint()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError("The installed updater window did not become visible.")
        temporary = Path(tempfile.mkdtemp(prefix="figureloom-updater-validation-"))
        try:
            exe = temporary / "valid.exe"
            exe.write_bytes(b"MZ" + b"0" * MIN_INSTALLER_BYTES)
            validate_installer(exe, ".exe", b"MZ")
            pkg = temporary / "valid.pkg"
            pkg.write_bytes(b"xar!" + b"0" * MIN_INSTALLER_BYTES)
            validate_installer(pkg, ".pkg", b"xar!")
            too_small = temporary / "small.exe"
            too_small.write_bytes(b"MZ")
            try:
                validate_installer(too_small, ".exe", b"MZ")
            except OSError:
                pass
            else:
                raise RuntimeError("The updater accepted an undersized installer during its self-test.")
        finally:
            import shutil

            shutil.rmtree(temporary, ignore_errors=True)
        window.close()
        app.processEvents()
        print("FIGURELOOM BIO UPDATER VALIDATION SELF TEST PASSED")
        return 0

    tools.test_window_self_test = test_window_self_test
    tools.manager_window_self_test = manager_window_self_test


def _install_error_heading(tools: Any) -> None:
    original = tools.simple_error

    def simple_error(action: str, error: BaseException) -> str:
        return original(action, error).replace("\nWhat to do\n", "\nHow to fix it\n").replace("\nDetails\n", "\nTechnical detail\n")

    tools.simple_error = simple_error


def install_final_platform_gaps(tools: Any) -> None:
    if getattr(tools, "_final_four_gaps_installed", False):
        return
    _install_error_heading(tools)
    _install_download_worker(tools)
    _install_real_self_tests(tools)
    tools._final_four_gaps_installed = True


__all__ = [
    "MIN_INSTALLER_BYTES",
    "downloads_folder",
    "install_final_platform_gaps",
    "validate_installer",
]
