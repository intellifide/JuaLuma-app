from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.constants import SubscriptionPlans, TierLimits
from backend.middleware.auth import get_current_user
from backend.models import Account, Subscription, User


def get_current_active_subscription(user: User) -> Subscription | None:
    """Returns the user's current active subscription (latest created)."""
    # Filtering in python since user.subscriptions is loaded eagerly
    active = [s for s in user.subscriptions if s.status == "active"]
    if not active:
        return None
    # Sort by created_at desc
    active.sort(key=lambda s: s.created_at, reverse=True)
    return active[0]


def require_developer(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures the user is a registered developer.
    """
    if not current_user.developer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Developer access required."
        )
    return current_user


def require_pro_or_ultimate(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures the user has a Pro or Ultimate subscription.
    """
    sub = get_current_active_subscription(current_user)
    base_plan = (
        SubscriptionPlans.get_base_tier(sub.plan) if sub else SubscriptionPlans.FREE
    )
    if base_plan not in SubscriptionPlans.DEVELOPER_ELIGIBLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Ultimate subscription required.",
        )
    return current_user


def enforce_account_limit(user: User, db: Session, account_type: str):
    """
    Enforces account limits based on user tier and account type.
    Raises 403 if limit exceeded.
    """
    sub = get_current_active_subscription(user)
    plan_code = sub.plan if sub else SubscriptionPlans.FREE
    base_tier = SubscriptionPlans.get_base_tier(plan_code)

    tier_limits = TierLimits.LIMITS_BY_TIER.get(base_tier, TierLimits.FREE_LIMITS)
    limit = tier_limits.get(account_type, 3)

    count = (
        db.query(func.count(Account.id))
        .filter(Account.uid == user.uid, Account.account_type == account_type)
        .scalar()
    )

    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{plan_code.capitalize()} tier is restricted to {limit} {account_type} accounts. Please upgrade to add more.",
        )
