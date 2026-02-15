# Security Architecture Documentation

## jualuma Platform - Intellifide, LLC

## Overview

This document expands on Section 5 of the business plan and provides detailed security architecture specifications for the jualuma platform. This architecture implements "Security by Design" and "Zero Trust" principles to protect customer data and ensure GLBA compliance.

**Review Frequency:** As security requirements change

**Related Documents:** Business Plan Section 5, WISP Framework, Data Flow Diagrams, App Development Guide

---

## 1. Security Architecture Principles

### 1.1 Security by Design

**Principle:** Security is a foundational component, not an afterthought. All systems are designed with security from the ground up.

**Implementation:**

- Security requirements defined before development
- Security controls built into architecture
- Security testing integrated into development
- Security reviews required for all changes

### 1.2 Zero Trust Architecture

**Principle:** No internal service trusts another. All access is authenticated and authorized.

**Implementation:**

- Every service authenticates
- Every request authorized
- No implicit trust
- Continuous verification

### 1.3 Defense in Depth

**Principle:** Multiple layers of security controls protect against various threats.

**Implementation:**

- Network security
- Application security
- Data security
- Access controls
- Monitoring and detection

---

## 2. Encryption Standards

### 2.1 Data at Rest Encryption

**Standard:** AES-256 encryption

**Implementation:**

**Cloud SQL (PostgreSQL):**

- Encryption at rest enabled
- Google-managed encryption keys
- Customer-managed encryption keys (CMEK) available
- All financial ledger and user metadata encrypted

**Firestore (Datastore Mode):**

- Encryption at rest enabled by default
- Google-managed encryption keys
- All metering, cache, and market data encrypted

**Cloud SQL (Audit Schema):**

- Encryption at rest enabled
- CMEK applied to `audit.*` tables
- All audit/LLM logs stored encrypted with per-user DEKs

**Coldline Log Archive:**

- Parquet exports encrypted with CMEK
- Lifecycle policies ensure 7-year retention
- Access limited to Compliance-only service accounts

**Cloud Storage:**

- Encryption at rest enabled by default
- Google-managed encryption keys
- All static assets encrypted

**Secret Manager:**

- Encryption at rest enabled by default
- Google-managed encryption keys
- All secrets encrypted

**Key Management:**

- Encryption keys managed through Google Cloud KMS
- Key rotation policies implemented
- Key access restricted and logged
- Key backup and recovery procedures

### 2.2 Data in Transit Encryption

**Standard:** TLS 1.3 with modern, secure cipher suites

**Requirements:**

- TLS 1.3 required for all connections
- TLS 1.2 and deprecated ciphers prohibited
- Modern cipher suites only
- Perfect Forward Secrecy (PFS) required

**Implementation:**

**User to Platform:**

- HTTPS (TLS 1.3) for all web traffic
- HSTS (HTTP Strict Transport Security) enabled
- Secure cookies only
- No mixed content

**Platform to Third-Party APIs:**

- HTTPS (TLS 1.3) for all API calls
- Mutual TLS (mTLS) where feasible
- Certificate pinning where appropriate
- Secure token exchange

**Internal Service Communication:**

- TLS 1.3 for all internal communications
- mTLS for service-to-service
- Service mesh encryption (if implemented)
- No unencrypted internal traffic

**Database Connections:**

- Encrypted connections to all databases
- TLS 1.3 for database connections
- Certificate-based authentication
- No unencrypted database access

---

## 3. Key Management

### 3.1 Google Cloud KMS

**Service:** Google Cloud Key Management Service (KMS)

**Key Types:**

**Symmetric Keys:**

- Data encryption keys (DEKs)
- User-specific DEKs for log encryption
- Service account keys
- Application keys

**Asymmetric Keys:**

- API authentication keys
- Service-to-service authentication
- Certificate signing

### 3.2 User Data Encryption Keys (DEKs)

**Purpose:** Encrypt user-specific data (AI logs) for cryptographic erasure

**Lifecycle:**

**Creation:**

- DEK created in KMS when user signs up
- Key version tracked in database
- Key reference stored: `user_dek_ref`

**Usage:**

- DEK retrieved from KMS for encryption
- Data encrypted with DEK
- Encrypted data stored in Cloud SQL (`audit.llm_logs`) and exported to Coldline via `log-ledger-archiver`
- Key reference stored with encrypted data

**Destruction (Right to be Forgotten):**

