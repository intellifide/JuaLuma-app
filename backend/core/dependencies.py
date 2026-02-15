from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.constants import SubscriptionPlans, TierLimits
from backend.middleware.auth import get_current_user
from backend.models import Account, Household, HouseholdMember, Subscription, User
from backend.services.access_control.registry import (
    can_use_feature,
    get_required_tier,
    tier_from_string,
)
from backend.utils import get_db


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
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not have developer access."
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
            detail="A Pro or Ultimate subscription is required for this feature.",
        )
    return current_user


def require_feature(feature_key: str):
    """
    Dependency that ensures the user (or their household owner, when applicable)
    has access to a registry-backed feature.
    """

    def _require_feature(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        sub = get_current_active_subscription(current_user)
        plan_code = sub.plan if sub else SubscriptionPlans.FREE
        base_tier = SubscriptionPlans.get_base_tier(plan_code)

        if can_use_feature(feature_key, base_tier):
            return current_user

        # Allow household members to inherit access for family tracking
        if feature_key.startswith("family."):
            member = (
                db.query(HouseholdMember)
                .filter(HouseholdMember.uid == current_user.uid)
                .first()
            )
            if member:
                household = (
                    db.query(Household)
                    .filter(Household.id == member.household_id)
                    .first()
                )
                if household:
                    owner_sub = (
                        db.query(Subscription)
                        .filter(
                            Subscription.uid == household.owner_uid,
                            Subscription.status == "active",
                        )
                        .order_by(Subscription.created_at.desc())
                        .first()
                    )
                    owner_tier = (
                        SubscriptionPlans.get_base_tier(owner_sub.plan)
                        if owner_sub
                        else SubscriptionPlans.FREE
                    )
                    if can_use_feature(feature_key, owner_tier):
                        return current_user

        required = get_required_tier(feature_key)
        required_label = required.name.title() if required else "Paid"
        user_label = tier_from_string(base_tier).name.title()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Feature '{feature_key}' requires {required_label} access. "
                f"Current tier: {user_label}."
            ),
        )

    return _require_feature


def enforce_account_limit(user: User, db: Session, account_type: str):
    """
    Enforces account limits based on user tier and account type.
    Raises 403 if limit exceeded with upgrade guidance.
    """
    sub = get_current_active_subscription(user)
    plan_code = sub.plan if sub else SubscriptionPlans.FREE
    base_tier = SubscriptionPlans.get_base_tier(plan_code)

    tier_limits = TierLimits.LIMITS_BY_TIER.get(base_tier, TierLimits.FREE_LIMITS)
    limit = tier_limits.get(account_type)
    if limit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported account limit type: {account_type}",
        )

    count = (
        db.query(func.count(Account.id))
        .filter(Account.uid == user.uid, Account.account_type == account_type)
        .scalar()
    )

    if count >= limit:
        # Build friendly tier display name
        tier_display = {
            "free": "Free",
            "essential": "Essential",
            "pro": "Pro",
            "ultimate": "Ultimate"
        }.get(base_tier, base_tier.capitalize())

        # Get next tier recommendation
        next_tier_info = _get_next_tier_recommendation(base_tier, account_type)

        # Build upgrade message
        upgrade_msg = (
            f"You've reached your {tier_display} plan limit of {limit} {account_type} "
            f"account{'s' if limit != 1 else ''}. {next_tier_info}"
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=upgrade_msg,
        )


def _get_next_tier_recommendation(current_tier: str, account_type: str) -> str:
    """Generate upgrade recommendation based on current tier and account type."""
    if current_tier == "free":
        essential_limit = TierLimits.ESSENTIAL_LIMITS.get(account_type, 0)
        return (
            f"Upgrade to Essential ($12/mo) for {essential_limit} {account_type} accounts, "
            f"or Pro ($25/mo) for even more connections. Visit /settings/billing to upgrade."
        )
    elif current_tier == "essential":
        pro_limit = TierLimits.PRO_LIMITS.get(account_type, 0)
        return (
            f"Upgrade to Pro ($25/mo or $250/yr) for {pro_limit} {account_type} accounts "
            f"and unlock AI insights. Visit /settings/billing to upgrade."
        )
    elif current_tier == "pro":
        ultimate_limit = TierLimits.ULTIMATE_LIMITS.get(account_type, 0)
        return (
            f"Upgrade to Ultimate ($60/mo or $600/yr) for {ultimate_limit} {account_type} accounts "
            f"and developer SDK access. Visit /settings/billing to upgrade."
        )
    else:  # ultimate
        return "You're on our highest tier. Contact support if you need additional capacity."
