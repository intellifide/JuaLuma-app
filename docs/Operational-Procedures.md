# Operational Procedures

## Intellifide, LLC - jualuma Platform

## Overview

This document outlines day-to-day operational procedures for the jualuma platform, including user onboarding, account linking, data synchronization, support procedures, and escalation paths. These procedures ensure consistent operations and quality service delivery.

**Review Frequency:** Quarterly, or as processes change

**Related Documents:**

- `Master App Dev Guide.md` - Technical specification and development guidelines
- `Local App Dev Guide.md` - Local development environment setup
- `Compliance-Checklist.md` - Compliance requirements for operations
- `Product-Roadmap.md` - Timeline and operational milestones
- `business-info-summary.md` - Business information reference
- `Vendor-Relationships.md` - Vendor management procedures

---

## 1. User Onboarding Process

### 1.1 Account Creation

**Step 1: User Registration**

- User visits jualuma platform
- Clicks "Sign Up" or "Get Started"
- Selects authentication method:
  - Email/Password
  - Google OAuth
- Provides required information:
  - Email address
  - Password (if email/password)
  - Accepts Terms of Service
  - Accepts Privacy Policy

**Step 2: Email Verification**

- Verification email sent to user
- User clicks verification link
- Email verified
- Account activated

**Step 3: Initial Setup**

- User completes profile (optional)
- User selects theme preference (default: Engineered Liquid Glass)
- User sets notification preferences
- User is directed to account linking

**Step 4: Welcome and Education**

- Welcome message displayed
- Platform tour offered (optional)
- Educational content highlighted
- User can proceed to link accounts

### 1.2 Account Tier Assignment

**Free Tier (Default):**

- All new users start on Free Tier
- Limits: 3 traditional (Plaid) accounts, 1 Web3 wallet, 1 CEX account
- Cloud AI model routing: free requests use `gpt-oss-120b` with period usage tracking (`AI usage this period`) and billing-cycle-anniversary reset date visibility.
- Standard features
- Rolling 45-day transaction window stored exclusively in Cloud SQL (`ledger_hot_free`). The nightly `free-ledger-pruner` Cloud Run Job deletes entries older than 45 days—no archive is retained—ensuring low storage costs and straightforward GDPR/GLBA erasure handling.
- Plaid sync is automatic (webhook + cursor jobs). Manual sync actions apply only to Web3/CEX connectors.

**Essential Tier ($10/month):**

- Upgrade option presented alongside Pro during subscription flow.
- Limits: 5 traditional accounts, 5 investment accounts, 5 Web3 wallets, 5 CEX accounts.
- Cloud AI models enabled with encrypted RAG context. Default paid model is `gemini-2.5-flash`; when paid premium capacity is exhausted, runtime auto-falls back to `gpt-oss-120b` with explicit user-facing fallback messaging.
- Sync cadence: Plaid uses webhook-first cursor sync with safety-net jobs; Web3/CEX retain manual sync actions.
- Rolling 30-day hot data window stored in Cloud SQL (`ledger_hot_essential`). The paired `essential-ledger-archiver` job moves data older than 30 days into Coldline (`gs://jualuma-ledger-archive/essential/<uid>/<YYYY>/<MM>`) for read-only access.
- AI quota metering is token-based via Firestore `api_usage`; UI shows progress (`AI usage this period`) and period reset date.

**Pro Tier (Upgrade):**

- User initiates upgrade through subscription flow
- Stripe Checkout session created
- Payment processed
- Account upgraded upon successful payment
- Limits increased: 5 traditional accounts, 5 investment accounts, 5 Web3 wallets, 5 CEX accounts
- Cloud AI models enabled via Vertex AI (`gemini-2.5-flash` default for paid) with automatic fallback to `gpt-oss-120b` on paid premium exhaustion.
- AI quota metering is token-based with billing-cycle-anniversary reset and reset-date visibility in UI/support surfaces.

---

## 2. Account Linking Procedures

### 2.1 Traditional Bank Account Linking (Plaid)

**Step 1: Initiate Link**

- User clicks "Link Account"
- Selects account type (Bank, Credit Card, etc.)
- Plaid Link flow initiated
- Link token generated

**Step 2: User Authentication**

