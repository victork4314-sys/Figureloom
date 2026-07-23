from __future__ import annotations

from io import BytesIO
from pathlib import Path
import importlib.util
import json
import tempfile
import unittest
import urllib.error

from figureloom_bio.native_cloud import CloudClient, SessionStore, encryption_self_test
from figureloom_bio.native_core import NativeWorkspace


class FakeResponse:
    def __init__(self, payload, status: int = 200) -> None:
        self.payload = payload
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, _type, _value, _traceback) -> None:
        return None

    def read(self) -> bytes:
        if self.payload is None:
            return b""
        return json.dumps(self.payload).encode("utf-8")


class FakeOpener:
    def __init__(self) -> None:
        self.requests = []

    def __call__(self, request, timeout=0):
        self.requests.append((request, timeout))
        url = request.full_url
        method = request.get_method()
        if url.endswith("/auth/v1/token?grant_type=password") and method == "POST":
            return FakeResponse({
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "expires_in": 3600,
                "user": {
                    "id": "11111111-1111-1111-1111-111111111111",
                    "email": "scientist@example.com",
                    "user_metadata": {"full_name": "Example Scientist", "avatar_symbol": "dna"},
                },
            })
        if "/rest/v1/bio_projects?select=id,title,updated_at,revision" in url and method == "GET":
            return FakeResponse([{
                "id": "22222222-2222-2222-2222-222222222222",
                "title": "Native project",
                "updated_at": "2026-07-23T12:00:00Z",
                "revision": 4,
            }])
        if "/auth/v1/recover?" in url and method == "POST":
            return FakeResponse({})
        raise AssertionError(f"Unexpected fake request: {method} {url}")


class NativeCloudTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.folder = Path(self.temporary.name)
        self.opener = FakeOpener()
        self.client = CloudClient(
            base_url="https://example.supabase.co",
            anon_key="public-test-key",
            store=SessionStore(self.folder / "session.json"),
            opener=self.opener,
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_sign_in_persists_the_shared_figureloom_session(self) -> None:
        session = self.client.sign_in("Scientist@Example.com", "password123")
        self.assertTrue(session.signed_in)
        self.assertEqual(session.email, "scientist@example.com")
        self.assertEqual(session.display_name, "Example Scientist")
        reloaded = self.client.store.load()
        self.assertEqual(reloaded.access_token, "access-token")
        self.assertEqual(reloaded.refresh_token, "refresh-token")
        request, timeout = self.opener.requests[0]
        self.assertEqual(timeout, 45)
        self.assertEqual(request.headers.get("Apikey"), "public-test-key")
        body = json.loads(request.data.decode("utf-8"))
        self.assertEqual(body["email"], "scientist@example.com")

    def test_project_listing_uses_the_authenticated_owner_only_api(self) -> None:
        self.client.sign_in("scientist@example.com", "password123")
        projects = self.client.list_projects()
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0].title, "Native project")
        self.assertEqual(projects[0].revision, 4)
        request, _timeout = self.opener.requests[-1]
        self.assertEqual(request.headers.get("Authorization"), "Bearer access-token")
        self.assertIn("order=updated_at.desc", request.full_url)

    def test_password_recovery_uses_the_official_figureloom_redirect(self) -> None:
        self.client.send_recovery("scientist@example.com")
        request, _timeout = self.opener.requests[-1]
        self.assertIn("/auth/v1/recover?redirect_to=", request.full_url)
        self.assertIn("figureloom.org%2Fide%2F", request.full_url)

    def test_workspace_payload_remains_compatible_with_the_existing_cloud_format(self) -> None:
        workspace = NativeWorkspace(self.folder / "workspace.json")
        workspace.files = {"example.flbio": "Say Hello.\n", "data.csv": "value\n1\n"}
        workspace.active_file = "example.flbio"
        workspace.save()
        payload = self.client.workspace_payload(workspace)
        self.assertEqual(payload["activeFile"], "example.flbio")
        self.assertEqual(payload["deleted"], [])
        restored = NativeWorkspace(self.folder / "restored.json")
        self.client.restore_payload(restored, payload)
        self.assertEqual(restored.files, workspace.files)
        self.assertEqual(restored.active_file, workspace.active_file)

    @unittest.skipUnless(importlib.util.find_spec("cryptography"), "cryptography is bundled in desktop installers")
    def test_aes_gcm_payload_round_trip(self) -> None:
        report = encryption_self_test()
        self.assertEqual(report["iv_bytes"], 12)
        self.assertGreater(report["cipher_bytes"], 16)


if __name__ == "__main__":
    unittest.main()
