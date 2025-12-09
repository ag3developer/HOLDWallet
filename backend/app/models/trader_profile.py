"""
🏢 HOLD Wallet - Trader Profile Model
======================================

Database model for trader profiles in P2P trading system.
Allows users to create professional trader profiles with reputation and stats.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from typing import TYPE_CHECKING

from app.core.db import Base
from app.core.uuid_type import UUID

if TYPE_CHECKING:
    from app.models.user import User


class TraderProfile(Base):
    """
    Trader Profile for P2P marketplace
    
    Allows users to create a professional trader profile with:
    - Display name and avatar
    - Description/bio
    - Verification status
    - Stats (trades completed, success rate, etc)
    - Settings (auto-accept, min/max order amounts)
    """
    __tablename__ = "trader_profiles"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Profile Information
    display_name = Column(String(100), nullable=False)  # Nome do negociador
    avatar_url = Column(String(500), nullable=True)  # URL do avatar/foto
    bio = Column(Text, nullable=True)  # Descrição/bio do negociador
    
    # Verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    verification_level = Column(String(20), default="unverified")  # unverified, basic, advanced, premium
    
    # Statistics
    total_trades = Column(Integer, default=0, nullable=False)
    completed_trades = Column(Integer, default=0, nullable=False)
    success_rate = Column(Float, default=0.0, nullable=False)  # 0-100
    average_rating = Column(Float, default=0.0, nullable=False)  # 0-5
    total_reviews = Column(Integer, default=0, nullable=False)
    
    # Trading Preferences
    auto_accept_orders = Column(Boolean, default=False, nullable=False)
    min_order_amount = Column(Float, nullable=True)  # Minimum BRL amount
    max_order_amount = Column(Float, nullable=True)  # Maximum BRL amount
    accepted_payment_methods = Column(String(500), nullable=True)  # Comma-separated
    
    # Response Times
    average_response_time = Column(Integer, nullable=True)  # in seconds
    trading_hours = Column(String(500), nullable=True)  # JSON formatted
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="trader_profile", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<TraderProfile(id={self.id}, display_name='{self.display_name}', success_rate={self.success_rate}%)>"


class TraderStats(Base):
    """
    Daily statistics for traders
    Tracks metrics over time for analytics and reporting
    """
    __tablename__ = "trader_stats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trader_id = Column(UUID(as_uuid=True), ForeignKey("trader_profiles.id"), nullable=False)
    
    # Date
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Daily Stats
    trades_completed = Column(Integer, default=0, nullable=False)
    total_volume_brl = Column(Float, default=0.0, nullable=False)
    success_rate = Column(Float, default=0.0, nullable=False)
    average_rating = Column(Float, default=0.0, nullable=False)
    new_reviews = Column(Integer, default=0, nullable=False)
    disputes = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    trader = relationship("TraderProfile", backref="stats")
    
    def __repr__(self):
        return f"<TraderStats(trader_id={self.trader_id}, date={self.date.date()})>"
