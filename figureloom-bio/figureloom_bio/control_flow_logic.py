from __future__ import annotations

from typing import Callable

from .semantic_language import ConditionNode, parse_condition


def simplify_condition(source: str) -> str:
    """Return a deterministic Boolean simplification for display-only callers.

    Parsing and execution use :func:`parse_condition`; this helper never rewrites
    program source before parsing.
    """
    node = parse_condition(source)

    def simplify(item: ConditionNode) -> ConditionNode:
        if item.kind == "not":
            child = simplify(item.value)
            if child.kind == "literal":
                return ConditionNode("literal", value=not bool(child.value), source=item.source)
            return ConditionNode("not", value=child, source=item.source)
        if item.kind == "boolean":
            left = simplify(item.left)
            right = simplify(item.right)
            if item.operator == "and":
                if left.kind == "literal" and left.value is False:
                    return left
                if right.kind == "literal" and right.value is False:
                    return right
                if left.kind == "literal" and left.value is True:
                    return right
                if right.kind == "literal" and right.value is True:
                    return left
            else:
                if left.kind == "literal" and left.value is True:
                    return left
                if right.kind == "literal" and right.value is True:
                    return right
                if left.kind == "literal" and left.value is False:
                    return right
                if right.kind == "literal" and right.value is False:
                    return left
            return ConditionNode("boolean", left=left, operator=item.operator, right=right, source=item.source)
        return item

    def render(item: ConditionNode) -> str:
        if item.kind == "literal":
            return "true" if item.value else "false"
        if item.kind == "not":
            return f"not {render(item.value)}"
        if item.kind == "boolean":
            return f"{render(item.left)} {item.operator} {render(item.right)}"
        return str(item.source or item.value or "").strip()

    return render(simplify(node))


def evaluate_condition(source: str, evaluate_atom: Callable[[str], bool]) -> bool:
    """Evaluate the shared condition AST using a caller-provided atom resolver."""
    root = parse_condition(source)

    def evaluate(node: ConditionNode) -> bool:
        if node.kind == "literal":
            return bool(node.value)
        if node.kind == "not":
            return not evaluate(node.value)
        if node.kind == "boolean" and node.operator == "and":
            return evaluate(node.left) and evaluate(node.right)
        if node.kind == "boolean" and node.operator == "or":
            return evaluate(node.left) or evaluate(node.right)
        return bool(evaluate_atom(str(node.source or "").strip()))

    return evaluate(root)


def normalize_control_flow_source(source: str) -> str:
    """Deprecated compatibility API; program source is never rewritten."""
    return str(source)


def install_control_flow_logic() -> None:
    """No installation is required; control flow uses the shared AST directly."""


__all__ = [
    "evaluate_condition",
    "install_control_flow_logic",
    "normalize_control_flow_source",
    "simplify_condition",
]
