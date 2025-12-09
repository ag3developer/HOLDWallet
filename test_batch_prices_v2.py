#!/usr/bin/env python3
"""
Quick test script for the /api/v1/prices/batch endpoint
"""
import httpx
import json
import asyncio

async def test_batch_prices():
    """Test the batch prices endpoint"""
    
    # Test symbols and currencies
    test_symbols = "BTC,ETH,USDT,SOL,ADA,AVAX,MATIC,DOT"
    test_fiat = "BRL"
    
    # Construct the URL
    url = f"http://127.0.0.1:8000/api/v1/prices/batch?symbols={test_symbols}&fiat={test_fiat}"
    
    print(f"🧪 Testing Batch Prices Endpoint")
    print(f"📍 URL: {url}")
    print("-" * 80)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"✅ Status: {response.status_code}")
                print(f"📦 Symbols requested: {test_symbols}")
                print(f"💱 Currency: {test_fiat}")
                print(f"📊 Results: {data.get('symbols_count', 0)} prices retrieved")
                print(f"⏱️  Timestamp: {data.get('timestamp', 'N/A')}")
                print(f"📍 Source: {data.get('source', 'N/A')}")
                print()
                print("🪙 Price Data:")
                print("-" * 80)
                
                prices = data.get('prices', {})
                for symbol, price_info in prices.items():
                    print(f"\n{symbol}:")
                    print(f"  Price: {price_info.get('price', 'N/A')} {test_fiat}")
                    print(f"  Change 24h: {price_info.get('change_24h', 'N/A')}%")
                    print(f"  Market Cap: {price_info.get('market_cap', 'N/A')} {test_fiat}")
                    print(f"  Volume 24h: {price_info.get('volume_24h', 'N/A')} {test_fiat}")
                
                print("\n" + "-" * 80)
                print("✅ Batch prices endpoint working correctly!")
                
            elif response.status_code == 401:
                print(f"❌ Status: {response.status_code}")
                print("⚠️  Authentication required. Make sure you're logged in.")
                print(f"Response: {response.text}")
                
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("⚠️  Make sure the backend is running on http://127.0.0.1:8000")

if __name__ == "__main__":
    asyncio.run(test_batch_prices())
