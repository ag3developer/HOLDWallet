from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import ValidationError, ExternalServiceError
from app.models.user import User
from app.models.price_cache import PriceCache
from app.services.price_service import PriceService
from app.schemas.price import (
    PriceResponse, PriceHistoryResponse, SupportedAssetsResponse,
    PriceAlertRequest, PriceAlertResponse
)

router = APIRouter()

@router.get("/current", response_model=List[PriceResponse])
async def get_current_prices(
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g., bitcoin,ethereum)"),
    vs_currency: str = Query("usd", description="Currency to get prices in"),
    db: Session = Depends(get_db)
):
    """
    Get current prices for specified cryptocurrencies.
    """
    price_service = PriceService(db)
    
    # Parse symbols
    symbol_list = [symbol.strip().lower() for symbol in symbols.split(",")]
    
    if len(symbol_list) > 50:
        raise ValidationError("Maximum 50 symbols allowed per request")
    
    try:
        prices_data = await price_service.get_current_prices(symbol_list, vs_currency)
        
        price_responses = []
        for symbol, data in prices_data.items():
            price_responses.append(PriceResponse(
                symbol=symbol,
                name=data.get('name', symbol.title()),
                current_price=data['current_price'],
                market_cap=data.get('market_cap'),
                market_cap_rank=data.get('market_cap_rank'),
                volume_24h=data.get('total_volume'),
                price_change_24h=data.get('price_change_24h'),
                price_change_percentage_24h=data.get('price_change_percentage_24h'),
                price_change_percentage_7d=data.get('price_change_percentage_7d'),
                price_change_percentage_30d=data.get('price_change_percentage_30d'),
                last_updated=data.get('last_updated'),
                vs_currency=vs_currency
            ))
        
        return price_responses
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to fetch prices: {str(e)}")

@router.get("/history/{symbol}", response_model=PriceHistoryResponse)
async def get_price_history(
    symbol: str,
    vs_currency: str = Query("usd", description="Currency to get prices in"),
    days: int = Query(7, ge=1, le=365, description="Number of days of history"),
    interval: str = Query("daily", description="Data interval: hourly, daily"),
    db: Session = Depends(get_db)
):
    """
    Get price history for a specific cryptocurrency.
    """
    price_service = PriceService(db)
    
    try:
        history_data = await price_service.get_price_history(
            symbol.lower(),
            vs_currency,
            days,
            interval
        )
        
        return PriceHistoryResponse(
            symbol=symbol.lower(),
            vs_currency=vs_currency,
            days=days,
            interval=interval,
            prices=history_data['prices'],
            market_caps=history_data.get('market_caps', []),
            total_volumes=history_data.get('total_volumes', [])
        )
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to fetch price history: {str(e)}")


@router.get("/ohlc/{symbol}")
async def get_ohlc_data(
    symbol: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of OHLC data"),
    db: Session = Depends(get_db)
):
    """
    Get OHLC (Open, High, Low, Close) candlestick data for a cryptocurrency.
    Uses CoinGecko's OHLC endpoint.
    
    Returns: List of [timestamp, open, high, low, close] arrays
    """
    price_service = PriceService(db)
    
    try:
        ohlc_data = await price_service.get_ohlc_data(symbol.lower(), days)
        return ohlc_data
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to fetch OHLC data: {str(e)}")


