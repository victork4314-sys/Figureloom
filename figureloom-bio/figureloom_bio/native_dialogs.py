from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import (
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFileDialog,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QSpinBox,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from .native_core import (
    EXAMPLE_SETS,
    LocalProject,
    NativeWorkspace,
    VocabularyEntry,
    delete_local_project,
    load_local_projects,
    restore_local_project,
    save_workspace_to_gallery,
    target_options,
    translate_text,
)


class SentenceLibraryDialog(QDialog):
    sentence_selected = Signal(str)

    def __init__(self, entries: Iterable[VocabularyEntry], parent: QWidget | None = None, *, title: str = "Built-in sentences") -> None:
        super().__init__(parent)
        self.setWindowTitle(title)
        self.resize(920, 680)
        self.entries = tuple(entries)
        layout = QVBoxLayout(self)
        heading = QLabel(title)
        heading.setObjectName("heading")
        copy = QLabel("Search the complete built-in language. Double-click a sentence or press Add.")
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)

        filters = QHBoxLayout()
        self.search = QLineEdit()
        self.search.setPlaceholderText("Search sentences, themes, and accepted wording")
        self.theme = QComboBox()
        self.theme.addItem("All themes", "")
        seen: set[str] = set()
        for entry in self.entries:
            if entry.theme not in seen:
                seen.add(entry.theme)
                self.theme.addItem(entry.theme_title, entry.theme)
        self.count = QLabel()
        self.count.setObjectName("muted")
        filters.addWidget(self.search, 1)
        filters.addWidget(self.theme)
        filters.addWidget(self.count)
        layout.addLayout(filters)

        self.list = QListWidget()
        self.list.setWordWrap(True)
        self.list.itemDoubleClicked.connect(lambda item: self._choose(item))
        layout.addWidget(self.list, 1)

        actions = QDialogButtonBox()
        self.add_button = actions.addButton("Add sentence", QDialogButtonBox.ButtonRole.AcceptRole)
        actions.addButton(QDialogButtonBox.StandardButton.Close)
        self.add_button.clicked.connect(self._choose_current)
        actions.rejected.connect(self.reject)
        layout.addWidget(actions)
        self.search.textChanged.connect(self.refresh)
        self.theme.currentIndexChanged.connect(self.refresh)
        self.refresh()

    def refresh(self) -> None:
        wanted = self.search.text().strip().casefold()
        theme = str(self.theme.currentData() or "")
        self.list.clear()
        visible = 0
        for entry in self.entries:
            if theme and entry.theme != theme:
                continue
            wording = "accepted wording" if entry.accepted_wording else "included canonical"
            haystack = f"{entry.id} {entry.theme_title} {entry.example} {wording}".casefold()
            if wanted and wanted not in haystack:
                continue
            item = QListWidgetItem(f"{entry.example}\n{entry.theme_title} · {'Accepted wording' if entry.accepted_wording else 'Included'}")
            item.setData(Qt.ItemDataRole.UserRole, entry.example)
            self.list.addItem(item)
            visible += 1
        self.count.setText(f"{visible:,} of {len(self.entries):,}")
        if self.list.count():
            self.list.setCurrentRow(0)

    def _choose_current(self) -> None:
        item = self.list.currentItem()
        if item:
            self._choose(item)

    def _choose(self, item: QListWidgetItem) -> None:
        self.sentence_selected.emit(str(item.data(Qt.ItemDataRole.UserRole)))


