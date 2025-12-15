"""
API v1 Batch Prices Endpoint
Centralizes price data fetching using the price aggregator with intelligent fallback.
Frontend consumes this endpoint instead of making direct requests.
"""

from fastapi import APIRouter, Query
from typing import List, Dict, Any
from datetime import datetime, timezone
import logging

from app.services.price_aggregator import price_aggregator

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/batch")
async def get_batch_prices(
    symbols: str = Query(
        ...,
        description="Comma-separated list of symbols (BTC,ETH,USDT,SOL,ADA,AVAX,MATIC,DOT)"
    ),
    fiat: str = Query("brl", description="Fiat currency (brl, usd, eur)"),
    refresh: bool = Query(False, description="Force refresh from source (ignore cache)")
):
    """
    Get current market prices for multiple cryptocurrencies.
    
    ✅ PUBLIC ENDPOINT - No authentication required
    
    Features:
    - Intelligent source fallback (CoinGecko → Binance)
    - Automatic caching (5 min TTL)
    - Support for multiple currencies (USD, BRL, EUR, etc)
    - Real-time price updates with source attribution
    
    Example:
        GET /api/v1/prices/batch?symbols=BTC,ETH,USDT&fiat=BRL&refresh=false
    """
    
    try:
        # Parse and validate symbols
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        
        if not symbol_list:
            return {
                "success": False,
                "error": "At least one symbol is required",
                "prices": {},
                "fiat": fiat.upper(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        if len(symbol_list) > 50:
            return {
                "success": False,
                "error": "Maximum 50 symbols allowed per request",
                "prices": {},
                "fiat": fiat.upper(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Get prices from aggregator
        price_data = await price_aggregator.get_prices(
            symbol_list,
            fiat,
            force_refresh=refresh
        )
        
        # Lista de stablecoins que sempre têm preço $1.00
        STABLECOINS = {"USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP"}
        
        # Para stablecoins que falharam, adicionar preço fixo $1.00
        if fiat.lower() == "usd":
            missing_symbols = set(symbol_list) - set(price_data.keys())
            stablecoin_missing = missing_symbols & STABLECOINS
            
            if stablecoin_missing:
                logger.info(f"Adding fixed $1.00 price for stablecoins: {stablecoin_missing}")
                from app.services.price_aggregator import PriceData
                
                for stablecoin in stablecoin_missing:
                    price_data[stablecoin] = PriceData(
                        symbol=stablecoin,
                        price=1.0,
                        change_24h=0.0,
                        market_cap=None,
                        volume_24h=None,
                        source="fixed",
                        timestamp=datetime.now(timezone.utc)
                    )
        
        if not price_data:
            logger.warning(f"No prices fetched for symbols: {symbol_list}")
            return {
                "success": False,
                "error": "Failed to fetch prices for requested symbols",
                "prices": {},
                "fiat": fiat.upper(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "symbols_count": 0
            }
        
        # Format response
        formatted_prices = {
            symbol: {
                "symbol": price.symbol,
                "price": price.price,
                "change_24h": price.change_24h,
                "market_cap": price.market_cap,
                "volume_24h": price.volume_24h,
                "source": price.source,
                "timestamp": price.timestamp.isoformat()
            }
            for symbol, price in price_data.items()
        }
        
        return {
            "success": True,
            "prices": formatted_prices,
            "fiat": fiat.upper(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "symbols_count": len(formatted_prices),
            "sources": list(set(p.source for p in price_data.values()))
        }
        
    except Exception as e:
        logger.error(f"Error in batch prices endpoint: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": f"Internal server error: {str(e)}",
            "prices": {},
            "fiat": fiat.upper(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/price/{symbol}")
async def get_single_price(
    symbol: str = "BTC",
    fiat: str = Query("brl", description="Fiat currency")
):
    """
    Get price for a single cryptocurrency symbol.
    
    Example:
        GET /api/v1/prices/price/BTC?fiat=BRL
    """
    try:
        price_data = await price_aggregator.get_single_price(symbol, fiat)
        
        # Lista de stablecoins que sempre têm preço $1.00
        STABLECOINS = {"USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP"}
        
        # Se não encontrou preço e é uma stablecoin em USD, retornar $1.00
        if not price_data and symbol.upper() in STABLECOINS and fiat.lower() == "usd":
            logger.info(f"Returning fixed $1.00 price for stablecoin {symbol}")
            from app.services.price_aggregator import PriceData
            
            price_data = PriceData(
                symbol=symbol.upper(),
                price=1.0,
                change_24h=0.0,
                market_cap=None,
                volume_24h=None,
                source="fixed",
                timestamp=datetime.now(timezone.utc)
            )
        
        if not price_data:
            return {
                "success": False,
                "error": f"Price not found for {symbol}",
                "fiat": fiat.upper(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "success": True,
            "symbol": price_data.symbol,
            "price": price_data.price,
            "change_24h": price_data.change_24h,
            "market_cap": price_data.market_cap,
            "volume_24h": price_data.volume_24h,
            "source": price_data.source,
            "fiat": fiat.upper(),
            "timestamp": price_data.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "symbol": symbol,
            "fiat": fiat.upper(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/supported")
async def get_supported_symbols():
    """
    Get list of supported cryptocurrency symbols.
    """
    from app.services.price_aggregator import CoinGeckoSource, BinanceSource
    
    symbols = set()
    symbols.update(CoinGeckoSource.SYMBOL_MAP.keys())
    symbols.update(BinanceSource.SYMBOL_MAP.keys())
    
    return {
        "success": True,
        "symbols": sorted(list(symbols)),
        "total": len(symbols),
        "sources": ["coingecko", "binance"]
    }
