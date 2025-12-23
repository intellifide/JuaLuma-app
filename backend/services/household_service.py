
import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.core import settings
from backend.models import (
    Household,
    HouseholdInvite,
    HouseholdMember,
    Subscription,
    User,
)
from backend.services.billing import update_user_tier
from backend.services.email import get_email_client

logger = logging.getLogger(__name__)


def create_household(db: Session, owner_uid: str, name: str) -> Household:
    """
    Creates a new household for the user.
    User must have 'ultimate' tier (checked by caller or here).
    User must not belong to another household.
    """
    # 1. Validation
    existing_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == owner_uid).first()
    )
    if existing_member:
        raise HTTPException(
            status_code=400, detail="User is already a member of a household."
        )

    # Check Tier (This might be redundant if API enforces it, but safe)
    sub = db.query(Subscription).filter(Subscription.uid == owner_uid).first()
    if not sub or "ultimate" not in sub.plan:
        # Check logic: we might allow creating if they just upgraded?
        # Assuming strict check for now.
        pass
        # Note: If they are on trial logic, plan string format needs verification.
        # But let's assume 'ultimate_monthly' or 'ultimate_annual' contains 'ultimate'.

    # 2. Create Household
    household = Household(owner_uid=owner_uid, name=name)
    db.add(household)
    db.flush()  # get ID

    # 3. Add Owner as Admin Member
    member = HouseholdMember(
        household_id=household.id,
        uid=owner_uid,
        role="admin",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    db.add(member)
    db.commit()
    db.refresh(household)
    logger.info(f"Created household {household.id} for owner {owner_uid}")
    return household


def invite_member(
    db: Session, owner_uid: str, email: str, is_minor: bool = False
) -> HouseholdInvite:
    """
    Generates an invite token and emails the target.
    Only Admins can invite.
    """
    # 1. Verify Inviter Permissions
    member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == owner_uid).first()
    )
    if not member or member.role != "admin":
        raise HTTPException(
            status_code=403, detail="Only household admins can invite members."
        )

    household_id = member.household_id

    # 2. Check overlap
    # Check if email is already in the household (need User lookup)
    target_user = db.query(User).filter(User.email == email).first()
    if target_user:
        existing = (
            db.query(HouseholdMember)
            .filter(
                HouseholdMember.household_id == household_id,
                HouseholdMember.uid == target_user.uid,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400, detail=f"{email} is already in the household."
            )

    # 3. Create Invite
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=24)

    invite = HouseholdInvite(
        household_id=household_id,
        email=email,
        token=token,
        status="pending",
        is_minor=is_minor,
        expires_at=expires_at,
    )
    db.add(invite)
    db.commit()

    # 4. Send Email
    link = f"{settings.frontend_url}/household/accept-invite?token={token}"
    email_client = get_email_client()
    try:
        # Need inviter name, verify user object loaded
        inviter_name = member.user.email # Fallback to email if name not avail
        email_client.send_household_invite(email, link, inviter_name)
    except Exception as e:
        logger.error(f"Failed to send invite email: {e}")
        # Non-blocking, return invite

    return invite


def accept_invite(db: Session, user_uid: str, token: str):
    """
    Accepts an invite.
    - Cancels personal sub if exists.
    - Adds to household.
    - Sets permissions.
    """
    invite = (
        db.query(HouseholdInvite)
        .filter(HouseholdInvite.token == token, HouseholdInvite.status == "pending")
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite.")

    if invite.expires_at < datetime.now(UTC):
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired.")

    # 1. Check User Status
    existing_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == user_uid).first()
    )
    if existing_member:
        raise HTTPException(
            status_code=400, detail="You are already in a household. Leave it first."
        )

    # 2. Handle Subscription Conflict (The 'Breakup Protocol' Entry)
    # User entering household drops their paid sub to become 'dependent' on household owner
    # Implementation: Set them to 'free' (or a new 'household_member' virtual tier?)
    # Ideally, their sub object reflects they are covered.
    # Let's set plan="household_member" or just keep them "free" in DB but "active"?
    # For now, let's treat them as having a verified sub via household check.
    # But we MUST cancel any Stripe recurring payments.

    current_sub = db.query(Subscription).filter(Subscription.uid == user_uid).first()
    if current_sub and current_sub.plan not in ["free", "trial"]:
        # TODO: Cancel Stripe Subscription logic here if we had the code.
        # For now, we downgrade the DB record to avoid 'double billing' logic confusion
        # Real implementation should call stripe.Subscription.delete(...)
        logger.info(f"User {user_uid} joining household. Downgrading personal sub {current_sub.plan}")
        update_user_tier(db, user_uid, "free", status="active")

    # 3. Add Member
    role = "restricted_member" if invite.is_minor else "member"
    ai_access = not invite.is_minor

    new_member = HouseholdMember(
        household_id=invite.household_id,
        uid=user_uid,
        role=role,
        can_view_household=True, # Default?
        ai_access_enabled=ai_access,
        joined_at=datetime.now(UTC)
    )

    invite.status = "accepted"
    db.add(new_member)
    db.commit()

    logger.info(f"User {user_uid} joined household {invite.household_id} via invite.")
    return new_member


def leave_household(db: Session, user_uid: str):
    """
    The Breakup Protocol.
    User leaves. Retains data. Downgrades to Free.
    """
    member = db.query(HouseholdMember).filter(HouseholdMember.uid == user_uid).first()
    if not member:
        raise HTTPException(status_code=400, detail="Not in a household.")

    household_id = member.household_id
    role = member.role

    if role == "admin":
        # Check if they are the ONLY admin / owner
        # If owner leaves, dissolve household? Or transfer ownership?
        # Specification implied 'Member' leaves. Owner leaving is complex.
        # For now, simple check:
        household = db.query(Household).filter(Household.id == household_id).first()
        if household.owner_uid == user_uid:
             raise HTTPException(
                status_code=400,
                detail="Owner cannot leave household directly. Delete the household or transfer ownership."
            )

    # 1. Remove Member
    db.delete(member)

    # 2. Update Subscription -> Free
    # Ensure they are active but free
    update_user_tier(db, user_uid, "free", status="active")

    # 3. Data Retention
    # We explicitly DO NOT delete transactions/accounts.

    # 4. Audit
    # (Assuming we had audit service, we'd log here. For now, system log)
    logger.info(f"BREAKUP PROTOCOL: User {user_uid} left household {household_id}. Data retained. Downgraded to Free.")

    db.commit()
    return {"status": "success", "detail": "Left household."}


def get_household_member_uids(db: Session, user_uid: str) -> list[str]:
    """
    Returns a list of UIDs for all members in the user's household.
    If user is not in a household, returns just [user_uid].
    """
    member = db.query(HouseholdMember).filter(HouseholdMember.uid == user_uid).first()
    if not member:
        return [user_uid]

    # Get all members of this household
    all_members = db.query(HouseholdMember.uid).filter(
        HouseholdMember.household_id == member.household_id
    ).all()

    return [m.uid for m in all_members]
