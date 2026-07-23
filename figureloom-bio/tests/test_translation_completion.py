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


class TranslationCompletionTests(unittest.TestCase):
    def test_new_targets_are_registered(self) -> None:
        self.assertEqual(TARGET_EXTENSIONS["julia"], ".jl")
        self.assertEqual(TARGET_EXTENSIONS["ruby"], ".rb")
        self.assertEqual(TARGET_EXTENSIONS["perl"], ".pl")
        self.assertEqual(TARGET_EXTENSIONS["powershell"], ".ps1")
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


if __name__ == "__main__":
    unittest.main()
