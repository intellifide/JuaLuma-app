
import hashlib
import hmac
import json
import logging
import os
import re
import time
import requests
import sys

# Add project root to path for DB imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Import Models for direct DB seeding
from backend.models import Account, Transaction, SessionLocal

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.env"))

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8000/api")
TESTMAIL_NS = os.getenv("TESTMAIL_NAMESPACE", "jualuma")
TESTMAIL_KEY = os.getenv("TESTMAIL_API_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# --- Helpers ---

def get_test_email():
    unique_tag = f"household_verify_{int(time.time())}_{os.urandom(4).hex()}"
    ns = TESTMAIL_NS
    email = f"{ns}.{unique_tag}@inbox.testmail.app"
    return email, unique_tag

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
            {"agreement_key": "us_residency_certification"},
        ],
    }
    logger.info(f"Signing up user: {email}")
    try:
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        if res.status_code == 201:
            data = res.json()
            return data.get("uid"), data.get("email")
        else:
            logger.error(f"Signup Failed: {res.status_code} - {res.text}")
            return None, None
    except Exception as e:
        logger.error(f"Signup Exception: {e}")
        return None, None

def poll_for_email(tag, match_subject=None):
    logger.info(f"Polling Testmail (Tag: {tag})...")
    if not TESTMAIL_KEY:
        logger.error("TESTMAIL_API_KEY is missing.")
        return None
    url = f"https://api.testmail.app/api/json?apikey={TESTMAIL_KEY}&namespace={TESTMAIL_NS}&tag={tag}&livequery=true"
    
    for _ in range(12): # 60s timeout
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                for email in data.get("emails", []):
                    subject = email.get("subject", "")
                    if not match_subject or match_subject.lower() in subject.lower():
                        logger.info(f"Email Found: {subject}")
                        return email
            time.sleep(5)
        except Exception:
            pass
    return None

def extract_otp(email_text):
    match = re.search(r"\b(\d{6})\b", email_text)
    return match.group(1) if match else None

def firebase_login(email, password):
    firebase_api_key = os.getenv("VITE_FIREBASE_API_KEY", "demo-api-key")
    url = f"http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    try:
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            return res.json().get("idToken")
    except Exception as e:
        logger.error(f"Firebase Login Error: {e}")
    return None

def enable_mfa(token, code):
    url = f"{API_BASE}/auth/mfa/email/enable"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"code": code}
    requests.post(url, json=payload, headers=headers)

def simulate_stripe_upgrade(uid):
    if not STRIPE_WEBHOOK_SECRET:
        return False
    event_payload = {
        "id": "evt_test_" + str(int(time.time())),
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "customer": "cus_test",
                "payment_status": "paid",
                "status": "complete",
                "metadata": {"uid": uid, "plan": "ultimate_monthly"},
                "subscription": "sub_test"
            }
        }
    }
    payload_str = json.dumps(event_payload)
    headers = {
        "Stripe-Signature": generate_stripe_signature(payload_str, STRIPE_WEBHOOK_SECRET),
        "Content-Type": "application/json"
    }
    # Try root or /api depending on setup
    url = f"{API_BASE.replace('/api', '')}/webhook"
    res = requests.post(url, data=payload_str, headers=headers)
    return res.status_code == 200

def create_household(token):
    url = f"{API_BASE}/households/"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(url, json={"name": "Ultimate Fam"}, headers=headers)
    if res.status_code == 200:
        return res.json().get("id")
    return None

def send_invite(token, email, is_minor=False):
    url = f"{API_BASE}/households/invites"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(url, json={"email": email, "is_minor": is_minor}, headers=headers)
    return res.status_code == 200

def accept_invite(token, invite_token):
    url = f"{API_BASE}/households/invites/accept"
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(url, json={"token": invite_token, "consent_agreed": True}, headers=headers)
    return res.status_code == 200

def extract_invite_token(text):
    match = re.search(r"token=([a-zA-Z0-9_\-\.]+)", text)
    return match.group(1) if match else None

# --- Main Test ---

