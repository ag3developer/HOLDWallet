"""add user activities table

Revision ID: add_user_activities
Revises: 
Create Date: 2024-12-15 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_activities'
down_revision = None  # Update this if you know the previous revision
depends_on = None


def upgrade():
    # Create user_activities table
    op.create_table(
        'user_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('extra_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_activities_user_id'), 'user_activities', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_activities_activity_type'), 'user_activities', ['activity_type'], unique=False)
    op.create_foreign_key('fk_user_activities_user_id', 'user_activities', 'users', ['user_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_user_activities_user_id', 'user_activities', type_='foreignkey')
    op.drop_index(op.f('ix_user_activities_activity_type'), table_name='user_activities')
    op.drop_index(op.f('ix_user_activities_user_id'), table_name='user_activities')
    op.drop_table('user_activities')
