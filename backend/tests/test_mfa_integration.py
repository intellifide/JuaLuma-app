from unittest.mock import MagicMock, patch

import pyotp

from backend.core.constants import UserStatus
from backend.models import User

# Use fixtures from conftest.py (test_client, test_db) automatically found by pytest


@patch("backend.middleware.auth.verify_token")
@patch("backend.api.auth.verify_token")
@patch("backend.api.auth.get_email_client")
def test_mfa_complete_flow(
    mock_get_email_client,
    mock_verify_token_api,
    mock_verify_token_middleware,
    test_client,
    test_db,
):
    # Setup mocks
    mock_mailer = MagicMock()
    mock_get_email_client.return_value = mock_mailer

    test_uid = "test_uid_mfa"
    test_email = "mfa_test@example.com"

    # Mock verify_token response
    token_payload = {"uid": test_uid, "email": test_email, "sub": test_uid}
    mock_verify_token_api.return_value = token_payload
    mock_verify_token_middleware.return_value = token_payload

    # Create user manually
    # Note: test_db is a session
    user = User(uid=test_uid, email=test_email, role="user")
    test_db.add(user)
    test_db.commit()

    # ---------------------------------------------------------
    # 1. Login (No MFA)
    # ---------------------------------------------------------
    login_payload = {"token": "fake_token", "mfa_code": None}
    res = test_client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["email"] == test_email
    assert data["user"]["mfa_enabled"] is False

    # ---------------------------------------------------------
    # 2. Setup TOTP
    # ---------------------------------------------------------
    headers = {"Authorization": "Bearer fake_token"}
    res = test_client.post("/api/auth/mfa/setup", headers=headers)
    assert res.status_code == 200, res.text
    secret = res.json()["secret"]
    assert secret

    # Verify secret stored
    test_db.refresh(user)
    assert user.totp_secret_pending == secret
    assert not user.mfa_enabled

    # Enable TOTP
    totp = pyotp.TOTP(secret)
    code = totp.now()
    res = test_client.post("/api/auth/mfa/enable", json={"code": code}, headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "MFA enabled successfully."

    test_db.refresh(user)
    assert user.mfa_enabled is True
    assert user.mfa_method == "totp"

    # ---------------------------------------------------------
    # 3. Login with MFA Enforced (TOTP)
    # ---------------------------------------------------------
    # No Code -> 403
    res = test_client.post("/api/auth/login", json={"token": "fake_token"})
    assert res.status_code == 403
    assert res.json()["detail"] == "MFA_REQUIRED"

    # Bad Code -> 401
    res = test_client.post(
        "/api/auth/login", json={"token": "fake_token", "mfa_code": "000000"}
    )
    assert res.status_code == 401

    # Good Code -> 200
    code = totp.now()
    res = test_client.post(
        "/api/auth/login", json={"token": "fake_token", "mfa_code": code}
    )
    assert res.status_code == 200

    # ---------------------------------------------------------
    # 4. Disable MFA
    # ---------------------------------------------------------
    code = totp.now()
    res = test_client.post(
        "/api/auth/mfa/disable", json={"code": code}, headers=headers
    )
    assert res.status_code == 200

    test_db.refresh(user)
    assert user.mfa_enabled is False
    assert user.mfa_secret is None

    # ---------------------------------------------------------
    # 5. Setup Email MFA
    # ---------------------------------------------------------
    user.status = UserStatus.ACTIVE
    test_db.commit()
    # Request code (Public endpoint)
    res = test_client.post(
        "/api/auth/mfa/email/request-code", json={"email": test_email}
    )
    assert res.status_code == 200

    # Verify code stored
    test_db.refresh(user)
    email_code = user.email_otp
    assert email_code
    assert len(email_code) == 6

    # Enable Email MFA (Protected, requires Auth)
    res = test_client.post(
        "/api/auth/mfa/email/enable", json={"code": email_code}, headers=headers
    )
    assert res.status_code == 200

    test_db.refresh(user)
    assert user.mfa_enabled is True
    assert user.mfa_method == "email"
    assert user.email_otp is None

    # ---------------------------------------------------------
    # 6. Login with Email MFA
    # ---------------------------------------------------------
    # No Code -> 403
    res = test_client.post("/api/auth/login", json={"token": "fake_token"})
    assert res.status_code == 403

    # Request code again for login
    res = test_client.post(
        "/api/auth/mfa/email/request-code", json={"email": test_email}
    )
    assert res.status_code == 200

    test_db.refresh(user)
    login_code = user.email_otp
    assert login_code

    # Login with code
    res = test_client.post(
        "/api/auth/login", json={"token": "fake_token", "mfa_code": login_code}
    )
    assert res.status_code == 200
