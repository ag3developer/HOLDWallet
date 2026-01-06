#!/usr/bin/env python3
"""Check trade details in database"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Trade específico para verificar
trade_id = 'b1f96c7f-f358-48a1-badb-131b3c753b9c'

cur.execute("""
    SELECT id, reference_code, operation_type, symbol, crypto_amount, fiat_amount, 
           total_amount, spread_percentage, spread_amount, network_fee_percentage,
           network_fee_amount, payment_method, status, crypto_price,
           brl_amount, brl_total_amount, usd_to_brl_rate
    FROM instant_trades 
    WHERE id = %s
""", (trade_id,))

row = cur.fetchone()
if row:
    cols = ['id', 'reference_code', 'operation_type', 'symbol', 'crypto_amount', 'fiat_amount', 
            'total_amount', 'spread_percentage', 'spread_amount', 'network_fee_percentage',
            'network_fee_amount', 'payment_method', 'status', 'crypto_price',
            'brl_amount', 'brl_total_amount', 'usd_to_brl_rate']
    print("\n" + "="*60)
    print(f"TRADE: {trade_id}")
    print("="*60)
    for i, col in enumerate(cols):
        print(f"{col:25}: {row[i]}")
    print("="*60)
    
    # Calcular o que seria o valor correto em BRL
    fiat_amount = float(row[5]) if row[5] else 0
    total_amount = float(row[6]) if row[6] else 0
    print("\n📊 ANÁLISE:")
    print(f"  fiat_amount (USD): ${fiat_amount:.2f}")
    print(f"  total_amount (USD): ${total_amount:.2f}")
    if row[16]:  # usd_to_brl_rate
        rate = float(row[16])
        print(f"  Taxa USD/BRL: {rate:.4f}")
        print(f"  Total em BRL calculado: R$ {total_amount * rate:.2f}")
else:
    print(f"\nTrade {trade_id} não encontrado")

conn.close()
