from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api import auth as auth_api
from backend.main import app
from backend.middleware.auth import get_current_identity
from backend.models import PendingSignup, Subscription, User

# Tests for backend/api/auth.py


def test_signup_pending_success(test_client: TestClient, test_db):
    def override_identity():
        return {"uid": "pending_user_123", "email": "pending@testmail.app"}

    app.dependency_overrides[get_current_identity] = override_identity

    payload = {
        "first_name": "New",
        "last_name": "User",
        "agreements": [
            {"agreement_key": "terms_of_service"},
            {"agreement_key": "privacy_policy"},
            {"agreement_key": "us_residency_certification"},
        ],
    }

    with patch("backend.api.auth.get_email_client") as mock_client:
        mock_client.return_value.send_otp = lambda *_args, **_kwargs: None
        response = test_client.post("/api/auth/signup/pending", json=payload)

    app.dependency_overrides.pop(get_current_identity, None)

    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "pending_user_123"
    assert data["email"] == "pending@testmail.app"

    pending = test_db.query(PendingSignup).filter_by(uid="pending_user_123").first()
    assert pending is not None
    assert pending.email == "pending@testmail.app"

    user = test_db.query(User).filter_by(email="pending@testmail.app").first()
    assert user is None


def test_signup_pending_duplicate_email(test_client: TestClient, test_db):
    def override_identity():
        return {"uid": "pending_user_456", "email": "existing@testmail.app"}

    app.dependency_overrides[get_current_identity] = override_identity

    db_user = User(uid="existing_uid", email="existing@testmail.app", role="user")
    test_db.add(db_user)
    test_db.commit()

    payload = {
        "first_name": "Existing",
        "last_name": "User",
        "agreements": [
            {"agreement_key": "terms_of_service"},
            {"agreement_key": "privacy_policy"},
            {"agreement_key": "us_residency_certification"},
        ],
    }
    with patch("backend.api.auth.get_email_client") as mock_client:
        mock_client.return_value.send_otp = lambda *_args, **_kwargs: None
        response = test_client.post("/api/auth/signup/pending", json=payload)

    app.dependency_overrides.pop(get_current_identity, None)

    assert response.status_code == 409
    assert "account with this email address already exists" in response.json()["detail"].lower()


def test_signup_pending_missing_agreements(test_client: TestClient):
    def override_identity():
        return {"uid": "pending_user_789", "email": "pending2@testmail.app"}

    app.dependency_overrides[get_current_identity] = override_identity

    payload = {
        "first_name": "Missing",
        "last_name": "Agreements",
        "agreements": [
            {"agreement_key": "terms_of_service"},
        ],
    }
    with patch("backend.api.auth.get_email_client") as mock_client:
        mock_client.return_value.send_otp = lambda *_args, **_kwargs: None
        response = test_client.post("/api/auth/signup/pending", json=payload)

    app.dependency_overrides.pop(get_current_identity, None)

    assert response.status_code == 400
    assert "missing required legal agreements" in response.json()["detail"].lower()


def test_signup_pending_otp_send_failure_returns_503(test_client: TestClient):
    def override_identity():
        return {"uid": "pending_user_otp_fail", "email": "otp-fail@testmail.app"}

    app.dependency_overrides[get_current_identity] = override_identity

    payload = {
        "first_name": "Otp",
        "last_name": "Failure",
        "agreements": [
            {"agreement_key": "terms_of_service"},
            {"agreement_key": "privacy_policy"},
            {"agreement_key": "us_residency_certification"},
        ],
    }

    with patch("backend.api.auth.get_email_client") as mock_client:
        mock_client.return_value.send_otp.side_effect = RuntimeError("smtp offline")
        response = test_client.post("/api/auth/signup/pending", json=payload)

    app.dependency_overrides.pop(get_current_identity, None)

    assert response.status_code == 503
    assert "verification code" in response.json()["detail"].lower()


def test_signup_pending_rate_limit_returns_429(test_client: TestClient):
    def override_identity():
        return {"uid": "pending_user_429", "email": "pending-429@testmail.app"}

    app.dependency_overrides[get_current_identity] = override_identity
    auth_api._signup_attempts.clear()

    payload = {
        "first_name": "Rate",
        "last_name": "Limited",
        "agreements": [
            {"agreement_key": "terms_of_service"},
            {"agreement_key": "privacy_policy"},
            {"agreement_key": "us_residency_certification"},
        ],
    }

    with (
        patch("backend.api.auth._signup_max_attempts", 1),
        patch("backend.api.auth._signup_window_seconds", 60),
        patch("backend.api.auth.get_email_client") as mock_client,
    ):
        mock_client.return_value.send_otp = lambda *_args, **_kwargs: None
        first = test_client.post("/api/auth/signup/pending", json=payload)
        second = test_client.post("/api/auth/signup/pending", json=payload)

    app.dependency_overrides.pop(get_current_identity, None)
    auth_api._signup_attempts.clear()

    assert first.status_code == 201
    assert second.status_code == 429
    assert "rate limit exceeded" in second.json()["detail"].lower()


def test_request_email_code_otp_send_failure_returns_503(test_client: TestClient, test_db):
    user = User(uid="email_code_user", email="email-code-fail@testmail.app", role="user")
    test_db.add(user)
    test_db.commit()

    with patch("backend.api.auth.get_email_client") as mock_client:
        mock_client.return_value.send_otp.side_effect = RuntimeError("smtp offline")
        response = test_client.post(
            "/api/auth/mfa/email/request-code",
            json={"email": "email-code-fail@testmail.app"},
        )

    assert response.status_code == 503
    assert "verification code" in response.json()["detail"].lower()


def test_login_success(test_client: TestClient, test_db, mock_auth):
    # mock_auth fixture creates the user in DB.
    # But login endpoint verifies token first.

    # Ensure subscription exists for full profile check
    sub = Subscription(uid=mock_auth.uid, plan="free", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()

    # Mock verify_token
    mock_decoded = {"uid": mock_auth.uid, "email": mock_auth.email}

    with patch("backend.api.auth.verify_token", return_value=mock_decoded):
        response = test_client.post("/api/auth/login", json={"token": "valid_token"})

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["uid"] == mock_auth.uid
    assert data["user"]["email"] == mock_auth.email
    assert data["user"]["plan"] == "free"


def test_login_invalid_token(test_client: TestClient):
    with patch("backend.api.auth.verify_token", side_effect=Exception("Invalid token")):
        response = test_client.post("/api/auth/login", json={"token": "invalid_token"})

    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]


def test_profile_update(test_client: TestClient, test_db, mock_auth):
    # This endpoint requires auth. test_client doesn't auto-send auth unless configured,
    # but mock_auth fixture overrides the get_current_user dependency!

    # Add subscription so _serialize_profile works fully if needed, though mostly optional

    payload = {"theme_pref": "dark"}
    response = test_client.patch("/api/auth/profile", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["theme_pref"] == "dark"
    assert data["user"]["currency_pref"] == "USD"

    user = test_db.query(User).filter_by(uid=mock_auth.uid).first()
    assert user.theme_pref == "dark"
    assert user.currency_pref == "USD"


def test_logout(test_client: TestClient, mock_auth):
    # Mock revoke_refresh_tokens
    with patch("backend.api.auth.revoke_refresh_tokens") as mock_revoke:
        response = test_client.post("/api/auth/logout")

    assert response.status_code == 200
    mock_revoke.assert_called_once_with(mock_auth.uid)
