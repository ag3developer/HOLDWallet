"""Add receiving_method_id to instant_trades table

Revision ID: 20260117_add_receiving
Revises: 
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260117_add_receiving'
down_revision = None  # This will be auto-resolved
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add receiving_method_id column to instant_trades table
    # This column stores the user's payment method ID for receiving payments (SELL operations)
    op.add_column(
        'instant_trades',
        sa.Column('receiving_method_id', sa.String(36), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('instant_trades', 'receiving_method_id')