- DEK destroyed in KMS upon account deletion
- Encrypted data becomes unreadable (cryptographic erasure)
- Physical deletion job scheduled (24 hours after key destruction)
- Data permanently deleted from Cloud SQL log tables and corresponding Coldline Parquet objects (via lifecycle deletion)

**Key Rotation:**

- Keys rotated annually or as security requires
- New key versions created
- Old key versions retained for decryption
- Old keys destroyed after data migration

### 3.3 Secret Management

**Service:** Google Cloud Secret Manager

**Secrets Stored:**

- Plaid access tokens
- CEX API keys
- OAuth tokens
- Service account keys
- Database credentials
- Third-party API keys

**Storage Requirements:**

- Secrets never stored in code
- Secrets never stored in environment variables
- Secrets never stored in databases
- Secrets only in Secret Manager

**Access Control:**

- Secrets accessed at runtime only
- No caching of secrets
- Access logged and monitored
- Principle of least privilege

**Rotation:**

- Secrets rotated regularly
- Automated rotation where possible
- Manual rotation procedures documented
- Rotation tested

---

## 4. Access Controls

### 4.1 Authentication

**User Authentication:**

- GCP Identity Platform (Native Identity)
- Supported methods:
  - Email/Password
  - Google OAuth
  - Additional methods (if added)
- Multi-factor authentication (MFA) required
- Strong password policies enforced

**Service Authentication:**

- Service accounts for GCP services
- OAuth 2.0 for API access
- Certificate-based authentication
- No shared credentials

**API Authentication:**

- API keys for third-party services
- OAuth tokens for user-linked accounts
- Tokens stored in Secret Manager
- Token rotation policies

**AI Model Authentication (Local Development):**

- **Google AI Studio API Key:** Stored in local `.env` file as `AI_STUDIO_API_KEY` for local development only
- **Security Requirements:**
  - API key must never be committed to version control (add to `.gitignore`)
  - API key must be kept secure and not shared
  - Rotate API key if compromised or exposed
  - Use environment variable injection at runtime (never hardcode)
- **Data Privacy:**
  - Ensure data logging is disabled in all API requests (prompts/responses not stored for training)
  - No PII should be included in prompts sent to AI Studio
  - All prompts/responses encrypted with User DEK before any local logging
- **Rate Limiting:**
  - Implement client-side rate limiting to respect free-tier quotas (~10 RPM, 250k TPM, 250 RPD)
  - Log 429 rate limit errors for monitoring
  - Use exponential backoff retry logic for transient failures

**AI Model Authentication (Production):**

- **Vertex AI Service Account:** Uses GCP service account credentials (Application Default Credentials or workload identity)
- **Security Requirements:**
  - Service account keys stored in Secret Manager (never in code or environment variables)
  - Service account follows principle of least privilege
  - Credentials rotated regularly
- **Data Privacy:**
  - Data logging explicitly disabled on all Vertex AI Gemini endpoints
  - All prompts/responses encrypted with User DEK before storage in Cloud SQL (`audit.llm_logs`)
  - No PII exposed in prompts (RAG context uses encrypted financial data only)

### 4.2 Authorization

**Role-Based Access Control (RBAC):**

**Role Taxonomy:**
Roles are separated into four categories: App Users, Marketplace Developers, Internal Staff, and Automation Identities\. App roles are distinct from GCP IAM roles \(which are used for infrastructure permissions only\)\.

**App User Roles:**

- `user`: Standard customer access
- `support_agent`: Customer service representative access (separate support portal service)
- `support_manager`: Customer service manager access (separate support portal service with additional permissions)

**Marketplace Developer Access:**

- Developers are identified by presence of a record in the `developers` table \(linked via `uid`\)\.
- Developer status grants access to MCP server, widget publishing tools, and payout dashboard\.
- Marketplace publishing requires Pro/Ultimate tier subscription\.
- Developer actions are logged for payout calculation and abuse detection\.
- Developers cannot access other users' data or internal APIs directly\.

**Internal Staff Access:**

- Internal team members \(engineering, devops, security, compliance, finance, product, operations\) are managed via IdP/SSO and GCP IAM service accounts\.
- Access follows least-privilege principles with role-based permissions for specific functions\.
- Internal staff do not use app-facing roles; they access systems via service accounts and IAM policies\.
- GCP IAM roles \(e\.g\., `roles/storage.admin`, `roles/iam.securityAdmin`\) are used for infrastructure permissions only\.

