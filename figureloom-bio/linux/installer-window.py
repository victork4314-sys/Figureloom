#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import messagebox, ttk

APP_NAME = "FigureLoom Bio"
WORKER = Path("/usr/local/libexec/figureloom-bio-update")
IDE = Path("/usr/local/bin/figureloom-bio-ide")
TEST = Path("/usr/local/bin/figureloom-bio-test")

BG = "#102a2a"
PANEL = "#173838"
PANEL_2 = "#204747"
TEXT = "#f4f7f5"
MUTED = "#b8c9c4"
SAGE = "#9fc5aa"
CYAN = "#9ad9df"
DANGER = "#e5a6a6"


def target_user() -> str:
    for name in (os.environ.get("FIGURELOOM_TARGET_USER"), os.environ.get("SUDO_USER"), os.environ.get("USER")):
        if name and name != "root":
            return name
    return "root"


def target_home() -> Path:
    explicit = os.environ.get("FIGURELOOM_TARGET_HOME")
    if explicit:
        return Path(explicit).expanduser()
    user = target_user()
    if user == "root":
        return Path.home()
    try:
        import pwd

        return Path(pwd.getpwnam(user).pw_dir)
    except (ImportError, KeyError):
        return Path.home()


def user_command(command: list[str]) -> list[str]:
    user = target_user()
    if os.geteuid() == 0 and user != "root" and shutil.which("runuser"):
        return ["runuser", "-u", user, "--", *command]
    return command


def privileged_worker() -> list[str]:
    command = [str(WORKER), "--target-user", target_user()]
    if os.geteuid() == 0:
        return command
    if shutil.which("pkexec"):
        return ["pkexec", *command]
    if shutil.which("sudo"):
        return ["sudo", *command]
    raise RuntimeError("This computer needs pkexec or sudo so the installer can update system files.")


