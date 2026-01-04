#!/usr/bin/env python3
"""
Script para criar tabelas diretamente usando SQL DDL statements
Executa no Console do Digital Ocean onde as permissões são diferentes
"""
import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, '/workspace/backend')

from sqlalchemy import create_engine, text
from app.core.config import settings

print("🔗 Conectando ao banco de produção...")
print(f"   URL: {settings.DATABASE_URL[:50]}...")

engine = create_engine(settings.DATABASE_URL, echo=False)

# SQL statements para criar as tabelas principais
sql_statements = [
    # Tabela users
    """
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Tabela wallets
    """
    CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY,
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
        id UUID PRIMARY KEY,
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
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
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
                if "already exists" in str(e):
                    print(f"   ⚠️  Statement {i}: Tabela já existe (OK)")
                else:
                    print(f"   ❌ Statement {i} falhou: {e}")
                    raise
        
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
        
        print("\n🎉 SUCESSO! Tabelas básicas criadas!")
        print("\n📝 Próximo passo:")
        print("   Execute: python -m alembic upgrade head")
        print("   (Agora deve funcionar pois as tabelas base existem)")
        
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