**Automation & AI Identities:**

- AI support agents and other automation services use dedicated service accounts with scoped permissions\.
- AI support agents can read tickets, post responses, and access knowledge bases but cannot modify payouts, secrets, or user financial data\.
- Service account identities are managed separately from app user roles\.
- All automation actions are logged and audited\.

**Access Permissions:**

- Users can only access their own data
- Row-level security enforced
- uid verified on all queries
- No cross-user data access

**Service Permissions:**

- Service accounts have minimum required permissions
- IAM roles follow principle of least privilege
- Permissions reviewed quarterly
- Unused permissions removed

**Support Portal Access:**

- Support portal access strictly audited
- No access to user PII or AI logs
- Support actions logged
- Support portal access requires approval

### 4.3 Access Management

**Access Provisioning:**

- New user access requires approval
- Access requests documented
- Access granted based on role
- Access activated

**Access Reviews:**

- Quarterly access reviews
- Unused access identified
- Access revoked if not needed
- Reviews documented

**Access Revocation:**

- Immediate revocation upon termination
- Access revoked within 24 hours
- All credentials disabled
- Access logs reviewed

### 4.4 Premium Feature Gates & Preview Safeguards

- **Shared Registry:** `backend/services/access_control/feature_requirements.yaml` is the single source of truth for every premium `featureKey`. A build step generates both the frontend module (`packages/shared/accessControl.ts`) and the FastAPI registry (`services/access_control/registry.py`) to prevent drift.
- **Runtime Enforcement:** FastAPI dependencies (`require_feature(feature_key)`) validate the caller's subscription tier before executing business logic. Blocks respond with `403` and emit `feature_preview.backend_blocked` events to Cloud SQL (`audit.feature_preview`).
- **Preview Endpoints:** `/preview/<feature_key>` routes read immutable JSON artifacts stored in a dedicated Cloud Storage bucket (`gs://jualuma-preview-content`). Buckets contain only synthetic data, inherit CMEK, and expose read-only signed URLs. No NPPI or user identifiers may be stored alongside preview data.
- **Audit Logging:** All accesses (allowed, blocked, preview fetch) record `{uid, feature_key, tier, source_ip, user_agent}`. Logs feed the Security Operations dashboards and trigger anomaly alerts if unusually high preview traffic appears.
- **GCP Runtime Config Kill Switch:** GCP Application Configuration exposes `feature_preview.kill_switch` and per-feature toggles. Support can disable previews or premium enforcement in emergencies without redeploying; changes are logged via Config Change Notifications.
- **Data Minimization:** Preview telemetry only stores hashed `uid` + tier, satisfying GDPR data minimization while still supporting conversion analytics.

---

## 5. Network Security

### 5.1 Network Architecture

**Cloud Run Services:**

- Serverless containers
- Isolated execution environments
- No persistent network connections
- Automatic scaling

**VPC Configuration:**

- Private IP addresses where possible
- Network segmentation
- Firewall rules restrict traffic
- No public IPs unless required

**Load Balancing:**

- Cloud Load Balancing
- DDoS protection
- SSL/TLS termination
- Geographic distribution

### 5.2 Firewall Rules

**Inbound Rules:**

- HTTPS (443) only for user traffic
- Specific IP allowlists for support portal access
- Deny all other inbound traffic

**Outbound Rules:**

- Allow HTTPS to required services
- Allow specific API endpoints
- Deny all other outbound traffic
- Egress filtering

### 5.3 DDoS Protection

**Google Cloud Armor:**

- DDoS protection enabled
- Rate limiting
- Geographic restrictions (if needed)
- IP allowlisting/blocklisting

---

## 6. Application Security

### 6.1 Input Validation

**All User Input:**

- Validated on frontend
- Validated on backend
- Sanitized before processing
- Type checking enforced

**API Input:**

- Request validation (Pydantic models)
- Parameter validation
- SQL injection prevention
- XSS prevention

### 6.2 Output Encoding

**All Output:**

- Output encoded to prevent XSS
- Content Security Policy (CSP) headers
- Secure headers (HSTS, X-Frame-Options, etc.)
- No sensitive data in error messages

### 6.3 Authentication and Session Management

**Session Management:**

- Secure session tokens
- Session timeout
- Session invalidation on logout
- Secure cookie settings

**Token Security:**