- User redirected to Plaid Link
- User selects financial institution
- User enters credentials (handled by Plaid)
- User authenticates with institution
- User selects accounts to link

**Step 3: Token Exchange**

- Public token received from Plaid
- Public token exchanged for access token + Plaid `item_id`
- Access token stored in Secret Manager (not database)
- Secret reference stored in Cloud SQL `plaid_items.secret_ref` (legacy `accounts.secret_ref` retained for compatibility only)

**Step 4: Initial Data Sync**

- Item is marked `sync_needed`; webhook/cursor job processes first sync asynchronously
- Transactions and balances fetched
- Data normalized and stored in Cloud SQL
- User sees accounts in dashboard

**Step 5: Account Verification**

- Account appears in user's account list
- Account details displayed (masked account numbers)
- User can view transactions
- Sync status displayed

### 2.2 Cryptocurrency Exchange Linking (CEX APIs)

**Step 1: Initiate Link**

- User clicks "Link CEX Account"
- Selects exchange (Coinbase, Kraken, etc.)
- OAuth flow initiated (if supported)
- Or API key entry flow

**Step 2: Authentication**

- OAuth: User authenticates with exchange
- API Key: User provides API key (read-only)
- API key validated
- Permissions verified (read-only only)

**Step 3: Key Storage**

- API key stored in Secret Manager
- Secret reference stored in Cloud SQL
- Account created in Cloud SQL `accounts` table
- Account type: `cex` or `coinbase`, etc.

**Step 4: Initial Sync**

- First sync triggered
- Balances and transactions fetched
- Data stored in Cloud SQL
- User sees CEX account in dashboard

### 2.3 Web3 Wallet Linking

**Step 1: Initiate Link**

- User clicks "Link Web3 Wallet"
- Selects blockchain (Ethereum, Solana, etc.)
- User provides wallet address

**Step 2: Address Validation**

- Wallet address format validated
- OFAC screening performed (asynchronous)
- Address stored in Cloud SQL `wallets` table

**Step 3: OFAC Screening**

- Wallet address checked against OFAC SDN lists
- If match found: Account flagged `is_sanctioned=True`
- If flagged: Sync suspended, user notified
- If clear: Sync proceeds normally

**Step 4: Initial Sync**

- Wallet balances fetched via blockchain APIs
- Transaction history fetched
- Data stored in Cloud SQL
- User sees wallet in dashboard

### 2.4 Account Limits Enforcement

**Free Tier Limits:**

- Maximum 2 traditional accounts
- Maximum 1 Web3 wallet
- Maximum 1 CEX account
- Enforcement: Block additional links when limit reached

**Pro Tier Limits:**

- Maximum 5 traditional accounts
- Maximum 5 investment accounts
- Maximum 5 Web3 wallets
- Maximum 5 CEX accounts
- Enforcement: Block additional links when limit reached

**Limit Exceeded Handling:**

- User notified of limit
- Upgrade prompt displayed (if Free Tier)
- User can remove existing accounts to add new ones
- User can upgrade to Pro Tier

### 2.4 Investment Account Linking (MVP)

**Plaid Investments API Flow:**

1. User initiates investment account connection

2. Plaid Link authentication flow

3. Account verification and initial sync

4. Investment account limits enforcement (5 accounts for Pro Tier)

5. Holdings and positions data sync

**Supported Brokerages (via Plaid):**

- Plaid supports multiple brokerages via its Investments API aggregation service

- Account type coverage (traditional brokerage, retirement accounts, cash management, crypto) to be verified with Plaid

### 2.5 Investment Account Linking (Post-MVP)

**SnapTrade OAuth Flow:**

1. User initiates brokerage connection for brokerages not supported by Plaid

2. SnapTrade OAuth authentication

3. Account verification and initial sync

4. Holdings and positions data sync

**Supported Brokerages (via SnapTrade):**

- SnapTrade supports brokerages not covered by Plaid's aggregation service

### 2.6 Manual Asset Tracking (MVP)

**User Entry Flow:**

1. User navigates to Manual Assets section

2. Selects asset type (House, Car, Collectible)

3. Enters asset details (name, value, purchase date, notes)

4. Asset saved and integrated with net worth tracking

