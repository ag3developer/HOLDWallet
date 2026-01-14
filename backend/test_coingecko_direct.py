"""Test CoinGecko API directly"""
import httpx
import asyncio

async def test_coingecko():
    print("Testing CoinGecko API...")
    
    # Test with polygon-ecosystem-token (novo ID correto para MATIC/POL)
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": "polygon-ecosystem-token",
        "vs_currencies": "usd,brl"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print(f"\n1. Testing with 'polygon-ecosystem-token' (ID correto)...")
        response = await client.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test with polygon
        print(f"\n2. Testing with 'polygon'...")
        params["ids"] = "polygon"
        response = await client.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test with pol
        print(f"\n3. Testing with 'pol'...")
        params["ids"] = "pol"
        response = await client.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

if __name__ == "__main__":
    asyncio.run(test_coingecko())
