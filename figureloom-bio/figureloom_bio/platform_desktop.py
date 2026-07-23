from __future__ import annotations

from pathlib import Path
import os
import platform
import subprocess
import sys
import tempfile
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from urllib.error import URLError
from urllib.request import Request, urlopen

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

BG = "#102a2a"
PANEL = "#173838"
PANEL_2 = "#204747"
TEXT = "#f4f7f5"
MUTED = "#b8c9c4"
SAGE = "#9fc5aa"
CYAN = "#9ad9df"
DANGER = "#e5a6a6"


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


def apply_window_icon(window: tk.Tk) -> None:
    icon = icon_path()
    if not icon.is_file():
        return
    try:
        image = tk.PhotoImage(file=str(icon))
        window._figureloom_icon = image  # type: ignore[attr-defined]
        window.iconphoto(True, image)
    except tk.TclError:
        pass


def open_path(path: Path) -> None:
    if sys.platform == "win32":
        os.startfile(str(path))  # type: ignore[attr-defined]
        return
    opener = "open" if sys.platform == "darwin" else "xdg-open"
    subprocess.Popen([opener, str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _button(parent: tk.Widget, text: str, command, *, primary: bool = False) -> tk.Button:
    return tk.Button(
        parent,
        text=text,
        command=command,
        bg=SAGE if primary else PANEL_2,
        fg="#102020" if primary else TEXT,
        activebackground=CYAN,
        activeforeground="#102020",
        relief="flat",
        bd=0,
        padx=16,
        pady=10,
        cursor="hand2",
        font=("TkDefaultFont", 10, "bold"),
    )


def show_test_window() -> None:
    success, report, folder = run_quick_test(test_folder())
    root = tk.Tk()
    root.title("Test FigureLoom Bio")
    root.geometry("760x560")
    root.minsize(620, 460)
    root.configure(bg=BG)
    apply_window_icon(root)

    outer = tk.Frame(root, bg=BG, padx=30, pady=26)
    outer.pack(fill="both", expand=True)
    tk.Label(
        outer,
        text="FigureLoom Bio automatic test",
        bg=BG,
        fg=TEXT,
        font=("TkDefaultFont", 22, "bold"),
    ).pack(anchor="w")
    tk.Label(
        outer,
        text="The real language test opened CSV, FASTA, and FASTQ data and generated scientific outputs.",
        bg=BG,
        fg=MUTED,
        wraplength=680,
        justify="left",
        pady=8,
    ).pack(anchor="w")

    card = tk.Frame(outer, bg=PANEL, padx=20, pady=18)
    card.pack(fill="both", expand=True, pady=(16, 0))
    tk.Label(
        card,
        text="Quick test passed" if success else "Quick test failed",
        bg=PANEL,
        fg=SAGE if success else DANGER,
        font=("TkDefaultFont", 15, "bold"),
    ).pack(anchor="w")
    text = tk.Text(card, bg="#0c2020", fg="#dce8e4", relief="flat", padx=12, pady=10, wrap="word")
    text.insert("1.0", report)
    text.configure(state="disabled")
    text.pack(fill="both", expand=True, pady=(12, 14))
    buttons = tk.Frame(card, bg=PANEL)
    buttons.pack(fill="x")
    _button(buttons, "Open test files", lambda: open_path(folder), primary=True).pack(side="left")
    _button(buttons, "Close", root.destroy).pack(side="right")
    root.mainloop()


def platform_installer() -> tuple[str, str]:
    system = platform.system()
    if system == "Windows":
        return WINDOWS_INSTALLER_URL, ".exe"
    if system == "Darwin":
        machine = platform.machine().casefold()
        if machine in {"arm64", "aarch64"}:
            return MACOS_APPLE_SILICON_INSTALLER_URL, ".pkg"
        return MACOS_INTEL_INSTALLER_URL, ".pkg"
    raise RuntimeError("This updater is for the Windows or macOS FigureLoom Bio installer.")


def open_installed_ide() -> None:
    if sys.platform == "win32":
        candidate = Path(sys.executable).with_name("FigureLoom Bio IDE.exe")
        if candidate.is_file():
            subprocess.Popen([str(candidate)], close_fds=True)
            return
    elif sys.platform == "darwin":
        candidate = Path("/Applications/FigureLoom Bio IDE.app")
        if candidate.exists():
            subprocess.Popen(["open", str(candidate)])
            return
    raise RuntimeError("The native FigureLoom Bio IDE application was not found. Use Install or Update to repair it.")


class ManagerWindow(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Install or Update FigureLoom Bio")
        self.geometry("760x610")
        self.minsize(680, 540)
        self.configure(bg=BG)
        apply_window_icon(self)
        self.busy = False
        self.events: list[tuple[str, object]] = []
        self._event_lock = threading.Lock()
        self._build()
        self.after(100, self._drain_events)

    def _build(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Figure.Horizontal.TProgressbar", troughcolor=PANEL_2, background=SAGE)

        outer = tk.Frame(self, bg=BG, padx=34, pady=28)
        outer.pack(fill="both", expand=True)
        tk.Label(outer, text=APP_NAME, bg=BG, fg=TEXT, font=("TkDefaultFont", 24, "bold")).pack(anchor="w")
        tk.Label(
            outer,
            text="Install, update, repair, and test the local native plain-English biology workspace.",
            bg=BG,
            fg=MUTED,
            wraplength=680,
            justify="left",
            pady=8,
        ).pack(anchor="w")

        card = tk.Frame(outer, bg=PANEL, padx=24, pady=22)
        card.pack(fill="both", expand=True, pady=(18, 0))
        self.status = tk.Label(card, text="Ready", bg=PANEL, fg=TEXT, font=("TkDefaultFont", 15, "bold"), anchor="w")
        self.status.pack(fill="x")
        tk.Label(
            card,
            text="Updates download the current official installer, then open the normal Windows or macOS installation window.",
            bg=PANEL,
            fg=MUTED,
            wraplength=630,
            justify="left",
            anchor="w",
            pady=10,
        ).pack(fill="x")
        self.progress = ttk.Progressbar(card, style="Figure.Horizontal.TProgressbar", mode="determinate", maximum=100)
        self.progress.pack(fill="x", pady=(8, 14))
        self.log = tk.Text(card, height=11, bg="#0c2020", fg="#dce8e4", relief="flat", padx=12, pady=10, wrap="word")
        self.log.configure(state="disabled")
        self.log.pack(fill="both", expand=True)

        actions = tk.Frame(card, bg=PANEL)
        actions.pack(fill="x", pady=(18, 0))
        self.install_button = _button(actions, "Install or update", self.install_or_update, primary=True)
        self.install_button.pack(side="left")
        self.repair_button = _button(actions, "Repair", self.install_or_update)
        self.repair_button.pack(side="left", padx=(10, 0))
        self.test_button = _button(actions, "Run quick test", show_test_window)
        self.test_button.pack(side="left", padx=(10, 0))

        finish = tk.Frame(outer, bg=BG)
        finish.pack(fill="x", pady=(16, 0))
        self.ide_button = _button(finish, "Open IDE", self.open_ide)
        self.ide_button.pack(side="left")
        self.files_button = _button(finish, "Open test files", self.open_files)
        self.files_button.pack(side="left", padx=(10, 0))
        _button(finish, "Close", self.destroy).pack(side="right")

    def _append(self, text: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", text.rstrip() + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _set_busy(self, busy: bool) -> None:
        self.busy = busy
        state = "disabled" if busy else "normal"
        for button in (self.install_button, self.repair_button, self.test_button, self.ide_button, self.files_button):
            button.configure(state=state)

    def _queue(self, event: str, payload: object) -> None:
        with self._event_lock:
            self.events.append((event, payload))

    def _drain_events(self) -> None:
        with self._event_lock:
            events, self.events = self.events, []
        for event, payload in events:
            if event == "progress":
                value, message = payload  # type: ignore[misc]
                self.progress["value"] = value
                self.status.configure(text=message, fg=TEXT)
            elif event == "log":
                self._append(str(payload))
            elif event == "done":
                self._set_busy(False)
                success, message = payload  # type: ignore[misc]
                self.progress["value"] = 100 if success else 0
                self.status.configure(text=message, fg=SAGE if success else DANGER)
        self.after(100, self._drain_events)

    def install_or_update(self) -> None:
        if self.busy:
            return
        self._set_busy(True)
        self.progress["value"] = 5
        self.status.configure(text="Downloading the current installer", fg=TEXT)
        self._append("Downloading the official FigureLoom Bio installer...")
        threading.Thread(target=self._download_installer, daemon=True).start()

    def _download_installer(self) -> None:
        try:
            url, suffix = platform_installer()
            destination = Path(tempfile.gettempdir()) / f"FigureLoom-Bio-Installer{suffix}"
            request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater"})
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
                        percent = min(90, 10 + int(received / total * 80))
                        self._queue("progress", (percent, "Downloading the current installer"))
            if destination.stat().st_size == 0:
                raise OSError("The downloaded installer was empty.")
            self._queue("log", f"Saved: {destination}")
            open_path(destination)
            self._queue("done", (True, "Installer opened"))
        except (OSError, RuntimeError, URLError) as error:
            self._queue("log", str(error))
            self._queue("done", (False, "The installer could not be opened"))

    def open_ide(self) -> None:
        try:
            open_installed_ide()
        except (OSError, RuntimeError) as error:
            messagebox.showerror(APP_NAME, str(error))

    def open_files(self) -> None:
        folder = test_folder()
        if not folder.exists():
            run_quick_test(folder)
        open_path(folder)


def show_manager_window() -> None:
    ManagerWindow().mainloop()
