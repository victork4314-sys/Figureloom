from __future__ import annotations

from html import escape
from importlib.resources import files
import json
import math
from pathlib import Path
import re
import shutil
from statistics import fmean, median, pstdev
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError
from .parser import Instruction
from .runtime import Table


_ALIAS_PREFIX = "language_alias__"
_NEW_ACTIONS = {"read_statistic", "grouped_box_plot", "heat_map_columns"}
_FIGURE_FILES = {
    "create_histogram": "histogram.svg",
    "create_bar_chart": "bar-chart.svg",
    "create_scatter_plot": "scatter-plot.svg",
    "create_box_plot": "box-plot.svg",
    "histogram": "histogram.svg",
    "bar_chart": "bar-chart.svg",
    "scatter_plot": "scatter-plot.svg",
    "box_plot": "box-plot.svg",
    "heat_map": "heat-map.svg",
    "pca_plot": "pca-plot.svg",
    "volcano_plot": "volcano-plot.svg",
    "grouped_box_plot": "box-plot.svg",
    "heat_map_columns": "heat-map.svg",
}
_CLEAR_GENERATED = {
    "open_file", "open_pair", "keep_rows", "remove_rows", "keep_columns",
    "rename_column", "order_rows", "largest_first", "smallest_first",
    "remove_duplicates", "replace_empty", "combine_file", "change_value",
    "keep_strict_length", "keep_min_length", "remove_shorter",
    "keep_min_quality", "remove_low_quality", "remove_low_quality_default",
    "remove_adapters", "cut_start", "cut_end", "trim_start", "trim_end",
    "keep_motif", "remove_motif", "use_sequence", "remove_named_sequence",
    "rename_sequence", "prefix_sequence_names", "suffix_sequence_names",
    "remove_duplicate_sequences", "keep_base_range", "to_rna", "to_dna",
    "reverse_complement", "translate", "remove_sequence_gaps",
    "keep_sequence_names_containing", "remove_sequence_names_containing",
    "make_sequence_names_unique", "remove_ambiguous_sequences",
    "keep_max_ambiguous", "split_sequences", "join_sequences",
    "find_repeated_sequences", "find_palindromes", "find_start_codons",
    "find_stop_codons", "find_open_reading_frames", "find_variants",
    "find_genes", "find_signal_peptides", "find_transmembrane_regions",
    "find_pcr_primers", "build_phylogenetic_tree", "normalize_counts",
    "compare_groups", "summary_statistic", "permutation_p_value",
}


