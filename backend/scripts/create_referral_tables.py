#!/usr/bin/env python3
"""
🎁 Script para criar tabelas do Referral Program - WOLK FRIENDS
================================================================
Este script cria todas as tabelas necessárias para o programa de indicação.

Uso:
    python scripts/create_referral_tables.py

Tabelas criadas:
    - referral_codes: Códigos de indicação únicos por usuário
    - referrals: Registro de cada indicação
    - referral_earnings: Histórico de comissões ganhas
    - referral_config: Configurações do programa

@version 1.0.0
"""

import sys
import os

# Adiciona o diretório pai ao path para importar os módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.db import engine, SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# SQL para criar as tabelas
CREATE_TABLES_SQL = """
-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Enum para tiers do programa
DO $$ BEGIN
    CREATE TYPE referral_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'AMBASSADOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status da indicação
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('PENDING', 'QUALIFIED', 'ACTIVE', 'INACTIVE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status do pagamento de comissão
DO $$ BEGIN
    CREATE TYPE earning_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABELA: referral_codes
-- ============================================================================
-- Código de indicação único por usuário

CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Estatísticas
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_earned NUMERIC(18, 8) DEFAULT 0,
    
    -- Tier atual
    current_tier referral_tier DEFAULT 'BRONZE',
    
    -- Controle
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_tier ON referral_codes(current_tier);

-- ============================================================================
-- TABELA: referrals
-- ============================================================================
-- Registro de cada indicação

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quem indicou
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referrer_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    
    -- Quem foi indicado
    referred_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status
    status referral_status DEFAULT 'PENDING',
    
    -- Datas importantes
    created_at TIMESTAMP DEFAULT NOW(),
    qualified_at TIMESTAMP NULL,  -- Quando fez 1ª transação
    last_activity_at TIMESTAMP NULL,  -- Última transação do indicado
    
    -- Totais acumulados
    total_volume_generated NUMERIC(18, 8) DEFAULT 0,
    total_fees_generated NUMERIC(18, 8) DEFAULT 0,
    total_commission_paid NUMERIC(18, 8) DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_code_id ON referrals(referrer_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- ============================================================================
-- TABELA: referral_earnings
-- ============================================================================
-- Histórico de comissões ganhas

CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    
    -- Transação que gerou a comissão
    transaction_id UUID NULL,  -- ID da transação original
    transaction_type VARCHAR(50) NOT NULL,  -- Tipo: SWAP, P2P, WITHDRAW, etc.
    transaction_amount NUMERIC(18, 8) NOT NULL,  -- Valor da transação
    
    -- Comissão
    fee_amount NUMERIC(18, 8) NOT NULL,  -- Taxa cobrada na transação
    commission_rate NUMERIC(5, 2) NOT NULL,  -- % da comissão (20-40%)
    commission_amount NUMERIC(18, 8) NOT NULL,  -- Valor da comissão
    
    -- Tier no momento
    tier_at_time referral_tier NOT NULL,
    
    -- Status do pagamento
    status earning_status DEFAULT 'PENDING',
    
    -- Datas
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP NULL,
    
    -- Notas
    notes TEXT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON referral_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_created_at ON referral_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_transaction_type ON referral_earnings(transaction_type);

-- ============================================================================
-- TABELA: referral_config
-- ============================================================================
-- Configurações do programa (apenas uma linha ativa)

CREATE TABLE IF NOT EXISTS referral_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Requisitos
    min_transaction_to_qualify NUMERIC(18, 8) DEFAULT 10.00,  -- Min. transação para qualificar
    days_to_consider_active INTEGER DEFAULT 30,  -- Dias sem transação = inativo
    
    -- Taxas base por tipo de transação (% da taxa que vai para comissão)
    base_commission_swap NUMERIC(5, 2) DEFAULT 50.00,  -- 50% da taxa de swap
    base_commission_p2p NUMERIC(5, 2) DEFAULT 50.00,   -- 50% da taxa de P2P
    base_commission_withdraw NUMERIC(5, 2) DEFAULT 30.00,  -- 30% da taxa de saque
    
    -- Status do programa
    is_program_active BOOLEAN DEFAULT TRUE,
    
    -- Controle
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID NULL REFERENCES users(id)
);

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir configuração padrão se não existir
INSERT INTO referral_config (
    min_transaction_to_qualify,
    days_to_consider_active,
    base_commission_swap,
    base_commission_p2p,
    base_commission_withdraw,
    is_program_active
) 
SELECT 10.00, 30, 50.00, 50.00, 30.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM referral_config LIMIT 1);

-- ============================================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_referral_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para referral_codes
DROP TRIGGER IF EXISTS trigger_update_referral_codes_updated_at ON referral_codes;
CREATE TRIGGER trigger_update_referral_codes_updated_at
    BEFORE UPDATE ON referral_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_updated_at();

-- Trigger para referral_config
DROP TRIGGER IF EXISTS trigger_update_referral_config_updated_at ON referral_config;
CREATE TRIGGER trigger_update_referral_config_updated_at
    BEFORE UPDATE ON referral_config
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_updated_at();

-- ============================================================================
-- VIEWS PARA ADMIN
-- ============================================================================

-- View: Resumo do programa
CREATE OR REPLACE VIEW v_referral_program_summary AS
SELECT 
    (SELECT COUNT(*) FROM referral_codes WHERE is_active = TRUE) as total_users_with_codes,
    (SELECT COUNT(*) FROM referrals) as total_referrals,
    (SELECT COUNT(*) FROM referrals WHERE status = 'ACTIVE') as active_referrals,
    (SELECT COUNT(*) FROM referrals WHERE status = 'PENDING') as pending_referrals,
    (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_earnings) as total_earnings_generated,
    (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_earnings WHERE status = 'PAID') as total_earnings_paid,
    (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_earnings WHERE status = 'PENDING') as pending_earnings,
    (SELECT COUNT(*) FROM referral_codes WHERE current_tier = 'BRONZE') as tier_bronze_count,
    (SELECT COUNT(*) FROM referral_codes WHERE current_tier = 'SILVER') as tier_silver_count,
    (SELECT COUNT(*) FROM referral_codes WHERE current_tier = 'GOLD') as tier_gold_count,
    (SELECT COUNT(*) FROM referral_codes WHERE current_tier = 'DIAMOND') as tier_diamond_count,
    (SELECT COUNT(*) FROM referral_codes WHERE current_tier = 'AMBASSADOR') as tier_ambassador_count;

-- View: Top referrers
CREATE OR REPLACE VIEW v_top_referrers AS
SELECT 
    rc.id,
    rc.user_id,
    u.username,
    u.email,
    rc.code,
    rc.current_tier,
    rc.total_referrals,
    rc.active_referrals,
    rc.total_earned,
    rc.created_at
FROM referral_codes rc
JOIN users u ON u.id = rc.user_id
WHERE rc.is_active = TRUE
ORDER BY rc.total_earned DESC, rc.active_referrals DESC
LIMIT 100;

-- View: Ganhos recentes
CREATE OR REPLACE VIEW v_recent_earnings AS
SELECT 
    re.id,
    re.referrer_id,
    u.username as referrer_username,
    re.transaction_type,
    re.transaction_amount,
    re.commission_rate,
    re.commission_amount,
    re.tier_at_time,
    re.status,
    re.created_at,
    re.paid_at
FROM referral_earnings re
JOIN users u ON u.id = re.referrer_id
ORDER BY re.created_at DESC
LIMIT 500;

-- ============================================================================
-- PERMISSÕES (se necessário)
-- ============================================================================

-- Conceder permissões ao usuário da aplicação (ajuste conforme necessário)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wolknow_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wolknow_user;
"""


