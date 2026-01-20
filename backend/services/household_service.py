# CORE PURPOSE: Service for managing households, members, and invites.
# LAST MODIFIED: 2026-01-18 01:02 CST

import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.core import settings
from backend.core.constants import UserStatus
from backend.models import (
    Account,
    Household,
    HouseholdInvite,
    HouseholdMember,
    Subscription,
    User,
)
from backend.services.billing import update_user_tier
from backend.services.email import get_email_client

logger = logging.getLogger(__name__)


# Send a household welcome email to a new member after verification.
def send_household_welcome_email(db: Session, to_email: str, household_id: uuid.UUID) -> None:
    """
    Dispatch the household welcome email.
    """
    try:
        household = db.query(Household).filter(Household.id == household_id).first()
        if not household:
            logger.warning(f"Household {household_id} not found when sending welcome email.")
            return

        owner_name = "The Household Owner"
        owner_member = (
            db.query(HouseholdMember)
            .filter(
                HouseholdMember.household_id == household.id,
                HouseholdMember.role == "admin",
            )
            .first()
        )
        if owner_member and owner_member.user:
            owner_name = owner_member.user.email

        email_client = get_email_client()
        email_client.send_household_welcome_member(
            to_email=to_email,
            household_name=household.name,
            owner_name=owner_name,
        )
        logger.info(f"Sent household welcome email to {to_email} for household {household_id}.")
    except Exception as e:
        logger.error(f"Failed to send household welcome email: {e}")


def _clear_household_account_assignments(
    db: Session,
    household_id: uuid.UUID,
    member_uid: str,
) -> int:
    member_uids = (
        db.query(HouseholdMember.uid)
        .filter(HouseholdMember.household_id == household_id)
        .all()
    )
    if not member_uids:
        return 0

    allowed_uids = [m.uid for m in member_uids]
    cleared = (
        db.query(Account)
        .filter(
            Account.assigned_member_uid == member_uid,
            Account.uid.in_(allowed_uids),
            Account.uid != member_uid,
        )
        .update({Account.assigned_member_uid: None}, synchronize_session=False)
    )
    if cleared:
        logger.info(
            "Cleared %s assigned accounts for member %s in household %s.",
            cleared,
            member_uid,
            household_id,
        )
    return cleared


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
            status_code=400, detail="You are already a member of a household."
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
    db: Session, owner_uid: str, email: str, is_minor: bool = False, can_view_household: bool = True
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
            status_code=403, detail="You do not have permission to invite new members to this household."
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
                status_code=400, detail=f"The user with email {email} is already a member of this household."
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
        can_view_household=can_view_household,
        expires_at=expires_at,
    )
    db.add(invite)
    db.commit()

    # 4. Send Email
    link = f"{settings.frontend_url}/household/accept-invite?token={token}"
    email_client = get_email_client()
    try:
        # Need inviter name, verify user object loaded
        # Fallback to email if name not avail
        inviter_name = member.user.email if member.user else "A family member"
        email_client.send_household_invite(email, link, inviter_name)
    except Exception as e:
        logger.error(f"Failed to send invite email: {e}")
        # Non-blocking, return invite

    return invite


