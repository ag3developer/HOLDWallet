#!/usr/bin/env python3.9
"""
Test the symbol mapping directly
"""

# Test symbol_map directly
symbol_map = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'MATIC': 'polygon-ecosystem-token',
    'BNB': 'binancecoin', 'TRX': 'tron', 'BASE': 'base',
    'USDT': 'tether', 'SOL': 'solana', 'LTC': 'litecoin',
    'DOGE': 'dogecoin', 'ADA': 'cardano', 'AVAX': 'avalanche-2',
    'DOT': 'polkadot', 'LINK': 'chainlink', 'SHIB': 'shiba-inu',
    'XRP': 'ripple', 'USDC': 'usd-coin', 'DAI': 'dai',
}

def _parse_batch_symbols(symbols: str, symbol_map: dict):
    """Helper: Parse and validate symbols for batch request"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    if len(symbol_list) > 50:
        raise ValueError("Maximum 50 symbols allowed per request")
    if len(symbol_list) == 0:
        raise ValueError("At least one symbol required")
    
    coin_ids = []
    valid_symbols = []
    for symbol in symbol_list:
        coin_id = symbol_map.get(symbol)
        print(f"  {symbol}: {coin_id}")
        if coin_id:
            coin_ids.append(coin_id)
            valid_symbols.append(symbol)
    
    if not coin_ids:
        raise ValueError(f"No valid symbols found in: {symbols}")
    
    return valid_symbols, coin_ids

# Test
all_symbols = 'BTC,ETH,MATIC,BNB,TRX,SOL,USDT,USDC,DAI,LTC,DOGE,ADA,AVAX,DOT,LINK,SHIB,XRP'
valid_symbols, coin_ids = _parse_batch_symbols(all_symbols, symbol_map)

print(f"\nRequestedSymbols: {all_symbols}")
print(f"Valid symbols: {len(valid_symbols)} - {', '.join(valid_symbols)}")
print(f"Coin IDs: {len(coin_ids)} - {', '.join(coin_ids)}")

missing = set(all_symbols.split(',')) - set(valid_symbols)
if missing:
    print(f"\nMissing symbols: {', '.join(missing)}")
else:
    print("\nAll symbols mapped!")
