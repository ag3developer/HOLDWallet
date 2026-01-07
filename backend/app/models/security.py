"""
Security Models - Tables for security monitoring and audit
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.core.db import Base
from app.core.uuid_type import UUID


class LoginAttempt(Base):
    """Registra todas as tentativas de login (sucesso e falha)"""
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Null se email não existe
    ip_address = Column(String(45), nullable=False, index=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    
    # Resultado
    success = Column(Boolean, default=False)
    failure_reason = Column(String(100), nullable=True)  # invalid_password, user_not_found, account_locked, 2fa_failed
    
    # Geolocalização (opcional)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="login_attempts", foreign_keys=[user_id])


class BlockedIP(Base):
    """IPs bloqueados por atividade suspeita"""
    __tablename__ = "blocked_ips"
    
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), nullable=False, unique=True, index=True)
    reason = Column(Text, nullable=False)
    
    # Quem bloqueou
    blocked_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    blocked_by_name = Column(String(255), nullable=True)  # Cache do nome do admin
    
    # Configuração do bloqueio
    is_permanent = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    failed_attempts = Column(Integer, default=0)  # Quantas tentativas falhadas antes do bloqueio
    
    # Status
    is_active = Column(Boolean, default=True)
    unblocked_at = Column(DateTime(timezone=True), nullable=True)
    unblocked_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    blocked_by = relationship("User", foreign_keys=[blocked_by_id])
    unblocked_by = relationship("User", foreign_keys=[unblocked_by_id])


class SecurityAlert(Base):
    """Alertas de segurança e atividades suspeitas"""
    __tablename__ = "security_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Tipo de alerta
    alert_type = Column(String(50), nullable=False, index=True)
    # Tipos: multiple_failed_logins, unusual_location, suspicious_transaction, 
    # account_takeover_attempt, brute_force, rate_limit_exceeded, impossible_travel
    
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high, critical
    
    # Contexto
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    description = Column(Text, nullable=False)
    
    # Dados adicionais em JSON
    extra_data = Column(JSON, nullable=True)
    # Ex: {"failed_attempts": 5, "time_window": "5min", "countries": ["BR", "RU"]}
    
    # Status do alerta
    status = Column(String(20), default="open")  # open, investigating, resolved, false_positive
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="security_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


class UserSession(Base):
    """Sessões ativas dos usuários"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Informações do dispositivo
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    
    # Geolocalização
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Status da sessão
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Logout
    logged_out_at = Column(DateTime(timezone=True), nullable=True)
    logout_reason = Column(String(50), nullable=True)  # user_logout, forced_logout, expired, password_change
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="sessions")


class AuditLog(Base):
    """Log de auditoria para ações importantes do sistema"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Quem fez a ação
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)  # Cache para quando user for deletado
    
    # O que foi feito
    action = Column(String(100), nullable=False, index=True)
    # Ações: login, logout, password_change, 2fa_enable, 2fa_disable, profile_update,
    # withdrawal, deposit, trade, admin_action, settings_change, etc.
    
    resource_type = Column(String(50), nullable=True)  # user, wallet, transaction, trade, etc.
    resource_id = Column(String(100), nullable=True)
    
    # Detalhes
    description = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)  # Valores antes da mudança
    new_values = Column(JSON, nullable=True)  # Valores depois da mudança
    
    # Contexto
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Resultado
    status = Column(String(20), default="success")  # success, failed, blocked
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")


class BiometricToken(Base):
    """Tokens biométricos temporários para autorização de transações"""
    __tablename__ = "biometric_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Expiração
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Status
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User")
