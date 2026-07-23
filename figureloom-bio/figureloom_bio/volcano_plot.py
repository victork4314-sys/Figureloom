from __future__ import annotations

from html import escape
import math
import re
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError


VOLCANO_WORDING = re.compile(
    r"(?:create|make|draw) a (?:volcano|vulcano) (?:plot|chart) (?:using|from|of) (.+?) and (.+)",
    re.IGNORECASE,
)
EFFECT_THRESHOLD = 1.0
P_THRESHOLD = 0.05


def install_volcano_plot(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_complete_volcano_plot_installed", False):
        return
    if not any(action == "volcano_plot_complete" for action, _pattern in parser_module._PATTERNS):
        parser_module._PATTERNS = (("volcano_plot_complete", VOLCANO_WORDING),) + parser_module._PATTERNS

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        if instruction.action not in {"volcano_plot", "volcano_plot_complete"}:
            original_run_instruction(self, instruction)
            return
        _create_volcano_plot(self, instruction.values[0], instruction.values[1])

    runner_class._run_instruction = run_instruction
    runner_class._complete_volcano_plot_installed = True


def _column(table: Any, requested: str) -> str:
    wanted = requested.strip().casefold()
    found = next((name for name in table.columns if name.casefold() == wanted), None)
    if found is not None:
        return found
    available = ", ".join(table.columns[:20]) or "none"
    raise FigureLoomBioError(
        f"I could not find the column {requested}.\n\nColumns in the open table: {available}"
    )


def _number(value: Any) -> float | None:
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _label_column(table: Any, effect_column: str, p_column: str) -> str | None:
    for wanted in ("gene", "gene_name", "feature", "name", "id", "symbol", "sample"):
        found = next((name for name in table.columns if name.casefold() == wanted), None)
        if found and found not in {effect_column, p_column}:
            return found
    return next((name for name in table.columns if name not in {effect_column, p_column}), None)


def _create_volcano_plot(runner: Any, effect_requested: str, p_requested: str) -> None:
    table = runner._need_table()
    effect_column = _column(table, effect_requested)
    p_column = _column(table, p_requested)
    label_column = _label_column(table, effect_column, p_column)

    raw: list[tuple[float, float, str]] = []
    positive_p_values: list[float] = []
    invalid_effect = 0
    invalid_p = 0
    for row_number, row in enumerate(table.rows, start=1):
        effect = _number(row.get(effect_column))
        p_value = _number(row.get(p_column))
        if effect is None:
            invalid_effect += 1
            continue
        if p_value is None or p_value < 0 or p_value > 1:
            invalid_p += 1
            continue
        if p_value > 0:
            positive_p_values.append(p_value)
        label = str(row.get(label_column, "")).strip() if label_column else f"Row {row_number}"
        raw.append((effect, p_value, label or f"Row {row_number}"))

    if not raw:
        raise FigureLoomBioError(
            "The volcano plot has no usable rows.\n\n"
            f"{effect_column} must contain effect sizes such as log2 fold change.\n"
            f"{p_column} must contain p values between 0 and 1."
        )

    smallest_positive = min(positive_p_values) if positive_p_values else 1e-6
    zero_floor = max(1e-300, smallest_positive / 10.0)
    points: list[dict[str, Any]] = []
    for effect, p_value, label in raw:
        plotted_p = p_value if p_value > 0 else zero_floor
        score = -math.log10(plotted_p)
        significant = plotted_p <= P_THRESHOLD and abs(effect) >= EFFECT_THRESHOLD
        direction = "higher" if significant and effect > 0 else "lower" if significant else "not-significant"
        points.append({"effect": effect, "p": p_value, "score": score, "label": label, "direction": direction})

    name = "volcano-plot.svg"
    path = runner._path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_volcano_svg(points, effect_column, p_column), encoding="utf-8")
    if hasattr(runner, "current_generated_file"):
        runner.current_generated_file = name

    higher = sum(point["direction"] == "higher" for point in points)
    lower = sum(point["direction"] == "lower" for point in points)
    neutral = len(points) - higher - lower
    lines = [
        "Points plotted", f"{len(points):,}", "",
        "Significantly higher", f"{higher:,}", "",
        "Significantly lower", f"{lower:,}", "",
        "Not significant", f"{neutral:,}", "",
        "Thresholds", f"Absolute effect at least {EFFECT_THRESHOLD:g}; p value at most {P_THRESHOLD:g}", "",
        "Saved", name,
    ]
    if invalid_effect or invalid_p:
        lines.extend([
            "", "Rows skipped", f"{invalid_effect + invalid_p:,}", "",
            "Why rows were skipped",
            f"Missing or non-numeric effect: {invalid_effect:,}; invalid p value: {invalid_p:,}",
        ])
    runner.output.add("Volcano plot", *lines)


