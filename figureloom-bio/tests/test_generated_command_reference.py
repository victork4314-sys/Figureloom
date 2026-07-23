from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


class GeneratedCommandReferenceTests(unittest.TestCase):
    @property
    def root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def test_checked_in_reference_matches_the_tested_language_catalog(self) -> None:
        script = self.root / "scripts" / "generate-bio-command-reference.py"
        spec = importlib.util.spec_from_file_location("generate_bio_command_reference", script)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        reference = self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md"
        self.assertEqual(reference.read_text(encoding="utf-8"), module.render())

    def test_reference_states_the_exact_audited_sentence_counts(self) -> None:
        reference = (self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md").read_text(encoding="utf-8")
        self.assertIn("**Canonical sentences:** 161", reference)
        self.assertIn("**Accepted alternate wordings:** 99", reference)
        self.assertIn("**Total tested sentences shown here:** 260", reference)
        self.assertIn("`Normalize the counts in expression.`", reference)


if __name__ == "__main__":
    unittest.main()
