#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import threading
from typing import Callable

INSTALL_ROOT = Path(os.environ.get("FIGURELOOM_BIO_INSTALL_ROOT", "/opt/figureloom-bio"))
SOURCE_DIR = INSTALL_ROOT / "source"
INSTALLER = Path(
    os.environ.get(
        "FIGURELOOM_BIO_INSTALLER",
        str(SOURCE_DIR / "install" / "figureloom-bio-linux.sh"),
    )
)
BIN_DIR = Path(os.environ.get("FIGURELOOM_BIO_BIN_DIR", "/usr/local/bin"))
SHARE_DIR = Path(os.environ.get("FIGURELOOM_BIO_SHARE_DIR", "/usr/share/figureloom-bio"))
APPLICATIONS_DIR = Path(
    os.environ.get("FIGURELOOM_BIO_APPLICATIONS_DIR", "/usr/share/applications")
)

OPTIONAL_TOOLS = (
    "seqkit",
    "fastp",
    "spades.py",
    "quast.py",
    "prokka",
    "abricate",
    "kraken2",
    "mob_recon",
)
BROWSERS = ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable")


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def setup_status() -> dict[str, object]:
    optional_found = [tool for tool in OPTIONAL_TOOLS if command_exists(tool)]
    optional_missing = [tool for tool in OPTIONAL_TOOLS if not command_exists(tool)]
    browser = next((name for name in BROWSERS if command_exists(name)), None)
    return {
        "python": command_exists("python3"),
        "git": command_exists("git"),
        "browser": browser,
        "engine": command_exists("flbio") or (BIN_DIR / "flbio").exists(),
        "ide": (BIN_DIR / "figureloom-bio-ide").exists(),
        "test_files": (SHARE_DIR / "test-files").is_dir(),
        "desktop_entry": (APPLICATIONS_DIR / "figureloom-bio-ide.desktop").exists(),
        "optional_found": optional_found,
        "optional_missing": optional_missing,
    }


def privileged_installer_command() -> list[str]:
    command = ["bash", str(INSTALLER)]
    if os.geteuid() == 0:
        return command
    if command_exists("pkexec"):
        return ["pkexec", "env", f"HOME={os.environ.get('HOME', '')}", *command]
    if command_exists("sudo"):
        return ["sudo", "-E", *command]
    raise RuntimeError("Administrator permission is required to install FigureLoom Bio.")


def launch(command: str) -> None:
    executable = BIN_DIR / command
    if executable.exists():
        subprocess.Popen([str(executable)], start_new_session=True)
        return
    found = shutil.which(command)
    if found:
        subprocess.Popen([found], start_new_session=True)
        return
    raise RuntimeError(f"I could not find {command}.")


def self_test() -> int:
    status = setup_status()
    required_keys = {
        "python",
        "git",
        "browser",
        "engine",
        "ide",
        "test_files",
        "desktop_entry",
        "optional_found",
        "optional_missing",
    }
    missing_keys = required_keys.difference(status)
    if missing_keys:
        raise RuntimeError(f"Status check is missing: {', '.join(sorted(missing_keys))}")
    print(json.dumps(status, indent=2, sort_keys=True))
    print("FigureLoom Bio graphical setup self-test passed.")
    return 0


