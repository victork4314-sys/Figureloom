from __future__ import annotations

from pathlib import Path
import py_compile
import unittest


class PlatformInstallerTests(unittest.TestCase):
    @property
    def root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def test_platform_entry_points_are_valid_python(self) -> None:
        files = [
            self.root / "figureloom-bio" / "figureloom_bio" / "platform_desktop.py",
            *sorted((self.root / "figureloom-bio" / "platform").glob("*_entry.py")),
            self.root / "figureloom-bio" / "scripts" / "build-platform-icons.py",
        ]
        self.assertGreaterEqual(len(files), 6)
        for path in files:
            with self.subTest(path=path.name):
                py_compile.compile(path, doraise=True)

    def test_windows_installer_has_all_four_programs(self) -> None:
        build = (self.root / "figureloom-bio" / "windows" / "build-installer.ps1").read_text(encoding="utf-8")
        setup = (self.root / "figureloom-bio" / "windows" / "FigureLoomBio.iss").read_text(encoding="utf-8")
        for name in ("flbio", "FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(name, build + setup)
        self.assertIn("quick-test", setup)
        self.assertIn("FigureLoom Bio Test Files", setup)
        self.assertIn("PrivilegesRequired=lowest", setup)

    def test_macos_installer_has_both_architectures_and_apps(self) -> None:
        build = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")
        postinstall = (self.root / "figureloom-bio" / "macos" / "scripts" / "postinstall").read_text(encoding="utf-8")
        self.assertIn("Apple-Silicon", build)
        self.assertIn("Intel", build)
        for name in ("FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(name, build)
            self.assertIn(name, postinstall)
        self.assertIn("quick-test", postinstall)
        self.assertIn("/usr/local/bin/flbio", postinstall)
        self.assertIn("/dev/console", postinstall)
        self.assertNotIn("mapfile", postinstall)

    def test_cross_platform_workflow_builds_and_installs_every_package(self) -> None:
        workflow = (self.root / ".github" / "workflows" / "build-bio-cross-platform-installers.yml").read_text(encoding="utf-8")
        self.assertIn("windows-latest", workflow)
        self.assertIn("macos-15", workflow)
        self.assertIn("macos-15-intel", workflow)
        self.assertIn("Start-Process", workflow)
        self.assertEqual(workflow.count("installer -pkg"), 2)
        self.assertIn("figureloom-bio-windows-installer", workflow)
        self.assertIn("figureloom-bio-macos-installer", workflow)

    def test_easy_install_page_links_all_platforms(self) -> None:
        page = (self.root / "wiki" / "FigureLoom-Bio-Easy-Install.md").read_text(encoding="utf-8")
        for name in (
            "FigureLoom-Bio-Installer.deb",
            "FigureLoom-Bio-Installer.exe",
            "FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg",
            "FigureLoom-Bio-Installer-macOS-Intel.pkg",
        ):
            self.assertIn(name, page)


if __name__ == "__main__":
    unittest.main()