class InstallerWindow(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Install or Update FigureLoom Bio")
        self.geometry("760x610")
        self.minsize(680, 540)
        self.configure(bg=BG)
        self.protocol("WM_DELETE_WINDOW", self.close_window)

        self.events: queue.Queue[tuple[str, object]] = queue.Queue()
        self.running: subprocess.Popen[str] | None = None
        self.install_complete = False

        self._configure_styles()
        self._build()
        self.after(80, self._drain_events)

    def _configure_styles(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Figure.Horizontal.TProgressbar", troughcolor=PANEL_2, background=SAGE, bordercolor=PANEL_2)

    def _build(self) -> None:
        outer = tk.Frame(self, bg=BG, padx=34, pady=28)
        outer.pack(fill="both", expand=True)

        tk.Label(
            outer,
            text="FigureLoom Bio",
            bg=BG,
            fg=TEXT,
            font=("TkDefaultFont", 24, "bold"),
        ).pack(anchor="w")
        tk.Label(
            outer,
            text="Install, update, repair, and test the local biology workspace without digging through terminal commands.",
            bg=BG,
            fg=MUTED,
            wraplength=680,
            justify="left",
            font=("TkDefaultFont", 11),
            pady=8,
        ).pack(anchor="w")

        self.card = tk.Frame(outer, bg=PANEL, padx=24, pady=22, highlightthickness=1, highlightbackground=PANEL_2)
        self.card.pack(fill="both", expand=True, pady=(18, 0))

        self.status = tk.Label(
            self.card,
            text="Ready",
            bg=PANEL,
            fg=TEXT,
            font=("TkDefaultFont", 15, "bold"),
            anchor="w",
        )
        self.status.pack(fill="x")

        self.explainer = tk.Label(
            self.card,
            text=(
                "The installer checks the required Linux pieces first, installs only what is missing, "
                "puts the IDE and test files on the desktop, and runs a real language test before it finishes."
            ),
            bg=PANEL,
            fg=MUTED,
            wraplength=630,
            justify="left",
            anchor="w",
            pady=10,
        )
        self.explainer.pack(fill="x")

        self.progress = ttk.Progressbar(self.card, style="Figure.Horizontal.TProgressbar", mode="determinate", maximum=100)
        self.progress.pack(fill="x", pady=(8, 14))

        self.log = tk.Text(
            self.card,
            height=11,
            bg="#0c2020",
            fg="#dce8e4",
            insertbackground=TEXT,
            relief="flat",
            padx=12,
            pady=10,
            wrap="word",
            state="disabled",
        )
        self.log.pack(fill="both", expand=True)

        buttons = tk.Frame(self.card, bg=PANEL)
        buttons.pack(fill="x", pady=(18, 0))

        self.install_button = self._button(buttons, "Install or update", self.install_or_update, primary=True)
        self.install_button.pack(side="left")
        self.repair_button = self._button(buttons, "Repair", self.repair)
        self.repair_button.pack(side="left", padx=(10, 0))
        self.test_button = self._button(buttons, "Run quick test", self.run_quick_test)
        self.test_button.pack(side="left", padx=(10, 0))

        finish = tk.Frame(outer, bg=BG)
        finish.pack(fill="x", pady=(16, 0))
        self.open_ide_button = self._button(finish, "Open IDE", self.open_ide)
        self.open_ide_button.pack(side="left")
        self.open_files_button = self._button(finish, "Open test files", self.open_test_files)
        self.open_files_button.pack(side="left", padx=(10, 0))
        self.close_button = self._button(finish, "Close", self.close_window)
        self.close_button.pack(side="right")

        self._set_action_buttons()

    def _button(self, parent: tk.Widget, text: str, command, primary: bool = False) -> tk.Button:
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

    def _set_action_buttons(self, busy: bool = False) -> None:
        state = "disabled" if busy else "normal"
        for button in (self.install_button, self.repair_button, self.test_button):
            button.configure(state=state)
        self.open_ide_button.configure(state="normal" if IDE.exists() and not busy else "disabled")
        self.open_files_button.configure(
            state="normal" if (target_home() / "Desktop" / "FigureLoom Bio Test Files").exists() and not busy else "disabled"
        )

    def _append(self, text: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", text.rstrip() + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _reset_log(self) -> None:
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.configure(state="disabled")

    def install_or_update(self) -> None:
        self._start_worker("Installing or updating FigureLoom Bio")

    def repair(self) -> None:
        self._start_worker("Repairing FigureLoom Bio")

    def _start_worker(self, heading: str) -> None:
        if self.running is not None:
            return
        if not WORKER.exists():
            messagebox.showerror(APP_NAME, "The update worker is missing. Run the one-line Linux installer once to repair it.")
            return
        try:
            command = privileged_worker()
        except RuntimeError as error:
            messagebox.showerror(APP_NAME, str(error))
            return

        self._reset_log()
        self.progress["value"] = 2
        self.status.configure(text=heading, fg=TEXT)
        self.explainer.configure(text="You can leave this window open while the installer checks, updates, and tests everything.")
        self._set_action_buttons(busy=True)
        threading.Thread(target=self._run_process, args=(command, "install"), daemon=True).start()

    def run_quick_test(self) -> None:
        if self.running is not None:
            return
        if not TEST.exists():
            messagebox.showerror(APP_NAME, "The quick-test launcher is missing. Use Install or update first.")
            return
        folder = target_home() / "Desktop" / "FigureLoom Bio Test Files"
        command = ["flbio", "quick-test", str(folder)]
        self._reset_log()
        self.progress["value"] = 10
        self.status.configure(text="Running the real FigureLoom Bio quick test", fg=TEXT)
        self.explainer.configure(text="This opens CSV, FASTA, and FASTQ data and creates a figure, alignment, and tree.")
        self._set_action_buttons(busy=True)
        threading.Thread(target=self._run_process, args=(user_command(command), "test"), daemon=True).start()

    def _run_process(self, command: list[str], kind: str) -> None:
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=os.environ.copy(),
            )
            self.running = process
            assert process.stdout is not None
            for raw in process.stdout:
                line = raw.rstrip("\n")
                if line.startswith("PROGRESS "):
                    _, value, message = line.split(" ", 2)
                    try:
                        self.events.put(("progress", (int(value), message)))
                    except ValueError:
                        self.events.put(("log", line))
                else:
                    self.events.put(("log", line))
            status = process.wait()
        except (OSError, ValueError) as error:
            self.events.put(("done", (1, kind, str(error))))
            return
        finally:
            self.running = None
        self.events.put(("done", (status, kind, "")))

    def _drain_events(self) -> None:
        try:
            while True:
                event, payload = self.events.get_nowait()
                if event == "progress":
                    value, message = payload  # type: ignore[misc]
                    self.progress["value"] = value
                    self.status.configure(text=message, fg=TEXT)
                elif event == "log":
                    self._append(str(payload))
                elif event == "done":
                    status, kind, error = payload  # type: ignore[misc]
                    self._finish_task(int(status), str(kind), str(error))
        except queue.Empty:
            pass
        self.after(80, self._drain_events)

    def _finish_task(self, status: int, kind: str, error: str) -> None:
        self._set_action_buttons(busy=False)
        if status == 0:
            self.progress["value"] = 100
            if kind == "install":
                self.install_complete = True
                self.status.configure(text="FigureLoom Bio is ready", fg=SAGE)
                self.explainer.configure(
                    text="The IDE, quick test, and unzipped test files are ready on the desktop. Pick what you want to open next."
                )
            else:
                self.status.configure(text="Quick test passed", fg=SAGE)
                self.explainer.configure(text="The test report and generated files are in the FigureLoom Bio Test Files folder.")
        else:
            self.progress["value"] = 0
            self.status.configure(text="The task did not finish", fg=DANGER)
            self.explainer.configure(
                text="The details below show what stopped it. Nothing outside the FigureLoom Bio installation was removed."
            )
            if error:
                self._append(error)

    def open_ide(self) -> None:
        self._launch_user_app([str(IDE)])

    def open_test_files(self) -> None:
        folder = target_home() / "Desktop" / "FigureLoom Bio Test Files"
        if not folder.exists():
            messagebox.showerror(APP_NAME, "The test-files folder is missing. Use Install or update first.")
            return
        opener = shutil.which("xdg-open")
        if opener is None:
            messagebox.showerror(APP_NAME, "This desktop does not provide xdg-open.")
            return
        self._launch_user_app([opener, str(folder)])

    def _launch_user_app(self, command: list[str]) -> None:
        try:
            subprocess.Popen(user_command(command), env=os.environ.copy(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as error:
            messagebox.showerror(APP_NAME, str(error))

    def close_window(self) -> None:
        if self.running is not None:
            if not messagebox.askyesno(APP_NAME, "An installation task is still running. Close the window anyway?"):
                return
        self.destroy()


def main() -> None:
    try:
        app = InstallerWindow()
    except tk.TclError as error:
        print(f"FigureLoom Bio installer window could not open: {error}", file=sys.stderr)
        raise SystemExit(1)
    app.mainloop()


if __name__ == "__main__":
    main()
