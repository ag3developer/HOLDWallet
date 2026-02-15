"""
🎁 Referral Program Models - WOLK FRIENDS
==========================================
Sistema de indicação com níveis progressivos

@version 1.0.0
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Boolean, Integer, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.db import Base


class ReferralTier(str, enum.Enum):
    """Níveis do programa de indicação"""
    BRONZE = "BRONZE"      # 0-5 indicados ativos: 20%
    SILVER = "SILVER"      # 6-20 indicados ativos: 25%
    GOLD = "GOLD"          # 21-50 indicados ativos: 30%
    DIAMOND = "DIAMOND"    # 51-100 indicados ativos: 35%
    AMBASSADOR = "AMBASSADOR"  # 100+ indicados + $10k volume/mês: 40%


class ReferralStatus(str, enum.Enum):
    """Status da indicação"""
    PENDING = "PENDING"        # Aguardando primeira transação
    QUALIFIED = "QUALIFIED"    # Indicado fez primeira transação
    ACTIVE = "ACTIVE"          # Indicado ativo (transacionou nos últimos 30 dias)
    INACTIVE = "INACTIVE"      # Indicado inativo (sem transações há 30+ dias)
    CANCELLED = "CANCELLED"    # Indicação cancelada


class ReferralCode(Base):
    """
    Código de indicação único por usuário
    """
    __tablename__ = "referral_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    
    # Estatísticas
    total_referrals = Column(Integer, default=0)
    active_referrals = Column(Integer, default=0)
    total_earned = Column(Numeric(precision=18, scale=8), default=0)
    
    # Tier atual
    current_tier = Column(SQLEnum(ReferralTier), default=ReferralTier.BRONZE)
    
    # Controle
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="referral_code")
    referrals = relationship("Referral", back_populates="referrer_code", foreign_keys="Referral.referrer_code_id")


class Referral(Base):
    """
    Registro de cada indicação
    """
    __tablename__ = "referrals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Quem indicou
    referrer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referrer_code_id = Column(UUID(as_uuid=True), ForeignKey("referral_codes.id"), nullable=False)
    
    # Quem foi indicado
    referred_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Status
    status = Column(SQLEnum(ReferralStatus), default=ReferralStatus.PENDING)
    
    # Datas importantes
    created_at = Column(DateTime, default=datetime.utcnow)
    qualified_at = Column(DateTime, nullable=True)  # Quando fez 1ª transação
    last_activity_at = Column(DateTime, nullable=True)  # Última transação do indicado
    
    # Totais acumulados
    total_volume_generated = Column(Numeric(precision=18, scale=8), default=0)
    total_fees_generated = Column(Numeric(precision=18, scale=8), default=0)
    total_commission_paid = Column(Numeric(precision=18, scale=8), default=0)
    
    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id], back_populates="referrals_made")
    referred = relationship("User", foreign_keys=[referred_id], back_populates="referred_by")
    referrer_code = relationship("ReferralCode", back_populates="referrals")
    earnings = relationship("ReferralEarning", back_populates="referral")


class ReferralEarning(Base):
    """
    Registro de cada comissão ganha
    """
    __tablename__ = "referral_earnings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    referral_id = Column(UUID(as_uuid=True), ForeignKey("referrals.id"), nullable=False)
    referrer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Transação que gerou a comissão
    transaction_type = Column(String(50), nullable=False)  # 'instant_trade', 'p2p_trade', etc
    transaction_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Valores
    transaction_amount = Column(Numeric(precision=18, scale=8), nullable=False)  # Valor da transação
    fee_amount = Column(Numeric(precision=18, scale=8), nullable=False)  # Taxa cobrada
    commission_rate = Column(Numeric(precision=5, scale=2), nullable=False)  # % de comissão (20-40%)
    commission_amount = Column(Numeric(precision=18, scale=8), nullable=False)  # Valor da comissão
    
    # Tier no momento do ganho
    tier_at_earning = Column(SQLEnum(ReferralTier), nullable=False)
    
    # Status do pagamento
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    referral = relationship("Referral", back_populates="earnings")
    referrer = relationship("User", back_populates="referral_earnings")


class ReferralConfig(Base):
    """
    Configurações do programa de indicação
    """
    __tablename__ = "referral_config"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configurações de tier
    bronze_min_referrals = Column(Integer, default=0)
    bronze_commission_rate = Column(Numeric(precision=5, scale=2), default=20.00)  # 20%
    
    silver_min_referrals = Column(Integer, default=6)
    silver_commission_rate = Column(Numeric(precision=5, scale=2), default=25.00)  # 25%
    
    gold_min_referrals = Column(Integer, default=21)
    gold_commission_rate = Column(Numeric(precision=5, scale=2), default=30.00)  # 30%
    
    diamond_min_referrals = Column(Integer, default=51)
    diamond_commission_rate = Column(Numeric(precision=5, scale=2), default=35.00)  # 35%
    
    ambassador_min_referrals = Column(Integer, default=100)
    ambassador_min_monthly_volume = Column(Numeric(precision=18, scale=2), default=10000.00)  # $10k
    ambassador_commission_rate = Column(Numeric(precision=5, scale=2), default=40.00)  # 40%
    
    # Requisitos
    min_transaction_to_qualify = Column(Numeric(precision=18, scale=2), default=1.00)  # $1 para qualificar
    days_to_consider_active = Column(Integer, default=30)  # 30 dias para ser considerado ativo
    
    # Controle
    is_program_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
