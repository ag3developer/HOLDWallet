"""
💰 HOLD Wallet - Billing & Subscription API Endpoints
====================================================

API endpoints for managing user subscriptions, billing, and premium features.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.db.database import get_db
from app.services.billing import billing_service, SubscriptionTier, BillingCycle, PaymentMethod

router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/subscription")
async def get_subscription(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user's current subscription details"""
    try:
        subscription = await billing_service.get_user_subscription(db, user_id)
        return {
            "success": True,
            "subscription": subscription
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans with pricing"""
    return {
        "success": True,
        "plans": [
            {
                "tier": SubscriptionTier.FREE,
                "name": "Free",
                "description": "Perfect for crypto beginners",
                "price_monthly": 0,
                "price_quarterly": 0,
                "price_yearly": 0,
                "benefits": billing_service.get_subscription_benefits(SubscriptionTier.FREE),
                "features": billing_service.FEATURE_LIMITS[SubscriptionTier.FREE]
            },
            {
                "tier": SubscriptionTier.BASIC,
                "name": "Basic",
                "description": "Advanced portfolio tracking",
                "price_monthly": 9.99,
                "price_quarterly": 26.97,
                "price_yearly": 95.90,
                "benefits": billing_service.get_subscription_benefits(SubscriptionTier.BASIC),
                "features": billing_service.FEATURE_LIMITS[SubscriptionTier.BASIC]
            },
            {
                "tier": SubscriptionTier.PRO,
                "name": "Pro",
                "description": "Complete crypto management suite",
                "price_monthly": 19.99,
                "price_quarterly": 53.97,
                "price_yearly": 191.90,
                "benefits": billing_service.get_subscription_benefits(SubscriptionTier.PRO),
                "features": billing_service.FEATURE_LIMITS[SubscriptionTier.PRO]
            },
            {
                "tier": SubscriptionTier.ENTERPRISE,
                "name": "Enterprise",
                "description": "Full-scale business solutions",
                "price_monthly": 99.99,
                "price_quarterly": 269.97,
                "price_yearly": 959.90,
                "benefits": billing_service.get_subscription_benefits(SubscriptionTier.ENTERPRISE),
                "features": billing_service.FEATURE_LIMITS[SubscriptionTier.ENTERPRISE]
            }
        ]
    }

@router.post("/upgrade")
async def upgrade_subscription(
    user_id: str,
    tier: SubscriptionTier,
    billing_cycle: BillingCycle = BillingCycle.MONTHLY,
    payment_method: PaymentMethod = PaymentMethod.PIX,
    db: Session = Depends(get_db)
):
    """Upgrade user to a premium subscription"""
    try:
        subscription = await billing_service.upgrade_subscription(
            db, user_id, tier, billing_cycle, payment_method
        )
        
        return {
            "success": True,
            "message": f"Successfully upgraded to {tier.value.title()}!",
            "subscription": subscription,
            "next_steps": [
                "Your premium features are now active",
                "Check your email for the invoice",
                "Explore your new portfolio analytics"
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/features/{feature_name}")
async def check_feature_access(
    user_id: str,
    feature_name: str,
    db: Session = Depends(get_db)
):
    """Check if user has access to a specific feature"""
    try:
        has_access = await billing_service.check_feature_access(db, user_id, feature_name)
        subscription = await billing_service.get_user_subscription(db, user_id)
        
        return {
            "success": True,
            "has_access": has_access,
            "feature": feature_name,
            "current_tier": subscription["tier"],
            "required_tier": "basic" if not has_access else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/usage/{metric_type}")
async def check_usage_limits(
    user_id: str,
    metric_type: str,
    current_usage: int = 0,
    db: Session = Depends(get_db)
):
    """Check usage limits for a specific metric"""
    try:
        usage_info = await billing_service.check_usage_limit(
            db, user_id, metric_type, current_usage
        )
        
        return {
            "success": True,
            "usage_info": usage_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/invoice")
async def generate_invoice(
    user_id: str,
    subscription_id: str,
    db: Session = Depends(get_db)
):
    """Generate invoice for subscription billing"""
    try:
        invoice = await billing_service.generate_invoice(db, user_id, subscription_id)
        
        return {
            "success": True,
            "invoice": invoice
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/revenue-stats")
async def get_revenue_stats():
    """Get revenue statistics (admin endpoint)"""
    # This would be protected by admin authentication in production
    return {
        "success": True,
        "stats": {
            "mrr": 45000.00,  # Monthly Recurring Revenue
            "arr": 540000.00,  # Annual Recurring Revenue  
            "total_subscribers": {
                "free": 8500,
                "basic": 1200,
                "pro": 350,
                "enterprise": 25
            },
            "conversion_rates": {
                "free_to_basic": 12.5,
                "basic_to_pro": 28.3,
                "pro_to_enterprise": 7.1
            },
            "churn_rate": 4.2,
            "ltv_cac_ratio": 3.8,
            "growth_rate": 15.2
        }
    }