class ExamplesDialog(QDialog):
    example_selected = Signal(str)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("FigureLoom Bio examples")
        self.resize(660, 460)
        layout = QVBoxLayout(self)
        heading = QLabel("Open examples")
        heading.setObjectName("heading")
        copy = QLabel("Each example adds the real .flbio program and its input files to the Files panel.")
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)
        self.list = QListWidget()
        for title, files in EXAMPLE_SETS.items():
            item = QListWidgetItem(f"{title}\n{', '.join(files)}")
            item.setData(Qt.ItemDataRole.UserRole, title)
            self.list.addItem(item)
        self.list.itemDoubleClicked.connect(lambda item: self._choose(item))
        layout.addWidget(self.list, 1)
        buttons = QDialogButtonBox()
        open_button = buttons.addButton("Open example", QDialogButtonBox.ButtonRole.AcceptRole)
        buttons.addButton(QDialogButtonBox.StandardButton.Cancel)
        open_button.clicked.connect(self._choose_current)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.list.setCurrentRow(0)

    def _choose_current(self) -> None:
        item = self.list.currentItem()
        if item:
            self._choose(item)

    def _choose(self, item: QListWidgetItem) -> None:
        self.example_selected.emit(str(item.data(Qt.ItemDataRole.UserRole)))
        self.accept()


