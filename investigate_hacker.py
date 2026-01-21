#!/usr/bin/env python3
"""
🚨 INVESTIGAÇÃO DO HACKER: mdhani212@proton.me
"""

import psycopg2
from decimal import Decimal

conn = psycopg2.connect(
    host='app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com',
    port=25060,
    database='holdwallet-db',
    user='holdwallet-db',
    password='AVNS_nUUIAsF6R5bJR3GvmRH',
    sslmode='require'
)
cur = conn.cursor()

hacker_id = 'cb5894e0-3f9c-4bcc-a873-982889d738b6'
hacker_email = 'mdhani212@proton.me'

print('='*80)
print('🚨 INVESTIGAÇÃO DO HACKER: mdhani212@proton.me')
print('='*80)

# Trades
cur.execute("""
    SELECT operation_type, symbol, crypto_amount, fiat_amount, status, created_at, tx_hash, error_message
    FROM instant_trades 
    WHERE user_id = %s
    ORDER BY created_at
""", (hacker_id,))
trades = cur.fetchall()

total_roubado = Decimal('0')
total_recovered = Decimal('0')

print('\n✅ TRADES COMPLETED (ROUBADOS):')
print('-'*60)
for t in trades:
    if t[4] == 'COMPLETED':
        total_roubado += t[3]
        print(f"  {t[5].strftime('%d/%m %H:%M')} - {t[0]} {float(t[2]):.4f} {t[1]} = R$ {float(t[3]):,.2f}")

print(f'\n  💸 TOTAL ROUBADO: R$ {float(total_roubado):,.2f}')

print('\n❌ TRADES CANCELADOS (EVITADOS):')
print('-'*60)
for t in trades:
    if t[4] == 'CANCELLED':
        total_recovered += t[3]
        print(f"  {t[5].strftime('%d/%m %H:%M')} - {t[0]} {float(t[2]):.4f} {t[1]} = R$ {float(t[3]):,.2f}")

print(f'\n  💰 TOTAL EVITADO: R$ {float(total_recovered):,.2f}')

# Ultima tentativa
print('\n' + '='*80)
print('🔍 ÚLTIMA TENTATIVA DE ACESSO:')
print('='*80)
cur.execute("""
    SELECT ip_address, success, failure_reason, created_at, city, country
    FROM login_attempts 
    WHERE LOWER(email) = LOWER(%s)
    ORDER BY created_at DESC
    LIMIT 1
""", (hacker_email,))
last = cur.fetchone()
print(f"  📅 Data: {last[3]}")
print(f"  🌐 IP: {last[0]}")
print(f"  📍 Local: {last[4]}, {last[5]}")
print(f"  ❌ Resultado: {'OK' if last[1] else 'FALHA - ' + str(last[2])}")

# Resumo
print('\n' + '='*80)
print('📊 RESUMO FINAL:')
print('='*80)
print(f"  💸 PERDIDO: R$ {float(total_roubado):,.2f}")
print(f"  💰 EVITADO: R$ {float(total_recovered):,.2f}")
print(f"  📧 Hacker: mdhani212@proton.me")
print(f"  👤 Username: kevinbastian")
print(f"  🌍 Origem: INDONÉSIA")
print(f"  🔒 Status: CONTA BLOQUEADA")
print(f"  📍 Carteira: 0xe655bda8a36f810b033be7eb48cb4813a210c205 (Polygon)")

cur.close()
conn.close()
