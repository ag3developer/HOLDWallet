-- Migration: Add audit fields to bill payment logs
-- Date: 2025-01-27
-- Description: Adiciona campos de auditoria (IP, user-agent, request_id) aos logs de pagamento

-- ============================================
-- ADICIONAR CAMPOS DE AUDITORIA
-- ============================================

DO $$
BEGIN
    -- Adicionar campo ip_address se nao existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wolkpay_bill_payment_logs' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE wolkpay_bill_payment_logs 
        ADD COLUMN ip_address VARCHAR(45) NULL;
        
        RAISE NOTICE 'Campo ip_address adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo ip_address ja existe';
    END IF;

    -- Adicionar campo user_agent se nao existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wolkpay_bill_payment_logs' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE wolkpay_bill_payment_logs 
        ADD COLUMN user_agent VARCHAR(500) NULL;
        
        RAISE NOTICE 'Campo user_agent adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo user_agent ja existe';
    END IF;

    -- Adicionar campo request_id se nao existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wolkpay_bill_payment_logs' 
        AND column_name = 'request_id'
    ) THEN
        ALTER TABLE wolkpay_bill_payment_logs 
        ADD COLUMN request_id VARCHAR(36) NULL;
        
        RAISE NOTICE 'Campo request_id adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo request_id ja existe';
    END IF;

END $$;

-- ============================================
-- CRIAR INDICE PARA CREATED_AT
-- ============================================

CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_log_created_at 
ON wolkpay_bill_payment_logs(created_at);

-- ============================================
-- ADICIONAR COMENTARIOS
-- ============================================

COMMENT ON COLUMN wolkpay_bill_payment_logs.ip_address IS 'Endereco IP do cliente (IPv4 ou IPv6)';
COMMENT ON COLUMN wolkpay_bill_payment_logs.user_agent IS 'User-Agent do navegador/app do cliente';
COMMENT ON COLUMN wolkpay_bill_payment_logs.request_id IS 'ID unico da requisicao para rastreamento';

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'wolkpay_bill_payment_logs'
AND column_name IN ('ip_address', 'user_agent', 'request_id')
ORDER BY column_name;
