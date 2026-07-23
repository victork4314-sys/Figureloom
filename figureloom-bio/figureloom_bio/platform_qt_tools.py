from __future__ import annotations

from pathlib import Path
import os
import platform
import subprocess
import sys
import tempfile
import traceback
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PySide6.QtCore import QObject, QThread, QTimer, Qt, Signal, Slot
from PySide6.QtGui import QCloseEvent, QIcon, QTextCursor
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

from .desktop_tools import run_quick_test


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

LIGHT = {
    "background": "#f4f7f6",
    "panel": "#ffffff",
    "soft": "#edf3f1",
    "text": "#172321",
    "muted": "#60706c",
    "line": "#cddbd7",
    "accent": "#2f7468",
    "accent_strong": "#195c51",
    "accent_soft": "#dff1ec",
    "danger": "#a43e3e",
    "editor": "#fbfdfc",
}


def resource_path(*parts: str) -> Path:
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[2]))
    return root.joinpath(*parts)


def desktop_folder() -> Path:
    folder = Path.home() / "Desktop"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def test_folder() -> Path:
    return desktop_folder() / "FigureLoom Bio Test Files"


def icon_path() -> Path:
    return resource_path("assets", "figureloom-bio.png")


def application() -> QApplication:
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("FigureLoom")
    icon = icon_path()
    if icon.is_file():
        app.setWindowIcon(QIcon(str(icon)))
    return app


def stylesheet() -> str:
    c = LIGHT
    return f"""
    QWidget {{
        color: {c['text']};
        background: {c['background']};
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
    }}
    QMainWindow {{ background: {c['background']}; }}
    QFrame#card {{
        background: {c['panel']};
        border: 1px solid {c['line']};
        border-radius: 12px;
    }}
    QLabel#title {{ font-size: 24px; font-weight: 800; }}
    QLabel#heading {{ font-size: 15px; font-weight: 800; }}
    QLabel#muted {{ color: {c['muted']}; }}
    QLabel#success {{ color: {c['accent_strong']}; font-size: 15px; font-weight: 800; }}
    QLabel#error {{ color: {c['danger']}; font-size: 15px; font-weight: 800; }}
    QPushButton {{
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid {c['line']};
        border-radius: 9px;
        background: {c['panel']};
        color: {c['text']};
        font-weight: 600;
    }}
    QPushButton:hover {{ border-color: {c['accent']}; }}
    QPushButton:pressed {{ background: {c['soft']}; }}
    QPushButton#primary {{
        background: {c['accent']};
        color: #ffffff;
        border-color: {c['accent']};
        font-weight: 800;
    }}
    QPushButton#primary:hover {{
        background: {c['accent_strong']};
        border-color: {c['accent_strong']};
    }}
    QPushButton:disabled {{ color: {c['muted']}; background: {c['soft']}; }}
    QPlainTextEdit {{
        background: {c['editor']};
        color: {c['text']};
        border: 1px solid {c['line']};
        border-radius: 9px;
        padding: 10px;
        selection-background-color: {c['accent_soft']};
    }}
    QProgressBar {{
        min-height: 16px;
        border: 1px solid {c['line']};
        border-radius: 8px;
        background: {c['soft']};
        text-align: center;
    }}
    QProgressBar::chunk {{
        border-radius: 7px;
        background: {c['accent']};
    }}
    """


def open_path(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"I could not find {path}.")
    resolved = str(path.resolve())
    if sys.platform == "win32":
        os.startfile(resolved)  # type: ignore[attr-defined]
        return
    opener = "open" if sys.platform == "darwin" else "xdg-open"
    subprocess.Popen(
        [opener, resolved],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
    )


def platform_installer() -> tuple[str, str, bytes]:
    system = platform.system()
    if system == "Windows":
        return WINDOWS_INSTALLER_URL, ".exe", b"MZ"
    if system == "Darwin":
        machine = platform.machine().casefold()
        if machine in {"arm64", "aarch64"}:
            return MACOS_APPLE_SILICON_INSTALLER_URL, ".pkg", b"xar!"
        return MACOS_INTEL_INSTALLER_URL, ".pkg", b"xar!"
    raise RuntimeError(
        "This updater only installs the Windows or macOS desktop package. "
        "On Linux, use the FigureLoom Bio Linux installer instead."
    )


