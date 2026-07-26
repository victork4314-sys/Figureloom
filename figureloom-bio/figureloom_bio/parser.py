from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Pattern

from .errors import FigureLoomBioError
from .language_compiler import CompileError, compile_sentence, vocabulary_words


@dataclass(frozen=True)
class Instruction:
    action: str
    line_number: int
    values: tuple[str, ...] = ()


# Compatibility extensions may append old regex rules here. They are deliberately
# fallback-only: the compositional compiler always gets the sentence first.
_PATTERNS: tuple[tuple[str, Pattern[str]], ...] = ()

_BASE_COMMAND_WORDS = {
    "align", "annotate", "assemble", "build", "calculate", "call", "change",
    "check", "clean", "combine", "compare", "convert", "copy", "count",
    "create", "cut", "delete", "detect", "discard", "display", "draw", "drop",
    "exclude", "export", "filter", "find", "get", "identify", "import", "inspect",
    "join", "keep", "label", "list", "load", "locate", "make", "measure", "merge",
    "name", "normalize", "open", "plot", "prepare", "print", "put", "read",
    "remove", "rename", "repeat", "replace", "retain", "run", "save", "say",
    "scale", "select", "show", "sort", "split", "stop", "test", "total",
    "translate", "trim", "turn", "use", "validate", "view", "warn", "write",
}


def _known_command_words() -> set[str]:
    return set(_BASE_COMMAND_WORDS).union(vocabulary_words())


def _split_sentences(source: str) -> list[tuple[int, str]]:
    sentences: list[tuple[int, str]] = []
    for line_number, raw_line in enumerate(str(source).splitlines(), start=1):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not stripped.endswith("."):
            raise FigureLoomBioError(
                "This instruction needs a period at the end.\n\n"
                f"I read: {stripped}",
                line_number=line_number,
            )
        sentence = stripped[:-1].strip()
        if sentence:
            sentences.append((line_number, sentence))
    return sentences


def _compile_error_message(sentence: str, error: CompileError) -> str:
    return (
        "This instruction has a known operation, but one required meaning is missing.\n\n"
        "What is missing\n"
        f"{error}\n\n"
        "How FigureLoom Bio read it\n"
        "The compiler found words for an operation, a target, relationships, and values. "
        "You may put those parts in ordinary English order and use any listed synonym; "
        "the sentence does not need to copy an example.\n\n"
        f"I read\n{sentence}."
    )


def _unknown_instruction_message(sentence: str) -> str:
    words = re.findall(r"[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*", sentence.casefold())
    known = _known_command_words()
    recognized = [word for word in words if word in known]
    if recognized:
        return (
            "This instruction contains known FigureLoom Bio words, but they do not form one complete operation.\n\n"
            "Words I recognized\n"
            f"{', '.join(dict.fromkeys(recognized))}\n\n"
            "What to add\n"
            "Name what the operation acts on and provide any filename, column, value, threshold, "
            "comparison, source, or output that operation needs. Word order and exact example wording are not required.\n\n"
            f"I read\n{sentence}."
        )
    return (
        "This instruction does not contain a FigureLoom Bio operation word.\n\n"
        "Start with or include an operation such as Open, Keep, Remove, Count, Show, Create, "
        "Calculate, Save, Compare, Find, Check, or one of their listed alternatives.\n\n"
        f"I read\n{sentence}."
    )


def _compatibility_match(sentence: str) -> tuple[str, tuple[str, ...]] | None:
    for action, pattern in _PATTERNS:
        match = pattern.fullmatch(sentence)
        if match:
            values = tuple(value.strip() if value is not None else "" for value in match.groups())
            return action, values
    return None


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []
    for line_number, sentence in _split_sentences(source):
        compile_error: CompileError | None = None
        compiled = None
        try:
            compiled = compile_sentence(sentence)
        except CompileError as error:
            # A known operation with missing semantic roles must not hide an older,
            # explicitly supported command. Compatibility grammar is tried only
            # after the compositional compiler has had first refusal.
            compile_error = error

        if compiled is not None:
            instructions.append(Instruction(compiled.action, line_number, compiled.values))
            continue

        fallback = _compatibility_match(sentence)
        if fallback is not None:
            action, values = fallback
            instructions.append(Instruction(action, line_number, values))
            continue

        if compile_error is not None:
            raise FigureLoomBioError(
                _compile_error_message(sentence, compile_error),
                line_number=line_number,
            ) from compile_error

        raise FigureLoomBioError(
            _unknown_instruction_message(sentence),
            line_number=line_number,
        )
    return instructions


__all__ = ["Instruction", "parse"]
