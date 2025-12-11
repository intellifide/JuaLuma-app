"""
Centralized constants for the Finity application.
"""

class TierLimits:
    FREE_ACCOUNTS = 3

class SubscriptionPlans:
    FREE = "free"
    ESSENTIAL = "essential"
    PRO = "pro"
    ULTIMATE = "ultimate"
    
    ALL = [FREE, ESSENTIAL, PRO, ULTIMATE]
    PAID = [ESSENTIAL, PRO, ULTIMATE]
    DEVELOPER_ELIGIBLE = [PRO, ULTIMATE]
