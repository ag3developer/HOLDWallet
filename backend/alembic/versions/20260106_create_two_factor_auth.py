"""Create two_factor_auth table

Revision ID: 20260106_2fa
Revises: 
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260106_2fa'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria a tabela two_factor_auth para 2FA/TOTP"""
    
    # Verificar se a tabela já existe
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'two_factor_auth' not in existing_tables:
        op.create_table(
            'two_factor_auth',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('secret', sa.String(255), nullable=False),
            sa.Column('is_enabled', sa.Boolean(), default=False, nullable=False),
            sa.Column('is_verified', sa.Boolean(), default=False, nullable=False),
            sa.Column('backup_codes', sa.String(1000), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
            sa.Column('enabled_at', sa.DateTime(), nullable=True),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
        )
        
        # Criar índice para user_id
        op.create_index('ix_two_factor_auth_user_id', 'two_factor_auth', ['user_id'], unique=True)
        
        print("✅ Tabela two_factor_auth criada com sucesso!")
    else:
        print("⚠️ Tabela two_factor_auth já existe, pulando criação.")


def downgrade() -> None:
    """Remove a tabela two_factor_auth"""
    op.drop_index('ix_two_factor_auth_user_id', table_name='two_factor_auth')
    op.drop_table('two_factor_auth')