def open_installed_ide() -> None:
    if sys.platform == "win32":
        candidates = [
            Path(sys.executable).with_name("FigureLoom Bio IDE.exe"),
            Path(os.environ.get("LOCALAPPDATA", ""))
            / "Programs"
            / "FigureLoom Bio"
            / "FigureLoom Bio IDE.exe",
        ]
        candidate = next((path for path in candidates if path.is_file()), None)
        if candidate is not None:
            subprocess.Popen([str(candidate)], close_fds=True)
            return
    elif sys.platform == "darwin":
        candidate = Path("/Applications/FigureLoom Bio IDE.app")
        if candidate.exists():
            subprocess.Popen(["open", str(candidate)], close_fds=True)
            return
    raise FileNotFoundError(
        "The FigureLoom Bio IDE is not in its normal installed location. "
        "Press Install or update to download the current installer and repair it."
    )


def simple_error(action: str, error: BaseException) -> str:
    detail = str(error).strip() or error.__class__.__name__
    if isinstance(error, HTTPError):
        reason = f"The download server answered with HTTP {error.code}."
        next_step = (
            "Check your internet connection, then try again. "
            "If GitHub downloads are blocked, open the FigureLoom Bio download page in a browser."
        )
    elif isinstance(error, URLError):
        reason = "The updater could not reach the download server."
        next_step = (
            "Check the internet connection and make sure GitHub downloads are allowed, then try again."
        )
    elif isinstance(error, PermissionError):
        reason = "Your computer refused permission to create or open a required file."
        next_step = (
            "Close other copies of FigureLoom Bio, make sure your Desktop is writable, then try again."
        )
    elif isinstance(error, FileNotFoundError):
        reason = detail
        next_step = "Use Install or update to restore the missing application or file."
    elif isinstance(error, RuntimeError):
        reason = detail
        next_step = (
            "Follow the instruction above. Nothing was removed from your existing FigureLoom Bio projects."
        )
    else:
        reason = "FigureLoom Bio hit an unexpected internal error instead of finishing the action."
        next_step = "Run Install or update to repair the desktop files, then try the action again."
    return (
        f"{action} could not finish.\n\n"
        f"What happened\n{reason}\n\n"
        f"What to do\n{next_step}\n\n"
        f"Details\n{error.__class__.__name__}: {detail}"
    )


def save_failure_details(folder: Path, report: str, technical: str) -> None:
    try:
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "TEST-RESULT.txt").write_text(report.rstrip() + "\n", encoding="utf-8")
        (folder / "TEST-DETAILS.txt").write_text(technical.rstrip() + "\n", encoding="utf-8")
    except OSError:
        # The useful explanation is still shown in the open window even when
        # the computer also refuses permission to save the diagnostic files.
        return


class TestWorker(QObject):
    finished = Signal(bool, str, str)

    def __init__(self, destination: Path) -> None:
        super().__init__()
        self.destination = destination

    @Slot()
    def run(self) -> None:
        folder = self.destination
        try:
            success, report, folder = run_quick_test(folder)
        except Exception as error:  # The window must survive every language/runtime failure.
            report = simple_error("The automatic FigureLoom Bio test", error)
            save_failure_details(folder, report, traceback.format_exc())
            success = False
        self.finished.emit(success, report, str(folder))


