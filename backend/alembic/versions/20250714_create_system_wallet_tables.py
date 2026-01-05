"""Create system_wallets and fee_history tables

Revision ID: create_system_wallet_tables
Revises: 
Create Date: 2025-07-14

Sistema de taxas e receita da plataforma HOLD Wallet
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

# revision identifiers, used by Alembic.
revision = 'create_system_wallet_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Criar tabelas para sistema de taxas"""
    
    # Tabela system_wallets - Carteira do sistema para receber taxas
    op.create_table(
        'system_wallets',
        sa.Column('id', sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('name', sa.String(100), nullable=False, default='Main System Wallet'),
        sa.Column('description', sa.Text, nullable=True),
        
        # Balances per cryptocurrency
        sa.Column('btc_balance', sa.Numeric(precision=18, scale=8), default=0.0, nullable=False),
        sa.Column('eth_balance', sa.Numeric(precision=18, scale=8), default=0.0, nullable=False),
        sa.Column('usdt_balance', sa.Numeric(precision=18, scale=8), default=0.0, nullable=False),
        sa.Column('usdc_balance', sa.Numeric(precision=18, scale=8), default=0.0, nullable=False),
        sa.Column('sol_balance', sa.Numeric(precision=18, scale=8), default=0.0, nullable=False),
        sa.Column('brl_balance', sa.Numeric(precision=18, scale=2), default=0.0, nullable=False),
        
        # Total fees collected (for reference)
        sa.Column('total_fees_collected_brl', sa.Numeric(precision=18, scale=2), default=0.0, nullable=False),
        
        # Status
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Tabela fee_history - Histórico de taxas coletadas
    op.create_table(
        'fee_history',
        sa.Column('id', sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
        
        # Reference to trade/transaction
        sa.Column('trade_id', sa.Integer, nullable=True),  # FK to p2p_trades
        sa.Column('transaction_id', sa.String(36), nullable=True),  # FK to transactions
        
        # Fee details
        sa.Column('trade_type', sa.String(50), nullable=False),  # p2p_commission, otc_spread, network_fee, etc.
        sa.Column('cryptocurrency', sa.String(20), nullable=False),
        sa.Column('fiat_currency', sa.String(10), nullable=True, default='BRL'),
        
        # Amounts
        sa.Column('gross_amount', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('fee_percentage', sa.Numeric(precision=5, scale=2), nullable=False),  # e.g., 0.50 for 0.5%
        sa.Column('fee_amount', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('net_amount', sa.Numeric(precision=18, scale=8), nullable=False),
        
        # Fee in BRL (for reporting)
        sa.Column('fee_amount_brl', sa.Numeric(precision=18, scale=2), nullable=True),
        
        # User info
        sa.Column('payer_user_id', sa.String(36), nullable=True),  # User who paid the fee
        sa.Column('receiver_user_id', sa.String(36), nullable=True),  # User who received net amount
        
        # System wallet
        sa.Column('system_wallet_id', sa.String(36), sa.ForeignKey('system_wallets.id'), nullable=True),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, default='collected'),  # collected, pending, refunded
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Criar índices para performance
    op.create_index('idx_fee_history_trade_id', 'fee_history', ['trade_id'])
    op.create_index('idx_fee_history_trade_type', 'fee_history', ['trade_type'])
    op.create_index('idx_fee_history_created_at', 'fee_history', ['created_at'])
    op.create_index('idx_fee_history_status', 'fee_history', ['status'])
    op.create_index('idx_fee_history_cryptocurrency', 'fee_history', ['cryptocurrency'])
    
    # Inserir carteira do sistema padrão
    op.execute("""
        INSERT INTO system_wallets (id, name, description, btc_balance, eth_balance, usdt_balance, usdc_balance, sol_balance, brl_balance, total_fees_collected_brl, is_active)
        VALUES (
            'main-system-wallet',
            'HOLD Wallet System',
            'Main system wallet for collecting platform fees',
            0, 0, 0, 0, 0, 0, 0, true
        )
    """)


def downgrade() -> None:
    """Remover tabelas"""
    op.drop_table('fee_history')
    op.drop_table('system_wallets')
