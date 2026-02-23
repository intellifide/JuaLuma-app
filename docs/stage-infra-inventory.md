# Stage Infrastructure Inventory

Last updated: 2026-02-22 (UTC)

## Project

- Project ID: `jualuma-stage`
- Project Number: `116013405435`
- Region: `us-central1`
- Environment tag: `483588210239/environment/staging`

## Artifact Registry

- Repository: `jualuma-repo` (Docker, `us-central1`)

## Cloud Run Services

- `jualuma-backend-stage`
- `jualuma-approvals-stage`
- `jualuma-user-app-stage`
- `jualuma-marketing-stage`
- `jualuma-support-stage`

## Service Accounts

- `cr-backend@jualuma-stage.iam.gserviceaccount.com`
- `cr-approvals@jualuma-stage.iam.gserviceaccount.com`
- `cr-frontend@jualuma-stage.iam.gserviceaccount.com`

## Cloud SQL

- Instance: `jualuma-db-stage`
- Engine: `POSTGRES_15`
- Region: `us-central1`
- Tier: `db-custom-1-3840`
- Database: `jualuma`
