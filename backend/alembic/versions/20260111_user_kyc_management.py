"""
Add user custom limits and service access tables

Revision ID: 20260111_user_kyc_management
Revises: 
Create Date: 2026-01-11

Tabelas criadas:
- user_custom_limits: Limites personalizados por usuário
- user_service_access: Controle de acesso a serviços por usuário
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = '20260111_user_kyc_management'
down_revision = None  # Ajustar para última migration
branch_labels = None
depends_on = None


def upgrade():
    # Tabela de limites personalizados por usuário
    op.create_table(
        'user_custom_limits',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('service_name', sa.String(50), nullable=False),
        sa.Column('daily_limit', sa.Numeric(18, 2), nullable=True),
        sa.Column('monthly_limit', sa.Numeric(18, 2), nullable=True),
        sa.Column('per_operation_limit', sa.Numeric(18, 2), nullable=True),
        sa.Column('is_enabled', sa.Boolean, default=True, nullable=False),
        sa.Column('requires_approval', sa.Boolean, default=False, nullable=False),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('expires_at', sa.DateTime, nullable=True),
    )
    
    # Índice único para evitar duplicatas
    op.create_index(
        'ix_user_custom_limits_user_service',
        'user_custom_limits',
        ['user_id', 'service_name'],
        unique=True
    )
    
    # Tabela de controle de acesso a serviços
    op.create_table(
        'user_service_access',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('service_name', sa.String(50), nullable=False),
        sa.Column('is_allowed', sa.Boolean, default=True, nullable=False),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('blocked_until', sa.DateTime, nullable=True),
    )
    
    # Índice único para evitar duplicatas
    op.create_index(
        'ix_user_service_access_user_service',
        'user_service_access',
        ['user_id', 'service_name'],
        unique=True
    )


def downgrade():
    op.drop_index('ix_user_service_access_user_service', 'user_service_access')
    op.drop_table('user_service_access')
    
    op.drop_index('ix_user_custom_limits_user_service', 'user_custom_limits')
    op.drop_table('user_custom_limits')
