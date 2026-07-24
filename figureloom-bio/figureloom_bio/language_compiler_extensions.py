from __future__ import annotations

import re

from .language_compiler import CompiledInstruction, Statement


def _clean(value: str | None) -> str:
    text = str(value or "").strip().strip("\"'").strip(" ,")
    return re.sub(r"(?i)^(?:the|a|an|current)\s+", "", text).strip()


def compile_extended_sentence(sentence: str) -> CompiledInstruction | None:
    """Compile official operation words that sit outside the core table/sequence dispatcher."""
    statement = Statement(sentence)
    if not statement.tokens:
        return None

    if statement.verb == "copy":
        names = statement.filenames()
        requested = names[-1] if names else statement.after("as", "to", "into")
        requested = _clean(requested)
        if not requested:
            return None
        return CompiledInstruction("copy_file", (requested,))

    if statement.verb == "split":
        number = statement.first_number()
        names = statement.filenames()
        requested = names[-1] if names else statement.after("as", "to", "into")
        requested = _clean(requested)
        if statement.has_term("sequence") and number and requested:
            return CompiledInstruction("split_sequences", (number, requested))
        return None

    if statement.verb == "use":
        named = _clean(statement.after("named", "called"))
        if statement.has_term("sequence") and named:
            return CompiledInstruction("use_sequence", (named,))
        result = _clean(statement.after("result"))
        if statement.has_term("result") and result:
            return CompiledInstruction("use_named_result", (result,))
        recipe = _clean(statement.after("recipe"))
        if statement.has_term("recipe") and recipe:
            return CompiledInstruction("use_recipe", (recipe,))
        return None

    if statement.verb == "mark" and statement.has_term("sample") and statement.has_term("review"):
        return CompiledInstruction("mark_review")

    return None


__all__ = ["compile_extended_sentence"]
