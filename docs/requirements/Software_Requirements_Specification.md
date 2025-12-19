# Software Requirements Specification (SRS)

## 1. Introduction
This document outlines the specific software requirements, including functional behaviors, data models, and APIs for the jualuma Application.

## 2. Functional Requirements

### 2.1 Authentication & Authorization
*   **SR-01**: The system MUST authorize users via Firebase Auth Tokens (Bearer).
*   **SR-02**: The system MUST enforce Role-Based Access Control (RBAC) using the `users.role` field (User vs. Support Agent).
*   **SR-03**: The system MUST enforce Tier-Based Access Control (TBAC) for premium features (e.g., Investment Aggregation requires 'Pro').

### 2.2 Account Management
*   **SR-04**: The system MUST allow linking of traditional bank accounts via Plaid Link.
*   **SR-05**: The system MUST allow linking of crypto wallets via public address input.
*   **SR-06**: The system MUST limit the number of linked accounts based on the user's subscription tier (Free: 2, Essential: 5, Pro: 10, Ultimate: 20).

### 2.3 Financial Data Aggregation
*   **SR-07**: The system MUST normalize transactions from all sources (Plaid, CEX, Web3) into a unified `Transaction` format.
*   **SR-08**: The system MUST automatically categorize transactions using a Machine Learning model.
*   **SR-09**: The system MUST recalculate Net Worth whenever account balances are updated.

### 2.4 AI Assistant
*   **SR-10**: The AI Assistant MUST accept natural language queries.
*   **SR-11**: The system MUST inject relevant financial context (RAG) into the AI prompt based on the user's query.
*   **SR-12**: The system MUST encrypt all LLM prompts and responses at rest using per-user DEKs.

### 2.5 Widget Marketplace
*   **SR-13**: The system MUST provide a sandbox environment (MCP) for 3rd-party widgets.
*   **SR-14**: The system MUST prevent widgets from executing write operations or exfiltrating data (Read-Only/Non-Custodial).
*   **SR-15**: The system MUST track widget engagement (downloads/ratings) for developer payouts.

## 3. Data Models
*Ref: Master App Dev Guide Section 4.0*

### 3.1 Core Entity Relationship Diagram (ERD) Abstract
*   **User** (`users`): Identity root. Linked to Firebase UID.
*   **Account** (`accounts`): Financial container. Linked to User.
*   **Transaction** (`transactions`): Financial event. Linked to Account.
*   **Metric** (`daily_balances`): Historical data point. Linked to Account.

### 3.2 Schema Definitions
*   **Users**: `uid`, `email`, `role`, `tier`, `currency_pref`.
*   **Transactions**: `id`, `account_id`, `amount`, `currency`, `category`, `merchant`, `date`.
*   **Subscriptions**: `uid`, `status` (active/past_due), `plan` (free/pro/etc).
*   **Audit Logs**: `actor_uid`, `action`, `target`, `timestamp` (Immutable).

## 4. Interface Requirements (API)

### 4.1 REST API Structure
The Backend exposes a RESTful API via FastAPI.
*   `GET /api/me`: User Profile.
*   `GET /api/accounts`: List linked accounts.
*   `GET /api/transactions`: Search/Filter transactions.
*   `POST /api/chat`: AI Assistant interaction.
*   `GET /api/widgets`: Marketplace catalog.

### 4.2 Error Handling
*   **400 Bad Request**: Validation failure.
*   **401 Unauthorized**: Missing/Invalid Token.
*   **403 Forbidden**: Insufficient Tier or Role.
*   **404 Not Found**: Resource does not exist.
*   **429 Too Many Requests**: Rate limit exceeded (AI Quota).

## 5. Non-Functional Requirements

### 5.1 Performance requirements
*   **Throughput**: Support 10,000 concurrent active users.
*   **Response Time**: < 200ms for cached data, < 2s for AI responses (streaming start).

### 5.2 Security Requirements
*   **PII Protection**: All PII (Personally Identifiable Information) must be minimized.
*   **Encryption**: AES-256 for data at rest; TLS 1.3 for data in transit.
*   **Audit**: All sensitive actions (Login, Payout, Data Export) must be logged.

### 5.3 Reliability
*   **Backup**: Daily automatic snapshots of Cloud SQL.
*   **Failover**: Regional failover for Database and Compute.
