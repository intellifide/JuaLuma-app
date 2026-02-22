# Web3 Full-History Providers

## Environment Variables

### EVM (Ethereum / Polygon / BSC)
- `ETHERSCAN_API_KEY`
- `ETHERSCAN_BASE_URL` (default: `https://api.etherscan.io/api`)
- `POLYGONSCAN_API_KEY`
- `POLYGONSCAN_BASE_URL` (default: `https://api.polygonscan.com/api`)
- `BSCSCAN_API_KEY`
- `BSCSCAN_BASE_URL` (default: `https://api.bscscan.com/api`)

### Solana
- `HELIUS_API_KEY`
- `HELIUS_BASE_URL` (default: `https://mainnet.helius-rpc.com`)
- `HELIUS_RPC_URL` (optional full override)
- `SOLANA_RPC_URL` (fallback RPC)

### Bitcoin
- `BITQUERY_API_KEY`
- `BITQUERY_URL` (default: `https://api.bitquery.io/graphql`)
- `BLOCKCHAIN_COM_URL` (fallback; default: `https://blockchain.info`)

### Cardano
- `BLOCKFROST_API_KEY`
- `BLOCKFROST_URL_MAINNET` (default: `https://cardano-mainnet.blockfrost.io/api/v0`)

### XRP Ledger
- `XRPSCAN_URL` (default: `https://xrpscan.com/api/v1`)

### Tron
- `TRONSCAN_BASE_URL` (default: `https://api.tronscanapi.com`)
- `TRONGRID_API_KEY`
- `TRONGRID_URL` (default: `https://api.trongrid.io/v1`)

## Provider Rules
- API keys and base URLs are read from `.env` via `backend/core/config.py`.
- Missing keys disable that provider (the sync returns an empty list and keeps cursors unchanged).

## Manual Verification Steps

### Ethereum / Polygon / BSC
1. Set the relevant `*SCAN` API key in `.env`.
2. Link a Web3 wallet on the chain via `/api/accounts/link/web3`.
3. Trigger sync: `POST /api/accounts/{account_id}/sync?initial_sync=true`.
4. Verify transactions and `raw_json` entries for native + token transfers.

### Solana
1. Set `HELIUS_API_KEY` (or `HELIUS_RPC_URL`) in `.env`.
2. Link a Solana wallet and run a sync.
3. Confirm SOL + SPL token transfers were persisted with token mints in `currency`.

### Bitcoin
1. Set `BITQUERY_API_KEY` (preferred) or rely on `BLOCKCHAIN_COM_URL` fallback.
2. Link a BTC wallet and run a sync.
3. Confirm inflow/outflow entries and `raw_json` from UTXO aggregation.

### Cardano
1. Set `BLOCKFROST_API_KEY`.
2. Link a Cardano wallet and run a sync.
3. Confirm inflow/outflow entries computed from UTXO comparisons.

### XRP Ledger
1. Ensure `XRPSCAN_URL` is reachable.
2. Link an XRP wallet and run a sync.
3. Confirm Payment transactions and IOU transfers (if present).

### Tron
1. Set `TRONGRID_API_KEY` (preferred) or rely on `TRONSCAN_BASE_URL` fallback.
2. Link a Tron wallet and run a sync.
3. Confirm TRX transfers and token transfers when `tokenInfo` is present.
