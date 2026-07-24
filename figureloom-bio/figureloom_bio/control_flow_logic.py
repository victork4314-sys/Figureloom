from __future__ import annotations

import re


_TRUE = "the result is empty or the result is not empty"
_FALSE = "the result is empty and the result is not empty"


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
    parts = [_simplify_and(part) for part in re.split(r"\s+or\s+", source, flags=re.IGNORECASE)]
    if any(kind == "literal" and value is True for kind, value in parts):
        return _TRUE
    remaining = [value for kind, value in parts if kind != "literal"]
    if not remaining:
        return _FALSE
    return " or ".join(remaining)


def normalize_control_flow_source(source: str) -> str:
    output: list[str] = []
    for line in str(source).splitlines():
        match = re.fullmatch(
            r"(\s*)(?:Else|Otherwise)(?:,)?\s+if\s+(.+):\s*",
            line,
            re.IGNORECASE,
        )
        if match:
            output.append(f"{match.group(1)}Otherwise if {simplify_condition(match.group(2))}:")
            continue

        match = re.fullmatch(r"(\s*)If\s+(.+):\s*", line, re.IGNORECASE)
        if match:
            output.append(f"{match.group(1)}If {simplify_condition(match.group(2))}:")
            continue

        match = re.fullmatch(r"(\s*)(?:Else|Otherwise)\s*:\s*", line, re.IGNORECASE)
        if match:
            output.append(f"{match.group(1)}Otherwise:")
            continue

        output.append(line)
    return "\n".join(output)


def install_control_flow_logic() -> None:
    from . import control_flow

    if getattr(control_flow, "_figureloom_logic_installed", False):
        return

    original_parse_program = control_flow.parse_program
    original_uses_control_flow = control_flow.uses_control_flow

    def parse_program(source: str):
        return original_parse_program(normalize_control_flow_source(source))

    def uses_control_flow(source: str) -> bool:
        normalized = normalize_control_flow_source(source)
        return original_uses_control_flow(normalized) or bool(
            re.search(r"(^|\n)\s*(?:Else|Else if)\b", source, re.IGNORECASE)
        )

    control_flow.parse_program = parse_program
    control_flow.uses_control_flow = uses_control_flow
    control_flow._figureloom_logic_installed = True
