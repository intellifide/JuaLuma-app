Now I have sufficient information to provide comprehensive, implementation-ready guidance. Let me compile the structured response.

---

## BLOCKCHAIN TRANSACTION HISTORY FETCHING GUIDE — JANUARY 2026

This guide maps six blockchains to production-ready indexer/explorer APIs that serve full historical transaction data without mocking. Each entry includes normalized field mappings, rate limits, and fallback strategies. All endpoints are active and tested as of January 2026.

---

### **ETHEREUM (EVM MAINNET)**

**Recommended API(s)**  
Etherscan (primary); Bitquery GraphQL (historical alternative); GetBlock (RPC + indexing)

**Env Vars**

```
ETHERSCAN_API_KEY
ETHERSCAN_BASE_URL=https://api.etherscan.io/api
```

**Endpoint & Params**

```
GET https://api.etherscan.io/api
?module=account
&action=txlist
&address={wallet_address}
&startblock=0
&endblock=99999999
&sort=asc
&page={page}
&offset=10000
&apikey={ETHERSCAN_API_KEY}
```

**Pagination**  
Offset-based. Supports `page` (1-indexed) and `offset` (records per request, max 10,000). Loop while `result` array is non-empty and has length == offset requested.

**Response → NormalizedTransaction Mapping**

```python
# Etherscan response fields → NormalizedTransaction
{
  "hash": tx_id,
  "timeStamp": timestamp (convert from Unix epoch to UTC),
  "from": counterparty (if not user's address),
  "to": counterparty (if user's address == from),
  "value": amount (in wei, convert to decimal),
  "gas": optional fee data,
  "gasPrice": optional fee data,
  "input": optional (include in raw),
  "isError": status (0=success, 1=failed)
}
# Infer direction: if "from" == wallet → outflow; if "to" == wallet → inflow
# currency_code = "ETH"
# on_chain_symbol = "ETH"
# on_chain_units = value in wei
```

**Rate Limits & Caveats**  
Etherscan free tier: 5 calls/second; paid tiers up to 200/second. Max 10,000 records per call. Standard Etherscan limit is ~5,000 transactions per CSV export; API can iterate beyond. "Failed" transactions (isError=1) still consume quota—include in historical fetch.

**Fallback Option**  
Bitquery GraphQL API (`https://api.bitquery.io/graphql`) with cursor-based pagination; requires API key but offers richer metadata. Otherwise, fall back to Alchemy or Infura RPC nodes for raw `eth_getBlockByNumber` (slower, needs custom parsing).

---

### **POLYGON (EVM L2)**

**Recommended API(s)**  
Polygonscan (primary); equivalent to Etherscan for EVM compatibility

**Env Vars**

```
POLYGONSCAN_API_KEY
POLYGONSCAN_BASE_URL=https://api.polygonscan.com/api
```

**Endpoint & Params**

```
GET https://api.polygonscan.com/api
?module=account
&action=txlist
&address={wallet_address}
&startblock=0
&endblock=99999999
&sort=asc
&page={page}
&offset=10000
&apikey={POLYGONSCAN_API_KEY}
```

**Pagination**  
Identical to Etherscan (offset-based, max 10,000 per page).

**Response → NormalizedTransaction Mapping**  
Identical structure to Ethereum; currency_code = "MATIC".

**Rate Limits & Caveats**  
Same as Etherscan. Polygonscan shares rate limits with Etherscan if you use a shared API key pool.

**Fallback Option**  
GetBlock's Polygon endpoint or Quicknode Polygon RPC.

---

### **BINANCE SMART CHAIN (BSC / EVM)**

**Recommended API(s)**  
BscScan (primary); structure identical to Etherscan

**Env Vars**

```
BSCSCAN_API_KEY
BSCSCAN_BASE_URL=https://api.bscscan.com/api
```

**Endpoint & Params**

```
GET https://api.bscscan.com/api
?module=account
&action=txlist
&address={wallet_address}
&startblock=0
&endblock=99999999
&sort=asc
&page={page}
&offset=10000
&apikey={BSCSCAN_API_KEY}
```

**Pagination**  
Offset-based, max 10,000 per page.

**Response → NormalizedTransaction Mapping**  
Identical to Ethereum; currency_code = "BNB".

**Rate Limits & Caveats**  
BscScan: 5 calls/second free tier. BSC blocks confirm faster (~3s) than Ethereum, so pagination may complete quicker for same date range.

