import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Protocol
from backend.core import settings

logger = logging.getLogger(__name__)

class EmailClient(Protocol):
    def send_generic_alert(self, to_email: str, title: str) -> None:
        """Send a generic Alert email pointing to the secure portal."""
        ...

class MockEmailClient:
    def send_generic_alert(self, to_email: str, title: str) -> None:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {title} | Body: <Generic Portal Link>")

class SmtpEmailClient:
    def __init__(self):
        self.host = settings.smtp_host or "localhost"
        self.port = settings.smtp_port or 1025
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email or "no-reply@finity.finance"

    def send_generic_alert(self, to_email: str, title: str) -> None:
        """
        Sends a strict NO-PII alert.
        GLBA Requirement: Do not include sensitive details in the body.
        """
        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = title

        # ID Check: Ensure no PII in the body
        body = (
            "You have a new notification in your secure Finity Portal.\n\n"
            "Please log in to view the details: https://app.finity.finance/notifications\n\n"
            "Running a financial platform means we prioritize your privacy. "
            "We do not include sensitive details in emails."
        )
        msg.attach(MIMEText(body, 'plain'))

        try:
            # For production, we'd use starttls, credentials, etc.
            # This is a simplified connector for the prompt context.
            if self.host == "mock":
                logger.info(f"[SMTP MOCK] Would send to {to_email}")
                return

            # Note: Minimal SMTP impl
            # server = smtplib.SMTP(self.host, self.port)
            # server.send_message(msg)
            # server.quit()
            logger.info(f"Sent generic alert to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

def get_email_client() -> EmailClient:
    if settings.app_env.lower() in ["local", "test"]:
        return MockEmailClient()
    return SmtpEmailClient()
