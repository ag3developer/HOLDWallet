"""merge_wolkpay_and_pix_columns

Revision ID: 8de855f0ca91
Revises: 20260107_wolkpay, 20260110_add_pix_columns
Create Date: 2026-01-10 22:04:44.659521

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8de855f0ca91'
down_revision = ('20260107_wolkpay', '20260110_add_pix_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
