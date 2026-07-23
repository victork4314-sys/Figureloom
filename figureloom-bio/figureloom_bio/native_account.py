from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from PySide6.QtCore import QObject, QRunnable, QThreadPool, Qt, Signal, Slot
from PySide6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from .native_cloud import CloudClient, CloudError, CloudProject, encryption_self_test
from .native_core import (
    LocalProject,
    NativeWorkspace,
    delete_local_project,
    load_local_projects,
    restore_local_project,
    save_workspace_to_gallery,
)


AVATAR_SYMBOLS = {
    "dna": "🧬",
    "flask": "⚗",
    "molecule": "⌬",
    "cell": "◉",
    "wave": "∿",
    "star": "✦",
}

ACCOUNT_FEATURES = {
    "sign_in",
    "create_account",
    "forgot_password",
    "sign_out",
    "save_device",
    "save_cloud",
    "save_cloud_as",
    "refresh_cloud",
    "open_local",
    "delete_local",
    "open_cloud",
    "delete_cloud",
    "local_gallery",
    "cloud_gallery",
}


def _feature_button(label: str, callback: Callable[[], None], name: str, *, primary: bool = False, danger: bool = False) -> QPushButton:
    button = QPushButton(label)
    button.setProperty("accountFeature", name)
    button.setObjectName("primary" if primary else ("danger" if danger else name))
    button.clicked.connect(callback)
    return button


def initials(value: str) -> str:
    parts = [part for part in value.strip().split() if part]
    if not parts:
        return "◌"
    return (parts[0][0] if len(parts) == 1 else parts[0][0] + parts[-1][0]).upper()


def avatar_text(client: CloudClient) -> str:
    session = client.session
    metadata = (session.user or {}).get("user_metadata") if isinstance((session.user or {}).get("user_metadata"), dict) else {}
    symbol = str(metadata.get("avatar_symbol") or "")
    return AVATAR_SYMBOLS.get(symbol, initials(session.display_name))


class TaskSignals(QObject):
    succeeded = Signal(object)
    failed = Signal(str)
    finished = Signal()


class CloudTask(QRunnable):
    def __init__(self, function: Callable[[], Any]) -> None:
        super().__init__()
        self.function = function
        self.signals = TaskSignals()

    @Slot()
    def run(self) -> None:
        try:
            value = self.function()
        except Exception as error:
            self.signals.failed.emit(str(error))
        else:
            self.signals.succeeded.emit(value)
        finally:
            self.signals.finished.emit()


