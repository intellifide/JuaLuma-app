# AI Assistant BigQuery Billing Export Decision

## Decision

- Status: `Optional analytics enhancement`.
- Runtime dependency status: `Not required for enforcement`.
- Current decision: `Skip enablement for runtime cutover; revisit post-stabilization`.

## Scope Clarification

- BigQuery billing export is for analytics, reporting, and cost review workflows only.
- Assistant runtime controls (routing, fallback, quota metering, upload policy) must operate without any BigQuery dependency.

## Owner

- Decision owner: `Platform Operations (ops@intellifide.com)`.
- Review cadence owner: `Platform Operations`, monthly cost review.

## Enablement Criteria (If Later Enabled)

- Export target dataset created with CMEK/KMS policy aligned to environment controls.
- Access limited to least-privilege operations/finance analysts.
- Data classified as operational cost telemetry (no user prompt/response payload data).

## Retention And Access Controls

- Retention: 13 months default for billing-export tables unless compliance requires extension.
- Access model:
  - read access: operations + finance analyst group only
  - write/admin: platform operations only
  - no public dataset access
- Audit:
  - dataset access logs enabled
  - monthly access review required

## Runtime Safety Guardrail

- No backend enforcement path may query BigQuery billing export tables.
- Any optional dashboards must fail independently without affecting assistant request handling.