def _volcano_svg(points: list[dict[str, Any]], effect_label: str, p_label: str) -> str:
    width, height = 920, 620
    left, right, top, bottom = 86, 30, 72, 76
    plot_width, plot_height = width - left - right, height - top - bottom
    effects = [float(point["effect"]) for point in points]
    scores = [float(point["score"]) for point in points]
    effect_extent = max(EFFECT_THRESHOLD * 1.35, max(abs(value) for value in effects) * 1.08)
    max_score = max(-math.log10(P_THRESHOLD) * 1.35, max(scores) * 1.08)

    def x(value: float) -> float:
        return left + ((value + effect_extent) / (effect_extent * 2)) * plot_width

    def y(value: float) -> float:
        return top + plot_height - (value / max_score) * plot_height

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Volcano plot">',
        '<rect width="100%" height="100%" fill="#fbfdfc"/>',
        '<text x="38" y="38" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#173f38">Volcano plot</text>',
        f'<text x="38" y="58" font-family="system-ui,sans-serif" font-size="12" fill="#60706c">{escape(effect_label)} against -log10({escape(p_label)})</text>',
        f'<rect x="{left}" y="{top}" width="{plot_width}" height="{plot_height}" fill="#ffffff" stroke="#cddbd7"/>',
    ]
    for index in range(6):
        effect_tick = -effect_extent + (effect_extent * 2) * index / 5
        px = x(effect_tick)
        parts.append(f'<line x1="{px:.2f}" y1="{top}" x2="{px:.2f}" y2="{top + plot_height}" stroke="#edf3f1"/>')
        parts.append(f'<text x="{px:.2f}" y="{top + plot_height + 24}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#60706c">{effect_tick:.2g}</text>')
    for index in range(6):
        score_tick = max_score * index / 5
        py = y(score_tick)
        parts.append(f'<line x1="{left}" y1="{py:.2f}" x2="{left + plot_width}" y2="{py:.2f}" stroke="#edf3f1"/>')
        parts.append(f'<text x="{left - 12}" y="{py + 4:.2f}" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="#60706c">{score_tick:.2g}</text>')

    threshold_y = y(-math.log10(P_THRESHOLD))
    for threshold_x in (-EFFECT_THRESHOLD, EFFECT_THRESHOLD):
        px = x(threshold_x)
        parts.append(f'<line x1="{px:.2f}" y1="{top}" x2="{px:.2f}" y2="{top + plot_height}" stroke="#8a641d" stroke-width="1.5" stroke-dasharray="7 5"/>')
    parts.append(f'<line x1="{left}" y1="{threshold_y:.2f}" x2="{left + plot_width}" y2="{threshold_y:.2f}" stroke="#8a641d" stroke-width="1.5" stroke-dasharray="7 5"/>')

    colors = {"higher": "#b34848", "lower": "#286f9b", "not-significant": "#9aa9a5"}
    for point in sorted(points, key=lambda item: item["direction"] != "not-significant"):
        color = colors[str(point["direction"])]
        parts.append(
            f'<circle cx="{x(float(point["effect"])):.2f}" cy="{y(float(point["score"])):.2f}" r="4.2" '
            f'fill="{color}" fill-opacity="0.78" data-significance="{point["direction"]}">'
            f'<title>{escape(str(point["label"]))}: effect {float(point["effect"]):.4g}, p {float(point["p"]):.4g}</title></circle>'
        )
    labelled = sorted(
        (point for point in points if point["direction"] != "not-significant"),
        key=lambda item: (float(item["score"]), abs(float(item["effect"]))),
        reverse=True,
    )[:8]
    for point in labelled:
        px, py = x(float(point["effect"])), y(float(point["score"]))
        anchor = "start" if float(point["effect"]) >= 0 else "end"
        dx = 7 if anchor == "start" else -7
        parts.append(f'<text x="{px + dx:.2f}" y="{max(top + 12, py - 6):.2f}" text-anchor="{anchor}" font-family="system-ui,sans-serif" font-size="10" fill="#35413e">{escape(str(point["label"])[:28])}</text>')
    parts.extend([
        f'<text x="{left + plot_width / 2:.2f}" y="{height - 24}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#35413e">{escape(effect_label)}</text>',
        f'<text x="20" y="{top + plot_height / 2:.2f}" transform="rotate(-90 20 {top + plot_height / 2:.2f})" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#35413e">-log10({escape(p_label)})</text>',
        '<circle cx="650" cy="38" r="5" fill="#b34848"/><text x="662" y="42" font-family="system-ui,sans-serif" font-size="11" fill="#35413e">Higher</text>',
        '<circle cx="728" cy="38" r="5" fill="#286f9b"/><text x="740" y="42" font-family="system-ui,sans-serif" font-size="11" fill="#35413e">Lower</text>',
        '<circle cx="802" cy="38" r="5" fill="#9aa9a5"/><text x="814" y="42" font-family="system-ui,sans-serif" font-size="11" fill="#35413e">Not significant</text>',
        '</svg>',
    ])
    return "".join(parts)


def volcano_self_test() -> dict[str, bool]:
    sample = [
        {"effect": 2.1, "p": 0.001, "score": 3.0, "label": "gene-up", "direction": "higher"},
        {"effect": -2.4, "p": 0.002, "score": 2.699, "label": "gene-down", "direction": "lower"},
        {"effect": 0.2, "p": 0.8, "score": 0.0969, "label": "gene-flat", "direction": "not-significant"},
    ]
    svg = _volcano_svg(sample, "fold_change", "p_value")
    required = ('data-significance="higher"', 'data-significance="lower"', "stroke-dasharray", "gene-up")
    missing = [value for value in required if value not in svg]
    if missing:
        raise RuntimeError("Volcano SVG is incomplete: " + ", ".join(missing))
    return {"real_volcano_svg": True, "thresholds": True, "labels": True}


__all__ = ["install_volcano_plot", "volcano_self_test"]
