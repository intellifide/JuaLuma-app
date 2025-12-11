from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.middleware.auth import get_current_user
from backend.utils import get_db
from backend.models import User, Account, Subscription
from backend.core.constants import TierLimits, SubscriptionPlans

def get_current_active_subscription(user: User) -> Optional[Subscription]:
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
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer access required."
        )
    return current_user

def require_pro_or_ultimate(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures the user has a Pro or Ultimate subscription.
    """
    sub = get_current_active_subscription(current_user)
    if not sub or sub.plan not in SubscriptionPlans.DEVELOPER_ELIGIBLE:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Ultimate subscription required."
        )
    return current_user

def check_account_limit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dependency that checks if the user has reached their account limit based on tier.
    Raises 403 if limit exceeded.
    """
    sub = get_current_active_subscription(current_user)
    plan = sub.plan if sub else SubscriptionPlans.FREE
    
    if plan == SubscriptionPlans.FREE:
        # Count existing accounts
        count = db.query(func.count(Account.id)).filter(Account.uid == current_user.uid).scalar()
        if count >= TierLimits.FREE_ACCOUNTS:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier is restricted to {TierLimits.FREE_ACCOUNTS} connected accounts. Please upgrade to add more."
            )
    
    # Other tiers are currently unlimited or high enough to not check here
    return current_user
