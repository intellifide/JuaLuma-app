import sys

import requests

# Updated 2025-12-11 01:24 CST by ChatGPT - remove unused variable
# Configuration
API_BASE = "http://localhost:8001"
LINK_TOKEN_PATH = "/api/plaid/link-token"
EXCHANGE_TOKEN_PATH = "/api/plaid/exchange-token"
# You need a valid Firebase ID token here.
# For manual testing, log in to the frontend, inspect network requests, and copy the Bearer token.
# Or use a script to generate one if you have service account creds (complex for simple script).
# We will prompt for it or take it as arg.


def run_verify(token):
    # Updated 2025-12-10 23:05 CST by ChatGPT - clean up instrumentation
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("1. Creating Link Token...")
    resp = requests.post(f"{API_BASE}{LINK_TOKEN_PATH}", headers=headers)
    if resp.status_code != 200:
        print(f"FAILED: {resp.text}")
        return
    link_token = resp.json().get("link_token")
    print(f"   Success! Link Token: {link_token}")

    # In a real manual test, you'd use this token in the frontend to get a public_token.
    # Since we are scripting, we can't easily generate a public_token without the Plaid Link UI or a sandbox endpoint that supports it (Plaid sandbox API has /sandbox/public_token/create).
    # IF the backend exposed a way to call Plaid /sandbox/public_token/create we could automate it fully.
    # But usually backend doesn't expose that.

    print("\n[MANUAL STEP REQUIRED]")
    print("Use the Link Token in the frontend to connect a Sandbox account.")
    print(
        "Or, if you have a valid 'public_token' from a previous sandbox link, enter it below."
    )
    print("NOTE: Public tokens expire quickly (30m).")

    public_token = input("Enter public_token (or 'skip' to stop): ").strip()
    if public_token.lower() == "skip":
        return

    institution_name = (
        input("Enter institution name (default 'Sandbox'): ").strip() or "Sandbox"
    )

    print(f"\n2. Exchanging Public Token for {public_token}...")
    resp = requests.post(
        f"{API_BASE}{EXCHANGE_TOKEN_PATH}",
        headers=headers,
        json={"public_token": public_token, "institution_name": institution_name},
    )

    if resp.status_code not in (200, 201):
        print(f"FAILED: {resp.text}")
        return

    print("   Success! Account linked.")
    # Presumably returns account or item ID?
    # Let's list accounts to find the new one

    print("\n3. Fetching Accounts...")
    resp = requests.get(f"{API_BASE}/api/accounts", headers=headers)
    if resp.status_code != 200:
        print(f"FAILED: {resp.text}")
        return

    accounts = resp.json()
    print(f"   Found {len(accounts)} accounts.")
    if not accounts:
        print("   No accounts found to sync.")
        return

    account_id = accounts[0]["id"]
    print(f"   Testing Sync on Account ID: {account_id}")

    print(f"\n4. Syncing Transactions for {account_id}...")
    resp = requests.post(f"{API_BASE}/api/accounts/{account_id}/sync", headers=headers)
    if resp.status_code != 200:
        # It might be 202 Accepted?
        if resp.status_code == 202:
            print("   Sync started (Async).")
        else:
            print(f"FAILED: {resp.text}")
            return
    else:
        print("   Sync triggered successfully.")

    print("\nVerification Sequence Complete.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_plaid.py <firebase_id_token>")
        sys.exit(1)

    run_verify(sys.argv[1])
