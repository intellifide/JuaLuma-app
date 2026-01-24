"""Core Purpose: Provide push notification client implementations."""

# Last Updated: 2026-01-23 22:39 CST

import logging
from typing import Protocol

import requests

from backend.core.config import settings

logger = logging.getLogger(__name__)


class PushClient(Protocol):
    """Define the contract for sending push notifications."""

    def send_notification(self, tokens: list[str], title: str, body: str) -> None:
        """Send a push notification to a list of device tokens."""
        ...


class NoopPushClient:
    """Fallback push client that logs instead of sending."""

    def send_notification(self, tokens: list[str], title: str, body: str) -> None:
        """Log push attempts when no provider is configured."""
        if tokens:
            logger.info(
                "Push skipped (no provider). tokens=%s title=%s", len(tokens), title
            )


class FcmPushClient:
    """Send push notifications through Firebase Cloud Messaging."""

    def __init__(self, server_key: str) -> None:
        """Initialize FCM credentials for outbound push."""
        self.server_key = server_key

    def send_notification(self, tokens: list[str], title: str, body: str) -> None:
        """Send push notifications via FCM with error logging."""
        if not tokens:
            return
        url = "https://fcm.googleapis.com/fcm/send"
        payload = {
            "registration_ids": tokens,
            "notification": {"title": title, "body": body},
        }
        headers = {"Authorization": f"key={self.server_key}"}
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code >= 400:
                logger.error(
                    "FCM push failed (%s): %s", response.status_code, response.text
                )
        except Exception as exc:
            logger.error("FCM push send failed: %s", exc)


def get_push_client() -> PushClient:
    """Select the configured push client implementation."""
    if settings.push_provider and settings.push_provider.lower() == "fcm":
        if settings.fcm_server_key:
            return FcmPushClient(settings.fcm_server_key)
        logger.warning("FCM push configured without server key.")
    return NoopPushClient()


__all__ = ["PushClient", "get_push_client"]
