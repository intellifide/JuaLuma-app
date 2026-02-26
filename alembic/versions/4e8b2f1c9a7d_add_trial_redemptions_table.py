"""Add trial_redemptions table

Revision ID: 4e8b2f1c9a7d
Revises: 1f3a9c7d8e2b
Create Date: 2026-02-25 09:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4e8b2f1c9a7d"
down_revision: str | None = "1f3a9c7d8e2b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "trial_redemptions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("uid", sa.String(length=128), nullable=True),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("card_last4", sa.String(length=4), nullable=True),
        sa.Column("card_fingerprint", sa.String(length=128), nullable=True),
        sa.Column("stripe_customer_id", sa.String(length=128), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=128), nullable=True),
        sa.Column("plan_code", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "stripe_subscription_id",
            name="uq_trial_redemptions_subscription_id",
        ),
    )
    op.create_index(
        "ix_trial_redemptions_email_normalized",
        "trial_redemptions",
        ["email_normalized"],
        unique=False,
    )
    op.create_index(
        "ix_trial_redemptions_card_last4",
        "trial_redemptions",
        ["card_last4"],
        unique=False,
    )
    op.create_index(
        "ix_trial_redemptions_card_fingerprint",
        "trial_redemptions",
        ["card_fingerprint"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_trial_redemptions_card_fingerprint", table_name="trial_redemptions")
    op.drop_index("ix_trial_redemptions_card_last4", table_name="trial_redemptions")
    op.drop_index("ix_trial_redemptions_email_normalized", table_name="trial_redemptions")
    op.drop_table("trial_redemptions")
