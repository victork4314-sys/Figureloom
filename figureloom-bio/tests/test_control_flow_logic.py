from figureloom_bio.control_flow import IfBlock, Statement, parse_program, uses_control_flow
from figureloom_bio.control_flow_logic import normalize_control_flow_source, simplify_condition


def test_boolean_literals_simplify_with_and_or_not():
    assert simplify_condition("true") == "the result is empty or the result is not empty"
    assert simplify_condition("false") == "the result is empty and the result is not empty"
    assert simplify_condition("true and the result is not empty") == "the result is not empty"
    assert simplify_condition("false or the result is not empty") == "the result is not empty"
    assert simplify_condition("not false") == "the result is empty or the result is not empty"


def test_else_and_else_if_are_normal_language_aliases():
    source = """If false:
    Say first.
Else if true:
    Say second.
Else:
    Say third.
"""
    normalized = normalize_control_flow_source(source)
    assert "Otherwise if the result is empty or the result is not empty:" in normalized
    assert "Otherwise:" in normalized

    program = parse_program(source)
    assert uses_control_flow(source)
    assert len(program.body) == 1
    block = program.body[0]
    assert isinstance(block, IfBlock)
    assert len(block.branches) == 2
    assert isinstance(block.branches[0].body[0], Statement)
    assert isinstance(block.branches[1].body[0], Statement)
    assert isinstance(block.otherwise[0], Statement)
