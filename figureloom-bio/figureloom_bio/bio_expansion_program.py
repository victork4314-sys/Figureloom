from __future__ import annotations

import re

from . import semantic_language
from .bio_expansion import parse_expanded_instruction
from .semantic_language import (
    BranchNode,
    IfNode,
    LanguageError,
    LoopNode,
    ProgramNodeRoot,
    RecipeNode,
    parse_condition,
    parse_instruction,
)


def _parse_any_instruction(source: str, line: int):
    try:
        return parse_instruction(source, line=line)
    except LanguageError as base_error:
        try:
            return parse_expanded_instruction(source, line=line)
        except LanguageError:
            raise base_error


def parse_expanded_program(source: str) -> ProgramNodeRoot:
    root = ProgramNodeRoot(body=[], recipes={})
    stack: list[tuple[int, list]] = [(-4, root.body)]
    last_if: dict[int, IfNode] = {}

    for line, raw in enumerate(str(source).splitlines(), start=1):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue

        leading = re.match(r"^\s*", raw).group(0)
        if "\t" in leading or len(leading) % 4:
            raise LanguageError("Indent blocks with four spaces.", line=line, code="invalid_indent")
        indent = len(leading)
        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        parent_indent, parent_body = stack[-1]
        if indent != parent_indent + 4:
            raise LanguageError(
                "This line is indented farther than the block above it.",
                line=line,
                code="invalid_indent",
            )

        if text.endswith(":"):
            header = text[:-1].strip()
            lowered = header.casefold()

            if lowered.startswith("make a recipe called "):
                name = header[len("Make a recipe called "):].strip()
                if not name:
                    raise LanguageError("A recipe header needs a name.", line=line, code="missing_recipe_name")
                node = RecipeNode(name=name, body=[], line=line)
                parent_body.append(node)
                root.recipes[name.casefold()] = node
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue

            if lowered.startswith("if "):
                branch = BranchNode(condition=parse_condition(header[3:].strip(), line=line), body=[], line=line)
                node = IfNode(branches=[branch], otherwise=[], line=line)
                parent_body.append(node)
                last_if[indent] = node
                stack.append((indent, branch.body))
                continue

            if lowered.startswith("otherwise if ") or lowered.startswith("else if "):
                prefix = "otherwise if " if lowered.startswith("otherwise if ") else "else if "
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else if directly after an If block.", line=line, code="orphan_else_if")
                branch = BranchNode(condition=parse_condition(header[len(prefix):].strip(), line=line), body=[], line=line)
                node.branches.append(branch)
                stack.append((indent, branch.body))
                continue

            if lowered in {"otherwise", "else"}:
                node = last_if.get(indent)
                if node is None:
                    raise LanguageError("Put Else directly after an If block.", line=line, code="orphan_else")
                stack.append((indent, node.otherwise))
                continue

            if lowered.startswith("for every "):
                rest = header[len("For every "):]
                match = re.match(r"^(.*?)\s+in\s+(.+)$", rest, re.I)
                item = ((match.group(1) if match else rest).strip() or "item")
                collection = ((match.group(2) if match else f"{item}s").strip().casefold())
                node = LoopNode(item=item, collection=collection, body=[], line=line)
                parent_body.append(node)
                stack.append((indent, node.body))
                last_if.pop(indent, None)
                continue

            raise LanguageError(f"I could not parse the block header “{header}”.", line=line, code="unknown_block")

        if not text.endswith("."):
            raise LanguageError("This instruction needs a period at the end.", line=line, code="missing_period")
        parent_body.append(_parse_any_instruction(text[:-1], line))
        last_if.pop(indent, None)

    return root


def install_expanded_program_parser() -> None:
    semantic_language.parse_program = parse_expanded_program


install_expanded_program_parser()


__all__ = ["install_expanded_program_parser", "parse_expanded_program"]
