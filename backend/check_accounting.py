#!/usr/bin/env python3
"""Script para verificar entradas de contabilidade"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal
from sqlalchemy import text

def check_accounting():
    db = SessionLocal()
    try:
        # Verificar entradas de contabilidade
        result = db.execute(text('SELECT id, trade_id, entry_type, amount, status, created_at FROM accounting_entries ORDER BY created_at DESC LIMIT 10'))
        rows = result.fetchall()
        print('=' * 60)
        print('ACCOUNTING ENTRIES')
        print('=' * 60)
        if rows:
            for row in rows:
                print(f"ID: {row[0][:8]}... | Trade: {row[1][:8] if row[1] else 'N/A'}... | Type: {row[2]} | Amount: {row[3]} | Status: {row[4]}")
        else:
            print('❌ Nenhuma entrada encontrada!')
        
        # Verificar trade específico
        print()
        print('=' * 60)
        print('TRADE b1f96c7f-f358-48a1-badb-131b3c753b9c')
        print('=' * 60)
        result2 = db.execute(text("""
            SELECT id, reference_code, status, spread_amount, network_fee_amount 
            FROM instant_trades 
            WHERE id = 'b1f96c7f-f358-48a1-badb-131b3c753b9c'
        """))
        trade = result2.fetchone()
        if trade:
            print(f'ID: {trade[0]}')
            print(f'Reference: {trade[1]}')
            print(f'Status: {trade[2]}')
            print(f'Spread Amount: {trade[3]}')
            print(f'Network Fee: {trade[4]}')
        else:
            print('❌ Trade não encontrado!')
            
        # Verificar se há entries para este trade
        print()
        print('=' * 60)
        print('ENTRIES PARA ESTE TRADE')
        print('=' * 60)
        result3 = db.execute(text("""
            SELECT id, entry_type, amount, status 
            FROM accounting_entries 
            WHERE trade_id = 'b1f96c7f-f358-48a1-badb-131b3c753b9c'
        """))
        entries = result3.fetchall()
        if entries:
            for entry in entries:
                print(f"Type: {entry[1]} | Amount: {entry[2]} | Status: {entry[3]}")
        else:
            print('❌ Nenhuma entry para este trade - precisa clicar em "Enviar para Contabilidade"')
            
    finally:
        db.close()

if __name__ == "__main__":
    check_accounting()
