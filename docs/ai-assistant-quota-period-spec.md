# AI Assistant Quota Period And Tier-Change Spec

## Scope

This spec defines quota period anchoring, tier-change recalculation, and usage carry-forward behavior.

## Quota Period Anchor

- Quota period anchor for all tiers (including free) is billing-cycle anniversary style.
- Do not use calendar-month-only reset logic.
- Reset date is always derived from the active period anchor calculation.

## Tier-Change Rules

- Tier upgrades trigger immediate quota recalculation at change timestamp.
- Tier downgrades trigger immediate quota recalculation at change timestamp.
- Current period used amount is carried forward across tier changes.
- Tier change must never reset used amount to zero during an active period.

## Required UX Copy Contract

- Primary usage label: `AI usage this period`.
- Reset communication must reference period reset date, not daily-query phrasing.

## Enforcement Notes

- Backend metering is source of truth for usage and period state.
- Frontend surfaces read normalized usage and reset date from backend contract.
