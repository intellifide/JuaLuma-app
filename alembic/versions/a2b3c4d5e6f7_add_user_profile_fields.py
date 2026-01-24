"""Add user profile fields for display names

Revision ID: a2b3c4d5e6f7
Revises: 7f1c2d3e4a5b
Create Date: 2026-01-23 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: str | None = "7f1c2d3e4a5b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add user profile fields for display names
    op.add_column(
        "users",
        sa.Column("first_name", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_name", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("username", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "display_name_pref",
            sa.String(length=16),
            nullable=True,
            server_default="name",
            comment="name|username - preference for displaying user name in transactions",
        ),
    )
    # Add unique constraint for username
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    # Remove unique constraint for username
    op.drop_constraint("uq_users_username", "users", type_="unique")
    # Remove user profile fields
    op.drop_column("users", "display_name_pref")
    op.drop_column("users", "username")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
