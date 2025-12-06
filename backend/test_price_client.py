"""Test PriceClient to verify it's working"""
import asyncio
from app.clients.price_client import price_client

async def test_prices():
    print("Testing PriceClient...")
    
    # Test MATIC price
    prices = await price_client.get_prices(["matic"], ["usd", "brl"])
    print(f"\nMATIC prices: {prices}")
    
    # Test single price
    matic_usd = await price_client.get_price("matic", "usd")
    print(f"MATIC/USD: {matic_usd}")
    
    matic_brl = await price_client.get_price("matic", "brl")
    print(f"MATIC/BRL: {matic_brl}")
    
    # Calculate balance
    balance = 5  # Your actual balance
    if matic_usd:
        balance_usd = balance * matic_usd
        print(f"\n5 MATIC = ${balance_usd:.2f} USD")
    
    if matic_brl:
        balance_brl = balance * matic_brl
        print(f"5 MATIC = R$ {balance_brl:.2f} BRL")

if __name__ == "__main__":
    asyncio.run(test_prices())
