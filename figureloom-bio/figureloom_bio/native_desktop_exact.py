from __future__ import annotations

from typing import Any

from PySide6.QtCore import Qt
from PySide6.QtGui import QAction, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QCheckBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMenu,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from .native_widgets import BlockEditor, CodeEditor, FileTree, ResultsPane, make_button
from .native_web_parity import DARK, LIGHT, web_palette_stylesheet


def exact_desktop_stylesheet(dark: bool) -> str:
    c = DARK if dark else LIGHT
    return web_palette_stylesheet(dark) + f"""
    QWidget#transparentHost, QWidget#ideWorkspace {{ background: transparent; }}
    QFrame#fileTab {{
        min-height: 33px; max-height: 33px;
        padding: 0 12px;
        background: {c['editor']};
        border: 1px solid {c['line']};
        border-bottom-color: {c['editor']};
        border-top-left-radius: 9px;
        border-top-right-radius: 9px;
    }}
    QLabel#fileDot {{
        min-width: 8px; max-width: 8px;
        min-height: 8px; max-height: 8px;
        border-radius: 4px;
        background: {c['accent']};
    }}
    QTabWidget#editorModes::pane {{ border: 0; background: {c['editor']}; }}
    QTabWidget#editorModes QTabBar {{ width: 0; height: 0; }}
    QPlainTextEdit#programEditor {{
        background: {c['editor']};
        color: {c['text']};
        border: 0;
        selection-background-color: {c['accent_soft']};
    }}
    """


