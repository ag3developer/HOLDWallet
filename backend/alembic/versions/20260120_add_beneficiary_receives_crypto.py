"""Add beneficiary_receives_crypto to wolkpay_invoices

Revision ID: 20260120_beneficiary_crypto
Revises: 
Create Date: 2026-01-20

This migration adds a column to store the exact amount of crypto
that should be sent to the beneficiary after fee deduction.
This fixes the bug where the system was sending the gross amount
instead of the net amount.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260120_beneficiary_crypto'
down_revision = None  # Set this to the latest revision if needed
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the new column
    op.add_column(
        'wolkpay_invoices',
        sa.Column('beneficiary_receives_crypto', sa.Numeric(28, 18), nullable=True)
    )
    
    # Update existing invoices to calculate the correct value
    # For BENEFICIARY fee payer: crypto_amount * (1 - (service_fee_percent + network_fee_percent) / 100)
    # For PAYER fee payer: crypto_amount (full amount)
    op.execute("""
        UPDATE wolkpay_invoices 
        SET beneficiary_receives_crypto = CASE 
            WHEN fee_payer = 'PAYER' THEN crypto_amount
            ELSE crypto_amount * (1 - (COALESCE(service_fee_percent, 3.65) + COALESCE(network_fee_percent, 0.15)) / 100)
        END
        WHERE beneficiary_receives_crypto IS NULL
    """)


def downgrade() -> None:
    op.drop_column('wolkpay_invoices', 'beneficiary_receives_crypto')
