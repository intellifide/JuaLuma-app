# Incident Response Runbook

**Effective:** 2026-02-19
**Owner:** Engineering Lead (solo operator)
**Applies to:** jualuma-prod (production)

## Severity Classification

| Level | Definition | Response SLA | Example |
|-------|-----------|-------------|---------|
| SEV-1 | Service down, all users impacted | 15 min acknowledge, 1 hr resolve | Cloud Run 100% 5xx, DB unreachable |
| SEV-2 | Degraded service, partial impact | 30 min acknowledge, 4 hr resolve | Elevated latency, auth failures |
| SEV-3 | Non-critical issue, workaround exists | 4 hr acknowledge, 24 hr resolve | Minor UI bug, non-blocking error |

## Incident Flow

### 1. Detection
- GCP Monitoring alerts → hello@jualuma.com
- Alert policies: 5xx rate > 5%, p95 latency > 2s, instance count > 50

### 2. Acknowledge
- Check GCP Console → Cloud Run → Service details
- Check Cloud Logging for error patterns
- Determine severity level

### 3. Triage
```bash
# Check service status
gcloud run services describe <service> --region=us-central1 --project=jualuma-prod

# Check recent logs
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --project=jualuma-prod --limit=50 --freshness=1h

# Check Cloud SQL status
gcloud sql instances describe jualuma-db-prod --project=jualuma-prod
```

### 4. Mitigation

**Rollback deployment:**
```bash
# List revisions
gcloud run revisions list --service=<service> --region=us-central1 --project=jualuma-prod

# Route 100% traffic to previous revision
gcloud run services update-traffic <service> \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1 --project=jualuma-prod
```

**Scale to zero (emergency stop):**
```bash
gcloud run services update <service> --max-instances=0 \
  --region=us-central1 --project=jualuma-prod
```

### 5. Resolution
- Fix root cause in code or config
- Deploy fix through normal Dev → PR → main pipeline
- Verify fix in production

### 6. Post-Incident
- Write brief incident summary (what, when, impact, root cause, fix)
- Store in `docs/incidents/` directory
- Update runbook if new failure mode discovered
