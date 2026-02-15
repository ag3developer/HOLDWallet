-- =====================================================
-- 🎁 WOLK FRIENDS - Referral Program
-- Migration: Create referral tables
-- =====================================================

-- Enum types
DO $$ BEGIN
    CREATE TYPE referral_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'ambassador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'active', 'inactive', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. Referral Codes (Códigos de indicação)
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    current_tier referral_tier NOT NULL DEFAULT 'bronze',
    total_referrals INTEGER NOT NULL DEFAULT 0,
    active_referrals INTEGER NOT NULL DEFAULT 0,
    total_earned DECIMAL(18, 8) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_tier ON referral_codes(current_tier);

-- =====================================================
-- 2. Referrals (Indicações)
-- =====================================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referrer_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status referral_status NOT NULL DEFAULT 'pending',
    qualified_at TIMESTAMP WITH TIME ZONE,
    total_volume_generated DECIMAL(18, 8) NOT NULL DEFAULT 0,
    total_fees_generated DECIMAL(18, 8) NOT NULL DEFAULT 0,
    total_commission_paid DECIMAL(18, 8) NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_referred_user UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- =====================================================
-- 3. Referral Earnings (Ganhos de indicação)
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    transaction_amount DECIMAL(18, 8) NOT NULL,
    fee_amount DECIMAL(18, 8) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(18, 8) NOT NULL,
    tier_at_earning referral_tier NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_transaction_id ON referral_earnings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_is_paid ON referral_earnings(is_paid);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_created_at ON referral_earnings(created_at);

-- =====================================================
-- 4. Referral Config (Configuração do programa)
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_transaction_to_qualify DECIMAL(18, 8) NOT NULL DEFAULT 1.00,
    days_to_consider_active INTEGER NOT NULL DEFAULT 30,
    is_program_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config if not exists
INSERT INTO referral_config (min_transaction_to_qualify, days_to_consider_active, is_program_active)
SELECT 1.00, 30, true
WHERE NOT EXISTS (SELECT 1 FROM referral_config);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE referral_codes IS '🎁 WOLK FRIENDS - Códigos de indicação dos usuários';
COMMENT ON TABLE referrals IS '🎁 WOLK FRIENDS - Registro de indicações (quem indicou quem)';
COMMENT ON TABLE referral_earnings IS '🎁 WOLK FRIENDS - Ganhos/comissões de indicação';
COMMENT ON TABLE referral_config IS '🎁 WOLK FRIENDS - Configurações do programa';

COMMENT ON COLUMN referral_codes.current_tier IS 'Tier atual do indicador (bronze, silver, gold, diamond, ambassador)';
COMMENT ON COLUMN referral_codes.total_referrals IS 'Total de indicações realizadas';
COMMENT ON COLUMN referral_codes.active_referrals IS 'Indicações ativas (transacionaram nos últimos 30 dias)';
COMMENT ON COLUMN referral_codes.total_earned IS 'Total ganho em comissões (USD)';

COMMENT ON COLUMN referrals.status IS 'Status: pending (aguardando 1ª transação), qualified (fez 1ª transação), active (transacionou recentemente), inactive (sem transação há 30+ dias)';
COMMENT ON COLUMN referrals.qualified_at IS 'Data em que o indicado fez sua primeira transação';
COMMENT ON COLUMN referrals.total_volume_generated IS 'Volume total de transações do indicado (USD)';
COMMENT ON COLUMN referrals.total_fees_generated IS 'Total de taxas geradas pelo indicado (USD)';
COMMENT ON COLUMN referrals.total_commission_paid IS 'Total de comissões pagas ao indicador (USD)';

COMMENT ON COLUMN referral_earnings.commission_rate IS 'Taxa de comissão no momento do ganho (%)';
COMMENT ON COLUMN referral_earnings.tier_at_earning IS 'Tier do indicador no momento do ganho';

-- =====================================================
-- Success message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ WOLK FRIENDS referral tables created successfully!';
END $$;