- Tokens encrypted
- Tokens have expiration
- Token rotation
- Token revocation

---

## 7. Data Protection

### 7.1 PII Redaction

**Service:** Google Cloud DLP (Data Loss Prevention)

**Redaction Pipeline:**

- All AI prompts pass through DLP
- Identifies PII:
  - Credit card numbers
  - Social Security Numbers
  - Account numbers
  - Legal names
  - Private keys
- Replaces with `[REDACTED]`
- Redacted version used for LLM

**DLP Configuration:**

- Inspection templates configured
- InfoTypes identified
- Redaction rules defined
- Regular template updates

### 7.2 Data Minimization

**Collection:**

- Only collect necessary data
- No unnecessary PII collection
- Data minimization at schema level
- Regular data collection reviews

**Retention:**

- Retain data only as long as necessary
- Retention policies defined
- Automatic data deletion
- Regular data purging
- **Tier Windows:**
  - Free Tier: Transactions reside in Cloud SQL `ledger_hot_free` for 45 days; the `free-ledger-pruner` Cloud Run Job deletes older rows with no archival copy.
  - Essential Tier: Transactions reside in Cloud SQL `ledger_hot_essential` for 30 days; `essential-ledger-archiver` copies aged rows to Coldline (`gs://jualuma-ledger-archive/essential/<uid>/<YYYY>/<MM>`) before pruning the hot table.
  - Pro/Ultimate: Continue to rely on Cloud SQL Enterprise Plus for full-history retention; data purging occurs only via cryptographic erasure workflows.

**Right to be Forgotten:**

- Cryptographic erasure (User DEK destruction)
- Physical data deletion (24 hours after key destruction)
- Deletion from all systems
- Deletion confirmed to user

### 7.3 Data Classification

**NPPI (Nonpublic Personal Information):**

- Highest sensitivity
- Strongest security controls
- GLBA protections
- Limited access

**PI (Personal Information):**

- Medium sensitivity
- Standard security controls
- CCPA protections
- Standard access

**Public Information:**

- Low sensitivity
- Basic security controls
- Public access

---

## 8. Monitoring and Logging

### 8.1 Security Monitoring

**Google Cloud Monitoring:**

- System metrics
- Application metrics
- Security events
- Anomaly detection

**Logging:**

- Google Cloud Logging
- All access logged
- All actions logged
- Security events logged

**SIEM (If Implemented):**

- Security Information and Event Management
- Centralized log analysis
- Threat detection
- Incident correlation

### 8.2 Log Management

**Log Types:**

- Access logs
- Authentication logs
- Application logs
- Security logs
- Audit logs

**Log Retention:**

- Security logs: 1 year minimum
- Critical security logs: 7 years
- Application logs: 90 days
- Audit logs: 7 years

**Log Security:**

- Logs encrypted at rest
- Log access restricted
- Log integrity protected
- Log tampering detection

### 8.3 Alerting

**Security Alerts:**

- Failed authentication attempts
- Unauthorized access attempts
- Suspicious activity
- System anomalies
- Security incidents

**Alert Response:**

- Automated alerts configured
- Alert thresholds set appropriately
- Incident response procedures
- False positive reduction

---

## 9. Vulnerability Management

### 9.1 Vulnerability Scanning

**Regular Scanning:**

- Automated vulnerability scans
- Dependency scanning
- Container image scanning
- Configuration scanning

**Tools:**

- Google Cloud Security Command Center
- Container Analysis
- Vulnerability scanners
- Dependency checkers

### 9.2 Patch Management

**Patching Process:**

- Security patches applied promptly
- Critical patches: Within 24-48 hours
- Regular patches: Within 30 days
- Patch testing before production

**Dependency Updates:**

- Regular dependency updates
- Security vulnerability updates
- Breaking change assessment
- Update testing

### 9.3 Penetration Testing

**Testing Schedule:**

- Annual penetration testing
- After major changes
- As security requires
- Third-party testing recommended

---

## 10. Incident Response Integration

### 10.1 Security Incident Detection

**Detection Methods:**

- Security monitoring alerts
- Log analysis
- Anomaly detection
- User reports
- Vendor notifications

**Detection Procedures:**

- See IRP-Framework.md for detailed procedures
- Immediate notification
- Incident classification
- Response activation

### 10.2 Security Control Integration

**WISP Integration:**

- Security controls documented in WISP
- Controls tested regularly
- Controls updated based on incidents
- Compliance verified

