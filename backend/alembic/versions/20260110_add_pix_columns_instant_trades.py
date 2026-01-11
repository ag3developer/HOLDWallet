"""Add PIX columns to instant_trades for Banco do Brasil integration

Revision ID: 20260110_add_pix_columns
Revises: 
Create Date: 2026-01-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260110_add_pix_columns'
down_revision = None  # Will be set automatically by Alembic
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Adiciona colunas PIX na tabela instant_trades para integração com Banco do Brasil.
    
    Novas colunas:
    - pix_txid: Identificador único da cobrança PIX no BB
    - pix_location: URL do QR Code no BB
    - pix_qrcode: Payload EMV para copia-e-cola
    - pix_valor_recebido: Valor efetivamente recebido
    - pix_end_to_end_id: ID único da transação PIX (e2e)
    - pix_confirmado_em: Timestamp de confirmação via webhook
    """
    
    # Adiciona colunas PIX uma por uma (para compatibilidade)
    with op.batch_alter_table('instant_trades', schema=None) as batch_op:
        # TXID do PIX no Banco do Brasil
        batch_op.add_column(
            sa.Column('pix_txid', sa.String(50), nullable=True)
        )
        
        # URL do QR Code (location retornada pelo BB)
        batch_op.add_column(
            sa.Column('pix_location', sa.String(500), nullable=True)
        )
        
        # Payload EMV do QR Code (para copia-e-cola)
        batch_op.add_column(
            sa.Column('pix_qrcode', sa.Text(), nullable=True)
        )
        
        # Valor efetivamente recebido via PIX
        batch_op.add_column(
            sa.Column('pix_valor_recebido', sa.Numeric(18, 2), nullable=True)
        )
        
        # ID único da transação PIX (end-to-end)
        batch_op.add_column(
            sa.Column('pix_end_to_end_id', sa.String(50), nullable=True)
        )
        
        # Timestamp de quando foi confirmado via webhook
        batch_op.add_column(
            sa.Column('pix_confirmado_em', sa.DateTime(), nullable=True)
        )
        
        # Índice para busca rápida por pix_txid
        batch_op.create_index(
            'idx_instant_trades_pix_txid', 
            ['pix_txid'], 
            unique=False
        )


def downgrade() -> None:
    """Remove colunas PIX da tabela instant_trades."""
    
    with op.batch_alter_table('instant_trades', schema=None) as batch_op:
        # Remove índice
        batch_op.drop_index('idx_instant_trades_pix_txid')
        
        # Remove colunas
        batch_op.drop_column('pix_confirmado_em')
        batch_op.drop_column('pix_end_to_end_id')
        batch_op.drop_column('pix_valor_recebido')
        batch_op.drop_column('pix_qrcode')
        batch_op.drop_column('pix_location')
        batch_op.drop_column('pix_txid')
