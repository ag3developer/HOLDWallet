"""
AI Prediction Models - WolkNow Intelligence
============================================

Database models for storing AI predictions, tracking accuracy,
and monitoring model performance for the premium AI feature.

Author: WolkNow AI Team
Created: January 2026
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    Text, ForeignKey, JSON, Index, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.models.base import BaseModel


class PredictionStatus(str, enum.Enum):
    """Status of a prediction"""
    PENDING = "pending"       # Prediction made, waiting for validation
    VALIDATED = "validated"   # Prediction period ended, accuracy calculated
    EXPIRED = "expired"       # Prediction too old, not validated
    CANCELLED = "cancelled"   # Prediction cancelled (e.g., model updated)


class PredictionPeriod(str, enum.Enum):
    """Prediction time periods"""
    DAYS_7 = "7d"
    DAYS_15 = "15d"
    DAYS_30 = "30d"


class SignalDirection(str, enum.Enum):
    """Market signal direction"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class AIPrediction(BaseModel):
    """
    Store individual AI predictions for tracking and accuracy monitoring.
    Each prediction is for a specific symbol and time period.
    """
    __tablename__ = "ai_predictions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Asset info
    symbol = Column(String(20), nullable=False, index=True)  # BTC, ETH, etc
    base_currency = Column(String(10), nullable=False, default="USD")
    
    # Prediction details
    period = Column(String(10), nullable=False)  # 7d, 15d, 30d
    predicted_price = Column(Float, nullable=False)
    predicted_change_percent = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    
    # Price range
    range_low = Column(Float, nullable=False)
    range_high = Column(Float, nullable=False)
    
    # Current price at prediction time
    price_at_prediction = Column(Float, nullable=False)
    
    # Model info
    model_version = Column(String(20), nullable=False, default="v1.0")
    model_weights = Column(JSON)  # {"prophet": 0.3, "lstm": 0.4, "xgboost": 0.3}
    
    # Signal
    signal_direction = Column(String(10), nullable=False)  # bullish, bearish, neutral
    signal_strength = Column(Float, nullable=False)  # 0.0 to 1.0
    
    # Timestamps
    prediction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    target_date = Column(DateTime, nullable=False)  # When prediction should be validated
    
    # Validation (filled after target_date)
    status = Column(String(20), nullable=False, default=PredictionStatus.PENDING.value)
    actual_price = Column(Float)  # Actual price at target_date
    actual_change_percent = Column(Float)
    accuracy_score = Column(Float)  # How accurate was the prediction (0.0 to 1.0)
    validated_at = Column(DateTime)
    
    # Metadata
    indicators_snapshot = Column(JSON)  # Snapshot of indicators at prediction time
    raw_model_outputs = Column(JSON)  # Individual model predictions
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for efficient queries
    __table_args__ = (
        Index('idx_ai_pred_symbol_date', 'symbol', 'prediction_date'),
        Index('idx_ai_pred_status', 'status'),
        Index('idx_ai_pred_target', 'target_date'),
    )
    
    def __repr__(self):
        return f"<AIPrediction {self.symbol} {self.period} {self.predicted_change_percent:+.2f}%>"


class AIIndicatorSnapshot(BaseModel):
    """
    Store snapshots of technical indicators for historical analysis.
    Used for backtesting and model improvement.
    """
    __tablename__ = "ai_indicator_snapshots"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Asset info
    symbol = Column(String(20), nullable=False, index=True)
    
    # Current price
    price = Column(Float, nullable=False)
    volume_24h = Column(Float)
    market_cap = Column(Float)
    
    # Momentum indicators
    rsi_14 = Column(Float)
    rsi_signal = Column(String(20))  # oversold, overbought, neutral
    macd_value = Column(Float)
    macd_signal = Column(Float)
    macd_histogram = Column(Float)
    macd_crossover = Column(String(20))  # bullish, bearish, none
    stoch_k = Column(Float)
    stoch_d = Column(Float)
    williams_r = Column(Float)
    
    # Trend indicators
    sma_20 = Column(Float)
    sma_50 = Column(Float)
    sma_200 = Column(Float)
    ema_9 = Column(Float)
    ema_21 = Column(Float)
    adx = Column(Float)
    
    # Volatility indicators
    bb_upper = Column(Float)
    bb_middle = Column(Float)
    bb_lower = Column(Float)
    bb_position = Column(Float)  # 0.0 to 1.0 position within bands
    atr_14 = Column(Float)
    
    # Volume indicators
    obv = Column(Float)
    volume_sma_20 = Column(Float)
    
    # Aggregated signal
    overall_signal = Column(String(20))  # bullish, bearish, neutral
    signal_strength = Column(Float)
    bullish_count = Column(Integer)
    bearish_count = Column(Integer)
    
    # Timestamp
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_indicator_symbol_date', 'symbol', 'snapshot_date'),
    )
    
    def __repr__(self):
        return f"<AIIndicatorSnapshot {self.symbol} RSI:{self.rsi_14:.1f}>"


