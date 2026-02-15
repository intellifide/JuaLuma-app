# Data Flow Diagrams

## jualuma Platform - Intellifide, LLC

## Overview

This document provides data flow diagrams and descriptions for the jualuma platform, showing how user data flows through the system from collection to display. These diagrams support security architecture, compliance documentation, and development planning.

**Review Frequency:** As architecture changes

**Related Documents:**

- `Master App Dev Guide.md` - Technical specification (data storage, architecture)
- `Security-Architecture.md` - Security architecture (data protection, encryption)
- `WISP-Framework.md` - Security program framework (data handling requirements)
- `Privacy-Policy.md` - Privacy Policy (data collection and use)
- `Compliance-Checklist.md` - Compliance requirements (data privacy, GLBA)

---

## 1. Overall Data Flow Architecture

### 1.1 High-Level Data Flow

```
User → jualuma Platform → Data Aggregation → Storage → Processing → Display → User
```

**Key Components:**

1. **User Input:** Account linking, preferences, queries
2. **Data Aggregation:** Plaid, CEX APIs, Web3 wallets
3. **Storage**: Cloud SQL (ledger + log ledger), Google Cloud Firestore, Cloud Storage (Coldline archive)
4. **Processing:** Categorization, AI analysis, calculations
5. **Display:** Dashboard, reports, insights
6. **User Output:** Visualizations, notifications, responses

---

## 2. User Data Collection Flow

### 2.1 Account Linking Flow

```
User
  │
  ├─→ Select Account Type (Bank/CEX/Web3)
  │
  ├─→ Traditional Bank (Plaid)
  │     │
  │     ├─→ Plaid Link Initiated
  │     ├─→ User Authenticates with Bank
  │     ├─→ Public Token Received
  │     ├─→ Token Exchanged for Access Token
  │     ├─→ Access Token → Secret Manager
  │     └─→ Secret Reference → Cloud SQL (accounts table)
  │
  ├─→ Investment Account (Plaid Investments API)
  │     │
  │     ├─→ Plaid Link Initiated
  │     ├─→ User Authenticates with Brokerage
  │     ├─→ Public Token Received
  │     ├─→ Token Exchanged for Access Token
  │     ├─→ Access Token → Secret Manager
  │     └─→ Secret Reference → Cloud SQL (accounts table)
  │
  ├─→ CEX Account
  │     │
  │     ├─→ OAuth Flow or API Key Entry
  │     ├─→ API Key Validated (Read-Only)
  │     ├─→ API Key → Secret Manager
  │     └─→ Secret Reference → Cloud SQL (accounts table)
  │
  └─→ Web3 Wallet
        │
        ├─→ User Provides Wallet Address
        ├─→ Address Validated
        ├─→ Address → Cloud SQL (wallets table)
        ├─→ Token Balance Retrieval
        ├─→ NFT Balance Retrieval
        └─→ Blockchain APIs for Data
```

### 2.2 Data Collection Security Checkpoints

**Checkpoint 1: Authentication**

- User must be authenticated (GCP Identity Platform)
- Session validated
- User permissions checked

**Checkpoint 2: Account Limits**

- Free Tier: Max 2 traditional, 1 Web3, 1 CEX
- Pro Tier: Max 5 traditional, 5 Web3, 5 CEX
- Limits enforced before linking

**Checkpoint 3: Read-Only Verification**

- API scopes verified (read-only only)
- Trade/move/withdraw scopes blocked
- FinCEN compliance enforced

**Checkpoint 4: Secret Storage**

- Credentials stored in Secret Manager only
- Never stored in database
- Secret references stored in Cloud SQL

---

## 3. Data Aggregation Pipeline

### 3.1 Traditional Account Aggregation (Plaid)

```
Cloud Scheduler (Daily Sync)
  │
  ├─→ Cloud Run Job Triggered
  │
  ├─→ Retrieve Access Token from Secret Manager
  │
  ├─→ Authenticate with Plaid API
  │
  ├─→ Fetch Transactions (Read-Only)
  │     │
  │     ├─→ Transaction Data
  │     ├─→ Account Balances
  │     └─→ Account Metadata
  │
  ├─→ Data Normalization
  │     │
  │     ├─→ Standardize Formats
  │     ├─→ Currency Conversion
  │     └─→ Date Normalization
  │
  ├─→ Publish to Pub/Sub
  │     │
  │     └─→ Event: "transaction.received"
  │
  └─→ Store in Cloud SQL
        │
        ├─→ transactions table
        ├─→ accounts table (balance update)
        └─→ Audit log to Cloud SQL (`audit.audit_log`) via LogLedgerService
```

