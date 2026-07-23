from __future__ import annotations

from pathlib import Path
import os
import tempfile
from typing import Any, Callable

from .native_cloud import CloudClient, SessionStore, encryption_self_test
from .native_core import NativeWorkspace


def install_runtime_fixes(account_module: Any) -> None:
    def _task(self, message: str, function: Callable[[], Any], success: Callable[[Any], None]) -> None:
        if self.busy:
            return
        if not self.allow_network:
            self.status.setText("Network actions are disabled in the native self-test.")
            return
        self._set_busy(True, message)
        task = account_module.CloudTask(function)
        self.tasks.append(task)
        state: dict[str, Any] = {"value": None, "error": "", "succeeded": False}

        def received(value: Any) -> None:
            state["value"] = value
            state["succeeded"] = True

        def failed(error: str) -> None:
            state["error"] = error

        def finished() -> None:
            if task in self.tasks:
                self.tasks.remove(task)
            self._set_busy(False)
            if state["error"]:
                self.status.setText(str(state["error"]))
            elif state["succeeded"]:
                success(state["value"])

        task.signals.succeeded.connect(received)
        task.signals.failed.connect(failed)
        task.signals.finished.connect(finished)
        self.thread_pool.start(task)

    account_module.ProjectsDialog._task = _task

    def native_account_self_test() -> dict[str, Any]:
        from PySide6.QtWidgets import QApplication

        os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
        app = QApplication.instance() or QApplication(["FigureLoom Bio native account self-test"])
        folder = Path(tempfile.mkdtemp(prefix="figureloom-native-account-test-"))
        try:
            workspace = NativeWorkspace(folder / "workspace.json")
            client = CloudClient(store=SessionStore(folder / "session.json"))
            dialog = account_module.ProjectsDialog(workspace, client=client, allow_network=False)
            missing = sorted(account_module.ACCOUNT_FEATURES - dialog.feature_names())
            if missing:
                raise RuntimeError("Missing native account controls: " + ", ".join(missing))
            crypto = encryption_self_test()
            report = {
                "account_controls": sorted(dialog.feature_names()),
                "encrypted_cloud": True,
                "shared_figureloom_account": True,
                "browser_interface": False,
                **crypto,
            }
            dialog.close()
            app.processEvents()
            return report
        finally:
            import shutil
            shutil.rmtree(folder, ignore_errors=True)

    account_module.native_account_self_test = native_account_self_test


__all__ = ["install_runtime_fixes"]
