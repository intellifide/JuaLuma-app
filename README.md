# JuaLuma App

JuaLuma is a financial aggregation platform owned and operated by `Intellifide LLC`.

## Monorepo Layout

- `backend/` - FastAPI API, integrations, jobs, MCP endpoints.
- `frontend-app/` - Main authenticated user app (Vite + React).
- `frontend-marketing/` - Public marketing and legal site (Next.js).
- `support-portal/` - Support operations frontend (Vite + React).
- `infra/` - Terraform for `dev` -> `stage` -> `prod` environments.
- `docs/` - legal, compliance, runbooks, release docs.

## Local Run (Canonical)

1. Create root `.env` with required values used by `docker-compose.yml`.
2. Start all services:

```bash
docker compose up -d --build
```

3. Access services:
- App frontend: `http://localhost:5175`
- Support portal: `http://localhost:5176`
- Marketing site: `http://localhost:5177`
- Backend API: `http://localhost:8001`
- Backend docs: `http://localhost:8001/docs`
- PostgreSQL: `localhost:5433`

## Service Docs

- Backend: `backend/README.md`
- Frontend app: `frontend-app/README.md`
- Marketing site: `frontend-marketing/README.md`
- Support portal: `support-portal/README.md`
- Infrastructure: `infra/README.md`

## Collaboration Workflow

- Local first: implement and validate in this repo.
- GitHub second: merge via PR and let CI/CD promote.
- Promotion order: `dev` -> `stage` -> `prod` only.
- Do not make direct Cloud Run env/secret/config edits except incident break-glass.
- Copy `.env.example` to `.env`, then fill required values.
- Active Web3 provider keys are Tatum-only (`TATUM_API_KEY`, `TATUM_BASE_URL`, retry/timeout settings).
- Web3 provider contract and support boundaries are documented in `docs/Web3-History-Providers.md`.

## Quick Validation Commands

```bash
# Backend
pip install -r requirements.txt
pytest backend/tests

# Frontend app
npm --prefix frontend-app run lint
npm --prefix frontend-app run test

# Marketing site
npm --prefix frontend-marketing run lint

# Support portal
npm --prefix support-portal run lint
npm --prefix support-portal run test
```

## License

This repository is source-available under `PolyForm Noncommercial License 1.0.0`.

- Canonical project license notice: `LICENSE`
- Full license text: `/legal/license`
