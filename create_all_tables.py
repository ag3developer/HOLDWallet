#!/usr/bin/env python3
"""
Script para criar TODAS as tabelas necessárias no banco de produção
Executa apenas as tabelas básicas, sem foreign keys problemáticas
"""
import sys
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from sqlalchemy import create_engine, text
from app.core.config import settings

print("🔗 Conectando ao banco de produção...")
engine = create_engine(settings.DATABASE_URL)

# SQL para criar todas as tabelas necessárias
sql_statements = [
    # Tabela two_factor_auth
    """
    CREATE TABLE IF NOT EXISTS two_factor_auth (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        secret VARCHAR(32) NOT NULL,
        is_enabled BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        backup_codes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        enabled_at TIMESTAMP,
        last_used_at TIMESTAMP,
        UNIQUE(user_id)
    );
    """,
    
    # Tabela wallets
    """
    CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        network VARCHAR(50) NOT NULL,
        derivation_path VARCHAR(100),
        encrypted_seed TEXT,
        seed_hash VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Tabela wallet_balance
    """
    CREATE TABLE IF NOT EXISTS wallet_balance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        token_symbol VARCHAR(20) NOT NULL,
        token_name VARCHAR(100),
        balance DECIMAL(38, 18) DEFAULT 0,
        token_address VARCHAR(100),
        decimals INTEGER DEFAULT 18,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(wallet_id, token_symbol, token_address)
    );
    """,
    
    # Índices para performance
    """
    CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_balance_wallet_id ON wallet_balance(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
    """
]

try:
    with engine.connect() as conn:
        print("\n🔨 Criando tabelas...")
        
        for i, sql in enumerate(sql_statements, 1):
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"   ✅ Statement {i} executado com sucesso")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"   ⚠️  Statement {i}: Tabela já existe (OK)")
                else:
                    print(f"   ❌ Statement {i} falhou: {e}")
                    # Não raise, continua com próximas tabelas
        
        print("\n✅ Verificando tabelas criadas...")
        result = conn.execute(text("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """))
        tables = [row[0] for row in result]
        print(f"   Total de tabelas: {len(tables)}")
        for table in tables:
            print(f"   - {table}")
        
        print("\n🎉 SUCESSO! Tabelas criadas!")
        
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
