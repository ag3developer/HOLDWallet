"""fix instant_trades user_id type to string

Revision ID: 20251215_fix_user_id
Revises: 20251215_171331
Create Date: 2025-12-15 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251215_fix_user_id'
down_revision = 'add_user_activities'
branch_labels = None
depends_on = None


def upgrade():
    """
    Altera o tipo da coluna user_id de Integer para String (UUID)
    na tabela instant_trades
    """
    # Alterar o tipo da coluna para String
    op.alter_column('instant_trades', 'user_id',
                    existing_type=sa.Integer(),
                    type_=sa.String(),
                    existing_nullable=False,
                    postgresql_using='user_id::text')


def downgrade():
    """
    Reverte a alteração (String para Integer)
    AVISO: Isso vai falhar se houver UUIDs que não são integers!
    """
    op.alter_column('instant_trades', 'user_id',
                    existing_type=sa.String(),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    postgresql_using='user_id::integer')
    
    # Recriar a foreign key
    op.create_foreign_key('instant_trades_user_id_fkey', 
                          'instant_trades', 'users', 
                          ['user_id'], ['id'])
