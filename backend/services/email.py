import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Protocol

from backend.core import settings

logger = logging.getLogger(__name__)


class EmailClient(Protocol):
    def send_generic_alert(self, to_email: str, title: str) -> None:
        """Send a generic Alert email pointing to the secure portal."""
        ...

    def send_subscription_welcome(self, to_email: str, plan_name: str) -> None:
        """Send welcome email for new subscription."""
        ...

    def send_subscription_payment_failed(
        self, to_email: str, plan_name: str, grace_end_date: str
    ) -> None:
        """Send payment failure notice with grace period."""
        ...

    def send_subscription_downgraded(self, to_email: str, reason: str) -> None:
        """Send downgrade notice with reason."""
        ...

    def send_otp(self, to_email: str, code: str) -> None:
        """Send specific 2FA OTP code."""
        ...

    def send_password_reset(self, to_email: str, link: str) -> None:
        """Send password reset link."""
        ...

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        """Send household invitation link."""
        ...

    def send_household_welcome_member(
        self, to_email: str, household_name: str, owner_name: str
    ) -> None:
        """Send welcome email to new household member."""
        ...

    def send_support_ticket_notification(
        self,
        to_email: str,
        subject: str,
        ticket_id: str,
        user_email: str,
        description: str,
        event_type: str = "Ticket Created",
    ) -> None:
        """Notify support team about a ticket update."""
        ...

    def send_financial_digest(self, to_email: str, subject: str, body: str) -> None:
        """Send an opt-in financial digest email."""
        ...