class AIModelPerformance(BaseModel):
    """
    Track overall model performance metrics over time.
    Used for monitoring and improving the AI system.
    """
    __tablename__ = "ai_model_performance"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Model info
    model_version = Column(String(20), nullable=False, index=True)
    period = Column(String(10), nullable=False)  # 7d, 15d, 30d
    
    # Time range analyzed
    analysis_start = Column(DateTime, nullable=False)
    analysis_end = Column(DateTime, nullable=False)
    
    # Performance metrics
    total_predictions = Column(Integer, nullable=False, default=0)
    validated_predictions = Column(Integer, nullable=False, default=0)
    
    # Accuracy metrics
    accuracy_mean = Column(Float)  # Mean accuracy across all predictions
    accuracy_median = Column(Float)
    accuracy_std = Column(Float)  # Standard deviation
    
    # Direction accuracy (did we get the direction right?)
    direction_accuracy = Column(Float)  # % of times we got bull/bear right
    
    # Price accuracy (how close was the prediction?)
    mae = Column(Float)  # Mean Absolute Error
    mape = Column(Float)  # Mean Absolute Percentage Error
    rmse = Column(Float)  # Root Mean Square Error
    
    # Confidence calibration
    confidence_correlation = Column(Float)  # Correlation between confidence and accuracy
    
    # By symbol breakdown (JSON)
    performance_by_symbol = Column(JSON)  # {"BTC": {...}, "ETH": {...}}
    
    # Notes
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_perf_version_period', 'model_version', 'period'),
    )
    
    def __repr__(self):
        return f"<AIModelPerformance {self.model_version} {self.period} acc:{self.accuracy_mean:.1%}>"


class AICorrelationMatrix(BaseModel):
    """
    Store correlation matrices between assets.
    Updated periodically for portfolio analysis.
    """
    __tablename__ = "ai_correlation_matrices"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Symbols included
    symbols = Column(JSON, nullable=False)  # ["BTC", "ETH", "SOL", ...]
    
    # Correlation matrix (as nested JSON)
    correlation_matrix = Column(JSON, nullable=False)
    # Format: {"BTC": {"ETH": 0.85, "SOL": 0.72}, "ETH": {...}}
    
    # Time period used
    lookback_days = Column(Integer, nullable=False, default=30)
    
    # Insights
    high_correlations = Column(JSON)  # Pairs with correlation > 0.8
    low_correlations = Column(JSON)   # Pairs with correlation < 0.3
    
    # Timestamp
    calculated_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AICorrelationMatrix {len(self.symbols)} symbols>"


class AIATHMonitor(BaseModel):
    """
    Track All-Time High proximity and breakout probability for assets.
    """
    __tablename__ = "ai_ath_monitor"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Asset info
    symbol = Column(String(20), nullable=False, index=True)
    
    # ATH info
    ath_price = Column(Float, nullable=False)
    ath_date = Column(DateTime, nullable=False)
    
    # Current status
    current_price = Column(Float, nullable=False)
    ath_percentage = Column(Float, nullable=False)  # Current as % of ATH (0-100)
    distance_to_ath = Column(Float, nullable=False)  # % needed to reach ATH
    
    # Breakout probability (from AI model)
    breakout_prob_7d = Column(Float)   # Probability of ATH breakout in 7 days
    breakout_prob_30d = Column(Float)  # Probability in 30 days
    
    # Alert thresholds
    alert_threshold = Column(Float, default=95.0)  # Alert when reaching X% of ATH
    alert_triggered = Column(Boolean, default=False)
    alert_triggered_at = Column(DateTime)
    
    # Timestamp
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_ath_symbol', 'symbol'),
    )
    
    def __repr__(self):
        return f"<AIATHMonitor {self.symbol} {self.ath_percentage:.1f}% of ATH>"


class AISwapRecommendation(BaseModel):
    """
    Store swap/rebalancing recommendations generated by AI.
    """
    __tablename__ = "ai_swap_recommendations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # User (optional - can be general recommendations)
    user_id = Column(String(36), index=True)
    
    # Recommendation type
    risk_level = Column(String(20), nullable=False)  # aggressive, moderate, conservative
    
    # Swap details
    sell_symbol = Column(String(20), nullable=False)
    sell_percentage = Column(Float, nullable=False)  # % of holdings to sell
    buy_symbol = Column(String(20), nullable=False)
    
    # Reasoning
    primary_reason = Column(Text, nullable=False)
    supporting_indicators = Column(JSON)  # List of indicators supporting this
    
    # Expected outcome
    expected_return_percent = Column(Float)
    risk_score = Column(Float)  # 0.0 (low) to 1.0 (high)
    confidence_score = Column(Float)
    
    # Validation (if user executed)
    executed = Column(Boolean, default=False)
    executed_at = Column(DateTime)
    actual_return_percent = Column(Float)
    
    # Expiry
    valid_until = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_swap_user', 'user_id'),
        Index('idx_swap_active', 'is_active', 'valid_until'),
    )
    
    def __repr__(self):
        return f"<AISwapRecommendation {self.sell_symbol}->{self.buy_symbol} {self.risk_level}>"


class AIUserPredictionAccess(BaseModel):
    """
    Track user access to AI predictions for billing and rate limiting.
    """
    __tablename__ = "ai_user_prediction_access"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String(36), nullable=False, index=True)
    
    # Access counts (reset monthly)
    predictions_requested = Column(Integer, default=0)
    indicators_requested = Column(Integer, default=0)
    correlation_requested = Column(Integer, default=0)
    swap_recommendations_requested = Column(Integer, default=0)
    
    # Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Limits based on subscription
    prediction_limit = Column(Integer, default=10)
    indicator_limit = Column(Integer, default=50)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_ai_access_user_period', 'user_id', 'period_start'),
    )
    
    def __repr__(self):
        return f"<AIUserPredictionAccess user:{self.user_id[:8]} predictions:{self.predictions_requested}>"
