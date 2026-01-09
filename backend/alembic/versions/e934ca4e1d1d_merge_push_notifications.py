"""merge_push_notifications

Revision ID: e934ca4e1d1d
Revises: 20260601_push_notifications, ad21bac2d921
Create Date: 2026-01-08 20:47:50.047088

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e934ca4e1d1d'
down_revision = ('20260601_push_notifications', 'ad21bac2d921')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
