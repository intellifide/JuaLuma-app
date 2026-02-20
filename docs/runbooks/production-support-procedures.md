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

## Maintenance Windows
- **Database maintenance:** Scheduled by GCP, notifications via email
- **Planned downtime:** Not applicable (Cloud Run is serverless)
- **Dependency updates:** Weekly review of Dependabot alerts

## Escalation
Solo operator model — no escalation chain. If issue cannot be resolved:
1. Roll back to last known good revision
2. Document the issue
3. Schedule focused debugging session
