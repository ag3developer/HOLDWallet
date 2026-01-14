"""
ATH (All-Time High) Service
===========================

Track and analyze all-time high data for cryptocurrencies.
Shows distance from ATH and potential upside analysis.

Author: WolkNow AI Team
Created: January 2026
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging
import uuid

from app.models.ai_prediction import AIATHMonitor

logger = logging.getLogger(__name__)


class ATHService:
    """
    Track All-Time High data and analyze potential upside.
    Helps users understand where assets are relative to their peaks.
    """
    
    # Major crypto ATH data (updated periodically)
    # In production, this would come from an API
    KNOWN_ATH_DATA = {
        'BTC': {'ath': 108000.0, 'ath_date': '2024-12-17'},
        'ETH': {'ath': 4891.70, 'ath_date': '2021-11-10'},
        'BNB': {'ath': 793.35, 'ath_date': '2024-12-04'},
        'XRP': {'ath': 3.84, 'ath_date': '2018-01-07'},
        'SOL': {'ath': 263.83, 'ath_date': '2024-11-23'},
        'ADA': {'ath': 3.09, 'ath_date': '2021-09-02'},
        'DOGE': {'ath': 0.7376, 'ath_date': '2021-05-08'},
        'AVAX': {'ath': 146.22, 'ath_date': '2021-11-21'},
        'DOT': {'ath': 55.00, 'ath_date': '2021-11-04'},
        'MATIC': {'ath': 2.92, 'ath_date': '2021-12-27'},
        'LINK': {'ath': 52.99, 'ath_date': '2021-05-10'},
        'UNI': {'ath': 44.97, 'ath_date': '2021-05-03'},
        'ATOM': {'ath': 44.70, 'ath_date': '2022-01-17'},
        'XLM': {'ath': 0.938, 'ath_date': '2018-01-04'},
        'LTC': {'ath': 412.96, 'ath_date': '2021-05-10'},
        'TRX': {'ath': 0.30, 'ath_date': '2024-12-03'},
        'NEAR': {'ath': 20.44, 'ath_date': '2022-01-16'},
        'FTM': {'ath': 3.48, 'ath_date': '2021-10-28'},
        'ALGO': {'ath': 3.28, 'ath_date': '2019-06-20'},
        'VET': {'ath': 0.28, 'ath_date': '2021-04-17'}
    }
    
    def __init__(self):
        pass
    
    async def analyze_ath(
        self,
        symbol: str,
        current_price: float,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Analyze ATH metrics for a single asset.
        
        Args:
            symbol: Cryptocurrency symbol (BTC, ETH, etc.)
            current_price: Current price of the asset
            db: Database session for saving
            
        Returns:
            ATH analysis with metrics
        """
        symbol_upper = symbol.upper()
        
        # Get ATH data
        ath_data = self.KNOWN_ATH_DATA.get(symbol_upper)
        
        if not ath_data:
            return {
                'symbol': symbol_upper,
                'current_price': current_price,
                'ath_known': False,
                'message': f'ATH data not available for {symbol_upper}'
            }
        
        ath_price = ath_data['ath']
        ath_date = ath_data['ath_date']
        
        # Calculate metrics
        distance_from_ath = ((current_price - ath_price) / ath_price) * 100
        potential_upside = ((ath_price - current_price) / current_price) * 100 if current_price < ath_price else 0
        recovery_percent = (current_price / ath_price) * 100
        
        # Determine zone
        if recovery_percent >= 95:
            zone = 'ATH_ZONE'
            zone_color = 'green'
        elif recovery_percent >= 70:
            zone = 'STRONG'
            zone_color = 'blue'
        elif recovery_percent >= 50:
            zone = 'RECOVERING'
            zone_color = 'yellow'
        elif recovery_percent >= 30:
            zone = 'WEAK'
            zone_color = 'orange'
        else:
            zone = 'CAPITULATION'
            zone_color = 'red'
        
        # Days since ATH
        ath_datetime = datetime.strptime(ath_date, '%Y-%m-%d')
        days_since_ath = (datetime.now() - ath_datetime).days
        
        analysis = {
            'symbol': symbol_upper,
            'current_price': current_price,
            'ath_price': ath_price,
            'ath_date': ath_date,
            'distance_from_ath_percent': round(distance_from_ath, 2),
            'potential_upside_percent': round(potential_upside, 2),
            'recovery_percent': round(recovery_percent, 2),
            'zone': zone,
            'zone_color': zone_color,
            'days_since_ath': days_since_ath,
            'at_ath': current_price >= ath_price * 0.98,  # Within 2% of ATH
            'insights': self._generate_ath_insights(
                symbol_upper, zone, potential_upside, days_since_ath
            )
        }
        
        # Save to database (optional - don't fail if DB not available)
        if db:
            try:
                ath_record = AIATHMonitor(
                    id=str(uuid.uuid4()),
                    symbol=symbol_upper,
                    current_price=current_price,
                    ath_price=ath_price,
                    ath_date=ath_datetime,
                    ath_percentage=recovery_percent,
                    distance_to_ath=potential_upside
                )
                db.add(ath_record)
                db.commit()
            except Exception as e:
                logger.warning(f"Failed to save ATH record to database: {e}")
                db.rollback()
        
        return analysis
    
    async def analyze_portfolio_ath(
        self,
        portfolio: List[Dict[str, Any]],
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Analyze ATH metrics for entire portfolio.
        
        Args:
            portfolio: List of {symbol, current_price, amount, value_usd}
            db: Database session
            
        Returns:
            Portfolio ATH analysis
        """
        analyses = []
        total_potential_value = 0
        total_current_value = 0
        
        for asset in portfolio:
            symbol = asset['symbol']
            current_price = asset['current_price']
            amount = asset.get('amount', 0)
            value_usd = asset.get('value_usd', current_price * amount)
            
            # Get individual analysis
            analysis = await self.analyze_ath(symbol, current_price)
            
            if analysis.get('ath_known', True) and 'ath_price' in analysis:
                # Calculate potential value at ATH
                potential_value = analysis['ath_price'] * amount
                
                analysis['amount'] = amount
                analysis['current_value_usd'] = value_usd
                analysis['potential_value_at_ath'] = potential_value
                
                total_potential_value += potential_value
                total_current_value += value_usd
            
            analyses.append(analysis)
        
        # Portfolio-level metrics
        portfolio_potential_upside = 0
        if total_current_value > 0:
            portfolio_potential_upside = ((total_potential_value - total_current_value) / total_current_value) * 100
        
        # Find best opportunities
        opportunities = [
            a for a in analyses 
            if a.get('potential_upside_percent', 0) > 50 and a.get('ath_known', True)
        ]
        opportunities.sort(key=lambda x: x.get('potential_upside_percent', 0), reverse=True)
        
        return {
            'assets': analyses,
            'portfolio_summary': {
                'total_current_value': round(total_current_value, 2),
                'total_potential_at_ath': round(total_potential_value, 2),
                'portfolio_potential_upside_percent': round(portfolio_potential_upside, 2)
            },
            'best_opportunities': opportunities[:3],
            'analyzed_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_ath_insights(
        self,
        symbol: str,
        zone: str,
        potential_upside: float,
        days_since_ath: int
    ) -> List[Dict[str, str]]:
        """Generate insights based on ATH analysis"""
        insights = []
        
        if zone == 'ATH_ZONE':
            insights.append({
                'type': 'info',
                'message': f'{symbol} está próximo de sua máxima histórica. Momento de cautela ou realização parcial.'
            })
        elif zone == 'CAPITULATION':
            insights.append({
                'type': 'opportunity',
                'message': f'{symbol} está muito abaixo do ATH ({potential_upside:.0f}% upside potencial). Pode ser oportunidade se fundamentos permanecem.'
            })
        elif potential_upside > 100:
            insights.append({
                'type': 'opportunity',
                'message': f'{symbol} tem potencial de {potential_upside:.0f}% se retornar ao ATH.'
            })
        
        if days_since_ath > 365:
            years = days_since_ath // 365
            insights.append({
                'type': 'warning',
                'message': f'{symbol} não atinge ATH há {years}+ anos. Verifique se fundamentos ainda justificam.'
            })
        
        return insights
    
    def update_ath_data(
        self,
        symbol: str,
        ath_price: float,
        ath_date: str
    ) -> None:
        """Update ATH data for a symbol (admin function)"""
        self.KNOWN_ATH_DATA[symbol.upper()] = {
            'ath': ath_price,
            'ath_date': ath_date
        }
        logger.info(f"Updated ATH for {symbol}: ${ath_price} on {ath_date}")


# Singleton instance
ath_service = ATHService()
