"""
Centralized constants for the jualuma application.
"""

class TierLimits:
    FREE_TRADITIONAL_ACCOUNTS = 2
    FREE_INVESTMENT_ACCOUNTS = 1
    FREE_WEB3_WALLETS = 1
    FREE_CEX_ACCOUNTS = 1
    
    # Defined per Master App Dev Guide v2.4
    FREE_LIMITS = {
        "traditional": 2,
        "investment": 1,
        "web3": 1,
        "cex": 1,
        "manual": 5
    }

    ESSENTIAL_LIMITS = {
        "traditional": 3,
        "investment": 2,
        "web3": 1,
        "cex": 3,
        "manual": 10
    }

    PRO_LIMITS = {
        "traditional": 5,
        "investment": 5,
        "web3": 5,
        "cex": 10,
        "manual": 20
    }

    ULTIMATE_LIMITS = {
        "traditional": 20,
        "investment": 20,
        "web3": 20,
        "cex": 20,
        "manual": 50
    }

    LIMITS_BY_TIER = {
        "free": FREE_LIMITS,
        "essential": ESSENTIAL_LIMITS,
        "pro": PRO_LIMITS,
        "ultimate": ULTIMATE_LIMITS
    }
    
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

class UserStatus:
    PENDING_VERIFICATION = "pending_verification"
    PENDING_PLAN_SELECTION = "pending_plan_selection"
    ACTIVE = "active"
    SUSPENDED = "suspended"

