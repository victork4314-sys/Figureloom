from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio.desktop_tools import EXPECTED_OUTPUTS, create_test_files, run_quick_test


class DesktopToolsTests(unittest.TestCase):
    def test_test_files_are_created_without_a_zip(self) -> None:
        with TemporaryDirectory() as temporary:
            folder = create_test_files(Path(temporary) / "FigureLoom Bio Test Files")
            self.assertTrue((folder / "quick-test.flbio").is_file())
            self.assertTrue((folder / "measurements.csv").is_file())
            self.assertTrue((folder / "sequences.fasta").is_file())
            self.assertTrue((folder / "reads.fastq").is_file())
            self.assertTrue((folder / "README.txt").is_file())
            self.assertFalse(any(path.suffix.casefold() == ".zip" for path in folder.iterdir()))

    def test_quick_test_runs_real_language_and_outputs(self) -> None:
        with TemporaryDirectory() as temporary:
            success, report, folder = run_quick_test(Path(temporary) / "test-files")
            self.assertTrue(success, report)
            self.assertIn("QUICK TEST PASSED", report)
            self.assertTrue((folder / "TEST-RESULT.txt").is_file())
            for name in EXPECTED_OUTPUTS:
                with self.subTest(name=name):
                    path = folder / name
                    self.assertTrue(path.is_file())
                    self.assertGreater(path.stat().st_size, 0)
                    self.assertNotIn("TODO", path.read_text(encoding="utf-8").upper())
            self.assertTrue((folder / "quick-histogram.svg").read_text(encoding="utf-8").lstrip().startswith("<svg"))
            self.assertTrue((folder / "quick-tree.nwk").read_text(encoding="utf-8").strip().endswith(";"))

    def test_linux_install_scripts_have_valid_bash_syntax(self) -> None:
        bash = shutil.which("bash")
        if bash is None:
            self.skipTest("bash is not installed")
        linux = Path(__file__).resolve().parents[1] / "linux"
        for name in ("install-workspace.sh", "install-linux.sh", "install-kasm-image.sh"):
            with self.subTest(name=name):
                subprocess.run(
                    [bash, "-n", str(linux / name)],
                    check=True,
                    capture_output=True,
                    text=True,
                )


if __name__ == "__main__":
    unittest.main()
