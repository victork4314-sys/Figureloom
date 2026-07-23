from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from PySide6.QtCore import QRect, QSize, Qt, Signal
from PySide6.QtGui import QColor, QFont, QPainter, QSyntaxHighlighter, QTextCharFormat, QTextCursor
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFrame,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QSplitter,
    QTreeWidget,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from .errors import FigureLoomBioError
from .language_aliases import normalize_sentence
from .native_core import VocabularyEntry, file_kind, looks_like_program
from .output import Section
from .parser import parse


DARK = {
    "background": "#102a2a",
    "panel": "#173838",
    "panel_2": "#204747",
    "text": "#f4f7f5",
    "muted": "#b8c9c4",
    "line": "#37615d",
    "sage": "#9fc5aa",
    "cyan": "#9ad9df",
    "danger": "#e5a6a6",
    "editor": "#0c2020",
}

LIGHT = {
    "background": "#edf3f1",
    "panel": "#ffffff",
    "panel_2": "#dce9e5",
    "text": "#172321",
    "muted": "#60706c",
    "line": "#c0d2cd",
    "sage": "#74a884",
    "cyan": "#5caeba",
    "danger": "#b54f4f",
    "editor": "#f9fbfa",
}


def palette_stylesheet(dark: bool) -> str:
    c = DARK if dark else LIGHT
    return f"""
    QWidget {{ color: {c['text']}; background: {c['background']}; font-size: 13px; }}
    QFrame#card, QWidget#card {{ background: {c['panel']}; border: 1px solid {c['line']}; border-radius: 12px; }}
    QLabel#muted {{ color: {c['muted']}; }}
    QLabel#heading {{ font-size: 18px; font-weight: 700; }}
    QPushButton {{ background: {c['panel_2']}; border: 1px solid {c['line']}; border-radius: 8px; padding: 8px 12px; font-weight: 600; }}
    QPushButton:hover {{ border-color: {c['cyan']}; }}
    QPushButton:pressed {{ background: {c['line']}; }}
    QPushButton#primary {{ background: {c['sage']}; color: #102020; border-color: {c['sage']}; }}
    QPushButton#danger {{ color: {c['danger']}; }}
    QPlainTextEdit, QListWidget, QTreeWidget {{ background: {c['editor']}; border: 1px solid {c['line']}; border-radius: 8px; selection-background-color: {c['sage']}; selection-color: #102020; }}
    QTreeWidget::item, QListWidget::item {{ padding: 7px; }}
    QTreeWidget::item:selected, QListWidget::item:selected {{ background: {c['sage']}; color: #102020; }}
    QScrollArea {{ border: none; background: transparent; }}
    QSplitter::handle {{ background: {c['line']}; width: 1px; }}
    """


class LineNumberArea(QWidget):
    def __init__(self, editor: "CodeEditor") -> None:
        super().__init__(editor)
        self.editor = editor

    def sizeHint(self) -> QSize:  # noqa: N802 - Qt API name
        return QSize(self.editor.line_number_area_width(), 0)

    def paintEvent(self, event) -> None:  # noqa: N802 - Qt API name
        self.editor.paint_line_numbers(event)


class NativeSyntaxHighlighter(QSyntaxHighlighter):
    def __init__(self, document, dark: bool = True) -> None:
        super().__init__(document)
        self.dark = dark
        self._make_formats()

    def _format(self, color: str, *, bold: bool = False, italic: bool = False) -> QTextCharFormat:
        fmt = QTextCharFormat()
        fmt.setForeground(QColor(color))
        fmt.setFontWeight(QFont.Weight.Bold if bold else QFont.Weight.Normal)
        fmt.setFontItalic(italic)
        return fmt

    def _make_formats(self) -> None:
        if self.dark:
            self.comment = self._format("#78958e", italic=True)
            self.valid = self._format("#b8e6c4")
            self.header = self._format("#9ad9df", bold=True)
            self.invalid = self._format("#efa8a8")
            self.punctuation = self._format("#f1d49c", bold=True)
        else:
            self.comment = self._format("#6f817c", italic=True)
            self.valid = self._format("#2c6f4e")
            self.header = self._format("#176f7b", bold=True)
            self.invalid = self._format("#ad3838")
            self.punctuation = self._format("#9a651a", bold=True)

    def set_dark(self, dark: bool) -> None:
        self.dark = dark
        self._make_formats()
        self.rehighlight()

    def highlightBlock(self, text: str) -> None:  # noqa: N802 - Qt API name
        stripped = text.strip()
        if not stripped:
            return
        leading = len(text) - len(text.lstrip())
        if stripped.startswith("#"):
            self.setFormat(leading, len(stripped), self.comment)
            return
        ending = stripped[-1:]
        try:
            if ending == ":":
                if stripped.casefold().startswith(("if ", "otherwise", "for every ", "make a recipe called ")):
                    self.setFormat(leading, len(stripped), self.header)
                else:
                    self.setFormat(leading, len(stripped), self.invalid)
            elif ending == ".":
                parse(normalize_sentence(stripped))
                self.setFormat(leading, len(stripped), self.valid)
            else:
                self.setFormat(leading, len(stripped), self.invalid)
        except (FigureLoomBioError, ValueError, RuntimeError):
            self.setFormat(leading, len(stripped), self.invalid)
        if ending in {".", ":"}:
            self.setFormat(leading + len(stripped) - 1, 1, self.punctuation)


