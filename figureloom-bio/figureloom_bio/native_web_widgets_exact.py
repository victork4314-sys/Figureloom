from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
import sys
from typing import Any

from PySide6.QtCore import QRect, QSize, Qt
from PySide6.QtGui import QColor, QFont, QPainter
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFrame,
    QHBoxLayout,
    QLabel,
    QScrollArea,
    QSizePolicy,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from .native_core import file_kind, looks_like_program
from .native_web_parity import DARK, LIGHT
from .native_widgets import CodeEditor, FileTree
from .output import Section


class ExactWebCodeEditor(CodeEditor):
    """Use the web IDE's 52 px gutter and its Windows monospace font sizing."""

    def __init__(self, parent: QWidget | None = None, *, dark: bool = True) -> None:
        super().__init__(parent, dark=dark)
        if sys.platform.startswith("win"):
            family = "Consolas"
        elif Path("/System/Library/Fonts/Menlo.ttc").exists():
            family = "Menlo"
        else:
            family = "DejaVu Sans Mono"
        font = QFont(family)
        font.setStyleHint(QFont.StyleHint.Monospace)
        font.setPixelSize(15)
        self.setFont(font)
        self.update_line_number_area_width(0)

    def line_number_area_width(self) -> int:
        return 52

    def paint_line_numbers(self, event) -> None:
        painter = QPainter(self.line_number_area)
        colors = DARK if self.highlighter.dark else LIGHT
        painter.fillRect(event.rect(), QColor(colors["editor_gutter"]))
        gutter_font = QFont(self.font())
        gutter_font.setPixelSize(13)
        painter.setFont(gutter_font)
        metrics = painter.fontMetrics()
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
                    metrics.height(),
                    Qt.AlignmentFlag.AlignRight,
                    str(block_number + 1),
                )
            block = block.next()
            top = bottom
            bottom = top + round(self.blockBoundingRect(block).height())
            block_number += 1


