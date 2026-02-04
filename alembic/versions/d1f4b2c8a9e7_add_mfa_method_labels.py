"""Add MFA method labels

Revision ID: d1f4b2c8a9e7
Revises: c5d9f7a1b2e3
Create Date: 2026-02-04 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1f4b2c8a9e7"
down_revision: str | None = "c5d9f7a1b2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("totp_label", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("passkey_label", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "passkey_label")
    op.drop_column("users", "totp_label")

