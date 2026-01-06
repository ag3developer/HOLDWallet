"""Add BRL amount columns to instant_trades

Revision ID: 20260106_brl_amount
Revises: bd3e5ab55526
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260106_brl_amount'
down_revision = None  # Will be applied independently
branch_labels = None
depends_on = None


def upgrade():
    """Add BRL amount columns for TED/PIX payments"""
    # Add brl_amount column
    op.add_column(
        'instant_trades',
        sa.Column('brl_amount', sa.Numeric(18, 2), nullable=True)
    )
    
    # Add brl_total_amount column
    op.add_column(
        'instant_trades',
        sa.Column('brl_total_amount', sa.Numeric(18, 2), nullable=True)
    )
    
    # Add usd_to_brl_rate column
    op.add_column(
        'instant_trades',
        sa.Column('usd_to_brl_rate', sa.Numeric(10, 4), nullable=True)
    )


def downgrade():
    """Remove BRL amount columns"""
    op.drop_column('instant_trades', 'usd_to_brl_rate')
    op.drop_column('instant_trades', 'brl_total_amount')
    op.drop_column('instant_trades', 'brl_amount')
