from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import platform
import subprocess
import sys
import tempfile
import traceback
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PySide6.QtCore import QObject, QThread, QTimer, QUrl, Signal, Slot
from PySide6.QtGui import QDesktopServices, QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from .desktop_tools import create_test_files, run_quick_test
from .native_web_parity import web_palette_stylesheet


APP_NAME = "FigureLoom Bio"
WINDOWS_INSTALLER_URL = (
    "https://github.com/victork4314-sys/Figureloom/releases/download/"
    "figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe"
)
MACOS_APPLE_SILICON_INSTALLER_URL = (
    "https://github.com/victork4314-sys/Figureloom/releases/download/"
    "figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg"
)
MACOS_INTEL_INSTALLER_URL = (
    "https://github.com/victork4314-sys/Figureloom/releases/download/"
    "figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg"
)


def resource_path(*parts: str) -> Path:
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[2]))
    return root.joinpath(*parts)


def icon_path() -> Path:
    return resource_path("assets", "figureloom-bio.png")


def apply_icon(window: QMainWindow) -> None:
    icon = icon_path()
    if icon.is_file():
        window.setWindowIcon(QIcon(str(icon)))


def simple_explanation(
    title: str,
    what_happened: str,
    how_to_fix: str,
    *,
    technical_detail: str = "",
) -> str:
    parts = [title, "", "What happened", what_happened.strip(), "", "How to fix it", how_to_fix.strip()]
    if technical_detail.strip():
        parts.extend(["", "Technical detail", technical_detail.strip()])
    return "\n".join(parts).strip()


def crash_report(name: str, error: BaseException) -> Path:
    candidates = [Path.home() / "Desktop", Path.home(), Path(tempfile.gettempdir())]
    folder = next((item for item in candidates if item.exists() and os.access(item, os.W_OK)), Path(tempfile.gettempdir()))
    path = folder / f"FigureLoom-Bio-{name}-Crash.txt"
    report = (
        f"FIGURELOOM BIO {name.upper()} CRASH\n\n"
        f"Time: {datetime.now().isoformat(timespec='seconds')}\n"
        f"Platform: {platform.platform()}\n"
        f"Python: {sys.version}\n\n"
        f"{''.join(traceback.format_exception(type(error), error, error.__traceback__))}"
    )
    try:
        path.write_text(report, encoding="utf-8")
    except OSError:
        fallback = Path(tempfile.gettempdir()) / path.name
        fallback.write_text(report, encoding="utf-8")
        return fallback
    return path


def downloads_folder() -> Path:
    folder = Path.home() / "Downloads" / "FigureLoom Bio Updates"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def test_folder() -> Path:
    folder = Path.home() / "Desktop" / "FigureLoom Bio Test Files"
    folder.parent.mkdir(parents=True, exist_ok=True)
    return folder


def platform_installer() -> tuple[str, str, str]:
    system = platform.system()
    if system == "Windows":
        return WINDOWS_INSTALLER_URL, ".exe", "Windows"
    if system == "Darwin":
        machine = platform.machine().casefold()
        if machine in {"arm64", "aarch64"}:
            return MACOS_APPLE_SILICON_INSTALLER_URL, ".pkg", "Apple Silicon Mac"
        return MACOS_INTEL_INSTALLER_URL, ".pkg", "Intel Mac"
    raise RuntimeError(
        simple_explanation(
            "This updater cannot run on this operating system.",
            "The graphical updater currently installs the Windows EXE or macOS PKG.",
            "On Linux, use the FigureLoom Bio Linux installer again. It safely upgrades the existing installation.",
        )
    )


def validate_installer(path: Path, suffix: str) -> None:
    try:
        size = path.stat().st_size
    except OSError as error:
        raise RuntimeError(
            simple_explanation(
                "The downloaded installer could not be checked.",
                "FigureLoom Bio downloaded a file, but the file could not be read.",
                "Delete the file, press Install or update again, and make sure the Downloads folder is writable.",
                technical_detail=str(error),
            )
        ) from error
    if size < 64 * 1024:
        raise RuntimeError(
            simple_explanation(
                "The installer download is incomplete.",
                f"The downloaded file is only {size:,} bytes, which is too small to be the real installer.",
                "Check the internet connection and press Install or update again. The incomplete file is not opened.",
            )
        )
    try:
        header = path.read_bytes()[:4]
    except OSError as error:
        raise RuntimeError(
            simple_explanation(
                "The installer download could not be read.",
                "The file exists, but FigureLoom Bio could not inspect it before opening it.",
                "Check file permissions, then press Install or update again.",
                technical_detail=str(error),
            )
        ) from error
    expected = b"MZ" if suffix == ".exe" else b"xar!"
    if not header.startswith(expected):
        raise RuntimeError(
            simple_explanation(
                "The downloaded file is not a valid installer.",
                "The server returned a different file instead of the expected FigureLoom Bio installer.",
                "Do not open it. Check the connection and try again. The updater only opens files that pass this check.",
                technical_detail=f"Expected {expected!r}; received {header!r}.",
            )
        )


