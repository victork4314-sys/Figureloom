from __future__ import annotations

from difflib import SequenceMatcher
import re
import sys
from typing import Any

from . import parser as parser_module
from .errors import FigureLoomBioError
from .language_aliases import RULES, normalize_source
from .language_manifest import language_manifest


_SPACE = re.compile(r"\s+")
_COMMON_UNAMBIGUOUS_FIXES = (
    (re.compile(r"\bvulcano\b", re.IGNORECASE), "volcano"),
    (re.compile(r"\bp[‐‑‒–—-]value\b", re.IGNORECASE), "p value"),
)
_UNKNOWN_MARKERS = (
    "I do not understand this instruction yet",
    "I recognize the command word",
    "I could not match this instruction",
)


def _clean(value: str) -> str:
    text = value.strip().rstrip(".:").casefold()
    text = text.replace("_", " ").replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
    return _SPACE.sub(" ", text)


def _known_sentences() -> tuple[str, ...]:
    sentences = [command.example for command in language_manifest().commands]
    for rule in RULES:
        sentences.extend(str(example) for example in rule.get("examples", ()))
    unique: dict[str, str] = {}
    for sentence in sentences:
        unique.setdefault(_clean(sentence), sentence)
    return tuple(unique.values())


def _safe_normalize(source: str) -> str:
    text = str(source)
    for pattern, replacement in _COMMON_UNAMBIGUOUS_FIXES:
        text = pattern.sub(replacement, text)
    return normalize_source(text)


def _is_unknown(error: FigureLoomBioError) -> bool:
    return any(marker in error.message for marker in _UNKNOWN_MARKERS)


def _line_text(source: str, line_number: int | None) -> str:
    lines = str(source).splitlines()
    if line_number and 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()
    return next((line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")), "")


def _closest(sentence: str, limit: int = 3) -> list[str]:
    wanted = _clean(sentence)
    ranked = sorted(
        ((SequenceMatcher(None, wanted, _clean(candidate)).ratio(), candidate) for candidate in _known_sentences()),
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
            "The sentence is present in the built-in list. Your wording is not the problem.\n\n"
            "How to fix it\n"
            "Save the program, close FigureLoom Bio, and open it again. If the same line still fails, open the updater and press Repair. Repair keeps your saved workspace.\n\n"
            f"Instruction\n{sentence or exact}"
        )
        return FigureLoomBioError(message, line_number=error.line_number)

    suggestions = _closest(sentence)
    if suggestions:
        options = "\n".join(f"• {candidate}" for candidate in suggestions)
        fix = (
            "Use one of these closest built-in sentences. Change only its filename, column name, value, or number:\n"
            f"{options}"
        )
    else:
        fix = "Open Sentences and search for the action. Insert a built-in sentence, then change only its filename, column, value, or number."
    message = (
        "FigureLoom Bio could not match this complete instruction.\n\n"
        "What happened\n"
        "Some words may exist in the language, but this exact sentence structure did not match a safe built-in action. FigureLoom Bio stopped instead of guessing.\n\n"
        "How to fix it\n"
        f"{fix}\n\n"
        f"Instruction read\n{sentence or '(empty line)'}"
    )
    return FigureLoomBioError(message, line_number=error.line_number)


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
            raise _diagnostic_error(source, error) from error

    parser_module.parse = parse_with_diagnostics
    parser_module._language_diagnostics_routed_modules = _route_existing_parse_imports(original_parse, parse_with_diagnostics)
    parser_module._language_diagnostics_installed = True


def language_diagnostics_self_test() -> dict[str, bool]:
    parser_module.parse("Draw a vulcano plot from effect and p_value.")
    try:
        parser_module.parse("Create something scientific somehow.")
    except FigureLoomBioError as error:
        message = error.plain_message()
        if "What happened" not in message or "How to fix it" not in message:
            raise RuntimeError("The unknown-instruction explanation is incomplete.")
    else:
        raise RuntimeError("An unknown instruction was accepted.")

    from . import desktop_tools, native_core
    if desktop_tools.parse is not parser_module.parse or native_core.parse is not parser_module.parse:
        raise RuntimeError("Detailed language diagnostics did not reach every desktop runtime.")
    return {"known_typo_resolved": True, "unknown_instruction_explained": True, "runtime_references_routed": True}


__all__ = ["install_language_diagnostics", "language_diagnostics_self_test"]
