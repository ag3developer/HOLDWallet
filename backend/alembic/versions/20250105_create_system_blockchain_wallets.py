"""Create system_blockchain_wallets tables

Revision ID: create_system_blockchain_wallets
Revises: create_system_wallet_tables
Create Date: 2025-01-05

Tabelas para carteiras blockchain REAIS do sistema.
Usa o mesmo protocolo de segurança das carteiras dos usuários.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'create_system_blockchain_wallets'
down_revision = 'create_system_wallet_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Tabela principal: Carteiras blockchain do sistema
    op.create_table(
        'system_blockchain_wallets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('wallet_type', sa.String(50), nullable=False, server_default='fees'),
        sa.Column('description', sa.Text, nullable=True),
        
        # Segurança - Mnemonic criptografada
        sa.Column('encrypted_seed', sa.Text, nullable=False),
        sa.Column('seed_hash', sa.String(64), nullable=False),
        
        # BIP44
        sa.Column('derivation_path', sa.String(100), nullable=True),
        
        # Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_locked', sa.Boolean, nullable=False, server_default='false'),
        
        # Auditoria
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_accessed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Tabela de endereços blockchain do sistema
    op.create_table(
        'system_blockchain_addresses',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('system_blockchain_wallets.id'), nullable=False),
        
        # Endereço
        sa.Column('address', sa.String(255), nullable=False),
        sa.Column('network', sa.String(50), nullable=False),
        
        # Segurança
        sa.Column('encrypted_private_key', sa.Text, nullable=True),
        
        # Derivation
        sa.Column('derivation_index', sa.Integer, nullable=True),
        sa.Column('derivation_path', sa.String(100), nullable=True),
        
        # Cache de saldo
        sa.Column('cached_balance', sa.Float, server_default='0'),
        sa.Column('cached_balance_updated_at', sa.DateTime, nullable=True),
        
        # Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('address_type', sa.String(50), server_default='receiving'),
        sa.Column('label', sa.String(100), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Tabela de transações das carteiras do sistema
    op.create_table(
        'system_wallet_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('address_id', sa.Integer, sa.ForeignKey('system_blockchain_addresses.id'), nullable=False),
        
        # Transação
        sa.Column('tx_hash', sa.String(255), nullable=True),
        sa.Column('direction', sa.String(10), nullable=False),  # in, out
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('cryptocurrency', sa.String(20), nullable=False),
        
        # Origem/Destino
        sa.Column('from_address', sa.String(255), nullable=True),
        sa.Column('to_address', sa.String(255), nullable=True),
        
        # Referência interna
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        
        # Status
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('confirmations', sa.Integer, server_default='0'),
        
        # Valores em moedas fiat
        sa.Column('usd_value_at_time', sa.Float, nullable=True),
        sa.Column('brl_value_at_time', sa.Float, nullable=True),
        
        # Notas
        sa.Column('notes', sa.Text, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('confirmed_at', sa.DateTime, nullable=True)
    )
    
    # Índices para performance
    op.create_index('idx_sys_blockchain_wallets_name', 'system_blockchain_wallets', ['name'])
    op.create_index('idx_sys_blockchain_wallets_active', 'system_blockchain_wallets', ['is_active'])
    
    op.create_index('idx_sys_blockchain_addresses_wallet', 'system_blockchain_addresses', ['wallet_id'])
    op.create_index('idx_sys_blockchain_addresses_network', 'system_blockchain_addresses', ['network'])
    op.create_index('idx_sys_blockchain_addresses_address', 'system_blockchain_addresses', ['address'])
    
    op.create_index('idx_sys_wallet_tx_address', 'system_wallet_transactions', ['address_id'])
    op.create_index('idx_sys_wallet_tx_hash', 'system_wallet_transactions', ['tx_hash'])
    op.create_index('idx_sys_wallet_tx_created', 'system_wallet_transactions', ['created_at'])


def downgrade():
    op.drop_index('idx_sys_wallet_tx_created', 'system_wallet_transactions')
    op.drop_index('idx_sys_wallet_tx_hash', 'system_wallet_transactions')
    op.drop_index('idx_sys_wallet_tx_address', 'system_wallet_transactions')
    
    op.drop_index('idx_sys_blockchain_addresses_address', 'system_blockchain_addresses')
    op.drop_index('idx_sys_blockchain_addresses_network', 'system_blockchain_addresses')
    op.drop_index('idx_sys_blockchain_addresses_wallet', 'system_blockchain_addresses')
    
    op.drop_index('idx_sys_blockchain_wallets_active', 'system_blockchain_wallets')
    op.drop_index('idx_sys_blockchain_wallets_name', 'system_blockchain_wallets')
    
    op.drop_table('system_wallet_transactions')
    op.drop_table('system_blockchain_addresses')
    op.drop_table('system_blockchain_wallets')
