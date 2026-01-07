"""merge_all_heads

Revision ID: ad21bac2d921
Revises: create_system_blockchain_wallets, 20250105_system_blockchain_wallet, 20251215_fix_user_id, 20260106_brl_amount, 20260106_2fa, bd3e5ab55526
Create Date: 2026-01-07 06:01:09.860045

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ad21bac2d921'
down_revision = ('create_system_blockchain_wallets', '20250105_system_blockchain_wallet', '20251215_fix_user_id', '20260106_brl_amount', '20260106_2fa', 'bd3e5ab55526')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
