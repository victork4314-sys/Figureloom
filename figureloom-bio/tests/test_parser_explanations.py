from __future__ import annotations

import re
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.language_manifest import language_manifest
from figureloom_bio.parser import _known_command_words, parse


class ParserExplanationTests(unittest.TestCase):
    def test_known_command_word_gets_a_specific_sentence_shape_explanation(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Create volcano plot from effect and p_value.")
        message = caught.exception.plain_message()
        self.assertIn("Line 1", message)
        self.assertIn("I recognize the command word Create", message)
        self.assertIn("exact wording or word order", message)
        self.assertIn("Open Sentences", message)
        self.assertIn("Create volcano plot from effect and p_value.", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_every_command_shown_in_sentences_is_known_automatically(self) -> None:
        manifest_words = set()
        for command in language_manifest().commands:
            match = re.match(r"[^\s:,.]+", command.example.strip())
            self.assertIsNotNone(match, command.example)
            manifest_words.add(match.group(0).casefold())
        self.assertTrue(manifest_words)
        self.assertTrue(manifest_words.issubset(_known_command_words()))

    def test_unknown_command_word_explains_the_first_word(self) -> None:
        with self.assertRaises(FigureLoomBioError) as caught:
            parse("Wibble the sequences.")
        message = caught.exception.plain_message()
        self.assertIn("The first word Wibble", message)
        self.assertIn("not a FigureLoom Bio command word", message)
        self.assertIn("Start the sentence with a command", message)
        self.assertNotIn("I do not understand this instruction yet", message)

    def test_valid_instruction_still_parses_normally(self) -> None:
        instruction = parse("Open the file samples.csv.")[0]
        self.assertEqual(instruction.action, "open_file")
        self.assertEqual(instruction.values, ("samples.csv",))


if __name__ == "__main__":
    unittest.main()
