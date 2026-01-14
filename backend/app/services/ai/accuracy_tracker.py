"""
AI Accuracy Tracker
===================

Service to validate predictions and track model accuracy over time.
Essential for monitoring and improving prediction quality.

Author: WolkNow AI Team
Created: January 2026
"""

import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import logging
import uuid

from app.models.ai_prediction import (
    AIPrediction,
    AIModelPerformance,
    PredictionStatus
)

logger = logging.getLogger(__name__)


class AccuracyTracker:
    """
    Track and validate AI prediction accuracy.
    Calculates performance metrics for model improvement.
    """
    
    def __init__(self):
        self.accuracy_thresholds = {
            'excellent': 0.85,
            'good': 0.70,
            'fair': 0.55,
            'poor': 0.40
        }
    
    async def validate_predictions(
        self,
        db: Session,
        get_current_price_func: callable
    ) -> Dict[str, Any]:
        """
        Validate all pending predictions that have reached their target date.
        
        Args:
            db: Database session
            get_current_price_func: Async function to get current price for a symbol
            
        Returns:
            Summary of validated predictions
        """
        now = datetime.now(timezone.utc)
        
        # Get all pending predictions that have passed their target date
        pending = db.query(AIPrediction).filter(
            and_(
                AIPrediction.status == PredictionStatus.PENDING.value,
                AIPrediction.target_date <= now
            )
        ).all()
        
        if not pending:
            return {
                'validated': 0,
                'message': 'No pending predictions to validate'
            }
        
        validated_count = 0
        results = []
        
        for prediction in pending:
            try:
                # Get actual price
                actual_price = await get_current_price_func(prediction.symbol)
                
                if actual_price is None:
                    logger.warning(f"Could not get price for {prediction.symbol}")
                    continue
                
                # Calculate accuracy
                accuracy_data = self._calculate_accuracy(
                    predicted_price=prediction.predicted_price,
                    actual_price=actual_price,
                    predicted_change=prediction.predicted_change_percent,
                    price_at_prediction=prediction.price_at_prediction,
                    predicted_direction=prediction.signal_direction
                )
                
                # Update prediction record
                prediction.actual_price = actual_price
                prediction.actual_change_percent = accuracy_data['actual_change']
                prediction.accuracy_score = accuracy_data['accuracy_score']
                prediction.status = PredictionStatus.VALIDATED.value
                prediction.validated_at = now
                
                validated_count += 1
                results.append({
                    'id': prediction.id,
                    'symbol': prediction.symbol,
                    'period': prediction.period,
                    'predicted': prediction.predicted_price,
                    'actual': actual_price,
                    'accuracy': accuracy_data['accuracy_score'],
                    'direction_correct': accuracy_data['direction_correct']
                })
                
            except Exception as e:
                logger.error(f"Error validating prediction {prediction.id}: {e}")
                continue
        
        db.commit()
        
        return {
            'validated': validated_count,
            'total_pending': len(pending),
            'results': results,
            'timestamp': now.isoformat()
        }
    
    def _calculate_accuracy(
        self,
        predicted_price: float,
        actual_price: float,
        predicted_change: float,
        price_at_prediction: float,
        predicted_direction: str
    ) -> Dict[str, Any]:
        """
        Calculate accuracy metrics for a single prediction.
        
        Accuracy is based on:
        1. Price accuracy (MAPE)
        2. Direction accuracy (did we get bull/bear right?)
        3. Change magnitude accuracy
        """
        # Actual change percentage
        actual_change = ((actual_price - price_at_prediction) / price_at_prediction) * 100
        
        # Price accuracy using MAPE (Mean Absolute Percentage Error)
        mape = abs(predicted_price - actual_price) / actual_price * 100
        price_accuracy = max(0, 1 - (mape / 100))  # Convert MAPE to accuracy
        
        # Direction accuracy
        predicted_dir = 'up' if predicted_change > 0 else 'down' if predicted_change < 0 else 'flat'
        actual_dir = 'up' if actual_change > 0 else 'down' if actual_change < 0 else 'flat'
        direction_correct = predicted_dir == actual_dir
        direction_accuracy = 1.0 if direction_correct else 0.0
        
        # Magnitude accuracy (how close was the predicted change to actual)
        if actual_change != 0:
            magnitude_error = abs(predicted_change - actual_change) / abs(actual_change)
            magnitude_accuracy = max(0, 1 - magnitude_error)
        else:
            magnitude_accuracy = 1.0 if abs(predicted_change) < 1 else 0.0
        
        # Combined accuracy score (weighted)
        # Direction is most important, then magnitude, then exact price
        accuracy_score = (
            direction_accuracy * 0.5 +
            magnitude_accuracy * 0.3 +
            price_accuracy * 0.2
        )
        
        return {
            'accuracy_score': round(accuracy_score, 4),
            'price_accuracy': round(price_accuracy, 4),
            'direction_correct': direction_correct,
            'magnitude_accuracy': round(magnitude_accuracy, 4),
            'actual_change': round(actual_change, 2),
            'mape': round(mape, 2)
        }
    
    async def generate_performance_report(
        self,
        db: Session,
        model_version: str = "v1.0",
        period: Optional[str] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Generate comprehensive performance report for the AI model.
        """
        start_date = datetime.now(timezone.utc) - timedelta(days=days_back)
        
        # Query validated predictions
        query = db.query(AIPrediction).filter(
            and_(
                AIPrediction.model_version == model_version,
                AIPrediction.status == PredictionStatus.VALIDATED.value,
                AIPrediction.validated_at >= start_date
            )
        )
        
        if period:
            query = query.filter(AIPrediction.period == period)
        
        predictions = query.all()
        
        if not predictions:
            return {
                'model_version': model_version,
                'period': period,
                'message': 'No validated predictions found',
                'total_predictions': 0
            }
        
        # Calculate metrics
        accuracies = [p.accuracy_score for p in predictions if p.accuracy_score is not None]
        direction_correct = sum(
            1 for p in predictions 
            if p.actual_change_percent is not None and
            (p.predicted_change_percent > 0) == (p.actual_change_percent > 0)
        )
        
        # Calculate MAE, MAPE, RMSE
        price_errors = []
        percentage_errors = []
        
        for p in predictions:
            if p.actual_price and p.predicted_price:
                price_errors.append(abs(p.predicted_price - p.actual_price))
                percentage_errors.append(
                    abs(p.predicted_price - p.actual_price) / p.actual_price * 100
                )
        
        mae = np.mean(price_errors) if price_errors else 0
        mape = np.mean(percentage_errors) if percentage_errors else 0
        rmse = np.sqrt(np.mean([e**2 for e in price_errors])) if price_errors else 0
        
        # Performance by symbol
        by_symbol = {}
        symbols = set(p.symbol for p in predictions)
        
        for symbol in symbols:
            symbol_preds = [p for p in predictions if p.symbol == symbol]
            symbol_accuracies = [p.accuracy_score for p in symbol_preds if p.accuracy_score]
            
            by_symbol[symbol] = {
                'total': len(symbol_preds),
                'accuracy_mean': round(np.mean(symbol_accuracies), 4) if symbol_accuracies else 0,
                'accuracy_std': round(np.std(symbol_accuracies), 4) if len(symbol_accuracies) > 1 else 0
            }
        
        # Create performance record
        performance = AIModelPerformance(
            id=str(uuid.uuid4()),
            model_version=model_version,
            period=period or 'all',
            analysis_start=start_date,
            analysis_end=datetime.now(timezone.utc),
            total_predictions=len(predictions),
            validated_predictions=len(accuracies),
            accuracy_mean=round(np.mean(accuracies), 4) if accuracies else 0,
            accuracy_median=round(np.median(accuracies), 4) if accuracies else 0,
            accuracy_std=round(np.std(accuracies), 4) if len(accuracies) > 1 else 0,
            direction_accuracy=round(direction_correct / len(predictions), 4) if predictions else 0,
            mae=round(mae, 4),
            mape=round(mape, 4),
            rmse=round(rmse, 4),
            performance_by_symbol=by_symbol
        )
        
        db.add(performance)
        db.commit()
        
        # Determine rating
        mean_accuracy = np.mean(accuracies) if accuracies else 0
        if mean_accuracy >= self.accuracy_thresholds['excellent']:
            rating = 'excellent'
        elif mean_accuracy >= self.accuracy_thresholds['good']:
            rating = 'good'
        elif mean_accuracy >= self.accuracy_thresholds['fair']:
            rating = 'fair'
        else:
            rating = 'poor'
        
        return {
            'model_version': model_version,
            'period': period,
            'analysis_period': {
                'start': start_date.isoformat(),
                'end': datetime.now(timezone.utc).isoformat(),
                'days': days_back
            },
            'total_predictions': len(predictions),
            'validated_predictions': len(accuracies),
            'metrics': {
                'accuracy': {
                    'mean': round(np.mean(accuracies), 4) if accuracies else 0,
                    'median': round(np.median(accuracies), 4) if accuracies else 0,
                    'std': round(np.std(accuracies), 4) if len(accuracies) > 1 else 0,
                    'min': round(min(accuracies), 4) if accuracies else 0,
                    'max': round(max(accuracies), 4) if accuracies else 0
                },
                'direction_accuracy': round(direction_correct / len(predictions), 4) if predictions else 0,
                'mae': round(mae, 4),
                'mape': round(mape, 4),
                'rmse': round(rmse, 4)
            },
            'by_symbol': by_symbol,
            'rating': rating,
            'report_id': performance.id
        }
    
    async def get_accuracy_trend(
        self,
        db: Session,
        model_version: str = "v1.0",
        days: int = 90
    ) -> List[Dict]:
        """
        Get accuracy trend over time for visualization.
        """
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get daily accuracy averages
        results = db.query(
            func.date(AIPrediction.validated_at).label('date'),
            func.avg(AIPrediction.accuracy_score).label('avg_accuracy'),
            func.count(AIPrediction.id).label('count')
        ).filter(
            and_(
                AIPrediction.model_version == model_version,
                AIPrediction.status == PredictionStatus.VALIDATED.value,
                AIPrediction.validated_at >= start_date
            )
        ).group_by(
            func.date(AIPrediction.validated_at)
        ).order_by(
            func.date(AIPrediction.validated_at)
        ).all()
        
        return [
            {
                'date': str(r.date),
                'accuracy': round(float(r.avg_accuracy), 4) if r.avg_accuracy else 0,
                'predictions': r.count
            }
            for r in results
        ]
    
    async def compare_periods(
        self,
        db: Session,
        model_version: str = "v1.0",
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Compare accuracy across different prediction periods (7d, 15d, 30d).
        """
        start_date = datetime.now(timezone.utc) - timedelta(days=days_back)
        
        comparison = {}
        
        for period in ['7d', '15d', '30d']:
            predictions = db.query(AIPrediction).filter(
                and_(
                    AIPrediction.model_version == model_version,
                    AIPrediction.period == period,
                    AIPrediction.status == PredictionStatus.VALIDATED.value,
                    AIPrediction.validated_at >= start_date
                )
            ).all()
            
            if predictions:
                accuracies = [p.accuracy_score for p in predictions if p.accuracy_score]
                comparison[period] = {
                    'total': len(predictions),
                    'accuracy_mean': round(np.mean(accuracies), 4) if accuracies else 0,
                    'accuracy_std': round(np.std(accuracies), 4) if len(accuracies) > 1 else 0
                }
            else:
                comparison[period] = {
                    'total': 0,
                    'accuracy_mean': 0,
                    'accuracy_std': 0
                }
        
        return {
            'model_version': model_version,
            'analysis_period_days': days_back,
            'comparison': comparison,
            'best_period': max(
                comparison.keys(), 
                key=lambda k: comparison[k]['accuracy_mean']
            ) if any(comparison[k]['total'] > 0 for k in comparison) else None
        }


# Singleton instance
accuracy_tracker = AccuracyTracker()
