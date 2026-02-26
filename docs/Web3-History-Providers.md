# Web3 History Provider Contract (Tatum Only)

Last updated: 2026-02-23 (UTC)

## Runtime Architecture

- Web3 history ingestion is hard-cutover to Tatum only (`backend/services/tatum_history.py`).
- Active sync path: `backend/api/accounts.py` -> `fetch_tatum_history(...)`.
- No cross-provider fallback is allowed in the active sync path.

## Environment Variables

### Required

- `TATUM_API_KEY`

### Required In Production-Grade Deployments

- `TATUM_BASE_URL` (default: `https://api.tatum.io`; pin explicitly in Cloud Run for parity)

### Optional Tuning

- `TATUM_TIMEOUT_SECONDS` (default: `15`)
- `TATUM_RETRY_MAX_ATTEMPTS` (default: `3`)
- `TATUM_RETRY_BASE_BACKOFF_MS` (default: `250`)

## Supported Chains (Current Scope)

- `eip155:1` (Ethereum)
- `eip155:56` (BSC)
- `eip155:137` (Polygon)
- `bip122:000000000019d6689c085ae165831e93` (Bitcoin mainnet)
- `solana:*` (Solana)
- `ripple:mainnet` (XRP Ledger)
- `cardano:mainnet` (Cardano)
- `tron:mainnet` (Tron)

## Support Boundaries

- Unsupported chains must raise provider errors and must not silently route to non-Tatum providers.
- Persistent `429` responses must surface `ProviderOverloaded` after configured retries.
- Non-2xx provider responses are treated as provider errors; no silent fallback path is allowed.

## Dev Safety-Gate Verification (TAT-009 Alignment)

Execute and evidence these gates before cutover/promotion:

1. Chain parity: pass/fail per supported chain.
2. Normalization parity: no schema violations in normalized transaction model.
3. Cursor/idempotency: repeated runs return stable tx IDs and stable next cursor.
4. 429/retry policy: retry/backoff works and persistent 429 escalates to provider-overloaded path.

Minimum evidence set:

- Gate report artifact (example: `/tmp/tat009_gate_report.json`)
- Test proof for retry policy (`backend/tests/test_tatum_history.py`)
- Updated task execution notes in Notion with pass/fail outcomes