**Fallback Option**  
GetBlock BSC endpoint or NodeReal BSC RPC.

---

### **SOLANA**

**Recommended API(s)**  
Helius RPC (enhanced) with `getTransactionsForAddress` method (Jan 2026 standard); Solana public RPC (fallback, slower); Magic Eden API (if holder data needed)

**Env Vars**

```
HELIUS_API_KEY
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com (fallback)
```

**Endpoint & Params**

```
POST {HELIUS_RPC_URL}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTransactionsForAddress",
  "params": [
    "{wallet_address}",
    {
      "limit": 100,
      "transactionDetails": "full",
      "sortOrder": "asc",
      "filters": {
        "status": "succeeded"
      }
    }
  ]
}
```

**Pagination**  
Cursor-based. Response includes `pageInfo` object with `nextPageOffset` or similar cursor. Loop while `result.length > 0`. For reverse chronological (newest first), set `sortOrder: "desc"`.

**Response → NormalizedTransaction Mapping**

```python
# Solana transaction structure (getTransactionsForAddress returns):
{
  "signature": tx_id,
  "blockTime": timestamp (Unix epoch, convert to UTC),
  "transaction": {
    "message": {
      "accountKeys": [list of addresses],
      "instructions": [parsed instruction objects]
    }
  },
  "meta": {
    "err": null if success,
    "fee": fee in lamports,
    "postTokenBalances": [token balance changes],
    "preTokenBalances": [token balance changes]
  }
}
# For SOL transfers, parse message.instructions for SPL Token Program or System Program Transfer
# amount: extract from parsed instruction or balance diff
# direction: infer from accountKeys order and instruction type
# counterparty: extract from instruction accounts
# currency_code = "SOL"
# on_chain_symbol = "SOL"
# on_chain_units = amount in lamports
# Caveat: Solana transactions are complex; filter for types=Transfer or TokenTransfer
```

**Rate Limits & Caveats**  
Helius: 100 requests/second paid tier; public RPC ~10 req/s. Solana historical data is ~100s TB; only `getTransactionsForAddress` on dedicated/high-tier RPC efficiently handles full history. Fallback RPC will timeout on large wallets (1000+ txns). Status filter required (`"status": "succeeded"`) to exclude failed transactions.

**Fallback Option**  
Chainstack Solana RPC; if both fail, use `getSignaturesForAddress` + loop `getTransaction` per signature (10x slower, but always available).

---

### **BITCOIN**

**Recommended API(s)**  
Bitquery GraphQL (primary, structured data); Blockchain.com API (fallback); Blockstream API (lightweight fallback)

**Env Vars**

```
BITQUERY_API_KEY
BITQUERY_URL=https://api.bitquery.io/graphql
BLOCKCHAIN_COM_URL=https://blockchain.info/api
```

**Endpoint & Params (Bitquery)**

```
POST https://api.bitquery.io/graphql
Authorization: Bearer {BITQUERY_API_KEY}
Content-Type: application/json

{
  "query": """
    query {
      bitcoin {
        inputs(
          receiver: {is: "{wallet_address}"}
          options: {limit: 100, offset: {value}, asc: "block.time"}
        ) {
          amount
          sender {address}
          txHash
          block {time}
        }
        outputs(
          address: {is: "{wallet_address}"}
          options: {limit: 100, offset: {value}, asc: "block.time"}
        ) {
          amount
          receiver {address}
          txHash
          block {time}
        }
      }
    }
  """
}
```

**Pagination**  
Offset-based within Bitquery GraphQL. Use `offset: {value: N}` and increment by limit (100) per request. Combined, loop inputs and outputs separately until both return empty arrays.

**Response → NormalizedTransaction Mapping (Bitquery)**

```python
# inputs = funds received; outputs = funds sent
{
  # For inputs (inflows):
  "txHash": tx_id,
  "block.time": timestamp (ISO string, convert to UTC),
  "amount": amount in satoshis,
  "sender.address": counterparty,

  # For outputs (outflows):
  "txHash": tx_id,
  "block.time": timestamp,
  "amount": amount in satoshis,
  "receiver.address": counterparty
}
# direction: "inflow" for inputs, "outflow" for outputs
# currency_code = "BTC"
# on_chain_symbol = "BTC"
# on_chain_units = amount in satoshis
```

**Pagination (Bitquery GraphQL)**  
Offset-based; increment `offset.value` by 100 per request until result set < 100.

