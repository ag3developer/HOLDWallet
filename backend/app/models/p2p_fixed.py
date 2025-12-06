"""
🤝 HOLD Wallet - P2P Trading Models (Fixed)
==========================================

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
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Order details
    order_type = Column(String(10), nullable=False)  # "buy" or "sell"
    cryptocurrency = Column(String(10), nullable=False)
    amount_crypto = Column(Float, nullable=False)
    price_brl = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    
    # Status and timing
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    completed_at = Column(DateTime)

class P2PMatch(Base):
    """Matched P2P orders"""
    __tablename__ = "p2p_matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_order_id = Column(UUID(as_uuid=True), ForeignKey("p2p_orders.id"), nullable=False)
    seller_order_id = Column(UUID(as_uuid=True), ForeignKey("p2p_orders.id"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Match details
    amount_crypto = Column(Float, nullable=False)
    price_brl = Column(Float, nullable=False)
    total_brl = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    
    # Status and timing
    status = Column(String(20), default="matched")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    completed_at = Column(DateTime)

class P2PEscrow(Base):
    """P2P escrow management"""
    __tablename__ = "p2p_escrows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), unique=True, nullable=False)
    
    # Escrow details
    amount_crypto = Column(Float, nullable=False)
    status = Column(String(20), default="pending")
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime)
    expires_at = Column(DateTime)

class P2PDispute(Base):
    """P2P dispute management"""
    __tablename__ = "p2p_disputes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), nullable=False)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dispute details
    reason = Column(String(100), nullable=False)
    description = Column(Text)
    evidence_files = Column(JSON)  # File paths/URLs
    
    # Resolution
    status = Column(String(20), default="open")
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolution = Column(Text)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
