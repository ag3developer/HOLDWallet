"""Add fee_payer field to wolkpay_invoices

Revision ID: 20260111_fee_payer
Revises: 8de855f0ca91
Create Date: 2026-01-11 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260111_fee_payer'
down_revision = '8de855f0ca91'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar enum type para FeePayer
    fee_payer_enum = sa.Enum('BENEFICIARY', 'PAYER', name='feepayer')
    fee_payer_enum.create(op.get_bind(), checkfirst=True)
    
    # Adicionar campo fee_payer
    op.add_column('wolkpay_invoices', sa.Column(
        'fee_payer',
        sa.Enum('BENEFICIARY', 'PAYER', name='feepayer'),
        nullable=True,
        server_default='BENEFICIARY'
    ))
    
    # Adicionar campo beneficiary_receives_brl
    op.add_column('wolkpay_invoices', sa.Column(
        'beneficiary_receives_brl',
        sa.Numeric(precision=18, scale=2),
        nullable=True
    ))
    
    # Atualizar registros existentes: fee_payer = BENEFICIARY
    # e beneficiary_receives_brl = total_amount_brl - service_fee_brl - network_fee_brl
    op.execute("""
        UPDATE wolkpay_invoices 
        SET fee_payer = 'BENEFICIARY',
            beneficiary_receives_brl = base_amount_brl - service_fee_brl - network_fee_brl
        WHERE fee_payer IS NULL
    """)


def downgrade() -> None:
    op.drop_column('wolkpay_invoices', 'beneficiary_receives_brl')
    op.drop_column('wolkpay_invoices', 'fee_payer')
    
    # Remover enum type
    op.execute("DROP TYPE IF EXISTS feepayer")
