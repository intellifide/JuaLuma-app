
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.models import User, Subscription

# Tests for backend/api/auth.py

def test_signup_success(test_client: TestClient, test_db):
    # Mock firebase_admin.auth.create_user
    mock_record = MagicMock()
    mock_record.uid = "new_user_123"
    mock_record.email = "newuser@example.com"
    
    with patch("firebase_admin.auth.create_user", return_value=mock_record):
        payload = {"email": "newuser@example.com", "password": "password123"}
        response = test_client.post("/api/auth/signup", json=payload)
        
    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "new_user_123"
    assert data["email"] == "newuser@example.com"
    
    # Verify DB
    user = test_db.query(User).filter_by(email="newuser@example.com").first()
    assert user is not None
    assert user.uid == "new_user_123"

def test_signup_duplicate_email(test_client: TestClient, test_db):
    from firebase_admin import exceptions
    
    # Mock create_user to raise AlreadyExistsError
    with patch("firebase_admin.auth.create_user", side_effect=exceptions.AlreadyExistsError("Email exists", "Email exists")):
        payload = {"email": "existing@example.com", "password": "password123"}
        response = test_client.post("/api/auth/signup", json=payload)

    assert response.status_code == 400
    assert "Email already exists" in response.json()["detail"]

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
    
    payload = {"theme_pref": "dark", "currency_pref": "EUR"}
    response = test_client.patch("/api/auth/profile", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["theme_pref"] == "dark"
    assert data["user"]["currency_pref"] == "EUR"
    
    user = test_db.query(User).filter_by(uid=mock_auth.uid).first()
    assert user.theme_pref == "dark"
    assert user.currency_pref == "EUR"

def test_logout(test_client: TestClient, mock_auth):
    # Mock revoke_refresh_tokens
    with patch("backend.api.auth.revoke_refresh_tokens") as mock_revoke:
        response = test_client.post("/api/auth/logout")
    
    assert response.status_code == 200
    mock_revoke.assert_called_once_with(mock_auth.uid)
