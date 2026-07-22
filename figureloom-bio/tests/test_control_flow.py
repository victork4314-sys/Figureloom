from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio.control_flow import parse_program, run_flow_program, uses_control_flow
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.translators import translate_source


FASTQ = """@read-1
ACGTACGT
+
IIIIIIII
@read-2
ACGT
+
IIII
"""


class ControlFlowTests(unittest.TestCase):
    def test_parses_if_otherwise_loop_and_recipe(self) -> None:
        program = parse_program(
            """Make a recipe called Prepare sample:
    Count the reads.

For every sample in samples:
    If the result is not empty:
        Use the recipe Prepare sample.
    Otherwise:
        Skip this sample.
"""
        )
        self.assertEqual(len(program.recipes), 1)
        self.assertEqual(len(program.body), 2)

    def test_rejects_inconsistent_indentation(self) -> None:
        with self.assertRaises(FigureLoomBioError):
            parse_program(
                """If the result is empty:
   Say Empty.
"""
            )

    def test_named_results_and_decision_history(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(FASTQ, encoding="utf-8")
            path = root / "program.flbio"
            source = """Open the file reads.fastq.
Call the result original reads.
Remove reads shorter than 5 bases.

If fewer than 2 reads remain and not the result is empty:
    Say The filter removed a read.
Otherwise:
    Say Nothing was removed.

Use original reads.
Count the reads.
"""
            path.write_text(source, encoding="utf-8")
            rendered = run_flow_program(path, source).render()
            self.assertIn("Named result", rendered)
            self.assertIn("Decision", rendered)
            self.assertIn("The condition was true.", rendered)
            self.assertIn("The filter removed a read", rendered)
            self.assertIn("Sequences\n\n2", rendered)

    def test_sample_loop_recipe_check_and_automatic_names(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sample-a.fastq").write_text(FASTQ, encoding="utf-8")
            (root / "sample-b.fastq").write_text(FASTQ, encoding="utf-8")
            path = root / "program.flbio"
            source = """Make a recipe called Prepare one sample:
    Make sure at least 1 reads remain.
    Count the reads.

Open all FASTQ files as samples.
For every sample in samples:
    Open the sample.
    Use the recipe Prepare one sample.
    Save the reads using the sample name.
"""
            path.write_text(source, encoding="utf-8")
            rendered = run_flow_program(path, source).render()
            self.assertTrue((root / "sample-a-result.fastq").exists())
            self.assertTrue((root / "sample-b-result.fastq").exists())
            self.assertIn("Sample 1 of 2", rendered)
            self.assertIn("The program followed the continue path.", rendered)

    def test_flow_detection_does_not_take_over_plain_programs(self) -> None:
        self.assertFalse(uses_control_flow("Open the file reads.fastq.\nCount the reads.\n"))
        self.assertTrue(uses_control_flow("If fewer than 10 reads remain:\n    Stop the program.\n"))

    def test_all_translation_targets_preserve_flow_program(self) -> None:
        source = """If the file reads.fastq exists:
    Say Ready.
Otherwise:
    Stop the program.
"""
        for target in ("python", "r", "bash", "snakemake", "nextflow"):
            translated = translate_source(source, target, program_name="flow.flbio")
            self.assertIn("flbio run", translated.content)
            self.assertIn("If the file reads.fastq exists:", translated.content)
            self.assertIn("flbio", translated.requirements)


if __name__ == "__main__":
    unittest.main()
