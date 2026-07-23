from __future__ import annotations

from pathlib import Path
import traceback
from typing import Any

from PySide6.QtWidgets import QMessageBox

from .errors import FigureLoomBioError
from .native_core import application_data_folder, run_workspace


def _save_run_details(details: str) -> Path | None:
    try:
        folder = application_data_folder()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / "last-run-error.txt"
        path.write_text(details.rstrip() + "\n", encoding="utf-8")
        return path
    except OSError:
        return None


def _unexpected_run_message(error: BaseException, details_path: Path | None) -> str:
    detail = str(error).strip() or error.__class__.__name__
    saved = (
        f"\n\nTechnical details were saved here:\n{details_path}"
        if details_path is not None
        else "\n\nThe computer also refused to save the technical details file."
    )
    return (
        "The program could not finish.\n\n"
        "What happened\n"
        "FigureLoom Bio hit an unexpected internal error while running this program.\n\n"
        "What to do\n"
        "Open Install or Update FigureLoom Bio and choose Repair, then run the program again. "
        "Your program and workspace files were not deleted.\n\n"
        f"Details\n{error.__class__.__name__}: {detail}"
        f"{saved}"
    )


def install_native_run_safety(native_ide_module: Any) -> None:
    """Keep worker errors and window closing from hard-crashing the native IDE."""

    worker_class = native_ide_module.RunWorker
    if not getattr(worker_class, "_figureloom_safe_run_installed", False):

        def safe_run(self: Any) -> None:
            try:
                result = run_workspace(
                    self.files,
                    self.active,
                    allow_tools=self.allow_tools,
                )
                self.finished.emit(result)
            except FigureLoomBioError as error:
                self.failed.emit(error.plain_message(), int(error.line_number or 0))
            except Exception as error:
                details_path = _save_run_details(traceback.format_exc())
                self.failed.emit(_unexpected_run_message(error, details_path), 0)

        worker_class.run = safe_run
        worker_class._figureloom_safe_run_installed = True

    window_class = native_ide_module.NativeIdeWindow
    if getattr(window_class, "_figureloom_safe_close_installed", False):
        return

    original_close_event = window_class.closeEvent

    def safe_close_event(self: Any, event: Any) -> None:
        thread = getattr(self, "_run_thread", None)
        if thread is not None and thread.isRunning():
            QMessageBox.information(
                self,
                native_ide_module.APP_NAME,
                "The program is still running.\n\n"
                "Wait for it to finish or report an error before closing the IDE. "
                "This prevents the running job and its files from being cut off.",
            )
            event.ignore()
            return
        original_close_event(self, event)

    window_class.closeEvent = safe_close_event
    window_class._figureloom_safe_close_installed = True


__all__ = ["install_native_run_safety"]
