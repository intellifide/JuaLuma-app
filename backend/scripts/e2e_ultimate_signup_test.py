
import hashlib
import hmac
import json
import logging
import os
import re
import time

import requests

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8000/api")
TESTMAIL_NS = os.getenv("TESTMAIL_NAMESPACE", "jualuma")
TESTMAIL_KEY = os.getenv("TESTMAIL_API_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

def get_test_email():
    unique_tag = f"household_ultimate_{int(time.time())}"
    ns = TESTMAIL_NS
    email = f"{ns}.{unique_tag}@inbox.testmail.app"
    return email, unique_tag

# ... (Previous helper functions: generate_stripe_signature) ...
def generate_stripe_signature(payload: str, secret: str) -> str:
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=signed_payload.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"

def signup_user(email, password):
    url = f"{API_BASE}/auth/signup"
    payload = {
        "email": email,
        "password": password
    }
    logger.info(f"Signing up user: {email}")
    try:
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if res.status_code == 201:
            data = res.json()
            logger.info(f"Signup Successful. UID: {data.get('uid')}")
            return data.get("uid"), data.get("email") # Return email too
        else:
            logger.error(f"Signup Failed: {res.status_code} - {res.text}")
            return None, None
    except Exception as e:
        logger.error(f"Signup Exception: {e}")
        return None, None

def poll_for_email(tag, match_subject=None, timeout=65):
    logger.info(f"Polling Testmail (Tag: {tag}, Match: {match_subject})...")

    if not TESTMAIL_KEY:
        logger.error("TESTMAIL_API_KEY is missing.")
        return None

    namespace = TESTMAIL_NS
    url = f"https://api.testmail.app/api/json?apikey={TESTMAIL_KEY}&namespace={namespace}&tag={tag}&livequery=true"

    max_attempts = 12 # 60 seconds total if sleep=5
    timeout_per_request = 65

    for attempt in range(max_attempts):
        try:
            logger.debug(f"Attempt {attempt+1}/{max_attempts}...")
            res = requests.get(url, timeout=timeout_per_request)
            if res.status_code == 200:
                data = res.json()
                for email in data.get("emails", []):
                    subject = email.get("subject", "")
                    if match_subject and match_subject.lower() in subject.lower():
                        logger.info(f"Email Found: {subject}")
                        return email
                    elif not match_subject:
                        # Return first email if no match subject
                         logger.info(f"Email Found (Any): {subject}")
                         return email

                logger.info("No matching email found yet. Retrying...")
            else:
                logger.warning(f"Testmail Response: {res.status_code}")
        except Exception as e:
            logger.warning(f"Error polling Testmail: {e}")

        time.sleep(5)

    logger.error(f"Timeout waiting for email matching '{match_subject}' after {max_attempts} attempts.")
    return None

def extract_otp(email_text):
    # Assume 6 digit code
    match = re.search(r"\b(\d{6})\b", email_text)
    if match:
        return match.group(1)
    return None

def verify_email_otp(token, code):
    # Logic note: Standard API might require 'Authorization' header or just payload.
    # Looking at auth.py: @router.post("/mfa/email/enable") depends on get_current_user.
    # So we need a Token to verify OTP?
    # POST /login returns token?
    # Wait, /signup returns UID/Email but NOT a token in the response model (Step 539, line 372).
    # So how do I get a token to call /mfa/email/enable?
    # I need to LOGIN first.
    # But I can't login if not verified?
    # /login endpoint: "Exchange a valid Firebase ID token".
    # So I need a Firebase ID Token.
    # Since I am using Backend Auth Emulator (via Admin SDK), I can use the Emulator REST API to signInWithPassword and get ID Token.

    # This is getting complicated.
    # Alternative: Use "Magic Link" or just directly update DB in test?
    # No, keep it pure if possible.
    # Use Firebase Emulator to sign in.
    return True

def firebase_login(email, password):
    # Exchange email/password for ID Token using Emulator
    firebase_api_key = os.getenv("VITE_FIREBASE_API_KEY", "demo-api-key")
    url = f"http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    try:
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            return res.json().get("idToken")
        else:
            logger.error(f"Firebase Login Failed: {res.text}")
            return None
    except Exception as e:
        logger.error(f"Firebase Login Exception: {e}")
        return None

def enable_mfa(token, code):
    url = f"{API_BASE}/auth/mfa/email/enable"
    # Wait, the endpoint is /mfa/email/enable.
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"code": code}
    res = requests.post(url, json=payload, headers=headers)
    if res.status_code == 200:
        logger.info("Email MFA Enabled (Verified).")
        return True
    else:
        logger.error(f"MFA Verify Failed: {res.text}")
        return False

