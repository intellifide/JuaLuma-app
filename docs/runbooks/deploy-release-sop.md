# Deploy & Release SOP

**Effective:** 2026-02-19
**Owner:** Engineering Lead

## Environments

| Environment | GCP Project | Branch | Workflow | Approval |
|------------|-------------|--------|----------|----------|
| Development | jualuma-dev | Dev | deploy-dev.yml | None |
| Production | jualuma-prod | main | deploy-prod.yml | Required |

## Release Process

### 1. Development Iteration (Dev branch)
```
1. Code changes on Dev branch
2. Push triggers CI (ci.yml) — lint, test, typecheck, security scan
3. Push triggers CD (deploy-dev.yml) — build + deploy to jualuma-dev
4. Verify on dev Cloud Run URLs
```

### 2. Production Promotion (Dev → main)
```
1. Open PR: Dev → main
2. CI runs on PR (all quality + security gates)
3. Review PR (branch protection enforces PR flow)
4. Merge PR to main (squash/rebase — linear history enforced)
5. deploy-prod.yml triggers automatically
6. Manual approval required (GitHub production environment gate)
7. Approve → deploy to jualuma-prod
8. Verify on production URLs
```

### 3. Pre-Deploy Checklist
- [ ] All CI checks pass (lint, test, typecheck, security)
- [ ] No CRITICAL/HIGH vulnerabilities (pip-audit, npm audit, Trivy)
- [ ] PR description documents changes
- [ ] Database migrations tested on dev first
- [ ] Secrets/env vars updated in GCP if needed (GCP-first)

### 4. Post-Deploy Verification
- [ ] Health check endpoints respond 200
- [ ] Key user flows tested (signup, login, dashboard)
- [ ] No 5xx errors in Cloud Logging (5 min observation)
- [ ] Monitoring dashboard shows normal metrics

### 5. Rollback Procedure
```bash
# Immediate: route traffic to previous revision
gcloud run services update-traffic <service> \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1 --project=jualuma-prod

# If code fix needed: revert PR on main, deploy
```

## GCP-First Config Changes
Small config changes (env vars, secrets) follow GCP-first workflow:
1. Update directly on GCP (Cloud Run env vars, Secret Manager)
2. Sync to repo (deploy workflow, .env templates)
3. Sync local dev environment
