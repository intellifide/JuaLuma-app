from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.models import LegalAgreementAcceptance, Subscription, User

# Tests for backend/api/auth.py


def test_signup_success(test_client: TestClient, test_db):
    # Mock firebase_admin.auth.create_user
    mock_record = MagicMock()
    mock_record.uid = "new_user_123"
    mock_record.email = "newuser@example.com"

    with patch("firebase_admin.auth.create_user", return_value=mock_record):
        payload = {
            "email": "newuser@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "agreements": [
                {"agreement_key": "terms_of_service"},
                {"agreement_key": "privacy_policy"},
                {"agreement_key": "us_residency_certification"},
            ],
        }
        response = test_client.post("/api/auth/signup", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "new_user_123"
    assert data["email"] == "newuser@example.com"

    # Verify DB
    user = test_db.query(User).filter_by(email="newuser@example.com").first()
    assert user is not None
    assert user.uid == "new_user_123"
    acceptances = (
        test_db.query(LegalAgreementAcceptance)
        .filter(LegalAgreementAcceptance.uid == user.uid)
        .all()
    )
    assert len(acceptances) == 3


def test_signup_duplicate_email(test_client: TestClient, test_db):
    from firebase_admin import exceptions

    # 1. Mock create_user to raise AlreadyExistsError
    # 2. Mock get_user_by_email to return a user
    # 3. Ensure User is in DB so it raises 400

    mock_existing = MagicMock()
    mock_existing.uid = "existing_uid"
    mock_existing.email = "existing@example.com"

    # Create the user in DB first so it is a "True Duplicate"
    from backend.models import User

    db_user = User(uid="existing_uid", email="existing@example.com", role="user")
    test_db.add(db_user)
    test_db.commit()

    with patch(
        "firebase_admin.auth.create_user",
        side_effect=exceptions.AlreadyExistsError("Email exists", "Email exists"),
    ):
        with patch("firebase_admin.auth.get_user_by_email", return_value=mock_existing):
            payload = {
                "email": "existing@example.com",
                "password": "password123",
                "first_name": "Existing",
                "last_name": "User",
                "agreements": [
                    {"agreement_key": "terms_of_service"},
                    {"agreement_key": "privacy_policy"},
                    {"agreement_key": "us_residency_certification"},
                ],
            }
            response = test_client.post("/api/auth/signup", json=payload)

    assert response.status_code == 400
    assert (
        "account with this email address already exists"
        in response.json()["detail"].lower()
    )


def test_signup_zombie_healing(test_client: TestClient, test_db):
    from firebase_admin import exceptions

    from backend.models import Subscription, User

    # 1. Mock create_user to raise AlreadyExistsError
    # 2. Mock get_user_by_email to return a user (Zombie)
    # 3. Ensure User is NOT in DB

    mock_zombie = MagicMock()
    mock_zombie.uid = "zombie_uid"
    mock_zombie.email = "zombie@example.com"

    # Ensure DB is empty for this user
    existing = test_db.query(User).filter_by(uid="zombie_uid").first()
    assert existing is None
    # End implicit transaction started by query to allow create_user_record to use db.begin()
    test_db.rollback()

    with patch(
        "firebase_admin.auth.create_user",
        side_effect=exceptions.AlreadyExistsError("Email exists", "Email exists"),
    ):
        with patch("firebase_admin.auth.get_user_by_email", return_value=mock_zombie):
            payload = {
                "email": "zombie@example.com",
                "password": "password123",
                "first_name": "Zombie",
                "last_name": "User",
                "agreements": [
                    {"agreement_key": "terms_of_service"},
                    {"agreement_key": "privacy_policy"},
                    {"agreement_key": "us_residency_certification"},
                ],
            }
            response = test_client.post("/api/auth/signup", json=payload)

    # Needs to be successful
    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "zombie_uid"
    assert data["email"] == "zombie@example.com"

    # Verify DB record was created (Healed)
    user = test_db.query(User).filter_by(uid="zombie_uid").first()
    assert user is not None
    assert user.email == "zombie@example.com"

    # Verify subscription was created
    sub = test_db.query(Subscription).filter_by(uid="zombie_uid").first()
    assert sub is not None


def test_signup_db_only_healing(test_client: TestClient, test_db):
    from firebase_admin import auth as firebase_auth

    db_user = User(uid="db_only_uid", email="dbonly@example.com", role="user")
    test_db.add(db_user)
    test_db.commit()

    mock_record = MagicMock()
    mock_record.uid = "db_only_uid"
    mock_record.email = "dbonly@example.com"

    with patch(
        "firebase_admin.auth.get_user_by_email",
        side_effect=firebase_auth.UserNotFoundError("User not found", "User not found"),
    ):
        with patch("firebase_admin.auth.create_user", return_value=mock_record) as mock_create:
            payload = {
                "email": "dbonly@example.com",
                "password": "password123",
                "first_name": "DB",
                "last_name": "Only",
                "agreements": [
                    {"agreement_key": "terms_of_service"},
                    {"agreement_key": "privacy_policy"},
                    {"agreement_key": "us_residency_certification"},
                ],
            }
            response = test_client.post("/api/auth/signup", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "db_only_uid"
    assert data["email"] == "dbonly@example.com"
    assert data["message"] == "Account synced successfully."
    mock_create.assert_called_once_with(
        uid="db_only_uid", email="dbonly@example.com", password="password123"
    )


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
