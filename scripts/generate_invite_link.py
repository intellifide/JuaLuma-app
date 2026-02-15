
import os

import requests

# Configuration
API_BASE_URL = "http://localhost:8001/api"
IDENTITY_PLATFORM_AUTH_URL = "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key"
TESTMAIL_NAMESPACE = "l2zpw"
INVITER_EMAIL = f"{TESTMAIL_NAMESPACE}.frontend-setup@inbox.testmail.app"
PASSWORD = "password123"

def get_id_token(email, password):
    resp = requests.post(IDENTITY_PLATFORM_AUTH_URL, json={
        "email": email,
        "password": password,
        "returnSecureToken": True
    })
    if resp.status_code == 200:
        return resp.json()["idToken"]
    return None

def ensure_inviter_exists(email, password):
    token = get_id_token(email, password)
    if not token:
        print("Inviter does not exist, creating...")
        signup_url = "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key"
        requests.post(signup_url, json={"email": email, "password": password})
        token = get_id_token(email, password)
    return token

def ensure_backend_user(email, password, token):
    headers = {"Authorization": f"Bearer {token}"}
    signup_resp = requests.post(f"{API_BASE_URL}/auth/signup", json={"email": email, "password": password}, headers=headers)
    if signup_resp.status_code == 201:
        print("Backend user created/synced.")
    elif signup_resp.status_code == 400 and "already exists" in signup_resp.text:
         print("Backend user already exists.")
    else:
        print(f"Signup/Sync attempt: {signup_resp.status_code} {signup_resp.text}")

def create_household_if_needed(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.post(f"{API_BASE_URL}/households/", json={"name": "Frontend Test Family"}, headers=headers)
        if resp.status_code == 200:
            print("Household created.")
        else:
            print(f"Household creation skipped/failed: {resp.status_code} (User might already have one)")
    except Exception as e:
        print(f"Error creating household: {e}")

def get_testmail_credentials():
    testmail_key = None
    testmail_ns = None
    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                if line.startswith("TESTMAIL_API_KEY="):
                    testmail_key = line.strip().split("=")[1].strip('"')
                if line.startswith("TESTMAIL_NAMESPACE="):
                    testmail_ns = line.strip().split("=")[1].strip('"')
    return testmail_key, testmail_ns

def poll_testmail_for_token(testmail_key, testmail_ns, invitee_tag):
    import time
    found_token = None
    for _ in range(15):
        time.sleep(2)
        try:
            tm_resp = requests.get(f"https://api.testmail.app/api/json?apikey={testmail_key}&namespace={testmail_ns}&tag={invitee_tag}&pretty=true")
            if tm_resp.status_code == 200:
                data = tm_resp.json()
                if data.get("emails"):
                    email_body = data["emails"][0].get("text") or data["emails"][0].get("html")
                    if "token=" in email_body:
                        split_token = email_body.split("token=")[1]
                        found_token = split_token.split()[0].split('"')[0].split("'")[0]
                        return found_token
        except Exception as e:
            print(f"Error polling testmail: {e}")
    return None

def main():
    token = ensure_inviter_exists(INVITER_EMAIL, PASSWORD)
    if not token:
        print("Failed to ensure inviter exists.")
        return

    ensure_backend_user(INVITER_EMAIL, PASSWORD, token)
    create_household_if_needed(token)

    testmail_key, testmail_ns = get_testmail_credentials()
    if not testmail_key or not testmail_ns:
        print("ERROR: TESTMAIL_API_KEY or TESTMAIL_NAMESPACE not found in .env")
        return

    import time
    invitee_tag = f"frontend-manual-{int(time.time())}"
    invitee_email = f"{testmail_ns}.{invitee_tag}@inbox.testmail.app"

    print(f"Inviting {invitee_email}...")
    headers = {"Authorization": f"Bearer {token}"}
    invite_resp = requests.post(f"{API_BASE_URL}/households/invites", json={"email": invitee_email}, headers=headers)
    if invite_resp.status_code == 200:
        print("Invite sent. Polling Testmail for token...")
        found_token = poll_testmail_for_token(testmail_key, testmail_ns, invitee_tag)
        if found_token:
            print("\nSUCCESS: Generated Invite Link:")
            print(f"http://localhost:5175/household/accept-invite?token={found_token}")
            print(f"Invitee Email: {invitee_email}")
        else:
            print("Failed to retrieve token from email.")
    else:
        print(f"Failed to create invite: {invite_resp.text}")

if __name__ == "__main__":
    main()
