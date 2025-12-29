
import requests
import json
import os

# Configuration
API_BASE_URL = "http://localhost:8001/api"
FIREBASE_AUTH_URL = "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key"
TESTMAIL_NAMESPACE = "l2zpw" 
INVITER_EMAIL = f"{TESTMAIL_NAMESPACE}.frontend-setup@inbox.testmail.app"
PASSWORD = "password123"

def get_id_token(email, password):
    resp = requests.post(FIREBASE_AUTH_URL, json={
        "email": email,
        "password": password,
        "returnSecureToken": True
    })
    if resp.status_code == 200:
        return resp.json()["idToken"]
    return None

def main():
    # 1. Ensure Inviter Exists (Attempt Login or Create)
    token = get_id_token(INVITER_EMAIL, PASSWORD)
    if not token:
        print("Inviter does not exist, creating...")
        # Create via backend (if exposed) or Firebase... 
        # Actually easier to just use the e2e script's logic or just rely on the fact that I likely have one.
        # Let's just create a new one via Firebase directly to be sure.
        signup_url = "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key"
        requests.post(signup_url, json={"email": INVITER_EMAIL, "password": PASSWORD})
        token = get_id_token(INVITER_EMAIL, PASSWORD)
    
    headers = {"Authorization": f"Bearer {token}"}

    # 1.5 Ensure User Exists in Backend (Call Signup)
    # Even if Firebase user exists, backend might not have the record.
    signup_resp = requests.post(f"{API_BASE_URL}/auth/signup", json={"email": INVITER_EMAIL, "password": PASSWORD}, headers=headers)
    if signup_resp.status_code == 201:
        print("Backend user created/synced.")
    elif signup_resp.status_code == 400 and "already exists" in signup_resp.text:
         print("Backend user already exists.")
    else:
        print(f"Signup/Sync attempt: {signup_resp.status_code} {signup_resp.text}")

    # 2. Create Household (if needed) - Try to get first
    # For simplicity, just create a new one. If user already has one, it might fail, so we catch.
    try:
        resp = requests.post(f"{API_BASE_URL}/households/", json={"name": "Frontend Test Family"}, headers=headers)
        if resp.status_code == 200:
            print("Household created.")
        else:
            print(f"Household creation skipped/failed: {resp.status_code} (User might already have one)")
    except Exception as e:
        print(f"Error creating household: {e}")


    # Read/Parse .env for Testmail Credentials
    testmail_key = None
    testmail_ns = None
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("TESTMAIL_API_KEY="):
                    testmail_key = line.strip().split("=")[1].strip('"')
                if line.startswith("TESTMAIL_NAMESPACE="):
                    testmail_ns = line.strip().split("=")[1].strip('"')
    
    if not testmail_key or not testmail_ns:
        print("ERROR: TESTMAIL_API_KEY or TESTMAIL_NAMESPACE not found in .env")
        return

    # Use a Testmail address for the invitee
    import time
    timestamp = int(time.time())
    invitee_tag = f"frontend-manual-{timestamp}"
    invitee_email = f"{testmail_ns}.{invitee_tag}@inbox.testmail.app"

    # 3. Create Invite
    print(f"Inviting {invitee_email}...")
    invite_resp = requests.post(f"{API_BASE_URL}/households/invites", json={"email": invitee_email}, headers=headers)
    if invite_resp.status_code == 200:
        print("Invite sent. Polling Testmail for token...")
        
        # Poll Testmail
        found_token = None
        for _ in range(15):
            time.sleep(2)
            try:
                tm_resp = requests.get(f"https://api.testmail.app/api/json?apikey={testmail_key}&namespace={testmail_ns}&tag={invitee_tag}&pretty=true")
                if tm_resp.status_code == 200:
                    data = tm_resp.json()
                    if data.get("emails"):
                        # Extract token from text body
                        email_body = data["emails"][0].get("text") or data["emails"][0].get("html")
                        # Look for link: .../accept-invite?token=...
                        if "token=" in email_body:
                            split_token = email_body.split("token=")[1]
                            # Clean it up (take until whitespace or quote)
                            found_token = split_token.split()[0].split('"')[0].split("'")[0]
                            break
            except Exception as e:
                print(f"Error polling testmail: {e}")

        if found_token:
            print(f"\nSUCCESS: Generated Invite Link:")
            print(f"http://localhost:5175/household/accept-invite?token={found_token}")
            print(f"Invitee Email: {invitee_email}")
        else:
            print("Failed to retrieve token from email.")

    else:
        print(f"Failed to create invite: {invite_resp.text}")

if __name__ == "__main__":
    main()
