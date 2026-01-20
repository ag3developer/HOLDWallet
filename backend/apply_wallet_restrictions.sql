-- ============================================================
-- HOLD Wallet - Migration: Add Wallet Restrictions
-- ============================================================
-- Este script adiciona campos para bloqueio granular de wallets
-- Execute em produção: psql -h <host> -U <user> -d <database> -f apply_wallet_restrictions.sql
-- ============================================================

-- 1. Campos de bloqueio total
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_by VARCHAR(100);

-- 2. Campos de restrição granular por tipo de operação
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_instant_trade BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_deposits BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_withdrawals BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_p2p BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_transfers BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_swap BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS ix_wallets_is_blocked ON wallets(is_blocked);
CREATE INDEX IF NOT EXISTS ix_wallets_restrictions ON wallets(restrict_instant_trade, restrict_deposits, restrict_withdrawals, restrict_p2p);

-- 4. Verificar se foi aplicado corretamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'wallets' 
AND column_name IN (
    'is_blocked', 'blocked_at', 'blocked_reason', 'blocked_by',
    'restrict_instant_trade', 'restrict_deposits', 'restrict_withdrawals',
    'restrict_p2p', 'restrict_transfers', 'restrict_swap'
);

-- ============================================================
-- COMO USAR O SISTEMA DE RESTRIÇÕES
-- ============================================================
-- 
-- 1. BLOQUEIO TOTAL (usuário não pode fazer nada):
--    UPDATE wallets SET is_blocked = TRUE, blocked_reason = 'Suspeita de fraude' WHERE user_id = 'xxx';
--
-- 2. BLOQUEIO PARCIAL - Apenas Trade Instantâneo:
--    UPDATE wallets SET restrict_instant_trade = TRUE, blocked_reason = 'Investigação' WHERE user_id = 'xxx';
--
-- 3. BLOQUEIO PARCIAL - Apenas Saques:
--    UPDATE wallets SET restrict_withdrawals = TRUE WHERE user_id = 'xxx';
--
-- 4. BLOQUEIO PARCIAL - P2P e Trades:
--    UPDATE wallets SET restrict_p2p = TRUE, restrict_instant_trade = TRUE WHERE user_id = 'xxx';
--
-- 5. DESBLOQUEAR:
--    UPDATE wallets SET 
--        is_blocked = FALSE, 
--        restrict_instant_trade = FALSE,
--        restrict_deposits = FALSE,
--        restrict_withdrawals = FALSE,
--        restrict_p2p = FALSE,
--        restrict_transfers = FALSE,
--        restrict_swap = FALSE,
--        blocked_reason = NULL
--    WHERE user_id = 'xxx';
-- ============================================================

SELECT '✅ Migration aplicada com sucesso!' AS status;