class TestmailEmailClient:
    """Email client using Testmail.app API for development testing."""

    def __init__(self):
        self.api_key = settings.testmail_api_key
        self.namespace = settings.testmail_namespace
        self.from_email = "noreply@testmail.app"

    def _send_via_api(self, to_email: str, subject: str, text: str, html: str = None) -> None:
        """Send email via Testmail SMTP (simpler than GraphQL API)."""
        # Testmail recommends using SMTP for sending
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach text version
        msg.attach(MIMEText(text, "plain", "utf-8"))

        # Attach HTML version if provided
        if html:
            msg.attach(MIMEText(html, "html", "utf-8"))

        try:
            # Use Testmail's SMTP service
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(self.namespace, self.api_key)
                server.send_message(msg)
            logger.info(f"Sent email via Testmail SMTP to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email via Testmail SMTP: {e}")

    def send_generic_alert(self, to_email: str, title: str) -> None:
        """Send a generic alert email."""
        body = (
            "You have a new notification in your secure jualuma Portal.\n\n"
            "Please log in to view the details: https://app.jualuma.com/notifications\n\n"
            "Running a financial platform means we prioritize your privacy. "
            "We do not include sensitive details in emails."
        )
        self._send_via_api(to_email, title, body)

    def send_financial_digest(self, to_email: str, subject: str, body: str) -> None:
        # User opted in to receive a digest via email; keep content high-level and avoid account numbers.
        footer = (
            "\n\n---\n"
            "This digest was generated for you by JuaLuma.\n"
            "You can view more details securely in the app: "
            f"{settings.frontend_url}/ai\n"
        )
        self._send_via_api(to_email, subject, f"{body}{footer}")

    def send_subscription_welcome(self, to_email: str, plan_name: str) -> None:
        """Send welcome email for new subscription."""
        display_name = plan_name.replace("_", " ").title()
        subject = f"Welcome to JuaLuma {display_name}!"
        body = (
            f"Thank you for subscribing to the {display_name} plan.\n\n"
            "We are excited to have you on board! You now have access to all premium features.\n"
            "If you have any questions, please contact support."
        )
        self._send_via_api(to_email, subject, body)

    def send_subscription_payment_failed(
        self, to_email: str, plan_name: str, grace_end_date: str
    ) -> None:
        display_name = plan_name.replace("_", " ").title()
        subject = f"Payment failed for your JuaLuma {display_name} plan"
        body = (
            f"We couldn't process your payment for the {display_name} plan.\n\n"
            "Your subscription will remain active during a 3-day grace period so you can update your payment method.\n"
            f"If payment isn't completed by {grace_end_date}, your account will be moved to the Free plan.\n\n"
            "Please log in to update your billing details."
        )
        self._send_via_api(to_email, subject, body)

    def send_subscription_downgraded(self, to_email: str, reason: str) -> None:
        subject = "Your JuaLuma subscription was downgraded"
        body = (
            "Your account has been moved to the Free plan.\n\n"
            f"Reason: {reason}\n\n"
            "If you'd like to restore your paid plan, please update your billing details and resubscribe."
        )
        self._send_via_api(to_email, subject, body)

    def send_otp(self, to_email: str, code: str) -> None:
        """Send OTP code."""
        subject = "jualuma Verification Code"
        body = (
            f"Your verification code is: {code}\n\n"
            "This code will expire in 10 minutes.\n"
            "If you did not request this code, please contact support."
        )
        self._send_via_api(to_email, subject, body)

    def send_password_reset(self, to_email: str, link: str) -> None:
        """Send password reset link."""
        subject = "jualuma Password Reset"
        body = (
            "You requested a password reset for your jualuma account.\n\n"
            f"Click the link below to reset your password:\n{link}\n\n"
            "If you did not request this change, please ignore this email or contact support."
        )
        self._send_via_api(to_email, subject, body)

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        """Send household invitation email."""
        subject = "You have been invited to a JuaLuma Household"

        text_body = (
            f"{inviter_name} has invited you to join their household on JuaLuma.\n\n"
            f"Click the link below to accept the invitation:\n{link}\n\n"
            f"This link will expire in 24 hours.\n"
            f"If you did not expect this invitation, please ignore this email."
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #007bff;">Household Invitation</h2>
        <p><strong>{inviter_name}</strong> has invited you to join their household on JuaLuma.</p>
        <p>Click the button below to accept the invitation:</p>
        <p>
            <a href="{link}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
        </p>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">
            Or copy and paste this link:<br>
            <a href="{link}" style="color: #007bff;">{link}</a>
        </p>
        <p style="font-size: 12px; color: #999;">This link will expire in 24 hours.</p>
    </div>
</body>
</html>"""

        self._send_via_api(to_email, subject, text_body, html_body)

    def send_household_welcome_member(
        self, to_email: str, household_name: str, owner_name: str
    ) -> None:
        """Send welcome email to new household member."""
        subject = f"Welcome to the {household_name} Household!"
        body = (
            f"Welcome to the {household_name} household on JuaLuma!\n\n"
            "You have successfully joined the household and now have access to shared financial insights, "
            "collaborative budgeting, and AI-powered features provided by the household's Ultimate plan.\n\n"
            f"This household is managed by {owner_name}.\n\n"
            "Log in to your dashboard to get started:\n"
            f"{settings.frontend_url}/dashboard"
        )
        self._send_via_api(to_email, subject, body)

    def send_support_ticket_notification(
        self,
        to_email: str,
        subject: str,
        ticket_id: str,
        user_email: str,
        description: str,
        event_type: str = "Ticket Created",
    ) -> None:
        """Notify support team via Testmail."""
        email_subject = f"[SUPPORT] {event_type}: {subject}"
        body = (
            f"Event: {event_type}\n"
            f"Ticket ID: {ticket_id}\n"
            f"User: {user_email}\n"
            f"Subject: {subject}\n\n"
            f"Description/Message:\n{description}\n\n"
            f"View in Portal: {settings.frontend_url}/support-portal/tickets/{ticket_id}"
        )
        self._send_via_api(to_email, email_subject, body)


class GmailApiEmailClient:
    """
    Sends email via Gmail API using DWD service account impersonation of hello@jualuma.com.
    Visible From address is support@jualuma.com (default sendAs identity on hello@jualuma.com).
    """

    def __init__(self):
        self.impersonate_user = settings.gmail_impersonate_user
        self.from_name = settings.mail_from_name
        self.from_email = settings.mail_from_email
        self.reply_to = settings.mail_reply_to
        self._service = None

    def _get_service(self):
        if self._service is not None:
            return self._service
        import json
        import os

        import google.auth
        from google.auth import impersonated_credentials
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        sa_value = settings.google_application_credentials or os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )
        if not sa_value:
            raise RuntimeError(
                "GOOGLE_APPLICATION_CREDENTIALS is not set. "
                "Cannot initialize Gmail API client."
            )
        scopes = ["https://www.googleapis.com/auth/gmail.send"]
        normalized = sa_value.strip()
        if normalized.startswith("{"):
            sa_info = json.loads(normalized)
            creds = service_account.Credentials.from_service_account_info(
                sa_info,
                scopes=scopes,
                subject=self.impersonate_user,
            )
        else:
            if normalized.endswith(".gserviceaccount.com") and "@" in normalized:
                # Keyless path: use ADC to impersonate a DWD-enabled service account.
                env_backup = os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
                try:
                    source_creds, _ = google.auth.default(
                        scopes=["https://www.googleapis.com/auth/cloud-platform"]
                    )
                finally:
                    if env_backup is not None:
                        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = env_backup
                creds = impersonated_credentials.Credentials(
                    source_credentials=source_creds,
                    target_principal=normalized,
                    target_scopes=scopes,
                    subject=self.impersonate_user,
                    lifetime=3600,
                )
            else:
                creds = service_account.Credentials.from_service_account_file(
                    normalized,
                    scopes=scopes,
                    subject=self.impersonate_user,
                )
        self._service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        return self._service

    def _build_message(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
        from_name: str | None = None,
        from_email: str | None = None,
    ) -> dict:
        from_name = from_name or self.from_name
        from_email = from_email or self.from_email

        if html_body:
            msg = MIMEMultipart("alternative")
        else:
            msg = MIMEMultipart()

        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg["Reply-To"] = self.reply_to
        msg["Subject"] = subject

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        return {"raw": raw}

    def _send(self, message_body: dict) -> None:
        try:
            service = self._get_service()
            service.users().messages().send(userId="me", body=message_body).execute()
        except Exception as e:
            logger.error("Gmail API send failed: %s", e)
            raise

    def send_generic_alert(self, to_email: str, title: str) -> None:
        body = (
            "You have a new notification in your secure JuaLuma Portal.\n\n"
            "Please log in to view the details: https://app.jualuma.com/notifications\n\n"
            "Running a financial platform means we prioritize your privacy. "
            "We do not include sensitive details in emails."
        )
        try:
            self._send(self._build_message(to_email, title, body))
            logger.info("Sent generic alert to %s", to_email)
        except Exception as e:
            logger.error("Failed to send generic alert: %s", e)

    def send_financial_digest(self, to_email: str, subject: str, body: str) -> None:
        footer = (
            "\n\n---\n"
            "This digest was generated for you by JuaLuma.\n"
            f"View more details securely: {settings.frontend_url}/ai\n"
        )
        try:
            self._send(self._build_message(to_email, subject, f"{body}{footer}"))
            logger.info("Sent financial digest to %s", to_email)
        except Exception as e:
            logger.error("Failed to send financial digest: %s", e)

    def send_subscription_welcome(self, to_email: str, plan_name: str) -> None:
        display_name = plan_name.replace("_", " ").title()
        subject = f"Welcome to JuaLuma {display_name}!"
        body = (
            f"Thank you for subscribing to the {display_name} plan.\n\n"
            "We are excited to have you on board! You now have access to all premium features.\n"
            "If you have any questions, please contact support."
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent subscription welcome to %s", to_email)
        except Exception as e:
            logger.error("Failed to send subscription welcome: %s", e)

    def send_subscription_payment_failed(
        self, to_email: str, plan_name: str, grace_end_date: str
    ) -> None:
        display_name = plan_name.replace("_", " ").title()
        subject = f"Payment failed for your JuaLuma {display_name} plan"
        body = (
            f"We couldn't process your payment for the {display_name} plan.\n\n"
            "Your subscription will remain active during a 3-day grace period so you can update your payment method.\n"
            f"If payment isn't completed by {grace_end_date}, your account will be moved to the Free plan.\n\n"
            "Please log in to update your billing details."
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent payment failed notice to %s", to_email)
        except Exception as e:
            logger.error("Failed to send payment failed notice: %s", e)

    def send_subscription_downgraded(self, to_email: str, reason: str) -> None:
        subject = "Your JuaLuma subscription was downgraded"
        body = (
            "Your account has been moved to the Free plan.\n\n"
            f"Reason: {reason}\n\n"
            "If you'd like to restore your paid plan, please update your billing details and resubscribe."
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent downgrade notice to %s", to_email)
        except Exception as e:
            logger.error("Failed to send downgrade notice: %s", e)

    def send_otp(self, to_email: str, code: str) -> None:
        subject = "JuaLuma Verification Code"
        body = (
            f"Your verification code is: {code}\n\n"
            "This code will expire in 10 minutes.\n"
            "If you did not request this code, please contact support."
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent OTP to %s", to_email)
        except Exception as e:
            logger.error("Failed to send OTP: %s", e)

    def send_password_reset(self, to_email: str, link: str) -> None:
        subject = "JuaLuma Password Reset"
        body = (
            "You requested a password reset for your JuaLuma account.\n\n"
            f"Click the link below to reset your password:\n{link}\n\n"
            "If you did not request this change, please ignore this email or contact support."
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent password reset link to %s", to_email)
        except Exception as e:
            logger.error("Failed to send password reset: %s", e)

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        subject = "You have been invited to a JuaLuma Household"
        text_body = (
            f"{inviter_name} has invited you to join their household on JuaLuma.\n\n"
            f"Click the link below to accept the invitation:\n{link}\n\n"
            "This link will expire in 24 hours.\n"
            "If you did not expect this invitation, please ignore this email."
        )
        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #007bff;">Household Invitation</h2>
        <p><strong>{inviter_name}</strong> has invited you to join their household on JuaLuma.</p>
        <p>Click the button below to accept the invitation:</p>
        <p>
            <a href="{link}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
        </p>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">
            Or copy and paste this link:<br>
            <a href="{link}" style="color: #007bff;">{link}</a>
        </p>
        <p style="font-size: 12px; color: #999;">This link will expire in 24 hours.</p>
    </div>
</body>
</html>"""
        try:
            self._send(self._build_message(to_email, subject, text_body, html_body))
            logger.info("Sent household invite to %s", to_email)
        except Exception as e:
            logger.error("Failed to send household invite: %s", e)

    def send_household_welcome_member(
        self, to_email: str, household_name: str, owner_name: str
    ) -> None:
        subject = f"Welcome to the {household_name} Household!"
        body = (
            f"Welcome to the {household_name} household on JuaLuma!\n\n"
            "You have successfully joined the household and now have access to shared financial insights, "
            "collaborative budgeting, and AI-powered features provided by the household's Ultimate plan.\n\n"
            f"This household is managed by {owner_name}.\n\n"
            "Log in to your dashboard to get started:\n"
            f"{settings.frontend_url}/dashboard"
        )
        try:
            self._send(self._build_message(to_email, subject, body))
            logger.info("Sent household welcome to %s", to_email)
        except Exception as e:
            logger.error("Failed to send household welcome: %s", e)

    def send_support_ticket_notification(
        self,
        to_email: str,
        subject: str,
        ticket_id: str,
        user_email: str,
        description: str,
        event_type: str = "Ticket Created",
    ) -> None:
        target_email = to_email or settings.support_email
        if not target_email:
            logger.error("Support email not configured. Skipping ticket notification.")
            return
        email_subject = f"[SUPPORT] {event_type}: {subject}"
        body = (
            f"Event: {event_type}\n"
            f"Ticket ID: {ticket_id}\n"
            f"User: {user_email}\n"
            f"Subject: {subject}\n\n"
            f"Description/Message:\n{description}\n\n"
            f"View in Portal: {settings.frontend_url}/support-portal/tickets/{ticket_id}"
        )
        try:
            self._send(self._build_message(target_email, email_subject, body))
            logger.info("Sent support ticket notification to %s", target_email)
        except Exception as e:
            logger.error("Failed to send support ticket notification: %s", e)


def get_email_client() -> EmailClient:
    """
    Returns the configured email client.
    Production: GmailApiEmailClient (DWD impersonation, visible From = support@jualuma.com).
    Development fallback (no SA key): TestmailEmailClient.
    """
    if settings.google_application_credentials or __import__("os").environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS"
    ):
        logger.info("Using GmailApiEmailClient (DWD via service account).")
        return GmailApiEmailClient()
    if settings.testmail_api_key and settings.testmail_namespace:
        logger.info("Using TestmailEmailClient for development.")
        return TestmailEmailClient()

    logger.warning(
        "GOOGLE_APPLICATION_CREDENTIALS not set and no Testmail config. "
        "Email sending will fail. Set GOOGLE_APPLICATION_CREDENTIALS."
    )
    return GmailApiEmailClient()  # Will raise on first send attempt with clear error
