# Plaid Webhook + Cursor Architecture

## Summary

- Plaid sync is now item-centric (`plaid_items`), webhook-first, and cursor-driven (`/transactions/sync`).
- Manual Plaid sync and manual Plaid metadata refresh endpoints are intentionally disabled.
- Web3 and CEX manual sync remain unchanged.

## Data Model

- `plaid_items`: canonical Plaid Item state (`item_id`, `secret_ref`, cursor, status, timestamps, lifecycle).
- `plaid_item_accounts`: mapping from internal accounts to Plaid Item + Plaid account IDs.
- `plaid_webhook_events`: durable raw webhook event log with dedupe key.

Legacy `accounts.secret_ref` is retained for backward compatibility and migration safety, but runtime Plaid reads/writes use `plaid_items.secret_ref`.

## Link + Backfill Flow

1. `POST /api/plaid/exchange-token` exchanges the public token.
1. Access token is stored via secret manager and attached to a `plaid_items` record.
1. Linked accounts are created/updated and mapped via `plaid_item_accounts`.
1. Item is marked `sync_needed`; jobs pick it up asynchronously.
1. Migration backfills existing legacy Plaid accounts into item+mapping tables.

## Webhook Ingestion Flow

1. Plaid sends webhook to `POST /webhook/plaid`.
1. Signature is verified (`PLAID_WEBHOOK_SECRET` HMAC, or Plaid verification JWT fallback).
1. Event is persisted to `plaid_webhook_events`.
1. Duplicates are ignored via dedupe key uniqueness.
1. Matching item is marked `sync_needed`; endpoint returns fast `200`.

## Sync Engine

- Sync engine uses Plaid `/transactions/sync` with item-level cursor.
- Handles pagination (`has_more`) and restart on mutation during pagination.
- Applies `added` + `modified` idempotently using per-account `external_id`.
- Applies `removed` as tombstones (`archived=true`, `raw_json.source_removed=true`).
- Updates item/account sync status and timestamps:
  - success: `active`, `last_synced_at`
  - reauth: `needs_reauth`, `reauth_needed_at`
  - failure: `failed`, `last_sync_error`

## Jobs and Scheduling

Internal jobs endpoints (same secret pattern as existing jobs API):

- `POST /api/jobs/plaid/process`: process webhook-dirty items.
- `POST /api/jobs/plaid/safety-net`: process missed-webhook safety net items.
- `POST /api/jobs/plaid/cleanup`: cleanup dormant items.

## Unlink and Billing Lifecycle

- Deleting one account under a shared Item no longer unlinks the entire Item.
- Plaid `item.remove` is called only when deleting the final mapped active account.
- Dormant-item cleanup:
  - send pre-removal local notification
  - grace window
  - remove item in Plaid to stop billing
  - mark item `removed`

## Reauth Handling Runbook

1. Detect `needs_reauth` accounts in UI/status.
1. User reconnects institution through Plaid Link.
1. Exchange token updates existing item secret and marks item `sync_needed`.
1. Run `POST /api/jobs/plaid/process` if immediate catch-up is needed.

## Replay / Backfill Repair Runbook

1. Verify webhook persistence in `plaid_webhook_events`.
1. If webhooks were missed, run `POST /api/jobs/plaid/safety-net`.
1. If a specific item is stale, mark it `sync_needed` and run process job.
1. For legacy data migration validation, verify `plaid_items` + `plaid_item_accounts` backfill completeness.

## Monitoring Checklist

- Sync lag: `now - plaid_items.last_synced_at` for active items.
- Webhook health: count of persisted events and duplicate ratio in `plaid_webhook_events`.
- Failure rate: `plaid_items.sync_status = failed`.
- Reauth queue: `plaid_items.sync_status = needs_reauth`.
- Billing lifecycle: count of `pending_cleanup` and `removed` items.