### 3.2 CEX Account Aggregation

```
Cloud Scheduler (Daily Sync)
  │
  ├─→ Cloud Run Job Triggered
  │
  ├─→ Retrieve API Key from Secret Manager
  │
  ├─→ Authenticate with CEX API
  │
  ├─→ Verify Read-Only Scope
  │
  ├─→ Fetch Data (Read-Only)
  │     │
  │     ├─→ Balances
  │     ├─→ Transaction History
  │     └─→ Positions
  │
  ├─→ Data Normalization
  │
  ├─→ Publish to Pub/Sub
  │
  └─→ Store in Cloud SQL
        │
        ├─→ transactions table
        ├─→ positions table
        └─→ Audit log to Cloud SQL (`audit.audit_log`) via LogLedgerService
```

### 3.3 Web3 Wallet Aggregation

```
Cloud Scheduler (Hourly/Real-Time)
  │
  ├─→ Cloud Run Job Triggered
  │
  ├─→ Retrieve Wallet Addresses from Cloud SQL
  │
  ├─→ Query Blockchain APIs
  │     │
  │     ├─→ Ethereum: Ethers.js / Infura
  │     ├─→ Solana: Solana Web3.js
  │     └─→ Other Chains: Chain-specific APIs
  │
  ├─→ Fetch Data
  │     │
  │     ├─→ Wallet Balances
  │     ├─→ Transaction History
  │     └─→ Token Holdings
  │
  ├─→ Data Normalization
  │
  ├─→ Publish to Pub/Sub
  │
  └─→ Store in Cloud SQL
        │
        ├─→ transactions table
        ├─→ positions table
        └─→ Audit log to Cloud SQL (`audit.audit_log`) via LogLedgerService
```

### 3.4 Investment Account Aggregation (Plaid Investments API)

**Plaid Investments API Integration Flow:**

1. User connects investment account via Plaid Link

2. Plaid Investments API authentication

3. Holdings and positions data retrieval

4. Data normalization (standardized format)

5. Portfolio value calculation

6. Investment transaction history sync

**Supported Brokerages (via Plaid):**

- Plaid supports multiple brokerages via its Investments API aggregation service

**Data Flow:**

- Plaid API → DataSyncService → Normalization Engine → Cloud SQL (Ledger)

- Real-time portfolio value updates

- Historical position tracking

### 3.5 Investment Account Aggregation (SnapTrade - Backlog)

**SnapTrade API Integration Flow:**

1. User connects brokerage not supported by Plaid via SnapTrade

2. SnapTrade OAuth authentication

3. Holdings and positions data retrieval

4. Data normalization (standardized format)

5. Portfolio value calculation

6. Investment transaction history sync

**Supported Brokerages (via SnapTrade):**

- SnapTrade supports brokerages not covered by Plaid's aggregation service

### 3.6 Manual Asset Tracking

**User Entry Flow:**

1. User navigates to Manual Assets section

2. Enters asset details (type, name, value, purchase date)

3. Asset data stored in manual_assets table

4. Asset value integrated into net worth calculation

5. Real-time net worth dashboard update

**Data Flow:**

- User Input → Manual Asset Service → Cloud SQL (Metadata) → Net Worth Calculation Service → Dashboard

---

## 4. Data Processing Flow

### 4.1 Transaction Categorization

```
Pub/Sub Event: "transaction.received"
  │
  ├─→ CategorizationService Triggered
  │
  ├─→ ML Model Processing
  │     │
  │     ├─→ Transaction Analysis
  │     ├─→ Merchant Recognition
  │     ├─→ Category Prediction
  │     └─→ Confidence Score
  │
  ├─→ EnrichmentService
  │     │
  │     ├─→ Check Firestore enrich_cache
  │     ├─→ Merchant Logo/Name Lookup
  │     └─→ Update Cache if Miss
  │
  ├─→ Category Assignment
  │     │
  │     ├─→ High Confidence: Auto-assign
  │     └─→ Low Confidence: Add to Review Queue
  │
  └─→ Store in Cloud SQL
        │
        ├─→ transactions table (category updated)
        └─→ Review queue (if low confidence)
```

### 4.2 Recurring Transaction Detection