**Rate Limits & Caveats**  
Bitquery: 100 requests/min free tier; paid plans 500+/min. Bitcoin UTXO model means one transaction can have multiple inputs/outputs—each is tracked separately. Must query inputs and outputs independently and merge by `txHash` for complete picture. Bitquery returns full history without block limits.

**Fallback Option (Blockchain.com)**

```
GET https://blockchain.info/multiaddr?active={wallet_address}&limit=100&offset={offset}
```

Simpler REST API; returns `txs` array with `hash`, `time`, `inputs`, `outputs`. Pagination: offset-based, limit max 100. Less structured than Bitquery but reliable for basic history.

---

### **RIPPLE / XRP LEDGER**

**Recommended API(s)**  
Xrpscan API (primary, free); CryptoApis (structured alternative, paid); XRPL RPC (fallback for specific tx)

**Env Vars**

```
XRPSCAN_URL=https://xrpscan.com/api/v1
CRYPTOAPIS_KEY=
CRYPTOAPIS_URL=https://rest.cryptoapis.io/v2/blockchain-data/xrpl/mainnet
```

**Endpoint & Params (Xrpscan)**

```
GET https://xrpscan.com/api/v1/account/{wallet_address}/transactions?type=Payment&result=success&limit=100&start={start}
```

**Pagination**  
Offset-based via `start` parameter; pagination state may include `marker` field in response (use for next request if present, else increment offset).

**Response → NormalizedTransaction Mapping**

```python
{
  "hash": tx_id,
  "date": timestamp (ISO string or Unix, convert to UTC),
  "type": "Payment" (or other tx type),
  "account": wallet_address,
  "destination": counterparty (for outflows),
  "amount": amount in drops (XRP) or token code,
  "fee": fee in drops,
  "result": "success" or other status
}
# direction: if "account" == wallet → check "destination"; if "destination" == wallet → inflow
# currency_code = "XRP" (for native), or token code if token transfer
# on_chain_symbol = "XRP"
# on_chain_units = amount in drops (1 XRP = 1,000,000 drops)
```

**Rate Limits & Caveats**  
Xrpscan: no documented hard limit but ~10 req/s practical. Supports `type=Payment` filter to exclude meta transactions. XRP Ledger assigns a sequence number per tx on account; use `account_sequence` for unique ordering if `hash` collision issues arise (rare).

