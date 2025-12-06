from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

from app.core.db import Base
from app.core.uuid_type import UUID

class Wallet(Base):
    """Wallet model for storing user wallets."""
    __tablename__ = "wallets"

    # Use UUID as primary key for consistency with other models
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Wallet information
    name = Column(String(100), nullable=False)
    network = Column(String(50), nullable=False)  # bitcoin, ethereum, polygon, bsc
    derivation_path = Column(String(100), nullable=True)
    encrypted_seed = Column(Text, nullable=True)  # Encrypted mnemonic/seed
    seed_hash = Column(String(64), nullable=True, index=True)  # Hash for verification
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="wallets")
    addresses = relationship("Address", back_populates="wallet")

    def __repr__(self):
        return f"<Wallet(id='{self.id}', name='{self.name}', network='{self.network}')>"
