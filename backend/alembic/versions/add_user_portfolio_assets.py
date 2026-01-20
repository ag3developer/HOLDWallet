"""Add user_portfolio_assets table

Revision ID: add_portfolio_assets
Revises: 
Create Date: 2026-01-14

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_portfolio_assets'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_portfolio_assets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('network', sa.String(50), nullable=True),
        sa.Column('total_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('cost_basis', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total_invested', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_portfolio_assets_user_id', 'user_portfolio_assets', ['user_id'])
    op.create_index('ix_user_portfolio_assets_symbol', 'user_portfolio_assets', ['symbol'])
    op.create_index('ix_user_portfolio_user_symbol', 'user_portfolio_assets', ['user_id', 'symbol'])


def downgrade():
    op.drop_index('ix_user_portfolio_user_symbol', table_name='user_portfolio_assets')
    op.drop_index('ix_user_portfolio_assets_symbol', table_name='user_portfolio_assets')
    op.drop_index('ix_user_portfolio_assets_user_id', table_name='user_portfolio_assets')
    op.drop_table('user_portfolio_assets')
