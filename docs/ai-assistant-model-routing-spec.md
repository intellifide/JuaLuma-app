# AI Assistant Model Routing And Fallback Spec

## Scope

This spec defines deterministic model routing behavior for assistant requests by tier and premium-limit state.

## Routing Matrix

| Tier class | Premium limit state | Routed model | `fallback_applied` | `fallback_reason` |
| --- | --- | --- | --- | --- |
| Free | N/A | `gpt-oss-120b` | `false` | `null` |
| Paid | Not exhausted | `gemini-2.5-flash` | `false` | `null` |
| Paid | Exhausted | `gpt-oss-120b` | `true` | `paid_premium_limit_exhausted` |

## Fallback Trigger

- Trigger condition: paid user request with premium limit exhausted for current active period.
- Trigger target: route request to `gpt-oss-120b`.
- Trigger output contract:
  - `fallback_applied=true`
  - `fallback_reason=paid_premium_limit_exhausted`
  - explicit user-facing fallback message.

## User-Facing Fallback Copy

- Required copy (default):
  - `Premium AI limit reached for this period. Your request was processed with the standard model (gpt-oss-120b).`
- Copy requirements:
  - Must state fallback happened.
  - Must state why fallback happened.
  - Must state which model was used for this response.

## Dev/Prod Parity Requirements

- Routing decision logic must be identical across dev and prod.
- Model IDs in routing policy must be identical across dev and prod:
  - free default `gpt-oss-120b`
  - paid default `gemini-2.5-flash`
  - paid exhausted fallback `gpt-oss-120b`
- Response contract fields for fallback must be identical across dev and prod:
  - `fallback_applied`
  - `fallback_reason`
  - fallback message text
- Environment differences are restricted to operational values only (keys/secrets/quotas), not route rules.
