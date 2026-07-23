from __future__ import annotations

from typing import Any

from . import language_aliases


def install_language_label_parity() -> None:
    """Keep terminal result headings identical to the browser wording."""
    if getattr(language_aliases, "_language_label_parity_installed", False):
        return

    original_read_statistic = language_aliases._read_statistic

    def read_statistic(runner: Any, rule_id: str, values: tuple[str, ...]) -> None:
        start = len(runner.output.sections)
        original_read_statistic(runner, rule_id, values)
        for section in runner.output.sections[start:]:
            if section.title.startswith("Standard Deviation "):
                section.title = section.title.replace(
                    "Standard Deviation ",
                    "Standard deviation ",
                    1,
                )

    language_aliases._read_statistic = read_statistic
    language_aliases._language_label_parity_installed = True
