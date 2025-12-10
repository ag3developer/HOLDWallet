#!/usr/bin/env python3.9
"""
Test CoinGecko response parsing
"""
import httpx
import asyncio

coin_ids = ['bitcoin', 'ethereum', 'polygon-ecosystem-token', 'binancecoin', 'tron', 'solana', 'tether', 'usd-coin', 'dai', 'litecoin', 'dogecoin', 'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'shiba-inu', 'ripple']
valid_symbols = ['BTC', 'ETH', 'MATIC', 'BNB', 'TRX', 'SOL', 'USDT', 'USDC', 'DAI', 'LTC', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'SHIB', 'XRP']
fiat = 'brl'

async def test():
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": ",".join(coin_ids),
            "vs_currencies": fiat.lower(),
            "include_market_cap": "true",
            "include_24hr_vol": "true",
            "include_24hr_change": "true"
        }
        
        print(f"Request params: ids={params['ids'][:50]}...")
        response = await client.get(url, params=params)
        print(f"Status: {response.status_code}")
        
        data = response.json()
        print(f"\nCoinGecko response keys: {list(data.keys())}")
        print(f"Response size: {len(data)} coins")
        
        # Test parsing
        prices_result = {}
        fiat_lower = fiat.lower()
        
        for symbol, coin_id in zip(valid_symbols, coin_ids):
            coin_data = data.get(coin_id, {})
            print(f"\n{symbol} ({coin_id}):")
            print(f"  coin_data: {coin_data}")
            print(f"  has '{fiat_lower}' key: {fiat_lower in coin_data}")
            
            if fiat_lower in coin_data:
                price = coin_data.get(fiat_lower, 0)
                prices_result[symbol] = {
                    "symbol": symbol,
                    "price": float(price),
                    "change_24h": coin_data.get(f"{fiat_lower}_24h_change", 0),
                }
                print(f"  ✅ ADDED to prices_result")
            else:
                print(f"  ❌ SKIPPED (no price data)")
        
        print(f"\n\nFinal prices_result: {len(prices_result)} coins")
        print(f"Symbols: {', '.join(sorted(prices_result.keys()))}")

asyncio.run(test())