**Asset Valuation Updates:**

- User can update asset values manually

- Values integrated into net worth calculations

- Historical value tracking

**Integration with Net Worth Tracking:**

- Manual assets included in total assets calculation

- Displayed alongside API-connected accounts

- Updates reflected in real-time net worth dashboard

---

## 3. Data Synchronization Procedures

### 3.1 Automatic Sync Schedule

**Sync Frequency:**

- Traditional accounts (Plaid): webhook-first automatic cursor sync + periodic safety-net job
- CEX accounts: Daily automatic sync
- Web3 wallets: Real-time or hourly (depending on chain)

**Sync Timing:**

- Scheduled via Cloud Scheduler
- Runs during off-peak hours (e.g., 2 AM Central)
- Plaid sync cannot be manually triggered by user

### 3.2 Manual Sync (Web3/CEX Only)

**User-Initiated Sync:**

- User clicks "Sync" for Web3/CEX account
- Sync request runs through existing account sync endpoint
- Status displayed to user
- User notified when complete

**Sync Limits:**

- Maximum 10 sync attempts per free-tier user per day (circuit breaker)
- Prevents runaway API costs
- User notified if limit reached

### 3.3 Sync Process

**Step 1: Job Queuing**

- Sync job created in Cloud Tasks
- Job includes: user ID, account IDs, sync type
- Job queued for processing

**Step 2: Authentication**

- Access tokens retrieved from Secret Manager
- Tokens validated
- API clients authenticated

**Step 3: Data Fetching**

- Data fetched from source (Plaid, CEX, blockchain)
- Read-only scopes verified (FinCEN compliance)
- Data normalized

**Step 4: Data Processing**

- Transactions categorized (ML model)
- Recurring transactions detected
- Budget calculations updated
- Financial health metrics calculated

**Step 5: Data Storage**

- Data written to Cloud SQL (transactions, balances)
- Metadata updated in Cloud SQL
- Usage metrics logged to Firestore
- Audit logs written to Cloud SQL (`audit.audit_log`) and archived to Coldline

**Step 6: User Notification**

- Sync completion notification (if enabled)
- Errors reported to user (if any)
- Sync status updated in UI

### 3.4 Sync Error Handling

**Error Types:**

- Authentication errors (expired tokens)
- API rate limits
- Network errors
- Data format errors
- Service unavailability

**Error Handling:**

- Errors logged via LogLedgerService into Cloud SQL (`audit.audit_log`)
- User notified of errors
- Retry logic implemented (with limits)
- Support ticket created for persistent errors

---

## 4. Support Procedures

**Primary Support Manager:** Kevin Pendergrass (Operations & Customer Success Manager)

- Location: Charlotte, North Carolina (Remote)
- Non-technical role; no coding responsibilities
- Handles all customer-facing support operations

### 4.1 Support Channels

**In-App Support:**

- Support chat (if implemented)
- Help center / knowledge base
- FAQ section
- Contact form

**Email Support:**

- Support email: [support@jualuma.com - to be determined]
- Response time target: 24-48 hours
- Ticket tracking system

**Phone Support:**

- [If implemented - phone number to be determined]
- Business hours only
- For Pro Tier users (if implemented)

### 4.2 Support Ticket Workflow

**Step 1: Ticket Creation**

- User submits support request
- Ticket created in support system
- Ticket number assigned
- Confirmation sent to user

**Step 2: Ticket Triage**

- Ticket categorized (technical, billing, account, etc.)
- Priority assigned (Low/Medium/High/Critical)
- Assigned to appropriate team member
- SLA timer started

**Step 3: Investigation**

- Support team investigates issue
- May request additional information from user
- May escalate to technical team
- Resolution identified

**Step 4: Resolution**

- Issue resolved
- Solution communicated to user
- User confirms resolution
- Ticket closed

**Step 5: Follow-Up**

- User satisfaction survey (optional)
- Ticket archived
- Knowledge base updated (if applicable)

### 4.3 Common Support Scenarios

**Account Linking Issues:**

- Authentication failures
- Institution not supported
- Connection timeouts
- Resolution: Troubleshoot, provide alternatives, escalate if needed

**Sync Issues:**

