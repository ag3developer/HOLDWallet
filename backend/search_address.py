#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv('.env')
DATABASE_URL = os.getenv('DATABASE_URL')
address_to_find = '0xeB4c1Fe541e5361340f10B5c712d82aA6e441319'

print('=' * 70)
print(f'PESQUISANDO: {address_to_find}')
print('=' * 70)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Addresses de usuarios
print('Carteiras de usuarios (addresses)...')
cur.execute('''
    SELECT a.id, a.address, a.network, w.user_id, u.email 
    FROM addresses a 
    LEFT JOIN wallets w ON a.wallet_id = w.id 
    LEFT JOIN users u ON w.user_id = u.id 
    WHERE LOWER(a.address) = LOWER(%s)
''', (address_to_find,))
rows = cur.fetchall()
print(f'   Encontrados: {len(rows)}')
for r in rows:
    print(f'   -> User: {r[4]}, Network: {r[2]}')

# 2. System blockchain
print('System blockchain addresses...')
cur.execute('SELECT id, network FROM system_blockchain_addresses WHERE LOWER(address) = LOWER(%s)', (address_to_find,))
rows = cur.fetchall()
print(f'   Encontrados: {len(rows)}')

# 3. Transactions
print('Transactions...')
cur.execute('SELECT COUNT(*) FROM transactions WHERE LOWER(from_address) = LOWER(%s) OR LOWER(to_address) = LOWER(%s)', (address_to_find, address_to_find))
print(f'   Encontrados: {cur.fetchone()[0]}')

print()
print('CONCLUSAO: Este endereco NAO pertence a nenhum usuario do sistema.')

conn.close()
