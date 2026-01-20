#!/usr/bin/env python3
"""Verificar restrições do usuário contato@josecarlosmartins.com"""
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
    
    # Buscar usuário
    cursor.execute("""
        SELECT id, email, username, is_active
        FROM users 
        WHERE email = 'contato@josecarlosmartins.com'
    """)
    user = cursor.fetchone()
    
    if user:
        print(f"📧 Usuário encontrado:")
        print(f"   ID: {user[0]}")
        print(f"   Email: {user[1]}")
        print(f"   Username: {user[2]}")
        print(f"   Ativo: {user[3]}")
        
        user_id = user[0]
        
        # Buscar wallet do usuário
        cursor.execute("""
            SELECT id, name, network, is_active, is_blocked, blocked_reason,
                   restrict_instant_trade, restrict_deposits, restrict_withdrawals,
                   restrict_p2p, restrict_transfers, restrict_swap
            FROM wallets 
            WHERE user_id = %s
        """, (user_id,))
        
        wallets = cursor.fetchall()
        
        if wallets:
            print(f"\n💼 Wallets encontradas: {len(wallets)}")
            for w in wallets:
                print(f"\n   Wallet ID: {w[0]}")
                print(f"   Nome: {w[1]}")
                print(f"   Rede: {w[2]}")
                print(f"   Ativa: {w[3]}")
                print(f"   🔒 is_blocked: {w[4]}")
                print(f"   📝 blocked_reason: {w[5]}")
                print(f"   🚫 restrict_instant_trade: {w[6]}")
                print(f"   🚫 restrict_deposits: {w[7]}")
                print(f"   🚫 restrict_withdrawals: {w[8]}")
                print(f"   🚫 restrict_p2p: {w[9]}")
                print(f"   🚫 restrict_transfers: {w[10]}")
                print(f"   🚫 restrict_swap: {w[11]}")
        else:
            print("\n❌ Nenhuma wallet encontrada para este usuário!")
    else:
        print("❌ Usuário não encontrado!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erro: {e}")
