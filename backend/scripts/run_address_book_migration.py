#!/usr/bin/env python3
"""
Script para executar a migration da tabela Address Book.
Cria a tabela address_book e os tipos ENUM necessários.

Uso:
    python scripts/run_address_book_migration.py
    
    Ou com DATABASE_URL específica:
    DATABASE_URL="postgresql://..." python scripts/run_address_book_migration.py
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from psycopg2 import sql
from datetime import datetime

# Tentar importar as configurações
try:
    from app.core.config import settings
    DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
except ImportError:
    DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Erro: DATABASE_URL não configurada!")
    print("   Configure a variável de ambiente DATABASE_URL ou verifique o arquivo .env")
    sys.exit(1)

# SQL da migration
MIGRATION_SQL = """
-- =====================================================
-- Migration: Create Address Book Table
-- Version: 001
-- Date: {date}
-- =====================================================

-- 1. Criar ENUMs (tipos customizados) se não existirem
DO $$ BEGIN
    CREATE TYPE wallettype AS ENUM (
        'binance', 'bitget', 'bybit', 'coinbase', 'kraken', 'kucoin', 'okx', 'gate.io', 
        'huobi', 'mexc', 'bitfinex', 'gemini', 'crypto.com',
        'metamask', 'trust_wallet', 'bitget_wallet', 'phantom', 'exodus', 'ledger', 
        'trezor', 'coinbase_wallet', 'rainbow', 'zerion', 'rabby', 'argent', 'safe',
        'personal', 'friend', 'business', 'other'
    );
    RAISE NOTICE 'Tipo wallettype criado com sucesso';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Tipo wallettype já existe, pulando...';
END $$;

DO $$ BEGIN
    CREATE TYPE walletcategory AS ENUM ('exchange', 'wallet', 'personal', 'other');
    RAISE NOTICE 'Tipo walletcategory criado com sucesso';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Tipo walletcategory já existe, pulando...';
END $$;

