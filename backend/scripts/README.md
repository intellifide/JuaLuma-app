# Backend Scripts

This directory contains utility scripts for development, testing, and maintenance of the Jualuma backend.

## Scripts Overview

### E2E Testing & Seeding

- **`e2e_test_runner.py`**: The main runner for End-to-End tests. It orchestrates the setup, execution (using Newman), and teardown of E2E environments.
- **`e2e_seed.py`**: Seeds the database with test users (`e2e_owner`, `e2e_member`) and a household for quick manual or automated testing.
- **`check_e2e_state.py`**: A diagnostic script to verify the current state of E2E users and their household assignments in the database.
- **`cleanup_e2e_accounts.py`**: Deletes accounts associated with the `e2e_owner` to reset the state preventing subscription limits from being hit during repeated tests.
- **`e2e_ultimate_signup_test.py`**: A dedicated integration test that simulates the full Ultimate Tier user journey: Signup -> OTP -> Stripe Upgrade -> Household Creation -> Multi-Member Invite (Standard & Minor) -> Role Verification. Uses `testmail.app` for real email verification.

### Utility Scripts

- **`test_household_transactions.py`**: Testing script specifically for household transaction logic.
- **`test_stripe_session.py`**: Script to test Stripe Checkout Session creation and verifying the integration.
- **`cleanup_pending_signups.py`**: Deletes pending signup records older than 24 hours.

## Usage

**Run E2E Tests:**

```bash
python scripts/e2e_test_runner.py
```

**Seed Database:**

```bash
python scripts/e2e_seed.py
```

**Cleanup E2E Accounts:**

```bash
PYTHONPATH=. python scripts/cleanup_e2e_accounts.py
```

**Cleanup Pending Signups:**

```bash
PYTHONPATH=. python scripts/cleanup_pending_signups.py
```
