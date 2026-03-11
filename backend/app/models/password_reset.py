"""
🔐 Password Reset Token Model
==============================

Modelo para gerenciar tokens de reset de senha.
"""

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import uuid
import secrets

from app.core.db import Base


class PasswordResetToken(Base):
    """Token para reset de senha."""
    
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String(45), nullable=True)
    
    # Relationship
    user = relationship("User", backref="reset_tokens")
    
    @classmethod
    def generate_token(cls) -> str:
        """Gera token seguro de 64 caracteres."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_for_user(
        cls, 
        user_id: str, 
        expires_in_hours: int = 1,
        ip_address: str = None
    ) -> "PasswordResetToken":
        """
        Cria um novo token de reset para o usuário.
        
        Args:
            user_id: ID do usuário
            expires_in_hours: Horas até expirar (padrão: 1)
            ip_address: IP de onde foi solicitado
        """
        return cls(
            user_id=user_id,
            token=cls.generate_token(),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
            ip_address=ip_address
        )
    
    @property
    def is_expired(self) -> bool:
        """Verifica se o token expirou."""
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Verifica se o token é válido (não usado e não expirado)."""
        return not self.used and not self.is_expired
    
    def mark_as_used(self):
        """Marca o token como usado."""
        self.used = True
        self.used_at = datetime.now(timezone.utc)


class EmailVerificationToken(Base):
    """Token para verificação de email."""
    
    __tablename__ = "email_verification_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)  # Email que será verificado
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationship
    user = relationship("User", backref="verification_tokens")
    
    @classmethod
    def generate_token(cls) -> str:
        """Gera token seguro de 64 caracteres."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_for_user(
        cls, 
        user_id: str,
        email: str,
        expires_in_hours: int = 24
    ) -> "EmailVerificationToken":
        """
        Cria um novo token de verificação para o usuário.
        
        Args:
            user_id: ID do usuário
            email: Email a ser verificado
            expires_in_hours: Horas até expirar (padrão: 24)
        """
        return cls(
            user_id=user_id,
            email=email,
            token=cls.generate_token(),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        )
    
    @property
    def is_expired(self) -> bool:
        """Verifica se o token expirou."""
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Verifica se o token é válido."""
        return not self.verified and not self.is_expired
    
    def mark_as_verified(self):
        """Marca o token como verificado."""
        self.verified = True
        self.verified_at = datetime.now(timezone.utc)
