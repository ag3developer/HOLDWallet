from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.schemas.blockchain import PriceResponse, MultiPriceResponse
from app.services.price_service import price_service

router = APIRouter()

@router.get("/", response_model=MultiPriceResponse)
async def get_prices(
    symbols: str = Query(..., description="Comma-separated list of crypto symbols (e.g., 'btc,eth,matic')"),
    currencies: str = Query("usd,brl", description="Comma-separated list of currencies (e.g., 'usd,brl')")
):
    """Get current prices for multiple cryptocurrencies."""
    try:
        symbol_list = [s.strip().lower() for s in symbols.split(",")]
        currency_list = [c.strip().lower() for c in currencies.split(",")]
        
        if not symbol_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one symbol is required"
            )
        
        prices = await price_service.get_prices(symbol_list, currency_list)
        
        return MultiPriceResponse(
            prices=prices,
            last_updated=datetime.utcnow(),
            source="coingecko"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching prices: {str(e)}"
        )

@router.get("/{symbol}", response_model=dict)
async def get_price(
    symbol: str,
    currency: str = Query("usd", description="Currency code (usd, brl, eur, etc.)")
):
    """Get current price for a single cryptocurrency."""
    try:
        price = await price_service.get_price(symbol.lower(), currency.lower())
        
        if price is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Price not found for {symbol.upper()}/{currency.upper()}"
            )
        
        return {
            "symbol": symbol.upper(),
            "currency": currency.upper(), 
            "price": price,
            "last_updated": datetime.utcnow(),
            "source": "coingecko"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching price: {str(e)}"
        )

@router.get("/market/overview")
async def get_market_overview():
    """Get market overview with major cryptocurrencies."""
    try:
        major_cryptos = ["btc", "eth", "polygon", "bnb", "usdt", "usdc"]
        currencies = ["usd", "brl"]
        
        prices = await price_service.get_prices(major_cryptos, currencies)
        
        # Calculate total market overview
        total_market_cap_usd = 0
        total_volume_24h_usd = 0
        
        # This is a simplified calculation - in production you might want to 
        # fetch actual market data from a dedicated endpoint
        
        return {
            "prices": prices,
            "total_market_cap_usd": total_market_cap_usd,
            "total_volume_24h_usd": total_volume_24h_usd,
            "last_updated": datetime.utcnow(),
            "source": "coingecko"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching market overview: {str(e)}"
        )
