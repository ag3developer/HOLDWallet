"""
📈 HOLD Wallet - Advanced Portfolio Tracking Service
===================================================

Provides comprehensive portfolio analytics, performance tracking,
P&L reporting, and investment insights for premium users.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import asyncio
import aiohttp

from app.core.exceptions import ValidationError
from app.services.billing import billing_service, SubscriptionTier

logger = logging.getLogger(__name__)

class PortfolioService:
    """Advanced portfolio tracking and analytics service"""
    
    def __init__(self):
        # Mock price data - in production, integrate with CoinGecko/CoinMarketCap
        self.price_cache = {
            "bitcoin": {"usd": 42000.0, "brl": 210000.0, "change_24h": 2.5},
            "ethereum": {"usd": 2500.0, "brl": 12500.0, "change_24h": 1.8},
            "solana": {"usd": 100.0, "brl": 500.0, "change_24h": 5.2},
            "cardano": {"usd": 0.45, "brl": 2.25, "change_24h": -1.3},
            "avalanche": {"usd": 35.0, "brl": 175.0, "change_24h": 3.1},
            "xrp": {"usd": 0.60, "brl": 3.0, "change_24h": -0.8},
            "usdc": {"usd": 1.0, "brl": 5.0, "change_24h": 0.0},
            "usdt": {"usd": 1.0, "brl": 5.0, "change_24h": 0.0}
        }
    
    async def get_portfolio_overview(
        self,
        db: Session,
        user_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive portfolio overview with analytics"""
        try:
            # Check if user has portfolio tracking feature
            has_access = await billing_service.check_feature_access(
                db, user_id, "portfolio_tracking"
            )
            
            if not has_access:
                return {
                    "error": "Portfolio tracking requires Basic subscription or higher",
                    "upgrade_url": "/billing/upgrade",
                    "subscription_required": "basic"
                }
            
            # Get user wallets (mock data for demo)
            wallets = await self._get_user_wallets(db, user_id)
            
            if not wallets:
                return {
                    "total_value_usd": 0,
                    "total_value_brl": 0,
                    "total_change_24h": 0,
                    "wallets": [],
                    "asset_allocation": [],
                    "top_performers": [],
                    "total_pnl": 0
                }
            
            # Calculate portfolio metrics
            portfolio_data = await self._calculate_portfolio_metrics(wallets)
            
            # Add premium features for higher tiers
            subscription = await billing_service.get_user_subscription(db, user_id)
            tier = subscription["tier"]
            
            if tier in [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE]:
                portfolio_data["advanced_analytics"] = await self._get_advanced_analytics(wallets)
                portfolio_data["risk_metrics"] = await self._calculate_risk_metrics(wallets)
                portfolio_data["rebalance_suggestions"] = await self._get_rebalance_suggestions(wallets)
            
            return portfolio_data
            
        except Exception as e:
            logger.error(f"Failed to get portfolio overview: {e}")
            raise ValidationError(f"Failed to get portfolio overview: {str(e)}")
    
    async def _get_user_wallets(self, db: Session, user_id: str) -> List[Dict]:
        """Get user wallets with balances (mock data)"""
        # In production, this would query the database
        return [
            {
                "wallet_id": "1",
                "name": "Bitcoin Wallet",
                "network": "bitcoin",
                "balance": "0.5",
                "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            },
            {
                "wallet_id": "2", 
                "name": "Ethereum Wallet",
                "network": "ethereum",
                "balance": "2.3",
                "address": "0x742d35Cc6634C0532925a3b8D39e4E4c9F5CF312"
            },
            {
                "wallet_id": "3",
                "name": "Solana Wallet", 
                "network": "solana",
                "balance": "45.7",
                "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
            },
            {
                "wallet_id": "4",
                "name": "USDC Wallet",
                "network": "usdc", 
                "balance": "1500.0",
                "address": "0x742d35Cc6634C0532925a3b8D39e4E4c9F5CF312"
            }
        ]
    
    async def _calculate_portfolio_metrics(self, wallets: List[Dict]) -> Dict[str, Any]:
        """Calculate comprehensive portfolio metrics"""
        total_value_usd = 0
        total_value_brl = 0
        total_change_24h = 0
        asset_allocation = []
        
        for wallet in wallets:
            network = wallet["network"]
            balance = float(wallet["balance"])
            
            if network in self.price_cache:
                price_data = self.price_cache[network]
                value_usd = balance * price_data["usd"]
                value_brl = balance * price_data["brl"]
                change_24h = value_usd * (price_data["change_24h"] / 100)
                
                total_value_usd += value_usd
                total_value_brl += value_brl
                total_change_24h += change_24h
                
                asset_allocation.append({
                    "asset": network.upper(),
                    "balance": balance,
                    "value_usd": value_usd,
                    "value_brl": value_brl,
                    "percentage": 0,  # Will calculate after total
                    "change_24h_usd": change_24h,
                    "change_24h_percent": price_data["change_24h"]
                })
        
        # Calculate percentages
        for asset in asset_allocation:
            asset["percentage"] = (asset["value_usd"] / total_value_usd * 100) if total_value_usd > 0 else 0
        
        # Sort by value
        asset_allocation.sort(key=lambda x: x["value_usd"], reverse=True)
        
        # Find top/worst performers
        top_performers = sorted(asset_allocation, key=lambda x: x["change_24h_percent"], reverse=True)[:3]
        worst_performers = sorted(asset_allocation, key=lambda x: x["change_24h_percent"])[:3]
        
        return {
            "total_value_usd": round(total_value_usd, 2),
            "total_value_brl": round(total_value_brl, 2),
            "total_change_24h_usd": round(total_change_24h, 2),
            "total_change_24h_percent": round((total_change_24h / (total_value_usd - total_change_24h) * 100), 2) if total_value_usd > 0 else 0,
            "asset_allocation": asset_allocation,
            "top_performers": top_performers,
            "worst_performers": worst_performers,
            "diversification_score": await self._calculate_diversification_score(asset_allocation)
        }
    
    async def _get_advanced_analytics(self, wallets: List[Dict]) -> Dict[str, Any]:
        """Calculate advanced portfolio analytics for PRO users"""
        return {
            "sharpe_ratio": 1.25,  # Mock data
            "max_drawdown": -15.3,
            "volatility": 45.2,
            "beta": 1.12,
            "alpha": 2.8,
            "correlation_matrix": {
                "BTC": {"ETH": 0.72, "SOL": 0.65, "ADA": 0.58},
                "ETH": {"BTC": 0.72, "SOL": 0.78, "ADA": 0.63},
                "SOL": {"BTC": 0.65, "ETH": 0.78, "ADA": 0.55}
            },
            "value_at_risk_95": -12.5,  # 95% VaR
            "expected_return_30d": 8.3
        }
    
    async def _calculate_risk_metrics(self, wallets: List[Dict]) -> Dict[str, Any]:
        """Calculate portfolio risk metrics"""
        return {
            "risk_score": 7.2,  # 1-10 scale
            "risk_level": "Moderate-High",
            "concentration_risk": 6.8,
            "correlation_risk": 5.5,
            "liquidity_risk": 3.2,
            "recommendations": [
                "Consider reducing Bitcoin allocation to improve diversification",
                "Add stablecoins to reduce overall portfolio volatility",
                "Monitor correlation between SOL and ETH positions"
            ]
        }
    
    async def _get_rebalance_suggestions(self, wallets: List[Dict]) -> List[Dict]:
        """Get portfolio rebalancing suggestions"""
        return [
            {
                "action": "reduce",
                "asset": "BTC", 
                "current_allocation": 45.2,
                "target_allocation": 35.0,
                "reason": "Overweight in Bitcoin increases concentration risk",
                "priority": "high"
            },
            {
                "action": "increase",
                "asset": "USDC",
                "current_allocation": 15.1,
                "target_allocation": 25.0,
                "reason": "Increase stablecoin allocation to reduce volatility",
                "priority": "medium"
            },
            {
                "action": "add",
                "asset": "DOT",
                "current_allocation": 0,
                "target_allocation": 5.0,
                "reason": "Add Polkadot for better diversification",
                "priority": "low"
            }
        ]
    
    async def _calculate_diversification_score(self, asset_allocation: List[Dict]) -> float:
        """Calculate portfolio diversification score (0-100)"""
        if not asset_allocation:
            return 0
        
        # Simple diversification score based on allocation distribution
        percentages = [asset["percentage"] for asset in asset_allocation]
        
        # Penalize concentration
        max_allocation = max(percentages) if percentages else 0
        
        if max_allocation > 50:
            return 30  # Poor diversification
        elif max_allocation > 30:
            return 60  # Moderate diversification  
        else:
            return 85  # Good diversification
    
    async def get_performance_analytics(
        self,
        db: Session,
        user_id: str,
        period: str = "30d"
    ) -> Dict[str, Any]:
        """Get detailed performance analytics"""
        try:
            # Check subscription access
            has_access = await billing_service.check_feature_access(
                db, user_id, "advanced_analytics"
            )
            
            if not has_access:
                return {
                    "error": "Advanced analytics requires Basic subscription or higher",
                    "subscription_required": "basic"
                }
            
            # Mock performance data
            performance_data = {
                "period": period,
                "total_return": 12.5,  # %
                "total_return_usd": 2150.30,
                "benchmark_return": 8.2,  # Market benchmark
                "excess_return": 4.3,
                "best_day": {"date": "2024-11-15", "return": 8.7},
                "worst_day": {"date": "2024-11-08", "return": -5.2},
                "win_rate": 62.5,  # % of positive days
                "average_daily_return": 0.42,
                "daily_returns": self._generate_mock_daily_returns(period)
            }
            
            return performance_data
            
        except Exception as e:
            logger.error(f"Failed to get performance analytics: {e}")
            raise ValidationError(f"Failed to get performance analytics: {str(e)}")
    
    def _generate_mock_daily_returns(self, period: str) -> List[Dict]:
        """Generate mock daily returns data"""
        import random
        
        days = 30 if period == "30d" else 90 if period == "90d" else 365
        returns = []
        
        base_date = datetime.now() - timedelta(days=days)
        
        for i in range(days):
            date = base_date + timedelta(days=i)
            daily_return = random.uniform(-5.0, 8.0)  # Mock return between -5% and +8%
            
            returns.append({
                "date": date.strftime("%Y-%m-%d"),
                "return_percent": round(daily_return, 2),
                "portfolio_value": round(20000 * (1 + daily_return/100), 2)
            })
        
        return returns
    
    async def create_price_alert(
        self,
        db: Session,
        user_id: str,
        asset: str,
        condition: str,  # "above", "below"
        target_price: float,
        notification_method: str = "email"
    ) -> Dict[str, Any]:
        """Create a price alert for an asset"""
        try:
            # Check usage limits
            current_alerts = 3  # Mock current count
            usage_check = await billing_service.check_usage_limit(
                db, user_id, "price_alerts", current_alerts
            )
            
            if not usage_check["within_limit"]:
                return {
                    "error": f"Price alert limit reached. You can create {usage_check['limit']} alerts with your current plan.",
                    "current_usage": current_alerts,
                    "limit": usage_check["limit"],
                    "subscription_required": "basic" if usage_check["limit"] < 25 else None
                }
            
            # Create price alert (mock)
            alert_data = {
                "alert_id": f"alert_{user_id}_{asset}_{datetime.now().timestamp()}",
                "user_id": user_id,
                "asset": asset.upper(),
                "condition": condition,
                "target_price": target_price,
                "current_price": self.price_cache.get(asset.lower(), {}).get("usd", 0),
                "notification_method": notification_method,
                "is_active": True,
                "created_at": datetime.now()
            }
            
            return alert_data
            
        except Exception as e:
            logger.error(f"Failed to create price alert: {e}")
            raise ValidationError(f"Failed to create price alert: {str(e)}")

# Global instance
portfolio_service = PortfolioService()
