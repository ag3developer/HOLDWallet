"""add missing columns to gateway_merchants (auto_settlement)

Revision ID: 20260526_gw_merchant_cols
Revises: 20260122_create_gateway_tables
Create Date: 2026-05-26

A coluna ``auto_settlement`` foi declarada no model ``GatewayMerchant`` mas
nunca foi criada na migração inicial ``20260122_create_gateway_tables``, o que
fazia o endpoint ``PUT /admin/gateway/merchants/{id}/settings`` falhar com 500
ao tentar gravar essa coluna em produção.

Esta migração adiciona as colunas faltantes de forma idempotente (``IF NOT
EXISTS``), de modo que rodar em bancos onde elas já existem é seguro.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '20260526_gw_merchant_cols'
down_revision = '20260122_create_gateway_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # auto_settlement: ausente em produção, mas usado pelo endpoint de settings
    op.execute(
        """
        ALTER TABLE gateway_merchants
        ADD COLUMN IF NOT EXISTS auto_settlement BOOLEAN NOT NULL DEFAULT TRUE
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE gateway_merchants
        DROP COLUMN IF EXISTS auto_settlement
        """
    )