-- 2. Criar tabela address_book
CREATE TABLE IF NOT EXISTS address_book (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informações do contato
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    
    -- Rede blockchain
    network VARCHAR(50) NOT NULL,
    
    -- Tipo de carteira/destino
    wallet_type wallettype DEFAULT 'other' NOT NULL,
    wallet_category walletcategory DEFAULT 'other' NOT NULL,
    
    -- Informações adicionais
    memo VARCHAR(255),
    notes TEXT,
    
    -- Controle
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    use_count INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_address_book_user_id ON address_book(user_id);
CREATE INDEX IF NOT EXISTS idx_address_book_address ON address_book(address);
CREATE INDEX IF NOT EXISTS idx_address_book_network ON address_book(network);
CREATE INDEX IF NOT EXISTS idx_address_book_wallet_category ON address_book(wallet_category);
CREATE INDEX IF NOT EXISTS idx_address_book_is_favorite ON address_book(is_favorite);

-- 4. Índice único para evitar duplicatas (mesmo usuário, endereço e rede)
CREATE UNIQUE INDEX IF NOT EXISTS idx_address_book_unique 
ON address_book(user_id, LOWER(address), network);

-- 5. Comentários na tabela (documentação)
COMMENT ON TABLE address_book IS 'Agenda de endereços salvos pelos usuários';
COMMENT ON COLUMN address_book.name IS 'Nome/apelido dado ao endereço';
COMMENT ON COLUMN address_book.address IS 'Endereço blockchain';
COMMENT ON COLUMN address_book.network IS 'Rede blockchain (ethereum, polygon, bitcoin, etc)';
COMMENT ON COLUMN address_book.wallet_type IS 'Tipo de carteira/exchange de destino';
COMMENT ON COLUMN address_book.wallet_category IS 'Categoria do tipo de carteira';
COMMENT ON COLUMN address_book.memo IS 'Memo/Tag para redes que precisam (XRP, BNB, etc)';
COMMENT ON COLUMN address_book.notes IS 'Notas/observações do usuário';
COMMENT ON COLUMN address_book.is_favorite IS 'Se o endereço é favorito';
COMMENT ON COLUMN address_book.is_verified IS 'Se o usuário verificou o endereço';
COMMENT ON COLUMN address_book.use_count IS 'Quantas vezes o endereço foi usado';
COMMENT ON COLUMN address_book.last_used_at IS 'Última vez que o endereço foi usado';
""".format(date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


def run_migration():
    """Executa a migration no banco de dados."""
    print("=" * 60)
    print("🚀 Address Book Migration Script")
    print("=" * 60)
    print()
    
    # Mostrar URL (mascarando a senha)
    masked_url = DATABASE_URL
    if "@" in masked_url:
        parts = masked_url.split("@")
        user_part = parts[0].split(":")
        if len(user_part) > 2:
            masked_url = f"{user_part[0]}:{user_part[1]}:****@{parts[1]}"
    
    print(f"📍 Database: {masked_url[:60]}...")
    print()
    
    try:
        # Conectar ao banco
        print("🔌 Conectando ao banco de dados...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        print("✅ Conexão estabelecida!")
        print()
        
        # Verificar se a tabela já existe
        print("🔍 Verificando se a tabela já existe...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'address_book'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("⚠️  Tabela 'address_book' já existe!")
            cursor.execute("SELECT COUNT(*) FROM address_book;")
            count = cursor.fetchone()[0]
            print(f"   Registros existentes: {count}")
            
            # Perguntar se deseja continuar
            response = input("\n   Deseja continuar mesmo assim? (s/N): ").strip().lower()
            if response != 's':
                print("\n❌ Migration cancelada pelo usuário.")
                conn.close()
                return False
        
        # Executar migration
        print()
        print("🔧 Executando migration...")
        print("-" * 40)
        
        cursor.execute(MIGRATION_SQL)
        
        # Commit
        conn.commit()
        
        print("-" * 40)
        print("✅ Migration executada com sucesso!")
        print()
        
        # Verificar se a tabela foi criada
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'address_book'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        print("📋 Estrutura da tabela 'address_book':")
        print("-" * 50)
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            print(f"   {col[0]:20} {col[1]:15} {nullable}")
        print("-" * 50)
        
        # Verificar índices
        cursor.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'address_book';
        """)
        indexes = cursor.fetchall()
        
        print()
        print("📊 Índices criados:")
        for idx in indexes:
            print(f"   ✓ {idx[0]}")
        
        print()
        print("=" * 60)
        print("🎉 Migration concluída com sucesso!")
        print("=" * 60)
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print()
        print("❌ Erro ao executar migration:")
        print(f"   {e}")
        
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        
        return False
    
    except Exception as e:
        print()
        print("❌ Erro inesperado:")
        print(f"   {e}")
        
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        
        return False


def check_table_status():
    """Verifica o status atual da tabela."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Verificar tabela
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'address_book'
            );
        """)
        exists = cursor.fetchone()[0]
        
        print()
        print("📊 Status da tabela 'address_book':")
        print("-" * 40)
        
        if exists:
            print("   ✅ Tabela existe")
            
            cursor.execute("SELECT COUNT(*) FROM address_book;")
            count = cursor.fetchone()[0]
            print(f"   📝 Total de registros: {count}")
            
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM address_book;
            """)
            users = cursor.fetchone()[0]
            print(f"   👥 Usuários com endereços: {users}")
            
        else:
            print("   ❌ Tabela não existe")
        
        print("-" * 40)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"   Erro ao verificar: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Address Book Migration Script")
    parser.add_argument("--check", action="store_true", help="Apenas verificar status da tabela")
    parser.add_argument("--force", action="store_true", help="Forçar execução sem confirmação")
    args = parser.parse_args()
    
    if args.check:
        check_table_status()
    else:
        success = run_migration()
        sys.exit(0 if success else 1)
