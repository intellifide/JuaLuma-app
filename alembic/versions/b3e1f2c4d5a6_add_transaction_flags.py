"""Add transaction flags for sync, manual, and search indexes."""

# Updated 2025-12-08 21:27 CST by ChatGPT

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3e1f2c4d5a6"
down_revision: Union[str, None] = "db65f46961a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("external_id", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "is_manual",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.create_index(
        "idx_transactions_merchant_description",
        "transactions",
        ["merchant_name", "description"],
        unique=False,
    )
    op.create_index(
        "idx_transactions_external_id_uid",
        "transactions",
        ["uid", "external_id"],
        unique=True,
    )

    op.alter_column("transactions", "is_manual", server_default=None)
    op.alter_column("transactions", "archived", server_default=None)


def downgrade() -> None:
    op.alter_column(
        "transactions",
        "archived",
        server_default=sa.text("false"),
    )
    op.alter_column(
        "transactions",
        "is_manual",
        server_default=sa.text("false"),
    )

    op.drop_index("idx_transactions_external_id_uid", table_name="transactions")
    op.drop_index("idx_transactions_merchant_description", table_name="transactions")
    op.drop_column("transactions", "archived")
    op.drop_column("transactions", "is_manual")
    op.drop_column("transactions", "external_id")
