"""
📊 HOLD Wallet - Portfolio & Analytics API Endpoints
===================================================

API endpoints for advanced portfolio tracking, analytics, and performance metrics.
Includes cost basis tracking for P&L calculations.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.portfolio import UserPortfolioAsset
from app.services.portfolio import portfolio_service
from app.services.portfolio_service import portfolio_service as cost_basis_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# Pydantic Models for cost basis tracking
class PortfolioAssetWithPnL(BaseModel):
    """Portfolio asset with P&L data"""
    symbol: str
    network: Optional[str] = None
    amount: float
    current_price: float
    value_usd: float
    cost_basis: float
    total_invested: float
    pnl_amount: float
    pnl_percent: float
    last_updated: Optional[str] = None


class PortfolioSummaryResponse(BaseModel):
    """Portfolio summary statistics"""
    total_value_usd: float
    total_invested: float
    total_pnl_amount: float
    total_pnl_percent: float
    asset_count: int
    profitable_count: int
    losing_count: int


class FullPortfolioResponse(BaseModel):
    """Full portfolio response with assets and summary"""
    assets: List[PortfolioAssetWithPnL]
    summary: PortfolioSummaryResponse


class BuyAssetRequest(BaseModel):
    """Request to record a buy transaction"""
    symbol: str = Field(..., description="Crypto symbol")
    amount: float = Field(..., gt=0, description="Amount purchased")
    price_usd: float = Field(..., gt=0, description="Purchase price per unit")
    network: Optional[str] = Field(None, description="Network name")


class SellAssetRequest(BaseModel):
    """Request to record a sell transaction"""
    symbol: str = Field(..., description="Crypto symbol")
    amount: float = Field(..., gt=0, description="Amount sold")


class SyncBalancesRequest(BaseModel):
    """Request to sync portfolio with wallet balances"""
    balances: Dict[str, float] = Field(..., description="Dict of symbol -> amount")


class UpdateCostBasisRequest(BaseModel):
    """Request to manually update cost basis"""
    symbol: str = Field(..., description="Crypto symbol")
    cost_basis: float = Field(..., ge=0, description="New cost basis per unit")


# ============================================
# NEW: Cost Basis Tracking Endpoints
# ============================================

@router.get("/holdings", response_model=FullPortfolioResponse)
async def get_holdings_with_pnl(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's portfolio holdings with P&L calculated from cost basis.
    
    Returns all assets with:
    - Current market prices
    - Unrealized P&L (amount and percentage)
    - Cost basis per unit
    - Total invested amount
    """
    try:
        portfolio = await cost_basis_service.get_user_portfolio(
            db=db,
            user_id=current_user.id,
            include_prices=True
        )
        
        summary = cost_basis_service.get_portfolio_summary(portfolio)
        
        return FullPortfolioResponse(
            assets=portfolio,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving portfolio: {str(e)}"
        )


@router.get("/holdings/summary", response_model=PortfolioSummaryResponse)
async def get_holdings_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get portfolio P&L summary only (faster endpoint)."""
    try:
        portfolio = await cost_basis_service.get_user_portfolio(
            db=db,
            user_id=current_user.id,
            include_prices=True
        )
        
        return cost_basis_service.get_portfolio_summary(portfolio)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving summary: {str(e)}"
        )


@router.post("/holdings/buy", response_model=PortfolioAssetWithPnL)
async def record_buy_transaction(
    request: BuyAssetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a buy transaction and update portfolio cost basis.
    Uses weighted average method for cost basis calculation.
    """
    try:
        asset = await cost_basis_service.update_portfolio_on_buy(
            db=db,
            user_id=current_user.id,
            symbol=request.symbol,
            amount=request.amount,
            price_usd=request.price_usd,
            network=request.network
        )
        
        return PortfolioAssetWithPnL(
            symbol=asset.symbol,
            network=asset.network,
            amount=asset.total_amount,
            current_price=request.price_usd,
            value_usd=asset.total_amount * request.price_usd,
            cost_basis=asset.cost_basis,
            total_invested=asset.total_invested,
            pnl_amount=0,
            pnl_percent=0,
            last_updated=asset.last_updated.isoformat() if asset.last_updated else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recording buy: {str(e)}"
        )