```
Transaction History (Cloud SQL)
  │
  ├─→ RecurringService Analysis
  │
  ├─→ Pattern Detection
  │     │
  │     ├─→ Frequency Analysis
  │     ├─→ Amount Similarity
  │     ├─→ Merchant Matching
  │     └─→ Date Pattern Recognition
  │
  ├─→ Series Identification
  │
  ├─→ Store in Cloud SQL
  │     │
  │     └─→ recurring table
  │           │
  │           ├─→ series_id
  │           ├─→ merchant
  │           ├─→ amount_est
  │           └─→ next_due
  │
  └─→ User Notification (if enabled)
```

### 4.3 Budget Calculation

```
User Budget Settings (Cloud SQL)
  │
  ├─→ BudgetService Triggered (Daily)
  │
  ├─→ Fetch Transactions (Cloud SQL)
  │     │
  │     └─→ Filter by Category and Date Range
  │
  ├─→ Calculate Budget Status
  │     │
  │     ├─→ Total Spent
  │     ├─→ Budget Limit
  │     ├─→ Remaining Budget
  │     ├─→ Percentage Used
  │     └─→ Rollover Calculation
  │
  ├─→ Store Results (Cloud SQL or Cache)
  │
  └─→ User Notification (if threshold hit)
```

### 4.4 ML Categorization Training & Serving

```
Cloud SQL (tier-specific windows)
  │
  ├─→ Dataflow Job: categorization-feature-builder
  │     └─→ Writes Parquet features to Cloud Storage (gs://jualuma-ml-features/dt=YYYY-MM-DD/)
  │
  ├─→ Vertex AI Pipelines (Nightly)
  │     ├─→ Data Validation
  │     ├─→ TensorFlow Training (multi-class classifier)
  │     ├─→ Evaluation (Precision/Recall per category)
  │     └─→ Register Model in Vertex AI Model Registry
  │
  ├─→ Vertex AI Endpoint (categorization-prod)
  │     └─→ Exposes latest model for CategorizationService
  │
  └─→ Monitoring & Retraining
        │
        ├─→ Vertex AI Model Monitoring (precision < 90% alert)
        ├─→ Auto-trigger pipeline run on drift/alerts
        └─→ Rollback via endpoint traffic split if regression detected
```

---

## 5. AI Processing Flow

### 5.1 AI Chat Request Flow

```
User → POST /chat
  │
  ├─→ Authentication Check
  │
  ├─→ Quota Check (Firestore)
  │     │
  │     ├─→ Free Tier: Check cloud quota (5/day) for Vertex AI Gemini 2.5 Flash
  │     └─→ Pro Tier: Check cloud quota (50/month)
  │
  ├─→ Feature Flag Check (GCP Runtime Config)
  │     │
  │     └─→ ENABLE_AI_GATEWAY must be True
  │
  ├─→ RAG Context Injection
  │     │
  │     ├─→ Fetch Budget Status (Cloud SQL)
  │     ├─→ Fetch Net Worth (Cloud SQL)
  │     └─→ Prepend to System Prompt
  │
  ├─→ PII Sanitization (Cloud DLP)
  │     │
  │     ├─→ Redact Account Numbers
  │     ├─→ Redact SSNs
  │     ├─→ Redact Legal Names
  │     └─→ Redact Private Keys
  │
  ├─→ Encryption (User DEK)
  │     │
  │     ├─→ Retrieve User DEK from KMS
  │     ├─→ Encrypt Redacted Prompt
  │     └─→ Store DEK Reference
  │
  ├─→ LLM API Call
  │     │
  │     └─→ Cloud LLM (All Tiers): Vertex AI Gemini (Gemini 2.5 Flash; upgrade path to Gemini 3 series)
  │
  ├─→ Response Processing
  │     │
  │     ├─→ Encrypt Response (User DEK)
  │     └─→ Stream to User
  │
  └─→ Log Ledger (Cloud SQL + Coldline)
        │
        ├─→ audit.llm_logs table
        │     │
        │     ├─→ Encrypted `redacted_prompt`
        │     ├─→ Encrypted `redacted_response`
        │     ├─→ Model used
        │     ├─→ Tokens consumed
        │     └─→ Timestamp + user_dek_ref
        │
        └─→ Usage Metering (Firestore)
              │
              └─→ api_usage table (quota tracking)
```

### 5.2 AI Processing Security Checkpoints

**Checkpoint 1: Quota Enforcement**

- Free Tier: 5 cloud queries/day (Vertex AI Gemini 2.5 Flash)
- Essential Tier: 75 cloud queries/day limit
- Pro Tier: 75 cloud queries/day limit (shared with Essential Tier)
- Ultimate Tier: 80 cloud queries/day limit
- Hard limit: 5 requests/minute (burst protection)

