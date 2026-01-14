"""
Correlation Service
===================

Calculate and track correlation matrices between crypto assets.
Helps users diversify their portfolios effectively.

Author: WolkNow AI Team
Created: January 2026
"""

import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import logging
import uuid

from app.models.ai_prediction import AICorrelationMatrix

logger = logging.getLogger(__name__)


class CorrelationService:
    """
    Calculate correlation matrices between cryptocurrency assets.
    Used for portfolio diversification analysis.
    """
    
    def __init__(self):
        self.high_correlation_threshold = 0.8
        self.low_correlation_threshold = 0.3
    
    async def calculate_correlation_matrix(
        self,
        price_data: Dict[str, List[float]],
        lookback_days: int = 30,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Calculate correlation matrix for given assets.
        
        Args:
            price_data: Dict with symbol as key and list of prices as value
                       e.g., {"BTC": [45000, 45500, ...], "ETH": [3200, 3250, ...]}
            lookback_days: Number of days used for calculation
            db: Database session for saving results
            
        Returns:
            Correlation matrix and insights
        """
        symbols = list(price_data.keys())
        
        if len(symbols) < 2:
            return {
                'error': 'Need at least 2 assets to calculate correlation',
                'symbols': symbols
            }
        
        # Ensure all price arrays have the same length
        min_length = min(len(prices) for prices in price_data.values())
        
        if min_length < 10:
            return {
                'error': 'Need at least 10 data points for correlation',
                'data_points': min_length
            }
        
        # Trim to same length and calculate returns
        returns = {}
        for symbol, prices in price_data.items():
            prices_trimmed = prices[-min_length:]
            # Calculate daily returns
            returns[symbol] = [
                (prices_trimmed[i] - prices_trimmed[i-1]) / prices_trimmed[i-1]
                for i in range(1, len(prices_trimmed))
            ]
        
        # Build correlation matrix
        n = len(symbols)
        matrix = {}
        high_correlations = []
        low_correlations = []
        
        for i, sym1 in enumerate(symbols):
            matrix[sym1] = {}
            for j, sym2 in enumerate(symbols):
                if i == j:
                    corr = 1.0
                else:
                    # Calculate Pearson correlation
                    corr = self._pearson_correlation(returns[sym1], returns[sym2])
                
                matrix[sym1][sym2] = round(corr, 4)
                
                # Track high/low correlations (only upper triangle to avoid duplicates)
                if i < j:
                    if corr >= self.high_correlation_threshold:
                        high_correlations.append({
                            'pair': [sym1, sym2],
                            'correlation': round(corr, 4)
                        })
                    elif corr <= self.low_correlation_threshold:
                        low_correlations.append({
                            'pair': [sym1, sym2],
                            'correlation': round(corr, 4)
                        })
        
        # Sort by correlation value
        high_correlations.sort(key=lambda x: x['correlation'], reverse=True)
        low_correlations.sort(key=lambda x: x['correlation'])
        
        # Generate insights
        insights = self._generate_insights(high_correlations, low_correlations, symbols)
        
        # Save to database (optional - don't fail if DB not available)
        if db:
            try:
                correlation_record = AICorrelationMatrix(
                    id=str(uuid.uuid4()),
                    symbols=symbols,
                    correlation_matrix=matrix,
                    lookback_days=lookback_days,
                    high_correlations=high_correlations,
                    low_correlations=low_correlations,
                    calculated_at=datetime.now(timezone.utc)
                )
                db.add(correlation_record)
                db.commit()
            except Exception as e:
                logger.warning(f"Failed to save correlation matrix to database: {e}")
                db.rollback()
        
        return {
            'symbols': symbols,
            'matrix': matrix,
            'high_correlations': high_correlations,
            'low_correlations': low_correlations,
            'insights': insights,
            'lookback_days': lookback_days,
            'data_points': min_length,
            'calculated_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _pearson_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        n = len(x)
        if n != len(y) or n == 0:
            return 0.0
        
        x_arr = np.array(x)
        y_arr = np.array(y)
        
        x_mean = np.mean(x_arr)
        y_mean = np.mean(y_arr)
        
        numerator = np.sum((x_arr - x_mean) * (y_arr - y_mean))
        denominator = np.sqrt(np.sum((x_arr - x_mean)**2) * np.sum((y_arr - y_mean)**2))
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator
    
    def _generate_insights(
        self,
        high_corr: List[Dict],
        low_corr: List[Dict],
        symbols: List[str]
    ) -> List[Dict[str, str]]:
        """Generate human-readable insights from correlation data"""
        insights = []
        
        # High correlation warnings
        for item in high_corr[:3]:  # Top 3
            pair = item['pair']
            corr = item['correlation']
            insights.append({
                'type': 'warning',
                'title': f'{pair[0]} e {pair[1]} altamente correlacionados',
                'message': f'Correlação de {corr:.0%}. Considere diversificar para ativos menos correlacionados.',
                'severity': 'high' if corr >= 0.9 else 'medium'
            })
        
        # Low correlation opportunities
        for item in low_corr[:2]:  # Top 2
            pair = item['pair']
            corr = item['correlation']
            insights.append({
                'type': 'opportunity',
                'title': f'{pair[0]} e {pair[1]} pouco correlacionados',
                'message': f'Correlação de apenas {corr:.0%}. Boa combinação para diversificação.',
                'severity': 'low'
            })
        
        # Overall portfolio diversity
        if high_corr and len(high_corr) > len(symbols) / 2:
            insights.append({
                'type': 'alert',
                'title': 'Portfolio pode estar pouco diversificado',
                'message': 'Muitos ativos com alta correlação. Considere adicionar ativos de diferentes setores.',
                'severity': 'medium'
            })
        
        return insights
    
    async def get_latest_correlation(
        self,
        db: Session,
        symbols: Optional[List[str]] = None
    ) -> Optional[Dict]:
        """Get the most recent correlation matrix from database"""
        query = db.query(AICorrelationMatrix).order_by(
            AICorrelationMatrix.calculated_at.desc()
        )
        
        if symbols:
            # Filter for matrices that include all requested symbols
            # This is a simplification - in production, might need more complex filtering
            query = query.filter(AICorrelationMatrix.symbols.contains(symbols))
        
        latest = query.first()
        
        if not latest:
            return None
        
        return {
            'id': latest.id,
            'symbols': latest.symbols,
            'matrix': latest.correlation_matrix,
            'high_correlations': latest.high_correlations,
            'low_correlations': latest.low_correlations,
            'lookback_days': latest.lookback_days,
            'calculated_at': latest.calculated_at.isoformat() if latest.calculated_at else None
        }


# Singleton instance
correlation_service = CorrelationService()
