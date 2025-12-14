# [TASK-001]: Account Integrations (Web3 & CEX)
**Status**: `Draft`
**Notion Task**: [N/A]
**PR**: [Pending]

---

## 1. Specification (The "What")
### User Story
As a **User**, I want to **link my Crypto Wallets and Exchange Accounts** so that **I can view my holistic net worth in one dashboard**.

### Context
*   **Current State**: "Coming Soon" placeholders in UI. Connector logic exists but is disconnected.
*   **Desired State**: Users can input ETH addresses and CEX API Keys. The system automatically syncs balances/trades.

### Business Rules
- [x] **FinCEN Compliance**: strictly **Read-Only**. No transaction signing or fund movement capability.
- [ ] **Tax Logic**: N/A for this phase.
- [x] **Tier Gating**: CEX connections restricted to **Pro** tier? (To be decided, currently open).
- [x] **Validation**:
    - ETH Addresses must pass checksum validation.
    - CEX Credentials must be validated against the exchange API (ping check).

---

## 2. Technical Design (The "How")
### Security Impact Analysis (CRITICAL)
*   **Zero Trust**: Secrets are never trusted in plain text.
*   **Encryption at Rest**:
    - **CEX API Secrets** MUST be encrypted using `backend.utils.encryption` (AES-256 equivalent logic) before insertion into `accounts.secret_ref`.
    - **Keys**: `Account.secret_ref` holds the **ciphertext**.
    - **Decryption**: Occurs only in `backend/services/connectors.py` scope, immediately before the external CCXT call. Memory is cleared post-request (Python GC).

### Architecture Changes
#### Database
*   **No Schema Changes Required**: Reusing `accounts` table.
    - `provider`: "ethereum", "coinbase", "kraken".
    - `account_id`: Wallet Address or Exchange User ID.
    - `secret_ref`: Encrypted API Secret (CEX only).

#### API
*   **New Endpoints**:
    *   `POST /api/accounts/link/web3`
    *   `POST /api/accounts/link/cex`
*   **Schemas**:
    *   `Web3LinkRequest(address: str, chain_id: int, name: str)`
    *   `CexLinkRequest(exchange_id: str, api_key: str, api_secret: str, name: str)`

### Systems Impact Analysis
- [ ] **Stripe**: N/A.
- [ ] **Plaid**: Unaffected.
- [ ] **Firebase**: Firestore will cache the updated Net Worth.

---

## 3. Implementation Checklist
1.  [ ] **Specs**: This file created.
2.  [ ] **Utils**: Refactor `encryption.py` for clarity (`encrypt_secret`).
3.  [ ] **API**: Implement endpoints in `accounts.py`.
4.  [ ] **Service**: Wire up `connectors.py`.
5.  [ ] **Frontend**: Add Modals to `ConnectAccounts.tsx`.
6.  [ ] **Dev Tools**: Add `verify_crypto_config` MCP tool.

---

## 4. Verification Plan
### Automated Tests
*   `Postman`: Verify `POST` link endpoints return success.
*   `Dev Tools`: `verify_crypto_config` confirms RPC reachability.

### Manual Validation
1.  Navigate to "Connect Accounts".
2.  Click "Connect Wallet" -> Enter Address -> Verify Toast "Account Linked".
3.  Click "Connect Exchange" -> Enter Mock Creds -> Verify Toast "Account Linked".