class CodeEditor(QPlainTextEdit):
    line_changed = Signal(int)

    def __init__(self, parent: QWidget | None = None, *, dark: bool = True) -> None:
        super().__init__(parent)
        self.line_number_area = LineNumberArea(self)
        self.highlighter = NativeSyntaxHighlighter(self.document(), dark)
        font = QFont("Menlo" if Path("/System/Library/Fonts/Menlo.ttc").exists() else "Monospace")
        font.setStyleHint(QFont.StyleHint.Monospace)
        font.setPointSize(12)
        self.setFont(font)
        self.setLineWrapMode(QPlainTextEdit.LineWrapMode.NoWrap)
        self.blockCountChanged.connect(self.update_line_number_area_width)
        self.updateRequest.connect(self.update_line_number_area)
        self.cursorPositionChanged.connect(self._cursor_changed)
        self.update_line_number_area_width(0)

    def line_number_area_width(self) -> int:
        digits = max(1, len(str(max(1, self.blockCount()))))
        return 16 + self.fontMetrics().horizontalAdvance("9") * digits

    def update_line_number_area_width(self, _count: int) -> None:
        self.setViewportMargins(self.line_number_area_width(), 0, 0, 0)

    def update_line_number_area(self, rect: QRect, dy: int) -> None:
        if dy:
            self.line_number_area.scroll(0, dy)
        else:
            self.line_number_area.update(0, rect.y(), self.line_number_area.width(), rect.height())
        if rect.contains(self.viewport().rect()):
            self.update_line_number_area_width(0)

    def resizeEvent(self, event) -> None:  # noqa: N802 - Qt API name
        super().resizeEvent(event)
        contents = self.contentsRect()
        self.line_number_area.setGeometry(QRect(contents.left(), contents.top(), self.line_number_area_width(), contents.height()))

    def paint_line_numbers(self, event) -> None:
        painter = QPainter(self.line_number_area)
        colors = DARK if self.highlighter.dark else LIGHT
        painter.fillRect(event.rect(), QColor(colors["panel_2"]))
        block = self.firstVisibleBlock()
        block_number = block.blockNumber()
        top = round(self.blockBoundingGeometry(block).translated(self.contentOffset()).top())
        bottom = top + round(self.blockBoundingRect(block).height())
        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                painter.setPen(QColor(colors["muted"]))
                painter.drawText(0, top, self.line_number_area.width() - 8, self.fontMetrics().height(), Qt.AlignmentFlag.AlignRight, str(block_number + 1))
            block = block.next()
            top = bottom
            bottom = top + round(self.blockBoundingRect(block).height())
            block_number += 1

    def _cursor_changed(self) -> None:
        self.line_changed.emit(self.textCursor().blockNumber() + 1)
        self.line_number_area.update()

    def insert_sentence(self, sentence: str) -> None:
        cursor = self.textCursor()
        if cursor.position() and not self.toPlainText()[: cursor.position()].endswith("\n"):
            cursor.insertText("\n")
        cursor.insertText(sentence)
        if not sentence.endswith("\n"):
            cursor.insertText("\n")
        self.setTextCursor(cursor)
        self.setFocus()


class FileTree(QTreeWidget):
    file_activated = Signal(str)
    delete_requested = Signal(str)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setColumnCount(2)
        self.setHeaderLabels(["File", "Type"])
        self.header().setStretchLastSection(False)
        self.header().setSectionResizeMode(0, self.header().ResizeMode.Stretch)
        self.header().setSectionResizeMode(1, self.header().ResizeMode.ResizeToContents)
        self.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.itemActivated.connect(lambda item, _column: self.file_activated.emit(item.data(0, Qt.ItemDataRole.UserRole)))
        self.itemClicked.connect(lambda item, _column: self.file_activated.emit(item.data(0, Qt.ItemDataRole.UserRole)))

    def set_files(self, names: Iterable[str], active: str) -> None:
        self.clear()
        for name in sorted(names, key=lambda item: (not looks_like_program(item), item.casefold())):
            item = QTreeWidgetItem([name, file_kind(name)])
            item.setData(0, Qt.ItemDataRole.UserRole, name)
            if name == active:
                item.setSelected(True)
            self.addTopLevelItem(item)
        selected = self.selectedItems()
        if selected:
            self.scrollToItem(selected[0])

    def selected_name(self) -> str | None:
        selected = self.selectedItems()
        return selected[0].data(0, Qt.ItemDataRole.UserRole) if selected else None

    def keyPressEvent(self, event) -> None:  # noqa: N802 - Qt API name
        if event.key() in {Qt.Key.Key_Delete, Qt.Key.Key_Backspace}:
            name = self.selected_name()
            if name:
                self.delete_requested.emit(name)
                return
        super().keyPressEvent(event)


