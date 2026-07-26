from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .semantic_language import (
    GRAMMAR,
    InstructionNode,
    LanguageError,
    Token,
    parse_instruction,
    tokenize,
)


# Public lexical inventory for the CLI and documentation. Parsing uses GRAMMAR
# directly; this compatibility view contains no complete sentences.
VOCABULARY = {
    "version": GRAMMAR["version"],
    "verbs": GRAMMAR["operations"],
    "terms": GRAMMAR["targets"],
    "roles": GRAMMAR["roles"],
    "comparators": GRAMMAR["comparisons"],
    "fillers": GRAMMAR["fillers"],
    "flow": {
        "if": ["if"],
        "else": ["else", "otherwise"],
        "else_if": ["else if", "otherwise if"],
        "for_every": ["for every"],
        "recipe": ["make a recipe called"],
    },
    "logic": {
        "and": GRAMMAR["booleans"]["and"],
        "or": GRAMMAR["booleans"]["or"],
        "not": GRAMMAR["booleans"]["not"],
    },
    "booleans": {
        "true": GRAMMAR["booleans"]["true"],
        "false": GRAMMAR["booleans"]["false"],
    },
    "conditions": {
        "exists": ["exists"],
        "empty": ["empty", "not empty"],
        "found": ["found", "not found"],
        "remain": ["remain", "remains"],
    },
    "file_types": {
        extension: [extension.upper(), extension]
        for extension in GRAMMAR["file_extensions"]
    },
}
CompileError = LanguageError
Lexeme = Token


@dataclass(frozen=True)
class CompiledInstruction:
    action: str
    values: tuple[str, ...] = ()
    node: InstructionNode | None = None


class Statement:
    """Compatibility view over the real tokenizer and structured parser.

    New language execution must use ``parse_instruction``. This class exists for
    translation/display callers that previously inspected compiler tokens.
    """

    def __init__(self, sentence: str):
        self.source = str(sentence).strip().rstrip(".:")
        self.tokens = tokenize(self.source)
        self.words = tuple(token.text.casefold() for token in self.tokens if token.kind != "punctuation")
        self.word_set = set(self.words)
        self.lower = " ".join(self.words)
        self.node: InstructionNode | None = None
        try:
            self.node = parse_instruction(self.source)
        except LanguageError:
            pass
        self.verb_index = next((index for index, token in enumerate(self.tokens) if token.kind == "operation"), -1)
        self.verb = self.node.operation if self.node is not None else None

    def has(self, *phrases: str) -> bool:
        padded = f" {self.lower} "
        return any(f" {str(phrase).casefold()} " in padded for phrase in phrases)

    def has_term(self, name: str) -> bool:
        return any(
            (token.kind == "target" and token.value == name)
            or any(kind == "target" and value == name for kind, value in token.tags)
            for token in self.tokens
        )

    def first_number(self) -> str | None:
        return next((token.text for token in self.tokens if token.kind == "number"), None)

    def numbers(self) -> tuple[str, ...]:
        return tuple(token.text for token in self.tokens if token.kind == "number")

    def filenames(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys(token.text for token in self.tokens if token.kind == "filename"))

    def after(self, *markers: str) -> str | None:
        words = self.source.split()
        lowered = [word.casefold().strip(".,") for word in words]
        best: tuple[int, int] | None = None
        for marker in markers:
            wanted = str(marker).casefold().split()
            for index in range(len(lowered) - len(wanted) + 1):
                if lowered[index:index + len(wanted)] == wanted:
                    candidate = (index, len(wanted))
                    if best is None or candidate[0] < best[0]:
                        best = candidate
                    break
        if best is None:
            return None
        value = " ".join(words[best[0] + best[1]:]).strip(" ,")
        return value or None

    def between(self, starts: Iterable[str], ends: Iterable[str]) -> str | None:
        source_lower = self.source.casefold()
        start_pos: tuple[int, int] | None = None
        for marker in starts:
            marker_text = str(marker).casefold()
            index = source_lower.find(marker_text)
            if index >= 0 and (start_pos is None or index < start_pos[0]):
                start_pos = (index, index + len(marker_text))
        if start_pos is None:
            return None
        tail = self.source[start_pos[1]:]
        tail_lower = tail.casefold()
        end_index: int | None = None
        for marker in ends:
            index = tail_lower.find(str(marker).casefold())
            if index >= 0 and (end_index is None or index < end_index):
                end_index = index
        value = tail[:end_index].strip(" ,") if end_index is not None else tail.strip(" ,")
        return value or None

    def after_verb(self) -> str:
        if self.verb_index < 0:
            return ""
        return " ".join(token.text for token in self.tokens[self.verb_index + 1:] if token.kind != "punctuation").strip()


def lex(sentence: str) -> tuple[Token, ...]:
    return tokenize(sentence)


def compile_sentence(sentence: str) -> CompiledInstruction:
    node = parse_instruction(sentence)
    return CompiledInstruction(node.action, node.values, node)


def vocabulary_words() -> set[str]:
    values: set[str] = set()
    for category in ("operations", "targets", "comparisons", "roles", "modifiers", "units", "booleans"):
        for forms in GRAMMAR.get(category, {}).values():
            for form in forms:
                values.update(str(form).casefold().split())
    values.update(str(value).casefold() for value in GRAMMAR.get("articles", ()))
    values.update(str(value).casefold() for value in GRAMMAR.get("fillers", ()))
    return values


__all__ = [
    "CompileError",
    "CompiledInstruction",
    "Lexeme",
    "Statement",
    "VOCABULARY",
    "compile_sentence",
    "lex",
    "vocabulary_words",
]
