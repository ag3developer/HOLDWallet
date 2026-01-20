"""create_address_blacklist_table

Revision ID: 20260119_blacklist
Revises: 
Create Date: 2026-01-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '20260119_blacklist'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria tabela de blacklist de endereços."""
    op.create_table(
        'address_blacklist',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('address', sa.String(255), nullable=False, index=True),
        sa.Column('network', sa.String(50), nullable=False, index=True),
        sa.Column('reason', sa.Text, nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('added_by', sa.String(255), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
    )
    
    # Índice composto para busca rápida
    op.create_index(
        'ix_address_blacklist_address_network',
        'address_blacklist',
        ['address', 'network'],
        unique=True
    )


def downgrade() -> None:
    """Remove tabela de blacklist."""
    op.drop_index('ix_address_blacklist_address_network', table_name='address_blacklist')
    op.drop_table('address_blacklist')
