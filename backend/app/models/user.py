from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from app.core.db import Base
from app.core.security import get_password_hash
from app.core.uuid_type import UUID

if TYPE_CHECKING:
    from app.models.reputation import UserReputation

class User(Base):
    """User model for authentication and user management."""
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Authentication
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    wallets = relationship("Wallet", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    two_factor_auth = relationship("TwoFactorAuth", back_populates="user", uselist=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    def set_password(self, password: str):
        """Set user password with proper hashing."""
        self.password_hash = get_password_hash(password)