class ExactWebFileTree(FileTree):
    """Render native files as the same compact two-line cards used by the web IDE."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("webFileList")
        self.setColumnCount(1)
        self.header().hide()
        self.setRootIsDecorated(False)
        self.setIndentation(0)
        self.setUniformRowHeights(False)
        self.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

    def set_files(self, names: Iterable[str], active: str) -> None:
        self.clear()
        for name in sorted(names, key=lambda item: (not looks_like_program(item), item.casefold())):
            item = QTreeWidgetItem([""])
            item.setData(0, Qt.ItemDataRole.UserRole, name)
            item.setSizeHint(0, QSize(0, 40))
            self.addTopLevelItem(item)

            card = QFrame()
            card.setObjectName("fileItemActive" if name == active else "fileItem")
            card.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
            row = QHBoxLayout(card)
            row.setContentsMargins(9, 4, 9, 4)
            row.setSpacing(8)

            icon = QLabel("◇")
            icon.setObjectName("fileIcon")
            icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
            icon.setFixedWidth(18)
            row.addWidget(icon)

            copy = QVBoxLayout()
            copy.setContentsMargins(0, 0, 0, 0)
            copy.setSpacing(0)
            title = QLabel(name)
            title.setObjectName("fileNameActive" if name == active else "fileName")
            title.setTextFormat(Qt.TextFormat.PlainText)
            kind = QLabel(file_kind(name))
            kind.setObjectName("fileType")
            copy.addWidget(title)
            copy.addWidget(kind)
            row.addLayout(copy, 1)
            self.setItemWidget(item, 0, card)
            if name == active:
                item.setSelected(True)

        selected = self.selectedItems()
        if selected:
            self.scrollToItem(selected[0])


class ExactWebResultCard(QFrame):
    def __init__(self, section: Section, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("resultSection")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(11)
        title = QLabel(section.title)
        title.setObjectName("resultTitle")
        title.setTextFormat(Qt.TextFormat.PlainText)
        body = QLabel("\n".join(section.lines) if section.lines else "Done")
        body.setObjectName("resultBody")
        body.setTextFormat(Qt.TextFormat.PlainText)
        body.setWordWrap(True)
        body.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        body.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Minimum)
        layout.addWidget(title)
        layout.addWidget(body)


class ExactWebResultsPane(QScrollArea):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("webResultsPane")
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self.container = QWidget()
        self.container.setObjectName("transparentHost")
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
        card.setObjectName("emptyResults")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(4)
        heading = QLabel(title)
        heading.setObjectName("emptyResultsTitle")
        heading.setAlignment(Qt.AlignmentFlag.AlignCenter)
        copy = QLabel(text)
        copy.setObjectName("emptyResultsCopy")
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
            self.layout.addWidget(ExactWebResultCard(section))
        if not found:
            self.show_empty("The program finished.", "It did not create a visible result section.")
        else:
            self.layout.addStretch(1)


def exact_widget_stylesheet(dark: bool) -> str:
    c = DARK if dark else LIGHT
    interface_font = '"Segoe UI"' if sys.platform.startswith("win") else 'Inter'
    editor_font = 'Consolas' if sys.platform.startswith("win") else 'Menlo'
    return f"""
    QWidget {{ font-family: {interface_font}; }}
    QPlainTextEdit#programEditor {{ font-family: {editor_font}; font-size: 15px; }}
    QTreeWidget#webFileList {{ background: transparent; border: 0; outline: 0; }}
    QTreeWidget#webFileList::item {{ min-height: 40px; padding: 0; border: 0; background: transparent; }}
    QTreeWidget#webFileList::item:selected {{ background: transparent; }}
    QFrame#fileItem, QFrame#fileItemActive {{
        min-height: 40px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
    }}
    QFrame#fileItem:hover {{ background: {c['soft']}; }}
    QFrame#fileItemActive {{ background: {c['accent_soft']}; border-color: {c['accent']}; }}
    QLabel#fileIcon {{ color: {c['muted']}; font-size: 12px; }}
    QLabel#fileName, QLabel#fileNameActive {{ color: {c['text']}; font-size: 12px; font-weight: 700; }}
    QLabel#fileNameActive {{ color: {c['accent_strong']}; }}
    QLabel#fileType {{ color: {c['muted']}; font-size: 10px; }}
    QScrollArea#webResultsPane {{ background: transparent; border: 0; }}
    QScrollArea#webResultsPane > QWidget > QWidget {{ background: transparent; }}
    QFrame#resultSection, QFrame#emptyResults {{
        background: {c['panel']};
        border: 1px solid {c['line']};
        border-radius: 12px;
    }}
    QLabel#resultTitle {{ color: {c['text']}; font-size: 13px; font-weight: 800; }}
    QLabel#resultBody {{ color: {c['text']}; font-size: 12px; }}
    QLabel#emptyResultsTitle {{ color: {c['text']}; font-size: 13px; font-weight: 800; }}
    QLabel#emptyResultsCopy {{ color: {c['muted']}; font-size: 12px; }}
    """


def install_exact_widgets(native_desktop_exact_module: Any) -> None:
    if getattr(native_desktop_exact_module, "_figureloom_exact_widgets_installed", False):
        return
    original_stylesheet = native_desktop_exact_module.exact_desktop_stylesheet

    def stylesheet(dark: bool) -> str:
        return original_stylesheet(dark) + exact_widget_stylesheet(dark)

    native_desktop_exact_module.CodeEditor = ExactWebCodeEditor
    native_desktop_exact_module.FileTree = ExactWebFileTree
    native_desktop_exact_module.ResultsPane = ExactWebResultsPane
    native_desktop_exact_module.exact_desktop_stylesheet = stylesheet
    native_desktop_exact_module._figureloom_exact_widgets_installed = True


__all__ = [
    "ExactWebCodeEditor",
    "ExactWebFileTree",
    "ExactWebResultCard",
    "ExactWebResultsPane",
    "exact_widget_stylesheet",
    "install_exact_widgets",
]
