#!/usr/bin/env python3
"""Bloquear usuário diretamente no banco para teste"""
import psycopg2
from datetime import datetime, timezone

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
    
    # ID da wallet do usuário contato@josecarlosmartins.com
    wallet_id = "991be417-9dd8-4879-8ddd-09a3a1d4466e"
    
    print(f"🔒 Bloqueando wallet {wallet_id}...")
    
    # Aplicar bloqueio de instant_trade
    cursor.execute("""
        UPDATE wallets 
        SET 
            restrict_instant_trade = TRUE,
            blocked_reason = 'Teste de bloqueio direto no banco',
            blocked_at = NOW()
        WHERE id = %s
    """, (wallet_id,))
    
    rows_affected = cursor.rowcount
    conn.commit()
    
    print(f"✅ Linhas atualizadas: {rows_affected}")
    
    # Verificar
    cursor.execute("""
        SELECT id, restrict_instant_trade, blocked_reason, blocked_at
        FROM wallets 
        WHERE id = %s
    """, (wallet_id,))
    
    result = cursor.fetchone()
    print(f"\n📋 Verificação:")
    print(f"   restrict_instant_trade: {result[1]}")
    print(f"   blocked_reason: {result[2]}")
    print(f"   blocked_at: {result[3]}")
    
    cursor.close()
    conn.close()
    
    print("\n🎉 Agora teste fazer um trade com o usuário contato@josecarlosmartins.com")
    
except Exception as e:
    print(f"❌ Erro: {e}")