@router.post("/holdings/sell")
async def record_sell_transaction(
    request: SellAssetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a sell transaction and update portfolio."""
    try:
        asset = await cost_basis_service.update_portfolio_on_sell(
            db=db,
            user_id=current_user.id,
            symbol=request.symbol,
            amount=request.amount
        )
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset {request.symbol} not found in portfolio"
            )
        
        return {"status": "success", "remaining_amount": asset.total_amount}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recording sell: {str(e)}"
        )


@router.post("/holdings/sync")
async def sync_with_wallet_balances(
    request: SyncBalancesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync portfolio with actual wallet balances.
    New assets use current price as cost basis.
    Existing assets preserve their cost basis.
    """
    try:
        assets = await cost_basis_service.sync_portfolio_from_balances(
            db=db,
            user_id=current_user.id,
            balances=request.balances
        )
        
        return {
            "status": "success",
            "synced_count": len(assets),
            "message": f"Synced {len(assets)} assets with wallet balances"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing: {str(e)}"
        )


@router.put("/holdings/cost-basis")
async def update_asset_cost_basis(
    request: UpdateCostBasisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually update cost basis for an asset (for imported wallets)."""
    try:
        asset = db.query(UserPortfolioAsset).filter(
            and_(
                UserPortfolioAsset.user_id == current_user.id,
                UserPortfolioAsset.symbol == request.symbol.upper()
            )
        ).first()
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset {request.symbol} not found"
            )
        
        asset.cost_basis = request.cost_basis
        asset.total_invested = asset.total_amount * request.cost_basis
        db.commit()
        
        return {
            "status": "success",
            "symbol": asset.symbol,
            "new_cost_basis": asset.cost_basis,
            "total_invested": asset.total_invested
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating cost basis: {str(e)}"
        )


# ============================================
# ORIGINAL: Portfolio Analytics Endpoints
# ============================================

@router.get("/overview")
async def get_portfolio_overview(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get comprehensive portfolio overview with analytics"""
    try:
        overview = await portfolio_service.get_portfolio_overview(db, user_id)
        
        return {
            "success": True,
            "portfolio": overview
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/performance")
async def get_performance_analytics(
    user_id: str,
    period: str = Query(default="30d", regex="^(7d|30d|90d|1y)$"),
    db: Session = Depends(get_db)
):
    """Get detailed performance analytics for different time periods"""
    try:
        performance = await portfolio_service.get_performance_analytics(db, user_id, period)
        
        return {
            "success": True,
            "performance": performance
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/alerts")
async def create_price_alert(
    user_id: str,
    asset: str,
    condition: str,
    target_price: float,
    notification_method: str = "email",
    db: Session = Depends(get_db)
):
    """Create a price alert for an asset"""
    try:
        if condition not in ["above", "below"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Condition must be 'above' or 'below'"
            )
        
        alert = await portfolio_service.create_price_alert(
            db, user_id, asset, condition, target_price, notification_method
        )
        
        return {
            "success": True,
            "alert": alert,
            "message": f"Price alert created! You'll be notified when {asset.upper()} goes {condition} ${target_price}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/analytics/risk")
async def get_risk_analytics(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get portfolio risk analysis (PRO feature)"""
    try:
        # This is included in the portfolio overview for PRO users
        overview = await portfolio_service.get_portfolio_overview(db, user_id)
        
        if "risk_metrics" not in overview:
            return {
                "success": False,
                "error": "Risk analytics requires PRO subscription",
                "subscription_required": "pro"
            }
        
        return {
            "success": True,
            "risk_metrics": overview["risk_metrics"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/analytics/rebalance")
async def get_rebalance_suggestions(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get portfolio rebalancing suggestions (PRO feature)"""
    try:
        overview = await portfolio_service.get_portfolio_overview(db, user_id)
        
        if "rebalance_suggestions" not in overview:
            return {
                "success": False,
                "error": "Rebalance suggestions require PRO subscription",
                "subscription_required": "pro"
            }
        
        return {
            "success": True,
            "suggestions": overview["rebalance_suggestions"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/assets/prices")
async def get_asset_prices():
    """Get current prices for supported assets"""
    try:
        return {
            "success": True,
            "prices": portfolio_service.price_cache,
            "last_updated": "2024-11-24T12:00:00Z"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/dashboard")
async def get_portfolio_dashboard(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get complete portfolio dashboard data"""
    try:
        # Get all portfolio data in one call for dashboard
        overview = await portfolio_service.get_portfolio_overview(db, user_id)
        performance_30d = await portfolio_service.get_performance_analytics(db, user_id, "30d")
        
        dashboard_data = {
            "overview": overview,
            "performance": performance_30d,
            "quick_stats": {
                "total_assets": len(overview.get("asset_allocation", [])),
                "best_performer": overview.get("top_performers", [{}])[0].get("asset", "N/A") if overview.get("top_performers") else "N/A",
                "portfolio_diversity": overview.get("diversification_score", 0),
                "risk_level": "Moderate" if overview.get("total_value_usd", 0) > 1000 else "Low"
            }
        }
        
        return {
            "success": True,
            "dashboard": dashboard_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
