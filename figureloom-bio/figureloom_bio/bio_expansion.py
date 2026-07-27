from __future__ import annotations

from importlib.resources import files
import json
import re
from typing import Any

from .semantic_language import InstructionNode, LanguageError


EXPANSION = json.loads(
    files(__package__).joinpath("bio_expansion_grammar.json").read_text(encoding="utf-8")
)

_WORD_RE = re.compile(r'"[^"\n]*"|\'[^\'\n]*\'|[A-Za-z0-9_./\\:+-]+')
_NUMBER_RE = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")
_FILE_RE = re.compile(r"[^\s]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|vcf|gff|gff3|gtf|bed|nwk|svg)$", re.I)


def _entries(category: str) -> list[tuple[tuple[str, ...], str]]:
    output: list[tuple[tuple[str, ...], str]] = []
    for canonical, forms in EXPANSION.get(category, {}).items():
        for form in forms:
            output.append((tuple(str(form).casefold().split()), str(canonical)))
    output.sort(key=lambda item: len(item[0]), reverse=True)
    return output


OPERATIONS = _entries("operations")
TARGETS = _entries("targets")
COMPARISONS = _entries("comparisons")
ROLES = _entries("roles")
MODIFIERS = _entries("modifiers")
_CATEGORY_ENTRIES = {
    "operations": OPERATIONS,
    "targets": TARGETS,
    "comparisons": COMPARISONS,
    "roles": ROLES,
    "modifiers": MODIFIERS,
}


def _tokens(source: str) -> list[str]:
    return [match.group(0).strip("\"'") for match in _WORD_RE.finditer(str(source))]


def _find_phrase(words: list[str], entries: list[tuple[tuple[str, ...], str]], *, start_only: bool = False) -> tuple[str, int, int] | None:
    lowered = [word.casefold() for word in words]
    for phrase, canonical in entries:
        limit = 1 if start_only else len(words) - len(phrase) + 1
        for index in range(max(0, limit)):
            if tuple(lowered[index:index + len(phrase)]) == phrase:
                return canonical, index, index + len(phrase)
    return None


def classify_expansion_phrase(category: str, phrase: str) -> str | None:
    entries = _CATEGORY_ENTRIES.get(category)
    if entries is None:
        raise KeyError(category)
    words = _tokens(phrase)
    match = _find_phrase(words, entries, start_only=True)
    if not match or match[1] != 0 or match[2] != len(words):
        return None
    return match[0]


def parse_expanded_instruction(source: str, *, line: int = 1) -> InstructionNode:
    words = _tokens(source)
    operation_match = _find_phrase(words, OPERATIONS, start_only=True)
    if not operation_match:
        raise LanguageError("I could not find a supported bioinformatics operation.", line=line, code="missing_operation")
    operation = operation_match[0]

    target_matches: list[tuple[str, int, int]] = []
    for phrase, canonical in TARGETS:
        lowered = [word.casefold() for word in words]
        for index in range(len(words) - len(phrase) + 1):
            if tuple(lowered[index:index + len(phrase)]) == phrase:
                target_matches.append((canonical, index, index + len(phrase)))
                break
    targets = list(dict.fromkeys(item[0] for item in sorted(target_matches, key=lambda item: item[1])))
    if not targets:
        raise LanguageError("This bioinformatics instruction needs a target.", line=line, code="missing_target")

    modifiers = list(dict.fromkeys(
        match[0] for match in (_find_phrase(words, [entry]) for entry in MODIFIERS) if match
    ))
    comparison_match = _find_phrase(words, COMPARISONS)
    comparison = comparison_match[0] if comparison_match else None
    numbers = [word for word in words if _NUMBER_RE.fullmatch(word)]
    filenames = [word for word in words if _FILE_RE.fullmatch(word)]

    role_values: dict[str, str] = {}
    role_matches: list[tuple[str, int, int]] = []
    lowered = [word.casefold() for word in words]
    for phrase, canonical in ROLES:
        for index in range(len(words) - len(phrase) + 1):
            if tuple(lowered[index:index + len(phrase)]) == phrase:
                role_matches.append((canonical, index, index + len(phrase)))
    role_matches.sort(key=lambda item: item[1])
    for position, (role, _start, end) in enumerate(role_matches):
        stop = role_matches[position + 1][1] if position + 1 < len(role_matches) else len(words)
        value_words = [word for word in words[end:stop] if word.casefold() not in {"the", "a", "an"}]
        if value_words:
            role_values[role] = " ".join(value_words)

    candidates: list[tuple[int, dict[str, Any]]] = []
    target_set = set(targets)
    modifier_set = set(modifiers)
    for rule in EXPANSION.get("capabilities", []):
        if rule.get("operation") != operation or rule.get("target") not in target_set:
            continue
        required_modifier = rule.get("modifier")
        if required_modifier and required_modifier not in modifier_set:
            continue
        if rule.get("needs_number") and not numbers:
            continue
        if rule.get("needs_file") and not filenames:
            continue
        score = 10 + (4 if required_modifier else 0) + (2 if rule.get("needs_number") else 0) + (2 if rule.get("needs_file") else 0)
        candidates.append((score, rule))
    if not candidates:
        raise LanguageError(
            f"The operation {operation} cannot be used with {', '.join(targets)} in this form.",
            line=line,
            code="incompatible_operation_target",
        )
    candidates.sort(key=lambda item: item[0], reverse=True)
    top_score = candidates[0][0]
    top = [rule for score, rule in candidates if score == top_score]
    actions = {str(rule["action"]) for rule in top}
    if len(actions) != 1:
        raise LanguageError(
            f"This instruction has more than one valid meaning: {', '.join(sorted(actions))}.",
            line=line,
            code="ambiguous_instruction",
        )
    rule = top[0]

    arguments: dict[str, Any] = {
        "numbers": numbers,
        "files": filenames,
        "runtime_values": tuple(numbers + filenames),
    }
    if numbers:
        arguments["number"] = numbers[0]
    if filenames:
        arguments["source"] = filenames[0]
    if comparison:
        arguments["comparison"] = comparison
    arguments.update(role_values)

    return InstructionNode(
        operation=operation,
        targets=tuple(targets),
        action=str(rule["action"]),
        arguments=arguments,
        modifiers=tuple(modifiers),
        roles=role_values,
        comparison={"operator": comparison, "value": numbers[0] if numbers else None} if comparison else None,
        source=str(source),
        line=line,
        column=1,
    )


def expansion_words() -> set[str]:
    words: set[str] = set()
    for category in ("operations", "targets", "comparisons", "roles", "modifiers"):
        for forms in EXPANSION.get(category, {}).values():
            for form in forms:
                words.update(str(form).casefold().split())
    return words


__all__ = ["EXPANSION", "classify_expansion_phrase", "expansion_words", "parse_expanded_instruction"]
