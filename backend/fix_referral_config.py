"""
Script para sincronizar a tabela referral_config com o modelo SQLAlchemy
"""
import os
import sys
from sqlalchemy import create_engine, text

from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL não configurada")
    sys.exit(1)

print("📦 Conectando ao banco de dados...")
engine = create_engine(DATABASE_URL)

# SQL para adicionar TODAS as colunas faltantes na tabela referral_config
sql_commands = [
    """
    DO $$
    BEGIN
        -- =====================================================
        -- TABELA: referral_config
        -- =====================================================
        
        -- Adicionar coluna bronze_min_referrals se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'bronze_min_referrals'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN bronze_min_referrals INTEGER DEFAULT 0;
            RAISE NOTICE 'Coluna bronze_min_referrals adicionada';
        END IF;

        -- Adicionar coluna bronze_commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'bronze_commission_rate'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN bronze_commission_rate NUMERIC(5,2) DEFAULT 20.00;
            RAISE NOTICE 'Coluna bronze_commission_rate adicionada';
        END IF;

        -- Adicionar coluna silver_min_referrals se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'silver_min_referrals'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN silver_min_referrals INTEGER DEFAULT 6;
            RAISE NOTICE 'Coluna silver_min_referrals adicionada';
        END IF;

        -- Adicionar coluna silver_commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'silver_commission_rate'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN silver_commission_rate NUMERIC(5,2) DEFAULT 25.00;
            RAISE NOTICE 'Coluna silver_commission_rate adicionada';
        END IF;

        -- Adicionar coluna gold_min_referrals se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'gold_min_referrals'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN gold_min_referrals INTEGER DEFAULT 21;
            RAISE NOTICE 'Coluna gold_min_referrals adicionada';
        END IF;

        -- Adicionar coluna gold_commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'gold_commission_rate'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN gold_commission_rate NUMERIC(5,2) DEFAULT 30.00;
            RAISE NOTICE 'Coluna gold_commission_rate adicionada';
        END IF;

        -- Adicionar coluna diamond_min_referrals se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'diamond_min_referrals'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN diamond_min_referrals INTEGER DEFAULT 51;
            RAISE NOTICE 'Coluna diamond_min_referrals adicionada';
        END IF;

        -- Adicionar coluna diamond_commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'diamond_commission_rate'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN diamond_commission_rate NUMERIC(5,2) DEFAULT 35.00;
            RAISE NOTICE 'Coluna diamond_commission_rate adicionada';
        END IF;

        -- Adicionar coluna ambassador_min_referrals se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'ambassador_min_referrals'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN ambassador_min_referrals INTEGER DEFAULT 100;
            RAISE NOTICE 'Coluna ambassador_min_referrals adicionada';
        END IF;

        -- Adicionar coluna ambassador_min_monthly_volume se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'ambassador_min_monthly_volume'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN ambassador_min_monthly_volume NUMERIC(18,2) DEFAULT 10000.00;
            RAISE NOTICE 'Coluna ambassador_min_monthly_volume adicionada';
        END IF;

        -- Adicionar coluna ambassador_commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_config' AND column_name = 'ambassador_commission_rate'
        ) THEN
            ALTER TABLE referral_config ADD COLUMN ambassador_commission_rate NUMERIC(5,2) DEFAULT 40.00;
            RAISE NOTICE 'Coluna ambassador_commission_rate adicionada';
        END IF;

        RAISE NOTICE '✅ Tabela referral_config sincronizada com sucesso!';
    END
    $$;
    """
]

# Colunas esperadas do modelo
expected_columns = [
    'id', 'bronze_min_referrals', 'bronze_commission_rate',
    'silver_min_referrals', 'silver_commission_rate',
    'gold_min_referrals', 'gold_commission_rate',
    'diamond_min_referrals', 'diamond_commission_rate',
    'ambassador_min_referrals', 'ambassador_min_monthly_volume', 'ambassador_commission_rate',
    'min_transaction_to_qualify', 'days_to_consider_active',
    'is_program_active', 'created_at', 'updated_at'
]

try:
    with engine.connect() as conn:
        print("\n🔧 Executando migração...")
        for sql in sql_commands:
            conn.execute(text(sql))
            conn.commit()
        print("✅ Migração executada com sucesso!")
        
        # Verificar todas as colunas
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'referral_config'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        print("\n📋 Colunas na tabela referral_config:")
        print("-" * 70)
        existing_columns = []
        for col in columns:
            existing_columns.append(col[0])
            nullable = "NULL" if col[3] == "YES" else "NOT NULL"
            default = f"DEFAULT {col[2]}" if col[2] else ""
            print(f"   ✓ {col[0]:<35} {col[1]:<20} {nullable}")
        
        # Verificar colunas faltantes
        missing = set(expected_columns) - set(existing_columns)
        if missing:
            print(f"\n⚠️ Colunas faltantes: {missing}")
        else:
            print(f"\n✅ Todas as {len(expected_columns)} colunas esperadas estão presentes!")
            
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
