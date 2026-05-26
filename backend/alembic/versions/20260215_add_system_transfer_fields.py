"""Add system transfer fields to earnpool_deposits

Revision ID: add_system_transfer_fields
Revises: None
Create Date: 2026-02-15

Adiciona campos para rastrear transferências de depósitos 
do EarnPool para a carteira do sistema.

Esta migração é idempotente: usa ``IF NOT EXISTS`` para colunas e índice,
permitindo rodar com segurança em bancos onde os objetos já existem (caso
tenham sido criados manualmente por script ou execução parcial).
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_system_transfer_fields'
down_revision = None  # Raiz solta — independente da linha principal
branch_labels = None
depends_on = None


def upgrade():
    """Adiciona campos de transferência para o sistema (idempotente)."""
    op.execute(
        """
        ALTER TABLE earnpool_deposits
        ADD COLUMN IF NOT EXISTS tx_hash_to_system VARCHAR(100)
        """
    )
    op.execute(
        """
        ALTER TABLE earnpool_deposits
        ADD COLUMN IF NOT EXISTS transferred_to_system_at TIMESTAMP
        """
    )
    op.execute(
        """
        ALTER TABLE earnpool_deposits
        ADD COLUMN IF NOT EXISTS transferred_by_admin VARCHAR(50)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_earnpool_deposits_not_transferred
        ON earnpool_deposits (status)
        WHERE tx_hash_to_system IS NULL
        """
    )


def downgrade():
    """Remove campos de transferência (idempotente)."""
    op.execute("DROP INDEX IF EXISTS ix_earnpool_deposits_not_transferred")
    op.execute("ALTER TABLE earnpool_deposits DROP COLUMN IF EXISTS transferred_by_admin")
    op.execute("ALTER TABLE earnpool_deposits DROP COLUMN IF EXISTS transferred_to_system_at")
    op.execute("ALTER TABLE earnpool_deposits DROP COLUMN IF EXISTS tx_hash_to_system")