def simulate_stripe_upgrade(uid, plan_type="ultimate_monthly"):
    if not STRIPE_WEBHOOK_SECRET:
        return False

    # Try alternate URL if needed (logic from before)

    event_payload = {
        "id": "evt_test_checkout_completed_" + str(int(time.time())),
        "object": "event",
        "type": "checkout.session.completed",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "cs_test_session_123",
                "object": "checkout.session",
                "customer": "cus_test_mock",
                "payment_status": "paid",
                "status": "complete",
                "metadata": {
                    "uid": uid,
                    "plan": plan_type
                },
                "subscription": "sub_test_mock_123"
            }
        }
    }

    payload_str = json.dumps(event_payload)
    signature = generate_stripe_signature(payload_str, STRIPE_WEBHOOK_SECRET)
    headers = {"Stripe-Signature": signature, "Content-Type": "application/json"}

    # Try root first
    url_root = API_BASE.replace("/api", "")
    target_url = f"{url_root}/webhook"

    try:
        res = requests.post(target_url, data=payload_str, headers=headers)
        if res.status_code == 404:
             res = requests.post(f"{API_BASE}/webhook", data=payload_str, headers=headers)

        if res.status_code == 200:
            logger.info("Webhook Sent Successfully.")
            return True
        else:
            logger.error(f"Webhook Failed: {res.status_code} - {res.text}")
            return False
    except Exception as e:
        logger.error(f"Webhook Exception: {e}")
        return False

def main():
    if not TESTMAIL_KEY or not STRIPE_WEBHOOK_SECRET:
        logger.error("Missing Env Vars.")
        return

    # 1. Signup
    email, tag = get_test_email()
    password = "TestUser123!"
    uid, _ = signup_user(email, password)
    if not uid:
        return

    # 2. Poll for OTP
    logger.info("Waiting for OTP email...")
    otp_email = poll_for_email(tag, match_subject=None) # Subject might handle "OTP" or "Code"
    if not otp_email:
        logger.error("Did not receive OTP email.")
        return

    otp_code = extract_otp(otp_email.get("text", "") or otp_email.get("html", ""))
    if not otp_code:
        logger.error(f"Could not extract OTP from email body: {otp_email.get('text')[:50]}")
        return
    logger.info(f"Got OTP: {otp_code}")

    # 3. Login to get Token
    id_token = firebase_login(email, password)
    if not id_token:
        return

    # 4. Verify OTP
    if not enable_mfa(id_token, otp_code):
        return

    # 5. Upgrade
    if not simulate_stripe_upgrade(uid):
        return

    # 6. Poll for Welcome Email (using same tag, might need to wait/poll next)
    logger.info("Waiting for Welcome email...")
    # Testmail livequery returns immediately if exists.
    # The previous email is already there. Does livequery return ALL or just new?
    # Testmail API returns all array. We filter.
    # We need to find one that has "Welcome" subject.

    # We might need to call again?
    # The tag is same.

    welcome_email = poll_for_email(tag, match_subject="Welcome")
    if welcome_email:
        logger.info("SUCCESS: Welcome Email received.")
        logger.info(f"Subject: {welcome_email.get('subject')}")
    else:
        logger.error("FAILURE: No welcome email received.")

if __name__ == "__main__":
    main()