def install_exact_desktop(native_ide_module: Any) -> type[Any]:
    """Keep every desktop function while making the visible IDE match the web IDE."""

    base = native_ide_module.NativeIdeWindow

    class ExactDesktopNativeIdeWindow(base):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, **kwargs)
            self.setMinimumSize(920, 620)
            self._install_native_only_access()

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
            header.setFixedHeight(62)
            layout = QGridLayout(header)
            layout.setContentsMargins(18, 0, 18, 0)
            layout.setHorizontalSpacing(18)
            layout.setVerticalSpacing(0)
            layout.setColumnStretch(0, 1)
            layout.setColumnStretch(1, 0)
            layout.setColumnStretch(2, 1)

            left = QWidget()
            left.setObjectName("transparentHost")
            left_layout = QHBoxLayout(left)
            left_layout.setContentsMargins(0, 0, 0, 0)
            left_layout.setSpacing(11)
            self.account_button = make_button("◌", self.open_projects, name="account")
            self.account_button.setObjectName("accountButton")
            self.account_button.setToolTip("Sign in or open FigureLoom Bio projects")
            left_layout.addWidget(self.account_button)
            brand = QVBoxLayout()
            brand.setContentsMargins(0, 0, 0, 0)
            brand.setSpacing(0)
            title = QLabel("FigureLoom Bio")
            title.setObjectName("brandTitle")
            subtitle = QLabel("Plain-language IDE")
            subtitle.setObjectName("brandSubtitle")
            brand.addWidget(title)
            brand.addWidget(subtitle)
            left_layout.addLayout(brand)
            left_layout.addStretch(1)
            layout.addWidget(left, 0, 0)

            center = QWidget()
            center.setObjectName("transparentHost")
            center_layout = QVBoxLayout(center)
            center_layout.setContentsMargins(0, 0, 0, 0)
            center_layout.setSpacing(0)
            self.program_name = QLineEdit()
            self.program_name.setObjectName("programName")
            self.program_name.setAccessibleName("Program name")
            self.program_name.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.program_name.editingFinished.connect(self.rename_active_file)
            self.save_status = QLabel("Saved on this computer")
            self.save_status.setObjectName("muted")
            self.save_status.setAlignment(Qt.AlignmentFlag.AlignCenter)
            center_layout.addWidget(self.program_name)
            center_layout.addWidget(self.save_status)
            layout.addWidget(center, 0, 1, Qt.AlignmentFlag.AlignCenter)

            right = QWidget()
            right.setObjectName("transparentHost")
            right_layout = QHBoxLayout(right)
            right_layout.setContentsMargins(0, 0, 0, 0)
            right_layout.setSpacing(8)
            right_layout.addStretch(1)
            self.theme_button = make_button("◐", self.toggle_theme, name="theme")
            self.theme_button.setObjectName("themeButton")
            self.theme_button.setToolTip("Switch appearance")
            self.manual_button = make_button("Manual", self.open_manual, name="manual")
            self.figureloom_button = make_button("FigureLoom", self.open_figureloom, name="figureloom")
            self.run_button = make_button("Run", self.run_current, name="run", primary=True)
            for button in (self.theme_button, self.manual_button, self.figureloom_button, self.run_button):
                right_layout.addWidget(button)
            layout.addWidget(right, 0, 2)
            return header

        def _tool_group(self, label: str, buttons: list[QPushButton]) -> QWidget:
            group = QFrame()
            group.setObjectName("toolGroup")
            box = QVBoxLayout(group)
            box.setContentsMargins(0, 0, 16, 0)
            box.setSpacing(2)
            row = QHBoxLayout()
            row.setContentsMargins(0, 0, 0, 0)
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
            bar.setFixedHeight(70)
            layout = QHBoxLayout(bar)
            layout.setContentsMargins(16, 9, 16, 9)
            layout.setSpacing(12)

            self.new_button = make_button("New", self.new_program, name="new")
            self.open_button = make_button("Open", self.open_files, name="open")
            self.save_button = make_button("Save", self.save_active_file, name="save")
            layout.addWidget(self._tool_group("File", [self.new_button, self.open_button, self.save_button]))

            self.examples_button = make_button("Open examples", self.open_examples, name="examples")
            self.builder_button = make_button("Build program", self.open_builder, name="builder")
            self.tidy_button = make_button("Tidy sentences", self.tidy_program, name="tidy")
            self.clear_results_button = make_button("Clear results", self.clear_results, name="clear_results")
            layout.addWidget(
                self._tool_group(
                    "Program",
                    [self.examples_button, self.builder_button, self.tidy_button, self.clear_results_button],
                )
            )
            layout.addStretch(1)
            return bar

        def _build_workspace(self) -> QWidget:
            workspace = QWidget()
            workspace.setObjectName("ideWorkspace")
            layout = QHBoxLayout(workspace)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(0)
            files = self._build_files_panel()
            files.setFixedWidth(230)
            editor = self._build_editor_panel()
            results = self._build_results_panel()
            results.setMinimumWidth(320)
            results.setMaximumWidth(420)
            results.resize(390, results.height())
            layout.addWidget(files)
            layout.addWidget(editor, 1)
            layout.addWidget(results)
            return workspace

        def _build_files_panel(self) -> QWidget:
            panel = QFrame()
            panel.setObjectName("filesPanel")
            layout = QVBoxLayout(panel)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(12)
            heading_row = QHBoxLayout()
            heading_row.setContentsMargins(0, 0, 0, 0)
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
            top.setSpacing(8)
            file_tab = QFrame()
            file_tab.setObjectName("fileTab")
            file_tab_layout = QHBoxLayout(file_tab)
            file_tab_layout.setContentsMargins(0, 0, 0, 0)
            file_tab_layout.setSpacing(8)
            dot = QLabel()
            dot.setObjectName("fileDot")
            self.active_label = QLabel()
            self.active_label.setObjectName("heading")
            file_tab_layout.addWidget(dot)
            file_tab_layout.addWidget(self.active_label)
            top.addWidget(file_tab, 0, Qt.AlignmentFlag.AlignBottom)
            top.addStretch(1)
            language = QLabel("FigureLoom Bio")
            language.setObjectName("languageLabel")
            top.addWidget(language, 0, Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(topbar)

            self.tabs = QTabWidget()
            self.tabs.setObjectName("editorModes")
            self.tabs.tabBar().hide()
            self.editor = CodeEditor(dark=self.dark)
            self.editor.setObjectName("programEditor")
            self.editor.document().setDocumentMargin(20)
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

        def _install_native_only_access(self) -> None:
            # These controls remain real native controls for feature parity, but they do not
            # change the approved web-identical primary layout.
            self._desktop_controls = QWidget(self)
            self._desktop_controls.hide()
            self.translate_button = make_button("Translate", self.open_translator, name="translate")
            self.sentences_button = make_button("Words & terms", self.open_sentence_library, name="sentences")
            self.export_results_button = make_button("Export results", self.export_results, name="export_results")
            self.delete_file_button = make_button("Delete selected", self.delete_selected_file, name="delete_file", danger=True)
            self.text_mode_button = make_button("Text", lambda: self.tabs.setCurrentIndex(0), name="text_mode")
            self.blocks_mode_button = make_button("Blocks", lambda: self.tabs.setCurrentIndex(1), name="blocks_mode")
            self.allow_tools = QCheckBox("Allow installed tools", self._desktop_controls)
            for button in (
                self.translate_button,
                self.sentences_button,
                self.export_results_button,
                self.delete_file_button,
                self.text_mode_button,
                self.blocks_mode_button,
            ):
                button.setParent(self._desktop_controls)
            self.export_results_button.setEnabled(False)

            QShortcut(QKeySequence("Ctrl+Shift+B"), self, activated=self._toggle_blocks_mode)
            QShortcut(QKeySequence("Meta+Shift+B"), self, activated=self._toggle_blocks_mode)
            QShortcut(QKeySequence("Ctrl+Shift+T"), self, activated=self.open_translator)
            QShortcut(QKeySequence("Meta+Shift+T"), self, activated=self.open_translator)
            QShortcut(QKeySequence("Ctrl+Shift+E"), self, activated=self.export_results)
            QShortcut(QKeySequence("Meta+Shift+E"), self, activated=self.export_results)

            self.editor.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
            self.editor.customContextMenuRequested.connect(self._show_editor_menu)
            self.results.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
            self.results.customContextMenuRequested.connect(self._show_results_menu)
            self.run_button.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
            self.run_button.customContextMenuRequested.connect(self._show_run_menu)

        def _toggle_blocks_mode(self) -> None:
            self.tabs.setCurrentIndex(0 if self.tabs.currentIndex() == 1 else 1)

        def _show_editor_menu(self, position: Any) -> None:
            menu = self.editor.createStandardContextMenu()
            menu.addSeparator()
            blocks = QAction("Open blocks editor", menu)
            blocks.triggered.connect(lambda: self.tabs.setCurrentIndex(1))
            menu.addAction(blocks)
            translate = QAction("Translate program", menu)
            translate.triggered.connect(self.open_translator)
            menu.addAction(translate)
            sentences = QAction("Open words and terms library", menu)
            sentences.triggered.connect(self.open_sentence_library)
            menu.addAction(sentences)
            menu.exec(self.editor.mapToGlobal(position))

        def _show_results_menu(self, position: Any) -> None:
            menu = QMenu(self.results)
            export = menu.addAction("Export results")
            export.setEnabled(bool(self._last_sections))
            export.triggered.connect(self.export_results)
            menu.exec(self.results.mapToGlobal(position))

        def _show_run_menu(self, position: Any) -> None:
            menu = QMenu(self.run_button)
            allow = menu.addAction("Allow installed tools")
            allow.setCheckable(True)
            allow.setChecked(self.allow_tools.isChecked())
            allow.toggled.connect(self.allow_tools.setChecked)
            menu.exec(self.run_button.mapToGlobal(position))

        def apply_theme(self) -> None:
            self.setStyleSheet(exact_desktop_stylesheet(self.dark))
            self.editor.highlighter.set_dark(self.dark)
            self.settings.setValue("dark", self.dark)

    native_ide_module.NativeIdeWindow = ExactDesktopNativeIdeWindow
    return ExactDesktopNativeIdeWindow


__all__ = ["exact_desktop_stylesheet", "install_exact_desktop"]
