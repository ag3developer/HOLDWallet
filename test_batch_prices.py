#!/usr/bin/env python3
"""
Quick test script for the new /api/v1/prices/batch endpoint
"""
import asyncio
import httpx
import json

async def test_batch_prices():
    """Test the batch prices endpoint"""
    
    # Test data
    test_symbols = "BTC,ETH,USDT,SOL,ADA,AVAX,MATIC,DOT"
    test_fiat = "BRL"
    
    # Get token (you may need to update this with a valid token)
    token = "test-token"  # This will be replaced with actual token from auth
    
    url = f"http://127.0.0.1:8000/api/v1/prices/batch?symbols={test_symbols}&fiat={test_fiat}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Testing endpoint: {url}")
    print(f"Headers: {headers}")
    print(f"Symbols: {test_symbols}")
    print(f"Fiat: {test_fiat}")
    print("-" * 80)
    
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=headers)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print("-" * 80)
            
            if response.status_code == 200:
                data = response.json()
                print("✓ SUCCESS - Batch prices endpoint working!")
                print("\nResponse format:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
                
                # Validate response structure
                assert "success" in data, "Missing 'success' field"
                assert "prices" in data, "Missing 'prices' field"
                assert "source" in data, "Missing 'source' field"
                assert "timestamp" in data, "Missing 'timestamp' field"
                assert data["success"] is True, "Success should be True"
                
                prices = data["prices"]
                print(f"\n✓ Prices returned: {len(prices)} cryptos")
                for symbol, price_data in prices.items():
                    print(f"  - {symbol}: R$ {price_data['price']:,.2f} (24h: {price_data['change_24h']:+.2f}%)")
                
                print("\n✓ All validations passed!")
                
            elif response.status_code == 401:
                print("✗ UNAUTHORIZED - Token issue")
                print("Response:", response.text)
            else:
                print(f"✗ ERROR - Status {response.status_code}")
                print("Response:", response.text)
    
    except Exception as e:
        print(f"✗ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_batch_prices())
