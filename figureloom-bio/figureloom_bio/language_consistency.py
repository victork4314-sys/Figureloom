from __future__ import annotations

import math
from statistics import fmean, stdev
from typing import Any, Iterable

from .errors import FigureLoomBioError
from .runtime import Table


def install_language_consistency(runner_class: type[Any]) -> None:
    """Apply the shared meanings used by both browser and computer runtimes.

    FigureLoom Bio tables commonly contain identifiers beside numeric data.
    Group comparison therefore scans for numeric values and skips text columns
    instead of treating an ordinary sample-name column as an error.
    """
    if getattr(runner_class, "_language_consistency_installed", False):
        return

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        if instruction.action == "compare_groups":
            _compare_groups(self, *instruction.values)
            return
        if instruction.action == "calculate_standard_deviation":
            _standard_deviation(self, instruction.values[0])
            return
        original_run_instruction(self, instruction)

    runner_class._run_instruction = run_instruction
    runner_class._language_consistency_installed = True


def _numbers(rows: Iterable[dict[str, str]], column: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        raw = str(row.get(column, "")).strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError:
            continue
    return values


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
        left = _numbers(first_rows, column)
        right = _numbers(second_rows, column)
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
    runner.table = Table(columns, rows)
    runner.sequences = None
    runner.sequence_format = None
    runner.file_name = None
    runner.current_result_kind = "group comparison"
    runner.output.add_table(f"Compared {first} and {second}", columns, rows)


def _standard_deviation(runner: Any, requested: str) -> None:
    table = runner._need_table()
    column = runner._column(table, requested)
    values = _numbers(table.rows, column)
    if not values:
        raise FigureLoomBioError(f"There are no numeric values under {column}.")
    value = stdev(values) if len(values) > 1 else 0.0
    runner.output.add("Standard deviation", column, f"{value:.6g}")


__all__ = ["install_language_consistency"]
