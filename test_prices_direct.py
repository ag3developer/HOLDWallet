#!/usr/bin/env python3
"""
Test Price Aggregator directly without FastAPI
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_coingecko():
    """Test CoinGecko directly"""
    import httpx
    
    print("\n🧪 Testing CoinGecko API directly...\n")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": "bitcoin,ethereum,matic-network",
            "vs_currencies": "brl",
            "include_market_cap": "true",
            "include_24hr_vol": "true",
            "include_24hr_change": "true"
        }
        
        try:
            print(f"📡 Fetching from: {url}")
            print(f"📋 Params: {params}\n")
            
            response = await client.get(url, params=params, timeout=10.0)
            print(f"✅ Status: {response.status_code}")
            
            data = response.json()
            print(f"✅ Response received with {len(data)} coins\n")
            
            # Pretty print response
            import json
            print(json.dumps(data, indent=2))
            return True
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


async def test_price_aggregator():
    """Test PriceAggregator service"""
    print("\n\n🧪 Testing PriceAggregator Service...\n")
    
    try:
        from app.services.price_aggregator import price_aggregator
        
        symbols = ['BTC', 'ETH', 'MATIC']
        currency = 'brl'
        
        print(f"📊 Fetching prices for: {symbols}")
        print(f"💱 Currency: {currency.upper()}\n")
        
        prices = await price_aggregator.get_prices(symbols, currency)
        
        if prices:
            print(f"✅ Successfully fetched {len(prices)} prices:\n")
            for symbol, price_data in sorted(prices.items()):
                print(f"  {symbol}: R$ {price_data.price:,.2f}")
                print(f"    Change (24h): {price_data.change_24h:+.2f}%")
                print(f"    Source: {price_data.source}")
                print()
            return True
        else:
            print("❌ No prices fetched")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("=" * 60)
    print("PRICE SYSTEM TEST")
    print("=" * 60)
    
    result1 = await test_coingecko()
    result2 = await test_price_aggregator()
    
    print("\n" + "=" * 60)
    if result1 and result2:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
