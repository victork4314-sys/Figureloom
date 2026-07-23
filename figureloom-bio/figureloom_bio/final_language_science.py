from __future__ import annotations

from difflib import SequenceMatcher
from html import escape
import math
import re
import sys
from pathlib import Path
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError
from .language_aliases import RULES, normalize_source
from .language_manifest import language_manifest


EFFECT_THRESHOLD = 1.0
P_THRESHOLD = 0.05
_SPACE = re.compile(r"\s+")
_UNAMBIGUOUS_FIXES = (
    (re.compile(r"\bvulcano\b", re.IGNORECASE), "volcano"),
    (re.compile(r"\bp[‐‑‒–—-]value\b", re.IGNORECASE), "p value"),
)


def _clean(value: str) -> str:
    text = value.strip().rstrip(".:").casefold()
    text = text.replace("_", " ").replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
    return _SPACE.sub(" ", text)


def _known_sentences() -> tuple[str, ...]:
    values: list[str] = [command.example for command in language_manifest().commands]
    for rule in RULES:
        values.extend(str(example) for example in rule.get("examples", ()))
    unique: dict[str, str] = {}
    for sentence in values:
        unique.setdefault(_clean(sentence), sentence)
    return tuple(unique.values())


def _is_unknown(error: FigureLoomBioError) -> bool:
    lower = error.message.casefold()
    return any(
        phrase in lower
        for phrase in (
            "i do not understand this instruction yet",
            "i could not match this instruction",
            "i recognize the command word",
        )
    )


def _normalized_source(source: str) -> str:
    text = str(source)
    for pattern, replacement in _UNAMBIGUOUS_FIXES:
        text = pattern.sub(replacement, text)
    return normalize_source(text)


