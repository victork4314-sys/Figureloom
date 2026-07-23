from __future__ import annotations

from pathlib import Path
import os
import sys
import tempfile
from typing import Any

from PySide6.QtCore import QByteArray
from PySide6.QtWidgets import QApplication, QFrame, QLabel, QMessageBox, QSizePolicy, QVBoxLayout
from PySide6.QtSvgWidgets import QSvgWidget

from .native_core import NativeRunResult, NativeWorkspace, looks_like_program
from .native_syntax_web_exact import ExactWebSyntaxHighlighter
from .output import Section


MAX_HIGHLIGHT_LINE = 20_000


class StableExactWebSyntaxHighlighter(ExactWebSyntaxHighlighter):
    def __init__(self, document, dark: bool = False) -> None:
        super().__init__(document, dark)
        self.enabled = False

    def highlightBlock(self, text: str) -> None:  # noqa: N802 - Qt API name
        if not self.enabled or len(text) > MAX_HIGHLIGHT_LINE:
            return
        super().highlightBlock(text)


class SvgPreviewCard(QFrame):
    def __init__(self, name: str, svg: str) -> None:
        super().__init__()
        self.setObjectName("card")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 14)
        layout.setSpacing(8)
        title = QLabel(name)
        title.setObjectName("heading")
        copy = QLabel("Generated figure preview")
        copy.setObjectName("muted")
        self.preview = QSvgWidget()
        self.preview.setMinimumHeight(300)
        self.preview.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.preview.load(QByteArray(svg.encode("utf-8")))
        layout.addWidget(title)
        layout.addWidget(copy)
        layout.addWidget(self.preview, 1)


def _insert_svg_previews(results: Any, generated_files: dict[str, str]) -> int:
    previews = [
        (name, content)
        for name, content in generated_files.items()
        if name.casefold().endswith(".svg") and content.lstrip().startswith("<svg")
    ]
    if not previews:
        return 0
    insertion = max(0, results.layout.count() - 1)
    for name, content in previews:
        results.layout.insertWidget(insertion, SvgPreviewCard(name, content))
        insertion += 1
    return len(previews)


def install_native_stability(native_ide_module: Any) -> type[Any]:
    from . import native_widgets

    native_widgets.NativeSyntaxHighlighter = StableExactWebSyntaxHighlighter
    base = native_ide_module.NativeIdeWindow

    class StableNativeIdeWindow(base):
        def load_active_file(self) -> None:
            name = self.workspace.active_file
            highlighter = getattr(getattr(self, "editor", None), "highlighter", None)
            if highlighter is not None and hasattr(highlighter, "set_program_mode"):
                highlighter.set_program_mode(looks_like_program(name))
            super().load_active_file()

        def run_finished(self, result: NativeRunResult) -> None:
            super().run_finished(result)
            _insert_svg_previews(self.results, result.generated_files)

    native_ide_module.NativeIdeWindow = StableNativeIdeWindow
    original_self_test = native_ide_module.native_self_test

    def complete_self_test() -> int:
        native_stability_self_test(native_ide_module)
        return original_self_test()

    native_ide_module.native_self_test = complete_self_test
    return StableNativeIdeWindow


def native_stability_self_test(native_ide_module: Any) -> dict[str, bool]:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    app = QApplication.instance() or QApplication(["FigureLoom Bio Desktop", "--stability-self-test"])
    folder = Path(tempfile.mkdtemp(prefix="figureloom-native-stability-test-"))
    try:
        workspace = NativeWorkspace(folder / "workspace.json")
        workspace.files = {
            "large-result.svg": (
                '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">'
                + '<path d="M0 0 L1 1"/>' * 12_000
                + "</svg>"
            ),
            "program.flbio": "Say The stability test works.\n",
        }
        workspace.active_file = "large-result.svg"
        workspace.save()

        window = native_ide_module.NativeIdeWindow(workspace)
        if getattr(window.editor.highlighter, "enabled", True):
            raise RuntimeError("Syntax highlighting stayed enabled while a large SVG was loaded.")
        if window.editor.toPlainText() != workspace.files["large-result.svg"]:
            raise RuntimeError("The large SVG did not load intact.")

        window.activate_file("program.flbio")
        if not getattr(window.editor.highlighter, "enabled", False):
            raise RuntimeError("Syntax highlighting did not turn back on for a .flbio program.")

        preview_result = NativeRunResult(
            [Section("Volcano plot", ["Points plotted", "3"])],
            {"volcano-plot.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><circle cx="100" cy="100" r="4"/></svg>'},
            folder,
        )
        window.run_finished(preview_result)
        if window.results.findChild(QSvgWidget) is None:
            raise RuntimeError("Generated SVG figures were not shown in the native results panel.")
        window.show()
        app.processEvents()
        window.close()
        app.processEvents()
        return {"large_svg_startup": True, "program_highlighting_restored": True, "svg_preview": True}
    finally:
        import shutil
        shutil.rmtree(folder, ignore_errors=True)


def run_stable_ide(native_ide_module: Any, arguments: list[str] | None = None) -> int:
    try:
        return native_ide_module.run_native_ide(arguments)
    except Exception as error:
        from .desktop_reliability import crash_report, simple_explanation

        report = crash_report("IDE", error)
        try:
            app = QApplication.instance() or QApplication(["FigureLoom Bio Desktop"])
            QMessageBox.critical(
                None,
                "FigureLoom Bio",
                simple_explanation(
                    "FigureLoom Bio could not open.",
                    "The IDE stopped during startup. The error was saved instead of being hidden.",
                    "Open the crash report below, then run Repair from the FigureLoom Bio updater.",
                    technical_detail=f"{error}\n\nCrash report: {report}",
                ),
            )
            app.processEvents()
        except Exception:
            print(f"FigureLoom Bio could not open. Crash report: {report}", file=sys.stderr)
        return 1


__all__ = [
    "MAX_HIGHLIGHT_LINE",
    "StableExactWebSyntaxHighlighter",
    "SvgPreviewCard",
    "install_native_stability",
    "native_stability_self_test",
    "run_stable_ide",
]
