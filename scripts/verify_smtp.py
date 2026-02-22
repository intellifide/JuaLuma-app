import logging
import os
import random
import string
import sys

# Ensure backend can be imported
sys.path.append(os.getcwd())

from backend.services.email import SmtpEmailClient, get_email_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_smtp():
    client = get_email_client()

    if not isinstance(client, SmtpEmailClient):
        logger.warning(f"Client is NOT SmtpEmailClient. It is {type(client)}")
        logger.warning("Check your .env settings for SMTP_HOST and SMTP_PASSWORD")
        # Force SMTP for verification if env vars exist
        from backend.core import settings

        if settings.smtp_host:
            logger.info("Forcing SmtpEmailClient creation...")
            client = SmtpEmailClient()
        else:
            logger.error("SMTP_HOST not set.")
            return

    # Determine target email
    # Priority: Testmail (so we don't spam the sender's inbox) -> Self (fallback)
    from backend.core import settings

    if settings.testmail_namespace:
        to_email = f"{settings.testmail_namespace}.smtp_check@inbox.testmail.app"
    else:
        to_email = client.username

    if not to_email:
        print("SMTP_USERNAME not set, cannot determine 'to' address.")
        return

    # Use same logic as backend/api/auth.py: _generate_and_send_otp
    otp_code = "".join(random.choices(string.digits, k=6))
    print(
        f"Attempting to send OTP email to {to_email} via {client.host}:{client.port}..."
    )
    try:
        client.send_otp(to_email, otp_code)
        print("SUCCESS: Email sent successfully.")
    except Exception as e:
        print(f"FAILURE: Could not send email. Error: {e}")


if __name__ == "__main__":
    verify_smtp()
