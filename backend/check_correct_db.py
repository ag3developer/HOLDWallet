#!/usr/bin/env python3
"""Verificar estrutura do banco correto"""
import psycopg2

DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "holdwallet-db",
    "sslmode": "require"
}

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Verificar TODAS as colunas da tabela wallets
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'wallets'
        ORDER BY ordinal_position;
    """)
    
    print("📋 Todas as colunas da tabela 'wallets' (banco holdwallet-db):")
    print("-" * 80)
    for row in cursor.fetchall():
        print(f"  {row[0]:<25} {row[1]:<30} nullable:{row[2]} default:{row[3]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erro: {e}")
