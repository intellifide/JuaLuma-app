"""Add account classification overrides and manual asset balance types

Revision ID: 3b9f7c2d1a4e
Revises: f4c2a8e7b9c1
Create Date: 2026-01-27 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3b9f7c2d1a4e"
down_revision: str | None = "f4c2a8e7b9c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("category_override", sa.String(length=32), nullable=True))
    op.add_column("accounts", sa.Column("balance_type", sa.String(length=16), nullable=True))

    op.add_column(
        "manual_assets",
        sa.Column("balance_type", sa.String(length=16), nullable=False, server_default="asset"),
    )
    op.execute("ALTER TABLE manual_assets DROP CONSTRAINT IF EXISTS ck_manual_asset_type")
    op.create_check_constraint(
        "ck_manual_asset_type",
        "manual_assets",
        "asset_type IN ('house', 'car', 'collectible', 'real_estate')",
    )
    op.create_check_constraint(
        "ck_manual_asset_balance_type",
        "manual_assets",
        "balance_type IN ('asset', 'liability')",
    )


def downgrade() -> None:
    op.execute("ALTER TABLE manual_assets DROP CONSTRAINT IF EXISTS ck_manual_asset_balance_type")
    op.execute("ALTER TABLE manual_assets DROP CONSTRAINT IF EXISTS ck_manual_asset_type")
    op.create_check_constraint(
        "ck_manual_asset_type",
        "manual_assets",
        "asset_type IN ('house', 'car', 'collectible')",
    )
    op.drop_column("manual_assets", "balance_type")
    op.drop_column("accounts", "balance_type")
    op.drop_column("accounts", "category_override")
