from __future__ import annotations

from . import parser as parser_module
from .language_compiler import CompiledInstruction, compile_sentence as compile_frontend


_ACTION_REWRITES = {
    "assemble_current_file": "assemble_current_bacterial_genome",
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
    "grouped_box_plot": "language_alias__grouped_box_plot",
    "heat_map_columns": "language_alias__heatmap_columns",
    "show_warning": "language_alias__warn_message",
}


def compile_for_runtime(sentence: str) -> CompiledInstruction | None:
    compiled = compile_frontend(sentence)
    if compiled is None:
        return None

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
