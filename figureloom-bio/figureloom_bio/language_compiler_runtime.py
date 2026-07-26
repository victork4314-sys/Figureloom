from __future__ import annotations

import re

from . import parser as parser_module
from .language_compiler import CompiledInstruction, compile_sentence as compile_frontend
from .language_compiler_extensions import compile_extended_sentence


_ACTION_REWRITES = {
    "assemble_current_file": "assemble_current_bacterial_genome",
    "assemble_bacterial_pair": "builtin_microbiology_assemble_paired",
    "assemble_bacterial_single": "builtin_microbiology_assemble_single",
    "annotate_bacterial_genome": "builtin_microbiology_annotate",
    "check_assembly": "builtin_microbiology_check_assembly",
    "identify_organism": "builtin_microbiology_classify",
    "calculate_p_value": "permutation_p_value",
    "calculate_minimum_under": "calculate_minimum",
    "calculate_maximum_under": "calculate_maximum",
}

_STATISTICS = {
    "calculate_average_of": "average",
    "calculate_median_of": "median",
    "calculate_standard_deviation_of": "standard deviation",
    "calculate_confidence_interval": "confidence interval",
}

_ALIAS_SPECIALS = {
    "read_statistic": "language_alias__read_statistic",
    "grouped_box_plot": "language_alias__grouped_box_plot",
    "heat_map_columns": "language_alias__heatmap_columns",
    "show_warning": "language_alias__warn_message",
}


def _core(sentence: str) -> str:
    return str(sentence).strip().rstrip(".:").strip()


def _match(sentence: str, pattern: str) -> tuple[str, ...] | None:
    matched = re.fullmatch(pattern, _core(sentence), re.IGNORECASE)
    if not matched:
        return None
    return tuple(
        str(value).strip() if value is not None else ""
        for value in matched.groups()
    )


def _semantic_contract(
    sentence: str,
    compiled: CompiledInstruction,
) -> CompiledInstruction:
    """Preserve established executable actions after semantic compilation.

    The front-end decides the operation and roles compositionally. This function
    maps that meaning onto the existing runtime action names and value shapes;
    it does not decide whether a sentence is legal.
    """

    core = _core(sentence)
    action = compiled.action
    values = compiled.values

    if action in {"open_files_together", "merge_files"} and len(values) >= 2:
        return CompiledInstruction(action, (" and ".join(values),))

    if action in {"keep_sequence_names_containing", "remove_sequence_names_containing"}:
        wanted = _match(core, r".+?\b(?:containing|contains)\s+(.+)")
        if wanted:
            return CompiledInstruction(action, (wanted[0],))

    if action == "trim_start" and re.fullmatch(
        r"cut \d+(?:\.\d+)? bases? from the beginning of each read",
        core,
        re.IGNORECASE,
    ):
        return CompiledInstruction("cut_start", values)
    if action == "trim_end" and re.fullmatch(
        r"cut \d+(?:\.\d+)? bases? from the end of each read",
        core,
        re.IGNORECASE,
    ):
        return CompiledInstruction("cut_end", values)

    if re.fullmatch(r"compare the file with .+", core, re.IGNORECASE):
        return CompiledInstruction("compare_file", values)
    if re.fullmatch(r"find genes in the file", core, re.IGNORECASE):
        return CompiledInstruction("find_genes_current_file")

    current_resistance = _match(core, r"find resistance genes in the file(?: using (.+))?")
    if current_resistance is not None:
        return CompiledInstruction(
            "find_resistance_current_file",
            tuple(value for value in current_resistance if value),
        )

    if re.fullmatch(r"find virulence genes in the file", core, re.IGNORECASE):
        return CompiledInstruction("find_virulence_current_file")

    current_identify = _match(core, r"identify (?:the )?organism in the file using (.+)")
    if current_identify:
        return CompiledInstruction("identify_current_file", current_identify)

    current_plasmids = _match(core, r"find plasmids in the file(?: into (.+))?")
    if current_plasmids is not None:
        return CompiledInstruction(
            "find_plasmids_current_file",
            tuple(value for value in current_plasmids if value),
        )

    explicit_resistance = _match(core, r"find resistance genes in (.+?) using (.+)")
    if explicit_resistance:
        return CompiledInstruction("builtin_microbiology_resistance", explicit_resistance)

    explicit_virulence = _match(core, r"find virulence genes in (.+)")
    if explicit_virulence:
        return CompiledInstruction("builtin_microbiology_virulence", explicit_virulence)

    explicit_identify = _match(core, r"identify (?:the )?organism in (.+?) using (.+)")
    if explicit_identify:
        return CompiledInstruction("builtin_microbiology_classify", explicit_identify)

    explicit_plasmids = _match(core, r"find plasmids in (.+?) into (.+)")
    if explicit_plasmids:
        return CompiledInstruction("builtin_microbiology_plasmids", explicit_plasmids)

    if action == "create_histogram" and re.fullmatch(
        r"create a histogram of .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("histogram", values)

    if action == "create_scatter_plot" and re.fullmatch(
        r"create a scatter plot of .+? and .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("scatter_plot", values)

    if action == "box_plot" and re.fullmatch(
        r"create a box plot from .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("create_box_plot", values)

    if action == "calculate_average_of" and re.fullmatch(
        r"calculate the average under .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("calculate_average", values)

    if action == "calculate_median_of" and re.fullmatch(
        r"calculate the median under .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("calculate_median", values)

    if action == "calculate_standard_deviation_of" and re.fullmatch(
        r"calculate the standard deviation under .+", core, re.IGNORECASE
    ):
        return CompiledInstruction("calculate_standard_deviation", values)

    return compiled


def compile_for_runtime(sentence: str) -> CompiledInstruction | None:
    compiled = compile_frontend(sentence)
    if compiled is None:
        compiled = compile_extended_sentence(sentence)
    if compiled is None:
        return None

    compiled = _semantic_contract(sentence, compiled)

    if compiled.action in _STATISTICS:
        return CompiledInstruction(
            "summary_statistic",
            (_STATISTICS[compiled.action], *compiled.values),
        )

    action = _ACTION_REWRITES.get(compiled.action, compiled.action)
    action = _ALIAS_SPECIALS.get(action, action)
    return CompiledInstruction(action, compiled.values)


def install_language_compiler() -> None:
    if getattr(parser_module, "_language_compiler_installed", False):
        return
    parser_module.compile_sentence = compile_for_runtime
    parser_module._language_compiler_installed = True


__all__ = ["compile_for_runtime", "install_language_compiler"]
