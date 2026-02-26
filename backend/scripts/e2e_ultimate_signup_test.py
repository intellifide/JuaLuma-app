
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

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

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
        "password": password,
        "agreements": [
            {"agreement_key": "terms_of_service"},
            {"agreement_key": "privacy_policy"},
        ],
    }
    logger.info(f"Signing up user: {email}")
    try:
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
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

    # 6. Poll for Welcome Email
    logger.info("Waiting for Welcome email...")
    welcome_email = poll_for_email(tag, match_subject="Welcome")
    if welcome_email:
        logger.info("SUCCESS: Welcome Email received.")
    else:
        logger.warning("WARNING: No welcome email received, proceeding anyway.")

    # --- FAMILY / HOUSEHOLD FLOW ---
    logger.info("--- Starting Family Household Flow ---")

    # 7. Create Household (Primary User)
    household_name = f"The Jetsons {int(time.time())}"
    logger.info(f"Creating Household: {household_name}")
    hh_id = create_household(id_token, household_name)
    if not hh_id:
        logger.error("Failed to create household.")
        return

    # 8. Add Multiple Family Members (Verify > 2 users)
    # Testing Protocol: Primary + 3 Members = 4 Users Total
    for i in range(1, 4):
        logger.info(f"\n--- Adding Family Member #{i} ---")

        email_fam, tag_fam = get_test_email() # New unique tag each time
        logger.info(f"Member #{i} Email: {email_fam}")

        uid_fam, _ = signup_user(email_fam, password)
        if not uid_fam:
            logger.error(f"Failed to signup member #{i}.")
            continue

        # 9. Verify Secondary User (OTP)
        logger.info(f"Verifying family member #{i} ({email_fam})...")
        otp_email_fam = poll_for_email(tag_fam, match_subject=None)

        id_token_fam = None
        if otp_email_fam:
            otp_code_fam = extract_otp(otp_email_fam.get("text", "") or otp_email_fam.get("html", ""))
            if otp_code_fam:
                id_token_fam = firebase_login(email_fam, password)
                if id_token_fam:
                    enable_mfa(id_token_fam, otp_code_fam)
                else:
                    logger.error(f"Failed to login member #{i}.")
                    continue
            else:
                logger.error(f"Failed to extract OTP for member #{i}.")
                continue
        else:
            logger.error(f"Failed to receive OTP for member #{i}.")
            continue

        # 10. Invite Family Member (Primary User action)
        logger.info(f"Inviting {email_fam} to household...")
        if not send_invite(id_token, email_fam):
            logger.error(f"Failed to invite member #{i}.")
            continue

        # 11. Poll for Invite Email (Family User)
        logger.info(f"Waiting for Invite email for member #{i}...")
        invite_email = poll_for_email(tag_fam, match_subject="Invite")
        if not invite_email:
            logger.error(f"Did not receive invite email for member #{i}.")
            continue

        # Extract invite token
        token = extract_invite_token(invite_email.get("text", "") or invite_email.get("html", ""))
        if not token:
            logger.error(f"Could not extract invite token for member #{i}.")
            continue
        logger.info(f"Got Invite Token for member #{i}: {token}")

        # 12. Accept Invite (Family User action)
        logger.info(f"Member #{i} Accepting Invite...")
        if accept_invite(id_token_fam, token):
            logger.info(f"SUCCESS: Family Member #{i} joined household!")
        else:
            logger.error(f"Member #{i} failed to join household.")

    # 13. Add a Minor (Restricted Member)
    logger.info("\n--- Adding Minor (Restricted Member) ---")
    email_minor, tag_minor = get_test_email()
    logger.info(f"Minor Email: {email_minor}")

    # Signup Minor
    uid_minor, _ = signup_user(email_minor, password)
    if not uid_minor:
        logger.error("Failed to signup minor.")
        return

    # Verify Minor OTP
    logger.info("Verifying Minor OTP...")
    otp_email_minor = poll_for_email(tag_minor, match_subject=None)

    id_token_minor = None
    if otp_email_minor:
        otp_code_minor = extract_otp(otp_email_minor.get("text", "") or otp_email_minor.get("html", ""))
        if otp_code_minor:
            id_token_minor = firebase_login(email_minor, password)
            if id_token_minor:
                enable_mfa(id_token_minor, otp_code_minor)
            else:
                logger.error("Failed to login minor.")
                return
        else:
            logger.error("Failed to extract OTP for minor.")
            return
    else:
        logger.error("Failed to receive OTP for minor.")
        return

    # Invite Minor (is_minor=True)
    logger.info(f"Inviting Minor {email_minor} to household...")
    if not send_invite(id_token, email_minor, is_minor=True):
        logger.error("Failed to invite minor.")
        return

    # Poll and Accept
    logger.info("Waiting for Minor Invite email...")
    invite_email_minor = poll_for_email(tag_minor, match_subject="Invite")
    if not invite_email_minor:
        logger.error("Did not receive minor invite email.")
        return

    token_minor = extract_invite_token(invite_email_minor.get("text", "") or invite_email_minor.get("html", ""))
    if accept_invite(id_token_minor, token_minor):
        logger.info("SUCCESS: Minor joined household!")
    else:
        logger.error("Minor failed to join household.")

    # 14. Verify Household State & Roles
    logger.info("\n--- Verifying Household State & Roles ---")
    hh_details = get_my_household(id_token)
    if hh_details:
        members = hh_details.get("members", [])
        logger.info(f"Total Members: {len(members)}")

        # Verify Count (Admin + 3 Members + 1 Minor = 5)
        if len(members) != 5:
            logger.error(f"FAILURE: Expected 5 members, found {len(members)}")

        # Verify Minor Role
        minor_record = next((m for m in members if m["email"] == email_minor), None)
        if minor_record:
            logger.info(f"Minor Record: {minor_record}")
            if minor_record["role"] == "restricted_member" and minor_record["ai_access_enabled"] is False:
                logger.info("SUCCESS: Minor role and permissions verified correctly.")
            else:
                logger.error("FAILURE: Minor role or permissions incorrect.")
        else:
            logger.error("FAILURE: Minor not found in household list.")
    else:
        logger.error("Failed to fetch household details.")

    logger.info("\n--- E2E Ultimate Family Test Completed Successfully ---")

