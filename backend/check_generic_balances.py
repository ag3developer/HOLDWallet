#!/usr/bin/env python3
"""
Script para verificar e listar saldos genéricos problemáticos.
Saldos como USDT, USDC (sem rede) não deveriam existir.
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require')

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Buscar saldos genéricos (USDT, USDC sem rede)
    cur.execute('''
        SELECT user_id, cryptocurrency, available_balance, locked_balance, total_balance
        FROM wallet_balances 
        WHERE cryptocurrency IN ('USDT', 'USDC', 'DAI', 'BUSD')
        AND (available_balance > 0 OR locked_balance > 0)
        ORDER BY available_balance DESC
    ''')

    print('=' * 80)
    print('SALDOS GENERICOS ENCONTRADOS (PROBLEMA!)')
    print('=' * 80)
    print(f'{"User ID":<40} {"Crypto":<10} {"Available":<15} {"Locked":<15}')
    print('-' * 80)

    results = cur.fetchall()
    total_usdt = 0
    total_usdc = 0

    for row in results:
        user_id, crypto, avail, locked, total = row
        print(f'{str(user_id):<40} {crypto:<10} {float(avail):<15.4f} {float(locked):<15.4f}')
        if crypto == 'USDT':
            total_usdt += float(avail) + float(locked)
        if crypto == 'USDC':
            total_usdc += float(avail) + float(locked)

    print()
    print(f'Total USDT generico: {total_usdt:.4f}')
    print(f'Total USDC generico: {total_usdc:.4f}')
    print(f'Total de registros: {len(results)}')
    
    # Buscar emails dos usuarios afetados
    if results:
        user_ids = list(set([str(r[0]) for r in results]))
        placeholders = ','.join(['%s'] * len(user_ids))
        cur.execute(f'''
            SELECT id, email, username FROM users WHERE id::text IN ({placeholders})
        ''', user_ids)
        
        print()
        print('USUARIOS AFETADOS:')
        print('-' * 80)
        for user in cur.fetchall():
            print(f'  {user[2]} - {user[1]}')

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
