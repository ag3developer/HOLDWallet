"""Script para verificar dados de um trade específico"""
from app.core.db import SessionLocal
from app.models.instant_trade import InstantTrade

trade_id = "b4af96d0-eedf-4cb0-b0ec-aee7da1b1df3"

db = SessionLocal()
trade = db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

if trade:
    print("=" * 50)
    print("TRADE ENCONTRADO")
    print("=" * 50)
    print(f"ID: {trade.id}")
    print(f"Reference: {trade.reference_code}")
    print(f"Operation: {trade.operation}")
    print(f"Symbol: {trade.symbol}")
    print(f"Crypto Amount: {trade.crypto_amount}")
    print(f"Fiat Amount: {trade.fiat_amount}")
    print(f"Total Amount: {trade.total_amount}")
    print(f"Unit Price: {trade.unit_price}")
    print(f"Spread %: {trade.spread_percentage}")
    print(f"Network Fee %: {trade.network_fee_percentage}")
    print(f"Payment Method: {trade.payment_method}")
    print(f"Status: {trade.status}")
    print("=" * 50)
    print(f"\nValor correto para deposito: R$ {float(trade.total_amount):,.2f}")
else:
    print(f"Trade {trade_id} not found")

db.close()
