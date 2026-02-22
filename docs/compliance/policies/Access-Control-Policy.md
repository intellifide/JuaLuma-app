# Access Control Policy

- Company: Intellifide, LLC (JuaLuma)
- Policy Owner: Founder / Security Owner
- Security Contact: Trevon Collins (general@intellifide.com)
- Effective Date: 2026-02-20
- Review Cadence: At least annually and after material access model changes
- Classification: Internal

## 1. Purpose
This policy defines how access to production systems and sensitive data is granted, reviewed, and revoked to enforce least privilege and reduce unauthorized access risk.

## 2. Scope
Applies to:
- Production and non-production cloud resources
- Application APIs, databases, secrets, and operational tooling
- Human users (employees/contractors) and non-human identities (service accounts/workloads)

## 3. Access Control Principles
- Least privilege: access is limited to the minimum required for job function.
- Need-to-know: sensitive data access is granted only when required for approved business operations.
- Separation of duties: privileged actions should be constrained to authorized roles.
- Default deny: access is not granted unless explicitly approved.

## 4. Identity and Authentication
### 4.1 Human Access
- Access is managed through centralized identity and IAM controls.
- MFA is required for administrative access to critical systems.
- Access is role-based and tied to authorized user identities.

### 4.2 Non-Human Access
- Services authenticate using managed service identities, tokens, or certificates.
- Secrets and credentials are stored in managed secret storage and are not hardcoded in source code.
- Machine identities are scoped to required permissions only.

## 5. Access Provisioning
- New access requires business justification and owner approval.
- Privileged access is restricted to approved administrators/operators.
- Access grants are recorded through platform IAM configuration and change history.

## 6. Access Modification and Revocation
- Access is modified when role responsibilities change.
- Access is revoked promptly upon termination or loss of business need.
- Emergency access changes are time-bounded and documented.

## 7. Access Review and Audit
- Access assignments are reviewed periodically based on operational and risk requirements.
- Privileged and sensitive-data access receives priority review.
- Access-related events are logged for audit and incident investigation.

## 8. Monitoring and Logging
- Authentication failures, unauthorized attempts, and security-relevant administrative events are logged.
- Security logs are retained according to retention policy and used for investigation and control validation.

## 9. Exceptions
- Policy exceptions must be documented, approved by the Policy Owner, and time-limited.

## 10. Enforcement
Non-compliance may result in access suspension/removal and corrective actions.

## 11. Version History
- v1.0 (2026-02-20): Initial policy for Plaid security diligence submission.
