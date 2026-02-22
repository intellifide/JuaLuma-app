"""Expand transaction currency length.

Revision ID: 7f1c2d3e4a5b
Revises: 4c1a9b2f0e11
Create Date: 2026-01-23 07:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f1c2d3e4a5b"
down_revision: str | None = "4c1a9b2f0e11"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "transactions",
        "currency",
        existing_type=sa.String(length=3),
        type_=sa.String(length=16),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "transactions",
        "currency",
        existing_type=sa.String(length=16),
        type_=sa.String(length=3),
        existing_nullable=False,
    )
