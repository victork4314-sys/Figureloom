from __future__ import annotations

from pathlib import Path
import py_compile
import shutil
import subprocess
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio.desktop_tools import EXPECTED_OUTPUTS, create_test_files, run_quick_test


DOWNLOAD_URL = (
    "https://github.com/victork4314-sys/Figureloom/releases/download/"
    "figureloom-bio-installer/FigureLoom-Bio-Installer.deb"
)


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
        for name in ("build-deb.sh", "install-workspace.sh", "install-linux.sh", "update-worker.sh"):
            with self.subTest(name=name):
                subprocess.run(
                    [bash, "-n", str(linux / name)],
                    check=True,
                    capture_output=True,
                    text=True,
                )

    def test_installer_window_is_valid_python(self) -> None:
        installer = Path(__file__).resolve().parents[1] / "linux" / "installer-window.py"
        with TemporaryDirectory() as temporary:
            py_compile.compile(installer, cfile=str(Path(temporary) / "installer-window.pyc"), doraise=True)

    def test_linux_icon_asset_exists(self) -> None:
        icon = Path(__file__).resolve().parents[1] / "linux" / "assets" / "figureloom-bio.png"
        self.assertTrue(icon.is_file())
        self.assertGreater(icon.stat().st_size, 0)

    def test_workspace_installer_creates_manager_launcher(self) -> None:
        root = Path(__file__).resolve().parents[2]
        linux = root / "figureloom-bio" / "linux"
        installer = (linux / "install-workspace.sh").read_text(encoding="utf-8")
        documentation = (linux / "README.md").read_text(encoding="utf-8")
        package_builder = (linux / "build-deb.sh").read_text(encoding="utf-8")
        easy_install = (root / "wiki" / "FigureLoom-Bio-Easy-Install.md").read_text(encoding="utf-8")

        self.assertIn("Install or Update FigureLoom Bio.desktop", installer)
        self.assertIn("figureloom-bio-installer", installer)
        self.assertIn("figureloom-bio-update", installer)
        self.assertIn("FIGURELOOM_PACKAGE_INSTALL", installer)
        self.assertIn("figureloom-bio/linux/assets/figureloom-bio.png", installer)
        self.assertEqual(installer.count("Icon=figureloom-bio"), 3)
        self.assertNotIn("Icon=$SITE_DIR/favicon.ico", installer)
        self.assertIn("metadata::trusted true", installer)
        self.assertIn('if [[ -z "$owner" || "$owner" == root ]]', installer)
        self.assertIn('runuser -u "$owner"', installer)
        self.assertIn('command -v gio', installer)
        self.assertNotIn('find "$desktop"', installer)
        self.assertNotIn("kasm-default-profile", installer)
        self.assertNotIn('chown -R "$owner":"$owner" "$desktop"', installer)
        self.assertFalse((linux / "install-kasm-image.sh").exists())
        self.assertNotIn("install-kasm-image.sh", documentation)
        self.assertIn("not preinstalled into the Kasm image", documentation)

        self.assertIn('PACKAGE_NAME="figureloom-bio-desktop"', package_builder)
        self.assertIn("Package: $PACKAGE_NAME", package_builder)
        self.assertIn("FigureLoom-Bio-Installer.deb", package_builder)
        self.assertIn("FIGURELOOM_PACKAGE_INSTALL=1", package_builder)
        self.assertIn("libglib2.0-bin", package_builder)
        self.assertIn("$3 == 0", package_builder)
        self.assertIn("for home in /root /home/*", package_builder)
        self.assertIn("/usr/share/icons/hicolor/256x256/apps/figureloom-bio.png", package_builder)
        self.assertIn(DOWNLOAD_URL, documentation)
        self.assertIn(DOWNLOAD_URL, easy_install)
        self.assertIn("Download FigureLoom Bio", easy_install)


if __name__ == "__main__":
    unittest.main()
