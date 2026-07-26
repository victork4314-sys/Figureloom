from __future__ import annotations

import math
from pathlib import Path
import random
import re
from statistics import mean, median, stdev
from typing import Any

from .errors import FigureLoomBioError




# Runtime actions are selected by the shared semantic parser.
ACTIONS = {'bar_chart', 'box_plot', 'heat_map', 'histogram', 'pca_plot', 'permutation_p_value', 'scatter_plot', 'summary_statistic', 'volcano_plot'}

def install_analysis_language(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_analysis_language_installed", False):
        return


    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        action = instruction.action
        values = instruction.values
        if action not in ACTIONS:
            original_run_instruction(self, instruction)
            return

        table = self._need_table()
        if action == "summary_statistic":
            _summary_statistic(self, table, values[0], values[1])
        elif action == "permutation_p_value":
            _permutation_p_value(self, table, *values)
        elif action == "histogram":
            column, numbers = _numeric_values(table, values[0])
            _save_svg(
                self,
                "histogram.svg",
                f"Histogram of {column}",
                _histogram(numbers, f"Histogram of {column}"),
                f"Values plotted\n{len(numbers):,}",
            )
        elif action == "bar_chart":
            column = _column_name(table, values[0])
            categories = [str(row.get(column, "")) for row in table.rows]
            categories = [value for value in categories if value]
            if not categories:
                raise FigureLoomBioError(f"{column} contains no values.")
            _save_svg(
                self,
                "bar-chart.svg",
                f"Bar chart of {column}",
                _bar_chart(categories, f"Bar chart of {column}"),
                f"Categories plotted\n{len(set(categories)):,}",
            )
        elif action == "scatter_plot":
            x_column = _column_name(table, values[0])
            y_column = _column_name(table, values[1])
            pairs = [
                (_number(row.get(x_column)), _number(row.get(y_column)))
                for row in table.rows
            ]
            pairs = [pair for pair in pairs if pair[0] is not None and pair[1] is not None]
            if not pairs:
                raise FigureLoomBioError(
                    "The two columns do not contain matching numeric values."
                )
            x_values = [pair[0] for pair in pairs]
            y_values = [pair[1] for pair in pairs]
            _save_svg(
                self,
                "scatter-plot.svg",
                f"{x_column} and {y_column}",
                _scatter_plot(
                    x_values,
                    y_values,
                    f"{x_column} and {y_column}",
                    x_column,
                    y_column,
                ),
                f"Points plotted\n{len(pairs):,}",
            )
        elif action == "box_plot":
            column, numbers = _numeric_values(table, values[0])
            _save_svg(
                self,
                "box-plot.svg",
                f"Box plot of {column}",
                _box_plot(numbers, f"Box plot of {column}"),
                f"Values plotted\n{len(numbers):,}",
            )
        elif action == "heat_map":
            _save_svg(
                self,
                "heat-map.svg",
                "Heat map",
                _heat_map(table),
                f"Rows plotted\n{min(len(table.rows), 50):,}",
            )
        elif action == "pca_plot":
            svg, rows_used = _pca_plot(table)
            _save_svg(
                self,
                "pca-plot.svg",
                "PCA plot",
                svg,
                f"Rows plotted\n{rows_used:,}",
            )
        elif action == "volcano_plot":
            effect_column = _column_name(table, values[0])
            p_column = _column_name(table, values[1])
            pairs: list[tuple[float, float]] = []
            for row in table.rows:
                effect = _number(row.get(effect_column))
                p_value = _number(row.get(p_column))
                if effect is not None and p_value is not None and p_value > 0:
                    pairs.append((effect, -math.log10(p_value)))
            if not pairs:
                raise FigureLoomBioError(
                    "The effect and p-value columns do not contain plottable values."
                )
            _save_svg(
                self,
                "volcano-plot.svg",
                "Volcano plot",
                _scatter_plot(
                    [pair[0] for pair in pairs],
                    [pair[1] for pair in pairs],
                    "Volcano plot",
                    effect_column,
                    f"-log10({p_column})",
                ),
                f"Points plotted\n{len(pairs):,}",
            )

    runner_class._run_instruction = run_instruction
    runner_class._analysis_language_installed = True


def _summary_statistic(runner: Any, table: Any, operation: str, requested: str) -> None:
    column, numbers = _numeric_values(table, requested)
    operation = operation.casefold()
    average = mean(numbers)
    deviation = stdev(numbers) if len(numbers) > 1 else 0.0
    if operation == "average":
        runner.output.add(
            f"Average of {column}",
            f"{average:.6f}",
            "",
            "Values used",
            f"{len(numbers):,}",
        )
    elif operation == "median":
        runner.output.add(
            f"Median of {column}",
            f"{median(numbers):.6f}",
            "",
            "Values used",
            f"{len(numbers):,}",
        )
    elif operation == "standard deviation":
        runner.output.add(
            f"Standard deviation of {column}",
            f"{deviation:.6f}",
            "",
            "Sample standard deviation",
            "",
            "Values used",
            f"{len(numbers):,}",
        )
    else:
        margin = 1.96 * deviation / math.sqrt(len(numbers))
        runner.output.add(
            f"95% confidence interval of {column}",
            f"{average - margin:.6f} to {average + margin:.6f}",
            "",
            "Normal approximation around the mean",
            "",
            "Values used",
            f"{len(numbers):,}",
        )


def _permutation_p_value(
    runner: Any,
    table: Any,
    value_requested: str,
    left_name: str,
    right_name: str,
    group_requested: str,
) -> None:
    value_column = _column_name(table, value_requested)
    group_column = _column_name(table, group_requested)
    left = [
        value
        for row in table.rows
        if str(row.get(group_column, "")) == left_name
        if (value := _number(row.get(value_column))) is not None
    ]
    right = [
        value
        for row in table.rows
        if str(row.get(group_column, "")) == right_name
        if (value := _number(row.get(value_column))) is not None
    ]
    if not left or not right:
        raise FigureLoomBioError("Both named groups need numeric values.")
    p_value = _permutation_test(left, right)
    runner.output.add(
        f"P value for {value_column}",
        f"{p_value:.6g}",
        "",
        f"Permutation comparison: {left_name} versus {right_name}",
        "",
        f"{left_name} values",
        f"{len(left):,}",
        "",
        f"{right_name} values",
        f"{len(right):,}",
    )


def _permutation_test(left: list[float], right: list[float]) -> float:
    observed = abs(mean(left) - mean(right))
    combined = left + right
    left_size = len(left)
    extreme = 0
    total = 0
    if len(combined) <= 16:
        for mask in range(1 << len(combined)):
            if mask.bit_count() != left_size:
                continue
            first = [value for index, value in enumerate(combined) if mask & (1 << index)]
            second = [value for index, value in enumerate(combined) if not mask & (1 << index)]
            if abs(mean(first) - mean(second)) >= observed - 1e-12:
                extreme += 1
            total += 1
    else:
        randomizer = random.Random(173)
        for _ in range(5000):
            shuffled = list(combined)
            randomizer.shuffle(shuffled)
            if abs(mean(shuffled[:left_size]) - mean(shuffled[left_size:])) >= observed - 1e-12:
                extreme += 1
            total += 1
    return (extreme + 1) / (total + 1)


def _column_name(table: Any, requested: str) -> str:
    wanted = requested.strip().casefold()
    column = next((name for name in table.columns if name.casefold() == wanted), None)
    if column is None:
        raise FigureLoomBioError(f"I could not find the column {requested}.")
    return column


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _numeric_values(table: Any, requested: str) -> tuple[str, list[float]]:
    column = _column_name(table, requested)
    numbers = [number for row in table.rows if (number := _number(row.get(column))) is not None]
    if not numbers:
        raise FigureLoomBioError(f"{column} does not contain numeric values.")
    return column, numbers


def _save_svg(runner: Any, name: str, title: str, svg: str, description: str) -> None:
    path = runner._path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")
    runner.output.add(title, description, "", "Saved", str(Path(name)))


def _escape(value: Any) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _svg(title: str, body: str, width: int = 800, height: int = 500) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="{_escape(title)}">'
        '<rect width="100%" height="100%" fill="#f7fbfa"/>'
        f'<text x="40" y="38" font-family="system-ui,sans-serif" font-size="22" '
        f'font-weight="700" fill="#173f38">{_escape(title)}</text>{body}</svg>'
    )