- Sync not completing
- Missing transactions
- Duplicate transactions
- Resolution: Manual sync, investigate, fix data if needed

**Billing Issues:**

- Payment failures
- Subscription questions
- Refund requests
- Resolution: Check Stripe, process refunds if appropriate, update subscription

**Feature Questions:**

- How to use features
- Feature availability
- Limitations
- Resolution: Provide guidance, direct to documentation, explain limitations

---

## 5. Escalation Paths

### 4.4 Kevin Pendergrass Support Workflow

**Daily Operations:**

- Monitor support channels: email (support@jualuma.com), in-app chat, and help center submissions
- Create tickets in the support system (workflow automation system TBD) and assign ticket numbers
- Triage tickets: categorize (technical, billing, account, feature questions), assign priority (Low/Medium/High/Critical), and start SLA timers
- Respond within 24-48 hours (per Section 4.1)

**Ticket Workflow:**

1. Create ticket, assign number, send confirmation
2. Triage: categorize, prioritize, assign, start SLA timer
3. Investigate: gather information, escalate to technical team if necessary
4. Resolve: communicate solution, confirm with user, close ticket
5. Follow-up: satisfaction survey, archive, update knowledge base

**Escalation Management:**

- Technical Issues → Founder/Technical Team (Trevon Collins)
- Compliance/Privacy Questions → Program Coordinator
- Billing Disputes → Founder/Finance (Trevon Collins)

For detailed Kevin Pendergrass responsibilities, see `Personnel.md`.

### 5. Escalation Paths

### 5.1 Technical Escalation

**Level 1: Support Team (Kevin Pendergrass)**

- Initial user contact
- Basic troubleshooting
- Common issues resolution
- Ticket management and triage

**Level 2: Technical Team (Trevon Collins)**

- Complex technical issues
- Bug investigation
- System issues
- Data integrity issues

**Level 3: Engineering/Development**

- Critical bugs
- System architecture issues
- Performance issues
- Security issues

**Level 4: Management/CTO**

- Critical system failures
- Security incidents
- Major outages
- Strategic decisions

### 5.2 Compliance Escalation

**Level 1: Support Team**

- Basic compliance questions
- Privacy questions
- Data access requests

**Level 2: Program Coordinator**

- GLBA compliance issues
- Security incidents
- Data breach concerns
- Risk assessment needs

**Level 3: Legal Counsel**

- Legal questions
- Regulatory concerns
- Contract issues
- Compliance violations

**Level 4: Management**

- Major compliance issues
- Regulatory investigations
- Legal actions
- Strategic compliance decisions

### 5.3 Billing Escalation

**Level 1: Support Team**

- Payment questions
- Subscription changes
- Basic billing issues

**Level 2: Billing/Finance**

- Refund requests
- Payment disputes
- Subscription issues
- Tax questions

**Level 3: Management**

- Major billing disputes
- Policy decisions
- Strategic pricing

---

## 6. Data Access Procedures

### 6.1 User Data Access Requests

**Right to Access (CCPA/GLBA):**

- User requests access to their data
- Request verified (identity verification)
- Data compiled and provided
- Response within required timeframe (45 days CCPA, 30 days GLBA)

**Data Export:**

- User data exported from all systems
- Data formatted appropriately
- Secure delivery method
- Delivery confirmed

### 6.2 Data Deletion Requests

**Right to be Forgotten:**

- User requests account deletion
- Identity verified
- User DEK destroyed in KMS
- Encrypted data becomes unreadable
- Physical deletion scheduled (24 hours after key destruction)
- User notified of deletion

**Deletion Process:**

1. User requests deletion
2. Identity verified
3. User DEK destroyed
4. Deletion job scheduled
5. Data deleted from all systems
6. Deletion confirmed to user

---

## 7. Operational Monitoring

### 7.1 System Monitoring

**Key Metrics:**

- API response times
- Error rates
- Sync success rates
- User activity
- System resource usage

**Monitoring Tools:**

- Google Cloud Monitoring
- Google Cloud Logging
- Custom dashboards
- Alerting configured

### 7.2 Business Metrics

**Key Metrics:**

- User sign-ups
- Account linking success rate
- Subscription conversions
- User retention
- Support ticket volume

**Reporting:**

