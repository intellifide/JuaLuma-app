# Subscription Tier Account Limits Implementation

**Date:** 2026-01-27  
**Purpose:** Enforce subscription tier limits on account connections with friendly upgrade prompts

## Overview

Implemented comprehensive subscription tier limits enforcement across all account types (traditional/bank, web3, cex, manual) with user-friendly upgrade messaging and integrated UI showing connection limits and balances.

## Changes Made

### Backend Changes

#### 1. Enhanced `backend/core/dependencies.py`
- **Updated `enforce_account_limit()` function:**
  - Added friendly tier display names (Free, Essential, Pro, Ultimate)
  - Created `_get_next_tier_recommendation()` helper function
  - Provides specific upgrade recommendations with pricing:
    - Free → Essential ($12/mo) or Pro ($25/mo)
    - Essential → Pro ($25/mo or $250/yr) 
    - Pro → Ultimate ($60/mo or $600/yr)
  - Includes upgrade URL: `/settings/billing`
  - Shows current limit and account type in error message

#### 2. New Endpoint in `backend/api/accounts.py`
- **Added `GET /api/accounts/limits` endpoint:**
  - Returns `AccountLimitsResponse` with:
    - Current tier and display name
    - Per-account-type limits (traditional, investment, web3, cex, manual)
    - Current usage counts per type
    - Total connected vs total limit
    - Upgrade URL
  - Imported additional dependencies: `func`, `SubscriptionPlans`, `TierLimits`, `get_current_active_subscription`
  - Updated file timestamp to 2026-01-27 16:30 CST

### Frontend Changes

#### 3. Enhanced `frontend-app/src/pages/ConnectAccounts.tsx`
- **Added new state and types:**
  - `AccountLimits` interface for API response
  - State for `accountLimits` and `limitsLoading`
  
- **New functionality:**
  - Fetches account limits on component mount via `/accounts/limits` endpoint
  - `checkAccountLimit()` function validates before opening connection modals
  - Shows friendly error toast when limit reached
  - Auto-redirects to billing page after 3 seconds on limit error
  - Refreshes limits after successful account connections

- **UI Improvements:**
  - Updated header badges to show "Connected: X / Y" with limits from backend
  - Added "Limit Reached" warning badge when at capacity
  - Merged Account Overview features into Linked Accounts card:
    - Collapsible summary bar with total accounts, categories, and combined balance
    - Enhanced expanded view with overview stats panel
    - Sync All button with visual loading states
    - Tab-based filtering (All, Checking, Savings, Credit, Loans, Investment, etc.)
    - Card grid view for filtered categories
    - Table view for all accounts
  - Connection Options section now shows:
    - Current connected count vs limit per account type
    - "At Limit" badge when limit reached
    - Improved limit display formatting

- **Modal Updates:**
  - All connection modals (Wallet, CEX, Manual Account) now:
    - Check limits before opening via `checkAccountLimit()`
    - Handle limit errors from backend with user-friendly messages
    - Auto-redirect to billing page on limit errors
    - Refresh limits after successful connections

#### 4. Updated `frontend-app/src/components/PlaidLinkButton.tsx`
- **Added `onBeforeOpen` callback prop:**
  - Optional callback to check conditions before opening Plaid Link
  - Returns boolean (true = allow open, false = prevent)
  - Used to enforce account limits before initiating Plaid flow

## Subscription Tier Limits (from backend/core/constants.py)

| Tier      | Traditional | Investment | Web3 | CEX | Manual |
|-----------|------------|------------|------|-----|--------|
| Free      | 2          | 1          | 1    | 1   | 5      |
| Essential | 3          | 2          | 1    | 3   | 10     |
| Pro       | 5          | 5          | 5    | 10  | 20     |
| Ultimate  | 20         | 20         | 20   | 20  | 50     |

## User Experience Flow

### Successful Connection Within Limits
1. User clicks "Connect" button for any account type
2. Frontend checks current count vs limit
3. If under limit, modal opens normally
4. After successful connection:
   - Success toast shown
   - Accounts refetched
   - Limits refreshed to show new count

### Connection Attempt At Limit (Frontend Prevention)
1. User clicks "Connect" button
2. Frontend checks count >= limit
3. Error toast shown: "You've reached your [Tier] plan limit of X [type] accounts. Upgrade to add more connections."
4. After 3 seconds, auto-redirect to `/settings/billing`

### Connection Attempt At Limit (Backend Prevention)
1. User somehow bypasses frontend check (e.g., direct API call)
2. Backend `enforce_account_limit()` detects limit exceeded
3. Returns 403 with detailed message:
   - Current tier and limit
   - Next tier recommendation with pricing
   - Upgrade URL
4. Frontend displays error and redirects to billing

## Bug Fixes

### Route Ordering Issue (Fixed 2026-01-27)
- **Problem**: `/api/accounts/limits` endpoint returned 400 error "Invalid path.account_id"
- **Cause**: FastAPI route matching - `/limits` was defined after `/{account_id}` parametric route
- **Solution**: Moved `/limits` endpoint definition to line 525, BEFORE `/{account_id}` route at line 574
- **Result**: Specific routes now registered before parametric routes, ensuring correct matching

## Testing Checklist

- [ ] Free tier user can connect up to limits (2 traditional, 1 web3, 1 cex, 5 manual)
- [ ] Free tier user blocked at limit with upgrade message
- [ ] Essential tier limits enforced correctly
- [ ] Pro tier limits enforced correctly
- [ ] Ultimate tier limits enforced correctly
- [ ] Limits display correctly in header badges
- [ ] "At Limit" badge appears when limit reached
- [ ] Upgrade redirects work properly
- [ ] Linked Accounts card shows overview stats
- [ ] Tabs filter accounts correctly
- [ ] Sync All button works across account types
- [ ] Manual Asset creation still works independently
- [ ] `/api/accounts/limits` endpoint returns 200 OK with correct data

## Files Modified

### Backend
1. `backend/core/dependencies.py` - Enhanced limit enforcement with upgrade messaging
2. `backend/api/accounts.py` - Added `/limits` endpoint

### Frontend
1. `frontend-app/src/pages/ConnectAccounts.tsx` - Major UI overhaul, limit checking
2. `frontend-app/src/components/PlaidLinkButton.tsx` - Added onBeforeOpen callback

### Documentation
1. `IMPLEMENTATION_SUMMARY.md` - This file

## Notes

- Upgrade pricing shown in messages matches `backend/services/billing.py` STRIPE_PLANS
- All limit checks happen both client-side (UX) and server-side (security)
- Limits are per-user, not per-household
- Manual assets are separate from manual accounts and have different limits
- Account Overview section removed as standalone - features merged into Linked Accounts
