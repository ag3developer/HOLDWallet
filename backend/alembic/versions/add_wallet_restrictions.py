"""
Add wallet restriction fields for granular blocking

Esta migration adiciona campos para bloqueio granular por tipo de operação:
- is_blocked: Bloqueio total da wallet
- blocked_at, blocked_reason, blocked_by: Metadados do bloqueio
- restrict_*: Flags de restrição por tipo de operação

Revision ID: add_wallet_restrictions
Create Date: 2026-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_wallet_restrictions'
down_revision = None  # Ajustar para o último migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar campos de bloqueio na tabela wallets
    op.add_column('wallets', sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('blocked_at', sa.DateTime(), nullable=True))
    op.add_column('wallets', sa.Column('blocked_reason', sa.Text(), nullable=True))
    op.add_column('wallets', sa.Column('blocked_by', sa.String(100), nullable=True))
    
    # Adicionar campos de restrição granular
    op.add_column('wallets', sa.Column('restrict_instant_trade', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('restrict_deposits', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('restrict_withdrawals', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('restrict_p2p', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('restrict_transfers', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('restrict_swap', sa.Boolean(), nullable=False, server_default='false'))
    
    # Criar índice para busca rápida de wallets bloqueadas
    op.create_index('ix_wallets_is_blocked', 'wallets', ['is_blocked'])


def downgrade():
    # Remover índice
    op.drop_index('ix_wallets_is_blocked', table_name='wallets')
    
    # Remover campos de restrição granular
    op.drop_column('wallets', 'restrict_swap')
    op.drop_column('wallets', 'restrict_transfers')
    op.drop_column('wallets', 'restrict_p2p')
    op.drop_column('wallets', 'restrict_withdrawals')
    op.drop_column('wallets', 'restrict_deposits')
    op.drop_column('wallets', 'restrict_instant_trade')
    
    # Remover campos de bloqueio
    op.drop_column('wallets', 'blocked_by')
    op.drop_column('wallets', 'blocked_reason')
    op.drop_column('wallets', 'blocked_at')
    op.drop_column('wallets', 'is_blocked')