class ProjectsDialog(QDialog):
    workspace_restored = Signal()
    auth_changed = Signal(str, str, bool)

    def __init__(
        self,
        workspace: NativeWorkspace,
        parent: QWidget | None = None,
        *,
        client: CloudClient | None = None,
        allow_network: bool = True,
    ) -> None:
        super().__init__(parent)
        self.workspace = workspace
        self.client = client or CloudClient()
        self.allow_network = allow_network
        self.cloud_projects: list[CloudProject] = []
        self.local_projects: list[LocalProject] = []
        self.thread_pool = QThreadPool.globalInstance()
        self.tasks: list[CloudTask] = []
        self.busy = False
        self._busy_controls: list[QPushButton] = []
        self.setWindowTitle("FigureLoom Bio projects")
        self.resize(1080, 760)
        self.setMinimumSize(800, 580)
        self._build()
        self.refresh_local()
        self.update_auth_ui()
        if self.allow_network and self.client.signed_in:
            self.refresh_cloud()

    def _build(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(22, 20, 22, 20)
        layout.setSpacing(14)

        heading = QLabel("FigureLoom Bio projects")
        heading.setObjectName("heading")
        copy = QLabel("Use the same FigureLoom account. Device projects and encrypted Bio cloud projects stay in separate galleries.")
        copy.setObjectName("muted")
        copy.setWordWrap(True)
        layout.addWidget(heading)
        layout.addWidget(copy)
        layout.addWidget(self._build_auth_card())
        layout.addWidget(self._build_save_card())
        layout.addWidget(self._build_galleries(), 1)

        self.status = QLabel("Ready")
        self.status.setObjectName("muted")
        self.status.setWordWrap(True)
        self.status.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        layout.addWidget(self.status)

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Close)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def _build_auth_card(self) -> QWidget:
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(16, 14, 16, 14)
        title = QLabel("FigureLoom account")
        title.setObjectName("heading")
        layout.addWidget(title)

        self.signed_out = QWidget()
        signed_out_layout = QVBoxLayout(self.signed_out)
        signed_out_layout.setContentsMargins(0, 0, 0, 0)
        fields = QHBoxLayout()
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Name for a new account")
        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Email")
        self.email_input.setInputMethodHints(Qt.InputMethodHint.ImhEmailCharactersOnly)
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Password")
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        fields.addWidget(self.name_input)
        fields.addWidget(self.email_input)
        fields.addWidget(self.password_input)
        signed_out_layout.addLayout(fields)

        actions = QHBoxLayout()
        self.sign_in_button = _feature_button("Sign in", self.sign_in, "sign_in", primary=True)
        self.sign_up_button = _feature_button("Create account", self.sign_up, "create_account")
        self.forgot_button = _feature_button("Forgot password?", self.forgot_password, "forgot_password")
        actions.addWidget(self.sign_in_button)
        actions.addWidget(self.sign_up_button)
        actions.addWidget(self.forgot_button)
        actions.addStretch(1)
        signed_out_layout.addLayout(actions)
        self.password_input.returnPressed.connect(self.sign_in)
        layout.addWidget(self.signed_out)

        self.signed_in = QWidget()
        signed_in_layout = QHBoxLayout(self.signed_in)
        signed_in_layout.setContentsMargins(0, 0, 0, 0)
        self.avatar = QLabel("◌")
        self.avatar.setObjectName("accountAvatar")
        self.avatar.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.avatar.setMinimumSize(48, 48)
        self.user_copy = QLabel()
        self.user_copy.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.sign_out_button = _feature_button("Sign out", self.sign_out, "sign_out")
        signed_in_layout.addWidget(self.avatar)
        signed_in_layout.addWidget(self.user_copy, 1)
        signed_in_layout.addWidget(self.sign_out_button)
        layout.addWidget(self.signed_in)

        self._busy_controls.extend([self.sign_in_button, self.sign_up_button, self.forgot_button, self.sign_out_button])
        return card

    def _build_save_card(self) -> QWidget:
        card = QFrame()
        card.setObjectName("card")
        layout = QHBoxLayout(card)
        layout.setContentsMargins(16, 12, 16, 12)
        self.title_input = QLineEdit(self.workspace.active_file)
        self.title_input.setPlaceholderText("Project title")
        self.save_device_button = _feature_button("Save on this device", self.save_device, "save_device")
        self.save_cloud_button = _feature_button("Save to Bio cloud", self.save_cloud, "save_cloud", primary=True)
        self.save_cloud_as_button = _feature_button("Save as new Bio project", self.save_cloud_as, "save_cloud_as")
        layout.addWidget(self.title_input, 1)
        layout.addWidget(self.save_device_button)
        layout.addWidget(self.save_cloud_button)
        layout.addWidget(self.save_cloud_as_button)
        self._busy_controls.extend([self.save_device_button, self.save_cloud_button, self.save_cloud_as_button])
        return card

    def _build_galleries(self) -> QWidget:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)
        splitter.addWidget(self._gallery_panel(local=True))
        splitter.addWidget(self._gallery_panel(local=False))
        splitter.setSizes([520, 520])
        return splitter

    def _gallery_panel(self, *, local: bool) -> QWidget:
        panel = QFrame()
        panel.setObjectName("card")
        panel.setProperty("accountFeature", "local_gallery" if local else "cloud_gallery")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(14, 12, 14, 14)
        row = QHBoxLayout()
        title = QLabel("On this device" if local else "Encrypted Bio cloud")
        title.setObjectName("heading")
        row.addWidget(title)
        row.addStretch(1)
        if not local:
            self.refresh_cloud_button = _feature_button("Refresh", self.refresh_cloud, "refresh_cloud")
            row.addWidget(self.refresh_cloud_button)
            self._busy_controls.append(self.refresh_cloud_button)
        layout.addLayout(row)
        note = QLabel("FigureLoom Bio only" if local else "Private to the signed-in FigureLoom account")
        note.setObjectName("muted")
        layout.addWidget(note)

        listing = QListWidget()
        listing.setWordWrap(True)
        layout.addWidget(listing, 1)
        actions = QHBoxLayout()
        if local:
            self.local_list = listing
            self.open_local_button = _feature_button("Open", self.open_local, "open_local", primary=True)
            self.delete_local_button = _feature_button("Delete", self.delete_local, "delete_local", danger=True)
            self.local_list.itemDoubleClicked.connect(lambda _item: self.open_local())
            actions.addWidget(self.open_local_button)
            actions.addWidget(self.delete_local_button)
            self._busy_controls.extend([self.open_local_button, self.delete_local_button])
        else:
            self.cloud_list = listing
            self.open_cloud_button = _feature_button("Open", self.open_cloud, "open_cloud", primary=True)
            self.delete_cloud_button = _feature_button("Delete", self.delete_cloud, "delete_cloud", danger=True)
            self.cloud_list.itemDoubleClicked.connect(lambda _item: self.open_cloud())
            actions.addWidget(self.open_cloud_button)
            actions.addWidget(self.delete_cloud_button)
            self._busy_controls.extend([self.open_cloud_button, self.delete_cloud_button])
        actions.addStretch(1)
        layout.addLayout(actions)
        return panel

    def feature_names(self) -> set[str]:
        names = {
            str(button.property("accountFeature"))
            for button in self.findChildren(QPushButton)
            if button.property("accountFeature")
        }
        names.update(
            str(panel.property("accountFeature"))
            for panel in self.findChildren(QFrame)
            if panel.property("accountFeature")
        )
        return names

    def _set_busy(self, busy: bool, message: str = "") -> None:
        self.busy = busy
        for control in self._busy_controls:
            control.setEnabled(not busy)
        if message:
            self.status.setText(message)
        if not busy:
            self.update_auth_ui()

    def _task(self, message: str, function: Callable[[], Any], success: Callable[[Any], None]) -> None:
        if self.busy:
            return
        if not self.allow_network:
            self.status.setText("Network actions are disabled in the native self-test.")
            return
        self._set_busy(True, message)
        task = CloudTask(function)
        self.tasks.append(task)
        task.signals.succeeded.connect(success)
        task.signals.failed.connect(lambda error: self.status.setText(error))

        def finished() -> None:
            if task in self.tasks:
                self.tasks.remove(task)
            self._set_busy(False)

        task.signals.finished.connect(finished)
        self.thread_pool.start(task)

    def update_auth_ui(self) -> None:
        signed = self.client.signed_in
        self.signed_out.setVisible(not signed)
        self.signed_in.setVisible(signed)
        self.save_cloud_button.setEnabled(signed and not self.busy)
        self.save_cloud_as_button.setEnabled(signed and not self.busy)
        self.open_cloud_button.setEnabled(signed and not self.busy)
        self.delete_cloud_button.setEnabled(signed and not self.busy)
        self.refresh_cloud_button.setEnabled(signed and not self.busy)
        if signed:
            self.avatar.setText(avatar_text(self.client))
            self.user_copy.setText(f"{self.client.session.display_name}\n{self.client.session.email}")
        else:
            self.avatar.setText("◌")
            self.user_copy.clear()
            self.cloud_projects = []
            self.render_cloud()
        self.auth_changed.emit(self.client.session.display_name, self.client.session.email, signed)

    def refresh_local(self) -> None:
        self.local_projects = load_local_projects()
        self.local_list.clear()
        for project in self.local_projects:
            item = QListWidgetItem(f"{project.title}\n{project.updated_at}")
            item.setData(Qt.ItemDataRole.UserRole, project.id)
            self.local_list.addItem(item)
        if self.local_list.count():
            self.local_list.setCurrentRow(0)

    def render_cloud(self) -> None:
        self.cloud_list.clear()
        for project in self.cloud_projects:
            item = QListWidgetItem(f"{project.title}\nRevision {project.revision} · {project.updated_at}")
            item.setData(Qt.ItemDataRole.UserRole, project.id)
            self.cloud_list.addItem(item)
        if self.cloud_list.count():
            self.cloud_list.setCurrentRow(0)

    def selected_local(self) -> LocalProject | None:
        item = self.local_list.currentItem()
        if not item:
            return None
        project_id = str(item.data(Qt.ItemDataRole.UserRole))
        return next((project for project in self.local_projects if project.id == project_id), None)

    def selected_cloud(self) -> CloudProject | None:
        item = self.cloud_list.currentItem()
        if not item:
            return None
        project_id = str(item.data(Qt.ItemDataRole.UserRole))
        return next((project for project in self.cloud_projects if project.id == project_id), None)

    def save_device(self) -> None:
        project = save_workspace_to_gallery(self.workspace, self.title_input.text())
        self.status.setText(f"Saved {project.title} in the separate FigureLoom Bio device gallery.")
        self.refresh_local()

    def open_local(self) -> None:
        project = self.selected_local()
        if project:
            restore_local_project(self.workspace, project)
            self.workspace_restored.emit()
            self.status.setText(f"Opened {project.title} from this device.")
            self.accept()

    def delete_local(self) -> None:
        project = self.selected_local()
        if not project:
            return
        answer = QMessageBox.question(self, "Delete project", f"Delete {project.title} from this computer?")
        if answer == QMessageBox.StandardButton.Yes:
            delete_local_project(project.id)
            self.status.setText(f"Deleted {project.title} from this device.")
            self.refresh_local()

    def sign_in(self) -> None:
        email = self.email_input.text()
        password = self.password_input.text()

        def success(_session: Any) -> None:
            self.password_input.clear()
            self.status.setText("Signed in to the shared FigureLoom account.")
            self.update_auth_ui()
            self.refresh_cloud()

        self._task("Signing in…", lambda: self.client.sign_in(email, password), success)

    def sign_up(self) -> None:
        email = self.email_input.text()
        password = self.password_input.text()
        name = self.name_input.text()

        def success(result: Any) -> None:
            _session, message = result
            self.password_input.clear()
            self.status.setText(str(message))
            self.update_auth_ui()
            if self.client.signed_in:
                self.refresh_cloud()

        self._task("Creating the FigureLoom account…", lambda: self.client.sign_up(email, password, name), success)

    def forgot_password(self) -> None:
        email = self.email_input.text()

        def success(_value: Any) -> None:
            self.status.setText("Password recovery email sent. The secure recovery link opens the official FigureLoom recovery page.")

        self._task("Sending the password recovery email…", lambda: self.client.send_recovery(email), success)

    def sign_out(self) -> None:
        def success(_value: Any) -> None:
            self.status.setText("Signed out. Projects saved on this device remain here.")
            self.update_auth_ui()

        self._task("Signing out…", self.client.sign_out, success)

    def refresh_cloud(self) -> None:
        if not self.client.signed_in:
            self.status.setText("Sign in to see encrypted FigureLoom Bio cloud projects.")
            return

        def success(projects: Any) -> None:
            self.cloud_projects = list(projects)
            self.render_cloud()
            self.status.setText(f"Loaded {len(self.cloud_projects):,} encrypted Bio cloud project(s).")

        self._task("Loading encrypted Bio cloud projects…", self.client.list_projects, success)

    def save_cloud(self) -> None:
        self._save_cloud(False)

    def save_cloud_as(self) -> None:
        self._save_cloud(True)

    def _save_cloud(self, force_new: bool) -> None:
        title = self.title_input.text()

        def success(project: Any) -> None:
            self.status.setText(f"Encrypted Bio cloud project saved · revision {project.revision}.")
            self.refresh_cloud()

        self._task(
            "Encrypting and saving the Bio cloud project…",
            lambda: self.client.save_project(self.workspace, title, force_new=force_new),
            success,
        )

    def open_cloud(self) -> None:
        project = self.selected_cloud()
        if not project:
            return

        def success(opened: Any) -> None:
            self.status.setText(f"Decrypted and opened {opened.title}.")
            self.workspace_restored.emit()
            self.accept()

        self._task(
            "Downloading and decrypting the Bio cloud project…",
            lambda: self.client.open_project(self.workspace, project.id),
            success,
        )

    def delete_cloud(self) -> None:
        project = self.selected_cloud()
        if not project:
            return
        answer = QMessageBox.question(self, "Delete cloud project", f"Delete {project.title} from the encrypted Bio cloud?")
        if answer != QMessageBox.StandardButton.Yes:
            return

        def success(_value: Any) -> None:
            self.status.setText(f"Deleted {project.title} from the Bio cloud.")
            self.refresh_cloud()

        self._task("Deleting the Bio cloud project…", lambda: self.client.delete_project(project.id), success)


