#!/usr/bin/env python3
"""
Script para ZERAR saldos genéricos problemáticos.
Saldos como USDT, USDC (sem rede) não existem na blockchain e devem ser removidos.

⚠️ ATENÇÃO: Este script vai ZERAR os saldos genéricos!
Execute apenas se tiver certeza de que esses saldos não são reais.
"""
import psycopg2
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def main():
    DRY_RUN = False  # EXECUTANDO DE VERDADE!
    
    print('=' * 80)
    if DRY_RUN:
        print('MODO DRY RUN - Nenhuma alteracao sera feita')
    else:
        print('MODO EXECUCAO REAL - Saldos serao zerados!')
    print('=' * 80)
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Buscar saldos genéricos
    cur.execute('''
        SELECT id, user_id, cryptocurrency, available_balance, locked_balance, total_balance
        FROM wallet_balances 
        WHERE cryptocurrency IN ('USDT', 'USDC', 'DAI', 'BUSD')
        AND (available_balance > 0 OR locked_balance > 0)
        ORDER BY available_balance DESC
    ''')

    results = cur.fetchall()
    
    print(f'\nEncontrados {len(results)} saldos genericos para zerar:\n')

    for row in results:
        bal_id, user_id, crypto, avail, locked, total = row
        print(f'  {crypto}: {float(avail):.4f} (user: {str(user_id)[:8]}...)')
        
        if not DRY_RUN:
            # Zerar o saldo
            cur.execute('''
                UPDATE wallet_balances 
                SET available_balance = 0,
                    locked_balance = 0,
                    total_balance = 0,
                    last_updated_reason = 'Saldo generico zerado - migracao para formato rede_token',
                    updated_at = %s
                WHERE id = %s
            ''', (datetime.now(timezone.utc), bal_id))
            
            # Registrar no historico
            cur.execute('''
                INSERT INTO balance_history 
                (user_id, cryptocurrency, operation_type, amount, 
                 balance_before, balance_after, locked_before, locked_after,
                 reason, created_at)
                VALUES (%s, %s, 'admin_adjustment', %s, %s, 0, %s, 0, %s, %s)
            ''', (
                str(user_id), 
                crypto, 
                float(avail) + float(locked),
                float(avail),
                float(locked),
                'Saldo generico zerado - migracao para formato rede_token (polygon_usdt, bsc_usdt, etc)',
                datetime.now(timezone.utc)
            ))
            
            print(f'    -> ZERADO!')

    if not DRY_RUN and results:
        conn.commit()
        print(f'\n✅ {len(results)} saldos zerados com sucesso!')
    elif DRY_RUN:
        print(f'\n[DRY RUN] {len(results)} saldos seriam zerados.')
        print('\nPara executar de verdade, altere DRY_RUN = False no script.')
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
