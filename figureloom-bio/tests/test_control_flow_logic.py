import unittest

from figureloom_bio.cli import VOCABULARY_GROUPS, _vocabulary_forms
from figureloom_bio.control_flow import IfBlock, Statement, parse_program, uses_control_flow
from figureloom_bio.control_flow_logic import normalize_control_flow_source, simplify_condition


class ControlFlowLogicTests(unittest.TestCase):
    def test_boolean_literals_simplify_with_and_or_not(self):
        self.assertEqual(
            simplify_condition("true"),
            "the result is empty or the result is not empty",
        )
        self.assertEqual(
            simplify_condition("false"),
            "the result is empty and the result is not empty",
        )
        self.assertEqual(
            simplify_condition("true and the result is not empty"),
            "the result is not empty",
        )
        self.assertEqual(
            simplify_condition("false or the result is not empty"),
            "the result is not empty",
        )
        self.assertEqual(
            simplify_condition("not false"),
            "the result is empty or the result is not empty",
        )

    def test_else_and_else_if_are_normal_language_aliases(self):
        source = """If false:
    Say first.
Else if true:
    Say second.
Else:
    Say third.
"""
        normalized = normalize_control_flow_source(source)
        self.assertIn(
            "Otherwise if the result is empty or the result is not empty:",
            normalized,
        )
        self.assertIn("Otherwise:", normalized)

        program = parse_program(source)
        self.assertTrue(uses_control_flow(source))
        self.assertEqual(len(program.body), 1)
        block = program.body[0]
        self.assertIsInstance(block, IfBlock)
        self.assertEqual(len(block.branches), 2)
        self.assertIsInstance(block.branches[0].body[0], Statement)
        self.assertIsInstance(block.branches[1].body[0], Statement)
        self.assertIsInstance(block.otherwise[0], Statement)

    def test_make_sure_accepts_boolean_literals(self):
        normalized = normalize_control_flow_source("Make sure true and not false.")
        self.assertEqual(
            normalized,
            "Make sure the result is empty or the result is not empty.",
        )

    def test_words_command_counts_control_flow_and_boolean_words(self):
        self.assertIn("flow", VOCABULARY_GROUPS)
        self.assertIn("logic", VOCABULARY_GROUPS)
        self.assertIn("booleans", VOCABULARY_GROUPS)
        forms = {value.casefold() for value in _vocabulary_forms()}
        for word in ("if", "else", "else if", "and", "or", "not", "true", "false"):
            self.assertIn(word, forms)


if __name__ == "__main__":
    unittest.main()
