"""
🤝 HOLD Wallet - P2P Trading Models
==================================

Database models for P2P trading system including orders, matches,
escrow, disputes, and reputation management.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.db import Base

class P2POrder(Base):
    """P2P trading orders"""
    __tablename__ = "p2p_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    
    # Order details
    order_type = Column(String, nullable=False)  # buy, sell
    asset = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    price_brl = Column(Float, nullable=False)
    total_value_brl = Column(Float, nullable=False)
    
    # Limits
    min_order_amount = Column(Float, nullable=False)
    max_order_amount = Column(Float, nullable=False)
    
    # Payment
    payment_methods = Column(JSON)  # Array of payment methods
    
    # Commission
    commission_rate = Column(Float, nullable=False)
    commission_amount = Column(Float, nullable=False)
    
    # Status and timing
    status = Column(String, nullable=False, default="active")
    auto_accept = Column(Boolean, default=False)
    
    # Metadata
    description = Column(Text)
    escrow_time_minutes = Column(Integer, default=60)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)

class P2PMatch(Base):
    """Matched P2P orders"""
    __tablename__ = "p2p_matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_order_id = Column(String, nullable=False, index=True)
    seller_order_id = Column(String, nullable=False, index=True)
    buyer_id = Column(String, nullable=False, index=True)
    seller_id = Column(String, nullable=False, index=True)
    
    # Match details
    matched_amount = Column(Float, nullable=False)
    matched_value_brl = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    
    # Status
    status = Column(String, nullable=False, default="matched")
    
    # Escrow
    escrow_address = Column(String)
    escrow_tx_hash = Column(String)
    release_tx_hash = Column(String)
    
    # Payment confirmation
    payment_confirmed = Column(Boolean, default=False)
    payment_proof = Column(JSON)
    
    # Timing
    matched_at = Column(DateTime, default=datetime.utcnow)
    escrowed_at = Column(DateTime)
    payment_confirmed_at = Column(DateTime)
    completed_at = Column(DateTime)
    auto_release_at = Column(DateTime)
    
    # Revenue
    commission_collected = Column(Boolean, default=False)
    total_commission = Column(Float)

class P2PEscrow(BaseModel):
    """P2P escrow transactions"""
    __tablename__ = "p2p_escrows"
    
    id = Column(String, primary_key=True, index=True)
    match_id = Column(String, nullable=False, index=True)
    seller_wallet_id = Column(String, nullable=False)
    buyer_wallet_id = Column(String)
    
    # Escrow details
    asset = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    escrow_address = Column(String, nullable=False)
    
    # Status
    status = Column(String, nullable=False, default="pending")
    
    # Transactions
    lock_tx_hash = Column(String)
    release_tx_hash = Column(String)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    locked_at = Column(DateTime)
    released_at = Column(DateTime)
    auto_release_at = Column(DateTime)

class P2PDispute(BaseModel):
    """P2P transaction disputes"""
    __tablename__ = "p2p_disputes"
    
    id = Column(String, primary_key=True, index=True)
    match_id = Column(String, nullable=False, index=True)
    complainant_id = Column(String, nullable=False, index=True)
    defendant_id = Column(String, nullable=False, index=True)
    
    # Dispute details
    reason = Column(String, nullable=False)
    description = Column(Text)
    evidence = Column(JSON)  # Array of evidence URLs/data
    
    # Status
    status = Column(String, nullable=False, default="open")
    priority = Column(String, default="medium")
    
    # Assignment
    assigned_to = Column(String)  # Admin/support user ID
    
    # Resolution
    resolution = Column(Text)
    resolution_type = Column(String)  # refund, release, split
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    estimated_resolution = Column(DateTime)

class P2PReputation(BaseModel):
    """User P2P reputation and statistics"""
    __tablename__ = "p2p_reputations"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, unique=True, nullable=False, index=True)
    
    # Stats
    total_trades = Column(Integer, default=0)
    completed_trades = Column(Integer, default=0)
    cancelled_trades = Column(Integer, default=0)
    disputed_trades = Column(Integer, default=0)
    
    # Performance
    success_rate = Column(Float, default=0.0)
    avg_completion_time_minutes = Column(Integer, default=0)
    
    # Feedback
    positive_feedback = Column(Integer, default=0)
    neutral_feedback = Column(Integer, default=0)
    negative_feedback = Column(Integer, default=0)
    reputation_score = Column(Integer, default=100)
    
    # Volume
    total_volume_brl = Column(Float, default=0.0)
    monthly_volume_brl = Column(Float, default=0.0)
    
    # Level and badges
    trader_level = Column(String, default="Bronze")  # Bronze, Silver, Gold, Platinum
    badges = Column(JSON)  # Array of earned badges
    
    # Preferences
    preferred_payment_methods = Column(JSON)
    languages = Column(JSON)
    
    # Metadata
    first_trade_at = Column(DateTime)
    last_trade_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class P2PFeedback(BaseModel):
    """Feedback between P2P traders"""
    __tablename__ = "p2p_feedbacks"
    
    id = Column(String, primary_key=True, index=True)
    match_id = Column(String, nullable=False, index=True)
    from_user_id = Column(String, nullable=False, index=True)
    to_user_id = Column(String, nullable=False, index=True)
    
    # Feedback
    rating = Column(String, nullable=False)  # positive, neutral, negative
    comment = Column(Text)
    
    # Categories
    communication = Column(Integer)  # 1-5 stars
    speed = Column(Integer)  # 1-5 stars
    reliability = Column(Integer)  # 1-5 stars
    
    # Status
    is_verified = Column(Boolean, default=False)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)

class P2PPaymentMethod(BaseModel):
    """User payment methods for P2P trading"""
    __tablename__ = "p2p_payment_methods"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Payment method details
    method_type = Column(String, nullable=False)  # pix, ted, paypal, etc
    account_name = Column(String, nullable=False)
    account_details = Column(JSON)  # Bank details, PIX key, etc
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    
    # Usage
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
