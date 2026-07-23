from __future__ import annotations

from pathlib import Path
from typing import Any

from .errors import FigureLoomBioError


_REQUIRED_VOLCANO_MARKERS = (
    'data-significance="higher"',
    'data-significance="lower"',
    "stroke-dasharray",
)


def install_desktop_test_final(desktop_tools_module: Any) -> None:
    if getattr(desktop_tools_module, "_thresholded_volcano_test_installed", False):
        return
    original = desktop_tools_module.run_quick_test

    def run_quick_test(destination: Path | None = None) -> tuple[bool, str, Path]:
        success, report, folder = original(destination)
        if not success:
            return success, report, folder
        path = folder / "quick-volcano.svg"
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
            missing = [marker for marker in _REQUIRED_VOLCANO_MARKERS if marker not in text]
            if missing:
                raise FigureLoomBioError(
                    "The volcano plot is missing significance groups or threshold lines: " + ", ".join(missing)
                )
        except (OSError, FigureLoomBioError) as error:
            message = error.plain_message() if isinstance(error, FigureLoomBioError) else str(error)
            report = (
                "FIGURELOOM BIO QUICK TEST FAILED\n\n"
                f"{message}\n\n"
                "What happened\n"
                "The language created a file named as a volcano plot, but the file did not contain the required scientific groups and cutoffs.\n\n"
                "How to fix it\n"
                "Run Repair from the updater, then run the automatic test again.\n"
            )
            try:
                (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
            except OSError:
                pass
            return False, report, folder

        report = report.replace(
            "It created real histogram and volcano plot SVG figures.",
            "It created a real histogram and a thresholded volcano plot with higher and lower significance groups.",
        )
        try:
            (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
        except OSError:
            pass
        return True, report, folder

    desktop_tools_module.run_quick_test = run_quick_test
    desktop_tools_module._thresholded_volcano_test_installed = True


__all__ = ["install_desktop_test_final"]
