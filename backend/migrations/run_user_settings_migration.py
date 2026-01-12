#!/usr/bin/env python3
"""
Script para adicionar colunas faltantes na tabela user_settings.
Execute este script para sincronizar o banco de dados com o modelo SQLAlchemy.
"""

import os
import sys

# Adiciona o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada no .env")
    sys.exit(1)

print(f"🔗 Conectando ao banco de dados...")

engine = create_engine(DATABASE_URL)

# Colunas que devem existir na tabela user_settings
REQUIRED_COLUMNS = {
    'require_pin_for_transactions': 'BOOLEAN DEFAULT TRUE',
    'biometric_enabled': 'BOOLEAN DEFAULT FALSE',
    'auto_lock_timeout': 'INTEGER DEFAULT 300',
    'preferred_networks': 'JSONB',
    'gas_preference': "VARCHAR(10) DEFAULT 'standard'",
    'transaction_notifications': 'BOOLEAN DEFAULT TRUE',
    'price_alerts': 'BOOLEAN DEFAULT FALSE',
    'security_notifications': 'BOOLEAN DEFAULT TRUE',
    'developer_mode': 'BOOLEAN DEFAULT FALSE',
    'custom_rpc_urls': 'JSONB',
    'address_book': 'JSONB',
    'backup_reminder_enabled': 'BOOLEAN DEFAULT TRUE',
    'last_backup_reminder': 'TIMESTAMP WITH TIME ZONE',
    'backup_frequency_days': 'INTEGER DEFAULT 30',
    'default_currency': "VARCHAR(5) DEFAULT 'USD'",
    'theme': "VARCHAR(10) DEFAULT 'light'",
    'language': "VARCHAR(5) DEFAULT 'en'",
    'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    'updated_at': 'TIMESTAMP WITH TIME ZONE',
    'last_login': 'TIMESTAMP WITH TIME ZONE',
}

def get_existing_columns(conn):
    """Retorna lista de colunas existentes na tabela user_settings."""
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings'
    """))
    return [row[0] for row in result.fetchall()]

def add_missing_columns():
    """Adiciona colunas faltantes à tabela user_settings."""
    with engine.connect() as conn:
        # Verifica se a tabela existe
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_settings'
            )
        """))
        
        if not result.fetchone()[0]:
            print("❌ Tabela user_settings não existe!")
            print("   Execute primeiro: python create_user_settings.py")
            return False
        
        existing_columns = get_existing_columns(conn)
        print(f"📋 Colunas existentes: {len(existing_columns)}")
        
        added_count = 0
        for column_name, column_def in REQUIRED_COLUMNS.items():
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE user_settings ADD COLUMN {column_name} {column_def}"
                    conn.execute(text(sql))
                    print(f"   ✅ Adicionada coluna: {column_name}")
                    added_count += 1
                except Exception as e:
                    print(f"   ⚠️ Erro ao adicionar {column_name}: {e}")
            else:
                print(f"   ✓ Coluna já existe: {column_name}")
        
        conn.commit()
        
        print(f"\n📊 Resumo:")
        print(f"   - Colunas existentes: {len(existing_columns)}")
        print(f"   - Colunas adicionadas: {added_count}")
        print(f"   - Total esperado: {len(REQUIRED_COLUMNS)}")
        
        # Lista todas as colunas após a migration
        print(f"\n📋 Colunas finais da tabela user_settings:")
        final_columns = get_existing_columns(conn)
        for col in sorted(final_columns):
            print(f"   - {col}")
        
        return True

if __name__ == "__main__":
    print("=" * 50)
    print("🔧 Migration: user_settings columns")
    print("=" * 50)
    
    try:
        success = add_missing_columns()
        if success:
            print("\n✅ Migration concluída com sucesso!")
        else:
            print("\n❌ Migration falhou!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)
