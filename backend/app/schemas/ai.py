"""
AI Module Pydantic Schemas
==========================

Request and Response models for AI API endpoints.

Author: WolkNow AI Team
Created: January 2026
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ====================
# Enums
# ====================

class PredictionTimeframe(int, Enum):
    """Supported prediction timeframes"""
    SEVEN_DAYS = 7
    FIFTEEN_DAYS = 15
    THIRTY_DAYS = 30


class SignalDirection(str, Enum):
    """Signal direction enum"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class TrendZone(str, Enum):
    """ATH zone classification"""
    ATH_ZONE = "ATH_ZONE"
    STRONG = "STRONG"
    RECOVERING = "RECOVERING"
    WEAK = "WEAK"
    CAPITULATION = "CAPITULATION"


class SwapReason(str, Enum):
    """Reasons for swap suggestions"""
    REBALANCING = "rebalancing"
    TAKE_PROFIT = "take_profit"
    STOP_LOSS = "stop_loss"
    DIVERSIFICATION = "diversification"
    CORRELATION_REDUCTION = "correlation_reduction"
    MOMENTUM = "momentum"


# ====================
# Prediction Schemas
# ====================

class PredictionRequest(BaseModel):
    """Request model for price prediction"""
    timeframe_days: int = Field(
        default=7,
        ge=7,
        le=30,
        description="Prediction timeframe: 7, 15, or 30 days"
    )
    include_technical: bool = Field(
        default=True,
        description="Include technical indicators in prediction"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "timeframe_days": 7,
                "include_technical": True
            }
        }


class PredictionDataPoint(BaseModel):
    """Single prediction data point"""
    date: str
    predicted_price: float
    confidence_lower: float
    confidence_upper: float


class PredictionResponse(BaseModel):
    """Response model for price prediction"""
    symbol: str
    current_price: float
    predictions: List[PredictionDataPoint]
    summary: Dict[str, Any]
    technical_factors: Optional[Dict[str, Any]] = None
    model_version: str = "prophet-1.0"
    generated_at: str


# ====================
# Technical Indicators Schemas
# ====================

class OHLCVData(BaseModel):
    """OHLCV data structure"""
    open: List[float]
    high: List[float]
    low: List[float]
    close: List[float]
    volume: List[float]


class TechnicalIndicatorsRequest(BaseModel):
    """Request model for technical indicators"""
    symbol: str
    ohlcv_data: Dict[str, List[float]] = Field(
        ...,
        description="OHLCV data with keys: open, high, low, close, volume"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTC",
                "ohlcv_data": {
                    "open": [45000, 45200, 45100],
                    "high": [45500, 45800, 45600],
                    "low": [44800, 45000, 44900],
                    "close": [45300, 45600, 45400],
                    "volume": [1000000, 1200000, 1100000]
                }
            }
        }


class TechnicalIndicatorsResponse(BaseModel):
    """Response model for technical indicators"""
    symbol: str
    indicators: Dict[str, Any]
    calculated_at: str


class SignalData(BaseModel):
    """Trading signal data"""
    direction: SignalDirection
    strength: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    recommendation: str


class SignalsResponse(BaseModel):
    """Response model for trading signals"""
    symbol: str
    signal: Dict[str, Any]
    generated_at: str


# ====================
# Correlation Schemas
# ====================

class CorrelationRequest(BaseModel):
    """Request model for correlation calculation"""
    price_data: Dict[str, List[float]] = Field(
        ...,
        description="Dict with symbol as key and price history as value"
    )
    lookback_days: int = Field(
        default=30,
        ge=7,
        le=365,
        description="Number of days for correlation calculation"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "price_data": {
                    "BTC": [45000, 45200, 45100, 45300],
                    "ETH": [3200, 3250, 3180, 3220]
                },
                "lookback_days": 30
            }
        }


class CorrelationPair(BaseModel):
    """High/low correlation pair"""
    pair: List[str]
    correlation: float


class CorrelationInsight(BaseModel):
    """Correlation insight"""
    type: str
    title: str
    message: str
    severity: str


class CorrelationResponse(BaseModel):
    """Response model for correlation matrix"""
    symbols: List[str]
    matrix: Dict[str, Dict[str, float]]
    high_correlations: List[CorrelationPair]
    low_correlations: List[CorrelationPair]
    insights: List[CorrelationInsight]
    lookback_days: int
    data_points: int
    calculated_at: str


# ====================
# ATH Schemas
# ====================

class ATHInsight(BaseModel):
    """ATH insight"""
    type: str
    message: str