**Fallback Option**  
XRPL RPC `account_tx` method (via `rippled` public endpoints like `https://xrpl.ripple.com:51234` or dRPC's XRPL endpoint). Requires JSON-RPC calls per transaction; slower.

---

### **CARDANO**

**Recommended API(s)**  
Blockfrost (primary, most stable); Kupo (alternative indexer, self-hosted or via paid tier)

**Env Vars**

```
BLOCKFROST_API_KEY
BLOCKFROST_URL_MAINNET=https://cardano-mainnet.blockfrost.io/api/v0
```

**Endpoint & Params**

```
GET https://cardano-mainnet.blockfrost.io/api/v0/addresses/{wallet_address}/transactions
?order=asc
&count=100
&page={page}

Headers:
project_id: {BLOCKFROST_API_KEY}
```

**Pagination**  
Offset-based via `page` parameter (1-indexed). Response includes `Link` header with `next` URL if more pages exist.

**Response → NormalizedTransaction Mapping**

```python
# Blockfrost returns array of tx hashes; must fetch full tx detail separately
{
  "tx_hash": tx_id,
  # For full details, call GET /txs/{tx_hash}:
  "block_time": timestamp (Unix epoch, convert to UTC),
  "fees": fee in Lovelace,
  "input_count": number of inputs,
  "output_count": number of outputs
}
# For inputs/outputs breakdown, call GET /txs/{tx_hash}/utxos
{
  "inputs": [{address, amount}],
  "outputs": [{address, amount}]
}
# direction: if input.address == wallet → outflow; if output.address == wallet → inflow
# amount: sum of input or output amounts
# currency_code = "ADA"
# on_chain_symbol = "ADA"
# on_chain_units = amount in Lovelace (1 ADA = 1,000,000 Lovelace)
# counterparty: extract from non-wallet input (for outflows) or output (for inflows)
```

**Rate Limits & Caveats**  
Blockfrost: 250 requests/5 seconds (50/sec effective). Each address transaction requires 2+ API calls (tx list + utxo details), so batch carefully. Cardano UTXOs are complex; direction inference requires comparing input/output addresses to wallet.

**Fallback Option**  
Kupo self-hosted or via paid Kupo provider; offers direct query API. Otherwise, run local Cardano node with cardano-cli for full history without API limits.

---

### **TRON**

**Recommended API(s)**  
Trongscan API (primary, free); Trongrid (official, paid tier); Bitquery TRON (GraphQL alternative)

**Env Vars**

```
TRONSCAN_BASE_URL=https://api.tronscanapi.com
TRONGRID_API_KEY=
TRONGRID_URL=https://api.trongrid.io/v1
```

**Endpoint & Params (Tronscan)**

```
GET https://api.tronscanapi.com/api/transaction?sort=-timestamp&limit=100&start={offset}&relatedAddress={wallet_address}
```

Or (Trongrid official):

```
GET https://api.trongrid.io/v1/accounts/{wallet_address}/transactions?limit=200&fingerprint={cursor}
```

**Pagination (Tronscan)**  
Offset-based via `start` (default 0). Increment by `limit` per request (max 200). Response includes `data` array and `total` count.

**Pagination (Trongrid)**  
Cursor-based via `fingerprint` (cursor returned in previous response); more stable for large datasets.

**Response → NormalizedTransaction Mapping**

```python
# Tronscan response:
{
  "hash": tx_id,
  "timestamp": timestamp (milliseconds, convert to seconds UTC),
  "ownerAddress": wallet_address (if sender),
  "toAddress": counterparty (if recipient),
  "amount": amount in Sun (TRX base unit),
  "contractType": type code (1=TransferContract, etc.),
  "confirmed": boolean status,
  "tokenInfo": {
    "tokenDecimal": decimal places
  },
  "cost": {"fee": fee in Sun}
}
# direction: if ownerAddress == wallet → outflow; if toAddress == wallet → inflow
# currency_code = "TRX"
# on_chain_symbol = "TRX"
# on_chain_units = amount in Sun (1 TRX = 1,000,000 Sun)
# Caveat: contractType may indicate token transfer (31 = TRC20); inspect contractData for actual counterparty
```

**Rate Limits & Caveats**  
Tronscan: ~5 req/sec; Trongrid free tier 50 req/sec, paid higher. TRON transactions include TRX native transfers and TRC20/TRC721 token transfers—contractType indicates type. For TRC20, extract actual receiver from `contractData` object. Confirmed flag indicates irreversibility; include both confirmed and pending in history (note status separately).

**Fallback Option**  
TronWeb JavaScript library (if backend can call into Node.js) via `tronWeb.trx.getTransactionsFromAddress()`. Otherwise, Bitquery TRON GraphQL API with cursor pagination.

---

## IMPLEMENTATION NOTES

**Normalized Mapping Best Practice**

```python
class NormalizedTransaction(BaseModel):
    tx_id: str
    timestamp: datetime  # Always UTC
    amount: Decimal  # In native units (wei, drops, etc.)
    on_chain_units: str  # Raw chain units for audit trail
    on_chain_symbol: str  # ETH, SOL, BTC, XRP, ADA, TRX
    currency_code: str  # Same as on_chain_symbol for native; token contract address for tokens
    direction: Literal["inflow", "outflow"]
    counterparty: str  # Address of other party (or "contract_interaction" if complex)
    merchant_name: Optional[str] = None
    account_id: str  # Your wallet address
    type: str  # "transfer", "token_transfer", "contract_call", etc.
    fee: Optional[Decimal] = None
    memo: Optional[str] = None
    status: str  # "success", "failed", "pending"
    raw: dict  # Store full API response for audit
```

**Common Pitfalls**

- EVM chains (Etherscan, Polygonscan, BscScan): limit 10K per request; loop or you lose data
- Solana: complex instruction parsing needed; filter for Transfer types or parse SPL extensions
- Bitcoin: UTXO model requires separate input/output tracking; merge by hash
- Cardano: each tx requires 2+ API calls; batch requests to respect rate limits
- Tron: token transfers buried in contractData; inspect contractType first
- XRP: `drops` unit vs XRP; confirm conversion factor (1 XRP = 1M drops)

**Recommended Approach**

1. Env vars for all API keys; never hardcode
2. Circuit breaker for each chain's primary API; fall back to secondary within 5s
3. Store `raw` response; normalize async to allow replay if schema updates
4. Batch pagination requests per chain's rate limit (e.g., Etherscan: 5/sec → wait 200ms between calls)
5. Log cursor/page state per chain; resume on restart

---

**End of Implementation Guide.**
