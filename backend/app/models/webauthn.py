"""
🔐 WebAuthn / Passkeys Model
============================
Modelo para armazenar credenciais de biometria (Face ID, Touch ID, Windows Hello)
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, LargeBinary, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.core.db import Base
from app.core.uuid_type import UUID
import uuid


class WebAuthnCredential(Base):
    """
    Modelo para credenciais WebAuthn (Passkeys/Biometria)
    """
    __tablename__ = "webauthn_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Identificador da credencial (base64)
    credential_id = Column(Text, nullable=False, unique=True)
    
    # Chave pública (base64)
    public_key = Column(Text, nullable=False)
    
    # Contador para prevenir replay attacks
    sign_count = Column(String(50), default="0")
    
    # Tipo de autenticador (platform = biometria, cross-platform = yubikey)
    authenticator_type = Column(String(50), default="platform")
    
    # Nome amigável do dispositivo
    device_name = Column(String(100), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relacionamento
    user = relationship("User", back_populates="webauthn_credentials")

    def __repr__(self):
        return f"<WebAuthnCredential user_id={self.user_id} device={self.device_name}>"


class WebAuthnChallenge(Base):
    """
    Modelo para armazenar challenges WebAuthn temporários.
    
    Em produção com múltiplos workers, os challenges precisam estar no banco
    para que qualquer worker possa verificar.
    """
    __tablename__ = "webauthn_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Challenge em bytes (armazenado como base64)
    challenge = Column(Text, nullable=False)
    
    # Tipo: 'registration' ou 'authentication'
    challenge_type = Column(String(20), nullable=False, default="registration")
    
    # Expiração (5 minutos por padrão)
    expires_at = Column(DateTime, nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<WebAuthnChallenge user_id={self.user_id} type={self.challenge_type}>"

    @property
    def is_expired(self) -> bool:
        """Verifica se o challenge expirou"""
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return bool(now > expires)