def create_tables():
    """Cria as tabelas do programa de referral"""
    
    print("=" * 60)
    print("🎁 WOLK FRIENDS - Criando tabelas do Referral Program")
    print("=" * 60)
    
    try:
        with engine.connect() as connection:
            # Executa o SQL de criação
            connection.execute(text(CREATE_TABLES_SQL))
            connection.commit()
            
        print("\n✅ Tabelas criadas com sucesso!")
        print("\n📋 Tabelas criadas:")
        print("   - referral_codes (códigos de indicação)")
        print("   - referrals (registro de indicações)")
        print("   - referral_earnings (histórico de comissões)")
        print("   - referral_config (configurações do programa)")
        print("\n📊 Views criadas:")
        print("   - v_referral_program_summary (resumo do programa)")
        print("   - v_top_referrers (top indicadores)")
        print("   - v_recent_earnings (ganhos recentes)")
        print("\n🔧 Enum types criados:")
        print("   - referral_tier (BRONZE, SILVER, GOLD, DIAMOND, AMBASSADOR)")
        print("   - referral_status (PENDING, QUALIFIED, ACTIVE, INACTIVE, CANCELLED)")
        print("   - earning_status (PENDING, APPROVED, PAID, CANCELLED)")
        
        # Verifica se as tabelas foram criadas
        verify_tables()
        
    except Exception as e:
        print(f"\n❌ Erro ao criar tabelas: {e}")
        logger.exception("Erro detalhado:")
        raise


