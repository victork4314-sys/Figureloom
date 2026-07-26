from __future__ import annotations

import re

from . import language_compiler


_WORD = re.compile(r"[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*")


def _words(value: str) -> tuple[str, ...]:
    return tuple(match.group(0).casefold() for match in _WORD.finditer(str(value)))


def _contains(statement: object, *phrases: str) -> bool:
    padded = f" {getattr(statement, 'lower', '')} "
    return any(f" {phrase.casefold()} " in padded for phrase in phrases)


def _subsequence_index(words: tuple[str, ...], wanted: tuple[str, ...]) -> int | None:
    if not wanted or len(wanted) > len(words):
        return None
    limit = len(words) - len(wanted) + 1
    for index in range(limit):
        if words[index:index + len(wanted)] == wanted:
            return index
    return None


def _verb_matches(statement: object) -> list[tuple[int, int, str, str]]:
    matches: list[tuple[int, int, str, str]] = []
    words = tuple(getattr(statement, "words", ()))
    for canonical, forms in language_compiler.VOCABULARY.get("verbs", {}).items():
        for form in forms:
            form_words = _words(str(form))
            index = _subsequence_index(words, form_words)
            if index is not None:
                matches.append((index, -len(form_words), str(form).casefold(), str(canonical)))
    matches.sort()
    return matches


def _contextual_verb(statement: object) -> tuple[int, str | None]:
    matches = _verb_matches(statement)
    if not matches:
        return -1, None

    words = tuple(getattr(statement, "words", ()))

    if _contains(statement, "get rid of", "filter out"):
        form = "get rid of" if _contains(statement, "get rid of") else "filter out"
        found = _subsequence_index(words, _words(form))
        return (0 if found is None else found), "remove"
    if _contains(statement, "look for"):
        found = _subsequence_index(words, ("look", "for"))
        return (0 if found is None else found), "find"
    if _contains(statement, "put together"):
        found = _subsequence_index(words, ("put", "together"))
        return (
            0 if found is None else found,
            "assemble" if _contains(statement, "genome", "bacterial genome", "assembly") else "combine",
        )

    index, _, form, canonical = matches[0]

    if form in {"change", "turn"}:
        if _contains(statement, "dna", "rna") and _contains(statement, "to", "into", "as"):
            return index, "convert"
        return index, "replace"

    if form == "build":
        return index, "assemble" if _contains(statement, "genome", "bacterial genome", "assembly") else "create"

    if form == "print":
        visible_targets = (
            "result", "output", "file", "sequence", "read", "row", "alignment",
            "variant", "gene", "primer", "tree", "quality report",
        )
        return index, "show" if _contains(statement, *visible_targets) else "say"

    if form == "write":
        saved_targets = (
            "result", "output", "file", "sequence", "read", "alignment",
            "variant", "gene", "tree",
        )
        has_filename = bool(getattr(statement, "filenames")())
        return index, "save" if has_filename or _contains(statement, *saved_targets) else "say"

    if form == "call":
        if _contains(statement, "call the result"):
            return -1, None
        if _contains(statement, "column", "sequence", "file") and _contains(statement, "to", "as"):
            return index, "rename"
        return index, "find"

    if form == "filter":
        return index, "keep"
    if form == "label":
        return index, "annotate"
    if form in {"classify", "reconstruct", "design", "detect", "identify", "locate"}:
        return index, "find"
    if form == "align":
        return index, "compare"
    if form in {"validate", "inspect", "test"}:
        return index, "check"
    if form in {"cut", "clip"}:
        return index, "trim"
    if form == "scale":
        return index, "normalize"
    if form == "next":
        return index, "continue"
    if form == "skip":
        # The core compiler uses one branch for both continue and skip. Keeping the
        # canonical value as "continue" makes "Skip this sample" resolve to skip_sample.
        return index, "continue"

    return index, canonical


def install_language_compiler_disambiguation() -> None:
    """Resolve vocabulary phrases and ambiguous everyday words from sentence context."""

    statement_class = language_compiler.Statement
    if getattr(statement_class, "_figureloom_disambiguation_installed", False):
        return

    statement_class._find_verb = _contextual_verb
    statement_class._figureloom_disambiguation_installed = True


__all__ = ["install_language_compiler_disambiguation"]
