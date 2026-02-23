# Production Support Procedures

**Effective:** 2026-02-19
**Owner:** Engineering Lead

## Monitoring

### Alert Channels
- **Email:** hello@jualuma.com (all alert policies)
- **Dashboard:** GCP Console → Monitoring → Dashboards

### Alert Policies (jualuma-prod)
| Alert | Threshold | Window |
|-------|-----------|--------|
| 5xx Error Rate | > 5% per service | 5 min |
| p95 Latency | > 2s per service | 5 min |
| Instance Count | > 50 per service | 1 min |

### Key Logs
```bash
# All errors (last 1 hour)
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --project=jualuma-prod --limit=50 --freshness=1h

# Specific service
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=jualuma-backend AND severity>=WARNING" \
  --project=jualuma-prod --limit=50 --freshness=1h

# Auth failures
gcloud logging read "resource.type=cloud_run_revision AND textPayload:\"401\"" \
  --project=jualuma-prod --limit=20 --freshness=1h
```

## Common Issues

### 1. Cloud Run Cold Start Latency
**Symptom:** First request after idle period takes >5s
**Action:** Expected behavior with 0 min-instances (idle-safe). Set min-instances=1 for backend if consistent traffic justifies cost.

### 2. Database Connection Errors
**Symptom:** "Connection refused" or timeout in backend logs
**Action:**
```bash
gcloud sql instances describe jualuma-db-prod --project=jualuma-prod --format="value(state)"
# If SUSPENDED: check billing. If MAINTENANCE: wait.
```

### 3. Secret Manager Access Denied
**Symptom:** "PermissionDenied" accessing secrets
**Action:** Verify Cloud Run service account has `secretmanager.secretAccessor` role.

### 4. Build/Deploy Failure
**Symptom:** deploy-prod.yml fails
**Action:** Check GitHub Actions run log. Common causes: Docker build failure, Artifact Registry auth, Cloud Run quota.

### 5. Tatum 429 Rate-Limit Or Credit-Guardrail Events
**Symptom:** Backend logs contain `ProviderOverloaded`, `Tatum rate limit hit`, or repeated HTTP `429`.
**Action:**
```bash
# Provider overload / retry failures (last 1 hour)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=jualuma-backend AND (textPayload:\"ProviderOverloaded\" OR textPayload:\"Tatum rate limit hit\" OR textPayload:\"429\")" \
  --project=jualuma-prod --limit=100 --freshness=1h
```
- If sustained, reduce non-critical sync load and defer bulk backfills.
- Verify `TATUM_RETRY_MAX_ATTEMPTS` and `TATUM_RETRY_BASE_BACKOFF_MS` are aligned with policy.

### 6. Tatum Provider Outage / 5xx Burst
**Symptom:** Elevated backend errors with `Tatum returned 5xx`.
**Action:**
```bash
# Provider 5xx signature (last 1 hour)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=jualuma-backend AND (textPayload:\"Tatum returned 5\" OR textPayload:\"Tatum request failed\")" \
  --project=jualuma-prod --limit=100 --freshness=1h
```
- Confirm whether failures are isolated to Web3 sync endpoints.
- Follow incident-response flow if user-facing impact exceeds SEV-2 thresholds.

## Web3 Safety-Gate Verification Reference (TAT-009)

Use this checklist when validating provider behavior after config changes:

- Chain parity pass/fail is captured for all supported chains.
- Normalization output remains schema-safe (no violations).
- Cursor/idempotency is stable across repeated runs.
- 429/retry escalation behavior matches policy.

Primary evidence sources:

- `backend/tests/test_tatum_history.py`
- gate report artifact (for example `/tmp/tat009_gate_report.json`)

## Maintenance Windows
- **Database maintenance:** Scheduled by GCP, notifications via email
- **Planned downtime:** Not applicable (Cloud Run is serverless)
- **Dependency updates:** Weekly review of Dependabot alerts

## Escalation
Solo operator model — no escalation chain. If issue cannot be resolved:
1. Roll back to last known good revision
2. Document the issue
3. Schedule focused debugging session