def _line_text(source: str, line_number: int | None) -> str:
    lines = str(source).splitlines()
    if line_number and 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()
    return next((line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")), "")


def _closest(sentence: str, limit: int = 3) -> list[str]:
    wanted = _clean(sentence)
    ranked = sorted(
        ((SequenceMatcher(None, wanted, _clean(candidate)).ratio(), candidate) for candidate in _known_sentences()),
        key=lambda item: item[0],
        reverse=True,
    )
    return [candidate for score, candidate in ranked[:limit] if score >= 0.48]


def _diagnostic_error(source: str, error: FigureLoomBioError) -> FigureLoomBioError:
    sentence = _line_text(source, error.line_number)
    exact = next((candidate for candidate in _known_sentences() if _clean(candidate) == _clean(sentence)), None)
    if exact:
        message = (
            "FigureLoom Bio knows this sentence, but its language handler did not load.\n\n"
            "What happened\n"
            "The instruction is present in the built-in sentence list, so your wording is not the problem.\n\n"
            "How to fix it\n"
            "Save the program, close FigureLoom Bio, and open it again. If the same line still fails, open the updater and press Repair. Repair keeps the saved workspace.\n\n"
            f"Instruction\n{sentence or exact}"
        )
        return FigureLoomBioError(message, line_number=error.line_number)

    closest = _closest(sentence)
    if closest:
        suggestions = "\n".join(f"• {candidate}" for candidate in closest)
        fix = (
            "Use one of the closest built-in forms below. Change only its filename, column name, value, or number:\n"
            f"{suggestions}"
        )
    else:
        fix = (
            "Open Sentences and search for the action you need. Insert a sentence from that list, then change only its filename, column name, value, or number."
        )
    return FigureLoomBioError(
        "FigureLoom Bio could not match this instruction.\n\n"
        "What happened\n"
        "The line looks like an instruction, but its complete structure does not match a built-in sentence. FigureLoom Bio stopped instead of guessing and running the wrong analysis.\n\n"
        "How to fix it\n"
        f"{fix}\n\n"
        f"Instruction read\n{sentence or '(empty line)'}",
        line_number=error.line_number,
    )


def _install_parser_retry() -> None:
    if getattr(parser_module, "_final_known_wording_retry", False):
        return
    original_parse = parser_module.parse

    def parse_with_retry(source: str):
        try:
            return original_parse(source)
        except FigureLoomBioError as error:
            if not _is_unknown(error):
                raise
            try:
                normalized = _normalized_source(source)
            except Exception:
                normalized = source
            if normalized != source:
                try:
                    return original_parse(normalized)
                except FigureLoomBioError as normalized_error:
                    if not _is_unknown(normalized_error):
                        raise
            raise _diagnostic_error(source, error) from error

    parser_module.parse = parse_with_retry
    for name, module in tuple(sys.modules.items()):
        if name.startswith("figureloom_bio") and module is not None and getattr(module, "parse", None) is original_parse:
            setattr(module, "parse", parse_with_retry)
    parser_module._final_known_wording_retry = True


def _install_plain_errors() -> None:
    if getattr(FigureLoomBioError, "_final_plain_explanations", False):
        return
    original = FigureLoomBioError.plain_message

    def plain_message(error: FigureLoomBioError) -> str:
        text = original(error)
        if "What happened" in text and "How to fix it" in text:
            return text
        if "What happened" in text and "What to do" in text:
            return text.replace("\nWhat to do\n", "\nHow to fix it\n").replace("\nDetails\n", "\nTechnical detail\n")
        lower = error.message.casefold()
        if "column" in lower and ("not found" in lower or "could not find" in lower):
            happened = "The named column is not present in the table that is open at this line."
            fix = "Open the table and check its first row. Use the column name exactly as it appears there, including spaces."
        elif "numeric" in lower:
            happened = "The required column is empty or contains text where this step needs numbers."
            fix = "Use ordinary numbers such as 2, 3.5, or 0.01 in that column, without units or words."
        elif "installed tool" in lower:
            happened = "FigureLoom Bio understood the instruction, but the separate command-line tool is missing or tool access is turned off."
            fix = "Install the named tool and enable Allow installed tools, then run the program again."
        elif "file" in lower and any(word in lower for word in ("missing", "not found", "could not open")):
            happened = "The required file is not available in the current workspace or folder."
            fix = "Add the file in the Files panel and use its exact filename, including the extension."
        else:
            happened = "FigureLoom Bio reached a step it could not complete safely. It stopped instead of guessing or presenting an unreliable result."
            fix = "Read the original message above, correct that instruction or its input data, and run the program again."
        prefix = f"Line {error.line_number}\n\n" if error.line_number is not None else ""
        body = error.message
        return f"{prefix}{body}\n\nWhat happened\n{happened}\n\nHow to fix it\n{fix}"

    FigureLoomBioError.plain_message = plain_message
    FigureLoomBioError._final_plain_explanations = True


def _number(value: Any) -> float | None:
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _find_column(table: Any, requested: str) -> str:
    found = next((name for name in table.columns if name.casefold() == requested.strip().casefold()), None)
    if found is None:
        raise FigureLoomBioError(
            f"I could not find the column {requested}.\n\nColumns in the open table: {', '.join(table.columns[:20]) or 'none'}"
        )
    return found


def _label_column(table: Any, effect_column: str, p_column: str) -> str | None:
    for wanted in ("gene", "gene_name", "symbol", "feature", "name", "id"):
        found = next((name for name in table.columns if name.casefold() == wanted), None)
        if found and found not in {effect_column, p_column}:
            return found
    return next((name for name in table.columns if name not in {effect_column, p_column}), None)


def _volcano_svg(points: list[dict[str, Any]], effect_label: str, p_label: str) -> str:
    width, height = 920, 620
    left, right, top, bottom = 86, 30, 72, 76
    plot_width, plot_height = width - left - right, height - top - bottom
    effect_extent = max(EFFECT_THRESHOLD * 1.35, max(abs(float(point["effect"])) for point in points) * 1.08)
    max_score = max(-math.log10(P_THRESHOLD) * 1.35, max(float(point["score"]) for point in points) * 1.08)

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
        tick = -effect_extent + effect_extent * 2 * index / 5
        px = x(tick)
        parts.append(f'<line x1="{px:.2f}" y1="{top}" x2="{px:.2f}" y2="{top + plot_height}" stroke="#edf3f1"/>')
    for index in range(6):
        tick = max_score * index / 5
        py = y(tick)
        parts.append(f'<line x1="{left}" y1="{py:.2f}" x2="{left + plot_width}" y2="{py:.2f}" stroke="#edf3f1"/>')
    for cutoff in (-EFFECT_THRESHOLD, EFFECT_THRESHOLD):
        px = x(cutoff)
        parts.append(f'<line x1="{px:.2f}" y1="{top}" x2="{px:.2f}" y2="{top + plot_height}" stroke="#8a641d" stroke-width="1.5" stroke-dasharray="7 5"/>')
    cutoff_y = y(-math.log10(P_THRESHOLD))
    parts.append(f'<line x1="{left}" y1="{cutoff_y:.2f}" x2="{left + plot_width}" y2="{cutoff_y:.2f}" stroke="#8a641d" stroke-width="1.5" stroke-dasharray="7 5"/>')
    colors = {"higher": "#b34848", "lower": "#286f9b", "not-significant": "#9aa9a5"}
    for point in sorted(points, key=lambda item: item["direction"] != "not-significant"):
        direction = str(point["direction"])
        parts.append(
            f'<circle cx="{x(float(point["effect"])):.2f}" cy="{y(float(point["score"])):.2f}" r="4.2" fill="{colors[direction]}" fill-opacity="0.78" data-significance="{direction}">'
            f'<title>{escape(str(point["label"]))}: effect {float(point["effect"]):.4g}, p {float(point["p"]):.4g}</title></circle>'
        )
    parts.extend([
        f'<text x="{left + plot_width / 2:.2f}" y="{height - 24}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#35413e">{escape(effect_label)}</text>',
        f'<text x="20" y="{top + plot_height / 2:.2f}" transform="rotate(-90 20 {top + plot_height / 2:.2f})" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#35413e">-log10({escape(p_label)})</text>',
        '</svg>',
    ])
    return "".join(parts)


def _create_volcano(runner: Any, effect_requested: str, p_requested: str) -> None:
    table = runner._need_table()
    effect_column, p_column = _find_column(table, effect_requested), _find_column(table, p_requested)
    label_column = _label_column(table, effect_column, p_column)
    raw: list[tuple[float, float, str]] = []
    positives: list[float] = []
    for index, row in enumerate(table.rows, start=1):
        effect, p_value = _number(row.get(effect_column)), _number(row.get(p_column))
        if effect is None or p_value is None or p_value < 0 or p_value > 1:
            continue
        if p_value > 0:
            positives.append(p_value)
        label = str(row.get(label_column, "")).strip() if label_column else f"Row {index}"
        raw.append((effect, p_value, label or f"Row {index}"))
    if not raw:
        raise FigureLoomBioError(
            f"The volcano plot has no usable rows. {effect_column} needs numeric effect sizes and {p_column} needs p values between 0 and 1."
        )
    zero_floor = max(1e-300, (min(positives) if positives else 1e-6) / 10)
    points: list[dict[str, Any]] = []
    for effect, p_value, label in raw:
        plotted_p = p_value if p_value > 0 else zero_floor
        significant = plotted_p <= P_THRESHOLD and abs(effect) >= EFFECT_THRESHOLD
        direction = "higher" if significant and effect > 0 else "lower" if significant else "not-significant"
        points.append({"effect": effect, "p": p_value, "score": -math.log10(plotted_p), "label": label, "direction": direction})
    name = "volcano-plot.svg"
    runner._path(name).write_text(_volcano_svg(points, effect_column, p_column), encoding="utf-8")
    runner.current_generated_file = name
    higher = sum(point["direction"] == "higher" for point in points)
    lower = sum(point["direction"] == "lower" for point in points)
    runner.output.add(
        "Volcano plot",
        "Points plotted", f"{len(points):,}", "",
        "Significantly higher", f"{higher:,}", "",
        "Significantly lower", f"{lower:,}", "",
        "Not significant", f"{len(points) - higher - lower:,}", "",
        "Thresholds", f"Absolute effect at least {EFFECT_THRESHOLD:g}; p value at most {P_THRESHOLD:g}", "",
        "Saved", name,
    )


def _install_volcano(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_final_volcano_plot", False):
        return
    original = runner_class._run_instruction

    def run_instruction(runner: Any, instruction: Any) -> None:
        if instruction.action == "volcano_plot":
            _create_volcano(runner, instruction.values[0], instruction.values[1])
            return
        original(runner, instruction)

    runner_class._run_instruction = run_instruction
    runner_class._final_volcano_plot = True


def _install_quick_test_check() -> None:
    from . import desktop_tools

    if getattr(desktop_tools, "_final_volcano_check", False):
        return
    original = desktop_tools.run_quick_test

    def run_quick_test(destination: Path | None = None):
        success, report, folder = original(destination)
        if not success:
            return success, report, folder
        text = (folder / "quick-volcano.svg").read_text(encoding="utf-8", errors="replace")
        required = ('data-significance="higher"', 'data-significance="lower"', "stroke-dasharray")
        missing = [marker for marker in required if marker not in text]
        if missing:
            failure = FigureLoomBioError("The volcano plot is missing significance groups or threshold lines: " + ", ".join(missing))
            report = "FIGURELOOM BIO QUICK TEST FAILED\n\n" + failure.plain_message() + "\n"
            (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
            return False, report, folder
        report = report.replace(
            "It created real histogram and volcano plot SVG figures.",
            "It created a real histogram and a thresholded volcano plot with higher and lower significance groups.",
        )
        (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
        return True, report, folder

    desktop_tools.run_quick_test = run_quick_test
    desktop_tools._final_volcano_check = True


def install_final_language_science(runner_class: type[Any]) -> None:
    _install_plain_errors()
    _install_volcano(runner_class)
    _install_parser_retry()
    _install_quick_test_check()


__all__ = ["install_final_language_science"]
