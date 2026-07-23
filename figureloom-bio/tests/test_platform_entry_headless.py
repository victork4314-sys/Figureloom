from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PlatformEntryHeadlessTests(unittest.TestCase):
    def test_test_and_updater_self_tests_enable_qt_offscreen_before_import(self) -> None:
        for name in ("test_entry.py", "manager_entry.py"):
            with self.subTest(name=name):
                source = (ROOT / "platform" / name).read_text(encoding="utf-8")
                ast.parse(source)
                self.assertIn('if "--self-test" in sys.argv', source)
                self.assertIn('os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")', source)
                self.assertIn("from figureloom_bio import platform_qt_tools", source)
                self.assertIn("install_platform_tool_safety(platform_qt_tools)", source)
                self.assertLess(
                    source.index('os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")'),
                    source.index("from figureloom_bio import platform_qt_tools"),
                )


if __name__ == "__main__":
    unittest.main()
