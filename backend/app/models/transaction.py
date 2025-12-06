from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from decimal import Decimal
import enum

from app.core.db import Base

class TransactionStatus(str, enum.Enum):
    """Transaction status enumeration."""
    created = "created"          # Transação criada, não assinada
    signed = "signed"            # Transação assinada, pronta para broadcast  
    pending = "pending"          # Transação enviada, aguardando confirmação
    confirmed = "confirmed"      # Transação confirmada na blockchain
    failed = "failed"            # Transação falhou
    cancelled = "cancelled"      # Transação cancelada pelo usuário

class Transaction(Base):
    """Transaction model for storing blockchain transactions."""
    __tablename__ = "transactions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=True, index=True)
    
    # Transaction data
    tx_hash = Column(String(255), nullable=True, unique=True, index=True)  # Hash após broadcast
    from_address = Column(String(255), nullable=False, index=True)
    to_address = Column(String(255), nullable=False, index=True)
    amount = Column(String(50), nullable=False)  # Storing as string to avoid precision issues
    fee = Column(String(50), nullable=True)
    network = Column(String(20), nullable=False, index=True)  # bitcoin, ethereum, polygon, bsc
    
    # Status and blockchain data
    status = Column(SQLEnum(TransactionStatus), default=TransactionStatus.created, nullable=False, index=True)
    confirmations = Column(Integer, default=0, nullable=False)
    block_number = Column(Integer, nullable=True)
    
    # Token information
    token_address = Column(String(255), nullable=True)
    token_symbol = Column(String(20), nullable=True)
    
    # Transaction content
    memo = Column(Text, nullable=True)  # User memo/note
    raw_transaction = Column(Text, nullable=True)  # Raw transaction data before signing
    signed_transaction = Column(Text, nullable=True)  # Signed transaction hex
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, nullable=True)
    broadcasted_at = Column(DateTime, nullable=True)  # When broadcast was sent
    confirmed_at = Column(DateTime, nullable=True)    # When first confirmed
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    address = relationship("Address", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction(id={self.id}, hash='{self.tx_hash}', status='{self.status}')>"
    
    @property
    def hash(self):
        """Alias for tx_hash for backward compatibility"""
        return self.tx_hash
