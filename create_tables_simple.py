#!/usr/bin/env python3
"""
Cria tabelas no PostgreSQL de produção SEM usar tipos ENUM
(contorna o problema de permissões)
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

os.environ['DATABASE_URL'] = (
    "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@"
    "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/"
    "holdwallet-db?sslmode=require"
)

from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# SQL para criar tabelas principais SEM ENUM (usa VARCHAR)
CREATE_TABLES_SQL = """
-- Tabela Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Tabela Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mnemonic_encrypted TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    network VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    derivation_path VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_id, network, address)
);

-- Tabela Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    amount DECIMAL(36, 18),
    network VARCHAR(50),
    token_symbol VARCHAR(20),
    tx_hash VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Tabela Two Factor Auth
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_wallet_id ON addresses(wallet_id);
CREATE INDEX IF NOT EXISTS idx_addresses_address ON addresses(address);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
"""

def main():
    print("\n" + "=" * 80)
    print("🔨 CRIANDO TABELAS NO BANCO DE PRODUÇÃO (Método Alternativo)")
    print("=" * 80)
    
    try:
        print("\n🔌 Conectando ao banco...")
        engine = create_engine(os.environ['DATABASE_URL'], echo=False)
        
        with engine.connect() as conn:
            # Testar conexão
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"   ✅ Conectado: {version[:60]}...")
            
            print("\n🔨 Criando tabelas básicas...")
            # Executar o SQL
            conn.execute(text(CREATE_TABLES_SQL))
            conn.commit()
            
            print("   ✅ Tabelas criadas!")
            
            # Verificar
            print("\n🔍 Verificando tabelas criadas:")
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            if tables:
                print(f"\n   ✅ {len(tables)} tabelas criadas:")
                for table in tables:
                    result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
                    count = result.scalar()
                    print(f"      - {table}: {count} registros")
            else:
                print("   ❌ Nenhuma tabela criada!")
                return False
        
        print("\n" + "=" * 80)
        print("🎉 SUCESSO! Agora teste o registro de usuário:")
        print("=" * 80)
        print("\ncurl -X POST https://api.wolknow.com/v1/auth/register \\")
        print("  -H 'Content-Type: application/json' \\")
        print("  -d '{\"email\":\"admin@wolknow.com\",\"username\":\"admin\",\"password\":\"Admin@2025!\"}'")
        print("\n" + "=" * 80 + "\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        print("\n💡 O erro acima significa que você DEVE:")
        print("   1. Acessar o Digital Ocean Console")
        print("   2. Executar: python -m alembic upgrade head")
        print("   3. Ou dar as permissões SQL mostradas anteriormente")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
