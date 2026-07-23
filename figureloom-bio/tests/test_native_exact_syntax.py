from __future__ import annotations

import ast
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SYNTAX = ROOT / "figureloom_bio" / "native_syntax_web_exact.py"
ENTRY = ROOT / "platform" / "ide_entry.py"


class NativeExactSyntaxTests(unittest.TestCase):
    def test_exact_syntax_layer_is_valid_and_installed_last(self) -> None:
        source = SYNTAX.read_text(encoding="utf-8")
        entry = ENTRY.read_text(encoding="utf-8")
        ast.parse(source)
        ast.parse(entry)
        self.assertIn("class ExactWebSyntaxHighlighter(WebSyntaxHighlighter)", source)
        self.assertIn("self.setFormat(leading, len(stripped), self.command)", source)
        for layer in ("self.word", "self.file", "self.value", "self.field", "self.punctuation"):
            self.assertIn(layer, source)
        self.assertLess(entry.index("install_web_parity(native_ide)"), entry.index("install_exact_web_syntax()"))

    def test_visual_syntax_check_cannot_close_the_ide_on_an_unexpected_parser_error(self) -> None:
        source = SYNTAX.read_text(encoding="utf-8")
        self.assertIn("def _accepted(self, stripped: str) -> bool", source)
        self.assertIn("return super()._accepted(stripped)", source)
        self.assertIn("except Exception", source)
        self.assertIn("return False", source)

    def test_filename_pattern_accepts_sentence_punctuation_but_not_longer_fake_extensions(self) -> None:
        tree = ast.parse(SYNTAX.read_text(encoding="utf-8"))
        pattern = None
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            if not any(isinstance(target, ast.Name) and target.id == "FILE_PATTERN" for target in node.targets):
                continue
            if isinstance(node.value, ast.Call) and node.value.args and isinstance(node.value.args[0], ast.Constant):
                pattern = node.value.args[0].value
                break
        self.assertIsInstance(pattern, str)
        compiled = re.compile(pattern, re.IGNORECASE)
        self.assertEqual(compiled.search("Open the file samples.csv.").group(0), "samples.csv")
        self.assertEqual(compiled.search("Open the file reads.fastq:").group(0), "reads.fastq")
        self.assertIsNone(compiled.search("Open the file samples.csv.backup."))


if __name__ == "__main__":
    unittest.main()
