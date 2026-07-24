from __future__ import annotations

from pathlib import Path
import os
import signal
import subprocess
import sys
import tempfile
import traceback
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot


PASS_MARKER = "FIGURELOOM BIO QUICK TEST PASSED"


def _clean_child_environment() -> dict[str, str]:
    """Return an environment safe for launching another frozen executable."""

    environment = os.environ.copy()
    environment["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    environment["MPLBACKEND"] = "Agg"
    for name in tuple(environment):
        if name.startswith("_PYI_"):
            environment.pop(name, None)
    for name in (
        "PYTHONHOME",
        "PYTHONPATH",
        "DYLD_LIBRARY_PATH",
        "DYLD_FALLBACK_LIBRARY_PATH",
    ):
        environment.pop(name, None)
    return environment


def _run_installed_quick_test(cli: Path, folder: Path) -> subprocess.CompletedProcess[str]:
    """Run the frozen CLI with a timeout that also kills PyInstaller children.

    A one-file PyInstaller executable can leave its extracted child process
    holding stdout/stderr after the launcher is killed. subprocess.run(...,
    timeout=...) then waits forever while collecting those inherited pipes. Use
    regular temporary files and a new process group so the whole frozen process
    tree is stopped deterministically.
    """

    arguments = [str(cli), "quick-test", str(folder)]
    with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stdout_file, tempfile.TemporaryFile(
        mode="w+", encoding="utf-8"
    ) as stderr_file:
        process = subprocess.Popen(
            arguments,
            stdout=stdout_file,
            stderr=stderr_file,
            text=True,
            env=_clean_child_environment(),
            start_new_session=True,
        )
        try:
            returncode = process.wait(timeout=120)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
            raise

        stdout_file.flush()
        stderr_file.flush()
        stdout_file.seek(0)
        stderr_file.seek(0)
        return subprocess.CompletedProcess(
            arguments,
            returncode,
            stdout_file.read(),
            stderr_file.read(),
        )


def install_macos_test_safety(platform_qt_module: Any) -> None:
    """Run the real macOS quick test without unsafe Qt cross-thread UI work."""

    if sys.platform != "darwin":
        return
    if getattr(platform_qt_module, "_macos_test_safety_installed", False):
        return

    def execute_installed_test(destination: Path) -> tuple[bool, str, str]:
        folder = destination.expanduser().resolve()
        success = False
        report = ""
        try:
            cli = Path("/usr/local/bin/flbio")
            if not cli.is_file():
                raise FileNotFoundError(
                    "The installed FigureLoom Bio command was not found at /usr/local/bin/flbio."
                )

            completed = _run_installed_quick_test(cli, folder)
            report = "\n".join(
                part.strip()
                for part in (completed.stdout, completed.stderr)
                if part and part.strip()
            ).strip()

            if completed.returncode != 0:
                raise RuntimeError(
                    f"The installed quick test exited with code {completed.returncode}.\n\n"
                    f"{report or 'The command did not provide any additional details.'}"
                )
            if PASS_MARKER not in report:
                raise RuntimeError(
                    "The installed quick test ended without its required passed message.\n\n"
                    f"{report or 'The command did not provide any additional details.'}"
                )
            success = True
        except subprocess.TimeoutExpired as error:
            report = platform_qt_module.simple_error(
                "The automatic FigureLoom Bio test",
                RuntimeError(
                    "The installed quick test did not finish within two minutes. "
                    "It and every frozen child process were stopped so the Test window could not remain frozen."
                ),
            )
            platform_qt_module.save_failure_details(folder, report, repr(error))
        except Exception as error:  # The visible Test window must always survive.
            report = platform_qt_module.simple_error(
                "The automatic FigureLoom Bio test", error
            )
            platform_qt_module.save_failure_details(
                folder, report, traceback.format_exc()
            )
        return success, report, str(folder)

    class MacOSTestWorker(QObject):
        finished = Signal(bool, str, str)

        def __init__(self, destination: Path) -> None:
            super().__init__()
            self.destination = destination

        @Slot()
        def run(self) -> None:
            self.finished.emit(*execute_installed_test(self.destination))

    original_test_finished = platform_qt_module.TestWindow._test_finished
    original_thread_finished = platform_qt_module.TestWindow._thread_finished

    def deterministic_self_test() -> int:
        """Prove the installed command and real Test window on the UI thread."""

        app = platform_qt_module.application()
        window = platform_qt_module.TestWindow(auto_run=False)
        window.show()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError("The native Test window did not open.")

        success, report, folder = execute_installed_test(platform_qt_module.test_folder())
        original_test_finished(window, success, report, folder)
        app.processEvents()

        if not success or window.status.text() != "Quick test passed":
            raise RuntimeError(report or "The automatic Test window did not pass.")
        if not Path(folder, "quick-volcano.svg").is_file():
            raise RuntimeError("The Test window passed without creating the volcano plot.")

        window.close()
        app.processEvents()
        return 0

    @Slot()
    def finish_thread_and_exit_headless(self: Any) -> None:
        # QThread.finished reaches this callback only after the worker has emitted
        # its result and the thread event loop has stopped. Clear the references
        # first, then let an offscreen automatic test close the application. Quitting
        # from _test_finished was too early and could tear down Qt while its worker
        # thread was still finishing, causing a macOS segmentation fault.
        original_thread_finished(self)
        if os.environ.get("QT_QPA_PLATFORM", "").casefold() != "offscreen":
            return
        app = platform_qt_module.QApplication.instance()
        if app is not None:
            platform_qt_module.QTimer.singleShot(0, app.quit)

    platform_qt_module.TestWorker = MacOSTestWorker
    platform_qt_module.TestWindow._thread_finished = finish_thread_and_exit_headless
    if "--self-test" in sys.argv:
        platform_qt_module.test_window_self_test = deterministic_self_test
    platform_qt_module._macos_test_safety_installed = True


__all__ = ["install_macos_test_safety"]
