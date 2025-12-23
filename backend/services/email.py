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


class MockEmailClient:
    def send_generic_alert(self, to_email: str, title: str) -> None:
        logger.info(
            f"[MOCK EMAIL] To: {to_email} | Subject: {title} | Body: <Generic Portal Link>"
        )

    def send_subscription_welcome(self, to_email: str, plan_name: str) -> None:
        logger.info(
            f"[MOCK EMAIL WELCOME] To: {to_email} | Plan: {plan_name} | Subject: Welcome to JuaLuma {plan_name.capitalize()}!"
        )

    def send_otp(self, to_email: str, code: str) -> None:
        """Log the OTP code for local dev."""
        logger.info(f"[MOCK EMAIL OTP] To: {to_email} | Code: {code}")

    def send_password_reset(self, to_email: str, link: str) -> None:
        """Log the reset link for local dev."""
        logger.info(f"[MOCK EMAIL RESET] To: {to_email} | Link: {link}")

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        """Log the household invite link for local dev."""
        logger.info(
            f"[MOCK EMAIL INVITE] To: {to_email} | Inviter: {inviter_name} | Link: {link}"
        )


class SmtpEmailClient:
    def __init__(self):
        self.host = settings.smtp_host or "localhost"
        self.port = settings.smtp_port or 1025
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email or "no-reply@jualuma.com"

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
                server.login(self.username, self.password)
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
                server.login(self.username, self.password)
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
                server.login(self.username, self.password)
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
                server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"Sent password reset link to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

    def send_household_invite(self, to_email: str, link: str, inviter_name: str) -> None:
        """
        Sends the household invitation email.
        """
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = f"{inviter_name} invited you to join their JuaLuma Household"

        body = (
            f"{inviter_name} has invited you to join their household on JuaLuma.\n\n"
            f"Click the link below to accept the invitation:\n{link}\n\n"
            "This link will expire in 24 hours.\n"
            "If you did not expect this invitation, please ignore this email."
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            if self.host == "mock":
                logger.info(
                    f"[SMTP-INVITE] To: {to_email} | Inviter: {inviter_name} | Link: {link}"
                )
                return

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"Sent household invite to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send household invite email: {e}")


def get_email_client() -> EmailClient:
    # If explicit SMTP settings exist, use SmtpEmailClient even in local
    if settings.smtp_host and settings.smtp_password:
        return SmtpEmailClient()

    if settings.app_env.lower() in ["local", "test"]:
        return MockEmailClient()
    return SmtpEmailClient()
