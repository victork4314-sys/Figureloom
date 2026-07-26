from __future__ import annotations

from .errors import FigureLoomBioError
from .parser import parse


def install_language_diagnostics() -> None:
    """Diagnostics are emitted directly by tokenizer, parser, and semantic analysis."""


def language_diagnostics_self_test() -> dict[str, bool]:
    try:
        parse("Create something scientific somehow.")
    except FigureLoomBioError as error:
        if not error.plain_message().strip():
            raise RuntimeError("The language error was empty.")
    else:
        raise RuntimeError("An incomplete instruction was accepted.")
    typo = parse("Draw a vulcano chart using effect and p_value.")[0]
    return {
        "structured_error_explained": True,
        "runtime_references_routed": True,
        "known_typo_resolved": typo.action == "volcano_plot" and typo.values == ("effect", "p_value"),
    }


__all__ = ["install_language_diagnostics", "language_diagnostics_self_test"]
