#!/usr/bin/env python3
"""
Aplicar migração no banco CORRETO: holdwallet-db
"""
import psycopg2
import sys

# Configurações do banco de dados CORRETO
DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "holdwallet-db",  # BANCO CORRETO - holdwallet-db, não defaultdb
    "sslmode": "require"
}

MIGRATION_SQL = """
-- Adicionar colunas de restrição à tabela wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blocked_by VARCHAR(100);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_instant_trade BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_deposits BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_withdrawals BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_p2p BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_transfers BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS restrict_swap BOOLEAN NOT NULL DEFAULT FALSE;

-- Criar índice
CREATE INDEX IF NOT EXISTS ix_wallets_is_blocked ON wallets(is_blocked);
"""

def main():
    print("=" * 60)
    print("🔧 Aplicando migração no banco CORRETO: holdwallet-db")
    print("=" * 60)
    print(f"Host: {DB_CONFIG['host']}")
    print(f"Database: {DB_CONFIG['database']}")
    
    try:
        print("\n📡 Conectando ao banco...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()
        print("✅ Conectado!")
        
        # Verificar se a tabela wallets existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'wallets'
            );
        """)
        exists = cursor.fetchone()[0]
        
        if not exists:
            print("❌ Tabela 'wallets' não encontrada!")
            sys.exit(1)
        
        # Contar wallets
        cursor.execute("SELECT COUNT(*) FROM wallets")
        count = cursor.fetchone()[0]
        print(f"✅ Tabela wallets encontrada com {count} registros")
        
        # Verificar colunas existentes
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'wallets'
            AND column_name IN (
                'is_blocked', 'blocked_at', 'blocked_reason', 'blocked_by',
                'restrict_instant_trade', 'restrict_deposits', 'restrict_withdrawals',
                'restrict_p2p', 'restrict_transfers', 'restrict_swap'
            )
        """)
        existing = [r[0] for r in cursor.fetchall()]
        
        if existing:
            print(f"\n⚠️ Colunas já existem: {existing}")
        else:
            print("\n🚀 Aplicando migração...")
            cursor.execute(MIGRATION_SQL)
            print("✅ Migração aplicada!")
        
        # Verificar resultado
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'wallets'
            AND column_name LIKE 'restrict_%' OR column_name = 'is_blocked'
            OR column_name = 'blocked_at' OR column_name = 'blocked_reason' OR column_name = 'blocked_by'
            ORDER BY column_name;
        """)
        cols = cursor.fetchall()
        
        print("\n📋 Colunas de restrição:")
        for col in cols:
            print(f"   ✅ {col[0]}: {col[1]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 CONCLUÍDO!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
