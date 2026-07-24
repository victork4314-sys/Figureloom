from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys
import traceback
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot


PASS_MARKER = "FIGURELOOM BIO QUICK TEST PASSED"


def _clean_child_environment() -> dict[str, str]:
    """Return an environment safe for launching another frozen executable.

    PyInstaller one-file applications expose private runtime variables to their
    children. If the installed Test app passes those variables to the separate
    flbio executable, the child can reuse the Test app's temporary extraction
    directory and hang or load the wrong bundled libraries. The reset flag and
    cleanup below force flbio to start as a completely independent process.
    """

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


def install_macos_test_safety(platform_qt_module: Any) -> None:
    """Run the real macOS quick test in a clean separate process.

    Scientific figure generation can block when it is performed inside a Qt
    QThread in a frozen macOS application. The installed command-line tool runs
    the same real language test in its own process. A clean process environment
    is essential because both programs are separate PyInstaller executables.
    """

    if sys.platform != "darwin":
        return
    if getattr(platform_qt_module, "_macos_test_safety_installed", False):
        return

    class MacOSTestWorker(QObject):
        finished = Signal(bool, str, str)

        def __init__(self, destination: Path) -> None:
            super().__init__()
            self.destination = destination

        @Slot()
        def run(self) -> None:
            folder = self.destination.expanduser().resolve()
            success = False
            report = ""
            try:
                cli = Path("/usr/local/bin/flbio")
                if not cli.is_file():
                    raise FileNotFoundError(
                        "The installed FigureLoom Bio command was not found at /usr/local/bin/flbio."
                    )

                completed = subprocess.run(
                    [str(cli), "quick-test", str(folder)],
                    capture_output=True,
                    text=True,
                    timeout=120,
                    check=False,
                    env=_clean_child_environment(),
                )
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
                        "It was stopped so the Test window would not remain frozen."
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

            self.finished.emit(success, report, str(folder))

    original_test_finished = platform_qt_module.TestWindow._test_finished

    def finish_and_exit_headless(self: Any, success: bool, report: str, folder: str) -> None:
        original_test_finished(self, success, report, folder)
        if os.environ.get("QT_QPA_PLATFORM", "").casefold() != "offscreen":
            return
        # The --self-test wrapper owns a nested event loop and exits it after the
        # worker and QThread have fully finished. Quitting QApplication here can
        # strand that nested loop. Normal headless launches still close promptly.
        if "--self-test" in sys.argv:
            return
        app = platform_qt_module.QApplication.instance()
        if app is not None:
            platform_qt_module.QTimer.singleShot(0, app.quit)

    platform_qt_module.TestWorker = MacOSTestWorker
    platform_qt_module.TestWindow._test_finished = finish_and_exit_headless
    platform_qt_module._macos_test_safety_installed = True


__all__ = ["install_macos_test_safety"]
