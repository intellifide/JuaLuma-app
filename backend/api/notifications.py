"""Core Purpose: Expose notification APIs for preferences and delivery."""

# Last Updated: 2026-01-23 23:05 CST

import uuid
from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import LocalNotification, User
from backend.services.notifications import NotificationService
from backend.utils import get_db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str  # Payload is safe to send via TLS API
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the current user."""
    query = db.query(LocalNotification).filter(
        LocalNotification.uid == current_user.uid
    )

    if unread_only:
        query = query.filter(LocalNotification.is_read.is_(False))

    return query.order_by(desc(LocalNotification.created_at)).limit(50).all()


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    service = NotificationService(db)
    service.mark_as_read(str(notification_id), current_user.uid)
    return None


# --- Notification Preferences ---

class NotificationPreferenceRead(BaseModel):
    event_key: str
    channel_email: bool
    channel_sms: bool
    channel_push: bool
    channel_in_app: bool
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    event_key: str
    channel_email: bool | None = None
    channel_sms: bool | None = None
    channel_push: bool | None = None
    channel_in_app: bool | None = None


@router.get("/preferences", response_model=list[NotificationPreferenceRead])
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all notification preferences."""
    service = NotificationService(db)
    return service.list_preferences(current_user.uid)


@router.put("/preferences", response_model=NotificationPreferenceRead)
def update_notification_preference(
    update_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a specific notification preference."""
    service = NotificationService(db)
    try:
        return service.update_preference(
            uid=current_user.uid,
            event_key=update_data.event_key,
            channel_email=update_data.channel_email,
            channel_sms=update_data.channel_sms,
            channel_push=update_data.channel_push,
            channel_in_app=update_data.channel_in_app,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- Notification Settings ---

class NotificationSettingsRead(BaseModel):
    timezone: str
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    low_balance_threshold: float | None = None
    large_transaction_threshold: float | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationSettingsUpdate(BaseModel):
    timezone: str | None = None
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    low_balance_threshold: float | None = None
    large_transaction_threshold: float | None = None


@router.get("/settings", response_model=NotificationSettingsRead)
def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return global notification settings such as quiet hours."""
    service = NotificationService(db)
    return service.get_settings(current_user.uid)


@router.put("/settings", response_model=NotificationSettingsRead)
def update_notification_settings(
    payload: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update global notification settings such as quiet hours."""
    service = NotificationService(db)
    return service.update_settings(
        current_user.uid,
        quiet_hours_start=payload.quiet_hours_start,
        quiet_hours_end=payload.quiet_hours_end,
        timezone=payload.timezone,
        low_balance_threshold=payload.low_balance_threshold,
        large_transaction_threshold=payload.large_transaction_threshold,
    )


# --- Notification Devices ---

class NotificationDeviceRead(BaseModel):
    id: uuid.UUID
    device_token: str
    platform: str
    is_active: bool
    last_seen_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationDeviceCreate(BaseModel):
    device_token: str
    platform: str


class NotificationDeviceDeactivate(BaseModel):
    device_token: str


@router.post("/devices", response_model=NotificationDeviceRead, status_code=status.HTTP_201_CREATED)
def register_notification_device(
    payload: NotificationDeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a device token for push notifications."""
    service = NotificationService(db)
    return service.register_device(current_user.uid, payload.device_token, payload.platform)


@router.delete("/devices", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_notification_device(
    payload: NotificationDeviceDeactivate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate a device token for push notifications."""
    service = NotificationService(db)
    service.deactivate_device(current_user.uid, payload.device_token)
    return None
