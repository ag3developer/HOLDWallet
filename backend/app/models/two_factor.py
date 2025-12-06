"""
🔐 Two-Factor Authentication Model
===================================
Modelo para armazenar configurações de 2FA dos usuários
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base
from app.core.uuid_type import UUID
import uuid


class TwoFactorAuth(Base):
    """
    Modelo para autenticação de dois fatores (2FA/TOTP)
    """
    __tablename__ = "two_factor_auth"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Secret TOTP (criptografado)
    secret = Column(String(255), nullable=False)
    
    # Status
    is_enabled = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Backup codes (criptografados, separados por vírgula)
    backup_codes = Column(String(1000), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    enabled_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relacionamento
    user = relationship("User", back_populates="two_factor_auth")

    def __repr__(self):
        return f"<TwoFactorAuth user_id={self.user_id} enabled={self.is_enabled}>"
