#!/usr/bin/env python3.9
"""
Debug script para testar o endpoint /prices/batch
"""
import asyncio
import httpx
import json

async def test_prices():
    # Test individual coins first
    print("🔍 Testing individual coins with CoinGecko...")
    
    coin_tests = {
        'polygon-ecosystem-token': 'MATIC',
        'usd-coin': 'USDC',
        'dai': 'DAI',
    }
    
    async with httpx.AsyncClient() as client:
        for coin_id, symbol in coin_tests.items():
            try:
                response = await client.get(
                    'https://api.coingecko.com/api/v3/simple/price',
                    params={
                        'ids': coin_id,
                        'vs_currencies': 'brl',
                        'include_market_cap': 'true',
                        'include_24hr_vol': 'true',
                        'include_24hr_change': 'true'
                    },
                    timeout=10
                )
                data = response.json()
                price = data.get(coin_id, {}).get('brl', 'NOT FOUND')
                print(f"  ✅ {symbol} ({coin_id}): R$ {price}")
            except Exception as e:
                print(f"  ❌ {symbol} ({coin_id}): ERROR - {e}")
    
    # Test batch request with corrected symbols
    print("\n📊 Testing batch request with all 17 symbols...")
    all_symbols = 'BTC,ETH,MATIC,BNB,TRX,SOL,USDT,USDC,DAI,LTC,DOGE,ADA,AVAX,DOT,LINK,SHIB,XRP'
    
    try:
        response = await client.get(
            'http://127.0.0.1:8000/api/v1/prices/batch',
            params={
                'symbols': all_symbols,
                'fiat': 'brl'
            },
            timeout=15
        )
        data = response.json()
        
        prices = data.get('prices', {})
        count = len(prices)
        symbols_returned = sorted(prices.keys())
        
        print(f"  Returned: {count}/17 symbols")
        print(f"  Symbols: {', '.join(symbols_returned)}")
        
        # Check which ones are missing
        requested = set(all_symbols.split(','))
        returned = set(symbols_returned)
        missing = requested - returned
        
        if missing:
            print(f"\n  ⚠️  MISSING: {', '.join(sorted(missing))}")
        else:
            print("\n  ✅ ALL 17 SYMBOLS RETURNED!")
            
    except Exception as e:
        print(f"  ❌ Batch request failed: {e}")

if __name__ == '__main__':
    asyncio.run(test_prices())
