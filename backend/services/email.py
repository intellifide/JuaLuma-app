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

    def send_otp(self, to_email: str, code: str) -> None:
        """Send specific 2FA OTP code."""
        ...

class MockEmailClient:
    def send_generic_alert(self, to_email: str, title: str) -> None:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {title} | Body: <Generic Portal Link>")

    def send_otp(self, to_email: str, code: str) -> None:
        logger.info(f"[MOCK EMAIL OTP] To: {to_email} | Code: {code}")

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
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = title

        # ID Check: Ensure no PII in the body
        body = (
            "You have a new notification in your secure jualuma Portal.\n\n"
            "Please log in to view the details: https://app.jualuma.com/notifications\n\n"
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

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"Sent generic alert to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    def send_otp(self, to_email: str, code: str) -> None:
        """
        Sends the OTP code. 
        """
        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = "jualuma Verification Code"

        body = (
            f"Your verification code is: {code}\n\n"
            "This code will expire in 10 minutes.\n"
            "If you did not request this code, please contact support."
        )
        msg.attach(MIMEText(body, 'plain'))

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

def get_email_client() -> EmailClient:
    # If explicit SMTP settings exist, use SmtpEmailClient even in local
    if settings.smtp_host and settings.smtp_password:
        return SmtpEmailClient()
        
    if settings.app_env.lower() in ["local", "test"]:
        return MockEmailClient()
    return SmtpEmailClient()
