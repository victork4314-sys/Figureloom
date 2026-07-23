from __future__ import annotations

import re

from . import parser as parser_module


_NORMALIZE_COUNTS_IN = (
    "normalize_counts",
    re.compile(r"normalize the counts in (.+)", re.IGNORECASE),
)


def install_language_execution_parity() -> None:
    """Keep exact public vocabulary ahead of broader natural-language aliases.

    ``Normalize the counts in expression.`` used to be captured by the older,
    broader ``Normalize ...`` alias. That produced a request for a column named
    ``the counts in expression`` instead of the actual ``expression`` column.
    This exact accepted form belongs to the normal ``normalize_counts`` action.
    """

    if getattr(parser_module, "_language_execution_parity_installed", False):
        return

    parser_module._PATTERNS = (
        _NORMALIZE_COUNTS_IN,
        *(
            item
            for item in parser_module._PATTERNS
            if not (
                item[0] == _NORMALIZE_COUNTS_IN[0]
                and item[1].pattern == _NORMALIZE_COUNTS_IN[1].pattern
            )
        ),
    )
    parser_module._language_execution_parity_installed = True


__all__ = ["install_language_execution_parity"]
