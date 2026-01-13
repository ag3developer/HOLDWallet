"""Create quote_cache table for production

Revision ID: 20260113_create_quote_cache
Revises: 
Create Date: 2026-01-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260113_create_quote_cache'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cria tabela de cache de quotes para produção
    # Necessário porque múltiplos workers não compartilham memória
    op.create_table(
        'quote_cache',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('quote_id', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('quote_data', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    
    # Index para limpeza de quotes expiradas
    op.create_index('idx_quote_cache_expires', 'quote_cache', ['expires_at'])


def downgrade() -> None:
    op.drop_index('idx_quote_cache_expires', table_name='quote_cache')
    op.drop_table('quote_cache')
