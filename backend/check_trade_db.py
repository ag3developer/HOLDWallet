#!/usr/bin/env python3
"""Check trade details in database"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Buscar pelos dois trades mencionados
reference_codes = ['OTC-2026-B48CC6', 'OTC-2026-A3F981']

for ref_code in reference_codes:
    cur.execute("""
        SELECT id, reference_code, operation_type, symbol, crypto_amount, fiat_amount, 
               total_amount, spread_percentage, spread_amount, network_fee_percentage,
               network_fee_amount, payment_method, status, crypto_price
        FROM instant_trades 
        WHERE reference_code = %s
    """, (ref_code,))

    row = cur.fetchone()
    if row:
        cols = ['id', 'reference_code', 'operation_type', 'symbol', 'crypto_amount', 'fiat_amount', 
                'total_amount', 'spread_percentage', 'spread_amount', 'network_fee_percentage',
                'network_fee_amount', 'payment_method', 'status', 'crypto_price']
        print("\n" + "="*60)
        print(f"TRADE: {ref_code}")
        print("="*60)
        for i, col in enumerate(cols):
            print(f"{col:25}: {row[i]}")
        print("="*60)
    else:
        print(f"\nTrade {ref_code} não encontrado")

conn.close()
