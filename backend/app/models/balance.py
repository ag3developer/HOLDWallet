"""
💰 HOLD Wallet - Balance Management Models
==========================================

Database models for managing user wallet balances with freeze/lock capabilities
for P2P trading, escrow, and other operations.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.db import Base
from app.core.uuid_type import UUID


class WalletBalance(Base):
    """
    User wallet balances by cryptocurrency.
    
    Tracks both available and locked (frozen) balances.
    Locked balances are used for:
    - Active P2P trades (escrow)
    - Pending transactions
    - Other platform operations
    """
    __tablename__ = "wallet_balances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cryptocurrency = Column(String(10), nullable=False)  # BTC, ETH, USDT, etc
    
    # Balance tracking
    available_balance = Column(Float, default=0.0, nullable=False)  # Can be used
    locked_balance = Column(Float, default=0.0, nullable=False)     # Frozen in escrow/trades
    total_balance = Column(Float, default=0.0, nullable=False)      # available + locked
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_updated_reason = Column(String(200))  # Why it was last updated
    
    # Unique constraint: one balance per user per crypto
    __table_args__ = (
        UniqueConstraint('user_id', 'cryptocurrency', name='unique_user_crypto_balance'),
    )
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'cryptocurrency': self.cryptocurrency,
            'available_balance': self.available_balance,
            'locked_balance': self.locked_balance,
            'total_balance': self.total_balance,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class BalanceHistory(Base):
    """
    Transaction history for balance changes.
    
    Tracks all balance modifications for audit and debugging.
    """
    __tablename__ = "balance_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cryptocurrency = Column(String(10), nullable=False)
    
    # Transaction details
    operation_type = Column(String(50), nullable=False)  # "freeze", "unfreeze", "transfer", "deposit", "withdraw"
    amount = Column(Float, nullable=False)
    
    # Balance snapshot
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    locked_before = Column(Float, nullable=False)
    locked_after = Column(Float, nullable=False)
    
    # Related transaction
    reference_id = Column(String(100))  # order_id, trade_id, transaction_id, etc
    reason = Column(String(200))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'cryptocurrency': self.cryptocurrency,
            'operation_type': self.operation_type,
            'amount': self.amount,
            'balance_before': self.balance_before,
            'balance_after': self.balance_after,
            'reference_id': self.reference_id,
            'reason': self.reason,
            'created_at': self.created_at.isoformat(),
        }
