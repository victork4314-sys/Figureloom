from __future__ import annotations

import os
from pathlib import Path
import traceback
from typing import Any

from PySide6.QtWidgets import QApplication, QMessageBox

from .errors import FigureLoomBioError
from .native_core import application_data_folder, looks_like_program, run_workspace


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


def _foreground_colors(editor: Any) -> set[str]:
    colors: set[str] = set()
    block = editor.document().firstBlock()
    while block.isValid():
        layout = block.layout()
        if layout is not None:
            for item in layout.formats():
                color = item.format.foreground().color()
                if color.isValid():
                    colors.add(color.name())
        block = block.next()
    return colors


def _plain_run_error(error: FigureLoomBioError) -> tuple[str, int]:
    cause = error.__cause__
    if cause is not None and not isinstance(cause, FigureLoomBioError):
        details_path = _save_run_details(traceback.format_exc())
        return _unexpected_run_message(cause, details_path), 0
    return error.plain_message(), int(error.line_number or 0)


def _save_theme_screenshots(window: Any, app: QApplication) -> None:
    requested = os.environ.get("FIGURELOOM_NATIVE_SCREENSHOT_DIR", "").strip()
    if not requested:
        return
    folder = Path(requested)
    folder.mkdir(parents=True, exist_ok=True)
    original_dark = bool(window.dark)
    try:
        for dark, name in ((False, "figureloom-bio-light.png"), (True, "figureloom-bio-dark.png")):
            window.dark = dark
            window.apply_theme()
            app.processEvents()
            window.repaint()
            app.processEvents()
            target = folder / name
            if not window.grab().save(str(target), "PNG") or target.stat().st_size == 0:
                raise RuntimeError(f"The native {name} validation screenshot could not be saved.")
    finally:
        window.dark = original_dark
        window.apply_theme()
        app.processEvents()


def install_native_run_safety(native_ide_module: Any) -> None:
    """Make the actual desktop Run button deterministic and keep failures readable."""

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
                message, line = _plain_run_error(error)
                self.failed.emit(message, line)
            except Exception as error:
                details_path = _save_run_details(traceback.format_exc())
                self.failed.emit(_unexpected_run_message(error, details_path), 0)

        worker_class.run = safe_run
        worker_class._figureloom_safe_run_installed = True

    window_class = native_ide_module.NativeIdeWindow
    if not getattr(window_class, "_figureloom_direct_run_installed", False):
        original_close_event = window_class.closeEvent

        def direct_run_current(self: Any) -> None:
            if getattr(self, "_run_in_progress", False):
                return
            self.save_editor_to_workspace()
            if not looks_like_program(self.workspace.active_file):
                QMessageBox.warning(self, native_ide_module.APP_NAME, "Open a .flbio program before pressing Run.")
                return

            self._run_in_progress = True
            self.run_status.setText("Running…")
            self.run_button.setEnabled(False)
            self.results.show_empty("Running the program…", "Results will appear here in separate sections.")
            app = QApplication.instance()
            if app is not None:
                app.processEvents()

            try:
                result = run_workspace(
                    dict(self.workspace.files),
                    self.workspace.active_file,
                    allow_tools=self.allow_tools.isChecked(),
                )
            except FigureLoomBioError as error:
                message, line = _plain_run_error(error)
                self.run_failed(message, line)
            except Exception as error:
                details_path = _save_run_details(traceback.format_exc())
                self.run_failed(_unexpected_run_message(error, details_path), 0)
            else:
                self.run_finished(result)
            finally:
                self._run_in_progress = False
                self.run_button.setEnabled(True)
                self._run_worker = None
                self._run_thread = None
                if app is not None:
                    app.processEvents()

        def safe_close_event(self: Any, event: Any) -> None:
            thread = getattr(self, "_run_thread", None)
            thread_running = thread is not None and thread.isRunning()
            if getattr(self, "_run_in_progress", False) or thread_running:
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

        window_class.run_current = direct_run_current
        window_class.closeEvent = safe_close_event
        window_class._figureloom_direct_run_installed = True
        window_class._figureloom_safe_close_installed = True

    if getattr(native_ide_module, "_figureloom_painted_self_test_installed", False):
        return

    original_self_test = native_ide_module.native_self_test

    def painted_self_test() -> int:
        os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
        app = QApplication.instance() or QApplication([native_ide_module.APP_NAME, "--self-test"])
        with native_ide_module.tempfile_workspace() as workspace:
            window = native_ide_module.NativeIdeWindow(workspace)
            window.show()
            app.processEvents()

            workspace.active_file = "example.flbio"
            workspace.save()
            window.refresh_all()
            _save_theme_screenshots(window, app)

            # Exercise the real GUI path that users trigger. The default example is the
            # same eight-line table-cleaning program shipped in the installed IDE.
            window.run_button.click()
            app.processEvents()
            if window.run_status.text() != "Finished":
                raise RuntimeError(
                    "The real native Run button did not finish the bundled eight-line program; "
                    f"the status stayed at {window.run_status.text()!r}."
                )
            if not window._last_sections:
                raise RuntimeError("The real native Run button finished without showing result sections.")
            if getattr(window, "_run_in_progress", False):
                raise RuntimeError("The real native Run button left the IDE marked as still running.")

            window.editor.setPlainText("Open the file samples.csv.")
            window.editor.highlighter.rehighlight()
            app.processEvents()
            window.editor.viewport().update()
            window.editor.line_number_area.update()
            app.processEvents()
            if not window.isVisible():
                raise RuntimeError("The final native IDE window did not become visible during its startup test.")

            highlighter = window.editor.highlighter
            expected_colors = {
                highlighter.command.foreground().color().name(),
                highlighter.file.foreground().color().name(),
                highlighter.word.foreground().color().name(),
                highlighter.punctuation.foreground().color().name(),
            }
            actual_colors = _foreground_colors(window.editor)
            missing_colors = sorted(expected_colors - actual_colors)
            if missing_colors:
                raise RuntimeError(
                    "The final native editor did not paint all accepted-instruction token colors: "
                    + ", ".join(missing_colors)
                )

            window.close()
            app.processEvents()
        return original_self_test()

    native_ide_module.native_self_test = painted_self_test
    native_ide_module._figureloom_painted_self_test_installed = True


__all__ = ["install_native_run_safety"]