**Checkpoint 2: Feature Flag**

- ENABLE_AI_GATEWAY must be True
- Kill switch capability
- Instant shutdown if needed

**Checkpoint 3: PII Redaction**

- All prompts pass through Cloud DLP
- Account numbers, SSNs, names redacted
- Redacted version used for LLM

**Checkpoint 4: Encryption**

- Raw prompt encrypted with User DEK
- Raw response encrypted with User DEK
- Logs stored encrypted in Cloud SQL (`audit.llm_logs`) and mirrored to Coldline via nightly exports

**Checkpoint 5: Token Limits**

- max_tokens explicitly set (e.g., 1024)
- Prevents infinite generation loops
- Cost control measure

---

## 6. Storage Architecture Flow

### 6.1 Data Storage by Type

```
Data Type → Storage Decision → Storage Location
  │
  ├─→ Financial Transactions → Cloud SQL (Ledger)
  │     │
  │     ├─→ transactions table
  │     ├─→ Indexes: uid+ts, uid+category
  │     └─→ ACID guarantees
  │
  ├─→ User Metadata → Cloud SQL (PostgreSQL)
  │     │
  │     ├─→ users table
  │     ├─→ subscriptions table
  │     ├─→ ai_settings table
  │     └─→ Relational integrity
  │
  ├─→ High-Velocity Metrics → Firestore
  │     │
  │     ├─→ api_usage table
  │     ├─→ enrich_cache table
  │     ├─→ widget_engagement table
  │     └─→ High write throughput
  │
  ├─→ Logs and Analytics → Cloud SQL audit schema + Coldline archive
  │     │
  │     ├─→ audit.llm_logs table (encrypted, append-only)
  │     ├─→ audit.audit_log table
  │     └─→ Nightly Coldline Parquet export for 7-year retention
  │
  └─→ Secrets → Secret Manager
        │
        ├─→ API keys
        ├─→ OAuth tokens
        └─→ Never in database
```

**Tier-Specific Hot Windows:**

- **Free Tier:** Transactions live in Cloud SQL table `ledger_hot_free` for 45 days. The nightly `free-ledger-pruner` Cloud Run Job (triggered via Cloud Scheduler at 02:00 CT) deletes data older than 45 days; no archive copy exists.
- **Essential Tier:** Transactions live in Cloud SQL table `ledger_hot_essential` for 30 days. The `essential-ledger-archiver` job copies aged rows into Coldline (`gs://jualuma-ledger-archive/essential/<uid>/<YYYY>/<MM>`) before pruning the hot table.
- **Pro/Ultimate:** Continue to rely on Cloud SQL Enterprise Plus for full-history storage; no hot-window pruning is applied.

### 6.2 Data Flow to Storage

**Transaction Data:**

```
Plaid/CEX/Web3 → Normalization → Pub/Sub → CategorizationService → Cloud SQL
```

**User Data:**

```
User Input → FastAPI → Validation → Cloud SQL
```

**Usage Metrics:**

```
API Calls → FastAPI → Firestore (api_usage)
```

**Logs:**

```
All Services → LogLedgerService → Cloud SQL (audit.llm_logs, audit.audit_log) → Coldline export
```

---

## 7. User Display Pipeline

### 7.1 Dashboard Data Flow

```
User → GET /dashboard
  │
  ├─→ Authentication Check
  │
  ├─→ Fetch User Data (Parallel)
  │     │
  │     ├─→ Accounts (Cloud SQL)
  │     ├─→ Recent Transactions (Cloud SQL, Index: uid+ts)
  │     ├─→ Budget Status (Cloud SQL or Cache)
  │     ├─→ Net Worth (Cloud SQL, calculated)
  │     └─→ Recurring Items (Cloud SQL)
  │
  ├─→ Aggregate Data
  │     │
  │     ├─→ Calculate Totals
  │     ├─→ Group by Category
  │     └─→ Format for Display
  │
  ├─→ Apply User Preferences
  │     │
  │     ├─→ Theme (Glass/High-Contrast)
  │     └─→ Display Options
  │
  └─→ Return to Frontend
        │
        └─→ Render Dashboard (React)
```

### 7.2 Transaction Feed Flow

