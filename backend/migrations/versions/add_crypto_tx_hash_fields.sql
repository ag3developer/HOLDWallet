-- Migration: Adiciona campos crypto_tx_hash e crypto_explorer_url na tabela wolkpay_bill_payments
-- Data: 2026-01-15
-- Descricao: Separa TX hash blockchain do ID interno

-- Adicionar coluna crypto_tx_hash se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wolkpay_bill_payments' 
        AND column_name = 'crypto_tx_hash'
    ) THEN
        ALTER TABLE wolkpay_bill_payments 
        ADD COLUMN crypto_tx_hash VARCHAR(128);
        
        CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_crypto_tx_hash 
        ON wolkpay_bill_payments(crypto_tx_hash);
        
        RAISE NOTICE 'Coluna crypto_tx_hash adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna crypto_tx_hash ja existe';
    END IF;
END $$;

-- Adicionar coluna crypto_explorer_url se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wolkpay_bill_payments' 
        AND column_name = 'crypto_explorer_url'
    ) THEN
        ALTER TABLE wolkpay_bill_payments 
        ADD COLUMN crypto_explorer_url VARCHAR(500);
        
        RAISE NOTICE 'Coluna crypto_explorer_url adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna crypto_explorer_url ja existe';
    END IF;
END $$;

-- Aumentar tamanho do internal_tx_id para 64 caracteres
DO $$
BEGIN
    ALTER TABLE wolkpay_bill_payments 
    ALTER COLUMN internal_tx_id TYPE VARCHAR(64);
    
    RAISE NOTICE 'Coluna internal_tx_id atualizada para VARCHAR(64)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar internal_tx_id: %', SQLERRM;
END $$;

-- Migrar dados existentes: copiar internal_tx_id para crypto_tx_hash se comecar com 0x
UPDATE wolkpay_bill_payments 
SET crypto_tx_hash = internal_tx_id 
WHERE internal_tx_id LIKE '0x%' 
AND crypto_tx_hash IS NULL;

-- Comentarios
COMMENT ON COLUMN wolkpay_bill_payments.crypto_tx_hash IS 'Hash da transacao na blockchain (0x...)';
COMMENT ON COLUMN wolkpay_bill_payments.crypto_explorer_url IS 'URL do explorer para verificar a transacao';
COMMENT ON COLUMN wolkpay_bill_payments.internal_tx_id IS 'ID interno da transacao no sistema';
