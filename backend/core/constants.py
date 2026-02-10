"""
Centralized constants for the jualuma application.
"""

from backend.services.access_control.registry import account_limits_by_tier


class TierLimits:
    LIMITS_BY_TIER = account_limits_by_tier

    FREE_LIMITS = LIMITS_BY_TIER.get("free", {})
    ESSENTIAL_LIMITS = LIMITS_BY_TIER.get("essential", {})
    PRO_LIMITS = LIMITS_BY_TIER.get("pro", {})
    ULTIMATE_LIMITS = LIMITS_BY_TIER.get("ultimate", {})

    FREE_PLAID_ACCOUNTS = FREE_LIMITS.get("plaid", 3)
    FREE_WEB3_WALLETS = FREE_LIMITS.get("web3", 1)
    FREE_CEX_ACCOUNTS = FREE_LIMITS.get("cex", 1)

    # Backwards compatibility alias if needed, but we should switch usages
    FREE_LIMITS_BY_TYPE = FREE_LIMITS


class SubscriptionPlans:
    FREE = "free"
    ESSENTIAL = "essential"
    PRO = "pro"
    ULTIMATE = "ultimate"

    ALL = [FREE, ESSENTIAL, PRO, ULTIMATE]
    PAID = [ESSENTIAL, PRO, ULTIMATE]
    DEVELOPER_ELIGIBLE = [PRO, ULTIMATE]

    @classmethod
    def get_base_tier(cls, plan_code: str) -> str:
        """Normalize 'pro_monthly' -> 'pro', 'ultimate_annual' -> 'ultimate' etc."""
        plan_code = plan_code.lower()
        if "ultimate" in plan_code:
            return cls.ULTIMATE
        if "pro" in plan_code:
            return cls.PRO
        if "essential" in plan_code:
            return cls.ESSENTIAL
        return cls.FREE


class UserStatus:
    PENDING_VERIFICATION = "pending_verification"
    PENDING_PLAN_SELECTION = "pending_plan_selection"
    ACTIVE = "active"
    SUSPENDED = "suspended"
