"""
User Portfolio Service
Manages user's portfolio holdings and cost basis tracking
"""

from typing import List, Dict, Optional, Any, Union
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timezone
import logging

from app.models.portfolio import UserPortfolioAsset
from app.services.price_aggregator import price_aggregator

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for managing user portfolio"""

    async def get_user_portfolio(
        self, 
        db: Session, 
        user_id: Union[UUID, str],
        include_prices: bool = True
    ) -> List[Dict]:
        """
        Get user's full portfolio with current prices and P&L.
        
        Args:
            db: Database session
            user_id: User ID
            include_prices: Whether to fetch current prices
            
        Returns:
            List of portfolio assets with P&L data
        """
        try:
            # Get user's portfolio assets from database
            assets = db.query(UserPortfolioAsset).filter(
                and_(
                    UserPortfolioAsset.user_id == user_id,
                    UserPortfolioAsset.is_active == True,
                    UserPortfolioAsset.total_amount > 0
                )
            ).all()
            
            if not assets:
                logger.info(f"No portfolio assets found for user {user_id}")
                return []
            
            # Get current prices for all symbols
            current_prices = {}
            if include_prices:
                symbols = [asset.symbol for asset in assets]
                try:
                    price_data = await price_aggregator.get_prices(symbols, "usd")
                    for symbol, data in price_data.items():
                        if data and data.price > 0:
                            current_prices[symbol] = data.price
                except Exception as e:
                    logger.warning(f"Error fetching prices: {e}")
            
            # Build portfolio response
            portfolio = []
            for asset in assets:
                current_price = current_prices.get(asset.symbol, 0)
                value_usd = asset.total_amount * current_price if current_price > 0 else 0
                
                # Calculate P&L
                pnl_amount = 0
                pnl_percent = 0
                if asset.cost_basis > 0 and current_price > 0:
                    pnl_amount = (current_price - asset.cost_basis) * asset.total_amount
                    pnl_percent = ((current_price - asset.cost_basis) / asset.cost_basis) * 100
                
                portfolio.append({
                    "symbol": asset.symbol,
                    "network": asset.network,
                    "amount": asset.total_amount,
                    "current_price": current_price,
                    "value_usd": value_usd,
                    "cost_basis": asset.cost_basis,
                    "total_invested": asset.total_invested,
                    "pnl_amount": pnl_amount,
                    "pnl_percent": pnl_percent,
                    "last_updated": asset.last_updated.isoformat() if asset.last_updated else None,
                })
            
            # Sort by value (highest first)
            portfolio.sort(key=lambda x: x['value_usd'], reverse=True)
            
            logger.info(f"Portfolio for user {user_id}: {len(portfolio)} assets")
            return portfolio
            
        except Exception as e:
            logger.error(f"Error getting portfolio for user {user_id}: {e}")
            raise

    async def update_portfolio_on_buy(
        self,
        db: Session,
        user_id: Union[UUID, str],
        symbol: str,
        amount: float,
        price_usd: float,
        network: Optional[str] = None
    ) -> UserPortfolioAsset:
        """
        Update portfolio when user buys crypto.
        Uses weighted average for cost basis calculation.
        
        Args:
            db: Database session
            user_id: User ID
            symbol: Crypto symbol (BTC, ETH, etc.)
            amount: Amount purchased
            price_usd: Purchase price per unit in USD
            network: Optional network (bitcoin, ethereum, etc.)
            
        Returns:
            Updated portfolio asset
        """
        try:
            symbol = symbol.upper()
            
            # Find existing asset or create new
            asset = db.query(UserPortfolioAsset).filter(
                and_(
                    UserPortfolioAsset.user_id == user_id,
                    UserPortfolioAsset.symbol == symbol
                )
            ).first()
            
            if asset:
                # Update existing with weighted average
                asset.update_cost_basis(amount, price_usd)
                if network:
                    asset.network = network
            else:
                # Create new asset
                asset = UserPortfolioAsset(
                    user_id=user_id,
                    symbol=symbol,
                    network=network,
                    total_amount=amount,
                    cost_basis=price_usd,
                    total_invested=amount * price_usd,
                )
                db.add(asset)
            
            db.commit()
            db.refresh(asset)
            
            logger.info(f"Portfolio updated: User {user_id} bought {amount} {symbol} @ ${price_usd}")
            return asset
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating portfolio on buy: {e}")
            raise

    async def update_portfolio_on_sell(
        self,
        db: Session,
        user_id: Union[UUID, str],
        symbol: str,
        amount: float
    ) -> Optional[UserPortfolioAsset]:
        """
        Update portfolio when user sells crypto.
        
        Args:
            db: Database session
            user_id: User ID
            symbol: Crypto symbol
            amount: Amount sold
            
        Returns:
            Updated portfolio asset or None if not found
        """
        try:
            symbol = symbol.upper()
            
            asset = db.query(UserPortfolioAsset).filter(
                and_(
                    UserPortfolioAsset.user_id == user_id,
                    UserPortfolioAsset.symbol == symbol
                )
            ).first()
            
            if not asset:
                logger.warning(f"No portfolio asset found for user {user_id}, symbol {symbol}")
                return None
            
            asset.remove_from_holdings(amount)
            
            # Deactivate if amount reaches zero
            if asset.total_amount <= 0:
                asset.is_active = False
            
            db.commit()
            db.refresh(asset)
            
            logger.info(f"Portfolio updated: User {user_id} sold {amount} {symbol}")
            return asset
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating portfolio on sell: {e}")
            raise

    async def sync_portfolio_from_balances(
        self,
        db: Session,
        user_id: Union[UUID, str],
        balances: Dict[str, float],
        prices: Optional[Dict[str, float]] = None
    ) -> List[UserPortfolioAsset]:
        """
        Sync portfolio with actual wallet balances.
        Creates portfolio entries for new assets with current price as cost basis.
        
        Args:
            db: Database session
            user_id: User ID
            balances: Dict of symbol -> amount from wallet
            prices: Optional dict of symbol -> current price
            
        Returns:
            List of synced portfolio assets
        """
        try:
            synced = []
            
            # Get prices if not provided
            if not prices and balances:
                try:
                    price_data = await price_aggregator.get_prices(list(balances.keys()), "usd")
                    prices = {s: d.price for s, d in price_data.items() if d and d.price > 0}
                except Exception as e:
                    logger.warning(f"Error fetching prices for sync: {e}")
                    prices = {}
            
            for symbol, amount in balances.items():
                if amount <= 0:
                    continue
                    
                symbol = symbol.upper()
                current_price = prices.get(symbol, 0)
                
                # Find or create asset
                asset = db.query(UserPortfolioAsset).filter(
                    and_(
                        UserPortfolioAsset.user_id == user_id,
                        UserPortfolioAsset.symbol == symbol
                    )
                ).first()
                
                if asset:
                    # Update amount from wallet (don't change cost basis)
                    asset.total_amount = amount
                    asset.is_active = True
                    asset.last_updated = datetime.now(timezone.utc)
                else:
                    # Create new with current price as cost basis (first time)
                    asset = UserPortfolioAsset(
                        user_id=user_id,
                        symbol=symbol,
                        total_amount=amount,
                        cost_basis=current_price if current_price > 0 else 0,
                        total_invested=amount * current_price if current_price > 0 else 0,
                    )
                    db.add(asset)
                
                synced.append(asset)
            
            db.commit()
            logger.info(f"Portfolio synced for user {user_id}: {len(synced)} assets")
            
            return synced
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error syncing portfolio: {e}")
            raise

    def get_portfolio_summary(self, portfolio: List[Dict]) -> Dict:
        """
        Calculate portfolio summary statistics.
        
        Args:
            portfolio: List of portfolio assets
            
        Returns:
            Summary dict with totals and averages
        """
        if not portfolio:
            return {
                "total_value_usd": 0,
                "total_invested": 0,
                "total_pnl_amount": 0,
                "total_pnl_percent": 0,
                "asset_count": 0,
                "profitable_count": 0,
                "losing_count": 0,
            }
        
        total_value = sum(a['value_usd'] for a in portfolio)
        total_invested = sum(a['total_invested'] for a in portfolio)
        total_pnl = sum(a['pnl_amount'] for a in portfolio)
        
        profitable = [a for a in portfolio if a['pnl_percent'] > 0]
        losing = [a for a in portfolio if a['pnl_percent'] < 0]
        
        return {
            "total_value_usd": total_value,
            "total_invested": total_invested,
            "total_pnl_amount": total_pnl,
            "total_pnl_percent": ((total_value - total_invested) / total_invested * 100) if total_invested > 0 else 0,
            "asset_count": len(portfolio),
            "profitable_count": len(profitable),
            "losing_count": len(losing),
        }


# Singleton instance
portfolio_service = PortfolioService()
