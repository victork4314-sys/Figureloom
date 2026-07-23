from __future__ import annotations

from pathlib import Path
import py_compile
import unittest


class PlatformInstallerTests(unittest.TestCase):
    @property
    def root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def test_platform_and_native_entry_points_are_valid_python(self) -> None:
        files = [
            self.root / "figureloom-bio" / "figureloom_bio" / "platform_desktop.py",
            *sorted((self.root / "figureloom-bio" / "figureloom_bio").glob("native_*.py")),
            *sorted((self.root / "figureloom-bio" / "platform").glob("*_entry.py")),
            self.root / "figureloom-bio" / "scripts" / "build-platform-icons.py",
        ]
        self.assertGreaterEqual(len(files), 10)
        for path in files:
            with self.subTest(path=path.name):
                py_compile.compile(path, doraise=True)

    def test_desktop_ide_is_native_and_contains_no_web_wrapper(self) -> None:
        entry = (self.root / "figureloom-bio" / "platform" / "ide_entry.py").read_text(encoding="utf-8")
        runtime = (self.root / "figureloom-bio" / "figureloom_bio" / "platform_desktop.py").read_text(encoding="utf-8")
        native = (self.root / "figureloom-bio" / "figureloom_bio" / "native_ide.py").read_text(encoding="utf-8")
        windows = (self.root / "figureloom-bio" / "windows" / "build-installer.ps1").read_text(encoding="utf-8")
        macos = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")

        self.assertIn("run_native_ide", entry)
        self.assertIn("PySide6", native)
        self.assertIn("native_self_test", native)
        self.assertIn("QT_QPA_PLATFORM", native)
        self.assertNotIn("platform_desktop", entry)
        for forbidden in (
            "ThreadingHTTPServer",
            "SimpleHTTPRequestHandler",
            "webbrowser",
            "serve_ide",
            "launch_ide",
            "127.0.0.1",
            "index.html",
        ):
            self.assertNotIn(forbidden, runtime + entry)
        self.assertNotIn("--add-data", windows.split("$RepoRoot 'ide'")[0] if "$RepoRoot 'ide'" in windows else windows)
        self.assertNotIn("$ROOT_DIR/ide:ide", macos)
        self.assertIn("forbidden web-interface files", windows)
        self.assertIn("forbidden web-interface files", macos)

    def test_native_ide_exposes_every_approved_control(self) -> None:
        native = (self.root / "figureloom-bio" / "figureloom_bio" / "native_ide.py").read_text(encoding="utf-8")
        for feature in (
            "account", "theme", "manual", "figureloom", "run", "new", "open", "save",
            "examples", "builder", "translate", "sentences", "tidy", "export_results",
            "clear_results", "add_file", "delete_file", "text_mode", "blocks_mode",
        ):
            self.assertIn(f'"{feature}"', native)
        self.assertIn("vocabulary_count <= len(manifest.commands)", native)
        self.assertIn('"browser_server": False', native)
        self.assertIn('"bundled_web_interface": False', native)

    def test_platform_icon_is_wired_into_windows_and_macos(self) -> None:
        icon = self.root / "figureloom-bio" / "linux" / "assets" / "figureloom-bio.png"
        windows_build = (self.root / "figureloom-bio" / "windows" / "build-installer.ps1").read_text(encoding="utf-8")
        windows_setup = (self.root / "figureloom-bio" / "windows" / "FigureLoomBio.iss").read_text(encoding="utf-8")
        macos_build = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")
        desktop_runtime = (self.root / "figureloom-bio" / "figureloom_bio" / "platform_desktop.py").read_text(encoding="utf-8")

        self.assertTrue(icon.is_file())
        self.assertIn("figureloom-bio.png", windows_build)
        self.assertIn("--icon", windows_build)
        self.assertIn("/DIconFile=$IconIco", windows_build)
        self.assertIn("SetupIconFile={#IconFile}", windows_setup)
        self.assertIn("figureloom-bio.png", macos_build)
        self.assertIn("figureloom-bio.icns", macos_build)
        self.assertGreaterEqual(macos_build.count('build_app "'), 3)
        self.assertIn("--icon", macos_build)
        self.assertIn('resource_path("assets", "figureloom-bio.png")', desktop_runtime)

    def test_windows_installer_has_all_four_programs(self) -> None:
        build = (self.root / "figureloom-bio" / "windows" / "build-installer.ps1").read_text(encoding="utf-8")
        setup = (self.root / "figureloom-bio" / "windows" / "FigureLoomBio.iss").read_text(encoding="utf-8")
        for name in ("flbio", "FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(name, build + setup)
        self.assertIn("PySide6", build)
        self.assertIn("quick-test", setup)
        self.assertIn("FigureLoom Bio Test Files", setup)
        self.assertIn("PrivilegesRequired=lowest", setup)

    def test_macos_installer_has_both_architectures_and_apps(self) -> None:
        build = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")
        postinstall = (self.root / "figureloom-bio" / "macos" / "scripts" / "postinstall").read_text(encoding="utf-8")
        self.assertIn("Apple-Silicon", build)
        self.assertIn("Intel", build)
        self.assertIn("PySide6", build)
        for name in ("FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(name, build)
            self.assertIn(name, postinstall)
        self.assertIn("quick-test", postinstall)
        self.assertIn("/usr/local/bin/flbio", postinstall)
        self.assertIn("/dev/console", postinstall)
        self.assertNotIn("mapfile", postinstall)

    def test_cross_platform_workflow_runs_native_installed_self_tests(self) -> None:
        workflow = (self.root / ".github" / "workflows" / "build-bio-cross-platform-installers.yml").read_text(encoding="utf-8")
        self.assertIn("windows-latest", workflow)
        self.assertIn("macos-15", workflow)
        self.assertIn("macos-15-intel", workflow)
        self.assertIn("Start-Process", workflow)
        self.assertGreaterEqual(workflow.count("--self-test"), 3)
        self.assertGreaterEqual(workflow.count("QT_QPA_PLATFORM"), 2)
        self.assertEqual(workflow.count(" -pkg dist/FigureLoom-Bio-Installer-macOS-"), 2)
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
