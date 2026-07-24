from __future__ import annotations

from pathlib import Path
import re
from typing import Callable


LiteralOrText = tuple[str, bool | str]


def _literal(value: bool) -> LiteralOrText:
    return ("literal", value)


def _raw(value: str) -> LiteralOrText:
    return ("raw", value.strip())


def _simplify_atom(source: str) -> LiteralOrText:
    text = source.strip()
    negate = False
    while re.match(r"^not\s+", text, re.IGNORECASE):
        negate = not negate
        text = re.sub(r"^not\s+", "", text, count=1, flags=re.IGNORECASE).strip()

    if re.fullmatch(r"true", text, re.IGNORECASE):
        return _literal(not negate)
    if re.fullmatch(r"false", text, re.IGNORECASE):
        return _literal(negate)
    return _raw(("not " if negate else "") + text)


def _simplify_and(source: str) -> LiteralOrText:
    parts = [_simplify_atom(part) for part in re.split(r"\s+and\s+", source, flags=re.IGNORECASE)]
    if any(kind == "literal" and value is False for kind, value in parts):
        return _literal(False)
    remaining = [str(value) for kind, value in parts if kind != "literal"]
    if not remaining:
        return _literal(True)
    return _raw(" and ".join(remaining))


def simplify_condition(source: str) -> str:
    """Simplify plain Boolean words without replacing them with fake data checks."""

    parts = [_simplify_and(part) for part in re.split(r"\s+or\s+", source, flags=re.IGNORECASE)]
    if any(kind == "literal" and value is True for kind, value in parts):
        return "true"
    remaining = [str(value) for kind, value in parts if kind != "literal"]
    if not remaining:
        return "false"
    return " or ".join(remaining)


def evaluate_condition(source: str, evaluate_atom: Callable[[str], bool]) -> bool:
    """Evaluate FigureLoom Bio's simple Boolean grammar.

    The language intentionally supports only ordinary ``or``, ``and``, ``not``,
    ``true`` and ``false`` around the existing spoken conditions. ``and`` binds
    more tightly than ``or``. Parentheses are deliberately not required.
    """

    text = source.strip()
    alternatives = re.split(r"\s+or\s+", text, flags=re.IGNORECASE)
    if len(alternatives) > 1:
        return any(evaluate_condition(part, evaluate_atom) for part in alternatives)

    requirements = re.split(r"\s+and\s+", text, flags=re.IGNORECASE)
    if len(requirements) > 1:
        return all(evaluate_condition(part, evaluate_atom) for part in requirements)

    if re.match(r"^not\s+", text, re.IGNORECASE):
        remainder = re.sub(r"^not\s+", "", text, count=1, flags=re.IGNORECASE)
        return not evaluate_condition(remainder, evaluate_atom)
    if re.fullmatch(r"true", text, re.IGNORECASE):
        return True
    if re.fullmatch(r"false", text, re.IGNORECASE):
        return False
    return evaluate_atom(text)


def normalize_control_flow_source(source: str) -> str:
    """Accept both Else and Otherwise while preserving the condition itself."""

    output: list[str] = []
    for line in str(source).splitlines():
        match = re.fullmatch(
            r"(\s*)(?:Else|Otherwise)(?:,)?\s+if\s+(.+):\s*",
            line,
            re.IGNORECASE,
        )
        if match:
            output.append(f"{match.group(1)}Otherwise if {match.group(2).strip()}:")
            continue

        match = re.fullmatch(r"(\s*)(?:Else|Otherwise)\s*:\s*", line, re.IGNORECASE)
        if match:
            output.append(f"{match.group(1)}Otherwise:")
            continue

        output.append(line)
    return "\n".join(output)


def install_control_flow_logic() -> None:
    """Install one shared control-flow frontend for CLI and native applications."""

    from . import control_flow

    if getattr(control_flow, "_figureloom_logic_installed", False):
        return

    original_parse_program = control_flow.parse_program
    original_uses_control_flow = control_flow.uses_control_flow
    original_run_flow_program = control_flow.run_flow_program
    original_condition = control_flow._condition

    def parse_program(source: str):
        return original_parse_program(normalize_control_flow_source(source))

    def uses_control_flow(source: str) -> bool:
        return original_uses_control_flow(normalize_control_flow_source(source))

    def condition(text: str, context, line_number: int) -> bool:
        return evaluate_condition(
            text,
            lambda atom: original_condition(atom, context, line_number),
        )

    def run_flow_program(
        path: Path,
        source: str,
        *,
        allow_tools: bool = False,
    ):
        return original_run_flow_program(
            path,
            normalize_control_flow_source(source),
            allow_tools=allow_tools,
        )

    control_flow.parse_program = parse_program
    control_flow.uses_control_flow = uses_control_flow
    control_flow._condition = condition
    control_flow.run_flow_program = run_flow_program
    control_flow._figureloom_logic_installed = True


__all__ = [
    "evaluate_condition",
    "install_control_flow_logic",
    "normalize_control_flow_source",
    "simplify_condition",
]
