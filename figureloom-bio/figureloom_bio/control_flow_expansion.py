from __future__ import annotations


def install_control_flow_expansion() -> None:
    from . import control_flow
    from .parser import parse_program

    control_flow.parse_semantic_program = parse_program


__all__ = ["install_control_flow_expansion"]
