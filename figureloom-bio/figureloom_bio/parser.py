from __future__ import annotations

from dataclasses import dataclass

from .bio_expansion import expansion_words, parse_expanded_instruction
from .errors import FigureLoomBioError
from .semantic_language import (
    GRAMMAR,
    BranchNode,
    IfNode,
    InstructionNode,
    LanguageError,
    LoopNode,
    ProgramNodeRoot,
    RecipeNode,
    parse_condition,
    parse_instruction,
)


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


def _parse_node(text: str, line_number: int) -> InstructionNode:
    try:
        return parse_expanded_instruction(text, line=line_number)
    except LanguageError as expansion_error:
        try:
            return parse_instruction(text, line=line_number)
        except LanguageError:
            raise expansion_error


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
            node = _parse_node(text[:-1], line_number)
        except LanguageError as error:
            raise FigureLoomBioError(
                _render_error(text[:-1], error),
                line_number=error.line or line_number,
            ) from error
        instructions.append(Instruction(node.action, line_number, node.values, node))
    return instructions


def parse_program(source: str) -> ProgramNodeRoot:
    root: list = []
    recipes: dict[str, RecipeNode] = {}
    stack: list[tuple[int, list]] = [(-4, root)]
    last_if: dict[int, IfNode] = {}

    for line_number, raw in enumerate(str(source).splitlines(), start=1):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue
        leading = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if "\t" in leading or len(leading) % 4:
            raise LanguageError("Indent blocks with four spaces.", line=line_number, code="invalid_indentation")
        indent = len(leading)
        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        parent_indent, body = stack[-1]
        if indent != parent_indent + 4:
            raise LanguageError("This line is indented farther than the block above it.", line=line_number, code="invalid_indentation")

        if text.endswith(":"):
            header = text[:-1].strip()
            lower = header.casefold()
            if lower.startswith("make a recipe called "):
                name = header[len("Make a recipe called "):].strip()
                if not name:
                    raise LanguageError("A recipe header needs a name.", line=line_number, code="missing_recipe_name")
                node = RecipeNode(name, [], line_number)
                body.append(node)
                recipes[name.casefold()] = node
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue
            if lower.startswith("if "):
                branch = BranchNode(parse_condition(header[3:].strip(), line=line_number), [], line_number)
                node = IfNode([branch], [], line_number)
                body.append(node)
                last_if[indent] = node
                stack.append((indent, branch.body))
                continue
            if lower.startswith("otherwise if ") or lower.startswith("else if "):
                prefix = "otherwise if " if lower.startswith("otherwise if ") else "else if "
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else if directly after an If block.", line=line_number, code="orphan_else_if")
                branch = BranchNode(parse_condition(header[len(prefix):].strip(), line=line_number), [], line_number)
                node.branches.append(branch)
                stack.append((indent, branch.body))
                continue
            if lower in {"otherwise", "else"}:
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else directly after an If block.", line=line_number, code="orphan_else")
                stack.append((indent, node.otherwise))
                continue
            if lower.startswith("for every "):
                rest = header[len("For every "):].strip()
                if " in " in rest.casefold():
                    split_index = rest.casefold().index(" in ")
                    item = rest[:split_index].strip()
                    collection = rest[split_index + 4:].strip()
                else:
                    item = rest or "item"
                    collection = f"{item}s"
                if not item or not collection:
                    raise LanguageError("A loop needs both an item and a collection.", line=line_number, code="incomplete_loop")
                node = LoopNode(item, collection.casefold(), [], line_number)
                body.append(node)
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue
            raise LanguageError(f"I could not parse the block header “{header}”.", line=line_number, code="unknown_block")

        if not text.endswith("."):
            raise LanguageError("This instruction needs a period at the end.", line=line_number, code="missing_period")
        body.append(_parse_node(text[:-1], line_number))
        last_if.pop(indent, None)

    return ProgramNodeRoot(root, recipes)


def _known_command_words() -> set[str]:
    words: set[str] = set(expansion_words())
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
            "Use a simple bioinformatics operation such as Open, Keep, Remove, Show, Save, Count, Find, Check, Annotate, or Summarize."
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


__all__ = ["Instruction", "_known_command_words", "parse", "parse_program"]