- Daily metrics dashboard
- Weekly business reports
- Monthly business reviews
- Quarterly business analysis

---

## 8. Incident Response Procedures

### 8.1 Operational Incidents

**Service Outages:**

- Detect outage
- Assess impact
- Notify users (if significant)
- Work to restore service
- Post-incident review

**Data Issues:**

- Detect data inconsistency
- Investigate root cause
- Fix data if possible
- Notify affected users
- Prevent recurrence

### 8.2 Security Incidents

**Reference:** See IRP-Framework.md for detailed security incident procedures.

**Key Steps:**

1. Detect incident
2. Activate IRP
3. Contain threat
4. Investigate
5. Notify (if required)
6. Recover
7. Post-incident review

---

## 9. Change Management

### 9.1 Feature Releases

**Release Process:**

1. Feature developed and tested
2. Legal review (if required)
3. Management approval
4. Staged rollout (if applicable)
5. Monitor for issues
6. Full release

**Communication:**

- Release notes published
- Users notified of significant changes
- Help documentation updated
- Support team trained

### 9.3 Feature Preview Rollout & Support

**Preflight Checklist (Owner: Product + Marketing)**

1. Preview Brief approved (feature key, target tier, success metric).
2. Synthetic data validated via `pnpm preview:validate` and approved by Compliance.
3. Marketing copy reviewed per `Preview-Content-Playbook.md` + `Marketing-Content-Guidelines.md`.
4. Support script added to Appendix A (see "Preview Mode Upgrade Prompt" template).
5. Remote Config rules staged (`feature_preview.enabled=false`, per-feature flag created).

#### Launch Procedure

- Stage the build behind `feature_preview.<featureKey>.enabled=false`.
- Enable preview for 5% of Free users (Remote Config audience) and monitor KPIs for 24 hours.
- If metrics ≥ targets, raise flag to 100% and update release notes + Help Center article.

#### Kill Switch / Rollback

- Support or Ops may disable a preview by toggling `feature_preview.<featureKey>.kill_switch=true` in Remote Config (document timestamp + reason).
- If synthetic data issue is detected, run `pnpm preview:rollback --build=<id>` and redeploy before re-enabling.
- All kill switch activations require follow-up in the Weekly Ops review with a remediation plan.

#### Support Scripts

- When users ask why a feature is "read-only," agents reference the Preview Mode script: explain that the UI is illustrative, highlight upgrade path, re-state that jualuma is non-custodial and does not provide advice.
- Tag Zendesk tickets with `preview_feedback` for analytics; escalate recurring confusion to Product/Growth.

#### Monitoring

- Ops dashboard watches: preview modal conversion, dwell time, blocked interaction spikes, kill-switch status.
- Any KPI breaching thresholds defined in the M&E Framework triggers an incident-like retrospective focused on UX/Copy adjustments rather than technical outage response.

### 9.2 Policy Changes

**Policy Update Process:**

1. Policy change identified
2. Draft updated policy
3. Legal review
4. Management approval
5. Users notified
6. Policy published
7. Acceptance required (if Terms/Privacy)

---

## 10. AI/ML Operations

### 10.1 Categorization Pipeline Runbook

- **Training Cadence:** Nightly at 03:00 CT via Vertex AI Pipelines (`categorization_pipeline`).
- **Feature Sources:**
  - Free Tier → Cloud SQL `ledger_hot_free` (45-day window).
  - Essential Tier → Cloud SQL `ledger_hot_essential` (30-day window + Coldline archive).
  - Pro/Ultimate → Cloud SQL `ledger_pro`.
- **Model Registry:** Vertex AI Model Registry entry `categorization_model`. Promotions require QA sign-off plus canary traffic (10%) for 1 hour before full rollout.

### 10.2 Monitoring & Alerting

- **Primary Metric:** Per-category precision >= 90% (Vertex AI Model Monitoring).
- **Secondary Metrics:** Review queue backlog (target < 500 open items), average inference latency (<300 ms).
- **Alerts:** PagerDuty integration triggers when precision < 90% for 15 minutes or backlog doubles week-over-week. Alerts auto-kickoff a retraining pipeline.

### 10.3 Rollback Procedure

