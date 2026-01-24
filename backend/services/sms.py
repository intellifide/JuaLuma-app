"""Core Purpose: Provide SMS notification client implementations."""

# Last Updated: 2026-01-23 22:39 CST

import logging
from typing import Protocol

import requests

from backend.core.config import settings

logger = logging.getLogger(__name__)


class SmsClient(Protocol):
    """Define the contract for sending SMS messages."""

    def send_message(self, to_number: str, message: str) -> None:
        """Send an SMS message to a recipient."""
        ...


class NoopSmsClient:
    """Fallback SMS client that logs messages instead of sending."""

    def send_message(self, to_number: str, message: str) -> None:
        """Log SMS attempts when no provider is configured."""
        logger.info("SMS skipped (no provider). to=%s message=%s", to_number, message)


class TwilioSmsClient:
    """Send SMS messages through the Twilio REST API."""

    def __init__(self, account_sid: str, auth_token: str, from_number: str) -> None:
        """Initialize Twilio credentials for outbound SMS."""
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number

    def send_message(self, to_number: str, message: str) -> None:
        """Send an SMS via Twilio with error logging."""
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        payload = {"From": self.from_number, "To": to_number, "Body": message}
        try:
            response = requests.post(
                url, data=payload, auth=(self.account_sid, self.auth_token), timeout=10
            )
            if response.status_code >= 400:
                logger.error(
                    "Twilio SMS failed (%s): %s", response.status_code, response.text
                )
        except Exception as exc:
            logger.error("Twilio SMS send failed: %s", exc)


def get_sms_client() -> SmsClient:
    """Select the configured SMS client implementation."""
    if settings.sms_provider and settings.sms_provider.lower() == "twilio":
        if (
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_from_number
        ):
            return TwilioSmsClient(
                settings.twilio_account_sid,
                settings.twilio_auth_token,
                settings.twilio_from_number,
            )
        logger.warning("Twilio SMS configured without full credentials.")
    return NoopSmsClient()


__all__ = ["SmsClient", "get_sms_client"]
