# CORE PURPOSE: Verify Settings API integration for Notifications and Privacy.
# LAST MODIFIED: 2026-01-23 22:39 CST

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.models.notification import NotificationPreference
from backend.services.notifications import NOTIFICATION_EVENTS
from backend.models.user import User

def test_get_notification_preferences_empty(test_client: TestClient, mock_auth: User):
    """
    Verify that notification preferences return defaults initially.
    """
    response = test_client.get("/api/notifications/preferences")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == len(NOTIFICATION_EVENTS)
    returned_keys = {pref["event_key"] for pref in data}
    assert returned_keys == set(NOTIFICATION_EVENTS.keys())

def test_update_notification_preference(test_client: TestClient, mock_auth: User, test_db: Session):
    """
    Verify that we can update a notification preference.
    """
    payload = {
        "event_key": "low_balance",
        "channel_email": True,
        "channel_sms": True,
        "channel_push": True,
        "channel_in_app": True,
    }
    response = test_client.put("/api/notifications/preferences", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["event_key"] == "low_balance"
    assert data["channel_email"] is True
    assert data["channel_sms"] is True
    assert data["channel_push"] is True
    assert data["channel_in_app"] is True

    # Verify persistence in DB
    pref = test_db.query(NotificationPreference).filter_by(
        uid=mock_auth.uid, event_key="low_balance"
    ).first()
    assert pref is not None
    assert pref.channel_email is True
    assert pref.channel_sms is True
    assert pref.channel_push is True
    assert pref.channel_in_app is True

def test_update_notification_preference_partial(test_client: TestClient, mock_auth: User):
    """
    Verify partial updates (e.g. only email) work and retain other values if they existed.
    But since it's a new record in this flow, passing one creates defaults for others.
    """
    # First create
    payload1 = {
        "event_key": "large_transaction",
        "channel_email": True
    }
    response = test_client.put("/api/notifications/preferences", json=payload1)
    assert response.status_code == 200
    data = response.json()
    assert data["channel_email"] is True
    assert data["channel_sms"] is True  # Default from logic
    assert data["channel_push"] is True
    assert data["channel_in_app"] is True

    # Second update - change sms only
    payload2 = {
        "event_key": "large_transaction",
        "channel_sms": True
    }
    response = test_client.put("/api/notifications/preferences", json=payload2)
    assert response.status_code == 200
    data = response.json()
    assert data["channel_email"] is True  # Should remain True
    assert data["channel_sms"] is True    # Updated to True

def test_update_privacy_settings(test_client: TestClient, mock_auth: User, test_db: Session):
    """
    Verify that users can update their privacy settings (data_sharing_consent).
    """
    # Initial state should be False (default)
    assert mock_auth.data_sharing_consent is False

    payload = {
        "data_sharing_consent": True
    }
    response = test_client.patch("/api/users/me/privacy", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["data_sharing_consent"] is True

    # Verify persistence
    test_db.refresh(mock_auth)
    assert mock_auth.data_sharing_consent is True

    # Toggle back
    payload["data_sharing_consent"] = False
    response = test_client.patch("/api/users/me/privacy", json=payload)
    assert response.json()["data_sharing_consent"] is False


def test_update_notification_settings_thresholds(test_client: TestClient, mock_auth: User):
    """
    Verify that users can update global notification settings (thresholds).
    """
    payload = {
        "low_balance_threshold": 150.0,
        "large_transaction_threshold": 750.0,
    }
    response = test_client.put("/api/notifications/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["low_balance_threshold"] == 150.0
    assert data["large_transaction_threshold"] == 750.0


def test_register_notification_device(test_client: TestClient, mock_auth: User):
    """
    Verify that devices can be registered for push notifications.
    """
    payload = {"device_token": "test-device-token", "platform": "ios"}
    response = test_client.post("/api/notifications/devices", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["device_token"] == "test-device-token"
    assert data["platform"] == "ios"
