from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any

from .native_core import NativeWorkspace, application_data_folder


SUPABASE_URL = "https://yzjqciycdbnpnndxvpgq.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_hHhDcLXqCmhJSA80NX0gtA_2L1lW4O0"
RECOVERY_REDIRECT_URL = "https://figureloom.org/ide/"
SESSION_VERSION = 1


class CloudError(RuntimeError):
    pass


@dataclass(frozen=True)
class CloudProject:
    id: str
    title: str
    updated_at: str
    revision: int
    cipher_text: str = ""
    iv: str = ""


@dataclass
class AuthSession:
    access_token: str = ""
    refresh_token: str = ""
    expires_at: float = 0.0
    user: dict[str, Any] | None = None
    current_project_id: str = ""

    @property
    def signed_in(self) -> bool:
        return bool(self.access_token and self.user)

    @property
    def email(self) -> str:
        return str((self.user or {}).get("email") or "")

    @property
    def user_id(self) -> str:
        return str((self.user or {}).get("id") or "")

    @property
    def display_name(self) -> str:
        user = self.user or {}
        metadata = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}
        name = str(metadata.get("full_name") or metadata.get("name") or "").strip()
        return name or self.email.split("@")[0] or "Scientist"


class SessionStore:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or application_data_folder() / "cloud-session.json"

    def load(self) -> AuthSession:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return AuthSession()
        if not isinstance(payload, dict):
            return AuthSession()
        user = payload.get("user") if isinstance(payload.get("user"), dict) else None
        return AuthSession(
            access_token=str(payload.get("access_token") or ""),
            refresh_token=str(payload.get("refresh_token") or ""),
            expires_at=float(payload.get("expires_at") or 0.0),
            user=user,
            current_project_id=str(payload.get("current_project_id") or ""),
        )

    def save(self, session: AuthSession) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": SESSION_VERSION,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_at": session.expires_at,
            "user": session.user,
            "current_project_id": session.current_project_id,
        }
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            os.chmod(temporary, 0o600)
        except OSError:
            pass
        temporary.replace(self.path)

    def clear(self) -> None:
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass


