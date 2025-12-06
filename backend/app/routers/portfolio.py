"""
📊 HOLD Wallet - Portfolio & Analytics API Endpoints
===================================================

API endpoints for advanced portfolio tracking, analytics, and performance metrics.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.db.database import get_db
from app.services.portfolio import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

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
