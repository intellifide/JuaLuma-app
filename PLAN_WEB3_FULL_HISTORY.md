# Web3 Full History Implementation Plan

## Purpose
Implement full transaction history (native, tokens, NFTs) across all supported
blockchains with real indexer APIs, incremental sync via cursors, and minimal
schema changes that preserve current app behavior.

## Secrets Handling
- All API keys and base URLs are read from `.env` via centralized settings.
- No secrets are hardcoded in source or committed to version control.
- Providers without configured keys must be treated as disabled.

## Plan
1) Audit current sync flow and schemas (connectors, _sync_web3, Transaction/Account)
   to determine exact extension points for full-history + cursor-based sync
   without breaking existing behavior.

2) Wire provider config exclusively through environment variables (`.env`):
   - Read API keys and base URLs from settings/config
   - Never hardcode or persist secrets in the repository
   - Ensure missing keys gracefully disable that provider

3) Add cursor storage to Account (`web3_sync_cursor`, `web3_sync_chain`) with
   Alembic migration + model updates; define cursor semantics per provider
   (offset/page/marker/fingerprint) and persist only after successful page writes.

4) Implement EVM full-history fetchers (ETH/Polygon/BSC):
   - Etherscan-style `txlist`, `tokentx`, `tokennfttx`, `token1155tx`
   - Pagination via `page`/`offset`
   - Normalize native + ERC20 + ERC721 + ERC1155
   - Store token/NFT metadata in `raw_json`
   - Add per-chain env vars and rate-limit pacing

5) Implement Solana full-history fetcher:
   - Primary Helius method with cursor pagination
   - Fallback: `getSignaturesForAddress` + `getTransaction`
   - Parse SOL transfers, SPL token transfers, and NFT transfers
   - Normalize and persist cursor

6) Implement Bitcoin + Cardano UTXO history:
   - Bitcoin primary: Bitquery (inputs/outputs) with offset pagination
   - Bitcoin fallback: blockchain.com / Blockstream
   - Cardano primary: Blockfrost address txs + `txs/{hash}/utxos`
   - Compute inflow/outflow via UTXO comparison
   - Normalize and store `raw_json`

7) Implement XRP + Tron full-history:
   - XRP: Xrpscan (Payment + token/IOU) with start/marker pagination
   - Tron: Tronscan/Trongrid for TRX + TRC20/721 with cursor/offset pagination
   - Normalize, store metadata in `raw_json`, persist cursors

8) Wire provider selection by env vars, add backoff/circuit-breaker behavior per
   rate limits; soft-fail overloaded providers; ensure `_sync_web3` returns empty
   list instead of 502 on provider overload.

9) Update tests and docs:
   - Remove mock assumptions
   - Add env var documentation for all providers
   - Provide manual verification steps for each chain