**IRP Integration:**

- Security incidents trigger IRP
- Containment procedures
- Investigation procedures
- Recovery procedures

---

## 11. Compliance Integration

### 11.1 GLBA Compliance

**Safeguards Rule:**

- WISP implemented
- Security controls documented
- Risk assessments conducted
- Incident response ready

**Privacy Rule:**

- Privacy notices provided
- Opt-out rights honored
- Privacy policy maintained
- Annual notices sent

### 11.2 CCPA Compliance

**Privacy Rights:**

- Right to know procedures
- Right to delete procedures
- Right to opt-out procedures
- Non-discrimination policy

### 11.3 FinCEN Compliance

**Read-Only Enforcement:**

- API scope validation
- No transaction initiation
- No fund movement
- Compliance monitoring

---

## 12. Security Architecture Diagrams

### 12.1 High-Level Security Architecture

```
User → [TLS 1.3] → Cloud Load Balancer → [TLS 1.3] → Cloud Run
                                                          │
                                                          ├─→ [mTLS] → Cloud SQL (Encrypted)
                                                          ├─→ [mTLS] → Firestore (Encrypted)
                                                          ├─→ [TLS 1.3] → Secret Manager
                                                          ├─→ [TLS 1.3] → Cloud KMS
                                                          └─→ [TLS 1.3] → Cloud DLP
```

### 12.2 Encryption Flow

```
Data → Encryption (AES-256) → Encrypted Data → Storage
                              ↑
                              │
                         Key from KMS
```

### 12.3 Authentication Flow

```
User → GCP Identity Platform → JWT Token → FastAPI → Verify Token → Authorize → Access Data
```

---

## 13. Security Controls Summary

### 13.1 Preventive Controls

- Encryption (at rest and in transit)
- Access controls
- Authentication and authorization
- Input validation
- Network security
- Firewall rules

### 13.2 Detective Controls

- Security monitoring
- Logging and audit trails
- Intrusion detection
- Anomaly detection
- Vulnerability scanning

### 13.3 Corrective Controls

- Incident response procedures
- Patch management
- Access revocation
- Data deletion
- Recovery procedures

---

## 14. Security Testing

### 14.1 Security Testing Types

**Static Analysis:**

- Code security scanning
- Dependency vulnerability scanning
- Configuration scanning

**Dynamic Analysis:**

- Penetration testing
- Vulnerability scanning
- Security testing in CI/CD

**Compliance Testing:**

- Security control testing
- Access control testing
- Encryption verification
- Logging verification

### 14.2 Testing Schedule

- Continuous: Automated scanning in CI/CD
- Monthly: Dependency updates and scanning
- Quarterly: Security control testing
- Annually: Penetration testing

---

## 15. Appendices

### Appendix A: Security Control Matrix

[Matrix of security controls by data type and requirement]

### Appendix B: Encryption Key Lifecycle

[Detailed key lifecycle procedures]

### Appendix C: Security Configuration Standards

[Specific security configuration requirements]

---

**Next Review:** As security requirements change

**Maintained By:** Security Team / Program Coordinator

---

**Note:** This architecture must be implemented and maintained according to the WISP Framework. All security controls must be documented, tested, and verified regularly.

---

## Related Documents

This Security Architecture relates to the following planning documents:

**Legal Documents:**

- `WISP-Framework.md` - Security program framework (implementation requirements)
- `IRP-Framework.md` - Incident response framework (security incident handling)
- `Risk-Assessment-Process.md` - Risk assessment procedures (security risk evaluation)
- `Compliance-Checklist.md` - Compliance requirements (GLBA Safeguards Rule, Section 1.2)

**Business Documents:**

- `Intellifide, LLC business plan.md` - Business plan Section 5.2 (Technology Stack, Security)
- `Product-Roadmap.md` - Timeline for security implementation
- `Vendor-Relationships.md` - Vendor security requirements

**App Development Guides:**

- `Master App Dev Guide.md` - Technical specification (Section 1.0, 3.0: Security by Design, Zero Trust)
- `getting started gcp.md` - GCP setup (security configuration)

**Technical Documentation:**

- `Data-Flow-Diagrams.md` - Data flow architecture (security controls in data flow)
- `Privacy-Policy.md` - Privacy Policy (data protection measures)

**Last Updated:** December 19, 2025 at 01:50 PM CT (Modified 12/19/2025 13:50 Central Time per rules)
