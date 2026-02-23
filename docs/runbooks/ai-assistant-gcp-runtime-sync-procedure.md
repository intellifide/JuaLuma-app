# AI Assistant GCP Runtime Sync Procedure

## Purpose

Define the mandatory execution order for Cloud Run runtime AI config changes and anti-drift sync.

## Ordered Procedure (Mandatory)

1. Update locally first.
2. Sync repository artifacts second.
3. Promote remotely in order: Dev -> Stage -> Prod.

## Step 1: Local First

Implement and validate code/config locally before any remote environment updates.

Commands:

```bash
pytest backend/tests/test_ai.py
npx tsc --noEmit --project frontend-app/tsconfig.json
```

Required AI key families to validate in config and deployed runtime:

- routing/fallback keys (`AI_FREE_MODEL`, `AI_PAID_MODEL`, `AI_PAID_FALLBACK_MODEL`, `AI_PAID_FALLBACK_MESSAGE`, `AI_ROUTING_ENABLED`, `AI_PAID_FALLBACK_ENABLED`)
- quota anchor/reset keys (`AI_QUOTA_ANCHOR_MODE`, `AI_QUOTA_RESET_SCOPE`)
- upload/HEIC keys (`AI_UPLOAD_ALLOWLIST`, `AI_UPLOAD_POLICY_ENFORCED`, `AI_HEIC_NORMALIZE_ENABLED`, `AI_HEIC_FAILURE_MODE`, `AI_MULTIMODAL_UPLOADS_ENABLED`)

## Step 2: Repository Sync

After local validation, sync repo artifacts so CI/CD can deploy deterministically.

Artifacts:

- `/.github/workflows/deploy-dev.yml`
- `/.github/workflows/deploy-prod.yml`
- `/.github/workflows/deploy-stage.yml`
- `/backend/core/config.py`
- `/scripts/check_gcp_drift.sh`
- `/.github/workflows/gcp-drift-check.yml`
- AI revamp docs/runbooks under `/docs/`

Rule:

- Do not add deploy-time `env_vars` blocks that override Cloud Run secret bindings for backend services.

## Step 3: Remote Promotion

After repo sync, promote branches in order `Dev -> stage -> main` so deployments flow `Dev -> Stage -> Prod`.

Local artifacts to keep aligned:

- local backend env file (`/backend/.env`, if used)
- local frontend env files (`/frontend-app/.env.local`, `/frontend-marketing/.env.local`, if used)
- local secret tooling inputs (`LOCAL_SECRET_STORE_PATH` consumers when applicable)

Local sanity check:

```bash
python -c "from backend.core.config import settings; print(settings.service_name)"
```

## Drift Hooks And Commands

Pre-commit hook command:

```bash
bash scripts/check_gcp_drift.sh
```

CI drift workflow:

- `/.github/workflows/gcp-drift-check.yml`
- Triggered daily and on deploy config changes.

Recommended parity check:

```bash
bash scripts/check_run_parity.sh
```
