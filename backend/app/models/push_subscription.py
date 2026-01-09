"""
WOLK NOW - Push Subscription Model
===================================

Modelo SQLAlchemy para armazenar subscriptions de Push Notifications.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.core.uuid_type import UUID


class PushSubscription(Base):
    """
    Armazena as subscriptions de Push Notifications dos usuários.
    Cada dispositivo/navegador tem sua própria subscription.
    """
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Dados da subscription (Web Push)
    endpoint = Column(Text, nullable=False, unique=True, index=True)
    p256dh = Column(Text, nullable=False)  # Public key
    auth = Column(Text, nullable=False)    # Auth secret
    
    # Informações do dispositivo
    device_info = Column(JSON, nullable=True)
    
    # Status e timestamps
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relacionamento
    user = relationship("User", back_populates="push_subscriptions")

    def __repr__(self):
        return f"<PushSubscription(id={self.id}, user_id={self.user_id}, active={self.is_active})>"


class NotificationPreference(Base):
    """
    Preferências de notificação do usuário.
    Define quais tipos de notificações o usuário deseja receber.
    """
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Categorias de notificação
    transactions = Column(Boolean, default=True, nullable=False)
    security = Column(Boolean, default=True, nullable=False)
    p2p_trading = Column(Boolean, default=True, nullable=False)
    chat = Column(Boolean, default=True, nullable=False)
    market = Column(Boolean, default=False, nullable=False)
    reports = Column(Boolean, default=False, nullable=False)
    system = Column(Boolean, default=True, nullable=False)
    
    # Horário de silêncio (Do Not Disturb)
    quiet_hours_start = Column(String(5), nullable=True)  # HH:MM
    quiet_hours_end = Column(String(5), nullable=True)    # HH:MM
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento
    user = relationship("User", back_populates="notification_preferences")

    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id})>"
    
    def to_dict(self):
        return {
            "transactions": self.transactions,
            "security": self.security,
            "p2p_trading": self.p2p_trading,
            "chat": self.chat,
            "market": self.market,
            "reports": self.reports,
            "system": self.system,
            "quiet_hours_start": self.quiet_hours_start,
            "quiet_hours_end": self.quiet_hours_end,
        }
