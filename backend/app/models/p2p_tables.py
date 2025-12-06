"""
🤝 HOLD Wallet - P2P Database Models
====================================

SQLAlchemy models matching the actual database schema created by Alembic migration.
These models correspond to the tables created in p2p_complete_001_create_p2p_tables.py

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.db import Base


class PaymentMethod(Base):
    """User payment methods for P2P trading"""
    __tablename__ = "payment_methods"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False, index=True)  # pix, bank_transfer, paypal, etc.
    details = Column(Text, nullable=False)  # JSON string with payment details
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # user = relationship("User", back_populates="payment_methods")


class P2POrder(Base):
    """P2P buy/sell orders"""
    __tablename__ = "p2p_orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_type = Column(String(10), nullable=False, index=True)  # 'buy' or 'sell'
    cryptocurrency = Column(String(20), nullable=False, index=True)
    fiat_currency = Column(String(10), nullable=False, default='BRL', index=True)
    price = Column(Numeric(20, 8), nullable=False)  # Price per unit in fiat
    total_amount = Column(Numeric(20, 8), nullable=False)  # Total crypto amount
    available_amount = Column(Numeric(20, 8), nullable=False)  # Available crypto amount
    min_order_limit = Column(Numeric(20, 8), nullable=False)  # Minimum order in fiat
    max_order_limit = Column(Numeric(20, 8), nullable=False)  # Maximum order in fiat
    time_limit = Column(Integer, default=30)  # Payment time limit in minutes
    payment_methods = Column(Text)  # JSON array of accepted payment method IDs
    terms = Column(Text)  # Order terms and conditions
    auto_reply = Column(Text)  # Auto-reply message
    status = Column(String(20), default='active', index=True)  # active, paused, completed, cancelled
    completed_trades = Column(Integer, default=0)
    total_volume = Column(Numeric(20, 8), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("order_type IN ('buy', 'sell')", name='check_p2p_orders_order_type'),
        CheckConstraint("status IN ('active', 'paused', 'completed', 'cancelled')", name='check_p2p_orders_status'),
    )
    
    # Relationships
    # user = relationship("User", back_populates="p2p_orders")
    trades = relationship("P2PTrade", back_populates="order")


class P2PTrade(Base):
    """Active P2P trades between buyer and seller"""
    __tablename__ = "p2p_trades"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("p2p_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(20, 8), nullable=False)  # Trade amount in crypto
    price = Column(Numeric(20, 8), nullable=False)  # Price at trade time
    total_fiat = Column(Numeric(20, 8), nullable=False)  # Total in fiat
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), index=True)
    status = Column(String(20), default='pending', index=True)  # pending, paid, completed, cancelled, disputed
    payment_confirmed = Column(Boolean, default=False)
    crypto_released = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)  # Trade expiration time
    paid_at = Column(DateTime)
    completed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'paid', 'completed', 'cancelled', 'disputed')", 
                       name='check_p2p_trades_status'),
    )
    
    # Relationships
    order = relationship("P2POrder", back_populates="trades")
    # buyer = relationship("User", foreign_keys=[buyer_id])
    # seller = relationship("User", foreign_keys=[seller_id])
    # payment_method = relationship("PaymentMethod")
    escrow = relationship("P2PEscrow", back_populates="trade", uselist=False)
    disputes = relationship("P2PDispute", back_populates="trade")
    messages = relationship("P2PChatMessage", back_populates="trade")
    feedbacks = relationship("P2PFeedback", back_populates="trade")


class P2PEscrow(Base):
    """Escrow management for P2P trades"""
    __tablename__ = "p2p_escrow"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(Integer, ForeignKey("p2p_trades.id", ondelete="CASCADE"), 
                     unique=True, nullable=False, index=True)
    amount = Column(Numeric(20, 8), nullable=False)  # Escrowed crypto amount
    status = Column(String(20), default='locked', index=True)  # locked, released, refunded
    released_at = Column(DateTime)
    refunded_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("status IN ('locked', 'released', 'refunded')", name='check_p2p_escrow_status'),
    )
    
    # Relationships
    trade = relationship("P2PTrade", back_populates="escrow")


class P2PDispute(Base):
    """Dispute management for P2P trades"""
    __tablename__ = "p2p_disputes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(Integer, ForeignKey("p2p_trades.id", ondelete="CASCADE"), nullable=False, index=True)
    raised_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String(200), nullable=False)
    description = Column(Text)
    evidence = Column(Text)  # JSON array of evidence URLs
    status = Column(String(20), default='open', index=True)  # open, investigating, resolved
    resolution = Column(Text)
    resolved_by = Column(Integer, ForeignKey("users.id"), index=True)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("status IN ('open', 'investigating', 'resolved')", name='check_p2p_disputes_status'),
    )
    
    # Relationships
    trade = relationship("P2PTrade", back_populates="disputes")
    # raised_by_user = relationship("User", foreign_keys=[raised_by])
    # resolved_by_user = relationship("User", foreign_keys=[resolved_by])


class P2PFeedback(Base):
    """User feedback/ratings for completed trades"""
    __tablename__ = "p2p_feedback"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(Integer, ForeignKey("p2p_trades.id", ondelete="CASCADE"), nullable=False, index=True)
    from_user = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    to_user = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name='check_p2p_feedback_rating'),
    )
    
    # Relationships
    trade = relationship("P2PTrade", back_populates="feedbacks")
    # from_user_rel = relationship("User", foreign_keys=[from_user])
    # to_user_rel = relationship("User", foreign_keys=[to_user])


class P2PChatMessage(Base):
    """Chat messages for P2P trades"""
    __tablename__ = "p2p_chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(Integer, ForeignKey("p2p_trades.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_system_message = Column(Boolean, default=False)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    trade = relationship("P2PTrade", back_populates="messages")
    # sender = relationship("User")


class UserP2PStats(Base):
    """Aggregated P2P statistics for users"""
    __tablename__ = "user_p2p_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), 
                    unique=True, nullable=False, index=True)
    total_trades = Column(Integer, default=0)
    successful_trades = Column(Integer, default=0)
    cancelled_trades = Column(Integer, default=0)
    disputed_trades = Column(Integer, default=0)
    total_volume = Column(Numeric(20, 8), default=0)  # Total trading volume
    average_rating = Column(Numeric(3, 2), default=0)  # Average rating 0-5
    total_ratings = Column(Integer, default=0)
    reputation_score = Column(Numeric(10, 2), default=0)  # Calculated reputation
    first_trade_at = Column(DateTime)
    last_trade_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # user = relationship("User", back_populates="p2p_stats")
