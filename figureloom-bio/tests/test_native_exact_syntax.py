from __future__ import annotations

import ast
from pathlib import Path
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


if __name__ == "__main__":
    unittest.main()
