#!/usr/bin/env python3
"""Verificar se as colunas existem no banco"""
import psycopg2

DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "defaultdb",
    "sslmode": "require"
}

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Verificar colunas da tabela wallets
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'wallets'
        ORDER BY ordinal_position;
    """)
    
    print("📋 Colunas da tabela 'wallets':")
    print("-" * 60)
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
    
    # Verificar especificamente as colunas de restrição
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'wallets'
        AND column_name LIKE 'restrict_%' OR column_name = 'is_blocked'
    """)
    
    restriction_cols = [r[0] for r in cursor.fetchall()]
    print("\n🔒 Colunas de restrição encontradas:")
    for col in restriction_cols:
        print(f"  ✅ {col}")
    
    if not restriction_cols:
        print("  ❌ NENHUMA coluna de restrição encontrada!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erro: {e}")
