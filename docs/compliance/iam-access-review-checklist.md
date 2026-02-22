# IAM Access Review Checklist

**Frequency:** Quarterly
**Owner:** Engineering Lead
**Next Review:** 2026-05-19
**Automated Enforcement:** Weekly GitHub Action (`.github/workflows/iam-access-review.yml`) runs `scripts/enforce_iam_human_allowlist.sh` with solo-operator allowlists:
- `docs/compliance/access-allowlist/jualuma-dev.allowlist`
- `docs/compliance/access-allowlist/jualuma-prod.allowlist`

## Review Scope

### 1. GCP IAM (jualuma-dev)
- [ ] List all IAM bindings: `gcloud projects get-iam-policy jualuma-dev`
- [ ] Verify each principal has justified access
- [ ] Remove unused service accounts
- [ ] Confirm least-privilege: no `roles/owner` on service accounts

### 2. GCP IAM (jualuma-prod)
- [ ] List all IAM bindings: `gcloud projects get-iam-policy jualuma-prod`
- [ ] Verify github-actions SA has only: run.admin, artifactregistry.writer, iam.serviceAccountUser, storage.admin, secretmanager.secretAccessor
- [ ] Confirm no additional principals beyond expected

### 3. GCP Secret Manager
- [ ] List secrets: `gcloud secrets list --project=jualuma-dev`
- [ ] List secrets: `gcloud secrets list --project=jualuma-prod`
- [ ] Verify access bindings on each secret
- [ ] Confirm no over-broad accessor policies

### 4. GitHub Repository Access
- [ ] Review collaborators: `gh api repos/intellifide/JuaLuma-app/collaborators`
- [ ] Review environment protection rules
- [ ] Verify branch protection is enforced (main)
- [ ] Check for stale deploy keys or tokens

### 5. Runtime Service Accounts
- [ ] Cloud Run service accounts have only required roles
- [ ] Cloud SQL IAM users are current
- [ ] WIF pool/provider attribute conditions are correct

## Evidence Template

| Item | Principal | Role/Access | Justified | Action |
|------|----------|-------------|-----------|--------|
| GCP IAM (dev) | github-actions@jualuma-dev | run.admin, etc. | Yes - CD pipeline | Keep |
| GCP IAM (prod) | github-actions@jualuma-prod | run.admin, etc. | Yes - CD pipeline | Keep |
| GitHub | intellifide | Owner | Yes - sole operator | Keep |
| Secret Manager | Cloud Run SA | secretAccessor | Yes - runtime config | Keep |

## Review Record

### Review #1 — 2026-02-19 (Initial)
**Reviewer:** Engineering Lead
**Findings:**
- jualuma-dev: github-actions SA with CD roles — justified
- jualuma-prod: github-actions SA with CD roles — justified, freshly provisioned
- No stale accounts or over-permissioned principals found
- WIF pools correctly scoped to intellifide/JuaLuma-app repository
**Removals:** None
**Outcome:** PASS — all access justified
