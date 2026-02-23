# jualuma Backend (FastAPI)

## Key Endpoints
- **API:** `http://localhost:8001`
- **Docs:** `http://localhost:8001/docs`
- **MCP (Agent Tools):** `http://localhost:8001/mcp`
- **MCP (Dev Admin):** `http://localhost:8001/mcp-dev` (Local Only)

## Development
- Dependencies: `requirements.txt`
- Env: `.env` (loaded via `backend.core.settings`)
- Local template: copy repo-root `.env.example` to repo-root `.env`
- Active Web3 provider env contract: `TATUM_API_KEY`, `TATUM_BASE_URL`, `TATUM_TIMEOUT_SECONDS`, `TATUM_RETRY_MAX_ATTEMPTS`, `TATUM_RETRY_BASE_BACKOFF_MS`
