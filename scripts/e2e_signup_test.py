import requests
import time
import uuid
import sys
import os

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8001/api")
FIREBASE_AUTH_HOST = os.getenv("FIREBASE_AUTH_HOST", "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts")
API_KEY = os.getenv("VITE_FIREBASE_API_KEY", "demo-api-key")
TESTMAIL_NS = os.getenv("TESTMAIL_NAMESPACE", "s72ew")
TESTMAIL_KEY = os.getenv("TESTMAIL_API_KEY")

if not TESTMAIL_KEY:
    print("TESTMAIL_API_KEY not set. Please set it in .env or environment.")
    sys.exit(1)

def print_step(msg):
    print(f"\n[STEP] {msg}")

def get_test_email():
    tag = f"e2e_{int(time.time())}"
    return f"{TESTMAIL_NS}.{tag}@inbox.testmail.app", tag

def get_id_token(email, password):
    url = f"{FIREBASE_AUTH_HOST}:signInWithPassword?key={API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    res = requests.post(url, json=payload)
    if res.status_code != 200:
        print(f"Failed to get token: {res.text}")
        sys.exit(1)
    return res.json()["idToken"]

def fetch_email_otp(tag):
    print(f"Waiting for email to {TESTMAIL_NS}.{tag}...")
    # Poll Testmail
    url = f"https://api.testmail.app/api/json?apikey={TESTMAIL_KEY}&namespace={TESTMAIL_NS}&tag={tag}&livequery=true"
    
    # We'll retry a few times
    for i in range(12): # 60 seconds
        res = requests.get(url)
        if res.status_code == 200:
            data = res.json()
            emails = data.get("emails", [])
            if emails:
                # Find the one with "Verification Code" subject
                for email in emails:
                    if "Verification Code" in email["subject"]:
                        print("Email received!")
                        # Extract code (lazy check: look for 6 digit number)
                        import re
                        match = re.search(r'\b\d{6}\b', email["text"])
                        if match:
                            return match.group(0)
                        
        time.sleep(5)
        print(".", end="", flush=True)
    
    print("\nTimeout waiting for email.")
    return None

def main():
    email, tag = get_test_email()
    password = "Password123!"
    
    print_step(f"Starting E2E Test with user: {email}")
    
    # 1. Signup
    print_step("Signing up...")
    res = requests.post(f"{API_BASE}/auth/signup", json={"email": email, "password": password})
    if res.status_code != 201:
        print(f"Signup failed: {res.text}")
        sys.exit(1)
    print("Signup successful.")
    
    # 2. Login to get token / Initial Profile Check
    print_step("Logging in...")
    token = get_id_token(email, password)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check Profile Status
    res = requests.post(f"{API_BASE}/auth/login", json={"token": token}, headers=headers) # Using POST /login to get profile
    profile = res.json()["user"]
    print(f"DEBUG Profile: {profile}")
    print(f"Initial Status: {profile.get('status')} (Expected: pending_verification)")
    if profile.get('status') != 'pending_verification':
         print("FAIL: Status mismatch.")
         sys.exit(1)

    # 3. Request OTP
    print_step("Requesting Verification Code...")
    res = requests.post(f"{API_BASE}/auth/mfa/email/request-code", json={"email": email}, headers=headers)
    if res.status_code != 200:
        print(f"Request code failed: {res.text}")
        sys.exit(1)
        
    # 4. Receive Email
    print_step("Checking inbox...")
    otp = fetch_email_otp(tag)
    if not otp:
        print("FAIL: Could not retrieve OTP.")
        sys.exit(1)
    print(f"Received OTP: {otp}")
    
    # 5. Verify OTP
    print_step("Verifying OTP...")
    res = requests.post(f"{API_BASE}/auth/mfa/email/enable", json={"code": otp}, headers=headers)
    if res.status_code != 200:
        print(f"Verification failed: {res.text}")
        sys.exit(1)
    print("Verification successful.")
    
    # Check Status Updated
    res = requests.get(f"{API_BASE}/auth/profile", headers=headers)
    profile = res.json()["user"]
    print(f"Post-Verify Status: {profile.get('status')} (Expected: pending_plan_selection)")
    if profile.get('status') != 'pending_plan_selection':
         print("FAIL: Status mismatch.")
         sys.exit(1)

    # 6. Select Free Plan
    print_step("Selecting Free Plan...")
    res = requests.post(f"{API_BASE}/billing/plans/free", headers=headers)
    if res.status_code != 200:
        print(f"Plan selection failed: {res.text}")
        sys.exit(1)
    print("Plan selected.")
    
    # 7. Check Final Status
    res = requests.get(f"{API_BASE}/auth/profile", headers=headers)
    profile = res.json()["user"]
    print(f"Final Status: {profile.get('status')} (Expected: active)")
    if profile.get('status') != 'active':
         print("FAIL: Status mismatch.")
         sys.exit(1)
         
    print_step("SUCCESS: Full Flow Verified!")

if __name__ == "__main__":
    main()