def _scale(value: float, minimum: float, maximum: float, start: float, end: float) -> float:
    if maximum == minimum:
        return (start + end) / 2
    return start + ((value - minimum) / (maximum - minimum)) * (end - start)


def _histogram(numbers: list[float], title: str) -> str:
    minimum, maximum = min(numbers), max(numbers)
    bin_count = max(5, min(20, math.ceil(math.sqrt(len(numbers)))))
    counts = [0] * bin_count
    span = maximum - minimum or 1
    for value in numbers:
        index = min(bin_count - 1, int(((value - minimum) / span) * bin_count))
        counts[index] += 1
    highest = max(max(counts), 1)
    parts = ['<line x1="50" y1="440" x2="755" y2="440" stroke="#315b52"/>']
    for index, count in enumerate(counts):
        x = 55 + index * (690 / bin_count)
        width = max(2, (690 / bin_count) - 3)
        height = (count / highest) * 360
        label = minimum + (span * index / bin_count)
        parts.append(
            f'<rect x="{x:.2f}" y="{440-height:.2f}" width="{width:.2f}" '
            f'height="{height:.2f}" fill="#4f8f82"/>'
            f'<text x="{x+width/2:.2f}" y="462" text-anchor="middle" '
            f'font-family="system-ui,sans-serif" font-size="10" fill="#315b52">{label:.1f}</text>'
        )
    return _svg(title, "".join(parts))


