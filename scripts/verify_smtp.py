import logging
import os
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

    # Use a dummy code and self-email
    # We use the SMTP_USERNAME as the recipient to avoid spamming unknown addresses
    # unless we have a specific target.
    to_email = client.username
    if not to_email:
        print("SMTP_USERNAME not set, cannot determine 'to' address.")
        return

    print(
        f"Attempting to send OTP email to {to_email} via {client.host}:{client.port}..."
    )
    try:
        client.send_otp(to_email, "123456")
        print("SUCCESS: Email sent successfully.")
    except Exception as e:
        print(f"FAILURE: Could not send email. Error: {e}")


if __name__ == "__main__":
    verify_smtp()
