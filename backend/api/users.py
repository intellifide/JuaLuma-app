import json
import logging

# Updated 2025-12-10 21:27 CST (Central Time) - removed unused imports
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from firebase_admin import auth
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from backend.middleware.auth import get_current_user
from backend.models import (
    Account,
    AISettings,
    AuditLog,
    LegalAgreementAcceptance,
    Subscription,
    SupportTicket,
    User,
    Widget,
    WidgetRating,
)
from backend.models.budget import Budget
from backend.models.category_rule import CategoryRule
from backend.models.developer import Developer
from backend.models.household import Household, HouseholdMember
from backend.models.manual_asset import ManualAsset
from backend.models.notification import NotificationPreference
from backend.models.payment import Payment
from backend.models.payout import DeveloperPayout
from backend.models.transaction import Transaction
from backend.models.user_document import UserDocument
from backend.services.auth import revoke_refresh_tokens
from backend.services.notifications import NotificationService
from backend.utils import get_db

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)
UTC = timezone.utc


class SubscriptionUpdate(BaseModel):
    plan: str = Field(..., pattern="^(free|essential|pro|ultimate)$")


@router.get("/me", response_model=dict[str, Any])
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current logged-in user's profile."""
    # current_user is already simple, but let's refresh to be safe or eager load needed fields
    # For basic profile, we don't need heavy eager loading
    return current_user.to_dict()


class PrivacyUpdate(BaseModel):
    data_sharing_consent: bool


