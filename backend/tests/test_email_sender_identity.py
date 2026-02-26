import base64
from email.parser import BytesParser
from email.policy import default

from backend.services.email import GmailApiEmailClient


def _decode_raw_message(raw: str):
    padded = raw + ("=" * ((4 - len(raw) % 4) % 4))
    message_bytes = base64.urlsafe_b64decode(padded.encode("utf-8"))
    return BytesParser(policy=default).parsebytes(message_bytes)


def test_send_otp_uses_dedicated_otp_impersonation_and_noreply_sender(monkeypatch):
    from backend.services import email as email_service

    monkeypatch.setattr(email_service.settings, "gmail_impersonate_user", "hello@jualuma.com")
    monkeypatch.setattr(
        email_service.settings,
        "gmail_otp_impersonate_user",
        "noreply@jualuma.com",
    )

    client = GmailApiEmailClient()
    captured: dict[str, str | None] = {}

    def fake_send(message_body: dict, impersonate_user: str | None = None) -> None:
        captured["raw"] = message_body["raw"]
        captured["impersonate_user"] = impersonate_user

    monkeypatch.setattr(client, "_send", fake_send)

    client.send_otp("user@example.com", "123456")

    parsed = _decode_raw_message(str(captured["raw"]))
    assert captured["impersonate_user"] == "noreply@jualuma.com"
    assert parsed["From"] == "JuaLuma Security <noreply@jualuma.com>"
    assert parsed["Reply-To"] == "support@jualuma.com"


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

    monkeypatch.setattr(client, "_get_service", lambda _impersonate_user=None: FakeService())

    client._send({"raw": "abc"}, impersonate_user="noreply@jualuma.com")

    assert captured["userId"] == "noreply@jualuma.com"
    assert captured["raw"] == "abc"
    assert captured["executed"] == "true"
