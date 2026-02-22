# Information Security Policy

- Company: Intellifide, LLC (JuaLuma)
- Policy Owner: Founder / Security Owner
- Security Contact: Trevon Collins (general@intellifide.com)
- Effective Date: 2026-02-20
- Review Cadence: At least annually and after material system changes or incidents
- Classification: Internal

## 1. Purpose
This policy defines the controls used to identify, mitigate, and monitor information security risks for JuaLuma systems that process customer and financial data, including Plaid-connected data.

## 2. Scope
This policy applies to:
- JuaLuma production and non-production environments
- Cloud infrastructure and managed services used by JuaLuma
- Employees and contractors with access to JuaLuma systems
- Application services, APIs, databases, secrets, and logging systems

## 3. Governance and Accountability
- Security ownership is assigned to the Security Owner listed above.
- Security responsibilities include access governance, incident response, policy maintenance, and control verification.
- Material control changes are documented and reviewed.

## 4. Identity and Access Management
- Access to production systems is restricted to authorized personnel on least-privilege principles.
- Role-based access controls (RBAC) are used where available.
- Administrative access to critical systems requires MFA.
- Non-human system access uses service accounts, managed secrets, and token-based authentication.
- Access changes are made when role changes or separation occurs.

## 5. Data Protection Controls
### 5.1 Data in Transit
- Application traffic is served over HTTPS/TLS (TLS 1.2+).
- Security headers are enforced at the API layer, including HSTS.

### 5.2 Data at Rest
- Data is stored in managed cloud services with platform-managed encryption at rest.
- Plaid access tokens are not stored in plaintext in application code or source control and are persisted via secret management controls.
- Sensitive application payloads requiring additional protection are encrypted before storage based on service-level design.

## 6. Secrets Management
- Secrets are stored and retrieved through managed secret storage.
- Secrets are not hardcoded in source code.
- Secret access is restricted by IAM and service identity.

## 7. Application and Infrastructure Security
- Security middleware is enabled in the backend (request tracing, security headers, API rate limiting).
- Authentication and authorization are enforced for protected endpoints.
- Plaid webhooks are signature-verified before processing.
- Audit logs are generated for sensitive actions.

## 8. Vulnerability and Patch Management
- Code quality and correctness checks run in CI before deployment (linting, tests, type checks).
- Security defects identified through development and operations are triaged and remediated by severity.
- Critical and high-severity issues are prioritized for accelerated remediation.

## 9. Incident Response
- Security incidents are logged, investigated, and remediated.
- Access is restricted or revoked as needed during containment.
- Post-incident corrective actions are tracked to closure.

## 10. Vendor and Third-Party Risk
- Third-party providers used for critical services (for example Plaid, cloud platform, payment providers) are reviewed as part of deployment and operational risk management.
- Integrations are limited to required scopes and credentials.

## 11. Policy Exceptions
- Any exception to this policy must be documented, approved by the Security Owner, time-bounded, and reviewed for closure.

## 12. Enforcement
Violations of this policy may result in access removal and other corrective actions.

## 13. Version History
- v1.0 (2026-02-20): Initial policy for Plaid security diligence submission.
