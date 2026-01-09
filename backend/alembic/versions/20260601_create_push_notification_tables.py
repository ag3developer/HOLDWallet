"""Create push_subscriptions and notification_preferences tables

Revision ID: 20260601_push_notifications
Revises: 
Create Date: 2026-06-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260601_push_notifications'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cria as tabelas para Push Notifications"""
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Tabela push_subscriptions
    if 'push_subscriptions' not in existing_tables:
        op.create_table(
            'push_subscriptions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('endpoint', sa.Text(), nullable=False, unique=True),
            sa.Column('p256dh', sa.Text(), nullable=False),
            sa.Column('auth', sa.Text(), nullable=False),
            sa.Column('device_info', postgresql.JSONB(), nullable=True),
            sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
            sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        )
        
        # Criar índices
        op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])
        op.create_index('ix_push_subscriptions_endpoint', 'push_subscriptions', ['endpoint'], unique=True)
        op.create_index('ix_push_subscriptions_active', 'push_subscriptions', ['user_id', 'is_active'])
        
        print("✅ Tabela push_subscriptions criada com sucesso!")
    else:
        print("⚠️ Tabela push_subscriptions já existe, pulando criação.")
    
    # Tabela notification_preferences
    if 'notification_preferences' not in existing_tables:
        op.create_table(
            'notification_preferences',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
            
            # Categorias de notificação
            sa.Column('transactions', sa.Boolean(), default=True, nullable=False),
            sa.Column('security', sa.Boolean(), default=True, nullable=False),
            sa.Column('p2p_trading', sa.Boolean(), default=True, nullable=False),
            sa.Column('chat', sa.Boolean(), default=True, nullable=False),
            sa.Column('market', sa.Boolean(), default=False, nullable=False),
            sa.Column('reports', sa.Boolean(), default=True, nullable=False),
            sa.Column('system', sa.Boolean(), default=True, nullable=False),
            
            # Horário de silêncio
            sa.Column('quiet_hours_start', sa.String(5), nullable=True),
            sa.Column('quiet_hours_end', sa.String(5), nullable=True),
            
            # Timestamps
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )
        
        # Criar índice
        op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'], unique=True)
        
        print("✅ Tabela notification_preferences criada com sucesso!")
    else:
        print("⚠️ Tabela notification_preferences já existe, pulando criação.")


def downgrade() -> None:
    """Remove as tabelas de Push Notifications"""
    op.drop_index('ix_notification_preferences_user_id', 'notification_preferences')
    op.drop_table('notification_preferences')
    
    op.drop_index('ix_push_subscriptions_active', 'push_subscriptions')
    op.drop_index('ix_push_subscriptions_endpoint', 'push_subscriptions')
    op.drop_index('ix_push_subscriptions_user_id', 'push_subscriptions')
    op.drop_table('push_subscriptions')
    
    print("✅ Tabelas de Push Notifications removidas")
