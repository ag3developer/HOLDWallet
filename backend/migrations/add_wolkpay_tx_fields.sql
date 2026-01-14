-- Migration: Adicionar campos de transação blockchain na tabela wolkpay_invoices
-- Autor: Copilot
-- Data: 2026-01-14
-- Descrição: Adiciona campos para rastrear transações blockchain para auditoria e Receita Federal

ALTER TABLE wolkpay_invoices 
ADD COLUMN IF NOT EXISTS crypto_tx_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS crypto_tx_network VARCHAR(50),
ADD COLUMN IF NOT EXISTS crypto_wallet_address VARCHAR(100),
ADD COLUMN IF NOT EXISTS crypto_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS crypto_explorer_url VARCHAR(500);

-- Criar índice na hash da transação para buscas rápidas
CREATE INDEX IF NOT EXISTS ix_wolkpay_invoices_crypto_tx_hash ON wolkpay_invoices(crypto_tx_hash);

-- Comentário explicativo
COMMENT ON COLUMN wolkpay_invoices.crypto_tx_hash IS 'Hash da transação blockchain enviada ao beneficiário';
COMMENT ON COLUMN wolkpay_invoices.crypto_tx_network IS 'Rede onde a transação foi executada (polygon, ethereum, etc)';
COMMENT ON COLUMN wolkpay_invoices.crypto_wallet_address IS 'Endereço da carteira do beneficiário';
COMMENT ON COLUMN wolkpay_invoices.crypto_sent_at IS 'Timestamp de quando a crypto foi enviada';
COMMENT ON COLUMN wolkpay_invoices.crypto_explorer_url IS 'URL do explorer para verificação da transação';