class CloudClient:
    def __init__(
        self,
        *,
        base_url: str = SUPABASE_URL,
        anon_key: str = SUPABASE_ANON_KEY,
        store: SessionStore | None = None,
        opener: Any | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key
        self.store = store or SessionStore()
        self.session = self.store.load()
        self.opener = opener or urllib.request.urlopen

    @property
    def signed_in(self) -> bool:
        return self.session.signed_in

    def _headers(self, *, authenticated: bool = False, prefer: str = "") -> dict[str, str]:
        headers = {
            "apikey": self.anon_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "FigureLoom-Bio-Native",
        }
        if authenticated:
            if not self.session.access_token:
                raise CloudError("Sign in to the shared FigureLoom account first.")
            headers["Authorization"] = f"Bearer {self.session.access_token}"
        if prefer:
            headers["Prefer"] = prefer
        return headers

    @staticmethod
    def _error_message(error: urllib.error.HTTPError) -> str:
        try:
            raw = error.read().decode("utf-8", errors="replace")
            payload = json.loads(raw)
        except (OSError, ValueError, TypeError):
            return f"The FigureLoom cloud returned HTTP {error.code}."
        if isinstance(payload, dict):
            return str(
                payload.get("error_description")
                or payload.get("msg")
                or payload.get("message")
                or payload.get("error")
                or f"The FigureLoom cloud returned HTTP {error.code}."
            )
        return str(payload)

    def _request(
        self,
        method: str,
        path: str,
        payload: Any | None = None,
        *,
        authenticated: bool = False,
        prefer: str = "",
        retry_auth: bool = True,
    ) -> Any:
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=self._headers(authenticated=authenticated, prefer=prefer),
            method=method,
        )
        try:
            with self.opener(request, timeout=45) as response:
                raw = response.read()
        except urllib.error.HTTPError as error:
            if authenticated and retry_auth and error.code in {401, 403} and self.session.refresh_token:
                self.refresh_session()
                return self._request(
                    method,
                    path,
                    payload,
                    authenticated=authenticated,
                    prefer=prefer,
                    retry_auth=False,
                )
            raise CloudError(self._error_message(error)) from error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            raise CloudError(f"The FigureLoom cloud could not be reached.\n\n{error}") from error
        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeError, ValueError) as error:
            raise CloudError("The FigureLoom cloud returned an unreadable response.") from error

    @staticmethod
    def _session_from_payload(payload: Any, previous: AuthSession | None = None) -> AuthSession:
        if not isinstance(payload, dict):
            raise CloudError("The sign-in response was incomplete.")
        access = str(payload.get("access_token") or "")
        refresh = str(payload.get("refresh_token") or "")
        user = payload.get("user") if isinstance(payload.get("user"), dict) else None
        if not access or not user:
            raise CloudError("The sign-in response did not contain a usable session.")
        expires_at = float(payload.get("expires_at") or 0.0)
        if not expires_at:
            expires_at = time.time() + float(payload.get("expires_in") or 3600)
        return AuthSession(
            access_token=access,
            refresh_token=refresh or (previous.refresh_token if previous else ""),
            expires_at=expires_at,
            user=user,
            current_project_id=previous.current_project_id if previous else "",
        )

    def sign_in(self, email: str, password: str) -> AuthSession:
        address = email.strip().casefold()
        if not address:
            raise CloudError("Enter your email address.")
        if len(password) < 8:
            raise CloudError("Use a password with at least 8 characters.")
        payload = self._request(
            "POST",
            "/auth/v1/token?grant_type=password",
            {"email": address, "password": password},
        )
        self.session = self._session_from_payload(payload, self.session)
        self.store.save(self.session)
        return self.session

    def sign_up(self, email: str, password: str, full_name: str = "") -> tuple[AuthSession | None, str]:
        address = email.strip().casefold()
        if not address:
            raise CloudError("Enter your email address.")
        if len(password) < 8:
            raise CloudError("Use a password with at least 8 characters.")
        name = full_name.strip() or address.split("@")[0]
        payload = self._request(
            "POST",
            "/auth/v1/signup",
            {
                "email": address,
                "password": password,
                "data": {"full_name": name},
            },
        )
        if isinstance(payload, dict) and payload.get("access_token"):
            self.session = self._session_from_payload(payload, self.session)
            self.store.save(self.session)
            return self.session, "Account created and signed in."
        return None, "Account created. Check your email if confirmation is required."

    def send_recovery(self, email: str) -> None:
        address = email.strip().casefold()
        if not address:
            raise CloudError("Enter your email address.")
        redirect = urllib.parse.quote(RECOVERY_REDIRECT_URL, safe="")
        self._request("POST", f"/auth/v1/recover?redirect_to={redirect}", {"email": address})

    def refresh_session(self) -> AuthSession:
        if not self.session.refresh_token:
            raise CloudError("The saved FigureLoom session has expired. Sign in again.")
        payload = self._request(
            "POST",
            "/auth/v1/token?grant_type=refresh_token",
            {"refresh_token": self.session.refresh_token},
        )
        self.session = self._session_from_payload(payload, self.session)
        self.store.save(self.session)
        return self.session

    def validate_session(self) -> AuthSession:
        if not self.session.access_token:
            return self.session
        if self.session.expires_at and self.session.expires_at <= time.time() + 30:
            return self.refresh_session()
        payload = self._request("GET", "/auth/v1/user", authenticated=True)
        if isinstance(payload, dict) and payload.get("id"):
            self.session.user = payload
            self.store.save(self.session)
        return self.session

    def sign_out(self) -> None:
        if self.session.access_token:
            try:
                self._request("POST", "/auth/v1/logout", authenticated=True, retry_auth=False)
            except CloudError:
                pass
        self.session = AuthSession()
        self.store.clear()

    @staticmethod
    def _project(item: Any) -> CloudProject:
        if not isinstance(item, dict):
            raise CloudError("The cloud project record was invalid.")
        return CloudProject(
            id=str(item.get("id") or ""),
            title=str(item.get("title") or "Untitled Bio project"),
            updated_at=str(item.get("updated_at") or ""),
            revision=int(item.get("revision") or 0),
            cipher_text=str(item.get("cipher_text") or ""),
            iv=str(item.get("iv") or ""),
        )

    def list_projects(self) -> list[CloudProject]:
        payload = self._request(
            "GET",
            "/rest/v1/bio_projects?select=id,title,updated_at,revision&order=updated_at.desc",
            authenticated=True,
        )
        return [self._project(item) for item in payload if isinstance(payload, list)]

    def _get_project(self, project_id: str) -> CloudProject:
        wanted = urllib.parse.quote(project_id, safe="")
        payload = self._request(
            "GET",
            f"/rest/v1/bio_projects?select=*&id=eq.{wanted}&limit=1",
            authenticated=True,
        )
        if not isinstance(payload, list) or not payload:
            raise CloudError("That FigureLoom Bio cloud project could not be found.")
        return self._project(payload[0])

    def _create_project(self, title: str) -> CloudProject:
        project_id = str(uuid.uuid4())
        payload = self._request(
            "POST",
            "/rest/v1/bio_projects",
            {
                "id": project_id,
                "owner_id": self.session.user_id,
                "title": title,
                "cipher_text": "",
                "iv": "",
                "revision": 0,
            },
            authenticated=True,
            prefer="return=representation",
        )
        if not isinstance(payload, list) or not payload:
            return CloudProject(project_id, title, datetime.now(timezone.utc).isoformat(), 0)
        return self._project(payload[0])

    def _project_key(self, project_id: str) -> bytes:
        payload = self._request(
            "POST",
            "/rest/v1/rpc/get_bio_project_key",
            {"target_project": project_id},
            authenticated=True,
        )
        key_text = str(payload or "").strip()
        try:
            key = base64.b64decode(key_text, validate=True)
        except (ValueError, TypeError) as error:
            raise CloudError("The encrypted Bio project key was invalid.") from error
        if len(key) not in {16, 24, 32}:
            raise CloudError("The encrypted Bio project key had an unsupported size.")
        return key

    @staticmethod
    def workspace_payload(workspace: NativeWorkspace) -> dict[str, Any]:
        return {
            "version": 1,
            "files": dict(workspace.files),
            "activeFile": workspace.active_file,
            "deleted": [],
        }

    @staticmethod
    def restore_payload(workspace: NativeWorkspace, payload: Any) -> None:
        if not isinstance(payload, dict) or not isinstance(payload.get("files"), dict):
            raise CloudError("The encrypted Bio project did not contain a valid workspace.")
        files = {str(name): str(content) for name, content in payload["files"].items()}
        if not files:
            raise CloudError("The encrypted Bio project contained no files.")
        active = str(payload.get("activeFile") or payload.get("active_file") or "")
        workspace.files = files
        workspace.active_file = active if active in files else workspace.first_file()
        workspace.save()

    @staticmethod
    def encrypt_payload(payload: dict[str, Any], key: bytes, iv: bytes | None = None) -> tuple[str, str]:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as error:
            raise CloudError("The native encryption component is missing. Repair FigureLoom Bio.") from error
        nonce = iv or os.urandom(12)
        if len(nonce) != 12:
            raise CloudError("AES-GCM requires a 12-byte project nonce.")
        plain = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        encrypted = AESGCM(key).encrypt(nonce, plain, None)
        return base64.b64encode(encrypted).decode("ascii"), base64.b64encode(nonce).decode("ascii")

    @staticmethod
    def decrypt_payload(cipher_text: str, iv: str, key: bytes) -> dict[str, Any]:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            encrypted = base64.b64decode(cipher_text, validate=True)
            nonce = base64.b64decode(iv, validate=True)
            plain = AESGCM(key).decrypt(nonce, encrypted, None)
            payload = json.loads(plain.decode("utf-8"))
        except ImportError as error:
            raise CloudError("The native encryption component is missing. Repair FigureLoom Bio.") from error
        except Exception as error:
            raise CloudError("The encrypted FigureLoom Bio project could not be opened.") from error
        if not isinstance(payload, dict):
            raise CloudError("The encrypted FigureLoom Bio project was invalid.")
        return payload

    def save_project(self, workspace: NativeWorkspace, title: str, *, force_new: bool = False) -> CloudProject:
        self.validate_session()
        clean_title = title.strip() or workspace.active_file or "Untitled Bio project"
        project: CloudProject
        if force_new or not self.session.current_project_id:
            project = self._create_project(clean_title)
        else:
            try:
                project = self._get_project(self.session.current_project_id)
            except CloudError:
                project = self._create_project(clean_title)
        key = self._project_key(project.id)
        cipher_text, iv = self.encrypt_payload(self.workspace_payload(workspace), key)
        next_revision = project.revision + 1
        wanted = urllib.parse.quote(project.id, safe="")
        payload = self._request(
            "PATCH",
            f"/rest/v1/bio_projects?id=eq.{wanted}",
            {
                "title": clean_title,
                "cipher_text": cipher_text,
                "iv": iv,
                "revision": next_revision,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            authenticated=True,
            prefer="return=representation",
        )
        saved = self._project(payload[0]) if isinstance(payload, list) and payload else CloudProject(
            project.id,
            clean_title,
            datetime.now(timezone.utc).isoformat(),
            next_revision,
            cipher_text,
            iv,
        )
        self.session.current_project_id = saved.id
        self.store.save(self.session)
        return saved

    def open_project(self, workspace: NativeWorkspace, project_id: str) -> CloudProject:
        self.validate_session()
        project = self._get_project(project_id)
        if not project.cipher_text or not project.iv:
            raise CloudError("This Bio project has not completed its first save.")
        payload = self.decrypt_payload(project.cipher_text, project.iv, self._project_key(project.id))
        self.restore_payload(workspace, payload)
        self.session.current_project_id = project.id
        self.store.save(self.session)
        return project

    def delete_project(self, project_id: str) -> None:
        self.validate_session()
        wanted = urllib.parse.quote(project_id, safe="")
        self._request(
            "DELETE",
            f"/rest/v1/bio_projects?id=eq.{wanted}",
            authenticated=True,
        )
        if self.session.current_project_id == project_id:
            self.session.current_project_id = ""
            self.store.save(self.session)


def encryption_self_test() -> dict[str, Any]:
    key = bytes(range(32))
    iv = bytes(range(12))
    payload = {
        "version": 1,
        "files": {"test.flbio": "Say Native encrypted cloud test.\n"},
        "activeFile": "test.flbio",
        "deleted": [],
    }
    cipher_text, encoded_iv = CloudClient.encrypt_payload(payload, key, iv)
    restored = CloudClient.decrypt_payload(cipher_text, encoded_iv, key)
    if restored != payload:
        raise RuntimeError("The native encrypted cloud payload did not round-trip.")
    if len(base64.b64decode(encoded_iv)) != 12:
        raise RuntimeError("The native encrypted cloud IV was not WebCrypto-compatible.")
    return {"cipher_bytes": len(base64.b64decode(cipher_text)), "iv_bytes": 12}


__all__ = [
    "AuthSession",
    "CloudClient",
    "CloudError",
    "CloudProject",
    "SessionStore",
    "encryption_self_test",
]