def open_path(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(path)
    if not QDesktopServices.openUrl(QUrl.fromLocalFile(str(path.resolve()))):
        raise OSError(f"The operating system did not open {path}.")


def launch_installer(path: Path) -> None:
    if sys.platform == "win32":
        subprocess.Popen([str(path)], close_fds=True)
        return
    if sys.platform == "darwin":
        subprocess.Popen(["open", "-a", "Installer", str(path)], close_fds=True)
        return
    raise RuntimeError("This installer launcher supports Windows and macOS.")


def installed_ide_path() -> Path:
    if sys.platform == "win32":
        return Path(sys.executable).with_name("FigureLoom Bio IDE.exe")
    if sys.platform == "darwin":
        return Path("/Applications/FigureLoom Bio IDE.app")
    return Path("/usr/local/bin/figureloom-bio-ide")


def open_installed_ide() -> None:
    candidate = installed_ide_path()
    if not candidate.exists():
        raise RuntimeError(
            simple_explanation(
                "The FigureLoom Bio IDE is missing.",
                f"The updater looked for the IDE at {candidate}, but it was not there.",
                "Press Repair. The repair installer restores the IDE without deleting your saved workspace.",
            )
        )
    if sys.platform == "darwin":
        subprocess.Popen(["open", str(candidate)], close_fds=True)
    else:
        subprocess.Popen([str(candidate)], close_fds=True)


class DownloadWorker(QObject):
    progress = Signal(int, str)
    log = Signal(str)
    finished = Signal(bool, str, str)

    @Slot()
    def run(self) -> None:
        destination: Path | None = None
        try:
            url, suffix, platform_name = platform_installer()
            folder = downloads_folder()
            destination = folder / f"FigureLoom-Bio-Installer-{datetime.now():%Y%m%d-%H%M%S}{suffix}"
            self.progress.emit(5, f"Connecting to the official {platform_name} download")
            self.log.emit(f"Official download: {url}")
            request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater/1.0"})
            with urlopen(request, timeout=120) as response, destination.open("wb") as output:
                total = int(response.headers.get("Content-Length", "0") or 0)
                received = 0
                while True:
                    block = response.read(256 * 1024)
                    if not block:
                        break
                    output.write(block)
                    received += len(block)
                    if total:
                        percent = min(88, 8 + int(received / total * 80))
                        self.progress.emit(percent, f"Downloading {received / 1024 / 1024:.1f} MB")
            self.progress.emit(91, "Checking the downloaded installer")
            validate_installer(destination, suffix)
            self.log.emit(f"Checked installer: {destination}")
            self.progress.emit(96, "Opening the normal installer window")
            launch_installer(destination)
            self.finished.emit(
                True,
                "Installer opened",
                simple_explanation(
                    "The installer is ready.",
                    "The official installer was downloaded, checked, and opened.",
                    "Finish the steps in the Windows or macOS installer window. Keep this updater open until installation begins.",
                    technical_detail=f"Saved at {destination}",
                ),
            )
        except HTTPError as error:
            self.finished.emit(
                False,
                "GitHub did not provide the installer",
                simple_explanation(
                    "The installer could not be downloaded.",
                    f"GitHub returned error {error.code} instead of the installer.",
                    "Wait a moment and try again. You can also open the official FigureLoom Bio download page in a browser.",
                    technical_detail=str(error),
                ),
            )
        except URLError as error:
            self.finished.emit(
                False,
                "No connection to the download",
                simple_explanation(
                    "The updater could not reach GitHub.",
                    "The internet connection, DNS, firewall, VPN, or GitHub itself blocked the download.",
                    "Check that ordinary GitHub pages open in a browser, then press Install or update again.",
                    technical_detail=str(error.reason),
                ),
            )
        except PermissionError as error:
            self.finished.emit(
                False,
                "The installer could not be saved",
                simple_explanation(
                    "FigureLoom Bio could not write to the Downloads folder.",
                    "The folder is read-only or another security tool blocked the file.",
                    "Allow FigureLoom Bio to write to Downloads, then try again.",
                    technical_detail=str(error),
                ),
            )
        except Exception as error:
            saved = f"\n\nThe downloaded file remains at:\n{destination}" if destination and destination.exists() else ""
            self.finished.emit(
                False,
                "The update could not start",
                simple_explanation(
                    "The update stopped before installation began.",
                    "FigureLoom Bio did not silently continue because the installer could not be verified or opened.",
                    "Read the technical detail below, correct that problem, and try again." + saved,
                    technical_detail=str(error),
                ),
            )


class QuickTestWorker(QObject):
    finished = Signal(bool, str, str)

    @Slot()
    def run(self) -> None:
        try:
            success, report, folder = run_quick_test(test_folder())
            self.finished.emit(success, report, str(folder))
        except Exception as error:
            report_path = crash_report("Test-Tool", error)
            self.finished.emit(
                False,
                simple_explanation(
                    "The automatic test app crashed.",
                    "The test could not finish, so FigureLoom Bio is not claiming that the installation works.",
                    "Open the crash report shown below. Repair the installation, then run the test again.",
                    technical_detail=f"{error}\n\nCrash report: {report_path}",
                ),
                str(report_path.parent),
            )


def make_button(text: str, callback, *, primary: bool = False) -> QPushButton:
    button = QPushButton(text)
    if primary:
        button.setObjectName("primary")
    button.clicked.connect(callback)
    return button


class TestWindow(QMainWindow):
    def __init__(self, parent: QWidget | None = None, *, auto_start: bool = True) -> None:
        super().__init__(parent)
        self.setWindowTitle("Test FigureLoom Bio")
        self.resize(820, 620)
        self.setMinimumSize(660, 500)
        apply_icon(self)
        self._thread: QThread | None = None
        self._worker: QuickTestWorker | None = None
        self._folder = test_folder()

        root = QWidget()
        layout = QVBoxLayout(root)
        layout.setContentsMargins(24, 22, 24, 22)
        layout.setSpacing(14)
        heading = QLabel("FigureLoom Bio automatic test")
        heading.setObjectName("brandTitle")
        copy = QLabel(
            "This checks the real language engine with CSV, FASTA, and FASTQ files. "
            "It also checks that scientific output files are genuinely created."
        )
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)

        card = QFrame()
        card.setObjectName("card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(18, 16, 18, 16)
        self.status = QLabel("Ready to test")
        self.status.setObjectName("heading")
        self.progress = QProgressBar()
        self.progress.setRange(0, 0)
        self.report = QPlainTextEdit()
        self.report.setReadOnly(True)
        self.report.setPlainText("The test has not run yet.")
        card_layout.addWidget(self.status)
        card_layout.addWidget(self.progress)
        card_layout.addWidget(self.report, 1)
        row = QHBoxLayout()
        self.run_button = make_button("Run the test again", self.start_test, primary=True)
        self.open_button = make_button("Open test files", self.open_folder)
        close_button = make_button("Close", self.close)
        row.addWidget(self.run_button)
        row.addWidget(self.open_button)
        row.addStretch(1)
        row.addWidget(close_button)
        card_layout.addLayout(row)
        layout.addWidget(card, 1)
        self.setCentralWidget(root)
        self.setStyleSheet(web_palette_stylesheet(False))
        if auto_start:
            QTimer.singleShot(0, self.start_test)

    @Slot()
    def start_test(self) -> None:
        if self._thread is not None:
            return
        self.status.setText("Running the complete automatic test…")
        self.report.setPlainText("Opening test data and running the language. This may take a moment.")
        self.progress.setRange(0, 0)
        self.run_button.setEnabled(False)
        self._thread = QThread(self)
        self._worker = QuickTestWorker()
        self._worker.moveToThread(self._thread)
        self._thread.started.connect(self._worker.run)
        self._worker.finished.connect(self.test_finished)
        self._worker.finished.connect(self._thread.quit)
        self._thread.finished.connect(self._test_cleanup)
        self._thread.start()

    @Slot(bool, str, str)
    def test_finished(self, success: bool, report: str, folder: str) -> None:
        self._folder = Path(folder)
        self.progress.setRange(0, 100)
        self.progress.setValue(100 if success else 0)
        self.status.setText("Quick test passed" if success else "Quick test failed")
        self.report.setPlainText(report)

    def _test_cleanup(self) -> None:
        self.run_button.setEnabled(True)
        if self._worker is not None:
            self._worker.deleteLater()
        if self._thread is not None:
            self._thread.deleteLater()
        self._worker = None
        self._thread = None

    def open_folder(self) -> None:
        try:
            if not self._folder.exists():
                self._folder = create_test_files(test_folder())
            open_path(self._folder)
        except Exception as error:
            QMessageBox.critical(
                self,
                APP_NAME,
                simple_explanation(
                    "The test folder could not be opened.",
                    f"The folder is {self._folder}.",
                    "Open that folder manually in Finder or File Explorer.",
                    technical_detail=str(error),
                ),
            )


class ManagerWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("FigureLoom Bio Updater")
        self.resize(840, 650)
        self.setMinimumSize(700, 540)
        apply_icon(self)
        self._thread: QThread | None = None
        self._worker: DownloadWorker | None = None
        self._test_windows: list[TestWindow] = []

        root = QWidget()
        layout = QVBoxLayout(root)
        layout.setContentsMargins(24, 22, 24, 22)
        layout.setSpacing(14)
        heading = QLabel("FigureLoom Bio Updater")
        heading.setObjectName("brandTitle")
        copy = QLabel(
            "Install, update, or repair the native desktop apps. The updater checks the downloaded "
            "file before it opens the normal Windows or macOS installer."
        )
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)

        card = QFrame()
        card.setObjectName("card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(18, 16, 18, 16)
        card_layout.setSpacing(12)
        self.status = QLabel("Ready")
        self.status.setObjectName("heading")
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.log = QPlainTextEdit()
        self.log.setReadOnly(True)
        self.log.setPlainText(
            "Press Install or update to download the current official installer.\n\n"
            "Repair uses the same complete installer and does not delete your saved workspace."
        )
        card_layout.addWidget(self.status)
        card_layout.addWidget(self.progress)
        card_layout.addWidget(self.log, 1)

        actions = QHBoxLayout()
        self.install_button = make_button("Install or update", self.start_update, primary=True)
        self.repair_button = make_button("Repair", self.start_update)
        self.test_button = make_button("Run automatic test", self.open_test)
        actions.addWidget(self.install_button)
        actions.addWidget(self.repair_button)
        actions.addWidget(self.test_button)
        actions.addStretch(1)
        card_layout.addLayout(actions)
        layout.addWidget(card, 1)

        finish = QHBoxLayout()
        self.ide_button = make_button("Open IDE", self.open_ide)
        self.files_button = make_button("Open test files", self.open_files)
        self.downloads_button = make_button("Open update downloads", self.open_downloads)
        close_button = make_button("Close", self.close)
        finish.addWidget(self.ide_button)
        finish.addWidget(self.files_button)
        finish.addWidget(self.downloads_button)
        finish.addStretch(1)
        finish.addWidget(close_button)
        layout.addLayout(finish)

        self.setCentralWidget(root)
        self.setStyleSheet(web_palette_stylesheet(False))

    def set_busy(self, busy: bool) -> None:
        for button in (
            self.install_button,
            self.repair_button,
            self.test_button,
            self.ide_button,
            self.files_button,
            self.downloads_button,
        ):
            button.setEnabled(not busy)

    @Slot()
    def start_update(self) -> None:
        if self._thread is not None:
            return
        self.set_busy(True)
        self.progress.setValue(2)
        self.status.setText("Starting the download…")
        self.log.clear()
        self._thread = QThread(self)
        self._worker = DownloadWorker()
        self._worker.moveToThread(self._thread)
        self._thread.started.connect(self._worker.run)
        self._worker.progress.connect(self.update_progress)
        self._worker.log.connect(self.append_log)
        self._worker.finished.connect(self.update_finished)
        self._worker.finished.connect(self._thread.quit)
        self._thread.finished.connect(self._download_cleanup)
        self._thread.start()

    @Slot(int, str)
    def update_progress(self, value: int, message: str) -> None:
        self.progress.setValue(value)
        self.status.setText(message)

    @Slot(str)
    def append_log(self, message: str) -> None:
        self.log.appendPlainText(message)

    @Slot(bool, str, str)
    def update_finished(self, success: bool, status: str, explanation: str) -> None:
        self.progress.setValue(100 if success else 0)
        self.status.setText(status)
        self.log.setPlainText(explanation)
        if success:
            QMessageBox.information(self, APP_NAME, explanation)
        else:
            QMessageBox.critical(self, APP_NAME, explanation)

    def _download_cleanup(self) -> None:
        self.set_busy(False)
        if self._worker is not None:
            self._worker.deleteLater()
        if self._thread is not None:
            self._thread.deleteLater()
        self._worker = None
        self._thread = None

    def open_test(self) -> None:
        window = TestWindow(self)
        window.show()
        self._test_windows.append(window)
        window.destroyed.connect(lambda: self._test_windows.remove(window) if window in self._test_windows else None)

    def open_ide(self) -> None:
        try:
            open_installed_ide()
        except Exception as error:
            QMessageBox.critical(self, APP_NAME, str(error))

    def open_files(self) -> None:
        try:
            folder = create_test_files(test_folder())
            open_path(folder)
        except Exception as error:
            QMessageBox.critical(
                self,
                APP_NAME,
                simple_explanation(
                    "The test files could not be opened.",
                    "FigureLoom Bio could not create or open the Desktop test folder.",
                    "Check access to the Desktop folder and try again.",
                    technical_detail=str(error),
                ),
            )

    def open_downloads(self) -> None:
        try:
            open_path(downloads_folder())
        except Exception as error:
            QMessageBox.critical(self, APP_NAME, str(error))


def _app(arguments: list[str]) -> QApplication:
    app = QApplication.instance() or QApplication([APP_NAME, *arguments])
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("FigureLoom")
    return app


def manager_self_test() -> int:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    app = _app(["--self-test"])
    window = ManagerWindow()
    required = (
        window.install_button,
        window.repair_button,
        window.test_button,
        window.ide_button,
        window.files_button,
    )
    if not all(button.isEnabled() for button in required):
        raise RuntimeError("The updater controls did not initialize.")
    temporary = Path(tempfile.mkdtemp(prefix="figureloom-updater-self-test-"))
    try:
        exe = temporary / "test.exe"
        exe.write_bytes(b"MZ" + b"0" * (64 * 1024))
        validate_installer(exe, ".exe")
        pkg = temporary / "test.pkg"
        pkg.write_bytes(b"xar!" + b"0" * (64 * 1024))
        validate_installer(pkg, ".pkg")
    finally:
        import shutil
        shutil.rmtree(temporary, ignore_errors=True)
    window.close()
    app.processEvents()
    print("FIGURELOOM BIO UPDATER SELF TEST PASSED")
    return 0


def test_app_self_test() -> int:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    app = _app(["--self-test"])
    temporary = Path(tempfile.mkdtemp(prefix="figureloom-test-app-self-test-"))
    try:
        success, report, _folder = run_quick_test(temporary / "test-files")
        if not success:
            raise RuntimeError(report)
        window = TestWindow(auto_start=False)
        if not window.run_button.isEnabled():
            raise RuntimeError("The test app controls did not initialize.")
        window.close()
        app.processEvents()
    finally:
        import shutil
        shutil.rmtree(temporary, ignore_errors=True)
    print("FIGURELOOM BIO TEST APP SELF TEST PASSED")
    return 0


def run_manager(arguments: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if arguments is None else arguments)
    if "--self-test" in args:
        return manager_self_test()
    try:
        app = _app(args)
        window = ManagerWindow()
        window.show()
        return app.exec()
    except Exception as error:
        report = crash_report("Updater", error)
        try:
            app = _app([])
            QMessageBox.critical(
                None,
                APP_NAME,
                simple_explanation(
                    "The FigureLoom Bio Updater could not open.",
                    "The updater stopped during startup instead of hiding the error.",
                    "Open the crash report below, then reinstall FigureLoom Bio from the official download.",
                    technical_detail=f"{error}\n\nCrash report: {report}",
                ),
            )
            app.processEvents()
        except Exception:
            pass
        return 1


def run_test_app(arguments: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if arguments is None else arguments)
    if "--self-test" in args:
        return test_app_self_test()
    try:
        app = _app(args)
        window = TestWindow()
        window.show()
        return app.exec()
    except Exception as error:
        report = crash_report("Test-Tool", error)
        try:
            app = _app([])
            QMessageBox.critical(
                None,
                APP_NAME,
                simple_explanation(
                    "The FigureLoom Bio test app could not open.",
                    "The test app stopped during startup instead of silently disappearing.",
                    "Open the crash report below, then run Repair from the updater.",
                    technical_detail=f"{error}\n\nCrash report: {report}",
                ),
            )
            app.processEvents()
        except Exception:
            pass
        return 1


__all__ = [
    "ManagerWindow",
    "TestWindow",
    "manager_self_test",
    "run_manager",
    "run_test_app",
    "simple_explanation",
    "test_app_self_test",
    "validate_installer",
]
