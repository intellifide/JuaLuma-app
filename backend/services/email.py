import logging
import smtplib
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


class SmtpEmailClient:
    def __init__(self):
        self.host = settings.smtp_host or "localhost"
        self.port = settings.smtp_port or 1025
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email or "no-reply@jualuma.com"

    def _login_if_configured(self, server: smtplib.SMTP) -> None:
        if self.username and self.password:
            server.login(self.username, self.password)
        elif self.username or self.password:
            logger.warning(
                "SMTP credentials incomplete; skipping authentication for host %s.",
                self.host,
            )

    def send_generic_alert(self, to_email: str, title: str) -> None:
        """
        Sends a strict NO-PII alert.
        GLBA Requirement: Do not include sensitive details in the body.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = title

        # ID Check: Ensure no PII in the body
        body = (
            "You have a new notification in your secure jualuma Portal.\n\n"
            "Please log in to view the details: https://app.jualuma.com/notifications\n\n"
            "Running a financial platform means we prioritize your privacy. "
            "We do not include sensitive details in emails."
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            # For production, we'd use starttls, credentials, etc.
            # This is a simplified connector for the prompt context.
            if self.host == "mock":
                logger.info(f"[SMTP MOCK] Would send to {to_email}")
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent generic alert to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    def send_subscription_welcome(self, to_email: str, plan_name: str) -> None:
        """
        Sends welcome email for new subscription.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        display_name = plan_name.replace("_", " ").title()
        msg["Subject"] = f"Welcome to JuaLuma {display_name}!"

        body = (
            f"Thank you for subscribing to the {display_name} plan.\n\n"
            "We are excited to have you on board! You now have access to all premium features.\n"
            "If you have any questions, please contact support."
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                logger.info(f"[SMTP MOCK WELCOME] To: {to_email} | Plan: {plan_name}")
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent subscription welcome email to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")

    def send_otp(self, to_email: str, code: str) -> None:
        """
        Sends the OTP code.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = "jualuma Verification Code"

        body = (
            f"Your verification code is: {code}\n\n"
            "This code will expire in 10 minutes.\n"
            "If you did not request this code, please contact support."
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                # Fallback to logger in local if no real SMTP
                logger.info(f"[SMTP-OTP] To: {to_email} | Code: {code}")
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent OTP to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send OTP: {e}")

    def send_password_reset(self, to_email: str, link: str) -> None:
        """
        Sends the password reset email.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = "jualuma Password Reset"

        body = (
            "You requested a password reset for your jualuma account.\n\n"
            f"Click the link below to reset your password:\n{link}\n\n"
            "If you did not request this change, please ignore this email or contact support."
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                # Fallback to logger in local if no real SMTP
                logger.info(f"[SMTP-RESET] To: {to_email} | Link: {link}")
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent password reset link to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        """
        Sends the household invitation email.
        """
        # Use simple alternative structure for text+HTML
        msg = MIMEMultipart("alternative")
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = "You have been invited to a JuaLuma Household"

        # Plain text version
        text_body = (
            f"{inviter_name} has invited you to join their household on JuaLuma.\n\n"
            f"Click the link below to accept the invitation:\n{link}\n\n"
            f"This link will expire in 24 hours.\n"
            f"If you did not expect this invitation, please ignore this email."
        )

        # HTML version
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

        # Attach both versions - text first, then HTML (last is preferred)
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if self.host == "mock":
                logger.info(
                    f"[SMTP-INVITE] To: {to_email} | Inviter: {inviter_name} | Link: {link}"
                )
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent household invite to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send household invite email: {e}")

    def send_household_welcome_member(
        self, to_email: str, household_name: str, owner_name: str
    ) -> None:
        """
        Sends the household welcome email.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = f"Welcome to the {household_name} Household!"

        body = (
            f"Welcome to the {household_name} household on JuaLuma!\n\n"
            "You have successfully joined the household and now have access to shared financial insights, "
            "collaborative budgeting, and AI-powered features provided by the household's Ultimate plan.\n\n"
            f"This household is managed by {owner_name}.\n\n"
            "Log in to your dashboard to get started:\n"
            f"{settings.frontend_url}/dashboard"
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                logger.info(
                    f"[SMTP-HOUSEHOLD-WELCOME] To: {to_email} | Household: {household_name}"
                )
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent household welcome email to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send household welcome email: {e}")

    def send_support_ticket_notification(
        self,
        to_email: str,
        subject: str,
        ticket_id: str,
        user_email: str,
        description: str,
        event_type: str = "Ticket Created",
    ) -> None:
        """Notify support team via SMTP."""
        target_email = to_email or settings.support_email
        if not target_email:
            logger.error("Support email not configured. Skipping notification send.")
            return
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = target_email
        msg["Subject"] = f"[SUPPORT] {event_type}: {subject}"

        body = (
            f"Event: {event_type}\n"
            f"Ticket ID: {ticket_id}\n"
            f"User: {user_email}\n"
            f"Subject: {subject}\n\n"
            f"Description/Message:\n{description}\n\n"
            f"View in Portal: {settings.frontend_url}/support-portal/tickets/{ticket_id}"
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                logger.info(
                    f"[SMTP-SUPPORT-NOTIFICATION] To: {target_email} | Ticket: {ticket_id}"
                )
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                self._login_if_configured(server)
                server.send_message(msg)

            logger.info(f"Sent support notification email to {target_email}")
        except Exception as e:
            logger.error(f"Failed to send support notification email: {e}")


def get_email_client() -> EmailClient:
    """
    Returns the configured email client.
    We use SmtpEmailClient (configured with Gmail in .env) for sending.
    Testmail credentials in .env are used by E2E tests for verification only.
    """
    if settings.smtp_host:
        logger.info("Using SmtpEmailClient with host: %s", settings.smtp_host)
        return SmtpEmailClient()
    if settings.testmail_api_key and settings.testmail_namespace:
        logger.info("Using TestmailEmailClient for development.")
        return TestmailEmailClient()

    logger.warning("SMTP_HOST not set. Email functionality disabled.")
    return SmtpEmailClient()  # Will likely fail or log if host is missing
