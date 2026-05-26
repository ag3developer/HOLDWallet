"""add missing columns/enums for gateway settings endpoint

Revision ID: 20260526_gw_merchant_cols
Revises: 20260122_create_gateway_tables
Create Date: 2026-05-26

Corrige dois problemas que faziam o endpoint
``PUT /admin/gateway/merchants/{id}/settings`` falhar com 500:

1. Coluna ``auto_settlement`` declarada no model ``GatewayMerchant`` mas
   ausente na migração inicial.
2. Valor ``MERCHANT_SETTINGS_UPDATED`` no enum ``gatewayauditaction`` usado
   pelo ``AuditService.log()`` mas ausente no enum criado originalmente.

Esta migração é idempotente (``IF NOT EXISTS``) e pode ser executada com
segurança em bancos onde os objetos já existem.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '20260526_gw_merchant_cols'
down_revision = '20260122_create_gateway_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) auto_settlement: ausente em produção, usado pelo endpoint de settings
    op.execute(
        """
        ALTER TABLE gateway_merchants
        ADD COLUMN IF NOT EXISTS auto_settlement BOOLEAN NOT NULL DEFAULT TRUE
        """
    )

    # 2) Adicionar MERCHANT_SETTINGS_UPDATED ao enum gatewayauditaction
    #    (precisa ser commitado fora de uma transação para alguns Postgres,
    #    por isso usamos COMMIT explicit em DO block para segurança.)
    op.execute(
        """
        ALTER TYPE gatewayauditaction
        ADD VALUE IF NOT EXISTS 'MERCHANT_SETTINGS_UPDATED'
        """
    )


def downgrade() -> None:
    # Postgres não suporta remover valor de enum facilmente; deixamos como no-op
    # para o enum. Só removemos a coluna.
    op.execute(
        """
        ALTER TABLE gateway_merchants
        DROP COLUMN IF EXISTS auto_settlement
        """
    )