class ATHResponse(BaseModel):
    """Response model for ATH analysis"""
    symbol: str
    current_price: float
    ath_price: Optional[float] = None
    ath_date: Optional[str] = None
    distance_from_ath_percent: Optional[float] = None
    potential_upside_percent: Optional[float] = None
    recovery_percent: Optional[float] = None
    zone: Optional[str] = None
    zone_color: Optional[str] = None
    days_since_ath: Optional[int] = None
    at_ath: Optional[bool] = None
    ath_known: bool = True
    message: Optional[str] = None
    insights: List[ATHInsight] = []


class PortfolioAsset(BaseModel):
    """Portfolio asset for ATH analysis"""
    symbol: str
    current_price: float
    amount: float = 0
    value_usd: Optional[float] = None


class PortfolioATHRequest(BaseModel):
    """Request model for portfolio ATH analysis"""
    portfolio: List[PortfolioAsset]
    
    class Config:
        json_schema_extra = {
            "example": {
                "portfolio": [
                    {"symbol": "BTC", "current_price": 45000, "amount": 0.5, "value_usd": 22500},
                    {"symbol": "ETH", "current_price": 3200, "amount": 5, "value_usd": 16000}
                ]
            }
        }


class PortfolioSummary(BaseModel):
    """Portfolio ATH summary"""
    total_current_value: float
    total_potential_at_ath: float
    portfolio_potential_upside_percent: float


class PortfolioATHResponse(BaseModel):
    """Response model for portfolio ATH analysis"""
    assets: List[Dict[str, Any]]
    portfolio_summary: PortfolioSummary
    best_opportunities: List[Dict[str, Any]]
    analyzed_at: str


# ====================
# Swap Suggestions Schemas
# ====================

class SwapPortfolioAsset(BaseModel):
    """Portfolio asset for swap suggestions"""
    symbol: str
    amount: float
    current_price: float
    value_usd: float
    cost_basis: Optional[float] = None


class SwapSuggestionsRequest(BaseModel):
    """Request model for swap suggestions"""
    portfolio: List[Dict[str, Any]]
    correlation_data: Optional[Dict[str, Any]] = None
    ath_data: Optional[Dict[str, Any]] = None
    custom_targets: Optional[Dict[str, float]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "portfolio": [
                    {"symbol": "BTC", "amount": 0.5, "current_price": 45000, "value_usd": 22500, "cost_basis": 30000},
                    {"symbol": "ETH", "amount": 5, "current_price": 3200, "value_usd": 16000, "cost_basis": 2000}
                ],
                "custom_targets": {
                    "BTC": 0.40,
                    "ETH": 0.25
                }
            }
        }


class SwapSuggestion(BaseModel):
    """Single swap suggestion"""
    id: str
    type: str
    reason: SwapReason
    from_symbol: str
    to_symbol: str
    suggested_amount_usd: float
    priority: int
    message: str
    impact: str


class SwapSummary(BaseModel):
    """Swap suggestions summary"""
    total_suggestions: int
    high_priority_count: int
    medium_priority_count: int
    total_suggested_swap_value: float
    portfolio_balance_score: float
    health_status: str


class SwapSuggestionsResponse(BaseModel):
    """Response model for swap suggestions"""
    suggestions: List[Dict[str, Any]]
    current_allocations: Dict[str, float]
    target_allocations: Dict[str, float]
    summary: SwapSummary
    generated_at: str


# ====================
# Accuracy Schemas
# ====================

class ModelAccuracy(BaseModel):
    """Model accuracy metrics"""
    total_predictions: int
    validated_predictions: int
    accuracy_rate: float
    mean_absolute_error: Optional[float] = None
    mean_percentage_error: Optional[float] = None


class AccuracyBySymbol(BaseModel):
    """Accuracy breakdown by symbol"""
    symbol: str
    total: int
    correct: int
    accuracy: float


class AccuracyReportResponse(BaseModel):
    """Response model for accuracy report"""
    overall_accuracy: ModelAccuracy
    by_symbol: List[AccuracyBySymbol]
    by_timeframe: Dict[str, float]
    period_days: int
    generated_at: str


class AccuracyTrendPoint(BaseModel):
    """Single point in accuracy trend"""
    date: str
    accuracy: float
    sample_size: int


class AccuracyTrendResponse(BaseModel):
    """Response model for accuracy trend"""
    symbol: Optional[str] = None
    trend: List[AccuracyTrendPoint]
    periods: int
