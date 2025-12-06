"""
📊 HOLD Wallet - Subscription and Billing Models
===============================================

Database models for managing user subscriptions, billing cycles,
payments, and feature access control.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import BaseModel

class Subscription(BaseModel):
    """User subscription management"""
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Subscription details
    tier = Column(String, nullable=False)  # free, basic, pro, enterprise
    billing_cycle = Column(String, nullable=False)  # monthly, quarterly, yearly
    status = Column(String, nullable=False, default="active")  # active, cancelled, expired
    
    # Pricing
    amount_cents = Column(Integer, nullable=False, default=0)
    currency = Column(String, nullable=False, default="BRL")
    
    # Billing dates
    current_period_start = Column(DateTime, nullable=False, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=False)
    next_billing_date = Column(DateTime)
    
    # Payment info
    payment_method = Column(String)  # credit_card, pix, crypto, bank_transfer
    payment_provider = Column(String)  # stripe, mercadopago, etc
    external_subscription_id = Column(String)  # ID from payment provider
    
    # Metadata
    trial_end = Column(DateTime)
    cancelled_at = Column(DateTime)
    cancel_at_period_end = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Invoice(BaseModel):
    """Invoice management for billing"""
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True, index=True)
    subscription_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Invoice details
    invoice_number = Column(String, unique=True, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="BRL")
    
    # Status
    status = Column(String, nullable=False, default="pending")  # pending, paid, failed, cancelled
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    paid_at = Column(DateTime)
    
    # Payment details
    payment_method = Column(String)
    payment_provider = Column(String)
    payment_intent_id = Column(String)
    
    # Description
    description = Column(Text)
    line_items = Column(Text)  # JSON string of line items

class UsageMetric(BaseModel):
    """Track feature usage for billing limits"""
    __tablename__ = "usage_metrics"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Metric details
    metric_type = Column(String, nullable=False)  # wallets, price_alerts, api_calls, etc
    metric_value = Column(Integer, nullable=False, default=0)
    
    # Period tracking
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PaymentMethod(BaseModel):
    """Store user payment methods"""
    __tablename__ = "payment_methods"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Payment method details
    type = Column(String, nullable=False)  # credit_card, pix, crypto, bank_transfer
    provider = Column(String, nullable=False)  # stripe, mercadopago, etc
    external_id = Column(String, nullable=False)  # ID from payment provider
    
    # Card details (if applicable)
    last_four = Column(String)
    brand = Column(String)  # visa, mastercard, etc
    exp_month = Column(Integer)
    exp_year = Column(Integer)
    
    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FeatureFlag(BaseModel):
    """Feature flags for A/B testing and gradual rollouts"""
    __tablename__ = "feature_flags"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    # Flag configuration
    enabled = Column(Boolean, default=False)
    rollout_percentage = Column(Float, default=0.0)  # 0-100
    
    # Targeting
    subscription_tiers = Column(Text)  # JSON array of allowed tiers
    user_whitelist = Column(Text)  # JSON array of user IDs
    
    # Metadata
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
