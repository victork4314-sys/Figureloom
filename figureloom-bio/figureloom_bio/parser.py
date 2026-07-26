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


# Existing production and compatibility modules append their proven sentence
# forms here. Core productions preserve their established action/value shape.
# Broad language aliases remain fallback-only behind the compositional compiler.
_PATTERNS: tuple[tuple[str, Pattern[str]], ...] = ()
_ALIAS_PREFIX = "language_alias__"

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
        "This instruction could not be compiled.\n\n"
        "It has a known operation, but one required meaning is missing.\n\n"
        "What is missing\n"
        f"{error}\n\n"
        "How FigureLoom Bio read it\n"
        "The compiler found words for an operation, a target, relationships, and values. "
        "The wording and order do not have to copy an example. You may use any listed synonym, "
        "but the words still need to describe one unambiguous operation.\n\n"
        f"I read\n{sentence}."
    )


def _unknown_instruction_message(sentence: str) -> str:
    words = re.findall(r"[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*", sentence.casefold())
    operation_words = [word for word in words if word in _BASE_COMMAND_WORDS]
    known_words = _known_command_words()
    recognized = [word for word in words if word in known_words]
    if operation_words:
        return (
            "This instruction could not be compiled after a known operation word.\n\n"
            "Operation words I recognized\n"
            f"{', '.join(dict.fromkeys(operation_words))}\n\n"
            "What to add\n"
            "Name what the operation acts on and provide any filename, column, value, threshold, "
            "comparison, source, or output that operation needs. The wording and order do not have to copy an example.\n\n"
            f"I read\n{sentence}."
        )
    recognized_text = ""
    if recognized:
        recognized_text = (
            "\n\nOther known words I recognized\n"
            f"{', '.join(dict.fromkeys(recognized))}"
        )
    return (
        "This instruction could not find an operation word.\n\n"
        "Use an operation such as Open, Keep, Remove, Count, Show, Create, Calculate, Save, "
        "Compare, Find, or Check, or use one of their listed alternatives."
        f"{recognized_text}\n\n"
        f"I read\n{sentence}."
    )


def _compatibility_match(
    sentence: str,
    *,
    alias_only: bool,
) -> tuple[str, tuple[str, ...]] | None:
    for action, pattern in _PATTERNS:
        is_alias = action.startswith(_ALIAS_PREFIX)
        if is_alias != alias_only:
            continue
        match = pattern.fullmatch(sentence)
        if match:
            values = tuple(value.strip() if value is not None else "" for value in match.groups())
            return action, values
    return None


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []
    for line_number, sentence in _split_sentences(source):
        # Preserve exact core/current-file production semantics. These rules have
        # proven runtime action/value shapes and are not the definition of legality.
        core_match = _compatibility_match(sentence, alias_only=False)
        if core_match is not None:
            action, values = core_match
            instructions.append(Instruction(action, line_number, values))
            continue

        compile_error: CompileError | None = None
        compiled = None
        try:
            compiled = compile_sentence(sentence)
        except CompileError as error:
            compile_error = error

        if compiled is not None:
            instructions.append(Instruction(compiled.action, line_number, compiled.values))
            continue

        # Broad old aliases are accepted only if the compositional compiler could
        # not resolve the sentence. They cannot steal normal user-written wording.
        alias_match = _compatibility_match(sentence, alias_only=True)
        if alias_match is not None:
            action, values = alias_match
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
