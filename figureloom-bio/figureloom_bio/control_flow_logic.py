from __future__ import annotations

import re
from collections.abc import Callable


_TRUE = "true"
_FALSE = "false"


def _literal(value: bool) -> tuple[str, bool]:
    return ("literal", value)


def _raw(value: str) -> tuple[str, str]:
    return ("raw", value.strip())


def _simplify_atom(source: str):
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


def _simplify_and(source: str):
    parts = [_simplify_atom(part) for part in re.split(r"\s+and\s+", source, flags=re.IGNORECASE)]
    if any(kind == "literal" and value is False for kind, value in parts):
        return _literal(False)
    remaining = [value for kind, value in parts if kind != "literal"]
    if not remaining:
        return _literal(True)
    return _raw(" and ".join(remaining))


def simplify_condition(source: str) -> str:
    """Simplify Boolean words without replacing them with fake data checks."""

    parts = [_simplify_and(part) for part in re.split(r"\s+or\s+", source, flags=re.IGNORECASE)]
    if any(kind == "literal" and value is True for kind, value in parts):
        return _TRUE
    remaining = [value for kind, value in parts if kind != "literal"]
    if not remaining:
        return _FALSE
    return " or ".join(remaining)


def evaluate_condition(source: str, evaluate_atom: Callable[[str], bool]) -> bool:
    """Evaluate true, false, and, or, and not before delegating data checks."""

    text = str(source).strip()
    parts = re.split(r"\s+or\s+", text, flags=re.IGNORECASE)
    if len(parts) > 1:
        return any(evaluate_condition(part, evaluate_atom) for part in parts)

    parts = re.split(r"\s+and\s+", text, flags=re.IGNORECASE)
    if len(parts) > 1:
        return all(evaluate_condition(part, evaluate_atom) for part in parts)

    if re.match(r"^not\s+", text, re.IGNORECASE):
        remainder = re.sub(r"^not\s+", "", text, count=1, flags=re.IGNORECASE)
        return not evaluate_condition(remainder, evaluate_atom)

    if re.fullmatch(r"true", text, re.IGNORECASE):
        return True
    if re.fullmatch(r"false", text, re.IGNORECASE):
        return False
    return bool(evaluate_atom(text))


def _normalize_flow_statement(text: str) -> str:
    """Lower every accepted flow synonym to the one execution form the runner uses."""

    from .language_aliases import normalize_sentence
    from .language_compiler_runtime import compile_for_runtime

    normalized = normalize_sentence(text)
    core = normalized[:-1].strip() if normalized.endswith(".") else normalized.strip()
    compiled = compile_for_runtime(core)
    if compiled is None:
        return normalized

    action = compiled.action
    values = compiled.values
    if action == "repeat_program" and values:
        return f"Run this program {values[0]} times."
    if action == "stop_program":
        return "Stop the program."
    if action == "continue_sample":
        return "Continue with the next sample."
    if action == "skip_sample":
        return "Skip this sample."
    if action == "mark_review":
        return "Mark the sample for review."
    if action == "show_warning":
        message = values[0] if values else "This sample needs attention."
        return f"Show a warning saying {message}."
    if action == "say" and values:
        return f"Say {values[0]}."
    if action == "use_recipe" and values:
        return f"Use the recipe {values[0]}."
    if action == "use_named_result" and values:
        return f"Use the result {values[0]}."
    return normalized


def normalize_control_flow_source(source: str) -> str:
    """Accept ordinary flow wording and preserve the condition the user wrote."""

    output: list[str] = []
    for line in str(source).splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            output.append(line)
            continue

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

        if stripped.endswith(":"):
            output.append(line)
            continue

        indent = line[: len(line) - len(line.lstrip(" \t"))]
        output.append(indent + _normalize_flow_statement(stripped))
    return "\n".join(output)


def install_control_flow_logic() -> None:
    from . import control_flow

    if getattr(control_flow, "_figureloom_logic_installed", False):
        return

    original_parse_program = control_flow.parse_program
    original_uses_control_flow = control_flow.uses_control_flow
    original_condition = control_flow._condition

    def parse_program(source: str):
        return original_parse_program(normalize_control_flow_source(source))

    def uses_control_flow(source: str) -> bool:
        normalized = normalize_control_flow_source(source)
        return original_uses_control_flow(normalized) or bool(
            re.search(r"(^|\n)\s*(?:Else|Else if)\b", source, re.IGNORECASE)
        )

    def condition(text: str, context, line_number: int) -> bool:
        return evaluate_condition(
            text,
            lambda atom: original_condition(atom, context, line_number),
        )

    control_flow.parse_program = parse_program
    control_flow.uses_control_flow = uses_control_flow
    control_flow._condition = condition
    control_flow._figureloom_logic_installed = True


__all__ = [
    "evaluate_condition",
    "install_control_flow_logic",
    "normalize_control_flow_source",
    "simplify_condition",
]
