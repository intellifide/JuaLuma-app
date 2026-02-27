# Identity Browser Key Drift Policy (Public-Safe)

This folder stores **policy only** for Identity Toolkit browser API key restrictions.

## Security constraints for this public repository

- Never commit API key strings (`AIza...`).
- Never commit Secret Manager payloads.
- Keep policy at referrer/API-target level only.

## Files

- `browser-auth-policy.public.json`: expected restriction baseline by environment.

## Validation

Run locally (requires `gcloud` auth and `jq`):

```bash
./scripts/check_identity_key_drift.sh --env all
```

Run single environment:

```bash
./scripts/check_identity_key_drift.sh --env dev
```

Fail on deprecated legacy referrers:

```bash
./scripts/check_identity_key_drift.sh --env all --fail-on-deprecated
```

## Remediation

Dry-run policy apply:

```bash
./scripts/apply_identity_key_policy.sh --env all
```

Apply policy to live keys:

```bash
./scripts/apply_identity_key_policy.sh --env all --apply
```

CI workflow `.github/workflows/identity-key-drift-check.yml` enforces this on auth/deploy-related PR changes and on a daily schedule.
