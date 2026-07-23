from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import os
import sys
import traceback

from PySide6.QtCore import QObject, QSettings, QThread, QTimer, Qt, QUrl, Signal, Slot
from PySide6.QtGui import QAction, QDesktopServices, QIcon, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSplitter,
    QTabWidget,
    QToolBar,
    QVBoxLayout,
    QWidget,
)

from .errors import FigureLoomBioError
from .native_core import (
    NativeRunResult,
    NativeWorkspace,
    application_data_folder,
    looks_like_program,
    manifest_summary,
    normalize_program_name,
    run_workspace,
    tidy_source,
    vocabulary_entries,
)
from .native_dialogs import (
    ExamplesDialog,
    LocalProjectsDialog,
    ProgramBuilderDialog,
    SentenceLibraryDialog,
    TranslationDialog,
)
from .native_widgets import BlockEditor, CodeEditor, FileTree, ResultsPane, make_button, palette_stylesheet
from .output import Section


APP_NAME = "FigureLoom Bio IDE"
FIGURELOOM_URL = "https://figureloom.org/"


FEATURE_NAMES = (
    "account", "theme", "manual", "figureloom", "run", "new", "open", "save",
    "examples", "builder", "translate", "sentences", "tidy", "export_results",
    "clear_results", "add_file", "delete_file", "text_mode", "blocks_mode",
)


def resource_path(*parts: str) -> Path:
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[2]))
    return root.joinpath(*parts)


class RunWorker(QObject):
    finished = Signal(object)
    failed = Signal(str, int)

    def __init__(self, files: dict[str, str], active: str, allow_tools: bool) -> None:
        super().__init__()
        self.files = files
        self.active = active
        self.allow_tools = allow_tools

    @Slot()
    def run(self) -> None:
        try:
            result = run_workspace(self.files, self.active, allow_tools=self.allow_tools)
            self.finished.emit(result)
        except FigureLoomBioError as error:
            self.failed.emit(error.plain_message(), int(error.line_number or 0))
        except Exception as error:
            self.failed.emit(f"{error}\n\n{traceback.format_exc()}", 0)


