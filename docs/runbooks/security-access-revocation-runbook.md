# Security Access Revocation Runbook

**Effective:** 2026-02-19
**Owner:** Engineering Lead
**SLA:** Revocation within 1 hour of detection/decision

## When to Use
- Compromised credential detected
- Role change (employee departure, contractor end)
- Suspicious activity on any account
- API key or secret exposure

## Revocation Steps (by system)

### 1. GCP IAM (Priority: CRITICAL)
```bash
# Remove user/SA from project
gcloud projects remove-iam-policy-binding <project-id> \
  --member="<principal>" --role="<role>"

# Disable service account
gcloud iam service-accounts disable <sa-email> --project=<project-id>

# Delete service account keys (if key-based)
gcloud iam service-accounts keys list --iam-account=<sa-email> --project=<project-id>
gcloud iam service-accounts keys delete <key-id> --iam-account=<sa-email> --project=<project-id>
```

### 2. GCP Secret Manager (Priority: CRITICAL)
```bash
# Rotate compromised secret
gcloud secrets versions add <secret-id> --data-file=<new-value-file> --project=<project-id>

# Disable old version
gcloud secrets versions disable <version-id> --secret=<secret-id> --project=<project-id>
```

### 3. GitHub Repository (Priority: HIGH)
```bash
# Remove collaborator
gh api repos/intellifide/JuaLuma-app/collaborators/<username> -X DELETE

# Revoke deploy key
gh api repos/intellifide/JuaLuma-app/keys/<key-id> -X DELETE

# Rotate all GitHub Actions secrets (re-set via gh secret set)
```

### 4. WIF Pool / CI/CD Tokens (Priority: HIGH)
```bash
# Disable WIF provider (blocks all GitHub Actions auth)
gcloud iam workload-identity-pools providers update-oidc github-provider \
  --workload-identity-pool=github-pool --location=global \
  --disabled --project=<project-id>

# Re-enable after remediation
gcloud iam workload-identity-pools providers update-oidc github-provider \
  --workload-identity-pool=github-pool --location=global \
  --no-disabled --project=<project-id>
```

### 5. Billing / Admin Accounts (Priority: HIGH)
- Revoke via Google Workspace admin console
- Remove from GCP organization IAM

### 6. API Keys (Priority: MEDIUM)
```bash
# Delete compromised API key
gcloud services api-keys delete <key-id> --project=<project-id>

# Create new restricted key
gcloud services api-keys create --display-name="<name>" \
  --api-target=service=<api> --project=<project-id>

# Update GitHub environment variable with new key
```

## Post-Revocation

### Verification Checklist
- [ ] Revoked principal cannot authenticate
- [ ] No active sessions remain (Cloud Run redeploy forces new instances)
- [ ] Audit log confirms no unauthorized access after revocation time
- [ ] All dependent secrets/keys rotated
- [ ] GitHub Actions workflows still function with new credentials

### Key/Secret Rotation
After revoking access, rotate ALL secrets the compromised principal could access:
- DATABASE_URL (change password, update Secret Manager)
- STRIPE_SECRET_KEY (rotate in Stripe dashboard, update Secret Manager)
- PLAID_CLIENT_ID / PLAID_SECRET (rotate in Plaid dashboard)
- LOCAL_ENCRYPTION_KEY (rotate, re-encrypt data)
- API keys (delete + recreate)

### Documentation
- Record incident in `docs/incidents/` with: who, what, when, actions taken
- Update IAM access review evidence with revocation record
