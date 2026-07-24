from __future__ import annotations

from collections import defaultdict

from . import language_compiler


_EXTRA_TERMS = {
    "standard_deviation": ("spread",),
    "confidence_interval": ("confidence range",),
    "tree": ("relationship tree",),
}


def _contains(statement, *phrases: str) -> bool:
    padded = f" {statement.lower} "
    return any(f" {phrase.casefold()} " in padded for phrase in phrases)


def _contextual_verb(statement) -> tuple[int, str | None]:
    aliases: dict[str, list[str]] = defaultdict(list)
    for canonical, forms in language_compiler.VOCABULARY["verbs"].items():
        for form in forms:
            aliases[str(form).casefold()].append(canonical)

    words = statement.words
    for index, word in enumerate(words):
        if word == "get" and index + 2 < len(words) and words[index + 1:index + 3] == ("rid", "of"):
            return index, "remove"
        if word == "look" and index + 1 < len(words) and words[index + 1] == "for":
            return index, "find"
        if word == "put" and index + 1 < len(words) and words[index + 1] == "together":
            return index, "assemble" if _contains(statement, "bacterial genome", "genome") else "combine"
        if word == "label" and _contains(statement, "genome", "file", "genes"):
            return index, "annotate"

        candidates = aliases.get(word)
        if not candidates:
            continue

        if word in {"change", "turn"}:
            if _contains(statement, "dna", "rna") and _contains(statement, "to", "into", "as"):
                return index, "convert"
            return index, "replace"

        if word == "build" and _contains(statement, "bacterial genome", "genome"):
            return index, "assemble"

        if word == "print":
            visible_targets = (
                "result", "output", "file", "sequence", "read", "row", "alignment",
                "variant", "gene", "primer", "tree", "quality report",
            )
            return index, "show" if _contains(statement, *visible_targets) else "say"

        if word == "write":
            saved_targets = (
                "result", "output", "file", "sequence", "read", "alignment",
                "variant", "gene", "tree",
            )
            return index, "save" if statement.filenames() or _contains(statement, *saved_targets) else "say"

        if word == "call":
            if _contains(statement, "column", "sequence", "file") and _contains(statement, "to", "as"):
                return index, "rename"
            return index, "find"

        if word == "filter":
            return index, "remove" if _contains(statement, "filter out", "exclude") else "keep"

        if word in {"classify", "reconstruct", "design", "detect", "identify", "locate"}:
            return index, "find"
        if word == "align":
            return index, "compare"
        if word in {"validate", "inspect", "test"}:
            return index, "check"
        if word in {"cut", "clip"}:
            return index, "trim"
        if word == "scale":
            return index, "normalize"
        if word in {"next", "skip"}:
            return index, "continue"

        return index, candidates[0]

    return -1, None


def install_language_compiler_disambiguation() -> None:
    """Resolve ordinary ambiguous words by the meaning of the whole sentence."""

    statement_class = language_compiler.Statement
    if getattr(statement_class, "_figureloom_disambiguation_installed", False):
        return

    original_has_term = statement_class.has_term

    def has_term(self, name: str) -> bool:
        extras = _EXTRA_TERMS.get(name, ())
        return original_has_term(self, name) or bool(extras and self.has(*extras))

    statement_class._find_verb = _contextual_verb
    statement_class.has_term = has_term
    statement_class._figureloom_disambiguation_installed = True


__all__ = ["install_language_compiler_disambiguation"]
