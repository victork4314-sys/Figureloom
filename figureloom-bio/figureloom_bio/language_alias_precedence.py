from __future__ import annotations

from typing import Any

from . import parser as parser_module
from .language_aliases import RULES


_PREFIX = "language_alias__"
_PRIORITY_ACTIONS = {"read_statistic", "grouped_box_plot", "heat_map_columns"}


def install_language_alias_precedence() -> None:
    """Publish and order aliases with distinct runtime semantics.

    Ordinary aliases remain behind compositional grammar. These specialized
    forms carry information that a generic operation/target parse cannot infer,
    so the parser must be able to identify them explicitly even if later
    installers append or reorder compatibility patterns.
    """

    if getattr(parser_module, "_language_alias_precedence_installed", False):
        return
    priority_ids = {
        str(rule["id"])
        for rule in RULES
        if str(rule["action"]) in _PRIORITY_ACTIONS
    }
    priority_names = frozenset(f"{_PREFIX}{rule_id}" for rule_id in priority_ids)
    priority: list[tuple[str, Any]] = []
    remaining: list[tuple[str, Any]] = []
    for item in parser_module._PATTERNS:
        (priority if item[0] in priority_names else remaining).append(item)
    parser_module._PATTERNS = tuple(priority + remaining)
    parser_module._PRIORITY_ALIAS_NAMES = priority_names
    parser_module._language_alias_precedence_installed = True


__all__ = ["install_language_alias_precedence"]
