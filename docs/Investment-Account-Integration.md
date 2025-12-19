# Investment Account Integration Guide

## Intellifide, LLC - jualuma Platform

## Overview

This document outlines the investment account integration strategy for the jualuma platform, using Plaid Investments API as the primary provider with SnapTrade API available as a backlog option for additional brokerages.

**Review Frequency:** As integration evolves

**Related Documents:**

- `Master App Dev Guide.md` - Technical architecture
- `planning/business docs/Vendor-Relationships.md` - Vendor details
- `planning/Product-Roadmap.md` - Implementation timeline

---

## 1. Primary Provider: Plaid Investments API

**Plaid Investments API:**

- Primary connector for investment accounts
- Supports multiple brokerages via Plaid's aggregation service
- Lowest friction: ~7 seconds connection time
- Account type coverage (traditional brokerage, retirement accounts, cash management, crypto) to be verified with Plaid

### Supported Brokerages

- Plaid supports multiple brokerages via its Investments API aggregation service
- Specific brokerage coverage to be verified with Plaid

### Integration Architecture

**Plaid Link Flow:**

1. User initiates investment account connection
2. Plaid Link authentication
3. Account selection and verification
4. Holdings and positions data sync
5. Real-time portfolio value updates

### Data Normalization

- Holdings data standardization
- Positions data standardization
- Investment transaction history
- Portfolio value calculation

### Account Type Coverage

**To be verified with Plaid:**

- Traditional brokerage accounts
- Retirement accounts (IRA, 401k)
- Cash management accounts
- Crypto accounts (if supported)

---

## 2. Backlog Option: SnapTrade API

**SnapTrade API:**

- Secondary connector for brokerages not supported by Plaid
- Low friction: ~1-2 minutes connection time
- Pricing: $1.50 per connected user/month
- Status: Backlog item (post-launch)

### Integration Architecture (When Implemented)

**SnapTrade OAuth Flow:**

1. User initiates brokerage connection for brokerages not supported by Plaid
2. SnapTrade OAuth authentication
3. Account verification and sync
4. Holdings and positions data sync

### Data Normalization (When Implemented)

- Holdings data standardization (aligned with Plaid format)
- Positions data standardization
- Investment transaction history
- Portfolio value calculation

---

## 3. Connector Service Comparison

| Connector | Status | Friction | Connection Time | Use Case |
|-----------|--------|----------|-----------------|----------|
| Plaid Investments API | Primary | Lowest | ~7 seconds | Primary - Most brokerages |
| SnapTrade API | Backlog | Low | ~1-2 minutes | Secondary - Brokerages not supported by Plaid |

---

## 4. Error Handling

### API Failures

- Retry logic with exponential backoff
- User notification of sync failures
- Fallback to manual entry option

### Authentication Errors

- Token refresh mechanisms
- Re-authentication flows
- User guidance for connection issues

### Data Sync Issues

- Partial sync handling
- Data validation and error reporting
- Manual correction workflows

---

## 5. Brokerage-Specific Considerations

### All Brokerages Treated Equally

- No special prioritization for any brokerage
- Standard sync process for all accounts
- Consistent user experience across all brokerages

### Account Limits by Tier

Account limits for investment accounts are defined in `feature_requirements.yaml`:

- Free Tier: 1 investment account
- Essential Tier: 2 investment accounts
- Pro Tier: 5 investment accounts
- Ultimate Tier: 20 investment accounts

---

## 6. Implementation Checklist

### Plaid Investments API Integration

- [ ] Verify Plaid Investments API support and coverage
- [ ] Verify account type coverage (traditional, retirement, cash management, crypto)
- [ ] Implement Plaid Link flow for investment accounts
- [ ] Implement holdings and positions data sync
- [ ] Implement portfolio value calculation
- [ ] Implement investment transaction history
- [ ] Test with supported brokerages
- [ ] Document integration process

### SnapTrade API Integration (Backlog)

- [ ] Set up SnapTrade account
- [ ] Implement SnapTrade OAuth flow
- [ ] Implement brokerage connections not supported by Plaid
- [ ] Implement data normalization for SnapTrade
- [ ] Test SnapTrade integration
- [ ] Document SnapTrade brokerages

---

## Related Documents

- `Master App Dev Guide.md` - Technical architecture
- `planning/business docs/Vendor-Relationships.md` - Vendor details (Plaid, SnapTrade)
- `planning/Product-Roadmap.md` - Implementation timeline
- `planning/business docs/Operational-Procedures.md` - Account linking procedures
- `Data-Flow-Diagrams.md` - Integration flows

**Last Updated:** December 19, 2025 at 01:50 PM CT (Modified 12/19/2025 13:50 Central Time per rules)