class TestWindow(QMainWindow):
    def __init__(self, *, auto_run: bool = True) -> None:
        super().__init__()
        self.setWindowTitle("Test FigureLoom Bio")
        self.resize(780, 590)
        self.setMinimumSize(640, 470)
        self.setStyleSheet(stylesheet())
        icon = icon_path()
        if icon.is_file():
            self.setWindowIcon(QIcon(str(icon)))
        self._thread: QThread | None = None
        self._worker: TestWorker | None = None
        self._folder = test_folder()
        self._build()
        if auto_run:
            QTimer.singleShot(0, self.run_test)

    def _build(self) -> None:
        root = QWidget()
        layout = QVBoxLayout(root)
        layout.setContentsMargins(30, 26, 30, 26)
        layout.setSpacing(14)
        title = QLabel("FigureLoom Bio automatic test")
        title.setObjectName("title")
        copy = QLabel(
            "This opens real CSV, FASTA, and FASTQ files, runs the language, "
            "and checks the generated scientific files."
        )
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(title)
        layout.addWidget(copy)

        card = QFrame()
        card.setObjectName("card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 18, 20, 18)
        card_layout.setSpacing(12)
        self.status = QLabel("Ready to test")
        self.status.setObjectName("heading")
        card_layout.addWidget(self.status)
        self.report = QPlainTextEdit()
        self.report.setReadOnly(True)
        self.report.setPlainText("The result and a simple explanation will appear here.")
        card_layout.addWidget(self.report, 1)
        actions = QHBoxLayout()
        self.run_button = QPushButton("Run quick test")
        self.run_button.setObjectName("primary")
        self.run_button.clicked.connect(self.run_test)
        self.files_button = QPushButton("Open test files")
        self.files_button.clicked.connect(self.open_files)
        close_button = QPushButton("Close")
        close_button.clicked.connect(self.close)
        actions.addWidget(self.run_button)
        actions.addWidget(self.files_button)
        actions.addStretch(1)
        actions.addWidget(close_button)
        card_layout.addLayout(actions)
        layout.addWidget(card, 1)
        self.setCentralWidget(root)

    def run_test(self) -> None:
        if self._thread is not None:
            return
        self.status.setObjectName("heading")
        self.status.setText("Running the real language test…")
        self.report.setPlainText(
            "Creating the test files, opening the data, running every test instruction, "
            "and checking the outputs."
        )
        self.run_button.setEnabled(False)
        self.files_button.setEnabled(False)
        self.style().unpolish(self.status)
        self.style().polish(self.status)

        thread = QThread(self)
        worker = TestWorker(test_folder())
        worker.moveToThread(thread)
        thread.started.connect(worker.run)
        worker.finished.connect(self._test_finished)
        worker.finished.connect(thread.quit)
        worker.finished.connect(worker.deleteLater)
        thread.finished.connect(thread.deleteLater)
        thread.finished.connect(self._thread_finished)
        self._thread = thread
        self._worker = worker
        thread.start()

    @Slot(bool, str, str)
    def _test_finished(self, success: bool, report: str, folder: str) -> None:
        self._folder = Path(folder)
        self.status.setObjectName("success" if success else "error")
        self.status.setText("Quick test passed" if success else "Quick test failed")
        self.report.setPlainText(report)
        self.run_button.setEnabled(True)
        self.files_button.setEnabled(True)
        self.style().unpolish(self.status)
        self.style().polish(self.status)

    def _thread_finished(self) -> None:
        self._thread = None
        self._worker = None

    def open_files(self) -> None:
        try:
            open_path(self._folder)
        except Exception as error:
            QMessageBox.critical(self, APP_NAME, simple_error("Opening the test files", error))

    def closeEvent(self, event: QCloseEvent) -> None:  # noqa: N802 - Qt API name
        if self._thread is not None and self._thread.isRunning():
            self.status.setObjectName("heading")
            self.status.setText("The test is still finishing")
            self.report.setPlainText(
                "The test is using the files right now. Close this window after the result appears."
            )
            self.style().unpolish(self.status)
            self.style().polish(self.status)
            event.ignore()
            return
        super().closeEvent(event)


class DownloadWorker(QObject):
    progress = Signal(int, str)
    log = Signal(str)
    finished = Signal(bool, str, str)

    @Slot()
    def run(self) -> None:
        destination = Path()
        try:
            url, suffix, signature = platform_installer()
            destination = Path(tempfile.gettempdir()) / f"FigureLoom-Bio-Installer{suffix}"
            request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater"})
            self.log.emit("Connecting to the official FigureLoom Bio download…")
            with urlopen(request, timeout=90) as response, destination.open("wb") as output:
                total = int(response.headers.get("Content-Length", "0") or 0)
                received = 0
                while True:
                    block = response.read(1024 * 256)
                    if not block:
                        break
                    output.write(block)
                    received += len(block)
                    if total:
                        percent = min(94, 8 + int(received / total * 86))
                        self.progress.emit(percent, "Downloading the current installer")
            if not destination.is_file() or destination.stat().st_size == 0:
                raise OSError("The download finished, but the installer file was empty.")
            with destination.open("rb") as handle:
                header = handle.read(max(4, len(signature)))
            if not header.startswith(signature):
                if header.lstrip().startswith((b"<", b"{")):
                    raise OSError("The server returned a web error page instead of an installer file.")
                raise OSError("The downloaded file is not a valid-looking FigureLoom Bio installer.")
            self.log.emit(f"Downloaded {destination.name} ({destination.stat().st_size:,} bytes).")
            self.finished.emit(True, "The installer is ready to open", str(destination))
        except Exception as error:
            self.log.emit(simple_error("Downloading the FigureLoom Bio installer", error))
            self.finished.emit(False, "The installer could not be downloaded", str(destination))


class ManagerWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Install or Update FigureLoom Bio")
        self.resize(800, 640)
        self.setMinimumSize(680, 540)
        self.setStyleSheet(stylesheet())
        icon = icon_path()
        if icon.is_file():
            self.setWindowIcon(QIcon(str(icon)))
        self._thread: QThread | None = None
        self._worker: DownloadWorker | None = None
        self._test_windows: list[TestWindow] = []
        self._build()

    def _build(self) -> None:
        root = QWidget()
        layout = QVBoxLayout(root)
        layout.setContentsMargins(30, 26, 30, 26)
        layout.setSpacing(14)
        title = QLabel(APP_NAME)
        title.setObjectName("title")
        copy = QLabel(
            "Install, update, repair, and test the local native plain-English biology workspace."
        )
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(title)
        layout.addWidget(copy)

        card = QFrame()
        card.setObjectName("card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(22, 20, 22, 20)
        card_layout.setSpacing(12)
        self.status = QLabel("Ready")
        self.status.setObjectName("heading")
        card_layout.addWidget(self.status)
        note = QLabel(
            "Install or update downloads the current official installer and then opens "
            "the normal Windows or macOS installation window."
        )
        note.setObjectName("muted")
        note.setWordWrap(True)
        card_layout.addWidget(note)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        card_layout.addWidget(self.progress)
        self.log = QPlainTextEdit()
        self.log.setReadOnly(True)
        self.log.setPlainText("No action has run yet.")
        card_layout.addWidget(self.log, 1)

        main_actions = QHBoxLayout()
        self.install_button = QPushButton("Install or update")
        self.install_button.setObjectName("primary")
        self.install_button.clicked.connect(self.install_or_update)
        self.repair_button = QPushButton("Repair")
        self.repair_button.clicked.connect(self.install_or_update)
        self.test_button = QPushButton("Run quick test")
        self.test_button.clicked.connect(self.open_test)
        main_actions.addWidget(self.install_button)
        main_actions.addWidget(self.repair_button)
        main_actions.addWidget(self.test_button)
        main_actions.addStretch(1)
        card_layout.addLayout(main_actions)
        layout.addWidget(card, 1)

        finish = QHBoxLayout()
        self.ide_button = QPushButton("Open IDE")
        self.ide_button.clicked.connect(self.open_ide)
        self.files_button = QPushButton("Open test files")
        self.files_button.clicked.connect(self.open_files)
        close_button = QPushButton("Close")
        close_button.clicked.connect(self.close)
        finish.addWidget(self.ide_button)
        finish.addWidget(self.files_button)
        finish.addStretch(1)
        finish.addWidget(close_button)
        layout.addLayout(finish)
        self.setCentralWidget(root)

    def _set_busy(self, busy: bool) -> None:
        for button in (
            self.install_button,
            self.repair_button,
            self.test_button,
            self.ide_button,
            self.files_button,
        ):
            button.setEnabled(not busy)

    def _append(self, text: str) -> None:
        existing = self.log.toPlainText()
        if existing == "No action has run yet.":
            existing = ""
        self.log.setPlainText((existing.rstrip() + "\n" + text.rstrip()).strip())
        cursor = self.log.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        self.log.setTextCursor(cursor)

    def install_or_update(self) -> None:
        if self._thread is not None:
            return
        self._set_busy(True)
        self.progress.setValue(5)
        self.status.setObjectName("heading")
        self.status.setText("Downloading the current installer…")
        self._append("Starting a fresh official installer download.")
        self.style().unpolish(self.status)
        self.style().polish(self.status)

        thread = QThread(self)
        worker = DownloadWorker()
        worker.moveToThread(thread)
        thread.started.connect(worker.run)
        worker.progress.connect(self._download_progress)
        worker.log.connect(self._append)
        worker.finished.connect(self._download_finished)
        worker.finished.connect(thread.quit)
        worker.finished.connect(worker.deleteLater)
        thread.finished.connect(thread.deleteLater)
        thread.finished.connect(self._download_thread_finished)
        self._thread = thread
        self._worker = worker
        thread.start()

    @Slot(int, str)
    def _download_progress(self, value: int, message: str) -> None:
        self.progress.setValue(value)
        self.status.setText(message)

    @Slot(bool, str, str)
    def _download_finished(self, success: bool, message: str, path: str) -> None:
        self._set_busy(False)
        self.status.setObjectName("success" if success else "error")
        self.status.setText(message)
        self.progress.setValue(100 if success else 0)
        self.style().unpolish(self.status)
        self.style().polish(self.status)
        if not success:
            return
        try:
            open_path(Path(path))
            self._append(
                "The normal installer window was opened. Follow its steps to finish the update or repair."
            )
        except Exception as error:
            explanation = simple_error("Opening the downloaded installer", error)
            self._append(explanation)
            self.status.setObjectName("error")
            self.status.setText("The installer downloaded but did not open")
            self.style().unpolish(self.status)
            self.style().polish(self.status)

    def _download_thread_finished(self) -> None:
        self._thread = None
        self._worker = None

    def open_test(self) -> None:
        window = TestWindow(auto_run=True)
        window.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, True)
        window.destroyed.connect(lambda *_args: self._forget_test(window))
        self._test_windows.append(window)
        window.show()
        window.raise_()
        window.activateWindow()

    def _forget_test(self, window: TestWindow) -> None:
        if window in self._test_windows:
            self._test_windows.remove(window)

    def open_ide(self) -> None:
        try:
            open_installed_ide()
        except Exception as error:
            QMessageBox.critical(self, APP_NAME, simple_error("Opening the FigureLoom Bio IDE", error))

    def open_files(self) -> None:
        folder = test_folder()
        try:
            open_path(folder)
        except Exception as error:
            QMessageBox.critical(self, APP_NAME, simple_error("Opening the test files", error))

    def closeEvent(self, event: QCloseEvent) -> None:  # noqa: N802 - Qt API name
        if self._thread is not None and self._thread.isRunning():
            self.status.setObjectName("heading")
            self.status.setText("The installer is still downloading")
            self._append("Close this window after the download finishes or reports an error.")
            self.style().unpolish(self.status)
            self.style().polish(self.status)
            event.ignore()
            return
        super().closeEvent(event)


def test_window_self_test() -> int:
    app = application()
    window = TestWindow(auto_run=False)
    required = (window.status, window.report, window.run_button, window.files_button)
    if not all(required):
        return 1
    window.close()
    app.processEvents()
    return 0


def manager_window_self_test() -> int:
    app = application()
    window = ManagerWindow()
    required = (
        window.status,
        window.progress,
        window.log,
        window.install_button,
        window.repair_button,
        window.test_button,
        window.ide_button,
        window.files_button,
    )
    if not all(required):
        return 1
    window.close()
    app.processEvents()
    return 0


def show_test_window() -> int:
    if "--self-test" in sys.argv:
        return test_window_self_test()
    app = application()
    window = TestWindow(auto_run=True)
    window.show()
    return app.exec()


def show_manager_window() -> int:
    if "--self-test" in sys.argv:
        return manager_window_self_test()
    app = application()
    window = ManagerWindow()
    window.show()
    return app.exec()


__all__ = [
    "ManagerWindow",
    "TestWindow",
    "manager_window_self_test",
    "show_manager_window",
    "show_test_window",
    "simple_error",
    "test_window_self_test",
]
