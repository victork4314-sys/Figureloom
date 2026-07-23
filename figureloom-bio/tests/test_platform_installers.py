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
            self.root / "figureloom-bio" / "figureloom_bio" / "platform_qt_tools.py",
            self.root / "figureloom-bio" / "figureloom_bio" / "platform_tool_safety.py",
            *sorted((self.root / "figureloom-bio" / "figureloom_bio").glob("native_*.py")),
            *sorted((self.root / "figureloom-bio" / "platform").glob("*_entry.py")),
            self.root / "figureloom-bio" / "scripts" / "build-platform-icons.py",
        ]
        self.assertGreaterEqual(len(files), 15)
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
        self.assertIn("install_native_account", entry)
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
        self.assertNotIn("Join-Path $RepoRoot 'ide'", windows)
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

    def test_native_account_has_local_and_encrypted_cloud_parity(self) -> None:
        account = (self.root / "figureloom-bio" / "figureloom_bio" / "native_account.py").read_text(encoding="utf-8")
        cloud = (self.root / "figureloom-bio" / "figureloom_bio" / "native_cloud.py").read_text(encoding="utf-8")
        entry = (self.root / "figureloom-bio" / "platform" / "ide_entry.py").read_text(encoding="utf-8")
        for feature in (
            "sign_in", "create_account", "forgot_password", "sign_out",
            "save_device", "save_cloud", "save_cloud_as", "refresh_cloud",
            "open_local", "delete_local", "open_cloud", "delete_cloud",
            "local_gallery", "cloud_gallery",
        ):
            self.assertIn(f'"{feature}"', account)
        self.assertIn("get_bio_project_key", cloud)
        self.assertIn("AESGCM", cloud)
        self.assertIn('"activeFile"', cloud)
        self.assertIn('"deleted": []', cloud)
        self.assertIn("revision", cloud)
        self.assertIn("SessionStore", cloud)
        self.assertIn("install_runtime_fixes", entry)
        for forbidden in ("QWebEngine", "QWebView", "WebView", "<html", "javascript:"):
            self.assertNotIn(forbidden, account + cloud + entry)

    def test_test_and_updater_shortcuts_use_reliable_painted_qt_windows(self) -> None:
        tools = (self.root / "figureloom-bio" / "figureloom_bio" / "platform_qt_tools.py").read_text(encoding="utf-8")
        safety = (self.root / "figureloom-bio" / "figureloom_bio" / "platform_tool_safety.py").read_text(encoding="utf-8")
        test_entry = (self.root / "figureloom-bio" / "platform" / "test_entry.py").read_text(encoding="utf-8")
        manager_entry = (self.root / "figureloom-bio" / "platform" / "manager_entry.py").read_text(encoding="utf-8")
        self.assertIn("from PySide6", tools)
        self.assertIn("class TestWindow(QMainWindow)", tools)
        self.assertIn("class ManagerWindow(QMainWindow)", tools)
        self.assertIn("def simple_error", tools)
        self.assertIn('"What happened\\n{reason}', tools)
        self.assertIn('"What to do\\n{next_step}', tools)
        self.assertIn('if "--self-test" in sys.argv', tools)
        self.assertIn("install_platform_tool_safety", test_entry)
        self.assertIn("install_platform_tool_safety", manager_entry)
        self.assertIn("platform_qt_tools.show_test_window()", test_entry)
        self.assertIn("platform_qt_tools.show_manager_window()", manager_entry)
        self.assertIn('os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")', test_entry)
        self.assertIn('os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")', manager_entry)
        self.assertIn("window.show()", safety)
        self.assertGreaterEqual(safety.count("app.processEvents()"), 6)
        self.assertIn("window.repaint()", safety)
        self.assertIn("window.report.viewport().update()", safety)
        self.assertIn("window.log.viewport().update()", safety)
        self.assertGreaterEqual(safety.count("window.isVisible()"), 2)
        self.assertNotIn("platform_desktop", test_entry + manager_entry)
        self.assertNotIn("tkinter", tools + safety)

    def test_platform_icon_is_wired_into_windows_and_macos(self) -> None:
        icon = self.root / "figureloom-bio" / "linux" / "assets" / "figureloom-bio.png"
        windows_build = (self.root / "figureloom-bio" / "windows" / "build-installer.ps1").read_text(encoding="utf-8")
        windows_setup = (self.root / "figureloom-bio" / "windows" / "FigureLoomBio.iss").read_text(encoding="utf-8")
        macos_build = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")
        desktop_runtime = (self.root / "figureloom-bio" / "figureloom_bio" / "platform_qt_tools.py").read_text(encoding="utf-8")

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
        self.assertIn("cryptography", build)
        self.assertIn("quick-test", setup)
        self.assertIn("FigureLoom Bio Test Files", setup)
        self.assertIn("PrivilegesRequired=lowest", setup)

    def test_macos_installer_has_both_architectures_and_apps(self) -> None:
        build = (self.root / "figureloom-bio" / "macos" / "build-installer.sh").read_text(encoding="utf-8")
        postinstall = (self.root / "figureloom-bio" / "macos" / "scripts" / "postinstall").read_text(encoding="utf-8")
        self.assertIn("Apple-Silicon", build)
        self.assertIn("Intel", build)
        self.assertIn("PySide6", build)
        self.assertIn("cryptography", build)
        for name in ("FigureLoom Bio IDE", "Test FigureLoom Bio", "Install or Update FigureLoom Bio"):
            self.assertIn(name, build)
            self.assertIn(name, postinstall)
        self.assertIn("quick-test", postinstall)
        self.assertIn("/usr/local/bin/flbio", postinstall)
        self.assertIn("/dev/console", postinstall)
        self.assertNotIn("mapfile", postinstall)

    def test_cross_platform_workflow_runs_every_installed_native_self_test(self) -> None:
        workflow = (self.root / ".github" / "workflows" / "build-bio-cross-platform-installers.yml").read_text(encoding="utf-8")
        self.assertIn("windows-latest", workflow)
        self.assertIn("macos-15", workflow)
        self.assertIn("macos-15-intel", workflow)
        self.assertIn("Start-Process", workflow)
        self.assertGreaterEqual(workflow.count("--self-test"), 9)
        self.assertGreaterEqual(workflow.count("QT_QPA_PLATFORM"), 6)
        self.assertGreaterEqual(workflow.count("Test FigureLoom Bio"), 6)
        self.assertGreaterEqual(workflow.count("Install or Update FigureLoom Bio"), 6)
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
