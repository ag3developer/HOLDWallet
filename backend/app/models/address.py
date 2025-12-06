from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.core.db import Base
from app.core.uuid_type import UUID

class Address(Base):
    """Address model for storing wallet addresses."""
    __tablename__ = "addresses"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign keys - reference UUID id of wallets
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False, index=True)
    
    # Address information
    address = Column(String(255), nullable=False, index=True)  # Removed unique=True to allow same address on different networks (EVM chains)
    network = Column(String(20), nullable=False, index=True)  # bitcoin, ethereum, polygon, bsc
    address_type = Column(String(50), nullable=False, default="receiving")  # receiving, change
    derivation_index = Column(Integer, nullable=True)
    encrypted_private_key = Column(String(500), nullable=True)  # Encrypted private key
    derivation_path = Column(String(100), nullable=True)  # HD derivation path
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint: one address per wallet per network
    __table_args__ = (
        UniqueConstraint('wallet_id', 'network', name='uq_wallet_network'),
    )
    
    # Relationships
    wallet = relationship("Wallet", back_populates="addresses")
    transactions = relationship("Transaction", back_populates="address")

    def __repr__(self):
        return f"<Address(id='{self.id}', address='{self.address}', wallet_id='{self.wallet_id}')>"