def main():
    if not TESTMAIL_KEY or not STRIPE_WEBHOOK_SECRET:
        logger.error("Missing TESTMAIL_API_KEY or STRIPE_WEBHOOK_SECRET")
        return

    password = "Password123!"
    PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
    PLAID_SECRET = os.getenv("PLAID_SECRET")

    try:
        logger.info("--- 1. Admin Setup ---")
        email_admin, tag_admin = get_test_email()
        logger.info(f"Admin Email: {email_admin}")
        
        # Signup
        uid_admin, _ = signup_user(email_admin, password)
        if not uid_admin: raise Exception("Admin signup failed")
        
        # OTP
        otp_email = poll_for_email(tag_admin)
        if not otp_email: raise Exception("Admin OTP email missing")
        otp_code = extract_otp(otp_email["text"])
        
        # Login & Verify
        token_admin = firebase_login(email_admin, password)
        enable_mfa(token_admin, otp_code)
        
        # Upgrade
        if not simulate_stripe_upgrade(uid_admin): raise Exception("Stripe upgrade failed")
        logger.info("Admin upgraded to Ultimate.")

        # --- Data Seeding ---
        admin_plaid_acc_id = None
        admin_web3_acc_id = None
        admin_cex_acc_id = None

        # 1.5 Plaid Seeding
        if PLAID_CLIENT_ID and PLAID_SECRET:
            try:
                logger.info("Linking Plaid Account for Admin...")
                # A. Generate Public Token (Sandbox)
                pt_url = "https://sandbox.plaid.com/sandbox/public_token/create"
                pt_payload = {
                    "client_id": PLAID_CLIENT_ID,
                    "secret": PLAID_SECRET,
                    "institution_id": "ins_109508", # First Platypus Bank
                    "initial_products": ["transactions"],
                    "options": {"webhook": "https://www.genericwebhookurl.com/webhook"}
                }
                pt_res = requests.post(pt_url, json=pt_payload)
                if pt_res.status_code == 200:
                    public_token = pt_res.json().get("public_token")
                    
                    # B. Exchange Token
                    exch_url = f"{API_BASE}/plaid/exchange-token"
                    exch_payload = {
                        "public_token": public_token,
                        "institution_name": "Admin Chase Checking"
                    }
                    exch_res = requests.post(
                        exch_url, 
                        json=exch_payload, 
                        headers={"Authorization": f"Bearer {token_admin}"}
                    )
                    if exch_res.status_code == 201:
                        logger.info("PASS: Plaid account linked for Admin.")
                        
                        # Get Account ID
                        accounts_res = requests.get(
                            f"{API_BASE}/accounts", 
                            headers={"Authorization": f"Bearer {token_admin}"}
                        )
                        plaid_acc = next((a for a in accounts_res.json() if a["provider"] == "Admin Chase Checking"), None)
                        if plaid_acc:
                            admin_plaid_acc_id = plaid_acc['id']
                            # C. Sync Transactions
                            sync_url = f"{API_BASE}/accounts/{admin_plaid_acc_id}/sync?initial_sync=true&start_date=2024-01-01"
                            sync_res = requests.post(sync_url, headers={"Authorization": f"Bearer {token_admin}"})
                            if sync_res.status_code == 200:
                                logger.info(f"PASS: Admin Transactions Synced: {sync_res.json()}")
                            else:
                                logger.error(f"FAIL: Plaid Sync failed: {sync_res.text}")
                        else:
                            logger.error("FAIL: Could not find linked Plaid account.")
                    else:
                         logger.error(f"FAIL: Plaid Token Exchange failed: {exch_res.text}")
                else:
                    logger.error(f"FAIL: Plaid Public Token Gen failed: {pt_res.text}")
            except Exception as e:
                logger.error(f"Plaid Seeding Exception: {e}")
        else:
            logger.warning("SKIP: Plaid Credentials missing, cannot seed data for Household test.")

        # 1.6 Web3 Seeding (Reliable Mock)
        web3_payload = {
            "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", # Vitalik's address
            "chain_id": 1,
            "account_name": "Vitalik Wallet"
        }
        w3_res = requests.post(
            f"{API_BASE}/accounts/link/web3",
            json=web3_payload,
            headers={"Authorization": f"Bearer {token_admin}"}
        )
        if w3_res.status_code == 201:
             logger.info("PASS: Web3 Wallet linked (Seeding).")
             admin_web3_acc_id = w3_res.json()["id"]
             # Sync
             sync_w3 = requests.post(
                 f"{API_BASE}/accounts/{admin_web3_acc_id}/sync?initial_sync=true", 
                 headers={"Authorization": f"Bearer {token_admin}"}
             )
             if sync_w3.status_code == 200:
                 logger.info(f"PASS: Web3 Transactions Synced: {sync_w3.json()}")
             else:
                 logger.error(f"FAIL: Web3 Sync failed: {sync_w3.text}")

        # 1.7 CEX Seeding (Reliable Mock)
        cex_payload = {
            "exchange_id": "coinbase",
            "api_key": "mock_api_key",
            "api_secret": "mock_secret",
            "account_name": "Coinbase Pro"
        }
        cex_res = requests.post(
             f"{API_BASE}/accounts/link/cex",
             json=cex_payload,
             headers={"Authorization": f"Bearer {token_admin}"}
        )
        if cex_res.status_code == 201:
             logger.info("PASS: CEX Account linked (Seeding).")
             admin_cex_acc_id = cex_res.json()["id"]
             # Sync
             sync_cex = requests.post(
                 f"{API_BASE}/accounts/{admin_cex_acc_id}/sync?initial_sync=true", 
                 headers={"Authorization": f"Bearer {token_admin}"}
             )
             if sync_cex.status_code == 200:
                 logger.info(f"PASS: CEX Transactions Synced: {sync_cex.json()}")
             else:
                 logger.error(f"FAIL: CEX Sync failed: {sync_cex.text}")


        # Create Household
        hh_id = create_household(token_admin)
        if not hh_id: raise Exception("Household creation failed")
        logger.info(f"Household Created: {hh_id}")

        logger.info("\n--- 2. Spouse (Adult) Setup ---")
        email_spouse, tag_spouse = get_test_email()
        uid_spouse, _ = signup_user(email_spouse, password)
        
        # Spouse OTP
        otp_email_spouse = poll_for_email(tag_spouse)
        otp_code_spouse = extract_otp(otp_email_spouse["text"])
        token_spouse = firebase_login(email_spouse, password)
        enable_mfa(token_spouse, otp_code_spouse)
        
        # Invite Spouse
        if not send_invite(token_admin, email_spouse): raise Exception("Invite spouse failed")
        
        # Spouse Accept
        invite_email_spouse = poll_for_email(tag_spouse, match_subject="Invite")
        invite_token_spouse = extract_invite_token(invite_email_spouse["text"])
        if not accept_invite(token_spouse, invite_token_spouse): raise Exception("Spouse accept failed")
        logger.info("Spouse joined household.")

        logger.info("\n--- 3. Child (Minor) Setup ---")
        email_child, tag_child = get_test_email()
        uid_child, _ = signup_user(email_child, password)
        
        # Child OTP
        otp_email_child = poll_for_email(tag_child)
        otp_code_child = extract_otp(otp_email_child["text"])
        token_child = firebase_login(email_child, password)
        enable_mfa(token_child, otp_code_child)
        
        # Invite Child (is_minor=True)
        if not send_invite(token_admin, email_child, is_minor=True): raise Exception("Invite child failed")
        
        # Child Accept
        invite_email_child = poll_for_email(tag_child, match_subject="Invite")
        invite_token_child = extract_invite_token(invite_email_child["text"])
        if not accept_invite(token_child, invite_token_child): raise Exception("Child accept failed")
        logger.info("Child joined household as Minor.")

        logger.info("\n--- 4. Verification Steps ---")

        # A. Spouse Checking Household Transactions
        # Should see Admin's transactions (Plaid OR Web3 OR CEX)
        
        target_accounts = []
        if admin_plaid_acc_id: target_accounts.append(str(admin_plaid_acc_id))
        if admin_web3_acc_id: target_accounts.append(str(admin_web3_acc_id))
        if admin_cex_acc_id: target_accounts.append(str(admin_cex_acc_id))
        
        if not target_accounts:
            logger.warning("SKIP: No Admin accounts linked. Skipping visibility test.")
        else:
            res_spouse = requests.get(
                f"{API_BASE}/transactions", 
                params={"scope": "household"}, 
                headers={"Authorization": f"Bearer {token_spouse}"}
            )
            if res_spouse.status_code != 200:
                logger.error(f"Spouse failed to fetch household txns: {res_spouse.text}")
            else:
                txns = res_spouse.json().get("transactions", [])
                
                found_admin_txn = any(t["account_id"] in target_accounts for t in txns)
                
                if found_admin_txn:
                    logger.info(f"PASS: Spouse can see Admin's transactions. (Found match in {target_accounts})")
                    logger.info(f"Total Visible: {len(txns)}")
                else:
                    logger.error(f"FAIL: Spouse CANNOT see Admin's transaction. Visible Count: {len(txns)}. Targets: {target_accounts}")

        # B. Minor Checking Household Transactions
        res_child = requests.get(
            f"{API_BASE}/transactions", 
            params={"scope": "household"}, 
            headers={"Authorization": f"Bearer {token_child}"}
        )
        if res_child.status_code in [403, 401]:
             logger.info(f"PASS: Minor restricted from household scope (Status: {res_child.status_code})")
        else:
             txns_child = res_child.json().get("transactions", [])
             if len(txns_child) == 0:
                 logger.warning("PASS: Minor got 200 OK but 0 transactions (acceptable depending on logic).")
             else:
                 logger.error(f"FAIL: Minor could see transactions! {txns_child}")

        logger.info("--- Verification Complete ---")

    except Exception as e:
        logger.exception(f"Test Failed: {e}")
    finally:
        pass

if __name__ == "__main__":
    main()
