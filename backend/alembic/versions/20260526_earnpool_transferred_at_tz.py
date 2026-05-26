"""Padroniza earnpool_deposits.transferred_to_system_at para TIMESTAMPTZ

Revision ID: 20260526_earnpool_tztz
Revises: add_system_transfer_fields
Create Date: 2026-05-26

Alinha o tipo da coluna com o resto do schema (TIMESTAMP WITH TIME ZONE).
Os valores existentes são interpretados como UTC (que é o que o backend grava
via datetime.now(timezone.utc)).

Idempotente: usa DO $$ ... $$ para checar o tipo atual antes de alterar.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260526_earnpool_tztz"
down_revision = "add_system_transfer_fields"
branch_labels = None
depends_on = None


def upgrade():
    """Converte transferred_to_system_at para TIMESTAMPTZ (UTC)."""
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'earnpool_deposits'
                  AND column_name = 'transferred_to_system_at'
                  AND data_type = 'timestamp without time zone'
            ) THEN
                ALTER TABLE earnpool_deposits
                ALTER COLUMN transferred_to_system_at TYPE TIMESTAMPTZ
                USING transferred_to_system_at AT TIME ZONE 'UTC';
            END IF;
        END
        $$;
        """
    )


def downgrade():
    """Reverte para TIMESTAMP sem timezone (não recomendado)."""
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'earnpool_deposits'
                  AND column_name = 'transferred_to_system_at'
                  AND data_type = 'timestamp with time zone'
            ) THEN
                ALTER TABLE earnpool_deposits
                ALTER COLUMN transferred_to_system_at TYPE TIMESTAMP
                USING transferred_to_system_at AT TIME ZONE 'UTC';
            END IF;
        END
        $$;
        """
    )
