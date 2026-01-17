"""Add cached_tray_balance column to system_blockchain_addresses

Revision ID: add_tray_balance_01
Revises: 
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_tray_balance_01'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Adiciona coluna cached_tray_balance para cachear saldo de TRAY na Polygon."""
    # Verificar se a coluna já existe antes de adicionar
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('system_blockchain_addresses')]
    
    if 'cached_tray_balance' not in columns:
        op.add_column(
            'system_blockchain_addresses',
            sa.Column('cached_tray_balance', sa.Float(), nullable=True, default=0.0, 
                     comment='Cache do saldo TRAY (somente Polygon)')
        )
        print("✅ Coluna cached_tray_balance adicionada com sucesso!")
    else:
        print("ℹ️ Coluna cached_tray_balance já existe.")


def downgrade():
    """Remove coluna cached_tray_balance."""
    op.drop_column('system_blockchain_addresses', 'cached_tray_balance')
