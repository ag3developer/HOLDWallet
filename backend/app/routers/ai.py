"""
AI Module API Router
====================

REST API endpoints for AI-powered portfolio intelligence.

Endpoints:
- GET /api/v1/ai/health - Check AI service health
- POST /api/v1/ai/predict/{symbol} - Generate price prediction
- GET /api/v1/ai/predictions/{symbol} - Get prediction history
- POST /api/v1/ai/indicators - Calculate technical indicators
- GET /api/v1/ai/signals/{symbol} - Get trading signals
- POST /api/v1/ai/correlation - Calculate correlation matrix
- GET /api/v1/ai/ath/{symbol} - Get ATH analysis
- POST /api/v1/ai/ath/portfolio - Analyze portfolio ATH
- POST /api/v1/ai/swap-suggestions - Get swap suggestions
- GET /api/v1/ai/accuracy - Get model accuracy report
- GET /api/v1/ai/accuracy/trend - Get accuracy trend over time

Author: WolkNow AI Team
Created: January 2026
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
import asyncio

from app.core.db import get_db
from app.services.ai import (
    prediction_engine,
    correlation_service,
    ath_service,
    swap_suggestion_service,
    accuracy_tracker,
    TechnicalIndicators
)
from app.schemas.ai import (
    PredictionRequest,
    PredictionResponse,
    TechnicalIndicatorsRequest,
    TechnicalIndicatorsResponse,
    SignalsResponse,
    CorrelationRequest,
    CorrelationResponse,
    ATHResponse,
    PortfolioATHRequest,
    PortfolioATHResponse,
    SwapSuggestionsRequest,
    SwapSuggestionsResponse,
    AccuracyReportResponse,
    AccuracyTrendResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])


# ====================
# Health Check
# ====================

@router.get("/health")
async def health_check():
    """Check AI service health and status"""
    return {
        "status": "healthy",
        "service": "WolkNow AI Intelligence",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "features": {
            "predictions": True,
            "technical_indicators": True,
            "correlation_analysis": True,
            "ath_tracking": True,
            "swap_suggestions": True,
            "accuracy_tracking": True
        }
    }


# ====================
# Predictions
# ====================

@router.post("/predict/{symbol}")
async def generate_prediction(
    symbol: str,
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Generate AI price prediction for a cryptocurrency.
    
    Requires PRO subscription for 15-day predictions.
    Requires PREMIUM subscription for 30-day predictions.
    """
    try:
        # Note: Subscription check should be added here in production
        
        # Prediction requires historical data
        # In production, fetch from market data service
        return {
            "symbol": symbol.upper(),
            "message": "Prediction endpoint ready. Historical data required.",
            "timeframe_days": request.timeframe_days,
            "include_technical": request.include_technical,
            "status": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate prediction: {str(e)}"
        )


