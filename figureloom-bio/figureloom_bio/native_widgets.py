from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Callable, Iterable

from PySide6.QtCore import QRect, QSize, Qt, Signal
from PySide6.QtGui import (
    QColor,
    QFont,
    QFontDatabase,
    QPainter,
    QSyntaxHighlighter,
    QTextCharFormat,
    QTextCursor,
)
from PySide6.QtWidgets import (
    QAbstractItemView,
    QApplication,
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


# These are the same visual tokens used by the browser IDE. Keeping the values
# together prevents the native Mac and Windows application from drifting into a
# separate design.
DARK = {
    "background": "#181d1c",
    "panel": "#222927",
    "panel_glass": "#222927",
    "panel_2": "#2a3431",
    "strong": "#35413e",
    "text": "#eef7f4",
    "muted": "#aebdb8",
    "line": "#43514d",
    "accent": "#78c4b5",
    "accent_strong": "#a1ddcf",
    "accent_soft": "#253e38",
    "accent_ink": "#102621",
    "danger": "#ff9b9b",
    "danger_soft": "#482929",
    "warning": "#f1ca73",
    "warning_soft": "#44391f",
    "editor": "#1f2624",
    "gutter": "#252e2b",
    "syntax_command": "#79d6c3",
    "syntax_file": "#8dcdf5",
    "syntax_value": "#f0b978",
    "syntax_field": "#cfafea",
    "syntax_word": "#aebdb8",
    "syntax_comment": "#9bbf9a",
    "syntax_invalid": "#ff9b9b",
}

LIGHT = {
    "background": "#f4f7f6",
    "panel": "#ffffff",
    "panel_glass": "#ffffff",
    "panel_2": "#edf3f1",
    "strong": "#dce9e5",
    "text": "#172321",
    "muted": "#60706c",
    "line": "#cddbd7",
    "accent": "#2f7468",
    "accent_strong": "#195c51",
    "accent_soft": "#dff1ec",
    "accent_ink": "#ffffff",
    "danger": "#a43e3e",
    "danger_soft": "#fae8e8",
    "warning": "#8a641d",
    "warning_soft": "#fff4d7",
    "editor": "#fbfdfc",
    "gutter": "#edf3f1",
    "syntax_command": "#1f7567",
    "syntax_file": "#286f9b",
    "syntax_value": "#9a5a24",
    "syntax_field": "#7556a0",
    "syntax_word": "#60706c",
    "syntax_comment": "#789978",
    "syntax_invalid": "#b34848",
}


def _clear_layout(layout) -> None:
    while layout.count():
        item = layout.takeAt(0)
        widget = item.widget()
        child_layout = item.layout()
        if widget is not None:
            widget.setParent(None)
        elif child_layout is not None:
            _clear_layout(child_layout)


def _tool_group(title: str, controls: Iterable[QWidget], parent: QWidget) -> QFrame:
    group = QFrame(parent)
    group.setObjectName("toolGroup")
    layout = QVBoxLayout(group)
    layout.setContentsMargins(0, 0, 16, 0)
    layout.setSpacing(1)
    row = QHBoxLayout()
    row.setContentsMargins(0, 0, 0, 0)
    row.setSpacing(7)
    for control in controls:
        row.addWidget(control)
    layout.addLayout(row)
    label = QLabel(title)
    label.setObjectName("toolLabel")
    layout.addWidget(label, 0, Qt.AlignmentFlag.AlignLeft)
    return group


def _apply_browser_layout_to_native_window(dark: bool) -> bool:
    """Make the Qt window use the browser IDE's structure without removing tools."""
    app = QApplication.instance()
    if app is None:
        return dark

    app.setApplicationDisplayName("FigureLoom Bio Desktop")
    for window in app.topLevelWidgets():
        if window.__class__.__name__ != "NativeIdeWindow":
            continue

        window.setWindowTitle("FigureLoom Bio Desktop")
        settings = getattr(window, "settings", None)
        if settings is not None and not settings.contains("dark"):
            window.dark = False
            dark = False
        root = window.centralWidget()
        if root is None or root.layout() is None:
            continue

        root.setObjectName("ideRoot")
        root_layout = root.layout()
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        header = root_layout.itemAt(0).widget() if root_layout.count() > 0 else None
        toolbar = root_layout.itemAt(1).widget() if root_layout.count() > 1 else None
        workspace = root_layout.itemAt(2).widget() if root_layout.count() > 2 else None

        if header is not None:
            header.setObjectName("ideHeader")
            header.setFixedHeight(62)
            for label in header.findChildren(QLabel):
                if label.text() == "Plain-language IDE · native desktop application":
                    label.setText("Plain-language IDE")

        if isinstance(toolbar, QFrame):
            toolbar.setObjectName("ideToolbar")
            toolbar.setFixedHeight(70)
            if not toolbar.property("browserParityGrouped"):
                layout = toolbar.layout()
                if layout is not None:
                    controls = {
                        name: getattr(window, name, None)
                        for name in (
                            "new_button",
                            "open_button",
                            "save_button",
                            "examples_button",
                            "builder_button",
                            "tidy_button",
                            "clear_results_button",
                            "translate_button",
                            "sentences_button",
                            "export_results_button",
                            "allow_tools",
                        )
                    }
                    _clear_layout(layout)
                    layout.setContentsMargins(16, 9, 16, 9)
                    layout.setSpacing(12)
                    layout.addWidget(
                        _tool_group(
                            "File",
                            [controls["new_button"], controls["open_button"], controls["save_button"]],
                            toolbar,
                        )
                    )
                    layout.addWidget(
                        _tool_group(
                            "Program",
                            [
                                controls["examples_button"],
                                controls["builder_button"],
                                controls["tidy_button"],
                                controls["clear_results_button"],
                            ],
                            toolbar,
                        )
                    )
                    layout.addWidget(
                        _tool_group(
                            "Desktop",
                            [
                                controls["translate_button"],
                                controls["sentences_button"],
                                controls["export_results_button"],
                                controls["allow_tools"],
                            ],
                            toolbar,
                        )
                    )
                    layout.addStretch(1)
                    toolbar.setProperty("browserParityGrouped", True)

        if isinstance(workspace, QSplitter):
            workspace.setObjectName("ideWorkspace")
            workspace.setHandleWidth(1)
            workspace.setChildrenCollapsible(False)
            if workspace.count() >= 3:
                files_panel = workspace.widget(0)
                editor_panel = workspace.widget(1)
                results_panel = workspace.widget(2)
                files_panel.setObjectName("filesPanel")
                editor_panel.setObjectName("editorPanel")
                results_panel.setObjectName("resultsPanel")
                files_panel.layout().setContentsMargins(14, 14, 14, 14)
                editor_panel.layout().setContentsMargins(0, 0, 0, 0)
                editor_panel.layout().setSpacing(0)
                results_panel.layout().setContentsMargins(14, 14, 14, 14)
                workspace.setSizes([230, 850, 420])

        tabs = getattr(window, "tabs", None)
        if tabs is not None:
            tabs.setObjectName("editorModes")
        editor = getattr(window, "editor", None)
        if editor is not None:
            editor.setObjectName("programEditor")
        file_tree = getattr(window, "file_tree", None)
        if file_tree is not None:
            file_tree.setObjectName("fileList")
        results = getattr(window, "results", None)
        if results is not None:
            results.setObjectName("resultsList")
        run_status = getattr(window, "run_status", None)
        if run_status is not None:
            run_status.setObjectName("statusPill")
    return dark


def palette_stylesheet(dark: bool) -> str:
    dark = _apply_browser_layout_to_native_window(dark)
    c = DARK if dark else LIGHT
    return f"""
    QWidget {{
        color: {c['text']};
        background: {c['background']};
        font-family: Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
    }}
    QWidget#ideRoot {{ background: {c['background']}; }}
    QFrame#ideHeader {{
        background: {c['panel']};
        border: none;
        border-bottom: 1px solid {c['line']};
    }}
    QFrame#ideToolbar {{
        background: {c['panel']};
        border: none;
        border-bottom: 1px solid {c['line']};
    }}
    QFrame#toolGroup {{
        background: transparent;
        border: none;
        border-right: 1px solid {c['line']};
    }}
    QLabel#toolLabel {{
        color: {c['muted']};
        background: transparent;
        font-size: 10px;
    }}
    QSplitter#ideWorkspace {{ background: {c['strong']}; }}
    QFrame#filesPanel, QFrame#resultsPanel {{
        background: {c['panel']};
        border: none;
    }}
    QFrame#filesPanel {{ border-right: 1px solid {c['line']}; }}
    QFrame#resultsPanel {{ border-left: 1px solid {c['line']}; }}
    QFrame#editorPanel {{
        background: {c['editor']};
        border: none;
    }}
    QFrame#card, QWidget#card {{
        background: {c['panel']};
        border: 1px solid {c['line']};
        border-radius: 12px;
    }}
    QLabel#muted {{
        color: {c['muted']};
        background: transparent;
        font-size: 11px;
    }}
    QLabel#heading {{
        color: {c['text']};
        background: transparent;
        font-size: 13px;
        font-weight: 700;
    }}
    QFrame#filesPanel QLabel#heading,
    QFrame#resultsPanel QLabel#heading {{
        color: {c['muted']};
        font-size: 11px;
    }}
    QLabel#statusPill {{
        padding: 4px 8px;
        border-radius: 9px;
        background: {c['panel_2']};
        color: {c['muted']};
        font-size: 10px;
        font-weight: 700;
    }}
    QLineEdit {{
        min-height: 30px;
        padding: 2px 9px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: {c['text']};
        selection-background-color: {c['accent_soft']};
    }}
    QLineEdit:focus {{
        border-color: {c['accent']};
        background: {c['panel']};
    }}
    QPushButton {{
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid {c['line']};
        border-radius: 9px;
        background: {c['panel']};
        color: {c['text']};
        font-weight: 500;
    }}
    QPushButton:hover {{
        border-color: {c['accent']};
    }}
    QPushButton:pressed {{
        background: {c['panel_2']};
    }}
    QPushButton#primary {{
        min-width: 76px;
        background: {c['accent']};
        color: {c['accent_ink']};
        border-color: {c['accent']};
        font-weight: 700;
    }}
    QPushButton#primary:hover {{
        background: {c['accent_strong']};
        border-color: {c['accent_strong']};
    }}
    QPushButton#danger {{
        color: {c['danger']};
        background: transparent;
        border-color: transparent;
    }}
    QPushButton#danger:hover {{
        color: {c['danger']};
        background: {c['danger_soft']};
        border-color: {c['danger']};
    }}
    QCheckBox {{
        spacing: 7px;
        color: {c['muted']};
        background: transparent;
        font-size: 11px;
    }}
    QCheckBox::indicator {{
        width: 16px;
        height: 16px;
        border: 1px solid {c['line']};
        border-radius: 4px;
        background: {c['panel']};
    }}
    QCheckBox::indicator:checked {{
        background: {c['accent']};
        border-color: {c['accent']};
    }}
    QPlainTextEdit#programEditor {{
        padding: 16px 18px 70px 18px;
        border: none;
        border-radius: 0;
        background: {c['editor']};
        color: {c['text']};
        selection-background-color: {c['accent_soft']};
    }}
    QPlainTextEdit, QListWidget, QTreeWidget {{
        background: {c['editor']};
        border: 1px solid {c['line']};
        border-radius: 8px;
        color: {c['text']};
        selection-background-color: {c['accent_soft']};
        selection-color: {c['accent_strong']};
    }}
    QTreeWidget#fileList {{
        border: none;
        background: transparent;
        outline: none;
    }}
    QTreeWidget#fileList::item {{
        min-height: 40px;
        padding: 7px 9px;
        margin: 2px 0;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
    }}
    QTreeWidget#fileList::item:hover {{
        background: {c['panel_2']};
    }}
    QTreeWidget#fileList::item:selected {{
        border-color: {c['accent']};
        background: {c['accent_soft']};
        color: {c['accent_strong']};
    }}
    QHeaderView::section {{
        padding: 5px 7px;
        border: none;
        border-bottom: 1px solid {c['line']};
        background: transparent;
        color: {c['muted']};
        font-size: 10px;
    }}
    QListWidget::item {{
        padding: 9px;
        margin: 2px;
        border-radius: 8px;
    }}
    QListWidget::item:selected {{
        background: {c['accent_soft']};
        color: {c['accent_strong']};
    }}
    QTabWidget#editorModes::pane {{
        border: none;
        border-top: 1px solid {c['line']};
        background: {c['editor']};
    }}
    QTabBar::tab {{
        min-width: 72px;
        min-height: 31px;
        padding: 0 12px;
        border: 1px solid {c['line']};
        border-bottom: none;
        border-radius: 9px 9px 0 0;
        background: {c['panel']};
        color: {c['muted']};
    }}
    QTabBar::tab:selected {{
        background: {c['editor']};
        color: {c['text']};
    }}
    QScrollArea {{
        border: none;
        background: transparent;
    }}
    QScrollArea#resultsList > QWidget > QWidget {{
        background: transparent;
    }}
    QSplitter::handle {{
        background: {c['line']};
        width: 1px;
    }}
    QToolTip {{
        padding: 6px 8px;
        border: 1px solid {c['line']};
        border-radius: 6px;
        background: {c['panel']};
        color: {c['text']};
    }}
    """


class LineNumberArea(QWidget):
    def __init__(self, editor: "CodeEditor") -> None:
        super().__init__(editor)
        self.editor = editor
        self.setObjectName("lineNumberArea")

    def sizeHint(self) -> QSize:  # noqa: N802 - Qt API name
        return QSize(self.editor.line_number_area_width(), 0)

    def paintEvent(self, event) -> None:  # noqa: N802 - Qt API name
        self.editor.paint_line_numbers(event)


class NativeSyntaxHighlighter(QSyntaxHighlighter):
    FILE_PATTERN = re.compile(
        r"(?<![\w])[\w .()@+\-]+?\.(?:flbio|txt|csv|tsv|fa|fasta|fna|ffn|faa|frn|fq|fastq|"
        r"svg|nwk|newick|vcf|bcf|gff|gff3|gtf|bed|bam|sam|gb|gbk|genbank|pdb|cif|mmcif|"
        r"xls|xlsx|ods|parquet|h5ad)(?![\w])",
        re.IGNORECASE,
    )
    NUMBER_PATTERN = re.compile(r"(?<![\w.-])\d+(?:\.\d+)?(?:%|\b)")
    CONNECTOR_PATTERN = re.compile(
        r"\b(?:under|using|with|without|from|into|in|by|to|as|than|above|below|"
        r"between|before|after|for|of|at least|at most)\b",
        re.IGNORECASE,
    )
    FIELD_PATTERNS = (
        re.compile(r"\bunder\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"\b(?:column|columns)\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"\busing\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"\bby\s+([^.,:]+)", re.IGNORECASE),
    )
    VALUE_PATTERNS = (
        re.compile(r"\bmarked\s+(.+?)\s+under\b", re.IGNORECASE),
        re.compile(r"\bcontaining\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"\bnamed\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"\bcalled\s+([^.,:]+)", re.IGNORECASE),
        re.compile(r"^Say\s+(.+?)[.:]?$", re.IGNORECASE),
        re.compile(r"\bsaying\s+(.+?)[.:]?$", re.IGNORECASE),
    )

    def __init__(self, document, dark: bool = True) -> None:
        super().__init__(document)
        self.dark = dark
        self._make_formats()

    def _format(
        self,
        color: str,
        *,
        bold: bool = False,
        italic: bool = False,
        wave: bool = False,
    ) -> QTextCharFormat:
        fmt = QTextCharFormat()
        fmt.setForeground(QColor(color))
        fmt.setFontWeight(QFont.Weight.DemiBold if bold else QFont.Weight.Normal)
        fmt.setFontItalic(italic)
        if wave:
            fmt.setUnderlineStyle(QTextCharFormat.UnderlineStyle.WaveUnderline)
            fmt.setUnderlineColor(QColor(color))
        return fmt

    def _make_formats(self) -> None:
        colors = DARK if self.dark else LIGHT
        self.command = self._format(colors["syntax_command"], bold=True)
        self.file = self._format(colors["syntax_file"])
        self.value = self._format(colors["syntax_value"])
        self.field = self._format(colors["syntax_field"])
        self.word = self._format(colors["syntax_word"])
        self.comment = self._format(colors["syntax_comment"], italic=True)
        self.invalid = self._format(colors["syntax_invalid"], wave=True)
        self.punctuation = self._format(colors["syntax_word"])

    def set_dark(self, dark: bool) -> None:
        self.dark = dark
        self._make_formats()
        self.rehighlight()

    @staticmethod
    def _valid_header(stripped: str) -> bool:
        return stripped.casefold().startswith(("if ", "otherwise", "for every ", "make a recipe called "))

    @classmethod
    def token_roles(cls, text: str) -> list[tuple[int, int, str]]:
        """Return token roles for tests and for the platform-independent color plan."""
        stripped = text.strip()
        if not stripped or stripped.startswith("#"):
            return []

        leading = len(text) - len(text.lstrip())
        punctuation = stripped[-1:] if stripped[-1:] in {".", ":"} else ""
        body_length = len(stripped) - len(punctuation)
        roles: list[tuple[int, int, str]] = [(leading, body_length, "command")]

        for match in cls.CONNECTOR_PATTERN.finditer(stripped[:body_length]):
            roles.append((leading + match.start(), match.end() - match.start(), "word"))
        for match in cls.FILE_PATTERN.finditer(stripped[:body_length]):
            roles.append((leading + match.start(), match.end() - match.start(), "file"))
        for match in cls.NUMBER_PATTERN.finditer(stripped[:body_length]):
            roles.append((leading + match.start(), match.end() - match.start(), "value"))
        for pattern in cls.VALUE_PATTERNS:
            for match in pattern.finditer(stripped[:body_length]):
                start, end = match.span(1)
                roles.append((leading + start, end - start, "value"))
        for pattern in cls.FIELD_PATTERNS:
            for match in pattern.finditer(stripped[:body_length]):
                start, end = match.span(1)
                value = stripped[start:end]
                cut = re.search(
                    r"\b(?:with|without|from|into|in|by|to|as|than|above|below|before|after|for|of)\b",
                    value,
                    re.IGNORECASE,
                )
                if cut:
                    end = start + cut.start()
                while end > start and stripped[end - 1].isspace():
                    end -= 1
                if end > start:
                    roles.append((leading + start, end - start, "field"))
        if punctuation:
            roles.append((leading + len(stripped) - 1, 1, "punctuation"))
        return roles

    def highlightBlock(self, text: str) -> None:  # noqa: N802 - Qt API name
        stripped = text.strip()
        if not stripped:
            return
        leading = len(text) - len(text.lstrip())
        if stripped.startswith("#"):
            self.setFormat(leading, len(stripped), self.comment)
            return

        ending = stripped[-1:]
        valid = False
        try:
            if ending == ":":
                valid = self._valid_header(stripped)
            elif ending == ".":
                parse(normalize_sentence(stripped))
                valid = True
        except (FigureLoomBioError, ValueError, RuntimeError):
            valid = False

        if not valid:
            self.setFormat(leading, len(stripped), self.invalid)
            if ending in {".", ":"}:
                self.setFormat(leading + len(stripped) - 1, 1, self.punctuation)
            return

        formats = {
            "command": self.command,
            "file": self.file,
            "value": self.value,
            "field": self.field,
            "word": self.word,
            "punctuation": self.punctuation,
        }
        for start, length, role in self.token_roles(text):
            if length > 0:
                self.setFormat(start, length, formats[role])


class CodeEditor(QPlainTextEdit):
    line_changed = Signal(int)

    def __init__(self, parent: QWidget | None = None, *, dark: bool = True) -> None:
        super().__init__(parent)
        self.line_number_area = LineNumberArea(self)
        self.highlighter = NativeSyntaxHighlighter(self.document(), dark)
        font = QFontDatabase.systemFont(QFontDatabase.SystemFont.FixedFont)
        font.setStyleHint(QFont.StyleHint.Monospace)
        font.setPointSize(12)
        self.setFont(font)
        self.setLineWrapMode(QPlainTextEdit.LineWrapMode.NoWrap)
        self.setTabStopDistance(self.fontMetrics().horizontalAdvance(" ") * 2)
        self.blockCountChanged.connect(self.update_line_number_area_width)
        self.updateRequest.connect(self.update_line_number_area)
        self.cursorPositionChanged.connect(self._cursor_changed)
        self.textChanged.connect(self.highlighter.rehighlight)
        self.update_line_number_area_width(0)

    def line_number_area_width(self) -> int:
        digits = max(1, len(str(max(1, self.blockCount()))))
        return max(52, 20 + self.fontMetrics().horizontalAdvance("9") * digits)

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
        self.line_number_area.setGeometry(
            QRect(contents.left(), contents.top(), self.line_number_area_width(), contents.height())
        )

    def paint_line_numbers(self, event) -> None:
        painter = QPainter(self.line_number_area)
        colors = DARK if self.highlighter.dark else LIGHT
        painter.fillRect(event.rect(), QColor(colors["gutter"]))
        painter.setPen(QColor(colors["line"]))
        painter.drawLine(
            self.line_number_area.width() - 1,
            event.rect().top(),
            self.line_number_area.width() - 1,
            event.rect().bottom(),
        )
        block = self.firstVisibleBlock()
        block_number = block.blockNumber()
        top = round(self.blockBoundingGeometry(block).translated(self.contentOffset()).top())
        bottom = top + round(self.blockBoundingRect(block).height())
        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                painter.setPen(QColor(colors["muted"]))
                painter.drawText(
                    0,
                    top,
                    self.line_number_area.width() - 12,
                    self.fontMetrics().height(),
                    Qt.AlignmentFlag.AlignRight,
                    str(block_number + 1),
                )
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
        self.setRootIsDecorated(False)
        self.setIndentation(0)
        self.setUniformRowHeights(True)
        self.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.itemActivated.connect(
            lambda item, _column: self.file_activated.emit(item.data(0, Qt.ItemDataRole.UserRole))
        )
        self.itemClicked.connect(
            lambda item, _column: self.file_activated.emit(item.data(0, Qt.ItemDataRole.UserRole))
        )

    def set_files(self, names: Iterable[str], active: str) -> None:
        self.clear()
        for name in sorted(names, key=lambda item: (not looks_like_program(item), item.casefold())):
            item = QTreeWidgetItem([name, file_kind(name)])
            item.setData(0, Qt.ItemDataRole.UserRole, name)
            item.setToolTip(0, name)
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
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(8)
        title = QLabel(section.title)
        title.setObjectName("heading")
        title.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(title)
        body = QPlainTextEdit()
        body.setObjectName("resultBody")
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
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(12)
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
        layout.setContentsMargins(15, 15, 15, 15)
        heading = QLabel(title)
        heading.setObjectName("heading")
        copy = QLabel(text)
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        copy.setAlignment(Qt.AlignmentFlag.AlignCenter)
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
        layout.setContentsMargins(14, 14, 14, 14)
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


def make_button(
    label: str,
    callback: Callable[[], None],
    *,
    name: str,
    primary: bool = False,
    danger: bool = False,
) -> QPushButton:
    button = QPushButton(label)
    button.setObjectName("primary" if primary else ("danger" if danger else name))
    button.setProperty("featureName", name)
    button.clicked.connect(callback)
    return button
