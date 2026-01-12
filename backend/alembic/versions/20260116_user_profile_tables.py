"""Create user_profiles and notification_settings tables

Revision ID: 20260116_user_profile_tables
Revises: e934ca4e1d1d
Create Date: 2025-01-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '20260116_user_profile_tables'
down_revision = None  # Will be determined automatically
branch_labels = None
depends_on = None


def upgrade():
    """Create user_profiles and notification_settings tables."""
    
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True, nullable=False),
        sa.Column('full_name', sa.String(200), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('social_links', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, onupdate=sa.func.now()),
    )
    
    # Create notification_settings table
    op.create_table(
        'notification_settings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), unique=True, nullable=False),
        sa.Column('trade_alerts', sa.Boolean(), default=True, nullable=False),
        sa.Column('price_alerts', sa.Boolean(), default=True, nullable=False),
        sa.Column('security_alerts', sa.Boolean(), default=True, nullable=False),
        sa.Column('marketing_emails', sa.Boolean(), default=False, nullable=False),
        sa.Column('weekly_report', sa.Boolean(), default=True, nullable=False),
        sa.Column('push_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('push_trade_alerts', sa.Boolean(), default=True, nullable=False),
        sa.Column('push_price_alerts', sa.Boolean(), default=False, nullable=False),
        sa.Column('push_security_alerts', sa.Boolean(), default=True, nullable=False),
        sa.Column('email_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, onupdate=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'])
    op.create_index('ix_notification_settings_user_id', 'notification_settings', ['user_id'])


def downgrade():
    """Drop user_profiles and notification_settings tables."""
    op.drop_index('ix_notification_settings_user_id')
    op.drop_index('ix_user_profiles_user_id')
    op.drop_table('notification_settings')
    op.drop_table('user_profiles')
