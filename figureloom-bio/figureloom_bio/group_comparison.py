from __future__ import annotations

from statistics import fmean
import math
from typing import Any

from . import complete_language
from .errors import FigureLoomBioError


def install_group_comparison() -> None:
    def compare_groups(runner: Any, first: str, second: str, requested: str) -> None:
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
            left = _numeric_values(first_rows, column)
            right = _numeric_values(second_rows, column)
            if left is None or right is None:
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

    complete_language._compare_groups = compare_groups


def _numeric_values(rows: list[dict[str, str]], column: str) -> list[float] | None:
    values: list[float] = []
    for row in rows:
        raw = str(row.get(column, "")).strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError:
            return None
    return values or None


__all__ = ["install_group_comparison"]
