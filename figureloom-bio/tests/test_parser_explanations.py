from __future__ import annotations

import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.language_compiler import vocabulary_words
from figureloom_bio.parser import _known_command_words, parse


class ParserExplanationTests(unittest.TestCase):
    def test_incomplete_known_operation_gets_a_compiler_explanation(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Create something scientific somehow.")
        message = caught.exception.plain_message()
        self.assertIn("Line 1", message)
        self.assertIn("could not be compiled", message)
        self.assertIn("operation", message)
        self.assertIn("target", message)
        self.assertIn("wording and order do not have to copy an example", message)
        self.assertNotIn("Open Sentences", message)
        self.assertNotIn("exact wording", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_every_vocabulary_word_is_known_automatically(self) -> None:
        words = set(vocabulary_words())
        self.assertTrue(words)
        self.assertTrue(words.issubset(_known_command_words()))

    def test_unknown_operation_word_is_explained(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Wibble the sequences.")
        message = caught.exception.plain_message()
        self.assertIn("could not find an operation word", message)
        self.assertIn("Wibble", message)
        self.assertIn("Use an operation such as", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_valid_freely_worded_instruction_parses(self) -> None:
        instruction = parse("Please load samples.csv.")[0]
        self.assertEqual(instruction.action, "open_file")
        self.assertEqual(instruction.values, ("samples.csv",))


if __name__ == "__main__":
    unittest.main()