class NativeAccountIntegration:
    def __init__(self, native_ide_module: Any) -> None:
        self.module = native_ide_module
        self.base_window = native_ide_module.NativeIdeWindow

    def install(self) -> type[Any]:
        base = self.base_window

        class CompleteNativeIdeWindow(base):
            def __init__(self, *args: Any, **kwargs: Any) -> None:
                super().__init__(*args, **kwargs)
                self.cloud_client = CloudClient()
                self._refresh_account_button()

            def _refresh_account_button(self) -> None:
                if self.cloud_client.signed_in:
                    self.account_button.setText(avatar_text(self.cloud_client))
                    self.account_button.setToolTip(
                        f"{self.cloud_client.session.display_name} · FigureLoom Bio projects"
                    )
                else:
                    self.account_button.setText("◌")
                    self.account_button.setToolTip("Sign in or open FigureLoom Bio projects")

            def open_projects(self) -> None:
                dialog = ProjectsDialog(self.workspace, self, client=self.cloud_client)
                dialog.workspace_restored.connect(self.refresh_all)
                dialog.auth_changed.connect(lambda _name, _email, _signed: self._refresh_account_button())
                dialog.exec()
                self._refresh_account_button()

            def feature_names(self) -> set[str]:
                names = set(super().feature_names())
                labels = {
                    self.tabs.tabText(index).strip().casefold()
                    for index in range(self.tabs.count())
                }
                if "text" in labels:
                    names.add("text_mode")
                if "blocks" in labels:
                    names.add("blocks_mode")
                return names

        self.module.NativeIdeWindow = CompleteNativeIdeWindow
        original_self_test = self.module.native_self_test

        def complete_self_test() -> int:
            native_account_self_test()
            return original_self_test()

        self.module.native_self_test = complete_self_test
        return CompleteNativeIdeWindow


def native_account_self_test() -> dict[str, Any]:
    import tempfile

    folder = Path(tempfile.mkdtemp(prefix="figureloom-native-account-test-"))
    try:
        workspace = NativeWorkspace(folder / "workspace.json")
        client = CloudClient(store=None)
        client.store.path = folder / "session.json"
        client.session = client.store.load()
        dialog = ProjectsDialog(workspace, client=client, allow_network=False)
        missing = sorted(ACCOUNT_FEATURES - dialog.feature_names())
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
        return report
    finally:
        import shutil
        shutil.rmtree(folder, ignore_errors=True)


def install_native_account(native_ide_module: Any) -> type[Any]:
    return NativeAccountIntegration(native_ide_module).install()


__all__ = [
    "ACCOUNT_FEATURES",
    "ProjectsDialog",
    "avatar_text",
    "install_native_account",
    "native_account_self_test",
]