```
User → GET /transactions
  │
  ├─→ Authentication Check
  │
  ├─→ Parse Query Parameters
  │     │
  │     ├─→ Date Range
  │     ├─→ Category Filter
  │     ├─→ Account Filter
  │     └─→ Search Term
  │
  ├─→ Query Cloud SQL
  │     │
  │     ├─→ Use Index: Idx_Transactions_Uid_Ts_Desc
  │     ├─→ Filter by uid, date, category
  │     └─→ Sort by timestamp DESC
  │
  ├─→ Apply Filters
  │
  ├─→ Paginate Results
  │
  └─→ Return to Frontend
        │
        └─→ Display in Unified Feed
```

---

## 8. Security Checkpoints Throughout Flow

### 8.1 Authentication Checkpoints

**Every Request:**

- User authenticated (GCP Identity Platform token)
- Token validated
- User permissions checked
- Session active

### 8.2 Authorization Checkpoints

**Data Access:**

- User can only access their own data
- uid verified on all queries
- Row-level security enforced
- No cross-user data access

### 8.3 Encryption Checkpoints

**Data at Rest:**

- All NPPI encrypted (AES-256)
- Encryption keys in KMS
- Database encryption enabled

**Data in Transit:**

- TLS 1.3 for all communications
- mTLS for API-to-API (where feasible)
- No unencrypted transmission

### 8.4 Compliance Checkpoints

**FinCEN:**

- Read-only scope verification
- No transaction initiation
- No fund movement

**GLBA:**

- NPPI handling documented
- Access logged
- Encryption verified

---

## 9. Data Flow Diagrams by Use Case

### 9.1 User Onboarding Flow

```
New User
  │
  ├─→ Register Account (GCP Identity Platform)
  │     │
  │     └─→ User Created in Cloud SQL
  │
  ├─→ Accept Terms of Service
  │
  ├─→ Accept Privacy Policy
  │
  ├─→ Link First Account
  │     │
  │     └─→ See Account Linking Flow (Section 2.1)
  │
  ├─→ Initial Data Sync
  │     │
  │     └─→ See Data Aggregation Pipeline (Section 3)
  │
  └─→ View Dashboard
        │
        └─→ See User Display Pipeline (Section 7)
```

### 9.2 AI Chat Flow

```
User Types Question
  │
  ├─→ See AI Processing Flow (Section 5.1)
  │
  ├─→ RAG Context Added
  │
  ├─→ PII Redacted
  │
  ├─→ Encrypted and Sent to LLM
  │
  ├─→ Response Received
  │
  ├─→ Encrypted and Logged
  │
  └─→ Streamed to User
```

### 9.3 Budget Alert Flow

```
Daily Budget Calculation
  │
  ├─→ BudgetService Runs
  │
  ├─→ Calculate Spending vs. Budget
  │
  ├─→ Check Threshold (e.g., 80%)
  │
  ├─→ If Threshold Hit:
  │     │
  │     ├─→ Check Notification Preferences
  │     │
  │     ├─→ Send Notification
  │     │     │
  │     │     ├─→ In-App (if enabled)
  │     │     ├─→ Email (SendGrid, if enabled)
  │     │     └─→ SMS (Twilio, if enabled)
  │     │
  │     └─→ Log Notification (Cloud SQL `audit.audit_log`)
```

---

## 10. Data Flow Security Summary

### 10.1 Data Collection Security

- User authentication required
- Read-only API scopes enforced
- Credentials in Secret Manager only

### 10.2 Data Transmission Security

- TLS 1.3 for all connections
- mTLS for API-to-API
- Encrypted payloads
- Secure token exchange

### 10.3 Data Storage Security

- Encryption at rest (AES-256)
- Keys in KMS
- Access controls
- Audit logging

### 10.4 Data Processing Security

- PII redaction before AI processing
- Encryption with User DEK
- Quota enforcement
- Feature flag controls

### 10.5 Data Display Security

- User authentication
- Row-level security
- No cross-user access
- Secure API responses

---

## 11. Appendices

### Appendix A: Detailed Flow Diagrams

[More detailed diagrams can be created using tools like Draw.io, Lucidchart, or Mermaid]

### Appendix B: API Endpoint Data Flows

[Detailed flows for each API endpoint]

### Appendix C: Error Handling Flows

[How errors flow through the system]

---

**Next Review:** As architecture changes

**Maintained By:** Technical Team / Architecture Team

---

**Note:** These diagrams should be updated as the architecture evolves. Consider using diagramming tools for visual representations of these flows.

**Last Updated:** December 19, 2025 at 01:50 PM CT (Modified 12/19/2025 13:50 Central Time per rules)
