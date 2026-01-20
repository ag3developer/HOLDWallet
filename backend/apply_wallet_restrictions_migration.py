#!/usr/bin/env python3
"""
Script para aplicar migração de restrições de wallet no banco de produção.
Usando credenciais corretas do DigitalOcean.
"""
import psycopg2
import sys

# Configurações do banco de dados - CREDENCIAIS CORRETAS
DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "defaultdb",  # CORRIGIDO: era holdwallet-db, agora é defaultdb
    "sslmode": "require"
}

# SQL de migração
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

-- Criar índice para consultas de wallets bloqueadas
CREATE INDEX IF NOT EXISTS ix_wallets_is_blocked ON wallets(is_blocked);
"""

def main():
    print("=" * 60)
    print("🔧 Aplicando migração de restrições de wallet")
    print("=" * 60)
    print(f"Host: {DB_CONFIG['host']}")
    print(f"Database: {DB_CONFIG['database']}")
    print(f"User: {DB_CONFIG['user']}")
    print("-" * 60)
    
    try:
        # Conectar ao banco
        print("\n📡 Conectando ao banco de dados...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()
        print("✅ Conexão estabelecida!")
        
        # Verificar se a tabela wallets existe
        print("\n🔍 Verificando tabela wallets...")
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
        
        print("✅ Tabela wallets encontrada!")
        
        # Verificar colunas existentes
        print("\n🔍 Verificando colunas existentes...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'wallets'
            ORDER BY ordinal_position;
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"   Colunas atuais: {len(existing_columns)}")
        
        # Aplicar migração
        print("\n🚀 Aplicando migração...")
        cursor.execute(MIGRATION_SQL)
        print("✅ Migração aplicada com sucesso!")
        
        # Verificar novas colunas
        print("\n�� Verificando novas colunas...")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'wallets'
            AND column_name IN (
                'is_blocked', 'blocked_at', 'blocked_reason', 'blocked_by',
                'restrict_instant_trade', 'restrict_deposits', 'restrict_withdrawals',
                'restrict_p2p', 'restrict_transfers', 'restrict_swap'
            )
            ORDER BY column_name;
        """)
        new_columns = cursor.fetchall()
        
        print("\n📋 Novas colunas adicionadas:")
        for col in new_columns:
            print(f"   ✅ {col[0]}: {col[1]} (default: {col[2]})")
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        
    except psycopg2.Error as e:
        print(f"\n❌ Erro de banco de dados: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
