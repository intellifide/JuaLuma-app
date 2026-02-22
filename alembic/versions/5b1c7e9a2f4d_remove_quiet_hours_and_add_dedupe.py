"""Remove quiet hours and add notification dedupe

Revision ID: 5b1c7e9a2f4d
Revises: 20fad5387c69
Create Date: 2026-02-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5b1c7e9a2f4d"
down_revision: str | None = "20fad5387c69"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_dedupe",
        sa.Column("uid", sa.String(length=128), nullable=False),
        sa.Column("dedupe_key", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("uid", "dedupe_key"),
        sa.UniqueConstraint("uid", "dedupe_key", name="uq_notification_dedupe"),
    )

    with op.batch_alter_table("notification_settings") as batch_op:
        batch_op.drop_column("timezone")
        batch_op.drop_column("quiet_hours_start")
        batch_op.drop_column("quiet_hours_end")

    with op.batch_alter_table("notification_preferences") as batch_op:
        batch_op.drop_column("quiet_hours_start")
        batch_op.drop_column("quiet_hours_end")


def downgrade() -> None:
    with op.batch_alter_table("notification_preferences") as batch_op:
        batch_op.add_column(sa.Column("quiet_hours_end", sa.Time(), nullable=True))
        batch_op.add_column(sa.Column("quiet_hours_start", sa.Time(), nullable=True))

    with op.batch_alter_table("notification_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "quiet_hours_end",
                sa.Time(),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "quiet_hours_start",
                sa.Time(),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "timezone",
                sa.String(length=64),
                server_default="UTC",
                nullable=False,
            )
        )

    op.drop_table("notification_dedupe")