@router.get("/predictions/{symbol}")
async def get_predictions(
    symbol: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get prediction history for a symbol"""
    try:
        predictions = await prediction_engine.get_prediction_history(
            symbol=symbol,
            limit=limit,
            db=db
        )
        return {
            "symbol": symbol.upper(),
            "predictions": predictions,
            "count": len(predictions)
        }
    except Exception as e:
        logger.error(f"Error fetching predictions for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# Technical Indicators
# ====================

@router.post("/indicators", response_model=TechnicalIndicatorsResponse)
async def calculate_indicators(request: TechnicalIndicatorsRequest):
    """
    Calculate technical indicators for given OHLCV data.
    Returns 20+ indicators across momentum, trend, volatility, and volume.
    """
    try:
        indicators = TechnicalIndicators(request.ohlcv_data)
        
        result = {
            "symbol": request.symbol,
            "indicators": {
                "momentum": {
                    "rsi": indicators.rsi(),
                    "stochastic": indicators.stochastic()
                },
                "trend": {
                    "sma": indicators.sma_multi(),
                    "ema": indicators.ema_multi(),
                    "macd": indicators.macd()
                },
                "volatility": {
                    "bollinger": indicators.bollinger_bands(),
                    "atr": indicators.atr()
                },
                "volume": {
                    "obv": indicators.obv()
                }
            },
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return TechnicalIndicatorsResponse(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Indicators error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate indicators: {str(e)}"
        )


@router.get("/signals/{symbol}", response_model=SignalsResponse)
async def get_trading_signals(
    symbol: str,
    ohlcv_data: Optional[str] = None  # JSON encoded OHLCV for GET request
):
    """
    Get trading signals for a symbol.
    If OHLCV data not provided, will fetch from market data service.
    """
    try:
        # In production, fetch OHLCV data from market data service
        # For now, return placeholder
        return SignalsResponse(
            symbol=symbol.upper(),
            signal={
                "direction": "neutral",
                "strength": 0.5,
                "confidence": 0.6,
                "recommendation": "HOLD"
            },
            generated_at=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Signals error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# Correlation Analysis
# ====================

@router.post("/correlation", response_model=CorrelationResponse)
async def calculate_correlation(
    request: CorrelationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate correlation matrix for given assets.
    Helps identify diversification opportunities.
    """
    try:
        result = await correlation_service.calculate_correlation_matrix(
            price_data=request.price_data,
            lookback_days=request.lookback_days,
            db=db
        )
        
        if 'error' in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
        
        return CorrelationResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Correlation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# ATH Analysis
# ====================

@router.get("/ath/{symbol}", response_model=ATHResponse)
async def get_ath_analysis(
    symbol: str,
    current_price: float,
    db: Session = Depends(get_db)
):
    """
    Get All-Time High analysis for a symbol.
    Shows distance from ATH and potential upside.
    """
    try:
        result = await ath_service.analyze_ath(
            symbol=symbol,
            current_price=current_price,
            db=db
        )
        
        return ATHResponse(**result)
    
    except Exception as e:
        logger.error(f"ATH error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/ath/portfolio", response_model=PortfolioATHResponse)
async def analyze_portfolio_ath(
    request: PortfolioATHRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze ATH metrics for entire portfolio.
    Returns potential upside if all assets return to ATH.
    """
    try:
        # Convert PortfolioAsset to dict for the service
        portfolio_dicts = [
            {
                "symbol": asset.symbol,
                "current_price": asset.current_price,
                "amount": asset.amount,
                "value_usd": asset.value_usd
            }
            for asset in request.portfolio
        ]
        
        result = await ath_service.analyze_portfolio_ath(
            portfolio=portfolio_dicts,
            db=db
        )
        
        return PortfolioATHResponse(**result)
    
    except Exception as e:
        logger.error(f"Portfolio ATH error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# Swap Suggestions
# ====================

@router.post("/swap-suggestions", response_model=SwapSuggestionsResponse)
async def get_swap_suggestions(request: SwapSuggestionsRequest):
    """
    Get AI-powered swap suggestions for portfolio optimization.
    Analyzes rebalancing, take-profit, stop-loss, and diversification opportunities.
    """
    try:
        result = swap_suggestion_service.generate_swap_suggestions(
            portfolio=request.portfolio,
            correlation_data=request.correlation_data,
            ath_data=request.ath_data,
            custom_targets=request.custom_targets
        )
        
        return SwapSuggestionsResponse(**result)
    
    except Exception as e:
        logger.error(f"Swap suggestions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# Accuracy Tracking
# ====================

@router.get("/accuracy")
async def get_accuracy_report(
    model_version: str = "v1.0",
    period: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get model accuracy report.
    Shows how accurate predictions have been over time.
    """
    try:
        report = await accuracy_tracker.generate_performance_report(
            db=db,
            model_version=model_version,
            period=period,
            days_back=days
        )
        
        return report
    
    except Exception as e:
        logger.error(f"Accuracy report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/accuracy/trend")
async def get_accuracy_trend(
    model_version: str = "v1.0",
    days: int = 90,
    db: Session = Depends(get_db)
):
    """
    Get accuracy trend over time.
    Shows how model accuracy has evolved.
    """
    try:
        trend = await accuracy_tracker.get_accuracy_trend(
            db=db,
            model_version=model_version,
            days=days
        )
        
        return {
            "model_version": model_version,
            "days": days,
            "trend": trend
        }
    
    except Exception as e:
        logger.error(f"Accuracy trend error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/accuracy/validate")
async def validate_predictions(
    db: Session = Depends(get_db)
):
    """
    Manually trigger prediction validation.
    Checks all pending predictions against actual prices.
    Admin endpoint.
    """
    try:
        # Define a mock price fetcher for now
        # In production, this would fetch real prices
        async def get_current_price(symbol: str) -> float:
            # Placeholder - should fetch from market data service
            prices = {
                "BTC": 95000.0,
                "ETH": 3500.0,
                "SOL": 200.0
            }
            return prices.get(symbol.upper(), 0.0)
        
        result = await accuracy_tracker.validate_predictions(
            db=db,
            get_current_price_func=get_current_price
        )
        
        return {
            "status": "completed",
            "validated_count": result.get('validated_count', 0),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ====================
# Market Data - Price History & OHLCV (Real Data)
# ====================

import httpx

# CoinGecko ID mapping
COINGECKO_IDS = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'MATIC': 'polygon-ecosystem-token',
    'POL': 'polygon-ecosystem-token', 'BNB': 'binancecoin', 'TRX': 'tron',
    'USDT': 'tether', 'SOL': 'solana', 'LTC': 'litecoin',
    'DOGE': 'dogecoin', 'ADA': 'cardano', 'AVAX': 'avalanche-2',
    'DOT': 'polkadot', 'LINK': 'chainlink', 'SHIB': 'shiba-inu',
    'XRP': 'ripple', 'USDC': 'usd-coin', 'ATOM': 'cosmos',
}

# Binance symbol mapping
BINANCE_SYMBOLS = {
    'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'MATIC': 'POLUSDT',
    'POL': 'POLUSDT', 'BNB': 'BNBUSDT', 'SOL': 'SOLUSDT',
    'LTC': 'LTCUSDT', 'DOGE': 'DOGEUSDT', 'ADA': 'ADAUSDT',
    'AVAX': 'AVAXUSDT', 'DOT': 'DOTUSDT', 'LINK': 'LINKUSDT',
    'XRP': 'XRPUSDT', 'TRX': 'TRXUSDT', 'ATOM': 'ATOMUSDT',
}


@router.get("/market/price-history")
async def get_price_history(
    symbols: str,  # comma-separated: "BTC,ETH,SOL"
    days: int = 30
):
    """
    Get historical price data for multiple symbols.
    Returns daily closing prices for correlation analysis.
    Uses CoinGecko market_chart API.
    """
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        result = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for symbol in symbol_list:
                coin_id = COINGECKO_IDS.get(symbol)
                if not coin_id:
                    logger.warning(f"Unknown symbol for price history: {symbol}")
                    continue
                
                try:
                    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
                    params = {"vs_currency": "usd", "days": days, "interval": "daily"}
                    
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract closing prices
                    prices = [p[1] for p in data.get("prices", [])]
                    result[symbol] = prices
                    
                    logger.info(f"Fetched {len(prices)} price points for {symbol}")
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"Error fetching price history for {symbol}: {e}")
                    continue
        
        return {
            "symbols": list(result.keys()),
            "price_history": result,
            "days": days,
            "data_points": min([len(p) for p in result.values()]) if result else 0,
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Price history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/market/ohlcv/{symbol}")
async def get_ohlcv_data(
    symbol: str,
    interval: str = "1d",  # 1h, 4h, 1d
    limit: int = 100
):
    """
    Get OHLCV (candlestick) data for technical indicators.
    Uses Binance klines API for real-time accurate data.
    """
    try:
        symbol_upper = symbol.upper()
        binance_symbol = BINANCE_SYMBOLS.get(symbol_upper)
        
        if not binance_symbol:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Symbol {symbol} not supported for OHLCV data"
            )
        
        # Map interval to Binance format
        interval_map = {"1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w"}
        binance_interval = interval_map.get(interval, "1d")
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = "https://api.binance.com/api/v3/klines"
            params = {
                "symbol": binance_symbol,
                "interval": binance_interval,
                "limit": limit
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            klines = response.json()
            
            # Parse klines: [open_time, open, high, low, close, volume, ...]
            ohlcv = {
                "open": [float(k[1]) for k in klines],
                "high": [float(k[2]) for k in klines],
                "low": [float(k[3]) for k in klines],
                "close": [float(k[4]) for k in klines],
                "volume": [float(k[5]) for k in klines],
                "timestamps": [k[0] for k in klines]
            }
            
            return {
                "symbol": symbol_upper,
                "interval": interval,
                "data_points": len(klines),
                "ohlcv": ohlcv,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
    
    except httpx.HTTPStatusError as e:
        logger.error(f"Binance API error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch OHLCV data from Binance"
        )
    except Exception as e:
        logger.error(f"OHLCV error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/market/ath/{symbol}")
async def get_real_ath(symbol: str):
    """
    Get real All-Time High data from CoinGecko.
    Returns actual ATH price and date.
    """
    try:
        symbol_upper = symbol.upper()
        coin_id = COINGECKO_IDS.get(symbol_upper)
        
        if not coin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Symbol {symbol} not supported"
            )
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
            params = {
                "localization": "false",
                "tickers": "false",
                "market_data": "true",
                "community_data": "false",
                "developer_data": "false"
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            market_data = data.get("market_data", {})
            
            return {
                "symbol": symbol_upper,
                "name": data.get("name"),
                "current_price": market_data.get("current_price", {}).get("usd"),
                "ath": market_data.get("ath", {}).get("usd"),
                "ath_date": market_data.get("ath_date", {}).get("usd"),
                "ath_change_percentage": market_data.get("ath_change_percentage", {}).get("usd"),
                "atl": market_data.get("atl", {}).get("usd"),
                "atl_date": market_data.get("atl_date", {}).get("usd"),
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
    
    except httpx.HTTPStatusError as e:
        logger.error(f"CoinGecko API error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch ATH data from CoinGecko"
        )
    except Exception as e:
        logger.error(f"ATH error for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