def _bar_chart(values: list[str], title: str) -> str:
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    entries = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:30]
    highest = max((count for _, count in entries), default=1)
    width = 690 / max(len(entries), 1)
    parts = ['<line x1="50" y1="420" x2="755" y2="420" stroke="#315b52"/>']
    for index, (label, count) in enumerate(entries):
        x = 55 + index * width
        height = (count / highest) * 340
        parts.append(
            f'<rect x="{x:.2f}" y="{420-height:.2f}" width="{max(3,width-5):.2f}" '
            f'height="{height:.2f}" fill="#70a99d"/>'
            f'<text transform="translate({x+width/2:.2f} 432) rotate(45)" '
            f'font-family="system-ui,sans-serif" font-size="10" fill="#315b52">{_escape(label)}</text>'
        )
    return _svg(title, "".join(parts))


def _scatter_plot(
    x_values: list[float],
    y_values: list[float],
    title: str,
    x_label: str,
    y_label: str,
) -> str:
    xmin, xmax = min(x_values), max(x_values)
    ymin, ymax = min(y_values), max(y_values)
    points = "".join(
        f'<circle cx="{_scale(x,xmin,xmax,65,750):.2f}" '
        f'cy="{_scale(y,ymin,ymax,430,65):.2f}" r="4" '
        'fill="#397c70" fill-opacity="0.75"/>'
        for x, y in zip(x_values, y_values)
    )
    body = (
        '<line x1="60" y1="435" x2="755" y2="435" stroke="#315b52"/>'
        '<line x1="60" y1="435" x2="60" y2="60" stroke="#315b52"/>'
        f'{points}<text x="405" y="485" text-anchor="middle" '
        f'font-family="system-ui,sans-serif" font-size="14" fill="#315b52">{_escape(x_label)}</text>'
        f'<text transform="translate(18 250) rotate(-90)" text-anchor="middle" '
        f'font-family="system-ui,sans-serif" font-size="14" fill="#315b52">{_escape(y_label)}</text>'
    )
    return _svg(title, body)


def _quantile(numbers: list[float], fraction: float) -> float:
    values = sorted(numbers)
    position = (len(values) - 1) * fraction
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return values[lower]
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def _box_plot(numbers: list[float], title: str) -> str:
    minimum, maximum = min(numbers), max(numbers)
    q1, q2, q3 = (_quantile(numbers, value) for value in (0.25, 0.5, 0.75))
    x = lambda value: _scale(value, minimum, maximum, 100, 700)
    body = (
        f'<line x1="{x(minimum)}" y1="250" x2="{x(maximum)}" y2="250" stroke="#315b52" stroke-width="3"/>'
        f'<line x1="{x(minimum)}" y1="220" x2="{x(minimum)}" y2="280" stroke="#315b52"/>'
        f'<line x1="{x(maximum)}" y1="220" x2="{x(maximum)}" y2="280" stroke="#315b52"/>'
        f'<rect x="{x(q1)}" y="180" width="{max(1,x(q3)-x(q1))}" height="140" fill="#9bc9bf" stroke="#315b52"/>'
        f'<line x1="{x(q2)}" y1="180" x2="{x(q2)}" y2="320" stroke="#173f38" stroke-width="4"/>'
        f'<text x="100" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Min {minimum:.2f}</text>'
        f'<text x="350" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Median {q2:.2f}</text>'
        f'<text x="620" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Max {maximum:.2f}</text>'
    )
    return _svg(title, body)


