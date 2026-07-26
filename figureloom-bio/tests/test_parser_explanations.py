from __future__ import annotations

import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import _known_command_words, parse
from figureloom_bio.semantic_language import GRAMMAR


class ParserExplanationTests(unittest.TestCase):
    def test_incomplete_operation_gets_a_grammar_explanation(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Create something scientific somehow.")
        message = caught.exception.plain_message()
        self.assertIn("Line 1", message)
        self.assertIn("grammar", message.casefold())
        self.assertIn("target", message.casefold())
        self.assertNotIn("Open Sentences", message)
        self.assertNotIn("exact wording", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_known_words_come_from_the_grammar(self) -> None:
        expected: set[str] = set()
        for category in (
            "operations",
            "targets",
            "comparisons",
            "roles",
            "modifiers",
            "units",
            "booleans",
        ):
            for forms in GRAMMAR[category].values():
                for form in forms:
                    expected.update(str(form).casefold().split())
        self.assertTrue(expected)
        self.assertTrue(expected.issubset(_known_command_words()))

    def test_unknown_operation_word_is_explained(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Wibble the sequences.")
        message = caught.exception.plain_message()
        self.assertIn("missing an operation", message.casefold())
        self.assertIn("Wibble", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_valid_freely_worded_instruction_parses(self) -> None:
        instruction = parse("Please load samples.csv.")[0]
        self.assertEqual(instruction.action, "open_file")
        self.assertEqual(instruction.values, ("samples.csv",))
        self.assertEqual(instruction.node.operation, "open")
        self.assertEqual(instruction.node.targets, ("file",))


if __name__ == "__main__":
    unittest.main()
