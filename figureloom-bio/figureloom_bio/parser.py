from __future__ import annotations

from dataclasses import dataclass
import re

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


def _strip_named_target(value: object, target: str) -> str:
    text = str(value or "").strip()
    return re.sub(
        rf"^(?:the\s+)?(?:{re.escape(target)})\s+",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()


def _normalize_named_target_arguments(node: InstructionNode) -> InstructionNode:
    """Keep target nouns out of identifier values in the executable AST.

    The grammar records ``sequence`` as the target.  It must therefore never
    leak into the sequence name passed to the runtime.
    """
    if "sequence" not in node.targets:
        return node

    if node.action in {"use_sequence", "remove_named_sequence"}:
        raw_name = node.roles.get("name") or node.arguments.get("name")
        if raw_name:
            name = _strip_named_target(raw_name, "sequence")
            node.roles["name"] = name
            node.arguments["name"] = name
            node.arguments["runtime_values"] = [name]

    if node.action == "rename_sequence":
        raw_source = node.roles.get("source_value") or node.arguments.get("source_value")
        raw_destination = node.roles.get("destination_value") or node.arguments.get("destination_value")
        source = _strip_named_target(raw_source, "sequence")
        destination = _strip_named_target(raw_destination, "sequence")
        node.roles["source_value"] = source
        node.roles["destination_value"] = destination
        node.arguments["source_value"] = source
        node.arguments["destination_value"] = destination
        node.arguments["runtime_values"] = [source, destination]

    return node


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
            node = _normalize_named_target_arguments(
                parse_instruction(text[:-1], line=line_number)
            )
        except LanguageError as error:
            raise FigureLoomBioError(
                _render_error(text[:-1], error),
                line_number=error.line or line_number,
            ) from error
        instructions.append(Instruction(node.action, line_number, node.values, node))
    return instructions


def _known_command_words() -> set[str]:
    """Return lexical grammar words, not a sentence whitelist."""
    words: set[str] = set()
    for category in (
        "operations",
        "targets",
        "comparisons",
        "roles",
        "modifiers",
        "units",
        "booleans",
    ):
        for forms in GRAMMAR.get(category, {}).values():
            for form in forms:
                words.update(str(form).casefold().split())
    words.update(str(value).casefold() for value in GRAMMAR.get("articles", ()))
    words.update(str(value).casefold() for value in GRAMMAR.get("fillers", ()))
    return words


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
