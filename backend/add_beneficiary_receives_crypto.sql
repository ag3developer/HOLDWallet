-- Migration: Add beneficiary_receives_crypto column to wolkpay_invoices
-- Date: 2026-01-20
-- Purpose: Store the net crypto amount to be sent to beneficiary after fee deduction

-- Add the new column
ALTER TABLE wolkpay_invoices 
ADD COLUMN IF NOT EXISTS beneficiary_receives_crypto NUMERIC(28, 18);

-- Update existing invoices to calculate the correct value
-- For BENEFICIARY fee payer: crypto_amount * (1 - (service_fee_percent + network_fee_percent) / 100)
-- For PAYER fee payer: crypto_amount (full amount)
UPDATE wolkpay_invoices 
SET beneficiary_receives_crypto = CASE 
    WHEN fee_payer = 'PAYER' THEN crypto_amount
    ELSE crypto_amount * (1 - (COALESCE(service_fee_percent, 3.65) + COALESCE(network_fee_percent, 0.15)) / 100)
END
WHERE beneficiary_receives_crypto IS NULL;

-- Add comment
COMMENT ON COLUMN wolkpay_invoices.beneficiary_receives_crypto IS 'Net crypto amount to send to beneficiary (after fees if fee_payer=BENEFICIARY)';