def verify_tables():
    """Verifica se as tabelas foram criadas corretamente"""
    
    print("\n" + "=" * 60)
    print("🔍 Verificando tabelas criadas...")
    print("=" * 60)
    
    tables_to_check = [
        'referral_codes',
        'referrals', 
        'referral_earnings',
        'referral_config'
    ]
    
    try:
        with engine.connect() as connection:
            for table in tables_to_check:
                result = connection.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table}'
                    );
                """))
                exists = result.scalar()
                
                if exists:
                    # Conta registros
                    count_result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = count_result.scalar()
                    print(f"   ✅ {table}: OK ({count} registros)")
                else:
                    print(f"   ❌ {table}: NÃO ENCONTRADA")
                    
            # Verifica configuração inicial
            config_result = connection.execute(text("SELECT * FROM referral_config LIMIT 1"))
            config = config_result.fetchone()
            
            if config:
                print("\n📝 Configuração do programa:")
                print(f"   - Min. transação para qualificar: ${config[1]:.2f}")
                print(f"   - Dias para considerar ativo: {config[2]}")
                print(f"   - Comissão base swap: {config[3]:.1f}%")
                print(f"   - Comissão base P2P: {config[4]:.1f}%")
                print(f"   - Comissão base withdraw: {config[5]:.1f}%")
                print(f"   - Programa ativo: {'Sim' if config[6] else 'Não'}")
                
    except Exception as e:
        print(f"\n⚠️ Erro na verificação: {e}")


def drop_tables():
    """Remove as tabelas (use com cuidado!)"""
    
    print("\n⚠️ ATENÇÃO: Isso irá REMOVER todas as tabelas do referral!")
    confirm = input("Digite 'CONFIRMAR' para continuar: ")
    
    if confirm != 'CONFIRMAR':
        print("Operação cancelada.")
        return
    
    DROP_SQL = """
    DROP VIEW IF EXISTS v_recent_earnings CASCADE;
    DROP VIEW IF EXISTS v_top_referrers CASCADE;
    DROP VIEW IF EXISTS v_referral_program_summary CASCADE;
    DROP TABLE IF EXISTS referral_earnings CASCADE;
    DROP TABLE IF EXISTS referrals CASCADE;
    DROP TABLE IF EXISTS referral_codes CASCADE;
    DROP TABLE IF EXISTS referral_config CASCADE;
    DROP TYPE IF EXISTS earning_status CASCADE;
    DROP TYPE IF EXISTS referral_status CASCADE;
    DROP TYPE IF EXISTS referral_tier CASCADE;
    DROP FUNCTION IF EXISTS update_referral_updated_at CASCADE;
    """
    
    try:
        with engine.connect() as connection:
            connection.execute(text(DROP_SQL))
            connection.commit()
        print("\n✅ Tabelas removidas com sucesso!")
    except Exception as e:
        print(f"\n❌ Erro ao remover tabelas: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Gerenciar tabelas do Referral Program')
    parser.add_argument('--drop', action='store_true', help='Remove as tabelas existentes')
    parser.add_argument('--verify', action='store_true', help='Apenas verifica as tabelas')
    
    args = parser.parse_args()
    
    if args.drop:
        drop_tables()
    elif args.verify:
        verify_tables()
    else:
        create_tables()
    
    print("\n" + "=" * 60)
    print("✨ Concluído!")
    print("=" * 60)
