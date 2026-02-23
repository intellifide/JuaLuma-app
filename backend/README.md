# JuaLuma Backend

FastAPI service for auth, accounts, transactions, AI routes, billing, support, and MCP tools.

## Runtime Endpoints

- API: `http://localhost:8001`
- OpenAPI docs: `http://localhost:8001/docs`
- MCP server: `http://localhost:8001/mcp`
- Dev MCP server (local only): `http://localhost:8001/mcp-dev`

## Key Paths

- App entrypoint: `backend/main.py`
- API routers: `backend/api/`
- Domain services: `backend/services/`
- Models: `backend/models/`
- Scripts: `backend/scripts/`

## Run

Preferred local run is via root `docker-compose.yml`.

```bash
docker compose up -d --build backend
```

## Test

```bash
pip install -r requirements.txt
pytest backend/tests
```

## Notes

- Environment is loaded from root `.env` via `backend.core.settings`.
- `mcp-dev` contains privileged development tooling and is mounted only when `APP_ENV=local`.
