import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.models import HouseholdMember
from backend.services.household_service import get_household_member_uids
from backend.utils import get_db


def check_state():
    db = next(get_db())
    try:
        owner_uid = "e2e_owner"
        member_uid = "e2e_member"

        print(f"Checking state for owner: {owner_uid}")

        # Check Household Member entries
        owner_mem = db.query(HouseholdMember).filter(HouseholdMember.uid == owner_uid).first()
        if owner_mem:
            print(f"Owner is in household {owner_mem.household_id} with role {owner_mem.role}")
        else:
            print("Owner is NOT in any household DB record!")

        target_mem = db.query(HouseholdMember).filter(HouseholdMember.uid == member_uid).first()
        if target_mem:
             print(f"Target Member is in household {target_mem.household_id}")
        else:
             print("Target Member is NOT in any household DB record!")

        # Check Service Function
        allowed = get_household_member_uids(db, owner_uid)
        print(f"get_household_member_uids returns: {allowed}")

        if member_uid in allowed:
            print("SUCCESS: Target is in allowed list.")
        else:
            print("FAILURE: Target is NOT in allowed list.")

    finally:
        db.close()

if __name__ == "__main__":
    check_state()
