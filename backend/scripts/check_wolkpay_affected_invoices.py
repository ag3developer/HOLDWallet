#!/usr/bin/env python3
"""
Script para identificar faturas WolkPay que foram pagas com valor incorreto
(enviou crypto bruta ao invés de líquida)

Uso:
    python check_wolkpay_affected_invoices.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from datetime import datetime
from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    print("🔍 Verificando faturas WolkPay afetadas pelo bug de taxa...\n")
    
    # Conectar ao banco
    engine = create_engine(str(settings.DATABASE_URL))
    
    with engine.connect() as conn:
        # Buscar faturas COMPLETED onde fee_payer = BENEFICIARY
        # Estas são as que potencialmente tiveram taxa não cobrada
        result = conn.execute(text("""
            SELECT 
                invoice_number,
                beneficiary_id,
                crypto_currency,
                crypto_amount,
                service_fee_percent,
                network_fee_percent,
                fee_payer,
                beneficiary_receives_brl,
                beneficiary_receives_crypto,
                crypto_tx_hash,
                crypto_sent_at,
                status
            FROM wolkpay_invoices
            WHERE status IN ('COMPLETED', 'PAID')
              AND fee_payer = 'BENEFICIARY'
            ORDER BY created_at DESC
            LIMIT 50
        """))
        
        rows = result.fetchall()
        
        if not rows:
            print("✅ Nenhuma fatura COMPLETED/PAID encontrada com fee_payer=BENEFICIARY")
            return
        
        print(f"📋 Encontradas {len(rows)} faturas para análise:\n")
        print("-" * 100)
        
        total_perdido = Decimal('0')
        faturas_afetadas = []
        
        for row in rows:
            invoice_number = row[0]
            crypto_currency = row[2]
            crypto_amount = Decimal(str(row[3])) if row[3] else Decimal('0')
            service_fee = Decimal(str(row[4])) if row[4] else Decimal('3.65')
            network_fee = Decimal(str(row[5])) if row[5] else Decimal('0.15')
            fee_payer = row[6]
            beneficiary_receives_crypto = Decimal(str(row[8])) if row[8] else None
            crypto_tx_hash = row[9]
            crypto_sent_at = row[10]
            status = row[11]
            
            # Calcular valor esperado
            total_fee_percent = service_fee + network_fee
            expected_crypto = crypto_amount * (1 - total_fee_percent / 100)
            
            # Se não tem beneficiary_receives_crypto, provavelmente foi afetada
            if beneficiary_receives_crypto is None and status == 'COMPLETED':
                # Provavelmente enviou crypto_amount ao invés de expected_crypto
                taxa_nao_cobrada = crypto_amount - expected_crypto
                total_perdido += taxa_nao_cobrada
                faturas_afetadas.append({
                    'invoice': invoice_number,
                    'crypto': crypto_currency,
                    'bruto': crypto_amount,
                    'liquido_esperado': expected_crypto,
                    'taxa_perdida': taxa_nao_cobrada,
                    'tx_hash': crypto_tx_hash,
                    'sent_at': crypto_sent_at
                })
                
                print(f"⚠️  {invoice_number}")
                print(f"   Crypto: {crypto_amount} {crypto_currency}")
                print(f"   Esperado: {expected_crypto:.6f} {crypto_currency}")
                print(f"   Taxa perdida: {taxa_nao_cobrada:.6f} {crypto_currency}")
                print(f"   TX: {crypto_tx_hash}")
                print(f"   Enviado em: {crypto_sent_at}")
                print()
        
        print("-" * 100)
        print(f"\n📊 RESUMO:")
        print(f"   Faturas potencialmente afetadas: {len(faturas_afetadas)}")
        print(f"   Total de taxa potencialmente perdida: {total_perdido:.6f} (em diversas cryptos)")
        
        if faturas_afetadas:
            print("\n⚠️  ATENÇÃO: As faturas acima podem ter enviado valor bruto ao invés de líquido.")
            print("   Verifique as transações na blockchain para confirmar.")

if __name__ == "__main__":
    main()
