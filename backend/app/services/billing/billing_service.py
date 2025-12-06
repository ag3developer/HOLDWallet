"""
🏦 HOLD Wallet - Billing & Subscription Service
==============================================

Manages user subscriptions, billing cycles, and payment processing
for premium features and services.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import logging

from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

class SubscriptionTier(str, Enum):
    """Subscription tiers for different feature levels"""
    FREE = "free"
    BASIC = "basic"          # R$ 9.99/mês
    PRO = "pro"              # R$ 19.99/mês
    ENTERPRISE = "enterprise" # R$ 99.99/mês

class BillingCycle(str, Enum):
    """Billing cycle options"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"  # 10% discount
    YEARLY = "yearly"        # 20% discount

class PaymentMethod(str, Enum):
    """Supported payment methods"""
    CREDIT_CARD = "credit_card"
    PIX = "pix"
    CRYPTO = "crypto"
    BANK_TRANSFER = "bank_transfer"

class BillingService:
    """Service for handling subscriptions and billing operations"""
    
    # Pricing structure (in BRL cents to avoid float precision issues)
    PRICING = {
        SubscriptionTier.FREE: {
            BillingCycle.MONTHLY: 0,
            BillingCycle.QUARTERLY: 0,
            BillingCycle.YEARLY: 0
        },
        SubscriptionTier.BASIC: {
            BillingCycle.MONTHLY: 999,      # R$ 9.99
            BillingCycle.QUARTERLY: 2697,   # R$ 26.97 (10% off)
            BillingCycle.YEARLY: 9590       # R$ 95.90 (20% off)
        },
        SubscriptionTier.PRO: {
            BillingCycle.MONTHLY: 1999,     # R$ 19.99
            BillingCycle.QUARTERLY: 5397,   # R$ 53.97 (10% off)
            BillingCycle.YEARLY: 19190      # R$ 191.90 (20% off)
        },
        SubscriptionTier.ENTERPRISE: {
            BillingCycle.MONTHLY: 9999,     # R$ 99.99
            BillingCycle.QUARTERLY: 26997,  # R$ 269.97 (10% off)
            BillingCycle.YEARLY: 95990      # R$ 959.90 (20% off)
        }
    }
    
    # Feature limits per tier
    FEATURE_LIMITS = {
        SubscriptionTier.FREE: {
            "max_wallets": 3,
            "max_price_alerts": 5,
            "portfolio_tracking": False,
            "advanced_analytics": False,
            "tax_reporting": False,
            "priority_support": False,
            "api_calls_per_day": 100
        },
        SubscriptionTier.BASIC: {
            "max_wallets": 10,
            "max_price_alerts": 25,
            "portfolio_tracking": True,
            "advanced_analytics": True,
            "tax_reporting": False,
            "priority_support": False,
            "api_calls_per_day": 1000
        },
        SubscriptionTier.PRO: {
            "max_wallets": 50,
            "max_price_alerts": 100,
            "portfolio_tracking": True,
            "advanced_analytics": True,
            "tax_reporting": True,
            "priority_support": True,
            "api_calls_per_day": 10000
        },
        SubscriptionTier.ENTERPRISE: {
            "max_wallets": -1,  # Unlimited
            "max_price_alerts": -1,  # Unlimited
            "portfolio_tracking": True,
            "advanced_analytics": True,
            "tax_reporting": True,
            "priority_support": True,
            "api_calls_per_day": 100000,
            "white_label_api": True,
            "custom_integrations": True
        }
    }
    
    def __init__(self):
        pass
    
    async def get_user_subscription(
        self,
        db: Session,
        user_id: str
    ) -> Dict[str, Any]:
        """Get user's current subscription details"""
        try:
            # This would query the subscription table
            # For now, return free tier as default
            return {
                "user_id": user_id,
                "tier": SubscriptionTier.FREE,
                "billing_cycle": BillingCycle.MONTHLY,
                "status": "active",
                "current_period_end": None,
                "features": self.FEATURE_LIMITS[SubscriptionTier.FREE]
            }
        except Exception as e:
            logger.error(f"Failed to get user subscription: {e}")
            raise ValidationError(f"Failed to get user subscription: {str(e)}")
    
    async def upgrade_subscription(
        self,
        db: Session,
        user_id: str,
        new_tier: SubscriptionTier,
        billing_cycle: BillingCycle = BillingCycle.MONTHLY,
        payment_method: PaymentMethod = PaymentMethod.PIX
    ) -> Dict[str, Any]:
        """Upgrade user to a premium subscription tier"""
        try:
            # Calculate pricing
            amount_cents = self.PRICING[new_tier][billing_cycle]
            amount_reals = amount_cents / 100
            
            # Calculate next billing date
            if billing_cycle == BillingCycle.MONTHLY:
                next_billing = datetime.now() + timedelta(days=30)
            elif billing_cycle == BillingCycle.QUARTERLY:
                next_billing = datetime.now() + timedelta(days=90)
            else:  # YEARLY
                next_billing = datetime.now() + timedelta(days=365)
            
            # Create subscription record (would save to database)
            subscription_data = {
                "subscription_id": str(uuid.uuid4()),
                "user_id": user_id,
                "tier": new_tier,
                "billing_cycle": billing_cycle,
                "amount_cents": amount_cents,
                "amount_reals": amount_reals,
                "payment_method": payment_method,
                "status": "active",
                "current_period_start": datetime.now(),
                "current_period_end": next_billing,
                "features": self.FEATURE_LIMITS[new_tier]
            }
            
            logger.info(f"User {user_id} upgraded to {new_tier} - R$ {amount_reals:.2f}")
            
            return subscription_data
            
        except Exception as e:
            logger.error(f"Failed to upgrade subscription: {e}")
            raise ValidationError(f"Failed to upgrade subscription: {str(e)}")
    
    async def check_feature_access(
        self,
        db: Session,
        user_id: str,
        feature_name: str
    ) -> bool:
        """Check if user has access to a specific feature"""
        try:
            subscription = await self.get_user_subscription(db, user_id)
            features = subscription["features"]
            
            # Check boolean features
            if feature_name in features:
                return features[feature_name]
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check feature access: {e}")
            return False
    
    async def check_usage_limit(
        self,
        db: Session,
        user_id: str,
        limit_type: str,
        current_usage: int
    ) -> Dict[str, Any]:
        """Check if user is within usage limits"""
        try:
            subscription = await self.get_user_subscription(db, user_id)
            features = subscription["features"]
            
            limit_key = f"max_{limit_type}"
            if limit_key in features:
                max_limit = features[limit_key]
                
                # -1 means unlimited
                if max_limit == -1:
                    return {
                        "within_limit": True,
                        "current_usage": current_usage,
                        "limit": "unlimited",
                        "remaining": -1
                    }
                
                within_limit = current_usage < max_limit
                remaining = max(0, max_limit - current_usage)
                
                return {
                    "within_limit": within_limit,
                    "current_usage": current_usage,
                    "limit": max_limit,
                    "remaining": remaining
                }
            
            return {
                "within_limit": False,
                "current_usage": current_usage,
                "limit": 0,
                "remaining": 0
            }
            
        except Exception as e:
            logger.error(f"Failed to check usage limit: {e}")
            return {
                "within_limit": False,
                "current_usage": current_usage,
                "limit": 0,
                "remaining": 0
            }
    
    async def generate_invoice(
        self,
        db: Session,
        user_id: str,
        subscription_id: str
    ) -> Dict[str, Any]:
        """Generate invoice for subscription billing"""
        try:
            # Get subscription details
            subscription = await self.get_user_subscription(db, user_id)
            
            # Generate invoice
            invoice_data = {
                "invoice_id": str(uuid.uuid4()),
                "user_id": user_id,
                "subscription_id": subscription_id,
                "amount_cents": self.PRICING[subscription["tier"]][subscription["billing_cycle"]],
                "currency": "BRL",
                "status": "pending",
                "created_at": datetime.now(),
                "due_date": datetime.now() + timedelta(days=7),
                "description": f"HOLD Wallet {subscription['tier'].title()} - {subscription['billing_cycle']}"
            }
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"Failed to generate invoice: {e}")
            raise ValidationError(f"Failed to generate invoice: {str(e)}")
    
    def get_subscription_benefits(self, tier: SubscriptionTier) -> List[str]:
        """Get list of benefits for a subscription tier"""
        benefits = {
            SubscriptionTier.FREE: [
                "✅ Até 3 carteiras",
                "✅ 5 alertas de preço",
                "✅ Portfolio básico",
                "✅ Suporte community"
            ],
            SubscriptionTier.BASIC: [
                "✅ Até 10 carteiras",
                "✅ 25 alertas de preço", 
                "✅ Portfolio tracking avançado",
                "✅ Analytics detalhado",
                "✅ 1.000 API calls/dia"
            ],
            SubscriptionTier.PRO: [
                "✅ Até 50 carteiras",
                "✅ 100 alertas de preço",
                "✅ Relatórios de impostos automático",
                "✅ Suporte prioritário",
                "✅ 10.000 API calls/dia",
                "✅ DeFi yield tracking"
            ],
            SubscriptionTier.ENTERPRISE: [
                "✅ Carteiras ilimitadas",
                "✅ Alertas ilimitados",
                "✅ White-label API",
                "✅ Integrações customizadas", 
                "✅ 100.000 API calls/dia",
                "✅ Suporte dedicado 24/7",
                "✅ Custody solutions"
            ]
        }
        
        return benefits.get(tier, [])

# Global instance
billing_service = BillingService()
