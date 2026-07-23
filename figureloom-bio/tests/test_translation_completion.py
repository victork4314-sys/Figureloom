from __future__ import annotations

import base64
import re
import unittest

from figureloom_bio.translators import TARGET_EXTENSIONS, TARGET_LABELS, translate_source


FLOW_SOURCE = """Open the file samples.csv.
If the result is not empty:
    Say Samples were found.
Otherwise:
    Say No samples were found.
"""
FALLBACK_SOURCE = """Open the file sequences.fasta.
Keep sequences with at most 2 ambiguous bases.
Save the result as clean.fasta.
"""
DIRECT_SOURCE = """Open the file samples.csv.
Count the rows.
Save the result as counts.csv.
"""


class TranslationCompletionTests(unittest.TestCase):
    def test_all_nine_targets_are_registered(self) -> None:
        expected = {
            "python": ".py",
            "r": ".R",
            "bash": ".sh",
            "snakemake": ".smk",
            "nextflow": ".nf",
            "julia": ".jl",
            "ruby": ".rb",
            "perl": ".pl",
            "powershell": ".ps1",
        }
        for target, extension in expected.items():
            self.assertEqual(TARGET_EXTENSIONS[target], extension)
        self.assertEqual(TARGET_LABELS["powershell"], "PowerShell")

    def test_new_targets_preserve_the_exact_flbio_program(self) -> None:
        expected_payload = base64.b64encode(FLOW_SOURCE.encode("utf-8")).decode("ascii")
        for target in ("julia", "ruby", "perl", "powershell"):
            with self.subTest(target=target):
                translated = translate_source(FLOW_SOURCE, target, program_name="decisions.flbio")
                self.assertIn(expected_payload, translated.content)
                self.assertIn("flbio", translated.content)
                self.assertNotIn("TODO", translated.content)
                self.assertNotIn(":.", translated.content)
                self.assertEqual(translated.requirements, ["flbio"])
                self.assertEqual(translated.warnings, [])

    def test_existing_targets_accept_colon_headers_without_a_period(self) -> None:
        for target in ("python", "r", "bash", "snakemake", "nextflow"):
            with self.subTest(target=target):
                translated = translate_source(FLOW_SOURCE, target, program_name="decisions.flbio")
                self.assertNotIn(":.", translated.content)
                self.assertNotRegex(translated.content, re.compile(r"If the result is not empty:\."))
                self.assertIn("flbio run", translated.content)
                self.assertEqual(translated.warnings, [])

    def test_old_todo_translation_now_uses_the_real_runtime(self) -> None:
        for target in ("python", "r", "bash", "snakemake", "nextflow"):
            with self.subTest(target=target):
                translated = translate_source(
                    FALLBACK_SOURCE,
                    target,
                    program_name="ambiguous-bases.flbio",
                )
                self.assertIn("flbio run", translated.content)
                self.assertNotIn("TODO", translated.content)
                self.assertNotIn(":.", translated.content)
                self.assertEqual(translated.warnings, [])
                self.assertEqual(translated.requirements, ["bash", "flbio"])

    def test_exact_standalone_translation_stays_standalone(self) -> None:
        translated = translate_source(DIRECT_SOURCE, "bash", program_name="counts.flbio")
        self.assertIn('csvstat --count "$CURRENT"', translated.content)
        self.assertNotIn("flbio run", translated.content)
        self.assertNotIn("TODO", translated.content)
        self.assertEqual(translated.warnings, [])


if __name__ == "__main__":
    unittest.main()
