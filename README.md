<!-- Updated 2025-12-10 14:58 CST by ChatGPT -->
# Finity App

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![License](https://img.shields.io/badge/license-MIT-blue)

Finity is a modern financial management app that syncs bank data, tracks manual assets, surfaces AI-powered insights, and offers a marketplace for extensible widgets.

## Overview
- **Bank integration**: Plaid-powered sync for accounts and transactions.
- **Manual assets**: Track real estate, vehicles, crypto, and other holdings.
- **AI assistant**: Conversational guidance with spending summaries and budgeting tips.
- **Marketplace**: Developer-published widgets with ratings and payouts.
- **Support portal**: Ticketing and notifications for customers and support staff.

## Technology Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Storybook
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pydantic
- **Data**: PostgreSQL (Cloud SQL) plus Firestore
- **Auth**: Firebase Authentication
- **Infra**: Terraform on Google Cloud Platform

## Local Setup
See the detailed [Local Development Setup](docs/local-development-setup.md) for emulator configuration and environment variables.

### Quick Start
1. **Clone**
   ```bash
   git clone https://github.com/TCoder920x/finity-app.git
   cd finity-app
   ```
2. **Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. **Frontend**
   ```bash
   cd frontend
   pnpm install        # or npm install
   pnpm dev            # runs Vite on 5175
   ```

## Useful Scripts
- Frontend lint: `pnpm lint`
- Frontend tests: `pnpm test`
- Storybook (docs): `pnpm storybook` / `pnpm build-storybook`
- Backend tests: `pytest` (from `backend`)

## Contribution Guidelines
- Create a feature branch from `Dev`.
- Keep changes small; add tests and docs as needed.
- Run lint/tests before opening a PR (`pnpm lint && pnpm test` in frontend, `pytest` in backend).
- Use clear commit messages; avoid committing secrets or `.env`.

## License
MIT licensed — see [LICENSE](LICENSE) for details.
