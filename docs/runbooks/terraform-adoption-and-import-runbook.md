# Terraform Adoption And Import Runbook

Last updated: 2026-02-25 (UTC)

## Objective

Adopt existing GCP runtime resources into Terraform state without direct runtime drift and without environment promotion bypass.

## Rules

1. Local first: update IaC and validate locally.
2. GitHub second: promote via PR and CI.
3. Runtime adoption order: `dev -> stage -> prod`.
4. Do not make direct runtime config edits unless incident break-glass.

## Preflight

Run from repository root:

```bash
bash scripts/terraform_ci_plan.sh
```

Confirm:
- `infra/envs/<env>/backend.tf` exists for target env.
- `infra/envs/<env>/terraform.tfvars` exists and rollout flags are explicit.

## Import Workflow (Per Environment)

1. Generate import commands:

```bash
./scripts/terraform_generate_imports.sh --env <dev|stage|prod>
```

2. Enable only modules required for resources being imported in `infra/envs/<env>/terraform.tfvars`.

3. Initialize env stack:

```bash
terraform -chdir=infra/envs/<env> init
```

4. Execute generated import commands.

5. Validate no unintended drift:

```bash
terraform -chdir=infra/envs/<env> plan
```

6. Commit IaC updates and open promotion PR.

## Promotion Checklist

For each promotion PR include:
- `terraform plan` summary for target env.
- Cloud Run parity check output (`scripts/check_run_parity.sh` where applicable).
- Drift guard status (`scripts/check_gcp_drift.sh`).
- Rollback target and recovery steps.

## Rollback

If import or plan introduces invalid changes:

1. Revert the IaC commit.
2. Re-run `bash scripts/terraform_ci_plan.sh`.
3. Re-open PR with corrected flags/module scope.

Do not patch runtime resources directly to compensate for bad IaC imports.
