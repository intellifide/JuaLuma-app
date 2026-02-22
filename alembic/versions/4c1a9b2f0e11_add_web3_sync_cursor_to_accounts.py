"""Add web3 sync cursor tracking to accounts

Revision ID: 4c1a9b2f0e11
Revises: 328a88a1e3b3
Create Date: 2026-01-15 09:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4c1a9b2f0e11"
down_revision: str | None = "d2863d2356f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column("web3_sync_cursor", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "accounts",
        sa.Column("web3_sync_chain", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("accounts", "web3_sync_chain")
    op.drop_column("accounts", "web3_sync_cursor")
