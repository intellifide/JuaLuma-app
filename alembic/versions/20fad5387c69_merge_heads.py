"""merge heads

Revision ID: 20fad5387c69
Revises: 3b9f7c2d1a4e, 9d6c4b1a2f3e
Create Date: 2026-01-30 20:03:31.243977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20fad5387c69'
down_revision: Union[str, None] = ('3b9f7c2d1a4e', '9d6c4b1a2f3e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
