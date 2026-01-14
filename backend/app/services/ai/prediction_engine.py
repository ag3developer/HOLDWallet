"""
AI Prediction Engine
====================

Main prediction engine using Prophet for time series forecasting.
Generates predictions for 7, 15, and 30 day periods.

Author: WolkNow AI Team
Created: January 2026
"""

import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import logging
import uuid

logger = logging.getLogger(__name__)

# Try to import Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logger.warning("Prophet not available. Using fallback predictions.")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("Pandas not available.")

from app.models.ai_prediction import (
    AIPrediction,
    AIIndicatorSnapshot,
    PredictionStatus,
    SignalDirection
)
from app.services.ai.technical_indicators import TechnicalIndicators


class PredictionEngine:
    """
    AI Prediction Engine for cryptocurrency price forecasting.
    Uses Prophet (Meta) as the primary model.
    """
    
    def __init__(self):
        self.model_version = "v1.0"
        self.model_weights = {
            "prophet": 1.0  # Currently using only Prophet
        }
        
    async def predict(
        self,
        symbol: str,
        historical_data: Dict[str, List[float]],
        periods: List[int] = [7, 15, 30],
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Generate predictions for specified periods.
        
        Args:
            symbol: Crypto symbol (e.g., "BTC")
            historical_data: OHLCV data with keys 'dates', 'open', 'high', 'low', 'close', 'volume'
            periods: List of prediction periods in days
            db: Database session for saving predictions
            
        Returns:
            Dictionary with predictions for each period
        """
        try:
            if not PROPHET_AVAILABLE or not PANDAS_AVAILABLE:
                return await self._fallback_predict(symbol, historical_data, periods)
            
            # Prepare data for Prophet
            df = self._prepare_prophet_data(historical_data)
            
            if len(df) < 30:
                raise ValueError("Need at least 30 data points for prediction")
            
            current_price = float(df['y'].iloc[-1])
            
            # Train Prophet model
            model = Prophet(
                changepoint_prior_scale=0.05,
                seasonality_mode='multiplicative',
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,  # Crypto doesn't have strong yearly patterns
            )
            model.fit(df)
            
            # Generate predictions
            results = {}
            predictions_to_save = []
            
            for period in periods:
                prediction = await self._generate_period_prediction(
                    model=model,
                    symbol=symbol,
                    period=period,
                    current_price=current_price,
                    historical_data=historical_data
                )
                results[f'{period}d'] = prediction
                
                # Prepare for database save
                if db:
                    pred_record = self._create_prediction_record(
                        symbol=symbol,
                        period=period,
                        prediction=prediction,
                        current_price=current_price,
                        historical_data=historical_data
                    )
                    predictions_to_save.append(pred_record)
            
            # Save to database
            if db and predictions_to_save:
                for pred in predictions_to_save:
                    db.add(pred)
                db.commit()
                logger.info(f"Saved {len(predictions_to_save)} predictions for {symbol}")
            
            return {
                'symbol': symbol,
                'current_price': current_price,
                'predictions': results,
                'model_version': self.model_version,
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Prediction error for {symbol}: {e}")
            raise
    
    def _prepare_prophet_data(self, historical_data: Dict) -> 'pd.DataFrame':
        """Prepare data for Prophet model"""
        dates = historical_data.get('dates', [])
        prices = historical_data.get('close', [])
        
        # Convert dates if they're strings
        if dates and isinstance(dates[0], str):
            dates = [datetime.fromisoformat(d.replace('Z', '+00:00')) for d in dates]
        
        df = pd.DataFrame({
            'ds': dates,
            'y': prices
        })
        
        return df
    
    async def _generate_period_prediction(
        self,
        model: 'Prophet',
        symbol: str,
        period: int,
        current_price: float,
        historical_data: Dict
    ) -> Dict[str, Any]:
        """Generate prediction for a specific period"""
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=period)
        forecast = model.predict(future)
        
        # Get prediction for target date
        pred_row = forecast.iloc[-1]
        
        predicted_price = float(pred_row['yhat'])
        range_low = float(pred_row['yhat_lower'])
        range_high = float(pred_row['yhat_upper'])
        
        change_percent = ((predicted_price - current_price) / current_price) * 100
        
        # Calculate confidence based on prediction interval width
        interval_width = range_high - range_low
        relative_width = interval_width / predicted_price
        confidence = max(0.5, min(0.95, 1 - relative_width))
        
        # Determine signal direction
        if change_percent > 2:
            direction = SignalDirection.BULLISH.value
        elif change_percent < -2:
            direction = SignalDirection.BEARISH.value
        else:
            direction = SignalDirection.NEUTRAL.value
        
        # Calculate signal strength
        signal_strength = min(1.0, abs(change_percent) / 20)  # Cap at 20% change
        
        # Calculate technical indicators for context
        try:
            indicators = TechnicalIndicators({
                'open': historical_data.get('open', historical_data['close']),
                'high': historical_data.get('high', historical_data['close']),
                'low': historical_data.get('low', historical_data['close']),
                'close': historical_data['close'],
                'volume': historical_data.get('volume', [1] * len(historical_data['close']))
            })
            signal = indicators.generate_signal()
        except Exception:
            signal = {'direction': 'neutral', 'strength': 0.5}
        
        return {
            'predicted_price': round(predicted_price, 2),
            'change_percent': round(change_percent, 2),
            'confidence': round(confidence, 3),
            'range': {
                'low': round(range_low, 2),
                'high': round(range_high, 2)
            },
            'signal': {
                'direction': direction,
                'strength': round(signal_strength, 3)
            },
            'technical_signal': signal,
            'target_date': (datetime.now(timezone.utc) + timedelta(days=period)).isoformat()
        }
    
    async def _fallback_predict(
        self,
        symbol: str,
        historical_data: Dict,
        periods: List[int]
    ) -> Dict[str, Any]:
        """
        Fallback prediction when Prophet is not available.
        Uses simple moving average and trend analysis.
        """
        prices = historical_data.get('close', [])
        if not prices or len(prices) < 30:
            raise ValueError("Insufficient data for prediction")
        
        current_price = prices[-1]
        
        # Calculate trend using simple linear regression
        x = np.arange(len(prices))
        coefficients = np.polyfit(x, prices, 1)
        slope = coefficients[0]
        
        # Daily average change
        daily_change = slope / current_price
        
        results = {}
        for period in periods:
            # Project price
            predicted_price = current_price * (1 + daily_change * period)
            change_percent = ((predicted_price - current_price) / current_price) * 100
            
            # Simple confidence decay over time
            confidence = max(0.5, 0.75 - (period * 0.005))
            
            # Range based on historical volatility
            volatility = np.std(prices[-30:]) / np.mean(prices[-30:])
            range_factor = volatility * np.sqrt(period)
            
            if change_percent > 2:
                direction = 'bullish'
            elif change_percent < -2:
                direction = 'bearish'
            else:
                direction = 'neutral'
            
            results[f'{period}d'] = {
                'predicted_price': round(predicted_price, 2),
                'change_percent': round(change_percent, 2),
                'confidence': round(confidence, 3),
                'range': {
                    'low': round(predicted_price * (1 - range_factor), 2),
                    'high': round(predicted_price * (1 + range_factor), 2)
                },
                'signal': {
                    'direction': direction,
                    'strength': min(1.0, abs(change_percent) / 20)
                },
                'target_date': (datetime.now(timezone.utc) + timedelta(days=period)).isoformat(),
                'fallback': True
            }
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'predictions': results,
            'model_version': 'fallback_v1.0',
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _create_prediction_record(
        self,
        symbol: str,
        period: int,
        prediction: Dict,
        current_price: float,
        historical_data: Dict
    ) -> AIPrediction:
        """Create a database record for the prediction"""
        
        # Calculate indicators snapshot
        try:
            indicators = TechnicalIndicators({
                'open': historical_data.get('open', historical_data['close']),
                'high': historical_data.get('high', historical_data['close']),
                'low': historical_data.get('low', historical_data['close']),
                'close': historical_data['close'],
                'volume': historical_data.get('volume', [1] * len(historical_data['close']))
            })
            indicators_snapshot = indicators.calculate_all()
        except Exception:
            indicators_snapshot = {}
        
        return AIPrediction(
            id=str(uuid.uuid4()),
            symbol=symbol,
            base_currency="USD",
            period=f"{period}d",
            predicted_price=prediction['predicted_price'],
            predicted_change_percent=prediction['change_percent'],
            confidence_score=prediction['confidence'],
            range_low=prediction['range']['low'],
            range_high=prediction['range']['high'],
            price_at_prediction=current_price,
            model_version=self.model_version,
            model_weights=self.model_weights,
            signal_direction=prediction['signal']['direction'],
            signal_strength=prediction['signal']['strength'],
            prediction_date=datetime.now(timezone.utc),
            target_date=datetime.now(timezone.utc) + timedelta(days=period),
            status=PredictionStatus.PENDING.value,
            indicators_snapshot=indicators_snapshot,
            raw_model_outputs={'prophet': prediction}
        )
    
    async def get_prediction_history(
        self,
        db: Session,
        symbol: str,
        period: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get historical predictions for analysis"""
        query = db.query(AIPrediction).filter(
            AIPrediction.symbol == symbol
        )
        
        if period:
            query = query.filter(AIPrediction.period == period)
        
        predictions = query.order_by(
            AIPrediction.prediction_date.desc()
        ).limit(limit).all()
        
        return [
            {
                'id': p.id,
                'symbol': p.symbol,
                'period': p.period,
                'predicted_price': p.predicted_price,
                'predicted_change': p.predicted_change_percent,
                'confidence': p.confidence_score,
                'actual_price': p.actual_price,
                'actual_change': p.actual_change_percent,
                'accuracy': p.accuracy_score,
                'status': p.status,
                'prediction_date': p.prediction_date.isoformat() if p.prediction_date else None,
                'target_date': p.target_date.isoformat() if p.target_date else None,
                'validated_at': p.validated_at.isoformat() if p.validated_at else None
            }
            for p in predictions
        ]


# Singleton instance
prediction_engine = PredictionEngine()
