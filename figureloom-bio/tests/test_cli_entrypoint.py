from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class CliEntrypointTests(unittest.TestCase):
    def test_module_entrypoint_runs_words_command(self) -> None:
        completed = subprocess.run(
            [sys.executable, "-m", "figureloom_bio.cli", "words"],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("FigureLoom Bio words and terms", completed.stdout)
        self.assertIn("not a list of complete allowed sentences", completed.stdout)

    def test_module_entrypoint_creates_real_test_files(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / "FigureLoom Bio Test Files"
            completed = subprocess.run(
                [sys.executable, "-m", "figureloom_bio.cli", "test-files", str(destination)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertTrue((destination / "quick-test.flbio").is_file())
            self.assertTrue((destination / "samples.csv").is_file())
            self.assertIn("test files are ready", completed.stdout.lower())


if __name__ == "__main__":
    unittest.main()
