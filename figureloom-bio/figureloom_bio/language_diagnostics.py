from __future__ import annotations

import re
import sys
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError


_COMMON_UNAMBIGUOUS_FIXES = (
    (re.compile(r"\bvulcano\b", re.IGNORECASE), "volcano"),
    (re.compile(r"\bp[‐‑‒–—-]value\b", re.IGNORECASE), "p value"),
)
_UNKNOWN_MARKERS = (
    "could not be compiled",
    "could not find an operation word",
)


def _safe_normalize(source: str) -> str:
    text = str(source)
    for pattern, replacement in _COMMON_UNAMBIGUOUS_FIXES:
        text = pattern.sub(replacement, text)
    return text


def _is_unknown(error: FigureLoomBioError) -> bool:
    message = error.message.casefold()
    return any(marker.casefold() in message for marker in _UNKNOWN_MARKERS)


def _route_existing_parse_imports(original_parse: Any, wrapped_parse: Any) -> tuple[str, ...]:
    routed: list[str] = []
    for name, module in tuple(sys.modules.items()):
        if not name.startswith("figureloom_bio") or module is None:
            continue
        namespace = getattr(module, "__dict__", None)
        if not isinstance(namespace, dict):
            continue
        candidate = namespace.get("parse")
        if candidate is wrapped_parse:
            continue
        if candidate is original_parse or (
            callable(candidate)
            and getattr(candidate, "__module__", "") == "figureloom_bio.parser"
            and getattr(candidate, "__name__", "") == "parse"
        ):
            namespace["parse"] = wrapped_parse
            routed.append(name)
    return tuple(sorted(set(routed)))


def install_language_diagnostics() -> None:
    if getattr(parser_module, "_language_diagnostics_installed", False):
        return
    original_parse = parser_module.parse

    def parse_with_diagnostics(source: str):
        try:
            return original_parse(source)
        except FigureLoomBioError as error:
            if not _is_unknown(error):
                raise
            normalized = _safe_normalize(source)
            if normalized != source:
                try:
                    return original_parse(normalized)
                except FigureLoomBioError as normalized_error:
                    if not _is_unknown(normalized_error):
                        raise
            raise

    parser_module.parse = parse_with_diagnostics
    parser_module._language_diagnostics_routed_modules = _route_existing_parse_imports(original_parse, parse_with_diagnostics)
    parser_module._language_diagnostics_installed = True


def language_diagnostics_self_test() -> dict[str, bool]:
    parser_module.parse("Draw a vulcano plot from effect and p_value.")
    try:
        parser_module.parse("Create something scientific somehow.")
    except FigureLoomBioError as error:
        message = error.plain_message()
        if "What happened" not in message and "What is missing" not in message:
            raise RuntimeError("The compiler explanation is incomplete.")
    else:
        raise RuntimeError("An incomplete instruction was accepted.")

    from . import desktop_tools, native_core
    if desktop_tools.parse is not parser_module.parse or native_core.parse is not parser_module.parse:
        raise RuntimeError("Detailed language diagnostics did not reach every desktop runtime.")
    return {"known_typo_resolved": True, "compiler_error_explained": True, "runtime_references_routed": True}


__all__ = ["install_language_diagnostics", "language_diagnostics_self_test"]
