"""
Swap Suggestion Service
=======================

AI-powered swap suggestions based on portfolio analysis,
market conditions, and rebalancing recommendations.

Author: WolkNow AI Team
Created: January 2026
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)


class SwapReason(str, Enum):
    """Reasons for swap suggestions"""
    REBALANCING = "rebalancing"
    TAKE_PROFIT = "take_profit"
    STOP_LOSS = "stop_loss"
    DIVERSIFICATION = "diversification"
    CORRELATION_REDUCTION = "correlation_reduction"
    MOMENTUM = "momentum"
    UNDERWEIGHT = "underweight"
    OVERWEIGHT = "overweight"


class SwapSuggestionService:
    """
    Generate intelligent swap suggestions based on portfolio analysis.
    Helps users optimize their portfolios.
    """
    
    def __init__(self):
        # Configuration thresholds
        self.overweight_threshold = 1.4  # 40% above target
        self.underweight_threshold = 0.6  # 40% below target
        self.take_profit_threshold = 2.0  # 2x gain
        self.stop_loss_threshold = -0.3  # 30% loss
        
        # Default target allocations
        self.default_targets = {
            'BTC': 0.40,   # 40% of portfolio
            'ETH': 0.25,   # 25%
            'MAJOR_ALTS': 0.20,  # 20% (SOL, BNB, etc.)
            'MID_ALTS': 0.10,   # 10%
            'SMALL_ALTS': 0.05  # 5%
        }
        
        # Asset classifications
        self.asset_classes = {
            'BTC': 'BTC',
            'ETH': 'ETH',
            'SOL': 'MAJOR_ALTS',
            'BNB': 'MAJOR_ALTS',
            'XRP': 'MAJOR_ALTS',
            'ADA': 'MAJOR_ALTS',
            'AVAX': 'MID_ALTS',
            'DOT': 'MID_ALTS',
            'MATIC': 'MID_ALTS',
            'LINK': 'MID_ALTS',
            'ATOM': 'MID_ALTS',
            'UNI': 'MID_ALTS',
            'DOGE': 'MID_ALTS'
        }
    
    def generate_swap_suggestions(
        self,
        portfolio: List[Dict[str, Any]],
        correlation_data: Optional[Dict] = None,
        ath_data: Optional[Dict] = None,
        custom_targets: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Generate swap suggestions based on portfolio analysis.
        
        Args:
            portfolio: List of {symbol, amount, current_price, value_usd, cost_basis}
            correlation_data: Correlation matrix data (optional)
            ath_data: ATH analysis data (optional)
            custom_targets: Custom target allocations (optional)
            
        Returns:
            Swap suggestions with reasoning
        """
        suggestions = []
        targets = custom_targets or self.default_targets
        
        # Calculate total portfolio value
        total_value = sum(asset.get('value_usd', 0) for asset in portfolio)
        
        if total_value <= 0:
            return {
                'suggestions': [],
                'message': 'Portfolio value is zero or negative'
            }
        
        # Analyze allocations by class
        class_values = self._calculate_class_allocations(portfolio, total_value)
        
        # 1. Check for rebalancing needs
        rebalancing = self._check_rebalancing(
            portfolio, class_values, targets, total_value
        )
        suggestions.extend(rebalancing)
        
        # 2. Check for take profit opportunities
        take_profits = self._check_take_profit(portfolio)
        suggestions.extend(take_profits)
        
        # 3. Check for stop loss situations
        stop_losses = self._check_stop_loss(portfolio)
        suggestions.extend(stop_losses)
        
        # 4. Check correlation if data available
        if correlation_data:
            correlation_swaps = self._check_correlation_reduction(
                portfolio, correlation_data
            )
            suggestions.extend(correlation_swaps)
        
        # 5. Check ATH opportunities if data available
        if ath_data:
            ath_swaps = self._check_ath_opportunities(portfolio, ath_data)
            suggestions.extend(ath_swaps)
        
        # Sort by priority
        suggestions.sort(key=lambda x: x.get('priority', 0), reverse=True)
        
        # Generate summary
        summary = self._generate_summary(suggestions, class_values, targets)
        
        return {
            'suggestions': suggestions[:10],  # Top 10 suggestions
            'current_allocations': class_values,
            'target_allocations': targets,
            'summary': summary,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _calculate_class_allocations(
        self,
        portfolio: List[Dict],
        total_value: float
    ) -> Dict[str, float]:
        """Calculate allocation percentages by asset class"""
        class_values = {
            'BTC': 0,
            'ETH': 0,
            'MAJOR_ALTS': 0,
            'MID_ALTS': 0,
            'SMALL_ALTS': 0
        }
        
        for asset in portfolio:
            symbol = asset['symbol'].upper()
            value = asset.get('value_usd', 0)
            
            asset_class = self.asset_classes.get(symbol, 'SMALL_ALTS')
            class_values[asset_class] += value
        
        # Convert to percentages
        return {k: v / total_value for k, v in class_values.items()}
    
    def _check_rebalancing(
        self,
        portfolio: List[Dict],
        current: Dict[str, float],
        targets: Dict[str, float],
        total_value: float
    ) -> List[Dict]:
        """Check for rebalancing needs"""
        suggestions = []
        overweight = []
        underweight = []
        
        for asset_class, target in targets.items():
            current_alloc = current.get(asset_class, 0)
            
            if current_alloc > target * self.overweight_threshold:
                overweight.append({
                    'class': asset_class,
                    'current': current_alloc,
                    'target': target,
                    'excess': current_alloc - target
                })
            elif current_alloc < target * self.underweight_threshold:
                underweight.append({
                    'class': asset_class,
                    'current': current_alloc,
                    'target': target,
                    'deficit': target - current_alloc
                })
        
        # Generate swap suggestions from overweight to underweight
        for ow in overweight:
            for uw in underweight:
                swap_amount = min(ow['excess'], uw['deficit']) * total_value
                
                if swap_amount > 10:  # Minimum $10 swap
                    # Find specific assets
                    from_assets = [
                        a for a in portfolio 
                        if self.asset_classes.get(a['symbol'].upper()) == ow['class']
                    ]
                    to_candidates = self._get_candidates_for_class(uw['class'])
                    
                    if from_assets:
                        from_asset = max(from_assets, key=lambda x: x.get('value_usd', 0))
                        
                        suggestions.append({
                            'id': str(uuid.uuid4()),
                            'type': 'swap',
                            'reason': SwapReason.REBALANCING.value,
                            'from_symbol': from_asset['symbol'],
                            'to_symbol': to_candidates[0] if to_candidates else 'BTC',
                            'suggested_amount_usd': round(swap_amount, 2),
                            'priority': 7,
                            'message': f"Rebalancear de {ow['class']} ({ow['current']:.0%}) para {uw['class']} ({uw['current']:.0%})",
                            'impact': f"Aproxima alocação do target ({uw['class']}: {uw['target']:.0%})"
                        })
        
        return suggestions
    
    def _check_take_profit(self, portfolio: List[Dict]) -> List[Dict]:
        """Check for take profit opportunities"""
        suggestions = []
        
        for asset in portfolio:
            cost_basis = asset.get('cost_basis', asset.get('current_price', 0))
            current_price = asset.get('current_price', 0)
            
            if cost_basis > 0 and current_price > 0:
                gain = (current_price - cost_basis) / cost_basis
                
                if gain >= self.take_profit_threshold:
                    value = asset.get('value_usd', 0)
                    take_profit_amount = value * 0.25  # Suggest taking 25%
                    
                    suggestions.append({
                        'id': str(uuid.uuid4()),
                        'type': 'take_profit',
                        'reason': SwapReason.TAKE_PROFIT.value,
                        'from_symbol': asset['symbol'],
                        'to_symbol': 'USDT',
                        'suggested_amount_usd': round(take_profit_amount, 2),
                        'priority': 9,
                        'message': f"{asset['symbol']} subiu {gain:.0%} desde a compra",
                        'impact': f"Proteger ${take_profit_amount:.2f} de ganhos realizando 25%"
                    })
        
        return suggestions
    
    def _check_stop_loss(self, portfolio: List[Dict]) -> List[Dict]:
        """Check for stop loss situations"""
        suggestions = []
        
        for asset in portfolio:
            cost_basis = asset.get('cost_basis', asset.get('current_price', 0))
            current_price = asset.get('current_price', 0)
            
            if cost_basis > 0 and current_price > 0:
                loss = (current_price - cost_basis) / cost_basis
                
                if loss <= self.stop_loss_threshold:
                    value = asset.get('value_usd', 0)
                    
                    suggestions.append({
                        'id': str(uuid.uuid4()),
                        'type': 'stop_loss',
                        'reason': SwapReason.STOP_LOSS.value,
                        'from_symbol': asset['symbol'],
                        'to_symbol': 'BTC',
                        'suggested_amount_usd': round(value * 0.5, 2),
                        'priority': 10,  # Highest priority
                        'message': f"{asset['symbol']} caiu {abs(loss):.0%} desde a compra",
                        'impact': "Considere reduzir exposição para limitar perdas"
                    })
        
        return suggestions
    
    def _check_correlation_reduction(
        self,
        portfolio: List[Dict],
        correlation_data: Dict
    ) -> List[Dict]:
        """Check for correlation reduction opportunities"""
        suggestions = []
        
        high_correlations = correlation_data.get('high_correlations', [])
        
        for corr in high_correlations[:2]:  # Top 2 high correlations
            pair = corr.get('pair', [])
            if len(pair) == 2:
                # Find smaller position
                positions = [
                    a for a in portfolio 
                    if a['symbol'].upper() in [p.upper() for p in pair]
                ]
                
                if len(positions) == 2:
                    smaller = min(positions, key=lambda x: x.get('value_usd', 0))
                    
                    suggestions.append({
                        'id': str(uuid.uuid4()),
                        'type': 'diversify',
                        'reason': SwapReason.CORRELATION_REDUCTION.value,
                        'from_symbol': smaller['symbol'],
                        'to_symbol': 'AVAX',  # Suggest a typically less correlated asset
                        'suggested_amount_usd': round(smaller.get('value_usd', 0) * 0.5, 2),
                        'priority': 5,
                        'message': f"{pair[0]} e {pair[1]} têm correlação de {corr.get('correlation', 0):.0%}",
                        'impact': "Reduzir correlação do portfolio diversificando"
                    })
        
        return suggestions
    
    def _check_ath_opportunities(
        self,
        portfolio: List[Dict],
        ath_data: Dict
    ) -> List[Dict]:
        """Check for ATH-based opportunities"""
        suggestions = []
        
        assets_ath = ath_data.get('assets', [])
        
        # Find assets near ATH (potential take profit)
        near_ath = [a for a in assets_ath if a.get('zone') == 'ATH_ZONE']
        
        for asset in near_ath:
            portfolio_asset = next(
                (p for p in portfolio if p['symbol'].upper() == asset['symbol']),
                None
            )
            
            if portfolio_asset:
                value = portfolio_asset.get('value_usd', 0)
                
                suggestions.append({
                    'id': str(uuid.uuid4()),
                    'type': 'ath_caution',
                    'reason': SwapReason.TAKE_PROFIT.value,
                    'from_symbol': asset['symbol'],
                    'to_symbol': 'USDT',
                    'suggested_amount_usd': round(value * 0.15, 2),
                    'priority': 6,
                    'message': f"{asset['symbol']} está a {asset.get('recovery_percent', 0):.0f}% do ATH",
                    'impact': "Considere realizar parte dos ganhos próximo ao topo histórico"
                })
        
        return suggestions
    
    def _get_candidates_for_class(self, asset_class: str) -> List[str]:
        """Get candidate assets for a given class"""
        candidates = {
            'BTC': ['BTC'],
            'ETH': ['ETH'],
            'MAJOR_ALTS': ['SOL', 'BNB', 'XRP', 'ADA'],
            'MID_ALTS': ['AVAX', 'DOT', 'MATIC', 'LINK', 'ATOM'],
            'SMALL_ALTS': ['UNI', 'NEAR', 'FTM', 'ALGO']
        }
        return candidates.get(asset_class, ['BTC'])
    
    def _generate_summary(
        self,
        suggestions: List[Dict],
        current: Dict[str, float],
        targets: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate summary of swap suggestions"""
        high_priority = len([s for s in suggestions if s.get('priority', 0) >= 8])
        medium_priority = len([s for s in suggestions if 5 <= s.get('priority', 0) < 8])
        
        total_suggested_value = sum(s.get('suggested_amount_usd', 0) for s in suggestions)
        
        # Calculate allocation deviation
        total_deviation = sum(
            abs(current.get(k, 0) - targets.get(k, 0)) 
            for k in targets.keys()
        )
        
        return {
            'total_suggestions': len(suggestions),
            'high_priority_count': high_priority,
            'medium_priority_count': medium_priority,
            'total_suggested_swap_value': round(total_suggested_value, 2),
            'portfolio_balance_score': round((1 - total_deviation / 2) * 100, 1),
            'health_status': self._get_health_status(high_priority, total_deviation)
        }
    
    def _get_health_status(self, high_priority: int, deviation: float) -> str:
        """Determine portfolio health status"""
        if high_priority >= 2 or deviation > 0.5:
            return 'NEEDS_ATTENTION'
        elif high_priority == 1 or deviation > 0.3:
            return 'MODERATE'
        else:
            return 'HEALTHY'


# Singleton instance
swap_suggestion_service = SwapSuggestionService()
