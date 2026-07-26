from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio.cli import VOCABULARY_GROUPS, _vocabulary_forms
from figureloom_bio.control_flow import IfBlock, Statement, parse_program, run_flow_program, uses_control_flow
from figureloom_bio.control_flow_logic import (
    evaluate_condition,
    normalize_control_flow_source,
    simplify_condition,
)


class ControlFlowLogicTests(unittest.TestCase):
    def test_boolean_literals_are_real_language_values(self):
        self.assertEqual(simplify_condition("true"), "true")
        self.assertEqual(simplify_condition("false"), "false")
        self.assertEqual(
            simplify_condition("true and the result is not empty"),
            "result is not empty",
        )
        self.assertEqual(
            simplify_condition("false or the result is not empty"),
            "result is not empty",
        )
        self.assertEqual(simplify_condition("not false"), "true")

        values = {"file exists": True, "file is empty": False}
        atom = values.__getitem__
        self.assertTrue(evaluate_condition("true", atom))
        self.assertFalse(evaluate_condition("false", atom))
        self.assertTrue(evaluate_condition("true and the file exists", atom))
        self.assertTrue(evaluate_condition("false or the file exists", atom))
        self.assertTrue(evaluate_condition("not the file is empty", atom))

    def test_else_and_else_if_are_core_language_headers(self):
        source = """If false:
    Say first.
Else if true:
    Say second.
Else:
    Say third.
"""
        self.assertEqual(normalize_control_flow_source(source), source)

        program = parse_program(source)
        self.assertTrue(uses_control_flow(source))
        self.assertEqual(len(program.body), 1)
        block = program.body[0]
        self.assertIsInstance(block, IfBlock)
        self.assertEqual(len(block.branches), 2)
        self.assertIsInstance(block.branches[0].body[0], Statement)
        self.assertIsInstance(block.branches[1].body[0], Statement)
        self.assertIsInstance(block.otherwise[0], Statement)

    def test_real_program_runs_else_and_skips_the_false_branch(self):
        source = """If false:
    Say The false branch did not run.
Else:
    Say The correct branch ran.
"""
        rendered = self._run(source)
        self.assertIn("The correct branch ran", rendered)
        self.assertNotIn("intentionally does not exist", rendered)

    def test_real_program_runs_else_if_with_boolean_words(self):
        source = """If false:
    Say The wrong first branch ran.
Else if true and not false:
    Say The correct Else if branch ran.
Else:
    Say The wrong final branch ran.
"""
        rendered = self._run(source)
        self.assertIn("The correct Else if branch ran", rendered)
        self.assertNotIn("The wrong first branch ran", rendered)
        self.assertNotIn("The wrong final branch ran", rendered)

    def test_make_sure_uses_real_boolean_values(self):
        rendered = self._run("Make sure true and not false.\nSay The check passed.\n")
        self.assertIn("The check passed", rendered)

    def test_everyday_flow_synonyms_execute_in_the_shared_runtime(self):
        source = """If true:
    Print branch started.
    Warning Check this sample.
    End the program.
"""
        self.assertEqual(normalize_control_flow_source(source), source)

        rendered = self._run(source)
        self.assertIn("branch started", rendered)
        self.assertIn("Check this sample", rendered)
        self.assertIn("Program stopped", rendered)

    def test_words_command_counts_control_flow_and_boolean_words(self):
        self.assertIn("flow", VOCABULARY_GROUPS)
        self.assertIn("logic", VOCABULARY_GROUPS)
        self.assertIn("booleans", VOCABULARY_GROUPS)
        forms = {value.casefold() for value in _vocabulary_forms()}
        for word in ("if", "else", "else if", "otherwise", "and", "or", "not", "true", "false"):
            self.assertIn(word, forms)

    @staticmethod
    def _run(source: str) -> str:
        with TemporaryDirectory() as folder:
            program = Path(folder) / "logic-test.flbio"
            program.write_text(source, encoding="utf-8")
            return run_flow_program(program, source).render()


if __name__ == "__main__":
    unittest.main()