class TranslationDialog(QDialog):
    def __init__(self, source: str, program_name: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.source = source
        self.program_name = program_name
        self.result = None
        self.setWindowTitle("Translate this program")
        self.resize(980, 700)
        layout = QVBoxLayout(self)
        heading = QLabel("Translate this program")
        heading.setObjectName("heading")
        copy = QLabel("The native engine generates the translation directly from the open .flbio program.")
        copy.setObjectName("muted")
        layout.addWidget(heading)
        layout.addWidget(copy)
        row = QHBoxLayout()
        row.addWidget(QLabel("Target language"))
        self.target = QComboBox()
        for key, label, extension in target_options():
            self.target.addItem(f"{label} ({extension})", key)
        row.addWidget(self.target)
        self.filename = QLabel()
        self.filename.setObjectName("muted")
        row.addStretch(1)
        row.addWidget(self.filename)
        layout.addLayout(row)
        self.preview = QPlainTextEdit()
        self.preview.setReadOnly(True)
        layout.addWidget(self.preview, 1)
        self.notes = QLabel()
        self.notes.setObjectName("muted")
        self.notes.setWordWrap(True)
        layout.addWidget(self.notes)
        actions = QDialogButtonBox()
        copy_button = actions.addButton("Copy code", QDialogButtonBox.ButtonRole.ActionRole)
        save_button = actions.addButton("Save translation", QDialogButtonBox.ButtonRole.AcceptRole)
        actions.addButton(QDialogButtonBox.StandardButton.Close)
        copy_button.clicked.connect(self.copy_code)
        save_button.clicked.connect(self.save_translation)
        actions.rejected.connect(self.reject)
        layout.addWidget(actions)
        self.target.currentIndexChanged.connect(self.refresh)
        self.refresh()

    def refresh(self) -> None:
        try:
            self.result = translate_text(self.source, str(self.target.currentData()), self.program_name)
            self.preview.setPlainText(self.result.content)
            self.filename.setText(str(Path(self.program_name).with_suffix(self.result.extension).name))
            notes: list[str] = []
            if self.result.requirements:
                notes.append("Required tools: " + ", ".join(self.result.requirements))
            notes.extend(self.result.warnings)
            self.notes.setText("\n".join(notes) if notes else "No translation warnings.")
        except Exception as error:
            self.result = None
            self.preview.setPlainText(str(error))
            self.filename.clear()
            self.notes.setText("The program could not be translated.")

    def copy_code(self) -> None:
        QGuiApplication.clipboard().setText(self.preview.toPlainText())

    def save_translation(self) -> None:
        if self.result is None:
            return
        suggested = str(Path(self.program_name).with_suffix(self.result.extension).name)
        path, _filter = QFileDialog.getSaveFileName(self, "Save translation", suggested, "All files (*)")
        if path:
            Path(path).write_text(self.result.content, encoding="utf-8")


class ProgramBuilderDialog(QDialog):
    use_program = Signal(str, str)

    def __init__(self, entries: Iterable[VocabularyEntry], parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.entries = tuple(entries)
        self.setWindowTitle("Build a FigureLoom Bio program")
        self.resize(980, 720)
        layout = QVBoxLayout(self)
        heading = QLabel("Build a FigureLoom Bio program")
        heading.setObjectName("heading")
        copy = QLabel("Start with a workflow or assemble ordinary instructions. Every block remains editable.")
        copy.setObjectName("muted")
        layout.addWidget(heading)
        layout.addWidget(copy)

        settings = QFormLayout()
        self.filename = QLineEdit("new-program.flbio")
        self.runs = QSpinBox()
        self.runs.setRange(1, 100)
        self.runs.setValue(1)
        self.preset = QComboBox()
        self.preset.addItem("Blank program", "")
        for title in EXAMPLE_SETS:
            self.preset.addItem(title, title)
        settings.addRow("Program filename", self.filename)
        settings.addRow("Run the program", self.runs)
        settings.addRow("Start with", self.preset)
        layout.addLayout(settings)

        splitter = QSplitter()
        self.steps = QListWidget()
        self.steps.setDragDropMode(QListWidget.DragDropMode.InternalMove)
        self.steps.setDefaultDropAction(Qt.DropAction.MoveAction)
        splitter.addWidget(self.steps)

        vocabulary_panel = QWidget()
        vocabulary_layout = QVBoxLayout(vocabulary_panel)
        self.search = QLineEdit()
        self.search.setPlaceholderText("Search instructions")
        self.vocabulary = QListWidget()
        vocabulary_layout.addWidget(self.search)
        vocabulary_layout.addWidget(self.vocabulary, 1)
        add = QPushButton("Add instruction")
        add.setObjectName("primary")
        add.clicked.connect(self.add_selected)
        vocabulary_layout.addWidget(add)
        splitter.addWidget(vocabulary_panel)
        splitter.setSizes([520, 390])
        layout.addWidget(splitter, 1)

        step_actions = QHBoxLayout()
        remove = QPushButton("Delete instruction")
        clear = QPushButton("Clear instructions")
        remove.clicked.connect(self.delete_selected)
        clear.clicked.connect(self.steps.clear)
        step_actions.addWidget(remove)
        step_actions.addWidget(clear)
        step_actions.addStretch(1)
        layout.addLayout(step_actions)

        buttons = QDialogButtonBox()
        download = buttons.addButton("Save program", QDialogButtonBox.ButtonRole.ActionRole)
        use = buttons.addButton("Use in IDE", QDialogButtonBox.ButtonRole.AcceptRole)
        buttons.addButton(QDialogButtonBox.StandardButton.Cancel)
        download.clicked.connect(self.save_program)
        use.clicked.connect(self.send_to_ide)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self.search.textChanged.connect(self.refresh_vocabulary)
        self.preset.currentIndexChanged.connect(self.load_preset)
        self.vocabulary.itemDoubleClicked.connect(lambda _item: self.add_selected())
        self.refresh_vocabulary()

    def refresh_vocabulary(self) -> None:
        wanted = self.search.text().strip().casefold()
        self.vocabulary.clear()
        for entry in self.entries:
            if wanted and wanted not in f"{entry.example} {entry.theme_title}".casefold():
                continue
            item = QListWidgetItem(f"{entry.example}\n{entry.theme_title}")
            item.setData(Qt.ItemDataRole.UserRole, entry.example)
            self.vocabulary.addItem(item)
        if self.vocabulary.count():
            self.vocabulary.setCurrentRow(0)

    def add_selected(self) -> None:
        item = self.vocabulary.currentItem()
        if not item:
            return
        step = QListWidgetItem(str(item.data(Qt.ItemDataRole.UserRole)))
        step.setFlags(step.flags() | Qt.ItemFlag.ItemIsEditable | Qt.ItemFlag.ItemIsDragEnabled)
        self.steps.addItem(step)
        self.steps.setCurrentItem(step)

    def delete_selected(self) -> None:
        row = self.steps.currentRow()
        if row >= 0:
            self.steps.takeItem(row)

    def load_preset(self) -> None:
        title = str(self.preset.currentData() or "")
        if not title:
            return
        program = next((content for name, content in EXAMPLE_SETS[title].items() if name.endswith(".flbio")), "")
        self.steps.clear()
        for line in program.splitlines():
            if line.strip():
                item = QListWidgetItem(line)
                item.setFlags(item.flags() | Qt.ItemFlag.ItemIsEditable | Qt.ItemFlag.ItemIsDragEnabled)
                self.steps.addItem(item)

    def program_source(self) -> str:
        lines = [self.steps.item(index).text().strip() for index in range(self.steps.count()) if self.steps.item(index).text().strip()]
        if self.runs.value() > 1:
            lines.insert(0, f"Run this program {self.runs.value()} times.")
        return "\n".join(lines).rstrip() + ("\n" if lines else "")

    def save_program(self) -> None:
        source = self.program_source()
        path, _filter = QFileDialog.getSaveFileName(self, "Save FigureLoom Bio program", self.filename.text(), "FigureLoom Bio (*.flbio)")
        if path:
            if not path.casefold().endswith(".flbio"):
                path += ".flbio"
            Path(path).write_text(source, encoding="utf-8")

    def send_to_ide(self) -> None:
        self.use_program.emit(self.filename.text(), self.program_source())
        self.accept()


class LocalProjectsDialog(QDialog):
    workspace_restored = Signal()

    def __init__(self, workspace: NativeWorkspace, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.workspace = workspace
        self.setWindowTitle("FigureLoom Bio projects")
        self.resize(820, 600)
        layout = QVBoxLayout(self)
        heading = QLabel("FigureLoom Bio projects")
        heading.setObjectName("heading")
        copy = QLabel("Projects saved by the native app stay in a separate FigureLoom Bio gallery on this computer.")
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)
        save_row = QHBoxLayout()
        self.title = QLineEdit(self.workspace.active_file)
        save = QPushButton("Save on this device")
        save.setObjectName("primary")
        save.clicked.connect(self.save_current)
        save_row.addWidget(self.title, 1)
        save_row.addWidget(save)
        layout.addLayout(save_row)
        self.list = QListWidget()
        self.list.itemDoubleClicked.connect(lambda _item: self.open_selected())
        layout.addWidget(self.list, 1)
        actions = QDialogButtonBox()
        open_button = actions.addButton("Open", QDialogButtonBox.ButtonRole.AcceptRole)
        delete_button = actions.addButton("Delete", QDialogButtonBox.ButtonRole.DestructiveRole)
        actions.addButton(QDialogButtonBox.StandardButton.Close)
        open_button.clicked.connect(self.open_selected)
        delete_button.clicked.connect(self.delete_selected)
        actions.rejected.connect(self.reject)
        layout.addWidget(actions)
        self.refresh()

    def refresh(self) -> None:
        self.list.clear()
        for project in load_local_projects():
            item = QListWidgetItem(f"{project.title}\n{project.updated_at}")
            item.setData(Qt.ItemDataRole.UserRole, project.id)
            self.list.addItem(item)
        if self.list.count():
            self.list.setCurrentRow(0)

    def selected_project(self) -> LocalProject | None:
        item = self.list.currentItem()
        if not item:
            return None
        project_id = str(item.data(Qt.ItemDataRole.UserRole))
        return next((project for project in load_local_projects() if project.id == project_id), None)

    def save_current(self) -> None:
        save_workspace_to_gallery(self.workspace, self.title.text())
        self.refresh()

    def open_selected(self) -> None:
        project = self.selected_project()
        if project:
            restore_local_project(self.workspace, project)
            self.workspace_restored.emit()
            self.accept()

    def delete_selected(self) -> None:
        project = self.selected_project()
        if not project:
            return
        answer = QMessageBox.question(self, "Delete project", f"Delete {project.title} from this computer?")
        if answer == QMessageBox.StandardButton.Yes:
            delete_local_project(project.id)
            self.refresh()
