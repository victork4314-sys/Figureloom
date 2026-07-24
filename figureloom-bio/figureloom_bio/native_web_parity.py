from __future__ import annotations

import re
from typing import Any

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QFont, QSyntaxHighlighter, QTextCharFormat
from PySide6.QtWidgets import (
    QCheckBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSplitter,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from .errors import FigureLoomBioError
from .language_aliases import normalize_sentence
from .native_widgets import BlockEditor, CodeEditor, FileTree, ResultsPane, make_button
from .parser import parse


APP_NAME = "FigureLoom Bio Desktop"

LIGHT = {
    "background": "#f4f7f6",
    "panel": "#ffffff",
    "panel_glass": "#ffffff",
    "soft": "#edf3f1",
    "strong": "#dce9e5",
    "text": "#172321",
    "muted": "#60706c",
    "line": "#cddbd7",
    "accent": "#2f7468",
    "accent_strong": "#195c51",
    "accent_soft": "#dff1ec",
    "accent_ink": "#ffffff",
    "editor": "#fbfdfc",
    "editor_gutter": "#edf3f1",
    "danger": "#a43e3e",
    "danger_soft": "#fae8e8",
    "warning": "#8a641d",
    "warning_soft": "#fff4d7",
    "syntax_command": "#1f7567",
    "syntax_file": "#286f9b",
    "syntax_value": "#9a5a24",
    "syntax_field": "#7556a0",
    "syntax_word": "#60706c",
    "syntax_comment": "#789978",
    "syntax_invalid": "#b34848",
}

DARK = {
    "background": "#181d1c",
    "panel": "#222927",
    "panel_glass": "#222927",
    "soft": "#2a3431",
    "strong": "#35413e",
    "text": "#eef7f4",
    "muted": "#aebdb8",
    "line": "#43514d",
    "accent": "#78c4b5",
    "accent_strong": "#a1ddcf",
    "accent_soft": "#253e38",
    "accent_ink": "#102621",
    "editor": "#1f2624",
    "editor_gutter": "#252e2b",
    "danger": "#ff9b9b",
    "danger_soft": "#482929",
    "warning": "#f1ca73",
    "warning_soft": "#44391f",
    "syntax_command": "#79d6c3",
    "syntax_file": "#8dcdf5",
    "syntax_value": "#f0b978",
    "syntax_field": "#cfafea",
    "syntax_word": "#aebdb8",
    "syntax_comment": "#9bbf9a",
    "syntax_invalid": "#ff9b9b",
}


def web_palette_stylesheet(dark: bool) -> str:
    c = DARK if dark else LIGHT
    return f"""
    QWidget {{
        color: {c['text']};
        background: {c['background']};
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
    }}
    QMainWindow {{ background: {c['background']}; }}
    QFrame#ideHeader {{
        min-height: 62px; max-height: 62px;
        background: {c['panel_glass']};
        border: 0; border-bottom: 1px solid {c['line']};
    }}
    QFrame#ideToolbar {{
        min-height: 70px; max-height: 70px;
        background: {c['panel']};
        border: 0; border-bottom: 1px solid {c['line']};
    }}
    QFrame#filesPanel, QFrame#resultsPanel {{
        background: {c['panel_glass']}; border: 0; border-radius: 0;
    }}
    QFrame#filesPanel {{ border-right: 1px solid {c['line']}; }}
    QFrame#resultsPanel {{ border-left: 1px solid {c['line']}; }}
    QFrame#editorPanel {{ background: {c['editor']}; border: 0; border-radius: 0; }}
    QFrame#panelTopbar {{
        min-height: 42px; max-height: 42px;
        background: {c['panel']}; border: 0; border-bottom: 1px solid {c['line']};
    }}
    QFrame#editorStatus {{
        min-height: 28px; max-height: 28px;
        background: {c['panel']}; border: 0; border-top: 1px solid {c['line']};
    }}
    QFrame#card, QWidget#card {{
        background: {c['panel']}; border: 1px solid {c['line']}; border-radius: 12px;
    }}
    QFrame#toolGroup {{ background: transparent; border: 0; border-right: 1px solid {c['line']}; }}
    QLabel#muted, QLabel#toolLabel, QLabel#languageLabel {{ color: {c['muted']}; }}
    QLabel#heading {{ font-size: 13px; font-weight: 800; }}
    QLabel#panelHeading {{ color: {c['muted']}; font-size: 11px; font-weight: 800; }}
    QLabel#brandTitle {{ font-size: 16px; font-weight: 800; }}
    QLabel#brandSubtitle {{ color: {c['muted']}; font-size: 11px; }}
    QLabel#statusPill {{
        padding: 4px 8px; border-radius: 10px;
        background: {c['soft']}; color: {c['muted']}; font-size: 10px; font-weight: 800;
    }}
    QLineEdit#programName {{
        min-width: 240px; max-width: 300px; padding: 5px 9px;
        border: 1px solid transparent; border-radius: 8px;
        background: transparent; color: {c['text']}; font-weight: 700;
    }}
    QLineEdit#programName:focus {{ border-color: {c['accent']}; background: {c['panel']}; }}
    QPushButton {{
        min-height: 36px; padding: 0 12px;
        border: 1px solid {c['line']}; border-radius: 9px;
        background: {c['panel']}; color: {c['text']}; font-weight: 500;
    }}
    QPushButton:hover {{ border-color: {c['accent']}; }}
    QPushButton:pressed {{ background: {c['soft']}; }}
    QPushButton#primary {{
        min-width: 76px; background: {c['accent']}; color: {c['accent_ink']};
        border-color: {c['accent']}; font-weight: 800;
    }}
    QPushButton#primary:hover {{ background: {c['accent_strong']}; border-color: {c['accent_strong']}; }}
    QPushButton#danger {{ color: {c['danger']}; }}
    QPushButton#smallButton, QPushButton#accountButton, QPushButton#themeButton {{
        min-width: 36px; max-width: 36px; padding: 0;
    }}
    QTreeWidget {{
        background: transparent; border: 0; outline: 0;
    }}
    QTreeWidget::item {{ min-height: 40px; padding: 7px 9px; border-radius: 8px; }}
    QTreeWidget::item:hover {{ background: {c['soft']}; }}
    QTreeWidget::item:selected {{ background: {c['accent_soft']}; color: {c['accent_strong']}; }}
    QHeaderView::section {{
        background: transparent; color: {c['muted']}; border: 0;
        padding: 5px 8px; font-size: 10px; font-weight: 700;
    }}
    QTabWidget#editorModes::pane {{ border: 0; background: {c['editor']}; }}
    QTabBar::tab {{
        min-height: 32px; padding: 0 12px; margin-right: 4px;
        border: 1px solid {c['line']}; border-bottom: 0;
        border-top-left-radius: 9px; border-top-right-radius: 9px;
        background: {c['panel']}; color: {c['muted']};
    }}
    QTabBar::tab:selected {{ background: {c['editor']}; color: {c['text']}; }}
    QPlainTextEdit {{
        background: {c['editor']}; color: {c['text']};
        border: 0; border-radius: 0; selection-background-color: {c['accent_soft']};
    }}
    QListWidget {{
        background: {c['editor']}; color: {c['text']};
        border: 1px solid {c['line']}; border-radius: 8px;
    }}
    QListWidget::item {{ padding: 7px; }}
    QListWidget::item:selected {{ background: {c['accent_soft']}; color: {c['accent_strong']}; }}
    QScrollArea {{ border: 0; background: transparent; }}
    QScrollBar:vertical {{ width: 11px; background: transparent; }}
    QScrollBar::handle:vertical {{ min-height: 28px; border-radius: 5px; background: {c['line']}; }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
    QSplitter::handle {{ background: {c['line']}; width: 1px; }}
    QCheckBox {{ spacing: 7px; color: {c['muted']}; font-size: 11px; }}
    """


class WebSyntaxHighlighter(QSyntaxHighlighter):
    FILE_PATTERN = re.compile(
        r"(?<![\w.-])(?:[^\s,;:()]+\.(?:flbio|txt|csv|tsv|fa|fasta|fna|ffn|faa|frn|fq|fastq|svg|nwk|newick|vcf|bcf|gff|gff3|gtf|bed|bam|sam|xlsx|xls|json|png|pdf))(?![\w.-])",
        re.IGNORECASE,
    )
    NUMBER_PATTERN = re.compile(r"(?<!\w)-?\d+(?:\.\d+)?(?:%|x|bp|kb|mb|gb)?(?!\w)", re.IGNORECASE)
    VALUE_AFTER_PATTERN = re.compile(
        r"\b(?:marked|containing|contains|with|to|from|called|saying|than|at least|below|above|equal to)\s+([^.,:]+)",
        re.IGNORECASE,
    )
    FIELD_AFTER_PATTERN = re.compile(
        r"\b(?:under|by|using|column|columns|field|fields|named)\s+([^.,:]+)",
        re.IGNORECASE,
    )
    COMMAND_PREFIX = re.compile(
        r"^(?:Ask|Open|Keep|Remove|Count|Show|Save|Say|Use|Convert|Reverse-complement|Translate|Find|Create|Make|Put|Replace|Rename|Combine|Compare|Correct|Normalize|Map|Align|Build|Annotate|Download|Export|Import|Run|Stop|Record|Include|Sort|Filter|Trim|Merge|Split|Select|Calculate|Summarize|Group|Join|Restore|Name|Call|Copy|Move|Delete|Check|Test|Plot|Draw|Write|Read|Load|Close|Clear|Repeat|Otherwise|If|For every)\b",
        re.IGNORECASE,
    )

    def __init__(self, document, dark: bool = False) -> None:
        super().__init__(document)
        self.dark = dark
        self.enabled = True
        self._make_formats()

    @staticmethod
    def _format(color: str, *, bold: bool = False, italic: bool = False) -> QTextCharFormat:
        fmt = QTextCharFormat()
        fmt.setForeground(QColor(color))
        fmt.setFontWeight(QFont.Weight.Bold if bold else QFont.Weight.Normal)
        fmt.setFontItalic(italic)
        return fmt

    def _make_formats(self) -> None:
        c = DARK if self.dark else LIGHT
        self.command = self._format(c["syntax_command"], bold=True)
        self.file = self._format(c["syntax_file"])
        self.value = self._format(c["syntax_value"])
        self.field = self._format(c["syntax_field"])
        self.word = self._format(c["syntax_word"])
        self.comment = self._format(c["syntax_comment"], italic=True)
        self.invalid = self._format(c["syntax_invalid"])
        self.punctuation = self._format(c["muted"])

    def set_dark(self, dark: bool) -> None:
        self.dark = dark
        self._make_formats()
        self.rehighlight()

    def set_program_mode(self, enabled: bool) -> None:
        self.enabled = enabled
        self.rehighlight()

    def _accepted(self, stripped: str) -> bool:
        if stripped.endswith(":"):
            return stripped.casefold().startswith(("if ", "otherwise", "for every ", "make a recipe called "))
        if not stripped.endswith("."):
            return False
        try:
            parse(normalize_sentence(stripped))
            return True
        except (FigureLoomBioError, ValueError, RuntimeError):
            return False

    def _set_matches(self, text: str, pattern: re.Pattern[str], fmt: QTextCharFormat, group: int = 0) -> None:
        for match in pattern.finditer(text):
            start, end = match.span(group)
            if end > start:
                self.setFormat(start, end - start, fmt)

    def highlightBlock(self, text: str) -> None:  # noqa: N802 - Qt API name
        if not self.enabled or not text.strip():
            return
        stripped = text.strip()
        leading = len(text) - len(text.lstrip())
        if stripped.startswith("#"):
            self.setFormat(leading, len(stripped), self.comment)
            return
        if not self._accepted(stripped):
            self.setFormat(leading, len(stripped), self.invalid)
            return

        self.setFormat(leading, len(stripped), self.word)
        prefix = self.COMMAND_PREFIX.match(stripped)
        if prefix:
            self.setFormat(leading + prefix.start(), prefix.end() - prefix.start(), self.command)
        self._set_matches(text, self.FILE_PATTERN, self.file)
        self._set_matches(text, self.NUMBER_PATTERN, self.value)
        self._set_matches(text, self.VALUE_AFTER_PATTERN, self.value, 1)
        self._set_matches(text, self.FIELD_AFTER_PATTERN, self.field, 1)
        if stripped[-1:] in {".", ":"}:
            self.setFormat(leading + len(stripped) - 1, 1, self.punctuation)


def install_web_parity(native_ide_module: Any) -> type[Any]:
    from . import native_widgets

    native_widgets.LIGHT = LIGHT
    native_widgets.DARK = DARK
    native_widgets.palette_stylesheet = web_palette_stylesheet
    native_widgets.NativeSyntaxHighlighter = WebSyntaxHighlighter
    native_ide_module.APP_NAME = APP_NAME

    base = native_ide_module.NativeIdeWindow

    class WebParityNativeIdeWindow(base):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, **kwargs)
            self.setWindowTitle(APP_NAME)

        def _build(self) -> None:
            root = QWidget()
            root_layout = QVBoxLayout(root)
            root_layout.setContentsMargins(0, 0, 0, 0)
            root_layout.setSpacing(0)
            root_layout.addWidget(self._build_header())
            root_layout.addWidget(self._build_toolbar())
            root_layout.addWidget(self._build_workspace(), 1)
            self.setCentralWidget(root)

        def _build_header(self) -> QWidget:
            header = QFrame()
            header.setObjectName("ideHeader")
            layout = QHBoxLayout(header)
            layout.setContentsMargins(18, 0, 18, 0)
            layout.setSpacing(11)

            self.account_button = make_button("◌", self.open_projects, name="account")
            self.account_button.setObjectName("accountButton")
            self.account_button.setToolTip("Sign in or open FigureLoom Bio projects")
            layout.addWidget(self.account_button)

            brand = QVBoxLayout()
            brand.setSpacing(0)
            title = QLabel("FigureLoom Bio")
            title.setObjectName("brandTitle")
            subtitle = QLabel("Plain-language IDE")
            subtitle.setObjectName("brandSubtitle")
            brand.addWidget(title)
            brand.addWidget(subtitle)
            layout.addLayout(brand)
            layout.addStretch(1)

            name_box = QVBoxLayout()
            name_box.setSpacing(0)
            self.program_name = QLineEdit()
            self.program_name.setObjectName("programName")
            self.program_name.setAccessibleName("Program name")
            self.program_name.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.program_name.editingFinished.connect(self.rename_active_file)
            self.save_status = QLabel("Saved on this computer")
            self.save_status.setObjectName("muted")
            self.save_status.setAlignment(Qt.AlignmentFlag.AlignCenter)
            name_box.addWidget(self.program_name)
            name_box.addWidget(self.save_status)
            layout.addLayout(name_box)
            layout.addStretch(1)

            self.theme_button = make_button("◐", self.toggle_theme, name="theme")
            self.theme_button.setObjectName("themeButton")
            self.theme_button.setToolTip("Switch appearance")
            self.manual_button = make_button("Manual", self.open_manual, name="manual")
            self.figureloom_button = make_button("FigureLoom", self.open_figureloom, name="figureloom")
            self.run_button = make_button("Run", self.run_current, name="run", primary=True)
            for button in (self.theme_button, self.manual_button, self.figureloom_button, self.run_button):
                layout.addWidget(button)
            return header

        def _tool_group(self, label: str, buttons: list[QPushButton]) -> QWidget:
            group = QFrame()
            group.setObjectName("toolGroup")
            box = QVBoxLayout(group)
            box.setContentsMargins(0, 7, 16, 2)
            box.setSpacing(2)
            row = QHBoxLayout()
            row.setSpacing(7)
            for button in buttons:
                button.setMinimumHeight(34)
                row.addWidget(button)
            box.addLayout(row)
            caption = QLabel(label)
            caption.setObjectName("toolLabel")
            box.addWidget(caption)
            return group

        def _build_toolbar(self) -> QWidget:
            bar = QFrame()
            bar.setObjectName("ideToolbar")
            layout = QHBoxLayout(bar)
            layout.setContentsMargins(16, 0, 16, 0)
            layout.setSpacing(12)

            self.new_button = make_button("New", self.new_program, name="new")
            self.open_button = make_button("Open", self.open_files, name="open")
            self.save_button = make_button("Save", self.save_active_file, name="save")
            layout.addWidget(self._tool_group("File", [self.new_button, self.open_button, self.save_button]))

            self.examples_button = make_button("Open examples", self.open_examples, name="examples")
            self.builder_button = make_button("Build program", self.open_builder, name="builder")
            self.tidy_button = make_button("Tidy sentences", self.tidy_program, name="tidy")
            self.clear_results_button = make_button("Clear results", self.clear_results, name="clear_results")
            layout.addWidget(self._tool_group(
                "Program",
                [self.examples_button, self.builder_button, self.tidy_button, self.clear_results_button],
            ))

            self.translate_button = make_button("Translate", self.open_translator, name="translate")
            self.sentences_button = make_button("Words & terms", self.open_sentence_library, name="sentences")
            self.export_results_button = make_button("Export results", self.export_results, name="export_results")
            layout.addWidget(self._tool_group(
                "Desktop",
                [self.translate_button, self.sentences_button, self.export_results_button],
            ))

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
            splitter.setSizes([230, 850, 390])
            return splitter

        def _build_files_panel(self) -> QWidget:
            panel = QFrame()
            panel.setObjectName("filesPanel")
            layout = QVBoxLayout(panel)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(12)
            heading_row = QHBoxLayout()
            copy = QVBoxLayout()
            copy.setSpacing(4)
            heading = QLabel("FILES")
            heading.setObjectName("panelHeading")
            detail = QLabel("Programs, input files, and generated results appear here immediately.")
            detail.setObjectName("muted")
            detail.setWordWrap(True)
            copy.addWidget(heading)
            copy.addWidget(detail)
            heading_row.addLayout(copy)
            heading_row.addStretch(1)
            self.add_file_button = make_button("+", self.open_files, name="add_file")
            self.add_file_button.setObjectName("smallButton")
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
            panel.setObjectName("editorPanel")
            layout = QVBoxLayout(panel)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(0)

            topbar = QFrame()
            topbar.setObjectName("panelTopbar")
            top = QHBoxLayout(topbar)
            top.setContentsMargins(12, 4, 12, 0)
            self.active_label = QLabel()
            self.active_label.setObjectName("heading")
            language = QLabel("FigureLoom Bio")
            language.setObjectName("languageLabel")
            top.addWidget(self.active_label)
            top.addStretch(1)
            top.addWidget(language)
            layout.addWidget(topbar)

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

            status_frame = QFrame()
            status_frame.setObjectName("editorStatus")
            status = QHBoxLayout(status_frame)
            status.setContentsMargins(12, 0, 12, 0)
            self.cursor_status = QLabel("Line 1")
            self.cursor_status.setObjectName("muted")
            instruction_note = QLabel("Instructions end with a period. Block headers end with a colon.")
            instruction_note.setObjectName("muted")
            status.addWidget(self.cursor_status)
            status.addStretch(1)
            status.addWidget(instruction_note)
            layout.addWidget(status_frame)
            return panel

        def _build_results_panel(self) -> QWidget:
            panel = QFrame()
            panel.setObjectName("resultsPanel")
            layout = QVBoxLayout(panel)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(12)
            heading_row = QHBoxLayout()
            copy = QVBoxLayout()
            copy.setSpacing(4)
            heading = QLabel("RESULTS")
            heading.setObjectName("panelHeading")
            detail = QLabel("Different results stay in separate, readable sections.")
            detail.setObjectName("muted")
            detail.setWordWrap(True)
            copy.addWidget(heading)
            copy.addWidget(detail)
            self.run_status = QLabel("Ready")
            self.run_status.setObjectName("statusPill")
            heading_row.addLayout(copy)
            heading_row.addStretch(1)
            heading_row.addWidget(self.run_status)
            layout.addLayout(heading_row)
            self.results = ResultsPane()
            layout.addWidget(self.results, 1)
            return panel

        def apply_theme(self) -> None:
            self.setStyleSheet(web_palette_stylesheet(self.dark))
            self.editor.highlighter.set_dark(self.dark)
            self.settings.setValue("dark", self.dark)

        def load_active_file(self) -> None:
            super().load_active_file()
            self.editor.highlighter.set_program_mode(self.workspace.active_file.casefold().endswith((".flbio", ".flbio.txt")))

    native_ide_module.NativeIdeWindow = WebParityNativeIdeWindow
    return WebParityNativeIdeWindow


__all__ = ["APP_NAME", "WebSyntaxHighlighter", "install_web_parity", "web_palette_stylesheet"]
