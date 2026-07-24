from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


class GeneratedCommandReferenceTests(unittest.TestCase):
    @property
    def root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def test_checked_in_reference_matches_the_compiler_vocabulary(self) -> None:
        script = self.root / "scripts" / "generate-bio-command-reference.py"
        spec = importlib.util.spec_from_file_location("generate_bio_command_reference", script)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        reference = self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md"
        self.assertEqual(reference.read_text(encoding="utf-8"), module.render())

    def test_reference_describes_a_compiler_not_a_sentence_whitelist(self) -> None:
        reference = (self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md").read_text(encoding="utf-8")
        self.assertIn("## Compiler model", reference)
        self.assertIn("**Vocabulary forms:**", reference)
        self.assertIn("Examples are examples, not a whitelist.", reference)
        self.assertIn("`remove`", reference)
        self.assertIn("`sequence`", reference)
        self.assertIn("`below`", reference)
        self.assertNotIn("Canonical sentences", reference)


if __name__ == "__main__":
    unittest.main()
