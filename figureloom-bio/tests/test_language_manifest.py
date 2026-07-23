from __future__ import annotations

import unittest

from figureloom_bio.language_manifest import language_manifest


class LanguageManifestTests(unittest.TestCase):
    def test_manifest_loads_and_has_no_placeholders(self) -> None:
        manifest = language_manifest()
        self.assertEqual(manifest.file_extension, ".flbio")
        self.assertEqual(manifest.grammar["instruction_ending"], ".")
        self.assertEqual(manifest.grammar["block_header_ending"], ":")
        self.assertEqual(manifest.grammar["current_result_name"], "the file")
        self.assertGreaterEqual(len(manifest.commands), 100)
        for command in manifest.commands:
            self.assertNotIn("TODO", command.example.upper())
            self.assertNotIn(":.", command.example)

    def test_required_reported_sentences_are_canonical(self) -> None:
        manifest = language_manifest()
        examples = {command.example for command in manifest.commands}
        for sentence in (
            "Check the file.",
            "Count the file.",
            "Show the file.",
            "Save the file as output.fasta.",
            "If the result is not empty:",
            "Otherwise:",
            "For every sample in samples:",
            "Make a recipe called Clean reads:",
        ):
            with self.subTest(sentence=sentence):
                self.assertIn(sentence, examples)

    def test_every_command_uses_a_known_theme_and_correct_ending(self) -> None:
        manifest = language_manifest()
        themes = {theme.id for theme in manifest.themes}
        for command in manifest.commands:
            with self.subTest(command=command.id):
                self.assertIn(command.theme, themes)
                ending = ":" if command.kind == "header" else "."
                self.assertTrue(command.example.endswith(ending))


if __name__ == "__main__":
    unittest.main()