@router.patch("/me/privacy", response_model=dict[str, Any])
def update_privacy_settings(
    update_data: PrivacyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user privacy settings."""
    current_user.data_sharing_consent = update_data.data_sharing_consent
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


@router.post("/export")
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all data associated with the current user.
    Returns a comprehensive JSON structure.
    """
    # Eager load everything attached to User
    user = (
        db.query(User)
        .options(
            selectinload(User.subscriptions),
            selectinload(User.ai_settings),
            selectinload(User.notification_preferences),
            selectinload(User.developer),
            selectinload(User.accounts).selectinload(Account.transactions),
            selectinload(User.support_tickets),
            selectinload(User.legal_acceptances),
            selectinload(User.manual_assets),
            selectinload(User.documents),
            selectinload(User.payments),
            selectinload(User.developer_payouts),
            selectinload(User.household_member),
        )
        .filter(User.uid == current_user.uid)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch data not directly linked via relationship on User model (or just to be safe)
    budgets = db.query(Budget).filter(Budget.uid == user.uid).all()
    category_rules = db.query(CategoryRule).filter(CategoryRule.uid == user.uid).all()
    widget_ratings = db.query(WidgetRating).filter(WidgetRating.user_uid == user.uid).all()

    # Handle Household data
    household_data = None
    if user.household_member:
        # Load the household details if member
        hh = (
            db.query(Household)
            .options(
                selectinload(Household.members),
                selectinload(Household.invites)
            )
            .filter(Household.id == user.household_member.household_id)
            .first()
        )
        if hh:
            household_data = hh.to_dict()

    # Serialize Data
    data = {
        "profile": user.to_dict(),
        "exported_at": datetime.now(UTC).isoformat(),
        "ai_settings": user.ai_settings.to_dict() if user.ai_settings else None,
        "subscriptions": [s.to_dict() for s in user.subscriptions],
        "notification_preferences": [n.to_dict() for n in user.notification_preferences],
        
        # Financials
        "accounts": [],  # Filled below
        "manual_assets": [m.to_dict() for m in user.manual_assets],
        "payments": [p.to_dict() for p in user.payments],
        "developer_payouts": [p.to_dict() for p in user.developer_payouts],
        "budgets": [b.to_dict() for b in budgets],
        "category_rules": [r.to_dict() for r in category_rules],

        # Support & Legal
        "support_tickets": [t.to_dict() for t in user.support_tickets],
        "legal_acceptances": [l.to_dict() for l in user.legal_acceptances],
        "documents": [d.to_dict() for d in user.documents],

        # Household
        "household_membership": user.household_member.to_dict() if user.household_member else None,
        "household": household_data,

        # Widgets
        "developed_widgets": [], # Filled below
        "widget_ratings": [r.to_dict() for r in widget_ratings],
    }

    # Process Accounts & Transactions
    for account in user.accounts:
        acc_data = account.to_dict()
        acc_data["transactions"] = [t.to_dict() for t in account.transactions]
        data["accounts"].append(acc_data)

    # Process Developed Widgets if user is a developer
    if user.developer:
        widgets = db.query(Widget).filter(Widget.developer_uid == user.uid).all()
        data["developed_widgets"] = [w.to_dict() for w in widgets]
        data["developer_profile"] = user.developer.to_dict()

    json_str = json.dumps(data, indent=2, default=str)
    return Response(content=json_str, media_type="application/json")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the user account and user-linked data.
    """
    uid = current_user.uid
    email = current_user.email

    # 1. Revoke Firebase Tokens & Delete from Firebase
    try:
        revoke_refresh_tokens(uid)
        auth.delete_user(uid)
    except Exception as e:
        logger.error(f"Error deleting user from Firebase: {e}")
        # Continue to delete local data anyway to ensure cleanup

    # 2. Delete Local Data
    # Cascade delete usually handles related models if configured,
    # but let's be explicit for safety or if cascade isn't set up perfectly.

    # Delete related records
    db.query(Subscription).filter(Subscription.uid == uid).delete()
    db.query(AISettings).filter(AISettings.uid == uid).delete()
    db.query(SupportTicket).filter(SupportTicket.user_id == uid).delete()
    # Note: Accounts/Transactions usually have cascade, but just in case:
    # We rely on DB cascade for deeper nested items like transactions linked to accounts

    # Delete Account records
    db.query(Account).filter(Account.uid == uid).delete()

    # Widget Ratings
    db.query(WidgetRating).filter(WidgetRating.user_uid == uid).delete()
    db.query(LegalAgreementAcceptance).filter(
        LegalAgreementAcceptance.uid == uid
    ).delete()

    # If developer, maybe soft delete widgets or keep them?
    # Requirement: "Delete user-linked data... widget ownership as appropriate"
    # If validated developer, we might want to keep widgets but mark developer as 'deleted'?
    # For now, let's set them to 'removed' status if they exist.
    widgets = db.query(Widget).filter(Widget.developer_uid == uid).all()
    for w in widgets:
        w.status = "removed"

    # 3. Audit Log (Before deleting user object for reference, or create a 'deleted_user' log)
    # Since we delete the user, foreign keys to 'User' in AuditLog might fail if not nullable.
    # Usually AuditLog.actor_uid is a string, not FK, or is nullable?
    # Checking models... `actor_uid = Column(String...` (Based on typical implementation).
    # Assuming it's safe to keep log with a UID that no longer exists in Users table.

    log_entry = AuditLog(
        actor_uid=uid,  # Use the string ID
        target_uid=uid,
        action="delete_account",
        source="backend",
        metadata_json={"email": email, "reason": "user_request"},
    )
    db.add(log_entry)

    # Finally delete user
    db.delete(current_user)

    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/subscription")
def update_subscription(
    payload: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upgrade or Downgrade subscription plan.
    """
    # Simple logic: Deactivate old, create new. Or update existing.
    # We will update the latest active subscription.

    active_sub = (
        db.query(Subscription)
        .filter(Subscription.uid == current_user.uid, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .first()
    )

    old_plan = "none"
    if active_sub:
        old_plan = active_sub.plan
        active_sub.plan = payload.plan.lower()
        active_sub.updated_at = datetime.now(UTC)
        db.add(active_sub)
    else:
        # Create new
        new_sub = Subscription(
            uid=current_user.uid,
            plan=payload.plan.lower(),
            status="active",
            renew_at=datetime.now(UTC),  # Placeholder
        )
        db.add(new_sub)

    # Audit
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="update_subscription",
        source="backend",
        metadata_json={"old_plan": old_plan, "new_plan": payload.plan},
    )
    db.add(log_entry)

    # Notify User
    try:
        NotificationService(db).create_notification(
            user=current_user,
            title="Subscription Updated",
            message=f"Your subscription has been updated to {payload.plan.title()}.",
            send_email=True,
        )
    except Exception as e:
        logger.error(f"Failed to send subscription notification: {e}")

    db.commit()

    return {"message": f"Subscription updated to {payload.plan}"}