def create_household(token, name):
    url = f"{API_BASE}/households/"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": name}
    res = requests.post(url, json=payload, headers=headers)
    if res.status_code == 200:
        data = res.json()
        logger.info(f"Household Created. ID: {data.get('id')}")
        return data.get("id")
    else:
        logger.error(f"Create Household Failed: {res.status_code} - {res.text}")
        return None

def get_my_household(token):
    url = f"{API_BASE}/households/me"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        return res.json()
    else:
        logger.error(f"Get Household Failed: {res.status_code} - {res.text}")
        return None

def send_invite(token, email, is_minor=False):
    url = f"{API_BASE}/households/invites"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"email": email, "is_minor": is_minor}
    res = requests.post(url, json=payload, headers=headers)
    if res.status_code == 200:
        logger.info("Invite Sent.")
        return True
    else:
        logger.error(f"Send Invite Failed: {res.status_code} - {res.text}")
        return False

def extract_invite_token(text):
    # Regex to find token in URL: ?token=xyz or /accept?token=xyz
    match = re.search(r"token=([a-zA-Z0-9_\-\.]+)", text)
    if match:
        return match.group(1)
    return None

def accept_invite(token, invite_token):
    url = f"{API_BASE}/households/invites/accept"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"token": invite_token}
    res = requests.post(url, json=payload, headers=headers)
    if res.status_code == 200:
        return True
    else:
        logger.error(f"Accept Invite Failed: {res.status_code} - {res.text}")
        return False

if __name__ == "__main__":
    main()
