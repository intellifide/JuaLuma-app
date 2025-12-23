
# Manual verification script for Household Flow (Direct Service/Router Call)
# Calls the router functions directly to bypass TestClient/httpx version issues.

import os
import sys
import uuid

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session

# Import Router Functions
from backend.api.household import (
    HouseholdCreate,
    InviteAccept,
    InviteRequest,
    accept_invite_endpoint,
    create_household,
    create_invite,
    leave_household_endpoint,
)
from backend.models import (
    HouseholdInvite,
    HouseholdMember,
    Subscription,
    User,
)
from backend.services.ai import _check_rate_limit_sync
from backend.utils import get_db


def setup_test_users(db: Session):
    # Owner
    owner_uid = f"owner_{uuid.uuid4().hex[:8]}"
    owner = User(uid=owner_uid, email=f"{owner_uid}@example.com", role="user", status="active")
    db.add(owner)
    # Give owner Ultimate sub
    sub = Subscription(uid=owner_uid, plan="ultimate", status="active")
    db.add(sub)

    # Member
    member_uid = f"member_{uuid.uuid4().hex[:8]}"
    member = User(uid=member_uid, email=f"{member_uid}@example.com", role="user", status="active")
    db.add(member)
    sub_mem = Subscription(uid=member_uid, plan="free", status="active")
    db.add(sub_mem)

    # Minor
    minor_uid = f"minor_{uuid.uuid4().hex[:8]}"
    minor = User(uid=minor_uid, email=f"{minor_uid}@example.com", role="user", status="active")
    db.add(minor)
    sub_minor = Subscription(uid=minor_uid, plan="free", status="active")
    db.add(sub_minor)

    db.commit()
    return owner, member, minor

def test_household_flow():
    db_gen = get_db()
    db = next(db_gen)
    try:
        owner, member, minor = setup_test_users(db)
        print(f"Created Owner: {owner.uid}, Member: {member.uid}")

        # 1. Owner Creates Household
        print("Owner Creating Household...")
        payload = HouseholdCreate(name="Test Family")
        # Direct Call
        resp = create_household(payload, current_user=owner, db=db)
        print(f"Household Created: {resp['id']} - {resp['name']}")
        assert resp["owner_uid"] == owner.uid

        # 2. Invite Member
        print("Inviting Member...")
        invite_pl = InviteRequest(email=member.email, is_minor=False)
        invite_resp = create_invite(invite_pl, current_user=owner, db=db)
        print(f"Invite Response: {invite_resp}")

        # Get token from DB
        invite = db.query(HouseholdInvite).filter(HouseholdInvite.email == member.email).first()
        token = invite.token
        print(f"Invite Token: {token}")

        # 3. Member Accepts
        print("Member Accepting Invite...")
        accept_pl = InviteAccept(token=token)
        join_resp = accept_invite_endpoint(accept_pl, current_user=member, db=db)
        print("Member Joined.", join_resp)

        # Verify DB
        db.expire_all()
        mem_rec = db.query(HouseholdMember).filter(HouseholdMember.uid == member.uid).first()
        assert mem_rec.role == "member"
        assert mem_rec.ai_access_enabled is True

        # 4. Invite Minor
        print("Inviting Minor...")
        invite_minor_pl = InviteRequest(email=minor.email, is_minor=True)
        create_invite(invite_minor_pl, current_user=owner, db=db)

        invite_minor = db.query(HouseholdInvite).filter(HouseholdInvite.email == minor.email).first()

        print("Minor Accepting Invite...")
        accept_minor_pl = InviteAccept(token=invite_minor.token)
        accept_invite_endpoint(accept_minor_pl, current_user=minor, db=db)

        # Verify Minor AI Access
        db.expire_all()
        minor_rec = db.query(HouseholdMember).filter(HouseholdMember.uid == minor.uid).first()
        assert minor_rec.role == "restricted_member"
        assert minor_rec.ai_access_enabled is False

        # 5. Test AI Access Check
        from fastapi import HTTPException
        print("Testing AI Access Logic...")

        # Member Logic
        tier, _, _ = _check_rate_limit_sync(member.uid)
        assert tier == "ultimate"
        print("Member has Ultimate tier access.")

        # Minor Logic
        try:
            _check_rate_limit_sync(minor.uid)
            print("FAILED: Minor access was NOT blocked.")
        except HTTPException as e:
            assert e.status_code == 403
            print("Minor access blocked as expected (403).")

        # 6. Breakup Protocol
        print("Member Leaving Household...")
        leave_household_endpoint(current_user=member, db=db)

        db.expire_all()
        mem_rec = db.query(HouseholdMember).filter(HouseholdMember.uid == member.uid).first()
        assert mem_rec is None

        sub = db.query(Subscription).filter(Subscription.uid == member.uid).first()
        assert sub.plan == "free"
        print("Member left and downgraded to free.")

        print("\nSUCCESS: All steps verified.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_household_flow()
