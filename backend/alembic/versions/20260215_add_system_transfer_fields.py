"""Add system transfer fields to earnpool_deposits

Revision ID: add_system_transfer_fields
Revises: None
Create Date: 2026-02-15

Adiciona campos para rastrear transferências de depósitos 
do EarnPool para a carteira do sistema.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_system_transfer_fields'
down_revision = None  # Ajustar conforme necessário
branch_labels = None
depends_on = None


def upgrade():
    """
    Adiciona campos de transferência para o sistema na tabela earnpool_deposits.
    """
    # Adicionar colunas de transferência para sistema
    op.add_column('earnpool_deposits', 
        sa.Column('tx_hash_to_system', sa.String(100), nullable=True,
                  comment='Hash da transação de transferência para carteira do sistema')
    )
    op.add_column('earnpool_deposits',
        sa.Column('transferred_to_system_at', sa.DateTime(), nullable=True,
                  comment='Data/hora da transferência para sistema')
    )
    op.add_column('earnpool_deposits',
        sa.Column('transferred_by_admin', sa.String(50), nullable=True,
                  comment='ID do admin que autorizou a transferência')
    )
    
    # Criar índice para buscar depósitos não transferidos
    op.create_index(
        'ix_earnpool_deposits_not_transferred',
        'earnpool_deposits',
        ['status'],
        postgresql_where=sa.text("tx_hash_to_system IS NULL")
    )


def downgrade():
    """
    Remove campos de transferência.
    """
    op.drop_index('ix_earnpool_deposits_not_transferred', table_name='earnpool_deposits')
    op.drop_column('earnpool_deposits', 'transferred_by_admin')
    op.drop_column('earnpool_deposits', 'transferred_to_system_at')
    op.drop_column('earnpool_deposits', 'tx_hash_to_system')
