"""
User Activity Model
Registra todas as atividades importantes do usuário para auditoria e histórico
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class UserActivity(Base):
    """
    Modelo para registrar atividades do usuário
    """
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    # Usar UUID para compatibilidade com o banco PostgreSQL
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Tipo de atividade: login, logout, trade, security, wallet, kyc, etc
    activity_type = Column(String(50), nullable=False, index=True)
    
    # Descrição da atividade
    description = Column(Text, nullable=False)
    
    # Status: success, failed, pending, cancelled
    status = Column(String(20), default="success")
    
    # Informações adicionais (IP, device, location, etc)
    extra_data = Column(JSON, nullable=True)
    
    # IP do usuário
    ip_address = Column(String(45), nullable=True)
    
    # User agent (navegador/dispositivo)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamp da atividade
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    def __repr__(self):
        return f"<UserActivity {self.id}: {self.activity_type} - {self.user_id}>"
