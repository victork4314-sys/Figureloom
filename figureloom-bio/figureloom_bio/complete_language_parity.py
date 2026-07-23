from __future__ import annotations

import math
from statistics import fmean, stdev
from typing import Any

from . import complete_language
from .errors import FigureLoomBioError


_ORIGINAL_CALCULATE = complete_language._calculate


def install_complete_language_parity() -> None:
    """Keep completed terminal commands behaviorally aligned with the browser.

    Group comparison scans a mixed table for numeric measurement columns. Text
    columns such as sample names are metadata and must be skipped, not treated
    as malformed numeric values. Commands that explicitly name a numeric column
    continue to use the strict validator in ``complete_language``.

    Standard deviation uses the sample calculation in every native runtime.
    """
    if getattr(complete_language, "_parity_fix_installed", False):
        return
    complete_language._compare_groups = _compare_groups
    complete_language._calculate = _calculate
    complete_language._parity_fix_installed = True


def _compare_groups(runner: Any, first: str, second: str, requested: str) -> None:
    table = runner._need_table()
    group_column = runner._column(table, requested)
    first_rows = [
        row
        for row in table.rows
        if str(row.get(group_column, "")).casefold() == first.casefold()
    ]
    second_rows = [
        row
        for row in table.rows
        if str(row.get(group_column, "")).casefold() == second.casefold()
    ]
    if not first_rows or not second_rows:
        raise FigureLoomBioError(
            f"I could not find both {first} and {second} under {group_column}."
        )

    rows: list[dict[str, str]] = []
    for column in table.columns:
        if column == group_column:
            continue
        left = _numeric_values_if_possible(first_rows, column)
        right = _numeric_values_if_possible(second_rows, column)
        if not left or not right:
            continue
        left_average = fmean(left)
        right_average = fmean(right)
        fold = left_average / right_average if right_average else math.inf
        rows.append(
            {
                "column": column,
                f"{first}_average": f"{left_average:.6g}",
                f"{second}_average": f"{right_average:.6g}",
                "difference": f"{left_average - right_average:.6g}",
                "fold_change": "infinite" if math.isinf(fold) else f"{fold:.6g}",
            }
        )

    if not rows:
        raise FigureLoomBioError("I could not find numeric columns to compare.")
    columns = list(rows[0])
    complete_language._set_table(runner, columns, rows, "group comparison")
    runner.output.add_table(f"Compared {first} and {second}", columns, rows)


def _calculate(runner: Any, action: str, requested: str) -> None:
    if action != "calculate_standard_deviation":
        _ORIGINAL_CALCULATE(runner, action, requested)
        return
    values, column = complete_language._numeric_column(runner, requested)
    value = stdev(values) if len(values) > 1 else 0.0
    runner.output.add("Standard deviation", column, f"{value:.6g}")


def _numeric_values_if_possible(
    rows: list[dict[str, str]],
    column: str,
) -> list[float]:
    values: list[float] = []
    for row in rows:
        raw = str(row.get(column, "")).strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError:
            return []
    return values


__all__ = ["install_complete_language_parity"]
