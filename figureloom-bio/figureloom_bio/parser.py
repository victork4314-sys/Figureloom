from __future__ import annotations

from dataclasses import dataclass

from .errors import FigureLoomBioError
from .semantic_language import InstructionNode, LanguageError, parse_instruction


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


def _render_error(sentence: str, error: LanguageError) -> str:
    labels = {
        "missing_operation": "The instruction is missing an operation.",
        "missing_period": "The instruction is missing its ending period.",
        "missing_condition_comparison": "The condition is missing a comparison.",
        "incompatible_operation_target": "The operation and target are not compatible.",
        "ambiguous_instruction": "The instruction has more than one grammatical meaning.",
    }
    heading = labels.get(error.code, "The instruction is not valid for the language grammar.")
    return f"{heading}\n\n{error}\n\nI read\n{sentence}."


__all__ = ["Instruction", "parse"]
