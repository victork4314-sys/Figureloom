from __future__ import annotations

from dataclasses import dataclass

from .errors import FigureLoomBioError
from .semantic_language import GRAMMAR, InstructionNode, LanguageError, parse_instruction


@dataclass(frozen=True)
class Instruction:
    action: str
    line_number: int
    values: tuple[str, ...] = ()
    node: InstructionNode | None = None

    @property
    def operation(self) -> str | None:
        return self.node.operation if self.node else None

    @property
    def targets(self) -> tuple[str, ...]:
        return self.node.targets if self.node else ()

    @property
    def arguments(self) -> dict:
        return self.node.arguments if self.node else {}


def parse(source: str) -> list[Instruction]:
    instructions: list[Instruction] = []
    for line_number, raw_line in enumerate(str(source).splitlines(), start=1):
        text = raw_line.strip()
        if not text or text.startswith("#"):
            continue
        if text.endswith(":"):
            raise FigureLoomBioError(
                "This block header must be parsed as part of a complete program.",
                line_number=line_number,
            )
        if not text.endswith("."):
            raise FigureLoomBioError(
                "This instruction needs a period at the end.\n\n"
                f"I read: {text}",
                line_number=line_number,
            )
        try:
            node = parse_instruction(text[:-1], line=line_number)
        except LanguageError as error:
            raise FigureLoomBioError(
                _render_error(text[:-1], error),
                line_number=error.line or line_number,
            ) from error
        instructions.append(Instruction(node.action, line_number, node.values, node))
    return instructions


def _known_command_words() -> set[str]:
    words: set[str] = set()
    for category in ("operations", "targets", "comparisons", "roles", "modifiers", "units", "booleans"):
        for forms in GRAMMAR.get(category, {}).values():
            for form in forms:
                words.update(part.casefold() for part in str(form).split() if part)
    words.update(str(value).casefold() for value in GRAMMAR.get("articles", ()))
    words.update(str(value).casefold() for value in GRAMMAR.get("fillers", ()))
    words.update(str(value).casefold() for value in GRAMMAR.get("file_extensions", ()))
    return words


def _render_error(sentence: str, error: LanguageError) -> str:
    if error.code == "missing_operation":
        return (
            "I could not find an operation word in this instruction.\n\n"
            f"I read\n{sentence}.\n\n"
            "Use an operation such as Open, Keep, Remove, Show, Save, Calculate, or Find."
        )
    labels = {
        "missing_period": "The instruction is missing its ending period.",
        "missing_condition": "The instruction is missing its condition.",
        "missing_condition_comparison": "The condition is missing a comparison.",
        "incompatible_operation_target": "The operation and target are not compatible.",
        "ambiguous_instruction": "The instruction has more than one grammatical meaning.",
    }
    heading = labels.get(error.code, "The instruction is not valid for the language grammar.")
    return (
        "This instruction could not be compiled by the language grammar.\n\n"
        f"{heading}\n\n{error}\n\n"
        f"I read\n{sentence}.\n\n"
        "A complete instruction needs an operation and every target or value required by that operation. "
        "The wording and order do not have to copy an example."
    )


__all__ = ["Instruction", "_known_command_words", "parse"]
