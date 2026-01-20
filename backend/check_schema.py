#!/usr/bin/env python3
"""Verificar tipo das colunas id e user_id nas tabelas"""
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
    
    # Verificar tabelas
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    tables = [r[0] for r in cursor.fetchall()]
    print(f"📋 Tabelas encontradas: {len(tables)}")
    
    # Verificar tipo de ID em wallets e users
    for table in ['wallets', 'users', 'addresses']:
        cursor.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table}' AND (column_name = 'id' OR column_name LIKE '%_id')
            ORDER BY column_name;
        """)
        print(f"\n🔍 {table}:")
        for row in cursor.fetchall():
            print(f"   {row[0]}: {row[1]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erro: {e}")