@router.get("/supported", response_model=SupportedAssetsResponse)
async def get_supported_assets(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(100, ge=1, le=250, description="Results per page"),
    db: Session = Depends(get_db)
):
    """
    Get list of supported cryptocurrencies.
    """
    price_service = PriceService(db)
    
    try:
        assets_data = await price_service.get_supported_assets(page, per_page)
        
        return SupportedAssetsResponse(
            assets=assets_data['coins'],
            total_count=len(assets_data['coins']),
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to fetch supported assets: {str(e)}")

@router.get("/trending")
async def get_trending_coins(
    limit: int = Query(10, ge=1, le=50, description="Number of trending coins"),
    db: Session = Depends(get_db)
):
    """
    Get trending cryptocurrencies.
    """
    price_service = PriceService(db)
    
    try:
        trending_data = await price_service.get_trending_coins(limit)
        
        return {
            "trending_coins": trending_data,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to fetch trending coins: {str(e)}")

@router.get("/search")
async def search_cryptocurrencies(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Search for cryptocurrencies by name or symbol.
    """
    price_service = PriceService(db)
    
    try:
        search_results = await price_service.search_assets(query, limit)
        
        return {
            "query": query,
            "results": search_results,
            "count": len(search_results)
        }
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to search cryptocurrencies: {str(e)}")

@router.get("/cache/stats")
async def get_cache_statistics(
    db: Session = Depends(get_db)
):
    """
    Get price cache statistics and health information.
    """
    # Count cache entries by status
    total_entries = db.query(PriceCache).count()
    
    # Recent entries (last hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_entries = db.query(PriceCache).filter(
        PriceCache.updated_at >= one_hour_ago
    ).count()
    
    # Stale entries (older than 1 hour)
    stale_entries = total_entries - recent_entries
    
    # Most requested assets
    popular_assets = db.query(PriceCache.symbol).group_by(PriceCache.symbol).limit(10).all()
    
    return {
        "total_cached_entries": total_entries,
        "recent_entries": recent_entries,
        "stale_entries": stale_entries,
        "cache_hit_ratio": f"{(recent_entries / max(total_entries, 1)) * 100:.1f}%",
        "popular_assets": [asset[0] for asset in popular_assets],
        "last_updated": datetime.utcnow().isoformat()
    }

@router.post("/alerts", response_model=PriceAlertResponse)
async def create_price_alert(
    alert_data: PriceAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a price alert for a cryptocurrency.
    Note: This is a placeholder - actual alerting would require background workers.
    """
    # This is a placeholder implementation
    # In a production system, you would:
    # 1. Store the alert in a database
    # 2. Set up background workers to monitor prices
    # 3. Send notifications when conditions are met
    
    return PriceAlertResponse(
        id="placeholder-alert-id",
        symbol=alert_data.symbol,
        target_price=alert_data.target_price,
        condition=alert_data.condition,
        is_active=True,
        created_at=datetime.utcnow(),
        message="Price alert created successfully (feature in development)"
    )

@router.get("/alerts")
async def get_price_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's price alerts.
    """
    # Placeholder - would fetch from alerts table
    return {
        "alerts": [],
        "message": "Price alerts feature is in development"
    }

@router.delete("/cache/clear")
async def clear_price_cache(
    db: Session = Depends(get_db)
):
    """
    Clear old price cache entries.
    """
    # Delete entries older than 24 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    deleted_count = db.query(PriceCache).filter(
        PriceCache.updated_at < cutoff_time
    ).delete()
    
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} old cache entries",
        "deleted_count": deleted_count,
        "cutoff_time": cutoff_time.isoformat()
    }

@router.get("/portfolio")
async def get_portfolio_value(
    current_user: User = Depends(get_current_user),
    vs_currency: str = Query("usd", description="Currency for portfolio value"),
    db: Session = Depends(get_db)
):
    """
    Calculate total portfolio value across all user wallets.
    This is a simplified version - would need actual balance and asset tracking.
    """
    # Placeholder implementation
    # In reality, this would:
    # 1. Get all user's wallet addresses
    # 2. Fetch current balances for each address
    # 3. Get current prices for each asset
    # 4. Calculate total portfolio value
    
    return {
        "user_id": str(current_user.id),
        "total_value": "0.00",
        "vs_currency": vs_currency,
        "assets": [],
        "last_updated": datetime.utcnow().isoformat(),
        "message": "Portfolio tracking feature is in development"
    }

@router.get("/convert")
async def convert_amount(
    amount: float = Query(..., gt=0, description="Amount to convert"),
    from_symbol: str = Query(..., description="Source cryptocurrency symbol"),
    to_symbol: str = Query(..., description="Target symbol or currency"),
    db: Session = Depends(get_db)
):
    """
    Convert amount from one cryptocurrency to another or to fiat.
    """
    price_service = PriceService(db)
    
    try:
        # Get current prices for both symbols
        symbols = [from_symbol.lower(), to_symbol.lower()]
        prices_data = await price_service.get_current_prices(symbols, "usd")
        
        if from_symbol.lower() not in prices_data:
            raise ValidationError(f"Price not found for {from_symbol}")
        
        if to_symbol.lower() not in prices_data:
            raise ValidationError(f"Price not found for {to_symbol}")
        
        from_price = prices_data[from_symbol.lower()]['current_price']
        to_price = prices_data[to_symbol.lower()]['current_price']
        
        # Calculate conversion
        from_usd_value = amount * from_price
        converted_amount = from_usd_value / to_price
        
        return {
            "amount": amount,
            "from_symbol": from_symbol.upper(),
            "to_symbol": to_symbol.upper(),
            "converted_amount": converted_amount,
            "from_price_usd": from_price,
            "to_price_usd": to_price,
            "conversion_rate": converted_amount / amount,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise ExternalServiceError(f"Failed to convert amount: {str(e)}")
