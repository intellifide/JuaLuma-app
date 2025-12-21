from unittest.mock import patch

import pyotp
from fastapi.testclient import TestClient

from backend.models import User

# Tests for password change and reset flows in backend/api/auth.py


def test_change_password_success(test_client: TestClient, test_db, mock_auth):
    """
    Test that a user can change their password successfully without MFA.
    """
    # 1. Mock verify_password (backend/api/auth.py uses verify_password)
    # 2. Mock update_user_password

    with patch("backend.api.auth.verify_password", return_value=True) as mock_verify:
        with patch("backend.api.auth.update_user_password") as mock_update:
            payload = {
                "current_password": "OldPassword123!",
                "new_password": "NewPassword123!",
            }
            # mock_auth allows this request to be authenticated
            response = test_client.post("/api/auth/change-password", json=payload)

    assert response.status_code == 200
    assert response.json()["message"] == "Password updated successfully"
    mock_verify.assert_called_once_with(mock_auth.email, "OldPassword123!")
    mock_update.assert_called_once_with(mock_auth.uid, "NewPassword123!")


def test_change_password_fail_verify(test_client: TestClient, test_db, mock_auth):
    """
    Test that change password fails if current password verification fails.
    """
    with patch("backend.api.auth.verify_password", return_value=False) as mock_verify:
        payload = {
            "current_password": "WrongPassword",
            "new_password": "NewPassword123!",
        }
        response = test_client.post("/api/auth/change-password", json=payload)

    assert response.status_code == 401
    assert "Incorrect current password" in response.json()["detail"]
    mock_verify.assert_called_once()


def test_change_password_mfa_required_but_missing(
    test_client: TestClient, test_db, mock_auth
):
    """
    Test that changing password requires MFA code if user has MFA enabled.
    """
    # Enable MFA for the mock user
    mock_auth.mfa_enabled = True
    mock_auth.mfa_secret = pyotp.random_base32()
    test_db.add(mock_auth)
    test_db.commit()

    payload = {
        "current_password": "OldPassword123!",
        "new_password": "NewPassword123!",
        # mfa_code missing
    }

    response = test_client.post("/api/auth/change-password", json=payload)

    assert response.status_code == 403
    assert "MFA_REQUIRED" in response.json()["detail"]


def test_change_password_mfa_success(test_client: TestClient, test_db, mock_auth):
    """
    Test that changing password works with valid MFA code.
    """
    # Enable MFA
    secret = pyotp.random_base32()
    mock_auth.mfa_enabled = True
    mock_auth.mfa_secret = secret
    mock_auth.mfa_method = "totp"
    test_db.add(mock_auth)
    test_db.commit()

    valid_code = pyotp.TOTP(secret).now()

    with patch("backend.api.auth.verify_password", return_value=True):
        with patch("backend.api.auth.update_user_password") as mock_update:
            payload = {
                "current_password": "OldPassword123!",
                "new_password": "NewPassword123!",
                "mfa_code": valid_code,
            }
            response = test_client.post("/api/auth/change-password", json=payload)

    assert response.status_code == 200
    mock_update.assert_called_once()


def test_reset_password_mfa_required(test_client: TestClient, test_db):
    """
    Test that requesting a reset link checks for MFA first.
    """
    # Create a user with MFA enabled
    user = User(
        uid="mfa_user",
        email="mfa@example.com",
        role="user",
        mfa_enabled=True,
        mfa_secret="JBSWY3DPEHPK3PXP",
    )
    test_db.add(user)
    test_db.commit()

    # Request without code
    payload = {"email": "mfa@example.com"}
    response = test_client.post("/api/auth/reset-password", json=payload)

    assert response.status_code == 403
    assert "MFA_REQUIRED" in response.json()["detail"]


def test_reset_password_mfa_success(test_client: TestClient, test_db):
    """
    Test that requesting a reset link works with valid MFA code.
    """
    secret = pyotp.random_base32()
    user = User(
        uid="mfa_user_2",
        email="mfa2@example.com",
        role="user",
        mfa_enabled=True,
        mfa_secret=secret,
        mfa_method="totp",
    )
    test_db.add(user)
    test_db.commit()

    valid_code = pyotp.TOTP(secret).now()

    with patch(
        "backend.api.auth.generate_password_reset_link",
        return_value="http://reset-link.com",
    ):
        payload = {"email": "mfa2@example.com", "mfa_code": valid_code}
        response = test_client.post("/api/auth/reset-password", json=payload)

    assert response.status_code == 200
    assert "Reset link sent" in response.json()["message"]
