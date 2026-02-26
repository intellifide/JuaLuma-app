import base64
from email.parser import BytesParser
from email.policy import default

from backend.services.email import GmailApiEmailClient


def _decode_raw_message(raw: str):
    padded = raw + ("=" * ((4 - len(raw) % 4) % 4))
    message_bytes = base64.urlsafe_b64decode(padded.encode("utf-8"))
    return BytesParser(policy=default).parsebytes(message_bytes)


def test_send_otp_uses_primary_mailbox_and_noreply_sender(monkeypatch):
    from backend.services import email as email_service

    monkeypatch.setattr(email_service.settings, "gmail_impersonate_user", "hello@jualuma.com")
    monkeypatch.setattr(
        email_service.settings,
        "gmail_otp_impersonate_user",
        "noreply@jualuma.com",
    )

    client = GmailApiEmailClient()
    captured: dict[str, str | None] = {}

    def fake_send(
        message_body: dict,
        impersonate_user: str | None = None,
        preferred_from_email: str | None = None,
    ) -> None:
        captured["raw"] = message_body["raw"]
        captured["impersonate_user"] = impersonate_user
        captured["preferred_from_email"] = preferred_from_email

    monkeypatch.setattr(client, "_send", fake_send)

    client.send_otp("user@example.com", "123456")

    parsed = _decode_raw_message(str(captured["raw"]))
    assert captured["impersonate_user"] == "hello@jualuma.com"
    assert captured["preferred_from_email"] == "noreply@jualuma.com"
    assert parsed["From"] == "JuaLuma Security <noreply@jualuma.com>"
    assert parsed["Reply-To"] == "noreply@jualuma.com"


def test_send_uses_explicit_sender_user_mailbox(monkeypatch):
    client = GmailApiEmailClient()
    captured: dict[str, str] = {}

    class FakeSendRequest:
        def execute(self):
            captured["executed"] = "true"
            return {"id": "msg_123"}

    class FakeMessagesApi:
        def send(self, userId: str, body: dict):
            captured["userId"] = userId
            captured["raw"] = body["raw"]
            return FakeSendRequest()

    class FakeUsersApi:
        def messages(self):
            return FakeMessagesApi()

    class FakeService:
        def users(self):
            return FakeUsersApi()

    monkeypatch.setattr(
        client,
        "_get_service",
        lambda _impersonate_user=None, include_settings_scopes=False: FakeService(),
    )

    client._send({"raw": "abc"}, impersonate_user="noreply@jualuma.com")

    assert captured["userId"] == "noreply@jualuma.com"
    assert captured["raw"] == "abc"
    assert captured["executed"] == "true"


def test_send_tolerates_settings_scope_failures_for_alias_enforcement(monkeypatch):
    client = GmailApiEmailClient()
    captured: dict[str, object] = {"settings_scope_attempted": False}

    class FakeSendRequest:
        def execute(self):
            captured["executed"] = True
            return {"id": "msg_456"}

    class FakeMessagesApi:
        def send(self, userId: str, body: dict):
            captured["userId"] = userId
            captured["raw"] = body["raw"]
            return FakeSendRequest()

    class FakeUsersApi:
        def messages(self):
            return FakeMessagesApi()

    class FakeSendService:
        def users(self):
            return FakeUsersApi()

    def fake_get_service(_impersonate_user=None, include_settings_scopes=False):
        if include_settings_scopes:
            captured["settings_scope_attempted"] = True
            raise RuntimeError("invalid_scope")
        return FakeSendService()

    monkeypatch.setattr(client, "_get_service", fake_get_service)

    client._send(
        {"raw": "def"},
        impersonate_user="hello@jualuma.com",
        preferred_from_email="noreply@jualuma.com",
    )

    assert captured["settings_scope_attempted"] is True
    assert captured["userId"] == "hello@jualuma.com"
    assert captured["raw"] == "def"
    assert captured["executed"] is True


def test_ensure_send_as_default_creates_missing_alias_and_sets_default():
    client = GmailApiEmailClient()
    captured: dict[str, object] = {}

    class FakeListRequest:
        def execute(self):
            return {
                "sendAs": [
                    {"sendAsEmail": "hello@jualuma.com", "isDefault": True},
                    {"sendAsEmail": "support@jualuma.com", "isDefault": False},
                ]
            }

    class FakeCreateRequest:
        def execute(self):
            captured["create_executed"] = True
            return {
                "sendAsEmail": "noreply@jualuma.com",
                "isDefault": False,
                "verificationStatus": "accepted",
            }

    class FakePatchRequest:
        def execute(self):
            captured["patch_executed"] = True
            return {"sendAsEmail": "noreply@jualuma.com", "isDefault": True}

    class FakeSendAsApi:
        def list(self, userId: str):
            captured["list_userId"] = userId
            return FakeListRequest()

        def create(self, userId: str, body: dict):
            captured["create_userId"] = userId
            captured["create_body"] = body
            return FakeCreateRequest()

        def patch(self, userId: str, sendAsEmail: str, body: dict):
            captured["patch_userId"] = userId
            captured["patch_sendAsEmail"] = sendAsEmail
            captured["patch_body"] = body
            return FakePatchRequest()

    class FakeSettingsApi:
        def sendAs(self):
            return FakeSendAsApi()

    class FakeUsersApi:
        def settings(self):
            return FakeSettingsApi()

    class FakeService:
        def users(self):
            return FakeUsersApi()

    client._ensure_send_as_default(
        service=FakeService(),
        sender_user="hello@jualuma.com",
        preferred_from_email="noreply@jualuma.com",
    )

    assert captured["list_userId"] == "hello@jualuma.com"
    assert captured["create_userId"] == "hello@jualuma.com"
    assert captured["create_body"] == {
        "sendAsEmail": "noreply@jualuma.com",
        "treatAsAlias": True,
    }
    assert captured["create_executed"] is True
    assert captured["patch_userId"] == "hello@jualuma.com"
    assert captured["patch_sendAsEmail"] == "noreply@jualuma.com"
    assert captured["patch_body"] == {"isDefault": True}
    assert captured["patch_executed"] is True
