"""
Script para sincronizar todas as colunas da tabela referral_earnings
com o modelo SQLAlchemy
"""
import os
import sys
from sqlalchemy import create_engine, text

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL não configurada")
    sys.exit(1)

print("📦 Conectando ao banco de dados...")
engine = create_engine(DATABASE_URL)

# SQL para adicionar TODAS as colunas faltantes na tabela referral_earnings
sql_commands = [
    """
    DO $$
    BEGIN
        -- =====================================================
        -- TABELA: referral_earnings
        -- =====================================================
        
        -- Criar tabela se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_earnings') THEN
            CREATE TABLE referral_earnings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                referral_id UUID NOT NULL,
                referrer_id UUID NOT NULL,
                transaction_type VARCHAR(50) NOT NULL,
                transaction_id UUID NOT NULL,
                transaction_amount NUMERIC(18, 8) NOT NULL,
                fee_amount NUMERIC(18, 8) NOT NULL,
                commission_rate NUMERIC(5, 2) NOT NULL,
                commission_amount NUMERIC(18, 8) NOT NULL,
                tier_at_earning VARCHAR(20) DEFAULT 'BRONZE',
                is_paid BOOLEAN DEFAULT FALSE,
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
            RAISE NOTICE 'Tabela referral_earnings criada com sucesso';
        ELSE
            RAISE NOTICE 'Tabela referral_earnings já existe';
        END IF;

        -- Adicionar coluna referral_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'referral_id'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN referral_id UUID;
            RAISE NOTICE 'Coluna referral_id adicionada';
        END IF;

        -- Adicionar coluna referrer_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'referrer_id'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN referrer_id UUID;
            RAISE NOTICE 'Coluna referrer_id adicionada';
        END IF;

        -- Adicionar coluna transaction_type se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'transaction_type'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN transaction_type VARCHAR(50);
            RAISE NOTICE 'Coluna transaction_type adicionada';
        END IF;

        -- Adicionar coluna transaction_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'transaction_id'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN transaction_id UUID;
            RAISE NOTICE 'Coluna transaction_id adicionada';
        END IF;

        -- Adicionar coluna transaction_amount se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'transaction_amount'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN transaction_amount NUMERIC(18, 8) DEFAULT 0;
            RAISE NOTICE 'Coluna transaction_amount adicionada';
        END IF;

        -- Adicionar coluna fee_amount se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'fee_amount'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN fee_amount NUMERIC(18, 8) DEFAULT 0;
            RAISE NOTICE 'Coluna fee_amount adicionada';
        END IF;

        -- Adicionar coluna commission_rate se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'commission_rate'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN commission_rate NUMERIC(5, 2) DEFAULT 0;
            RAISE NOTICE 'Coluna commission_rate adicionada';
        END IF;

        -- Adicionar coluna commission_amount se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'commission_amount'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN commission_amount NUMERIC(18, 8) DEFAULT 0;
            RAISE NOTICE 'Coluna commission_amount adicionada';
        END IF;

        -- Adicionar coluna tier_at_earning se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'tier_at_earning'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN tier_at_earning VARCHAR(20) DEFAULT 'BRONZE';
            RAISE NOTICE 'Coluna tier_at_earning adicionada';
        END IF;

        -- Adicionar coluna is_paid se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'is_paid'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Coluna is_paid adicionada';
        END IF;

        -- Adicionar coluna paid_at se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'paid_at'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN paid_at TIMESTAMP;
            RAISE NOTICE 'Coluna paid_at adicionada';
        END IF;

        -- Adicionar coluna created_at se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'referral_earnings' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE referral_earnings ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Coluna created_at adicionada';
        END IF;

        RAISE NOTICE '✅ Tabela referral_earnings sincronizada com sucesso!';
    END
    $$;
    """
]

# Colunas esperadas do modelo
expected_columns = [
    'id', 'referral_id', 'referrer_id', 'transaction_type', 'transaction_id',
    'transaction_amount', 'fee_amount', 'commission_rate', 'commission_amount',
    'tier_at_earning', 'is_paid', 'paid_at', 'created_at'
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
            WHERE table_name = 'referral_earnings'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        print("\n📋 Colunas na tabela referral_earnings:")
        print("-" * 70)
        existing_columns = []
        for col in columns:
            existing_columns.append(col[0])
            nullable = "NULL" if col[3] == "YES" else "NOT NULL"
            default = f"DEFAULT {col[2]}" if col[2] else ""
            print(f"   ✓ {col[0]:<25} {col[1]:<20} {nullable} {default}")
        
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