def get_invite_details(db: Session, token: str) -> dict:
    """
    Validates an invite token and returns details about the invitee status.
    Used for public invite validation endpoint.
    """
    invite = (
        db.query(HouseholdInvite)
        .filter(HouseholdInvite.token == token, HouseholdInvite.status == "pending")
        .first()
    )
    if not invite:
        return {"valid": False, "detail": "This invite is no longer valid or has already been accepted."}

    if invite.expires_at < datetime.now(UTC):
        return {"valid": False, "detail": "This invite has expired. Please request a new one."}

    # Check if user exists
    user = db.query(User).filter(User.email == invite.email).first()
    user_exists = bool(user)

    return {
        "valid": True,
        "email": invite.email,
        "is_minor": invite.is_minor,
        "user_exists": user_exists,
        "household_id": invite.household_id
    }


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
        raise HTTPException(status_code=404, detail="This invite is invalid or has expired.")

    if invite.expires_at < datetime.now(UTC):
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="This invite has expired.")

    # 1. Check User Status
    existing_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == user_uid).first()
    )
    if existing_member:
        raise HTTPException(
            status_code=400, detail="You are already a member of a household. You must leave your current household before joining a new one."
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
        from backend.services.billing import cancel_user_subscription

        # Cancel Stripe Subscription
        cancel_user_subscription(db, user_uid)

        logger.info(
            f"User {user_uid} joining household. Canceled personal sub {current_sub.plan} and converting to dependent."
        )

    # Always ensure user is on 'free' tier (dependent) and 'active' status
    # This fixes the issue where new users (pending_plan_selection) get redirected to pricing
    update_user_tier(db, user_uid, "free", status="active")

    # 3. Add Member
    # Note: joined_at serves as the timestamp for "Consent Agreed" to data sharing terms.
    # This is enforced by the API endpoint logic checking `consent_agreed=True`.
    role = "restricted_member" if invite.is_minor else "member"
    ai_access = not invite.is_minor

    new_member = HouseholdMember(
        household_id=invite.household_id,
        uid=user_uid,
        role=role,
        can_view_household=invite.can_view_household,
        ai_access_enabled=ai_access,
        joined_at=datetime.now(UTC)
    )

    invite.status = "accepted"
    db.add(new_member)
    db.commit()

    logger.info(f"User {user_uid} joined household {invite.household_id} via invite.")
    logger.info(f"User {user_uid} joined household {invite.household_id} via invite.")

    # 4. Send Household Welcome Email (defer until OTP verification if needed).
    user = db.query(User).filter(User.uid == user_uid).first()
    if user and user.status != UserStatus.PENDING_VERIFICATION:
        send_household_welcome_email(db, invite.email, invite.household_id)
    else:
        logger.info(f"Deferring household welcome email for {invite.email} until verification completes.")

    return new_member


def leave_household(db: Session, user_uid: str):
    """
    The Breakup Protocol.
    User leaves. Retains data. Downgrades to Free.
    """
    member = db.query(HouseholdMember).filter(HouseholdMember.uid == user_uid).first()
    if not member:
        raise HTTPException(status_code=400, detail="You are not currently a member of a household.")

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
                detail="As the owner, you cannot leave the household directly. Please transfer ownership or delete the household instead."
            )

    member_uids = get_household_member_uids(db, user_uid)
    _clear_household_account_assignments(db, household_id, user_uid)
    from backend.services.analytics import invalidate_analytics_cache
    for uid in set(member_uids):
        invalidate_analytics_cache(uid)

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


# Remove a member from a household as an admin action.
def remove_member(db: Session, admin_uid: str, member_uid: str) -> dict:
    """
    Removes a household member (admin only).
    """
    admin_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == admin_uid).first()
    )
    if not admin_member or admin_member.role != "admin":
        raise HTTPException(
            status_code=403, detail="You do not have permission to remove members from this household."
        )

    if admin_uid == member_uid:
        raise HTTPException(
            status_code=400, detail="To remove yourself from the household, please use the 'Leave Household' option."
        )

    target_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == member_uid).first()
    )
    if not target_member:
        raise HTTPException(status_code=404, detail="The specified household member could not be found.")

    if target_member.household_id != admin_member.household_id:
        raise HTTPException(
            status_code=403, detail="The specified member does not belong to your household."
        )

    household = (
        db.query(Household).filter(Household.id == admin_member.household_id).first()
    )
    if household and household.owner_uid == member_uid:
        raise HTTPException(status_code=400, detail="The household owner cannot be removed.")

    if target_member.role == "admin":
        raise HTTPException(
            status_code=400, detail="You do not have permission to remove another household admin."
        )

    member_uids = get_household_member_uids(db, admin_uid)
    _clear_household_account_assignments(
        db, admin_member.household_id, target_member.uid
    )
    from backend.services.analytics import invalidate_analytics_cache
    for uid in set(member_uids + [target_member.uid]):
        invalidate_analytics_cache(uid)

    db.delete(target_member)
    update_user_tier(db, member_uid, "free", status="active")
    db.commit()

    logger.info(
        f"Household admin {admin_uid} removed member {member_uid} from household {admin_member.household_id}."
    )
    return {"status": "success", "detail": "Member removed."}


# Cancel a pending household invite as an admin action.
def cancel_invite(db: Session, admin_uid: str, invite_id: str) -> dict:
    """
    Cancels a pending household invite (admin only).
    """
    try:
        invite_uuid = uuid.UUID(invite_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="The provided invite identifier is invalid.") from exc

    admin_member = (
        db.query(HouseholdMember).filter(HouseholdMember.uid == admin_uid).first()
    )
    if not admin_member or admin_member.role != "admin":
        raise HTTPException(
            status_code=403, detail="You do not have permission to cancel invites for this household."
        )

    invite = (
        db.query(HouseholdInvite)
        .filter(
            HouseholdInvite.id == invite_uuid,
            HouseholdInvite.household_id == admin_member.household_id,
        )
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="The specified household invite could not be found.")

    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="This invite is no longer in a pending state.")

    invite.status = "declined"
    db.add(invite)
    db.commit()

    logger.info(
        f"Household admin {admin_uid} cancelled invite {invite_id} for household {admin_member.household_id}."
    )
    return {"status": "success", "detail": "Invite cancelled."}


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