class ResultCard(QFrame):
    def __init__(self, section: Section, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("card")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(8)
        title = QLabel(section.title)
        title.setObjectName("heading")
        title.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(title)
        body = QPlainTextEdit()
        body.setReadOnly(True)
        body.setPlainText("\n".join(section.lines) if section.lines else "Done")
        body.setMaximumBlockCount(10000)
        body.setMinimumHeight(min(260, max(58, 24 * (len(section.lines) + 1))))
        body.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)
        layout.addWidget(body)


class ResultsPane(QScrollArea):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.container = QWidget()
        self.layout = QVBoxLayout(self.container)
        self.layout.setContentsMargins(4, 4, 4, 4)
        self.layout.setSpacing(10)
        self.layout.addStretch(1)
        self.setWidget(self.container)
        self.show_empty("The example is ready.", "Press Run to try it.")

    def clear_cards(self) -> None:
        while self.layout.count():
            item = self.layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def show_empty(self, title: str, text: str) -> None:
        self.clear_cards()
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        heading = QLabel(title)
        heading.setObjectName("heading")
        copy = QLabel(text)
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)
        self.layout.addWidget(card)
        self.layout.addStretch(1)

    def set_sections(self, sections: Iterable[Section]) -> None:
        self.clear_cards()
        found = False
        for section in sections:
            found = True
            self.layout.addWidget(ResultCard(section))
        if not found:
            self.show_empty("The program finished.", "It did not create a visible result section.")
        else:
            self.layout.addStretch(1)


class BlockEditor(QWidget):
    source_changed = Signal(str)
    request_vocabulary = Signal()

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._syncing = False
        layout = QVBoxLayout(self)
        heading_row = QHBoxLayout()
        heading = QLabel("Program blocks")
        heading.setObjectName("heading")
        help_text = QLabel("The blocks and text are the same .flbio program.")
        help_text.setObjectName("muted")
        heading_row.addWidget(heading)
        heading_row.addStretch(1)
        heading_row.addWidget(help_text)
        layout.addLayout(heading_row)
        self.list = QListWidget()
        self.list.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
        self.list.setDefaultDropAction(Qt.DropAction.MoveAction)
        self.list.model().rowsMoved.connect(self._emit_source)
        layout.addWidget(self.list, 1)
        actions = QHBoxLayout()
        add = QPushButton("Add from sentences")
        add.setObjectName("primary")
        add.clicked.connect(self.request_vocabulary)
        up = QPushButton("Move up")
        down = QPushButton("Move down")
        remove = QPushButton("Delete block")
        remove.setObjectName("danger")
        up.clicked.connect(lambda: self._move(-1))
        down.clicked.connect(lambda: self._move(1))
        remove.clicked.connect(self._delete)
        actions.addWidget(add)
        actions.addWidget(up)
        actions.addWidget(down)
        actions.addWidget(remove)
        actions.addStretch(1)
        layout.addLayout(actions)

    def set_source(self, source: str) -> None:
        self._syncing = True
        self.list.clear()
        for raw in source.splitlines():
            if raw.strip():
                item = QListWidgetItem(raw)
                item.setFlags(item.flags() | Qt.ItemFlag.ItemIsEditable | Qt.ItemFlag.ItemIsDragEnabled)
                self.list.addItem(item)
        self._syncing = False

    def source(self) -> str:
        lines = [self.list.item(index).text().rstrip() for index in range(self.list.count())]
        return "\n".join(lines).rstrip() + ("\n" if lines else "")

    def add_sentence(self, sentence: str) -> None:
        self.list.addItem(sentence)
        self.list.setCurrentRow(self.list.count() - 1)
        self._emit_source()

    def _move(self, offset: int) -> None:
        row = self.list.currentRow()
        target = row + offset
        if row < 0 or target < 0 or target >= self.list.count():
            return
        item = self.list.takeItem(row)
        self.list.insertItem(target, item)
        self.list.setCurrentRow(target)
        self._emit_source()

    def _delete(self) -> None:
        row = self.list.currentRow()
        if row >= 0:
            self.list.takeItem(row)
            self._emit_source()

    def _emit_source(self, *_args) -> None:
        if not self._syncing:
            self.source_changed.emit(self.source())


@dataclass(frozen=True)
class FeatureButton:
    object_name: str
    label: str
    callback_name: str


def make_button(label: str, callback: Callable[[], None], *, name: str, primary: bool = False, danger: bool = False) -> QPushButton:
    button = QPushButton(label)
    button.setObjectName("primary" if primary else ("danger" if danger else name))
    button.setProperty("featureName", name)
    button.clicked.connect(callback)
    return button
