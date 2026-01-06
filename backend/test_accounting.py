#!/usr/bin/env python3
"""Test send_to_accounting endpoint"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.accounting import AccountingEntry
from datetime import datetime, timezone
import traceback

def test_send_to_accounting():
    trade_id = "b1f96c7f-f358-48a1-badb-131b3c753b9c"
    
    db = SessionLocal()
    try:
        print("=" * 60)
        print("🧪 Testando send_to_accounting")
        print("=" * 60)
        
        # Buscar trade
        trade = db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()
        
        if not trade:
            print(f"❌ Trade {trade_id} não encontrado")
            return
            
        print(f"✅ Trade encontrado: {trade.reference_code}")
        print(f"   Status: {trade.status}")
        print(f"   Spread: {trade.spread_amount}")
        print(f"   Network Fee: {trade.network_fee_amount}")
        
        # Verificar se já existe entry
        existing = db.query(AccountingEntry).filter(
            AccountingEntry.trade_id == trade_id
        ).count()
        
        if existing > 0:
            print(f"⚠️  Já existem {existing} entries para este trade")
            return
        
        # Tentar criar entry
        print("\n📝 Tentando criar AccountingEntry...")
        
        now = datetime.now(timezone.utc)
        
        if trade.spread_amount and float(trade.spread_amount) > 0:
            print(f"   Criando entry spread: {trade.spread_amount}")
            
            spread_entry = AccountingEntry(
                trade_id=trade.id,
                reference_code=trade.reference_code,
                entry_type="spread",
                amount=trade.spread_amount,
                currency="BRL",
                percentage=trade.spread_percentage,
                base_amount=trade.fiat_amount,
                description=f"Spread de {trade.spread_percentage}% do trade {trade.reference_code}",
                status="processed",
                user_id=trade.user_id,
                created_by="test@admin.com",
                created_at=now
            )
            db.add(spread_entry)
            print("   ✅ Entry spread adicionada")
        
        if trade.network_fee_amount and float(trade.network_fee_amount) > 0:
            print(f"   Criando entry network_fee: {trade.network_fee_amount}")
            
            network_entry = AccountingEntry(
                trade_id=trade.id,
                reference_code=trade.reference_code,
                entry_type="network_fee",
                amount=trade.network_fee_amount,
                currency="BRL",
                percentage=trade.network_fee_percentage,
                base_amount=trade.fiat_amount,
                description=f"Taxa de rede de {trade.network_fee_percentage}% do trade {trade.reference_code}",
                status="processed",
                user_id=trade.user_id,
                created_by="test@admin.com",
                created_at=now
            )
            db.add(network_entry)
            print("   ✅ Entry network_fee adicionada")
        
        print("\n💾 Fazendo commit...")
        db.commit()
        print("✅ Commit realizado com sucesso!")
        
        # Verificar
        count = db.query(AccountingEntry).filter(
            AccountingEntry.trade_id == trade_id
        ).count()
        print(f"\n📊 Total de entries para este trade: {count}")
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        print("\n📋 Traceback completo:")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_send_to_accounting()
