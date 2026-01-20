#!/usr/bin/env python3
"""Verificar estrutura da tabela addresses"""
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
    
    # Verificar estrutura de addresses
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'addresses'
        ORDER BY ordinal_position;
    """)
    
    print("📋 Colunas da tabela 'addresses':")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")
    
    # Contar registros em cada tabela
    print("\n📊 Contagem de registros:")
    for table in ['users', 'wallets', 'addresses']:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   {table}: {count} registros")
        except:
            print(f"   {table}: erro ao contar")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erro: {e}")
