#!/usr/bin/env python3
"""
Script simples para criar a tabela Address Book.
Executa a migration diretamente no PostgreSQL.

Uso:
    cd backend
    python scripts/create_address_book_table.py
"""

import os
import sys
import psycopg2
from datetime import datetime

# URL do banco de dados de produção
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require"
)

print("=" * 60)
print("📚 Address Book - Criação de Tabela")
print("=" * 60)
print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

try:
    print("🔌 Conectando ao banco de dados...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    print("✅ Conectado!")
    print()

    # Verificar se tabela já existe
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'address_book'
        );
    """)
    
    if cursor.fetchone()[0]:
        print("⚠️  Tabela 'address_book' já existe!")
        cursor.execute("SELECT COUNT(*) FROM address_book;")
        print(f"   Registros: {cursor.fetchone()[0]}")
        conn.close()
        print("\n✅ Nenhuma ação necessária.")
        sys.exit(0)

    print("🔧 Criando tipos ENUM...")
    
    # Criar ENUM wallettype
    cursor.execute("""
        DO $$ BEGIN
            CREATE TYPE wallettype AS ENUM (
                'binance', 'bitget', 'bybit', 'coinbase', 'kraken', 'kucoin', 'okx', 'gate.io', 
                'huobi', 'mexc', 'bitfinex', 'gemini', 'crypto.com',
                'metamask', 'trust_wallet', 'bitget_wallet', 'phantom', 'exodus', 'ledger', 
                'trezor', 'coinbase_wallet', 'rainbow', 'zerion', 'rabby', 'argent', 'safe',
                'personal', 'friend', 'business', 'other'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    print("   ✓ wallettype")
    
    # Criar ENUM walletcategory
    cursor.execute("""
        DO $$ BEGIN
            CREATE TYPE walletcategory AS ENUM ('exchange', 'wallet', 'personal', 'other');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    print("   ✓ walletcategory")
    
    print()
    print("🔧 Criando tabela address_book...")
    
    # Criar tabela (user_id é UUID, não INTEGER)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS address_book (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            address VARCHAR(255) NOT NULL,
            network VARCHAR(50) NOT NULL,
            wallet_type wallettype DEFAULT 'other' NOT NULL,
            wallet_category walletcategory DEFAULT 'other' NOT NULL,
            memo VARCHAR(255),
            notes TEXT,
            is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE NOT NULL,
            use_count INTEGER DEFAULT 0 NOT NULL,
            last_used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP
        );
    """)
    print("   ✓ Tabela criada")
    
    print()
    print("🔧 Criando índices...")
    
    # Criar índices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_book_user_id ON address_book(user_id);")
    print("   ✓ idx_address_book_user_id")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_book_address ON address_book(address);")
    print("   ✓ idx_address_book_address")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_book_network ON address_book(network);")
    print("   ✓ idx_address_book_network")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_book_wallet_category ON address_book(wallet_category);")
    print("   ✓ idx_address_book_wallet_category")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_book_is_favorite ON address_book(is_favorite);")
    print("   ✓ idx_address_book_is_favorite")
    
    # Índice único
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_address_book_unique 
        ON address_book(user_id, LOWER(address), network);
    """)
    print("   ✓ idx_address_book_unique (evita duplicatas)")
    
    # Commit
    conn.commit()
    
    print()
    print("=" * 60)
    print("🎉 Tabela 'address_book' criada com sucesso!")
    print("=" * 60)
    
    # Mostrar estrutura
    print()
    print("📋 Estrutura da tabela:")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'address_book'
        ORDER BY ordinal_position;
    """)
    
    for col in cursor.fetchall():
        nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
        print(f"   {col[0]:20} {col[1]:15} {nullable}")
    
    cursor.close()
    conn.close()
    
    print()
    print("✅ Migration concluída!")
    
except psycopg2.Error as e:
    print(f"\n❌ Erro PostgreSQL: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Erro: {e}")
    sys.exit(1)
