from __future__ import annotations

from typing import Any

from . import parser as parser_module
from .language_aliases import RULES


_PREFIX = "language_alias__"
_PRIORITY_ACTIONS = {"read_statistic", "grouped_box_plot", "heat_map_columns"}


def install_language_alias_precedence() -> None:
    """Put genuinely new, specific forms before broad legacy patterns.

    Ordinary synonyms remain after the canonical grammar so resolving one of
    them to its canonical sentence cannot recurse. Only new runtime actions are
    promoted, including grouped box plots which must beat the older broad
    one-column box-plot rule.
    """

    if getattr(parser_module, "_language_alias_precedence_installed", False):
        return
    priority_ids = {
        str(rule["id"])
        for rule in RULES
        if str(rule["action"]) in _PRIORITY_ACTIONS
    }
    priority_names = {f"{_PREFIX}{rule_id}" for rule_id in priority_ids}
    priority: list[tuple[str, Any]] = []
    remaining: list[tuple[str, Any]] = []
    for item in parser_module._PATTERNS:
        (priority if item[0] in priority_names else remaining).append(item)
    parser_module._PATTERNS = tuple(priority + remaining)
    parser_module._language_alias_precedence_installed = True


__all__ = ["install_language_alias_precedence"]