def run_gui() -> int:
    try:
        import tkinter as tk
        from tkinter import messagebox, ttk
    except ImportError as error:
        raise RuntimeError("The graphical setup needs Tkinter or the fallback setup launcher.") from error

    class SetupWindow:
        BG = "#0b2622"
        PANEL = "#123b34"
        TEXT = "#eef8f4"
        MUTED = "#b7d1c8"
        SAGE = "#91c7aa"
        CYAN = "#8ad9d2"
        WARNING = "#f1cf8b"

        def __init__(self) -> None:
            self.root = tk.Tk()
            self.root.title("FigureLoom Bio Setup")
            self.root.geometry("680x590")
            self.root.minsize(620, 520)
            self.root.configure(bg=self.BG)
            self.root.option_add("*Font", ("Sans", 11))
            self.messages: queue.Queue[tuple[str, object]] = queue.Queue()
            self.installing = False

            style = ttk.Style(self.root)
            try:
                style.theme_use("clam")
            except tk.TclError:
                pass
            style.configure(
                "Figure.Horizontal.TProgressbar",
                troughcolor=self.PANEL,
                background=self.SAGE,
                bordercolor=self.PANEL,
                lightcolor=self.SAGE,
                darkcolor=self.SAGE,
            )

            outer = tk.Frame(self.root, bg=self.BG, padx=28, pady=24)
            outer.pack(fill="both", expand=True)

            tk.Label(
                outer,
                text="FigureLoom Bio Setup",
                bg=self.BG,
                fg=self.TEXT,
                font=("Sans", 22, "bold"),
                anchor="w",
            ).pack(fill="x")
            tk.Label(
                outer,
                text="Install the language, local visual IDE, desktop launchers, and ready-to-run test files.",
                bg=self.BG,
                fg=self.MUTED,
                justify="left",
                anchor="w",
                wraplength=610,
                pady=8,
            ).pack(fill="x")

            self.status_panel = tk.Frame(outer, bg=self.PANEL, padx=18, pady=14)
            self.status_panel.pack(fill="x", pady=(12, 12))
            self.status_title = tk.Label(
                self.status_panel,
                text="Checking this computer…",
                bg=self.PANEL,
                fg=self.TEXT,
                font=("Sans", 13, "bold"),
                anchor="w",
            )
            self.status_title.pack(fill="x")
            self.status_text = tk.Label(
                self.status_panel,
                text="",
                bg=self.PANEL,
                fg=self.MUTED,
                justify="left",
                anchor="w",
                wraplength=590,
                pady=8,
            )
            self.status_text.pack(fill="x")

            self.progress = ttk.Progressbar(
                outer,
                mode="indeterminate",
                style="Figure.Horizontal.TProgressbar",
            )
            self.progress.pack(fill="x", pady=(0, 10))

            log_frame = tk.Frame(outer, bg=self.PANEL, padx=2, pady=2)
            log_frame.pack(fill="both", expand=True)
            self.log = tk.Text(
                log_frame,
                height=9,
                bg="#081d1a",
                fg=self.MUTED,
                insertbackground=self.TEXT,
                relief="flat",
                padx=12,
                pady=10,
                wrap="word",
                state="disabled",
            )
            self.log.pack(fill="both", expand=True)

            buttons = tk.Frame(outer, bg=self.BG, pady=14)
            buttons.pack(fill="x")
            self.install_button = tk.Button(
                buttons,
                text="Install / Update",
                command=self.start_install,
                bg=self.SAGE,
                fg="#092019",
                activebackground=self.CYAN,
                activeforeground="#092019",
                relief="flat",
                padx=18,
                pady=9,
                font=("Sans", 11, "bold"),
            )
            self.install_button.pack(side="left")

            self.ide_button = self.action_button(buttons, "Open IDE", lambda: self.safe_launch("figureloom-bio-ide"))
            self.tests_button = self.action_button(buttons, "Open Test Files", lambda: self.safe_launch("figureloom-bio-copy-tests"))
            self.quick_button = self.action_button(buttons, "Run Quick Test", lambda: self.safe_launch("figureloom-bio-quick-test"))

            tk.Button(
                buttons,
                text="Close",
                command=self.root.destroy,
                bg=self.BG,
                fg=self.TEXT,
                activebackground=self.PANEL,
                activeforeground=self.TEXT,
                relief="flat",
                padx=12,
                pady=9,
            ).pack(side="right")

            self.refresh_status()
            self.root.after(100, self.handle_messages)

        def action_button(self, parent: "tk.Widget", text: str, command: Callable[[], None]) -> "tk.Button":
            button = tk.Button(
                parent,
                text=text,
                command=command,
                bg=self.PANEL,
                fg=self.TEXT,
                activebackground="#1b5046",
                activeforeground=self.TEXT,
                disabledforeground="#6f8d84",
                relief="flat",
                padx=12,
                pady=9,
            )
            button.pack(side="left", padx=(8, 0))
            return button

        def append_log(self, text: str) -> None:
            self.log.configure(state="normal")
            self.log.insert("end", text)
            self.log.see("end")
            self.log.configure(state="disabled")

        def refresh_status(self) -> None:
            status = setup_status()
            ready = bool(status["engine"] and status["ide"] and status["test_files"])
            required = [
                ("Python", status["python"]),
                ("Git", status["git"]),
                ("Local browser", bool(status["browser"])),
                ("FigureLoom Bio engine", status["engine"]),
                ("Visual IDE", status["ide"]),
                ("Test files", status["test_files"]),
            ]
            lines = [f"{'✓' if present else '•'} {name}{'' if present else ' — will be installed'}" for name, present in required]
            found = len(status["optional_found"])
            total = len(OPTIONAL_TOOLS)
            lines.append(f"\nAdvanced bioinformatics tools detected: {found} of {total}")
            if status["optional_missing"]:
                lines.append("Missing optional tools: " + ", ".join(status["optional_missing"]))
            else:
                lines.append("All optional tools are available.")

            self.status_title.configure(
                text="Ready to use" if ready else "Ready to install",
                fg=self.SAGE if ready else self.WARNING,
            )
            self.status_text.configure(text="\n".join(lines))
            self.install_button.configure(text="Update / Repair" if ready else "Install")
            state = "normal" if ready and not self.installing else "disabled"
            for button in (self.ide_button, self.tests_button, self.quick_button):
                button.configure(state=state)

        def start_install(self) -> None:
            if self.installing:
                return
            if not INSTALLER.exists():
                messagebox.showerror(
                    "Installer not found",
                    "The local installer file is missing. Re-run the one-command installer from the FigureLoom Bio guide.",
                    parent=self.root,
                )
                return
            try:
                command = privileged_installer_command()
            except RuntimeError as error:
                messagebox.showerror("Administrator permission needed", str(error), parent=self.root)
                return

            self.installing = True
            self.install_button.configure(state="disabled")
            for button in (self.ide_button, self.tests_button, self.quick_button):
                button.configure(state="disabled")
            self.progress.start(12)
            self.append_log("\nStarting FigureLoom Bio installation…\n\n")
            thread = threading.Thread(target=self.install_worker, args=(command,), daemon=True)
            thread.start()

        def install_worker(self, command: list[str]) -> None:
            try:
                process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                assert process.stdout is not None
                for line in process.stdout:
                    self.messages.put(("log", line))
                code = process.wait()
                self.messages.put(("done", code))
            except Exception as error:
                self.messages.put(("error", str(error)))

        def handle_messages(self) -> None:
            try:
                while True:
                    kind, value = self.messages.get_nowait()
                    if kind == "log":
                        self.append_log(str(value))
                    elif kind == "done":
                        self.finish_install(int(value))
                    elif kind == "error":
                        self.finish_error(str(value))
            except queue.Empty:
                pass
            self.root.after(100, self.handle_messages)

        def finish_install(self, code: int) -> None:
            self.installing = False
            self.progress.stop()
            if code == 0:
                self.append_log("\nInstallation finished successfully.\n")
                self.refresh_status()
                messagebox.showinfo(
                    "FigureLoom Bio is ready",
                    "The IDE, terminal command, desktop launchers, and test files are installed.",
                    parent=self.root,
                )
            else:
                self.install_button.configure(state="normal")
                messagebox.showerror(
                    "Installation did not finish",
                    "The installer stopped. The details are shown in the setup window.",
                    parent=self.root,
                )

        def finish_error(self, error: str) -> None:
            self.installing = False
            self.progress.stop()
            self.install_button.configure(state="normal")
            self.append_log(f"\n{error}\n")
            messagebox.showerror("Installation error", error, parent=self.root)

        def safe_launch(self, command: str) -> None:
            try:
                launch(command)
            except RuntimeError as error:
                messagebox.showerror("Could not open", str(error), parent=self.root)

        def run(self) -> int:
            self.root.mainloop()
            return 0

    return SetupWindow().run()


def main() -> int:
    parser = argparse.ArgumentParser(description="FigureLoom Bio graphical setup")
    parser.add_argument("--self-test", action="store_true", help="Check setup logic without opening a window.")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    return run_gui()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