1. Freeze traffic to the current model by adjusting the Vertex AI endpoint split to route 100% to the prior model version (`gcloud beta ai endpoints update ...` or `promote_model.py --rollback`).
2. Notify Support to pause auto-categorization for affected tiers if accuracy drops below 85%.
3. Investigate feature drift (Dataflow logs, schema changes, tier retention misconfigurations).
4. After remediation, redeploy new model and restore traffic gradually (10% → 50% → 100%).

### 10.4 Data Retention Hygiene

- Verify nightly jobs (`free-ledger-pruner`, `essential-ledger-archiver`) complete before training window; failures must be resolved before launching the next pipeline to avoid stale/oversized datasets.
- Archive job metrics logged to the Cloud SQL audit ledger (`tier_retention_logs`) for auditability.

---

## 10. Quality Assurance

### 10.1 Testing Procedures

**Pre-Release Testing:**

- Unit tests
- Integration tests
- End-to-end tests
- Security testing
- Accessibility testing

**Post-Release Monitoring:**

- Error monitoring
- Performance monitoring
- User feedback
- Support ticket analysis

### 10.2 Quality Metrics

**Track:**

- Bug rates
- Error rates
- User satisfaction
- Support ticket volume
- Feature adoption

---

## 11. AI Agent Integration

### 11.1 AI Agent Operations

Intellifide, LLC employs heavy automation with AI agents performing many traditional functions (board of directors, operations). Employees monitor and critique AI agent performance rather than performing tasks manually, creating an efficiency loop.

**AI Agent Functions:**

- Board of directors functions automated through AI agents
- Operations management automated through AI agents
- Customer support automation (with human oversight by Kevin Pendergrass)
- Content generation automation (with human review by Kevin Pendergrass)
- Data analysis and reporting automation

**Employee Role (Kevin Pendergrass):**

- Monitor AI agent performance
- Critique AI agent outputs
- Provide feedback for AI agent improvement
- Escalate issues when AI agents fail or produce incorrect results
- Learn by observing and critiquing AI agent behavior

### 11.2 AI Agent Monitoring Procedures

**Daily Monitoring:**

- Review AI agent outputs for accuracy and quality
- Identify patterns in AI agent errors or inefficiencies
- Document improvements needed
- Provide feedback to technical team for AI agent refinement

**Quality Control:**

- Human oversight ensures quality and catches errors
- Employees learn by monitoring and critiquing AI
- Continuous improvement loop: AI agents improve based on employee feedback

**Escalation:**

- AI agent failures → Technical Team (Trevon Collins)
- AI agent quality issues → Technical Team for refinement
- Critical AI agent errors → Immediate escalation to Founder/Technical Lead

For detailed AI automation strategy, see `Personnel.md` and `Business-Model-Evolution-Plan.md`.

---

## 12. Appendices

### Appendix A: Support Scripts

#### Preview Mode Upgrade Prompt (Version 1.0)

> _When a Free user reports that a screen is "read-only" or cannot be edited._

1. Thank the user for exploring the feature.
2. Explain that the panel is currently in Preview Mode and is showing illustrative data only.
3. Reiterate that jualuma is non-custodial and does not execute transactions or provide financial advice.
4. Provide the direct link to `/userSettings?tab=subscription` to upgrade, mentioning Texas SaaS tax disclosure.
5. If the user declines to upgrade, capture feedback (what information they expected) and tag the ticket `preview_feedback`.

[Additional templates to be added as they are authored.]

### Appendix B: Escalation Contact List

**Technical Issues:**

- Founder/Technical Lead: Trevon Collins

**Compliance/Privacy Questions:**

- Program Coordinator: [To be designated]

**Billing Disputes:**

- Founder/Finance: Trevon Collins

**Operations/Support:**

- Operations & Customer Success Manager: Kevin Pendergrass (Charlotte, NC, Remote)

### Appendix C: Operational Checklists

[Checklists for common operational tasks]

---

**Next Review:** February 14, 2026

**Maintained By:** Operations Team / Program Coordinator

---

**Note:** These procedures should be updated as processes evolve. All team members should be trained on these procedures and have access to this document.

**Last Updated:** 2026-01-18 at 03:06 AM CST (Modified 01/18/2026 03:06 Central Time per rules)
