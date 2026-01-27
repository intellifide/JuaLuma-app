"""Add Plaid type fields to accounts

Revision ID: f4c2a8e7b9c1
Revises: c7f9d4b2a1e0
Create Date: 2026-01-27 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f4c2a8e7b9c1"
down_revision: str | None = "c7f9d4b2a1e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("plaid_type", sa.String(length=64), nullable=True))
    op.add_column("accounts", sa.Column("plaid_subtype", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("accounts", "plaid_subtype")
    op.drop_column("accounts", "plaid_type")

