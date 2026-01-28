"""Core Purpose: Centralize notification preferences and dispatch logic."""

# Last Updated: 2026-01-23 23:05 CST

from dataclasses import dataclass
from datetime import datetime, time
import uuid
import logging
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from backend.models.notification import LocalNotification, NotificationPreference
from backend.models.notification_device import NotificationDevice
from backend.models.notification_settings import NotificationSettings
from backend.models.user import User
from backend.services.email import get_email_client
from backend.services.push import get_push_client
from backend.services.sms import get_sms_client

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NotificationEvent:
    """Describe a notification event and its default channel behavior."""

    key: str
    default_channels: dict[str, bool]


NOTIFICATION_EVENTS: dict[str, NotificationEvent] = {
    "low_balance": NotificationEvent(
        key="low_balance",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "large_transaction": NotificationEvent(
        key="large_transaction",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "budget_threshold": NotificationEvent(
        key="budget_threshold",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "recurring_bill": NotificationEvent(
        key="recurring_bill",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "sync_failure": NotificationEvent(
        key="sync_failure",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "weekly_digest": NotificationEvent(
        key="weekly_digest",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "marketing_updates": NotificationEvent(
        key="marketing_updates",
        default_channels={
            "channel_email": True,
            "channel_sms": False,
            "channel_push": False,
            "channel_in_app": False,
        },
    ),
    "support_updates": NotificationEvent(
        key="support_updates",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
    "subscription_updates": NotificationEvent(
        key="subscription_updates",
        default_channels={
            "channel_email": True,
            "channel_sms": True,
            "channel_push": True,
            "channel_in_app": True,
        },
    ),
}


class NotificationService:
    """Coordinate notification persistence and outbound delivery."""

    def __init__(self, db: Session) -> None:
        """Initialize notification dependencies for the current request."""
        self.db = db
        self.email_client = get_email_client()
        self.sms_client = get_sms_client()
        self.push_client = get_push_client()

    def ensure_default_preferences(
        self, uid: str
    ) -> dict[str, NotificationPreference]:
        """Create missing notification preferences using default channel values."""
        existing_prefs = (
            self.db.query(NotificationPreference)
            .filter(NotificationPreference.uid == uid)
            .all()
        )
        existing_by_key = {pref.event_key: pref for pref in existing_prefs}
        created = False
        for event_key, event in NOTIFICATION_EVENTS.items():
            if event_key not in existing_by_key:
                pref = NotificationPreference(uid=uid, event_key=event.key)
                for field_name, value in event.default_channels.items():
                    setattr(pref, field_name, value)
                self.db.add(pref)
                existing_by_key[event_key] = pref
                created = True
        if created:
            self.db.commit()
        return existing_by_key

    def list_preferences(self, uid: str) -> list[NotificationPreference]:
        """Return notification preferences, ensuring defaults exist."""
        preferences = self.ensure_default_preferences(uid)
        return list(preferences.values())

    def update_preference(
        self,
        uid: str,
        event_key: str,
        channel_email: bool | None = None,
        channel_sms: bool | None = None,
        channel_push: bool | None = None,
        channel_in_app: bool | None = None,
    ) -> NotificationPreference:
        """Update a single notification preference record."""
        if event_key not in NOTIFICATION_EVENTS:
            raise ValueError(f"Unknown notification event: {event_key}")
        preferences = self.ensure_default_preferences(uid)
        pref = preferences[event_key]
        if channel_email is not None:
            pref.channel_email = channel_email
        if channel_sms is not None:
            pref.channel_sms = channel_sms
        if channel_push is not None:
            pref.channel_push = channel_push
        if channel_in_app is not None:
            pref.channel_in_app = channel_in_app
        self.db.add(pref)
        self.db.commit()
        self.db.refresh(pref)
        return pref

    def get_settings(self, uid: str) -> NotificationSettings:
        """Fetch or create global notification settings."""
        settings = (
            self.db.query(NotificationSettings)
            .filter(NotificationSettings.uid == uid)
            .first()
        )
        if settings:
            return settings
        settings = NotificationSettings(uid=uid)
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def update_settings(
        self,
        uid: str,
        quiet_hours_start: time | None = None,
        quiet_hours_end: time | None = None,
        timezone: str | None = None,
        low_balance_threshold: float | None = None,
        large_transaction_threshold: float | None = None,
    ) -> NotificationSettings:
        """Update quiet hours or timezone for notification delivery."""
        settings = self.get_settings(uid)
        if quiet_hours_start is not None or quiet_hours_end is not None:
            settings.quiet_hours_start = quiet_hours_start
            settings.quiet_hours_end = quiet_hours_end
        if timezone:
            settings.timezone = timezone
        if low_balance_threshold is not None:
            settings.low_balance_threshold = low_balance_threshold
        if large_transaction_threshold is not None:
            settings.large_transaction_threshold = large_transaction_threshold
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def register_device(
        self, uid: str, device_token: str, platform: str
    ) -> NotificationDevice:
        """Register or reactivate a push notification device token."""
        device = (
            self.db.query(NotificationDevice)
            .filter(
                NotificationDevice.uid == uid,
                NotificationDevice.device_token == device_token,
            )
            .first()
        )
        if device:
            device.is_active = True
            device.platform = platform
            device.last_seen_at = datetime.utcnow()
        else:
            device = NotificationDevice(
                uid=uid,
                device_token=device_token,
                platform=platform,
                is_active=True,
                last_seen_at=datetime.utcnow(),
            )
            self.db.add(device)
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return device

    def deactivate_device(self, uid: str, device_token: str) -> None:
        """Deactivate a device token for push notifications."""
        device = (
            self.db.query(NotificationDevice)
            .filter(
                NotificationDevice.uid == uid,
                NotificationDevice.device_token == device_token,
            )
            .first()
        )
        if device:
            device.is_active = False
            self.db.add(device)
            self.db.commit()

    def create_notification(
        self,
        user: User,
        event_key: str,
        title: str,
        message: str,
        ticket_id: uuid.UUID | None = None,
    ) -> LocalNotification | None:
        """Create a local notification and dispatch outbound channels."""
        preferences = self.ensure_default_preferences(user.uid)
        pref = preferences.get(event_key)
        if not pref:
            logger.warning("Notification event not configured: %s", event_key)
            return None

        notification = None
        if pref.channel_in_app:
            notification = LocalNotification(
                uid=user.uid,
                ticket_id=ticket_id,
                title=title,
                message=message,
                event_key=event_key,
                is_read=False,
            )
            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)

        settings = self.get_settings(user.uid)
        if self._is_quiet_hours(settings):
            return notification

        if pref.channel_email:
            self._send_email(user.email, title)
        if pref.channel_sms:
            self._send_sms(user, title)
        if pref.channel_push:
            self._send_push(user.uid, title)

        return notification

    def create_notification_for_event(
        self,
        user: User,
        event_key: str,
        title: str,
        message: str,
        dedupe_key: str | None = None,
    ) -> LocalNotification | None:
        """Create a notification using an event preference key with optional dedupe."""
        preferences = self.ensure_default_preferences(user.uid)
        pref = preferences.get(event_key)
        if not pref:
            logger.warning("Notification event not configured: %s", event_key)
            return None

        local_key = dedupe_key or event_key
        if dedupe_key:
            existing = (
                self.db.query(LocalNotification)
                .filter(LocalNotification.uid == user.uid, LocalNotification.event_key == dedupe_key)
                .first()
            )
            if existing:
                return None

        notification = None
        if pref.channel_in_app:
            notification = LocalNotification(
                uid=user.uid,
                title=title,
                message=message,
                event_key=local_key,
                is_read=False,
            )
            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)

        settings = self.get_settings(user.uid)
        if self._is_quiet_hours(settings):
            return notification

        if pref.channel_email:
            self._send_email(user.email, title)
        if pref.channel_sms:
            self._send_sms(user, title)
        if pref.channel_push:
            self._send_push(user.uid, title)

        return notification

    def mark_as_read(self, notification_id: str, uid: str) -> None:
        """Mark a local notification as read for the user."""
        notification = (
            self.db.query(LocalNotification)
            .filter(
                LocalNotification.id == notification_id, LocalNotification.uid == uid
            )
            .first()
        )
        if notification:
            notification.is_read = True
            self.db.add(notification)
            self.db.commit()

    def _is_quiet_hours(self, settings: NotificationSettings) -> bool:
        """Check whether the current time is within the user's quiet hours."""
        if not settings.quiet_hours_start or not settings.quiet_hours_end:
            return False
        now = self._now_in_timezone(settings.timezone)
        return self._within_quiet_hours(
            now, settings.quiet_hours_start, settings.quiet_hours_end
        )

    def _within_quiet_hours(self, now: time, start: time, end: time) -> bool:
        """Evaluate quiet hours window for the provided time."""
        if start <= end:
            return start <= now <= end
        return now >= start or now <= end

    def _now_in_timezone(self, timezone: str) -> time:
        """Resolve the current time in the requested timezone."""
        try:
            zone = ZoneInfo(timezone)
        except Exception:
            zone = ZoneInfo("UTC")
        return datetime.now(tz=zone).time()

    def _send_email(self, to_email: str, title: str) -> None:
        """Dispatch a generic email alert with error logging."""
        try:
            self.email_client.send_generic_alert(to_email, title)
        except Exception as exc:
            logger.error("Failed to dispatch email notification: %s", exc)

    def _send_sms(self, user: User, title: str) -> None:
        """Dispatch a generic SMS alert when a phone number is available."""
        phone_number = getattr(user, "phone_number", None)
        if not phone_number:
            logger.info("SMS skipped (no phone number) for uid=%s", user.uid)
            return
        body = (
            f"{title}: You have a new notification in your secure Jualuma portal. "
            "Log in to view details."
        )
        self.sms_client.send_message(phone_number, body)

    def _send_push(self, uid: str, title: str) -> None:
        """Dispatch push alerts to active device tokens."""
        tokens = [
            device.device_token
            for device in self.db.query(NotificationDevice)
            .filter(NotificationDevice.uid == uid, NotificationDevice.is_active.is_(True))
            .all()
        ]
        body = "Open the Jualuma app to view details."
        self.push_client.send_notification(tokens, title, body)
