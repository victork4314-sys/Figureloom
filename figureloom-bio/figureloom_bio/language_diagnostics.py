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


def _clean(value: str) -> str:
    text = value.strip().rstrip(".:").casefold()
    text = text.replace("_", " ").replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
    return _SPACE.sub(" ", text)


def _known_sentences() -> tuple[str, ...]:
    output: list[str] = []
    output.extend(command.example for command in language_manifest().commands)
    for rule in RULES:
        output.extend(str(example) for example in rule.get("examples", ()))
    unique: dict[str, str] = {}
    for sentence in output:
        unique.setdefault(_clean(sentence), sentence)
    return tuple(unique.values())


def _safe_normalize(source: str) -> str:
    text = str(source)
    for pattern, replacement in _COMMON_UNAMBIGUOUS_FIXES:
        text = pattern.sub(replacement, text)
    return normalize_source(text)


def _line_text(source: str, line_number: int | None) -> str:
    lines = str(source).splitlines()
    if line_number and 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()
    return next((line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")), "")


def _closest_sentences(sentence: str, *, limit: int = 3) -> list[tuple[float, str]]:
    wanted = _clean(sentence)
    ranked = [
        (SequenceMatcher(None, wanted, _clean(candidate)).ratio(), candidate)
        for candidate in _known_sentences()
    ]
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [item for item in ranked[:limit] if item[0] >= 0.48]


def _unknown_message(source: str, error: FigureLoomBioError) -> FigureLoomBioError:
    line_number = error.line_number
    sentence = _line_text(source, line_number)
    cleaned = _clean(sentence)
    exact = next((candidate for candidate in _known_sentences() if _clean(candidate) == cleaned), None)
    if exact:
        message = (
            "FigureLoom Bio knows this sentence, but its language handler did not load.\n\n"
            "What happened\n"
            "The instruction is present in the built-in sentence list, so your wording is not the problem.\n\n"
            "How to fix it\n"
            "Save the program, close FigureLoom Bio, and open it again. If the same line still fails, "
            "open FigureLoom Bio Updater and press Repair. Repair keeps the saved workspace.\n\n"
            f"Instruction\n{sentence or exact}"
        )
        return FigureLoomBioError(message, line_number=line_number)

    closest = _closest_sentences(sentence)
    suggestions = "\n".join(f"• {candidate}" for _score, candidate in closest)
    if suggestions:
        fix = (
            "Use one of the closest built-in forms below, changing only the filename, column name, value, or number:\n"
            f"{suggestions}"
        )
    else:
        fix = (
            "Open Sentences and search for the action you need. Add the sentence from that list, then change only "
            "its filename, column name, value, or number."
        )
    message = (
        "FigureLoom Bio could not match this instruction.\n\n"
        "What happened\n"
        "The line is written as a complete sentence, but its exact structure does not match a built-in instruction. "
        "FigureLoom Bio stopped instead of guessing and running the wrong analysis.\n\n"
        "How to fix it\n"
        f"{fix}\n\n"
        f"Instruction read\n{sentence or '(empty line)'}"
    )
    return FigureLoomBioError(message, line_number=line_number)


def _route_existing_parse_imports(original_parse: Any, wrapped_parse: Any) -> tuple[str, ...]:
    """Replace stale ``from parser import parse`` references already loaded in memory.

    FigureLoom Bio installs its language in layers. Some runtime modules are loaded
    before the final diagnostics layer and therefore hold the old function object.
    Updating only ``parser.parse`` makes direct parser tests pass while the IDE still
    calls the old generic error path. Route every genuine parser-function reference
    inside this package to the final wrapper so the editor, terminal, quick test,
    control flow, and streaming paths all behave the same way.
    """

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
            if "I do not understand this instruction yet" not in error.message:
                raise

            normalized = _safe_normalize(source)
            if normalized != source:
                try:
                    return original_parse(normalized)
                except FigureLoomBioError as normalized_error:
                    if "I do not understand this instruction yet" not in normalized_error.message:
                        raise

            raise _unknown_message(source, error) from error

    parser_module.parse = parse_with_diagnostics
    parser_module._language_diagnostics_original_parse = original_parse
    parser_module._language_diagnostics_routed_modules = _route_existing_parse_imports(
        original_parse,
        parse_with_diagnostics,
    )
    parser_module._language_diagnostics_installed = True


def language_diagnostics_self_test() -> dict[str, Any]:
    parser_module.parse("Draw a vulcano plot from fold_change and p_value.")
    try:
        parser_module.parse("Create something scientific somehow.")
    except FigureLoomBioError as error:
        message = error.plain_message()
        if "What happened" not in message or "How to fix it" not in message:
            raise RuntimeError("The unknown-instruction explanation is incomplete.")
    else:
        raise RuntimeError("An unknown instruction was accepted.")

    # These are the real non-UI execution paths used by the desktop IDE and test app.
    # They must not retain the parser function that existed before diagnostics loaded.
    from . import desktop_tools, native_core

    stale = [
        name
        for name, candidate in (
            ("desktop quick test", desktop_tools.parse),
            ("native IDE runtime", native_core.parse),
        )
        if candidate is not parser_module.parse
    ]
    if stale:
        raise RuntimeError("Detailed diagnostics did not reach: " + ", ".join(stale))

    return {
        "known_typo_resolved": True,
        "unknown_instruction_explained": True,
        "runtime_references_routed": True,
    }


__all__ = ["install_language_diagnostics", "language_diagnostics_self_test"]