class NativeIdeWindow(QMainWindow):
    def __init__(self, workspace: NativeWorkspace | None = None) -> None:
        super().__init__()
        self.workspace = workspace or NativeWorkspace()
        self.entries = vocabulary_entries()
        self.settings = QSettings("FigureLoom", "FigureLoom Bio IDE")
        self.dark = self.settings.value("dark", True, type=bool)
        self._loading = False
        self._syncing_blocks = False
        self._last_sections: list[Section] = []
        self._run_thread: QThread | None = None
        self._run_worker: RunWorker | None = None
        self._save_timer = QTimer(self)
        self._save_timer.setSingleShot(True)
        self._save_timer.setInterval(180)
        self._save_timer.timeout.connect(self.save_editor_to_workspace)
        self.setWindowTitle(APP_NAME)
        self.resize(1500, 900)
        self.setMinimumSize(1020, 660)
        icon = resource_path("assets", "figureloom-bio.png")
        if icon.is_file():
            self.setWindowIcon(QIcon(str(icon)))
        self._build()
        self.apply_theme()
        self.refresh_all()
        self._install_shortcuts()

    def _build(self) -> None:
        root = QWidget()
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(14, 12, 14, 14)
        root_layout.setSpacing(10)
        root_layout.addWidget(self._build_header())
        root_layout.addWidget(self._build_toolbar())
        root_layout.addWidget(self._build_workspace(), 1)
        self.setCentralWidget(root)

    def _build_header(self) -> QWidget:
        header = QFrame()
        header.setObjectName("card")
        layout = QHBoxLayout(header)
        layout.setContentsMargins(14, 10, 14, 10)
        self.account_button = make_button("◌", self.open_projects, name="account")
        self.account_button.setToolTip("Open FigureLoom Bio projects")
        layout.addWidget(self.account_button)
        brand = QVBoxLayout()
        title = QLabel("FigureLoom Bio")
        title.setObjectName("heading")
        subtitle = QLabel("Plain-language IDE · native desktop application")
        subtitle.setObjectName("muted")
        brand.addWidget(title)
        brand.addWidget(subtitle)
        layout.addLayout(brand)
        layout.addStretch(1)
        name_box = QVBoxLayout()
        self.program_name = QLineEdit()
        self.program_name.setMinimumWidth(250)
        self.program_name.setAccessibleName("Program name")
        self.program_name.editingFinished.connect(self.rename_active_file)
        self.save_status = QLabel("Saved on this computer")
        self.save_status.setObjectName("muted")
        name_box.addWidget(self.program_name)
        name_box.addWidget(self.save_status)
        layout.addLayout(name_box)
        self.theme_button = make_button("◐", self.toggle_theme, name="theme")
        self.theme_button.setToolTip("Switch appearance")
        self.manual_button = make_button("Manual", self.open_manual, name="manual")
        self.figureloom_button = make_button("FigureLoom", self.open_figureloom, name="figureloom")
        self.run_button = make_button("Run", self.run_current, name="run", primary=True)
        layout.addWidget(self.theme_button)
        layout.addWidget(self.manual_button)
        layout.addWidget(self.figureloom_button)
        layout.addWidget(self.run_button)
        return header

    def _build_toolbar(self) -> QWidget:
        bar = QFrame()
        bar.setObjectName("card")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(7)
        file_label = QLabel("File")
        file_label.setObjectName("muted")
        layout.addWidget(file_label)
        self.new_button = make_button("New", self.new_program, name="new")
        self.open_button = make_button("Open", self.open_files, name="open")
        self.save_button = make_button("Save", self.save_active_file, name="save")
        for button in (self.new_button, self.open_button, self.save_button):
            layout.addWidget(button)
        divider = QFrame()
        divider.setFrameShape(QFrame.Shape.VLine)
        layout.addWidget(divider)
        program_label = QLabel("Program")
        program_label.setObjectName("muted")
        layout.addWidget(program_label)
        self.examples_button = make_button("Open examples", self.open_examples, name="examples")
        self.builder_button = make_button("Build program", self.open_builder, name="builder")
        self.translate_button = make_button("Translate", self.open_translator, name="translate")
        self.sentences_button = make_button("Sentences", self.open_sentence_library, name="sentences")
        self.tidy_button = make_button("Tidy sentences", self.tidy_program, name="tidy")
        self.export_results_button = make_button("Export results", self.export_results, name="export_results")
        self.clear_results_button = make_button("Clear results", self.clear_results, name="clear_results")
        for button in (
            self.examples_button, self.builder_button, self.translate_button,
            self.sentences_button, self.tidy_button, self.export_results_button,
            self.clear_results_button,
        ):
            layout.addWidget(button)
        layout.addStretch(1)
        self.allow_tools = QCheckBox("Allow installed tools")
        self.allow_tools.setToolTip("Only enable this when the program should launch installed command-line tools.")
        layout.addWidget(self.allow_tools)
        return bar

    def _build_workspace(self) -> QWidget:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)
        splitter.addWidget(self._build_files_panel())
        splitter.addWidget(self._build_editor_panel())
        splitter.addWidget(self._build_results_panel())
        splitter.setSizes([260, 760, 430])
        return splitter

    def _build_files_panel(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("card")
        layout = QVBoxLayout(panel)
        heading_row = QHBoxLayout()
        copy = QVBoxLayout()
        heading = QLabel("Files")
        heading.setObjectName("heading")
        detail = QLabel("Programs, input files, and generated results")
        detail.setObjectName("muted")
        detail.setWordWrap(True)
        copy.addWidget(heading)
        copy.addWidget(detail)
        heading_row.addLayout(copy)
        heading_row.addStretch(1)
        self.add_file_button = make_button("+", self.open_files, name="add_file")
        self.add_file_button.setToolTip("Open files")
        heading_row.addWidget(self.add_file_button)
        layout.addLayout(heading_row)
        self.file_tree = FileTree()
        self.file_tree.file_activated.connect(self.activate_file)
        self.file_tree.delete_requested.connect(self.delete_file)
        layout.addWidget(self.file_tree, 1)
        self.delete_file_button = make_button("Delete selected", self.delete_selected_file, name="delete_file", danger=True)
        layout.addWidget(self.delete_file_button)
        return panel

    def _build_editor_panel(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("card")
        layout = QVBoxLayout(panel)
        top = QHBoxLayout()
        self.active_label = QLabel()
        self.active_label.setObjectName("heading")
        language = QLabel("FigureLoom Bio")
        language.setObjectName("muted")
        top.addWidget(self.active_label)
        top.addStretch(1)
        top.addWidget(language)
        layout.addLayout(top)
        self.tabs = QTabWidget()
        self.tabs.setObjectName("editorModes")
        self.editor = CodeEditor(dark=self.dark)
        self.editor.textChanged.connect(self.editor_changed)
        self.editor.line_changed.connect(lambda line: self.cursor_status.setText(f"Line {line}"))
        self.blocks = BlockEditor()
        self.blocks.source_changed.connect(self.blocks_changed)
        self.blocks.request_vocabulary.connect(lambda: self.open_sentence_library(for_blocks=True))
        self.tabs.addTab(self.editor, "Text")
        self.tabs.addTab(self.blocks, "Blocks")
        self.tabs.currentChanged.connect(self.mode_changed)
        layout.addWidget(self.tabs, 1)
        status = QHBoxLayout()
        self.cursor_status = QLabel("Line 1")
        self.cursor_status.setObjectName("muted")
        instruction_note = QLabel("Instructions end with a period. Block headers end with a colon.")
        instruction_note.setObjectName("muted")
        status.addWidget(self.cursor_status)
        status.addStretch(1)
        status.addWidget(instruction_note)
        layout.addLayout(status)
        return panel

    def _build_results_panel(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("card")
        layout = QVBoxLayout(panel)
        heading_row = QHBoxLayout()
        copy = QVBoxLayout()
        heading = QLabel("Results")
        heading.setObjectName("heading")
        detail = QLabel("Different results stay in separate, readable sections.")
        detail.setObjectName("muted")
        detail.setWordWrap(True)
        copy.addWidget(heading)
        copy.addWidget(detail)
        self.run_status = QLabel("Ready")
        self.run_status.setObjectName("muted")
        heading_row.addLayout(copy)
        heading_row.addStretch(1)
        heading_row.addWidget(self.run_status)
        layout.addLayout(heading_row)
        self.results = ResultsPane()
        layout.addWidget(self.results, 1)
        return panel

    def _install_shortcuts(self) -> None:
        QShortcut(QKeySequence.StandardKey.New, self, activated=self.new_program)
        QShortcut(QKeySequence.StandardKey.Open, self, activated=self.open_files)
        QShortcut(QKeySequence.StandardKey.Save, self, activated=self.save_active_file)
        QShortcut(QKeySequence("Ctrl+Return"), self, activated=self.run_current)
        QShortcut(QKeySequence("Meta+Return"), self, activated=self.run_current)
        QShortcut(QKeySequence("Ctrl+Shift+P"), self, activated=self.open_sentence_library)
        QShortcut(QKeySequence("Meta+Shift+P"), self, activated=self.open_sentence_library)

    def apply_theme(self) -> None:
        self.setStyleSheet(palette_stylesheet(self.dark))
        self.editor.highlighter.set_dark(self.dark)
        self.settings.setValue("dark", self.dark)

    def toggle_theme(self) -> None:
        self.dark = not self.dark
        self.apply_theme()

    def refresh_all(self) -> None:
        self.refresh_files()
        self.load_active_file()

    def refresh_files(self) -> None:
        self.file_tree.set_files(self.workspace.files, self.workspace.active_file)

    def load_active_file(self) -> None:
        name = self.workspace.active_file
        self._loading = True
        self.editor.setPlainText(self.workspace.files.get(name, ""))
        self.blocks.set_source(self.workspace.files.get(name, ""))
        self.program_name.setText(name)
        self.active_label.setText(name)
        self._loading = False
        self.save_status.setText("Saved on this computer")

    def save_editor_to_workspace(self) -> None:
        if self._loading or not self.workspace.active_file:
            return
        self.workspace.set_content(self.workspace.active_file, self.editor.toPlainText())
        self.save_status.setText("Saved on this computer")

    def editor_changed(self) -> None:
        if self._loading:
            return
        self.save_status.setText("Saving…")
        if not self._syncing_blocks:
            self._syncing_blocks = True
            self.blocks.set_source(self.editor.toPlainText())
            self._syncing_blocks = False
        self._save_timer.start()

    def blocks_changed(self, source: str) -> None:
        if self._loading or self._syncing_blocks:
            return
        self._syncing_blocks = True
        cursor = self.editor.textCursor()
        self.editor.setPlainText(source)
        cursor.setPosition(min(cursor.position(), len(source)))
        self.editor.setTextCursor(cursor)
        self._syncing_blocks = False
        self._save_timer.start()

    def mode_changed(self, index: int) -> None:
        if index == 1:
            self.blocks.set_source(self.editor.toPlainText())

    def activate_file(self, name: str) -> None:
        self.save_editor_to_workspace()
        self.workspace.activate(name)
        self.refresh_all()

    def new_program(self) -> None:
        self.save_editor_to_workspace()
        self.workspace.new_program()
        self.refresh_all()
        self.editor.setFocus()

    def rename_active_file(self) -> None:
        old = self.workspace.active_file
        try:
            name = self.workspace.rename(old, self.program_name.text())
        except (ValueError, KeyError) as error:
            QMessageBox.warning(self, APP_NAME, str(error))
            self.program_name.setText(old)
            return
        self.active_label.setText(name)
        self.refresh_files()

    def open_files(self) -> None:
        paths, _filter = QFileDialog.getOpenFileNames(
            self,
            "Open FigureLoom Bio files",
            str(Path.home()),
            "Supported files (*.flbio *.txt *.csv *.tsv *.fa *.fasta *.fna *.ffn *.faa *.frn *.fq *.fastq *.svg *.nwk *.newick *.vcf *.gff *.gff3 *.bed);;All files (*)",
        )
        if not paths:
            return
        try:
            self.save_editor_to_workspace()
            self.workspace.import_paths(Path(path) for path in paths)
            self.refresh_all()
        except OSError as error:
            QMessageBox.critical(self, APP_NAME, f"The files could not be opened.\n\n{error}")

    def save_active_file(self) -> None:
        self.save_editor_to_workspace()
        name = self.workspace.active_file
        suggested = str(Path.home() / name)
        path, _filter = QFileDialog.getSaveFileName(self, "Save FigureLoom Bio file", suggested, "All files (*)")
        if not path:
            return
        try:
            self.workspace.export_file(name, Path(path))
            self.save_status.setText(f"Saved as {Path(path).name}")
        except OSError as error:
            QMessageBox.critical(self, APP_NAME, f"The file could not be saved.\n\n{error}")

    def delete_selected_file(self) -> None:
        name = self.file_tree.selected_name()
        if name:
            self.delete_file(name)

    def delete_file(self, name: str) -> None:
        answer = QMessageBox.question(self, "Delete file", f"Delete {name} from this FigureLoom Bio workspace?")
        if answer != QMessageBox.StandardButton.Yes:
            return
        self.workspace.delete(name)
        self.refresh_all()

    def open_examples(self) -> None:
        dialog = ExamplesDialog(self)
        dialog.example_selected.connect(self.add_example)
        dialog.exec()

    def add_example(self, title: str) -> None:
        self.save_editor_to_workspace()
        self.workspace.add_example_set(title)
        self.refresh_all()

    def open_builder(self) -> None:
        dialog = ProgramBuilderDialog(self.entries, self)
        dialog.use_program.connect(self.use_built_program)
        dialog.exec()

    def use_built_program(self, requested: str, source: str) -> None:
        name = self.workspace.unique_name(normalize_program_name(requested))
        self.workspace.files[name] = source
        self.workspace.active_file = name
        self.workspace.save()
        self.refresh_all()

    def open_sentence_library(self, for_blocks: bool = False) -> None:
        dialog = SentenceLibraryDialog(self.entries, self)
        if for_blocks:
            dialog.sentence_selected.connect(self.blocks.add_sentence)
        else:
            dialog.sentence_selected.connect(self.editor.insert_sentence)
        dialog.exec()

    def open_manual(self) -> None:
        dialog = SentenceLibraryDialog(self.entries, self, title="FigureLoom Bio manual and vocabulary")
        dialog.sentence_selected.connect(self.editor.insert_sentence)
        dialog.exec()

    def open_translator(self) -> None:
        if not looks_like_program(self.workspace.active_file):
            QMessageBox.warning(self, APP_NAME, "Open a .flbio program before translating.")
            return
        self.save_editor_to_workspace()
        TranslationDialog(self.editor.toPlainText(), self.workspace.active_file, self).exec()

    def tidy_program(self) -> None:
        if not looks_like_program(self.workspace.active_file):
            QMessageBox.warning(self, APP_NAME, "Open a .flbio program before tidying sentences.")
            return
        self.editor.setPlainText(tidy_source(self.editor.toPlainText()))
        self.save_editor_to_workspace()

    def clear_results(self) -> None:
        self._last_sections = []
        self.results.show_empty("Results cleared.", "Press Run when the program is ready.")
        self.run_status.setText("Ready")
        self.export_results_button.setEnabled(False)

    def run_current(self) -> None:
        if self._run_thread is not None:
            return
        self.save_editor_to_workspace()
        if not looks_like_program(self.workspace.active_file):
            QMessageBox.warning(self, APP_NAME, "Open a .flbio program before pressing Run.")
            return
        self.run_status.setText("Running…")
        self.run_button.setEnabled(False)
        self.results.show_empty("Running the program…", "Results will appear here in separate sections.")
        self._run_thread = QThread(self)
        self._run_worker = RunWorker(dict(self.workspace.files), self.workspace.active_file, self.allow_tools.isChecked())
        self._run_worker.moveToThread(self._run_thread)
        self._run_thread.started.connect(self._run_worker.run)
        self._run_worker.finished.connect(self.run_finished)
        self._run_worker.failed.connect(self.run_failed)
        self._run_worker.finished.connect(self._run_thread.quit)
        self._run_worker.failed.connect(self._run_thread.quit)
        self._run_thread.finished.connect(self._run_cleanup)
        self._run_thread.start()

    @Slot(object)
    def run_finished(self, result: NativeRunResult) -> None:
        for name, content in result.generated_files.items():
            self.workspace.files[name] = content
        self.workspace.save()
        self.refresh_files()
        self._last_sections = list(result.sections)
        self.results.set_sections(self._last_sections)
        self.run_status.setText("Finished")
        self.export_results_button.setEnabled(bool(self._last_sections))

    @Slot(str, int)
    def run_failed(self, message: str, line_number: int) -> None:
        title = f"Line {line_number}" if line_number else "The program could not run"
        self._last_sections = [Section(title, [message])]
        self.results.set_sections(self._last_sections)
        self.run_status.setText("Needs attention")
        self.export_results_button.setEnabled(True)
        if line_number:
            cursor = self.editor.textCursor()
            cursor.movePosition(cursor.MoveOperation.Start)
            cursor.movePosition(cursor.MoveOperation.Down, cursor.MoveMode.MoveAnchor, max(0, line_number - 1))
            self.editor.setTextCursor(cursor)
            self.editor.setFocus()

    def _run_cleanup(self) -> None:
        self.run_button.setEnabled(True)
        if self._run_worker is not None:
            self._run_worker.deleteLater()
        if self._run_thread is not None:
            self._run_thread.deleteLater()
        self._run_worker = None
        self._run_thread = None

    def export_results(self) -> None:
        if not self._last_sections:
            return
        base = Path(self.workspace.active_file).stem or "figureloom-bio"
        path, selected = QFileDialog.getSaveFileName(
            self,
            "Export FigureLoom Bio results",
            str(Path.home() / f"{base}-results.txt"),
            "Plain text report (*.txt);;PNG image (*.png)",
        )
        if not path:
            return
        try:
            if selected.startswith("PNG") or path.casefold().endswith(".png"):
                if not path.casefold().endswith(".png"):
                    path += ".png"
                image = self.results.container.grab()
                if not image.save(path, "PNG"):
                    raise OSError("The result image could not be written.")
            else:
                if not path.casefold().endswith(".txt"):
                    path += ".txt"
                lines = [f"{self.workspace.active_file} results", ""]
                for section in self._last_sections:
                    lines.extend([section.title, "", *section.lines, ""])
                Path(path).write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        except OSError as error:
            QMessageBox.critical(self, APP_NAME, f"The results could not be exported.\n\n{error}")

    def open_projects(self) -> None:
        dialog = LocalProjectsDialog(self.workspace, self)
        dialog.workspace_restored.connect(self.refresh_all)
        dialog.exec()

    def open_figureloom(self) -> None:
        QDesktopServices.openUrl(QUrl(FIGURELOOM_URL))

    def closeEvent(self, event) -> None:  # noqa: N802 - Qt API name
        self.save_editor_to_workspace()
        if self._run_thread is not None:
            answer = QMessageBox.question(self, APP_NAME, "A program is still running. Close the IDE anyway?")
            if answer != QMessageBox.StandardButton.Yes:
                event.ignore()
                return
            self._run_thread.requestInterruption()
        event.accept()

    def feature_names(self) -> set[str]:
        return {
            str(button.property("featureName"))
            for button in self.findChildren(QPushButton)
            if button.property("featureName")
        }


def native_self_test() -> int:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    with tempfile_workspace() as workspace:
        app = QApplication.instance() or QApplication([APP_NAME, "--self-test"])
        window = NativeIdeWindow(workspace)
        manifest, vocabulary_count = manifest_summary()
        missing = sorted(set(FEATURE_NAMES) - window.feature_names())
        if missing:
            raise RuntimeError("Missing native controls: " + ", ".join(missing))
        if vocabulary_count <= len(manifest.commands):
            raise RuntimeError("Accepted vocabulary wording did not load into the native IDE.")
        result = run_workspace(dict(workspace.files), workspace.active_file)
        if not result.sections:
            raise RuntimeError("The native IDE engine produced no quick-test result sections.")
        window.new_program()
        if not workspace.active_file.endswith(".flbio"):
            raise RuntimeError("The native New button did not create a .flbio program.")
        window.editor.setPlainText("Say Native desktop test")
        window.tidy_program()
        if window.editor.toPlainText().strip() != "Say Native desktop test.":
            raise RuntimeError("The native Tidy sentences button did not work.")
        report = {
            "status": "NATIVE IDE SELF TEST PASSED",
            "manifest_entries": len(manifest.commands),
            "vocabulary_entries": vocabulary_count,
            "controls": sorted(window.feature_names()),
            "result_sections": len(result.sections),
            "interface": "Qt Widgets",
            "browser_server": False,
            "bundled_web_interface": False,
        }
        print(json.dumps(report, indent=2))
        window.close()
        app.processEvents()
        return 0


@dataclass
class _TemporaryWorkspaceContext:
    folder: Path
    workspace: NativeWorkspace

    def __enter__(self) -> NativeWorkspace:
        return self.workspace

    def __exit__(self, _type, _value, _traceback) -> None:
        import shutil
        shutil.rmtree(self.folder, ignore_errors=True)


def tempfile_workspace() -> _TemporaryWorkspaceContext:
    import tempfile
    folder = Path(tempfile.mkdtemp(prefix="figureloom-native-self-test-"))
    return _TemporaryWorkspaceContext(folder, NativeWorkspace(folder / "workspace.json"))


def run_native_ide(arguments: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if arguments is None else arguments)
    if "--self-test" in args:
        return native_self_test()
    app = QApplication.instance() or QApplication([APP_NAME, *args])
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("FigureLoom")
    window = NativeIdeWindow()
    paths = [Path(value) for value in args if not value.startswith("-") and Path(value).is_file()]
    if paths:
        try:
            window.workspace.import_paths(paths)
            window.refresh_all()
        except OSError as error:
            QMessageBox.critical(window, APP_NAME, f"The files could not be opened.\n\n{error}")
    window.show()
    return app.exec()


__all__ = ["NativeIdeWindow", "run_native_ide", "native_self_test"]