def _heat_map(table: Any) -> str:
    columns = [
        column
        for column in table.columns
        if any(_number(row.get(column)) is not None for row in table.rows)
    ][:30]
    if not columns:
        raise FigureLoomBioError(
            "The file does not contain numeric columns for a heat map."
        )
    rows = table.rows[:50]
    matrix = [[_number(row.get(column)) for column in columns] for row in rows]
    finite = [value for row in matrix for value in row if value is not None]
    minimum, maximum = min(finite), max(finite)
    cell_width = min(24, 680 / len(columns))
    cell_height = min(18, 380 / max(len(rows), 1))
    parts = [
        f'<text transform="translate({96+index*cell_width} 55) rotate(-45)" '
        f'font-family="system-ui,sans-serif" font-size="9" fill="#315b52">{_escape(column)}</text>'
        for index, column in enumerate(columns)
    ]
    for row_index, row in enumerate(matrix):
        for column_index, value in enumerate(row):
            ratio = ((value - minimum) / (maximum - minimum or 1)) if value is not None else 0
            lightness = 92 - ratio * 55
            parts.append(
                f'<rect x="{90+column_index*cell_width}" y="{65+row_index*cell_height}" '
                f'width="{cell_width}" height="{cell_height}" fill="hsl(170 35% {lightness}%)"/>'
            )
    return _svg("Heat map", "".join(parts))


def _power_iteration(matrix: list[list[float]], iterations: int = 80) -> tuple[list[float], float]:
    size = len(matrix)
    vector = [1 / math.sqrt(max(size, 1))] * size
    for _ in range(iterations):
        next_vector = [sum(value * vector[index] for index, value in enumerate(row)) for row in matrix]
        length = math.sqrt(sum(value * value for value in next_vector)) or 1
        vector = [value / length for value in next_vector]
    eigenvalue = sum(
        vector[row] * sum(cell * vector[column] for column, cell in enumerate(matrix[row]))
        for row in range(size)
    )
    return vector, eigenvalue


def _pca_plot(table: Any) -> tuple[str, int]:
    columns = [
        column
        for column in table.columns
        if any(_number(row.get(column)) is not None for row in table.rows)
    ]
    if len(columns) < 2:
        raise FigureLoomBioError(
            "The file needs at least two numeric columns for PCA."
        )
    rows = [
        [number for column in columns if (number := _number(row.get(column))) is not None]
        for row in table.rows
    ]
    rows = [row for row in rows if len(row) == len(columns)]
    if len(rows) < 2:
        raise FigureLoomBioError(
            "The file needs at least two complete numeric rows for PCA."
        )
    means = [mean(row[index] for row in rows) for index in range(len(columns))]
    centered = [[value - means[index] for index, value in enumerate(row)] for row in rows]
    covariance = [
        [
            sum(row[i] * row[j] for row in centered) / max(1, len(centered) - 1)
            for j in range(len(columns))
        ]
        for i in range(len(columns))
    ]
    first_vector, first_value = _power_iteration(covariance)
    deflated = [
        [
            covariance[i][j] - first_value * first_vector[i] * first_vector[j]
            for j in range(len(columns))
        ]
        for i in range(len(columns))
    ]
    second_vector, _ = _power_iteration(deflated)
    x_values = [sum(value * first_vector[index] for index, value in enumerate(row)) for row in centered]
    y_values = [sum(value * second_vector[index] for index, value in enumerate(row)) for row in centered]
    return (
        _scatter_plot(
            x_values,
            y_values,
            "PCA plot",
            "Principal component 1",
            "Principal component 2",
        ),
        len(rows),
    )


__all__ = ["PATTERNS", "install_analysis_language"]
