"""
Centralized constants for the jualuma application.
"""

class TierLimits:
    FREE_TRADITIONAL_ACCOUNTS = 2
    FREE_INVESTMENT_ACCOUNTS = 1
    FREE_WEB3_WALLETS = 1
    FREE_CEX_ACCOUNTS = 1
    
    # Map internal account_type strings to these limits
    FREE_LIMITS_BY_TYPE = {
        "traditional": FREE_TRADITIONAL_ACCOUNTS,
        "investment": FREE_INVESTMENT_ACCOUNTS,
        "web3": FREE_WEB3_WALLETS,
        "cex": FREE_CEX_ACCOUNTS,
        "manual": 5 # Allow more flexibility for manual? Or treat as traditional? Let's genericize manual to 5 for now or map based on manual subtype if existing.
        # Guide doesn't strictly limit "manual" assets in the same list, usually manual assets (house/car) are different from "Accounts".
        # But 'manual' account_type in accounts.py seems to be for assets?
        # Re-reading Guide: "Manual Asset Tracking module... House, Car".
        # Accounts.py has account_type="manual".
        # Let's set a safe default for manual.
    }

class SubscriptionPlans:
    FREE = "free"
    ESSENTIAL = "essential"
    PRO = "pro"
    ULTIMATE = "ultimate"
    
    ALL = [FREE, ESSENTIAL, PRO, ULTIMATE]
    PAID = [ESSENTIAL, PRO, ULTIMATE]
    DEVELOPER_ELIGIBLE = [PRO, ULTIMATE]
