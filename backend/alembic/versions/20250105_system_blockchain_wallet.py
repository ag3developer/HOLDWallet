"""Create system blockchain wallet tables

Revision ID: 20250105_system_blockchain_wallet
Revises: 
Create Date: 2026-01-05

Tabelas para carteiras blockchain REAIS do sistema.
Suporta as 16 redes dos usuários:
- avalanche, base, bitcoin, bsc, cardano, chainlink
- dogecoin, ethereum, litecoin, multi, polkadot, polygon
- shiba, solana, tron, xrp
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = '20250105_system_blockchain_wallet'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Tabela principal: system_blockchain_wallets
    op.create_table(
        'system_blockchain_wallets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('wallet_type', sa.String(50), nullable=False, default='fees'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('encrypted_seed', sa.Text, nullable=False),
        sa.Column('seed_hash', sa.String(64), nullable=False),
        sa.Column('derivation_path', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_locked', sa.Boolean, default=False, nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('last_accessed_by', UUID(as_uuid=True), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Tabela de endereços: system_blockchain_addresses
    op.create_table(
        'system_blockchain_addresses',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('wallet_id', UUID(as_uuid=True), sa.ForeignKey('system_blockchain_wallets.id'), nullable=False),
        sa.Column('address', sa.String(255), nullable=False),
        sa.Column('network', sa.String(50), nullable=False),
        sa.Column('cryptocurrency', sa.String(20), nullable=True),
        sa.Column('encrypted_private_key', sa.Text, nullable=True),
        sa.Column('derivation_index', sa.Integer, nullable=True),
        sa.Column('derivation_path', sa.String(100), nullable=True),
        sa.Column('cached_balance', sa.Float, default=0.0),
        sa.Column('cached_balance_usd', sa.Float, default=0.0),
        sa.Column('cached_balance_updated_at', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('address_type', sa.String(50), default='receiving'),
        sa.Column('label', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Tabela de transações: system_wallet_transactions
    op.create_table(
        'system_wallet_transactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('address_id', sa.Integer, sa.ForeignKey('system_blockchain_addresses.id'), nullable=False),
        sa.Column('tx_hash', sa.String(255), nullable=True),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('cryptocurrency', sa.String(20), nullable=False),
        sa.Column('network', sa.String(50), nullable=True),
        sa.Column('from_address', sa.String(255), nullable=True),
        sa.Column('to_address', sa.String(255), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('confirmations', sa.Integer, default=0),
        sa.Column('usd_value_at_time', sa.Float, nullable=True),
        sa.Column('brl_value_at_time', sa.Float, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime, nullable=True),
    )
    
    # Índices para performance
    op.create_index('idx_system_addresses_wallet_id', 'system_blockchain_addresses', ['wallet_id'])
    op.create_index('idx_system_addresses_network', 'system_blockchain_addresses', ['network'])
    op.create_index('idx_system_addresses_address', 'system_blockchain_addresses', ['address'])
    op.create_index('idx_system_tx_address_id', 'system_wallet_transactions', ['address_id'])
    op.create_index('idx_system_tx_hash', 'system_wallet_transactions', ['tx_hash'])
    op.create_index('idx_system_tx_status', 'system_wallet_transactions', ['status'])


def downgrade():
    op.drop_index('idx_system_tx_status')
    op.drop_index('idx_system_tx_hash')
    op.drop_index('idx_system_tx_address_id')
    op.drop_index('idx_system_addresses_address')
    op.drop_index('idx_system_addresses_network')
    op.drop_index('idx_system_addresses_wallet_id')
    op.drop_table('system_wallet_transactions')
    op.drop_table('system_blockchain_addresses')
    op.drop_table('system_blockchain_wallets')
