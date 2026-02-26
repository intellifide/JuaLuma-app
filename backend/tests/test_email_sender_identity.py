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
