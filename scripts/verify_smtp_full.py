import logging
import os
import random
import string
import sys
import time

import requests

# Ensure backend can be imported
sys.path.append(os.getcwd())

from backend.core import settings
from backend.services.email import SmtpEmailClient, get_email_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TESTMAIL_API_KEY = "66757b44-e55f-4606-b676-dc2d08cba593"  # From .env in previous steps
TESTMAIL_NAMESPACE = "s72ew"  # From user image


def verify_end_to_end():
    client = get_email_client()

    # 1. Force SMTP Client if not already
    if not isinstance(client, SmtpEmailClient):
        logger.warning(f"Client is NOT SmtpEmailClient. It is {type(client)}")
        if settings.smtp_host:
            logger.info("Forcing SmtpEmailClient creation...")
            client = SmtpEmailClient()
        else:
            logger.error("SMTP_HOST not set in .env")
            return

    # 2. Generate a unique tag and code to verify exact delivery
    unique_tag = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    otp_code = "".join(random.choices(string.digits, k=6))

    # Construct Testmail Address: {namespace}.{tag}@inbox.testmail.app
    to_email = f"{TESTMAIL_NAMESPACE}.{unique_tag}@inbox.testmail.app"

    print("--- Step 1: Sending Email ---")
    print(f"Target: {to_email}")
    print(f"OTP: {otp_code}")

    try:
        client.send_otp(to_email, otp_code)
        print("SUCCESS: SMTP send command completed without error.")
    except Exception as e:
        print(f"FAILURE: SMTP send failed. Error: {e}")
        return

    print("\n--- Step 2: Verifying Receipt via Testmail API ---")
    print("Waiting 5 seconds for delivery...")
    time.sleep(5)

    # Testmail API: https://api.testmail.app/api/json?apikey={key}&namespace={ns}&tag={tag}
    url = "https://api.testmail.app/api/json"
    params = {
        "apikey": TESTMAIL_API_KEY,
        "namespace": TESTMAIL_NAMESPACE,
        "tag": unique_tag,
        "live": "true",  # Query mostly real-time
    }

    try:
        resp = requests.get(url, params=params)
        data = resp.json()

        if resp.status_code != 200:
            print(f"FAILURE: Testmail API returned {resp.status_code}")
            print(data)
            return

        if data.get("result") == "success":
            emails = data.get("emails", [])
            if not emails:
                print("FAILURE: No emails found in Testmail inbox yet.")
                return

            # Check content
            latest_email = emails[0]
            subject = latest_email.get("subject", "")
            text = latest_email.get("text", "")

            print("Email Received!")
            print(f"From: {latest_email.get('from')}")
            print(f"Subject: {subject}")

            if otp_code in text:
                print("SUCCESS: OTP Code found in email body.")
                print(">>> END-TO-END VERIFICATION PASSED <<<")
            else:
                print("FAILURE: OTP Code NOT found in email body.")
                print(f"Body preview: {text[:100]}...")
        else:
            print(f"FAILURE: Testmail API result: {data.get('result')}")

    except Exception as e:
        print(f"FAILURE: Error querying Testmail API: {e}")


if __name__ == "__main__":
    verify_end_to_end()
