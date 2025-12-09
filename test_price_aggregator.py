#!/usr/bin/env python3
"""
Test script for Price Aggregator Service
Tests the price aggregation from multiple sources with fallback
"""

import asyncio
import sys
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from app.services.price_aggregator import price_aggregator, PriceAggregator


async def test_batch_prices():
    """Test fetching multiple prices at once"""
    print("\n" + "="*60)
    print("TEST 1: Batch Prices (BRL)")
    print("="*60)
    
    symbols = ['BTC', 'ETH', 'MATIC', 'BNB', 'USDT', 'SOL']
    currency = 'brl'
    
    print(f"📊 Fetching prices for: {', '.join(symbols)}")
    print(f"💱 Currency: {currency.upper()}")
    
    try:
        prices = await price_aggregator.get_prices(symbols, currency)
        
        if prices:
            print(f"\n✅ Successfully fetched {len(prices)} prices:\n")
            for symbol, price_data in sorted(prices.items()):
                print(f"  {symbol:6} | R$ {price_data.price:15,.2f} | "
                      f"Change: {price_data.change_24h:+.2f}% | "
                      f"Source: {price_data.source}")
        else:
            print("❌ No prices fetched")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def test_single_price():
    """Test fetching single price"""
    print("\n" + "="*60)
    print("TEST 2: Single Price (USD)")
    print("="*60)
    
    symbol = 'BTC'
    currency = 'usd'
    
    print(f"📊 Fetching price for: {symbol}")
    print(f"💱 Currency: {currency.upper()}")
    
    try:
        price = await price_aggregator.get_single_price(symbol, currency)
        
        if price:
            print("\n✅ Price fetched successfully:")
            print(f"  {symbol} | ${price.price:,.2f}")
            print(f"  Change (24h): {price.change_24h:+.2f}%")
            print(f"  Source: {price.source}")
            print(f"  Timestamp: {price.timestamp.isoformat()}")
        else:
            print(f"❌ Could not fetch price for {symbol}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def test_cache():
    """Test caching behavior"""
    print("\n" + "="*60)
    print("TEST 3: Cache Behavior")
    print("="*60)
    
    symbols = ['BTC', 'ETH']
    currency = 'usd'
    
    print(f"📊 Testing cache for symbols: {', '.join(symbols)}")
    
    try:
        # First request (cache miss)
        print("\n1️⃣  First request (cache miss)...")
        start1 = datetime.now(timezone.utc)
        prices1 = await price_aggregator.get_prices(symbols, currency)
        time1 = (datetime.now(timezone.utc) - start1).total_seconds()
        
        if prices1:
            print(f"   ✅ Fetched {len(prices1)} prices in {time1:.2f}s")
        
        # Second request (cache hit)
        print("\n2️⃣  Second request (should be cached)...")
        start2 = datetime.now(timezone.utc)
        prices2 = await price_aggregator.get_prices(symbols, currency)
        time2 = (datetime.now(timezone.utc) - start2).total_seconds()
        
        if prices2:
            print(f"   ✅ Fetched {len(prices2)} prices in {time2:.2f}s")
            print(f"\n   ⏱️  Performance improvement: {time1/time2:.1f}x faster (cache hit)")
        
        # Force refresh
        print("\n3️⃣  Force refresh (ignore cache)...")
        start3 = datetime.now(timezone.utc)
        prices3 = await price_aggregator.get_prices(symbols, currency, force_refresh=True)
        time3 = (datetime.now(timezone.utc) - start3).total_seconds()
        
        if prices3:
            print(f"   ✅ Fetched {len(prices3)} prices in {time3:.2f}s")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def test_different_currencies():
    """Test different currency support"""
    print("\n" + "="*60)
    print("TEST 4: Multiple Currencies")
    print("="*60)
    
    symbols = ['BTC', 'ETH']
    currencies = ['usd', 'brl', 'eur']
    
    print(f"📊 Fetching prices for: {', '.join(symbols)}")
    print(f"💱 Currencies: {', '.join([c.upper() for c in currencies])}")
    
    try:
        for currency in currencies:
            print(f"\n  {currency.upper()}:")
            prices = await price_aggregator.get_prices(symbols, currency)
            
            if prices:
                for symbol, price_data in sorted(prices.items()):
                    print(f"    {symbol}: {price_data.price:,.2f} ({price_data.source})")
            else:
                print("    ❌ No prices fetched")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def test_fallback():
    """Test fallback mechanism"""
    print("\n" + "="*60)
    print("TEST 5: Source Fallback Analysis")
    print("="*60)
    
    symbols = ['BTC', 'ETH', 'MATIC']
    currency = 'usd'
    
    print(f"📊 Testing fallback for: {', '.join(symbols)}")
    print(f"💱 Currency: {currency.upper()}")
    
    try:
        prices = await price_aggregator.get_prices(symbols, currency)
        
        if prices:
            print(f"\n✅ Fetched {len(prices)} prices")
            
            sources = {}
            for symbol, price_data in prices.items():
                source = price_data.source
                if source not in sources:
                    sources[source] = []
                sources[source].append(symbol)
            
            print("\n  Source distribution:")
            for source, syms in sources.items():
                print(f"    {source.upper()}: {', '.join(syms)}")
        else:
            print("❌ No prices fetched")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


async def main():
    """Run all tests"""
    print("\n" + "🎯 " + "="*56)
    print("   PRICE AGGREGATOR SERVICE - TEST SUITE")
    print("=" * 60)
    
    try:
        await test_batch_prices()
        await asyncio.sleep(1)
        
        await test_single_price()
        await asyncio.sleep(1)
        
        await test_cache()
        await asyncio.sleep(1)
        
        await test_different_currencies()
        await asyncio.sleep(1)
        
        await test_fallback()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
