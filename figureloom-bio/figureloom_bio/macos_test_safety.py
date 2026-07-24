from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys
import traceback
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot


PASS_MARKER = "FIGURELOOM BIO QUICK TEST PASSED"


def install_macos_test_safety(platform_qt_module: Any) -> None:
    """Run the real macOS quick test outside Qt's worker thread.

    Scientific figure generation can block when it is performed inside a Qt
    QThread in a frozen macOS application. The installed command-line tool
    already runs the same real language test in its own process, so the Test
    window delegates to that command on macOS and remains responsive.
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

                environment = os.environ.copy()
                environment.setdefault("MPLBACKEND", "Agg")
                completed = subprocess.run(
                    [str(cli), "quick-test", str(folder)],
                    capture_output=True,
                    text=True,
                    timeout=240,
                    check=False,
                    env=environment,
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
                        "The installed quick test did not finish within four minutes. "
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

    platform_qt_module.TestWorker = MacOSTestWorker
    platform_qt_module._macos_test_safety_installed = True


__all__ = ["install_macos_test_safety"]
