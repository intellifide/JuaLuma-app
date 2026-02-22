# Data Retention and Disposal Policy

- Company: Intellifide, LLC (JuaLuma)
- Policy Owner: Founder / Security Owner
- Security Contact: Trevon Collins (general@intellifide.com)
- Effective Date: 2026-02-20
- Review Cadence: At least annually and upon legal/regulatory changes
- Classification: Internal

## 1. Purpose
This policy defines retention periods, deletion standards, and disposal methods for customer and operational data, including Plaid-related data.

## 2. Scope
Applies to customer data, financial data, credentials/secrets, logs, legal-consent records, and backup artifacts stored by JuaLuma systems.

## 3. Retention Principles
- Retain only data necessary for product functionality, security, legal obligations, and customer support.
- Apply retention limits by data category and subscription constraints where implemented.
- Dispose of data securely once retention period expires or when deletion is requested and permitted by law.

## 4. Retention Standards by Data Category
### 4.1 Account and Profile Data
- Retained while account is active.
- Deleted upon verified account deletion request, subject to legal exceptions.

### 4.2 Transaction and Financial Data
- Retained according to product functionality and plan constraints.
- Essential-tier transaction visibility and sync windows are limited to a rolling 365-day window in current implementation.
- For account deletion, user-linked records are deleted through application deletion workflows and database cascades where configured.

### 4.3 Plaid Connection Data
- Plaid access credentials are stored as secrets, not plaintext application fields.
- Inactive Plaid items are flagged and removed through cleanup jobs after configured inactivity/grace windows.
- When Plaid items are removed, linked connection status is updated and cleanup actions are logged.

### 4.4 Security and Audit Logs
- Security-relevant logs and audit trails are retained for operational and compliance needs.
- Retention periods are reviewed periodically based on legal and operational requirements.

### 4.5 Legal Agreement Records
- Terms/privacy and related acceptance records are retained to evidence consent and legal basis.

## 5. Deletion and Disposal Procedures
### 5.1 User-Initiated Account Deletion
- Triggered via authenticated user deletion flow.
- Auth provider tokens/accounts are revoked/deleted.
- User-linked data is deleted or anonymized according to model behavior and legal obligations.
- Deletion events are auditable.

### 5.2 Scheduled Cleanup
- Automated cleanup routines remove stale pending-signup artifacts and dormant Plaid items according to configured thresholds.

### 5.3 Secure Disposal Method
- Logical deletion from primary stores using controlled application/database operations.
- Secret disposal through secret management lifecycle operations.
- Where cryptographic protection is used, key-based disposal is applied as supported by the storage model.

## 6. Legal Holds and Exceptions
- Data subject to legal hold, dispute, fraud investigation, or regulatory obligations may be retained beyond standard periods.
- Exceptions must be documented and approved by the Policy Owner.

## 7. Verification and Review
- Retention and deletion controls are reviewed periodically.
- Policy and implementation alignment is reviewed at least annually.
- Gaps are tracked with remediation plans.

## 8. Responsibilities
- Security Owner: policy governance and exception approval.
- Engineering: implement and maintain deletion/retention controls.
- Operations: monitor jobs and retention-related failures.

## 9. Version History
- v1.0 (2026-02-20): Initial policy for Plaid security diligence submission.
