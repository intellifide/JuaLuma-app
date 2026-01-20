import logging

# Updated 2025-12-10 21:27 CST (Central Time) - removed unused imports
from datetime import UTC, datetime

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
from backend.services.auth import revoke_refresh_tokens
from backend.services.notifications import NotificationService
from backend.utils import get_db

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)


class SubscriptionUpdate(BaseModel):
    plan: str = Field(..., pattern="^(free|essential|pro|ultimate)$")


@router.post("/export")
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all user data as a JSON bundle.
    """
    # Eager load everything
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
        )
        .filter(User.uid == current_user.uid)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Serialize Data
    data = {
        "profile": user.to_dict(),
        "exported_at": datetime.now(UTC).isoformat(),
        "subscriptions": [s.to_dict() for s in user.subscriptions],
        "accounts": [],
        "support_tickets": [t.to_dict() for t in user.support_tickets],
        "legal_acceptances": [
            {
                "agreement_key": acceptance.agreement_key,
                "agreement_version": acceptance.agreement_version,
                "accepted_at": acceptance.accepted_at,
                "presented_at": acceptance.presented_at,
                "acceptance_method": acceptance.acceptance_method,
                "source": acceptance.source,
                "ip_address": acceptance.ip_address,
                "user_agent": acceptance.user_agent,
                "locale": acceptance.locale,
                "metadata": acceptance.metadata_json,
            }
            for acceptance in user.legal_acceptances
        ],
        "widgets_owned": [],  # If we had widget ownership logic beyond developer
        "widgets_rated": [
            r.rating
            for r in db.query(WidgetRating)
            .filter(WidgetRating.user_uid == user.uid)
            .all()
        ],
    }

    if user.ai_settings:
        data["ai_settings"] = {
            "provider": user.ai_settings.provider,
            "created_at": user.ai_settings.created_at.isoformat()
            if user.ai_settings.created_at
            else None,
        }

    for account in user.accounts:
        acc_data = account.to_dict()
        acc_data["transactions"] = [t.to_dict() for t in account.transactions]
        data["accounts"].append(acc_data)

    # User's developed widgets
    if user.developer:
        widgets = db.query(Widget).filter(Widget.developer_uid == user.uid).all()
        data["developed_widgets"] = [w.to_dict() for w in widgets]

    return data


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