def _load_rules() -> tuple[dict[str, Any], ...]:
    path = files("figureloom_bio").joinpath("language_aliases.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    rules = tuple(payload.get("rules", ()))
    if not rules:
        raise RuntimeError("The FigureLoom Bio language alias catalog is empty.")
    return rules


RULES = _load_rules()
RULES_BY_ID = {str(rule["id"]): rule for rule in RULES}


def _alias_action(rule_id: str) -> str:
    return f"{_ALIAS_PREFIX}{rule_id}"


def _install_patterns() -> None:
    existing_actions = {action for action, _ in parser_module._PATTERNS}
    additions: list[tuple[str, re.Pattern[str]]] = []
    # Longer patterns go first so two-column forms beat one-column forms.
    for rule in sorted(RULES, key=lambda item: len(str(item["pattern"])), reverse=True):
        action = _alias_action(str(rule["id"]))
        if action in existing_actions:
            continue
        additions.append((action, re.compile(str(rule["pattern"]), re.IGNORECASE)))
    parser_module._PATTERNS = parser_module._PATTERNS + tuple(additions)


def _canonical(rule: dict[str, Any], values: tuple[str, ...]) -> str:
    text = str(rule["canonical"])
    for index, value in enumerate(values, start=1):
        text = text.replace(f"${index}", value)
    if str(rule["id"]) == "average_column":
        text = re.sub(r"\bmean\b", "average", text, count=1, flags=re.IGNORECASE)
    return text


def normalize_sentence(sentence: str) -> str:
    text = str(sentence).strip()
    ending = text[-1:] if text.endswith((".", ":")) else ""
    core = text[:-1].strip() if ending else text
    for rule in sorted(RULES, key=lambda item: len(str(item["pattern"])), reverse=True):
        match = re.fullmatch(str(rule["pattern"]), core, re.IGNORECASE)
        if not match:
            continue
        if str(rule["action"]) in _NEW_ACTIONS or str(rule["action"]) == "show_warning":
            return text
        return _canonical(rule, tuple(value.strip() for value in match.groups()))
    return text


def normalize_source(source: str) -> str:
    output: list[str] = []
    for raw in str(source).splitlines():
        indent = raw[: len(raw) - len(raw.lstrip(" \t"))]
        text = raw.strip()
        if not text or text.startswith("#") or text.endswith(":"):
            output.append(raw)
            continue
        output.append(indent + normalize_sentence(text))
    return "\n".join(output)


def install_language_aliases(runner_class: type[Any]) -> None:
    _install_patterns()
    if getattr(runner_class, "_language_aliases_installed", False):
        return

    original_init = runner_class.__init__
    original_run = runner_class.run
    original_run_instruction = runner_class._run_instruction
    original_show_current = runner_class._show_current
    original_save_current = runner_class._save_current

    def alias_init(self: Any, *args: Any, **kwargs: Any) -> None:
        original_init(self, *args, **kwargs)
        self.current_generated_file = None

    def alias_run(self: Any, instructions: list[Any]) -> Any:
        self.current_generated_file = None
        return original_run(self, instructions)

    def alias_show_current(self: Any) -> None:
        generated = getattr(self, "current_generated_file", None)
        if generated:
            path = self._path(generated)
            if path.exists():
                self.output.add(
                    "The file",
                    generated,
                    "",
                    "Type",
                    path.suffix.lstrip(".").upper() or "file",
                    "",
                    "Size",
                    f"{path.stat().st_size:,} bytes",
                )
                return
        original_show_current(self)

    def alias_save_current(self: Any, requested: str) -> None:
        generated = getattr(self, "current_generated_file", None)
        if generated:
            source = self._path(generated)
            if source.exists():
                output_name = self._numbered_output_name(requested)
                target = self._path(output_name)
                if target.suffix.casefold() != source.suffix.casefold():
                    raise FigureLoomBioError(
                        f"I cannot save {generated} as {requested}.\n\n"
                        f"Use a {source.suffix or 'matching'} filename."
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                if source.resolve() != target.resolve():
                    shutil.copyfile(source, target)
                self.current_generated_file = output_name
                self.output.add("Saved the file", output_name)
                return
        original_save_current(self, requested)

    def alias_run_instruction(self: Any, instruction: Instruction) -> None:
        action = instruction.action
        if action.startswith(_ALIAS_PREFIX):
            rule_id = action[len(_ALIAS_PREFIX):]
            rule = RULES_BY_ID[rule_id]
            target_action = str(rule["action"])
            if target_action == "read_statistic":
                _read_statistic(self, rule_id, instruction.values)
                return
            if target_action == "grouped_box_plot":
                _grouped_box_plot(self, *instruction.values)
                self.current_generated_file = "box-plot.svg"
                return
            if target_action == "heat_map_columns":
                _heat_map_columns(self, instruction.values[0])
                self.current_generated_file = "heat-map.svg"
                return
            if target_action == "show_warning":
                message = instruction.values[0] if instruction.values else "This sample needs attention."
                self.output.add("Warning", message)
                return
            canonical = _canonical(rule, instruction.values)
            parsed = parser_module.parse(canonical)
            if len(parsed) != 1:
                raise FigureLoomBioError(f"The alias {rule_id} did not resolve to one instruction.")
            resolved = parsed[0]
            self._run_instruction(Instruction(resolved.action, instruction.line_number, resolved.values))
            return

        if action in _CLEAR_GENERATED:
            self.current_generated_file = None
        original_run_instruction(self, instruction)
        generated = _FIGURE_FILES.get(action)
        if generated and self._path(generated).exists():
            self.current_generated_file = generated

    runner_class.__init__ = alias_init
    runner_class.run = alias_run
    runner_class._run_instruction = alias_run_instruction
    runner_class._show_current = alias_show_current
    runner_class._save_current = alias_save_current
    runner_class._language_aliases_installed = True

    # Translators receive canonical sentences, so aliases never become unknown
    # actions or placeholder target code.
    from . import translators as translator_module

    if not getattr(translator_module, "_language_alias_translation_installed", False):
        original_translate = translator_module.translate_source

        def translate_source(
            source: str,
            target: str,
            *,
            program_name: str = "program.flbio",
        ):
            return original_translate(
                normalize_source(source),
                target,
                program_name=program_name,
            )

        translator_module.translate_source = translate_source
        translator_module._language_alias_translation_installed = True


def _read_records(runner: Any) -> list[Any]:
    pair = getattr(runner, "sequence_pair", None)
    if pair is not None:
        return list(pair[0]) + list(pair[1])
    records = runner._need_sequences()
    return list(records)


def _read_statistic(runner: Any, rule_id: str, values: tuple[str, ...]) -> None:
    if rule_id == "standard_deviation_of_quality":
        operation = "standard deviation"
        metric = values[0]
    else:
        operation, metric = values
    operation = operation.casefold()
    if operation == "mean":
        operation = "average"
    metric = metric.casefold()
    records = _read_records(runner)
    if metric == "quality":
        runner._need_quality(records)
        numbers = [runner._average_quality(record) for record in records]
        label = "Read quality"
    else:
        numbers = [float(len(record.sequence)) for record in records]
        label = "Read length"
    if not numbers:
        raise FigureLoomBioError("There are no reads to summarize.")
    functions = {
        "average": fmean,
        "median": median,
        "standard deviation": pstdev,
        "minimum": min,
        "maximum": max,
    }
    function = functions.get(operation)
    if function is None:
        raise FigureLoomBioError(f"I cannot calculate the {operation} yet.")
    result = float(function(numbers))
    runner.output.add(
        f"{operation.title()} {label.casefold()}",
        f"{result:.6g}",
        "",
        "Reads used",
        f"{len(numbers):,}",
    )


def _grouped_box_plot(runner: Any, value_requested: str, group_requested: str) -> None:
    from .complete_language import _percentile, _write_svg

    table = runner._need_table()
    value_column = runner._column(table, value_requested)
    group_column = runner._column(table, group_requested)
    groups: dict[str, list[float]] = {}
    for row in table.rows:
        group = str(row.get(group_column, "")).strip()
        raw = str(row.get(value_column, "")).strip()
        if not group or not raw or not runner._is_number(raw):
            continue
        groups.setdefault(group, []).append(float(raw))
    groups = {name: sorted(values) for name, values in groups.items() if values}
    if not groups:
        raise FigureLoomBioError(
            f"I could not find grouped numeric values under {value_column} and {group_column}."
        )
    names = list(groups)[:12]
    all_values = [value for name in names for value in groups[name]]
    minimum, maximum = min(all_values), max(all_values)
    span = maximum - minimum or 1.0
    scale = lambda value: 210 + (value - minimum) / span * 540
    row_height = max(34, min(58, 390 / max(1, len(names))))
    body: list[str] = []
    for index, name in enumerate(names):
        values = groups[name]
        q1 = _percentile(values, 0.25)
        q2 = _percentile(values, 0.50)
        q3 = _percentile(values, 0.75)
        low, high = values[0], values[-1]
        y = 70 + index * row_height
        body.append(
            f'<text x="12" y="{y + 7:.2f}" font-size="12">{escape(name[:24])}</text>'
            f'<line x1="{scale(low):.2f}" y1="{y:.2f}" x2="{scale(high):.2f}" y2="{y:.2f}" stroke-width="2"/>'
            f'<rect x="{scale(q1):.2f}" y="{y - 12:.2f}" width="{max(1, scale(q3)-scale(q1)):.2f}" height="24" fill="none" stroke-width="2"/>'
            f'<line x1="{scale(q2):.2f}" y1="{y - 12:.2f}" x2="{scale(q2):.2f}" y2="{y + 12:.2f}" stroke-width="2"/>'
        )
    _write_svg(runner, "box-plot.svg", f"{value_column} under {group_column}", "".join(body))


def _natural_list(text: str) -> list[str]:
    cleaned = str(text).strip().replace(", and ", ", ")
    if "," not in cleaned and " and " in cleaned:
        left, right = cleaned.rsplit(" and ", 1)
        cleaned = f"{left}, {right}"
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def _heat_map_columns(runner: Any, requested: str) -> None:
    from .analysis_language import _heat_map

    table = runner._need_table()
    columns = [runner._column(table, name) for name in _natural_list(requested)]
    if not columns:
        raise FigureLoomBioError("Name at least one column for the heat map.")
    subset = Table(columns, [{column: row.get(column, "") for column in columns} for row in table.rows])
    path = runner._path("heat-map.svg")
    path.write_text(_heat_map(subset), encoding="utf-8")
    runner.output.add(
        "Heat map",
        "Columns",
        ", ".join(columns),
        "",
        "Saved",
        "heat-map.svg",
    )


__all__ = [
    "RULES",
    "install_language_aliases",
    "normalize_sentence",
    "normalize_source",
]
