from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio.addon_packages import expand_addons
from figureloom_bio.control_flow import run_flow_program
from figureloom_bio.parser import parse


class BuiltInLanguageGateTests(unittest.TestCase):
    def test_microbiology_parses_without_a_declaration(self) -> None:
        instructions = expand_addons(parse("Prepare bacterial reads.\n"))
        self.assertEqual(
            [instruction.action for instruction in instructions],
            [
                "check_quality",
                "remove_adapters",
                "remove_low_quality_default",
                "remove_shorter",
                "check_quality",
            ],
        )

    def test_microbiology_runs_inside_flow_without_a_declaration(self) -> None:
        fastq = "@read-1\n" + ("ACGT" * 20) + "\n+\n" + ("I" * 80) + "\n"
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(fastq, encoding="utf-8")
            path = root / "program.flbio"
            source = (
                "Open the file reads.fastq.\n"
                "If at least 1 reads remain:\n"
                "    Prepare bacterial reads.\n"
                "    Count the reads.\n"
            )
            path.write_text(source, encoding="utf-8")
            rendered = run_flow_program(path, source).render()
            self.assertIn("Decision", rendered)
            self.assertIn("Sequences", rendered)

    def test_old_declaration_remains_harmless(self) -> None:
        instructions = expand_addons(
            parse("Use .microbiology.\nPrepare bacterial reads.\n")
        )
        self.assertNotIn(
            "legacy_capability_declaration",
            [instruction.action for instruction in instructions],
        )


if __name__ == "__main__":
    unittest.main()
