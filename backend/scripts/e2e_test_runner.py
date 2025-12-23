
import os
import sys

import requests

# Ensure backend module is in path for DB access
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from backend.models import Household, HouseholdInvite, HouseholdMember  # noqa: E402
from backend.utils.database import SessionLocal  # noqa: E402

BASE_URL = "http://localhost:8000/api"

OWNER_UID = "e2e_owner"
MEMBER_UID = "e2e_member"
MINOR_UID = "e2e_minor"

HEADER_OWNER = {"Authorization": f"Bearer E2E_MAGIC_TOKEN_{OWNER_UID}"}
HEADER_MEMBER = {"Authorization": f"Bearer E2E_MAGIC_TOKEN_{MEMBER_UID}"}
HEADER_MINOR = {"Authorization": f"Bearer E2E_MAGIC_TOKEN_{MINOR_UID}"}

def get_invite_token(email):
    db = SessionLocal()
    try:
        invite = db.query(HouseholdInvite).filter(
            HouseholdInvite.email == email,
            HouseholdInvite.status == "pending"
        ).order_by(HouseholdInvite.created_at.desc()).first()
        if invite:
            return invite.token
        return None
    finally:
        db.close()

def clean_slate():
    """Initial cleanup of test users via DB to ensure no API restrictions block us."""
    print("\n[Step 1] Cleaning slate (DB Direct)...")
    db = SessionLocal()
    try:
        # Delete invites
        db.query(HouseholdInvite).filter(
            HouseholdInvite.email.in_(["e2e_member@example.com", "e2e_minor@example.com"])
        ).delete(synchronize_session=False)

        # Delete members for our tokens
        # Note: We can't easily map token to UID without checking auth, but we know our static UIDs
        # OWNER_UID, MEMBER_UID, MINOR_UID are constants
        db.query(HouseholdMember).filter(
            HouseholdMember.uid.in_([OWNER_UID, MEMBER_UID, MINOR_UID])
        ).delete(synchronize_session=False)

        # Delete households owned by e2e_owner
        db.query(Household).filter(
            Household.owner_uid == OWNER_UID
        ).delete(synchronize_session=False)

        db.commit()
    except Exception as e:
        print(f"Cleanup failed (non-critical): {e}")
        db.rollback()
    finally:
        db.close()

def steps_create_household():
    """Owner creates a household."""
    print("\n[Step 2] Owner creating household...")
    res = requests.post(
        f"{BASE_URL}/households/",
        json={"name": "E2E Family"},
        headers=HEADER_OWNER
    )
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    hh_data = res.json()
    print(f"SUCCESS: Created household {hh_data['id']}")
    return True

def steps_invite_and_join_member():
    """Invite a regular member and have them join."""
    # 3. Invite Member
    print("\n[Step 3] Inviting Member...")
    res = requests.post(
        f"{BASE_URL}/households/invites",
        json={"email": "e2e_member@example.com", "is_minor": False},
        headers=HEADER_OWNER
    )
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    print("SUCCESS: Invite sent.")

    # 4. Get Token from DB
    print("\n[Step 4] Fetching token for Member...")
    token = get_invite_token("e2e_member@example.com")
    if not token:
        print("FAILED: Token not found in DB")
        return False
    print(f"SUCCESS: Got token {token}")

    # 5. Member Joins
    print("\n[Step 5] Member accepting invite...")
    res = requests.post(
        f"{BASE_URL}/households/invites/accept",
        json={"token": token},
        headers=HEADER_MEMBER
    )
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    print("SUCCESS: Member joined.")
    return True

def steps_verify_and_leave_member():
    """Verify checks member view and then leaves."""
    # 6. Verify Member View
    print("\n[Step 6] Verifying Member view...")
    res = requests.get(f"{BASE_URL}/households/me", headers=HEADER_MEMBER)
    data = res.json()
    members = [m['email'] for m in data['members']]
    if "e2e_member@example.com" in members and "e2e_owner@example.com" in members:
        print("SUCCESS: Member sees all members.")
    else:
        print(f"FAILED: Member list incorrect: {members}")

    # 7. Member Leaves
    print("\n[Step 7] Member leaving...")
    res = requests.delete(f"{BASE_URL}/households/members/me", headers=HEADER_MEMBER)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    print("SUCCESS: Member left.")
    return True

def steps_invite_and_join_minor():
    """Invite a minor and have them join."""
    # 8. Invite Minor
    print("\n[Step 8] Inviting Minor...")
    res = requests.post(
        f"{BASE_URL}/households/invites",
        json={"email": "e2e_minor@example.com", "is_minor": True},
        headers=HEADER_OWNER
    )
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    print("SUCCESS: Minor invite sent.")

    # 9. Get Token Minor
    print("\n[Step 9] Fetching token for Minor...")
    token_minor = get_invite_token("e2e_minor@example.com")
    if not token_minor:
        print("FAILED: Token not found")
        return False
    print(f"SUCCESS: Got token {token_minor}")

    # 10. Minor Joins
    print("\n[Step 10] Minor accepting invite...")
    res = requests.post(
        f"{BASE_URL}/households/invites/accept",
        json={"token": token_minor},
        headers=HEADER_MINOR
    )
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return False
    print("SUCCESS: Minor joined.")
    return True

def steps_verify_minor():
    """Verify minor specific restrictions."""
    # 11. Verify Minor Restrictions (AI Access)
    print("\n[Step 11] Verifying Minor status...")
    res = requests.get(f"{BASE_URL}/households/me", headers=HEADER_MINOR)
    data = res.json()
    minor_entry = next(m for m in data['members'] if m['email'] == "e2e_minor@example.com")
    if minor_entry['ai_access_enabled'] is False:
        print("SUCCESS: Minor AI access is disabled (Correct).")
    else:
        print("FAILED: Minor AI access is enabled (Incorrect).")

def run_e2e():
    print("--- Starting E2E Household Test ---")

    clean_slate()


    if not steps_create_household():
        return
    if not steps_invite_and_join_member():
        return
    if not steps_verify_and_leave_member():
        return
    if not steps_invite_and_join_minor():
        return
    steps_verify_minor()

    print("\n--- E2E Test Completed Successfully ---")

if __name__ == "__main__":
    run_e2e()
