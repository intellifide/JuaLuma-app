"""Rename transaction category Miscellaneous to Other.

Revision ID: f6a1c3e9b2d4
Revises: 9b2c4d6e8f01, e3c8a1b2d4f5
Create Date: 2026-02-10 13:05:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a1c3e9b2d4"
down_revision: str | Sequence[str] | None = ("9b2c4d6e8f01", "e3c8a1b2d4f5")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE transactions
        SET category = 'Other'
        WHERE category IN ('Miscellaneous', 'miscellaneous', 'MISCELLANEOUS', 'misc', 'Misc');
        """
    )


def downgrade() -> None:
    # Irreversible safely: prior free-text categories may already contain "Other".
    pass
