"""
HOLD Wallet - Modelos de Reputação e Avaliação
==============================================

Modelos de dados para sistema completo de reputação,
avaliações de traders e detecção de fraudes.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, 
    ForeignKey, Enum, JSON, Index, UniqueConstraint, CheckConstraint, DECIMAL
)
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
import uuid
from datetime import datetime

from app.core.db import Base
from app.core.uuid_type import UUID

class PaymentMethodType(str, PyEnum):
    PIX = "pix"
    TED = "ted"
    DOC = "doc"
    BANK_TRANSFER = "bank_transfer"
    MERCADO_PAGO = "mercado_pago"
    PICPAY = "picpay"
    PAYPAL = "paypal"
    NUBANK = "nubank"
    INTER = "inter"
    C6_BANK = "c6_bank"
    CASH_DEPOSIT = "cash_deposit"
    CRYPTOCURRENCY = "cryptocurrency"

class FraudRiskLevel(str, PyEnum):
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    CRITICAL = "critical"

class TraderLevel(str, PyEnum):
    NEWCOMER = "newcomer"
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"
    MASTER = "master"

class ReviewType(str, PyEnum):
    BUYER = "buyer"
    SELLER = "seller"
    GENERAL = "general"

class ReviewStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"

class UserReputation(Base):
    """Tabela principal de reputação de usuários"""
    __tablename__ = "user_reputations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Métricas principais
    reputation_score = Column(Float, default=0.0)  # 0-100
    trader_level = Column(Enum(TraderLevel), default=TraderLevel.NEWCOMER)
    total_trades = Column(Integer, default=0)
    completed_trades = Column(Integer, default=0)
    cancelled_trades = Column(Integer, default=0)
    disputed_trades = Column(Integer, default=0)
    
    # Métricas de performance
    avg_completion_time_minutes = Column(Float, default=0.0)
    avg_response_time_minutes = Column(Float, default=0.0)
    total_volume_brl = Column(DECIMAL(15, 2), default=0.00)
    monthly_volume_brl = Column(DECIMAL(15, 2), default=0.00)
    
    # Taxas de sucesso
    completion_rate = Column(Float, default=0.0)  # %
    dispute_rate = Column(Float, default=0.0)     # %
    cancellation_rate = Column(Float, default=0.0)  # %
    
    # Métricas de confiabilidade
    kyc_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    bank_account_verified = Column(Boolean, default=False)
    
    # Dados temporais
    account_age_days = Column(Integer, default=0)
    last_trade_date = Column(DateTime, nullable=True)
    last_active_date = Column(DateTime, default=datetime.utcnow)
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user = relationship("User")
    badges = relationship("UserBadge", back_populates="user_reputation")
    fraud_reports = relationship("FraudReport", back_populates="user_reputation")
    
    # Índices para performance
    __table_args__ = (
        Index('idx_user_reputation_score', 'reputation_score'),
        Index('idx_user_trader_level', 'trader_level'),
        Index('idx_user_total_trades', 'total_trades'),
        Index('idx_user_last_active', 'last_active_date'),
        CheckConstraint('reputation_score >= 0 AND reputation_score <= 100', name='check_reputation_score_range'),
        CheckConstraint('completion_rate >= 0 AND completion_rate <= 100', name='check_completion_rate_range'),
        CheckConstraint('dispute_rate >= 0 AND dispute_rate <= 100', name='check_dispute_rate_range'),
    )

class UserReview(Base):
    """Sistema de avaliações entre usuários"""
    __tablename__ = "user_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), nullable=False)
    
    # Quem avalia e quem é avaliado
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reviewed_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dados da avaliação
    review_type = Column(Enum(ReviewType), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 estrelas
    title = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    
    # Métricas específicas (1-5)
    communication_rating = Column(Integer, nullable=True)
    speed_rating = Column(Integer, nullable=True)
    reliability_rating = Column(Integer, nullable=True)
    overall_experience = Column(Integer, nullable=True)
    
    # Flags e status
    is_public = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    moderated_at = Column(DateTime, nullable=True)
    moderated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relacionamentos
    match = relationship("P2PMatch", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewed_user = relationship("User", foreign_keys=[reviewed_user_id])
    moderator = relationship("User", foreign_keys=[moderated_by])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('trade_id', 'reviewer_id', name='unique_review_per_trade_reviewer'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        CheckConstraint('communication_rating >= 1 AND communication_rating <= 5', name='check_communication_rating_range'),
        CheckConstraint('speed_rating >= 1 AND speed_rating <= 5', name='check_speed_rating_range'),
        CheckConstraint('reliability_rating >= 1 AND reliability_rating <= 5', name='check_reliability_rating_range'),
        CheckConstraint('overall_experience >= 1 AND overall_experience <= 5', name='check_overall_experience_range'),
        CheckConstraint('reviewer_id != reviewed_user_id', name='check_no_self_review'),
        Index('idx_review_rating', 'rating'),
        Index('idx_review_created_at', 'created_at'),
        Index('idx_review_status', 'status'),
        Index('idx_review_reviewer', 'reviewer_id'),
        Index('idx_review_reviewed_user', 'reviewed_user_id'),
    )

class UserBadge(Base):
    """Sistema de badges/conquistas para usuários"""
    __tablename__ = "user_badges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_reputations.user_id"), nullable=False)
    
    # Dados do badge
    badge_type = Column(String(50), nullable=False)  # fast_trader, high_volume, etc.
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True)  # Emoji
    
    # Dados de conquista
    earned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    
    # Métricas que levaram ao badge
    criteria_met = Column(JSON, nullable=True)  # Dados que justificam o badge
    
    # Relacionamentos
    user_reputation = relationship("UserReputation", back_populates="badges")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'badge_type', name='unique_user_badge'),
        Index('idx_badge_type', 'badge_type'),
        Index('idx_badge_earned_at', 'earned_at'),
    )

class FraudReport(Base):
    """Relatórios de análise de fraude"""
    __tablename__ = "fraud_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_reputations.user_id"), nullable=False)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), nullable=True)
    
    # Dados da análise
    fraud_risk_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(Enum(FraudRiskLevel), nullable=False)
    
    # Indicadores de fraude
    fraud_indicators = Column(JSON, nullable=True)  # Lista de indicadores detectados
    recommended_actions = Column(JSON, nullable=True)  # Ações recomendadas
    
    # Flags de segurança
    requires_manual_review = Column(Boolean, default=False)
    auto_blocked = Column(Boolean, default=False)
    false_positive = Column(Boolean, nullable=True)
    
    # Ação tomada
    action_taken = Column(String(100), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user_reputation = relationship("UserReputation", back_populates="fraud_reports")
    match = relationship("P2PMatch", back_populates="fraud_reports")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    # Índices
    __table_args__ = (
        Index('idx_fraud_risk_score', 'fraud_risk_score'),
        Index('idx_fraud_risk_level', 'risk_level'),
        Index('idx_fraud_created_at', 'created_at'),
        Index('idx_fraud_requires_review', 'requires_manual_review'),
        CheckConstraint('fraud_risk_score >= 0 AND fraud_risk_score <= 100', name='check_fraud_risk_score_range'),
    )

class PaymentMethodVerification(Base):
    """Verificação de métodos de pagamento dos usuários"""
    __tablename__ = "payment_method_verifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dados do método de pagamento
    payment_method_type = Column(Enum(PaymentMethodType), nullable=False)
    account_info = Column(JSON, nullable=False)  # Dados criptografados da conta
    display_info = Column(String(100), nullable=True)  # Info pública (ex: "**** 1234")
    
    # Status de verificação
    is_verified = Column(Boolean, default=False)
    verification_level = Column(Integer, default=1)  # 1=básico, 2=intermediário, 3=avançado
    verification_documents = Column(JSON, nullable=True)
    
    # Dados de verificação
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Flags de segurança
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)
    risk_level = Column(Enum(FraudRiskLevel), default=FraudRiskLevel.LOW)
    
    # Limites
    daily_limit_brl = Column(DECIMAL(12, 2), nullable=True)
    monthly_limit_brl = Column(DECIMAL(12, 2), nullable=True)
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    
    # Constraints
    __table_args__ = (
        Index('idx_payment_method_user', 'user_id'),
        Index('idx_payment_method_type', 'payment_method_type'),
        Index('idx_payment_method_verified', 'is_verified'),
        CheckConstraint('verification_level >= 1 AND verification_level <= 3', name='check_verification_level_range'),
    )

class TradeFeedback(Base):
    """Feedback específico sobre trades para métricas detalhadas"""
    __tablename__ = "trade_feedbacks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), unique=True, nullable=False)
    
    # Tempo de resposta (em minutos)
    initial_response_time = Column(Float, nullable=True)
    payment_confirmation_time = Column(Float, nullable=True)
    completion_time = Column(Float, nullable=True)
    
    # Qualidade da comunicação
    chat_messages_count = Column(Integer, default=0)
    avg_response_time_chat = Column(Float, nullable=True)
    communication_quality_score = Column(Float, nullable=True)  # 0-100
    
    # Problemas identificados
    had_payment_issues = Column(Boolean, default=False)
    had_communication_issues = Column(Boolean, default=False)
    required_dispute = Column(Boolean, default=False)
    required_admin_intervention = Column(Boolean, default=False)
    
    # Satisfação geral
    buyer_satisfaction = Column(Integer, nullable=True)  # 1-5
    seller_satisfaction = Column(Integer, nullable=True)  # 1-5
    
    # Dados automáticos
    price_vs_market = Column(Float, nullable=True)  # % diferença do preço de mercado
    volume_category = Column(String(20), nullable=True)  # small, medium, large, xlarge
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    match = relationship("P2PMatch", back_populates="feedback")
    
    # Índices
    __table_args__ = (
        Index('idx_feedback_completion_time', 'completion_time'),
        Index('idx_feedback_created_at', 'created_at'),
        CheckConstraint('buyer_satisfaction >= 1 AND buyer_satisfaction <= 5', name='check_buyer_satisfaction_range'),
        CheckConstraint('seller_satisfaction >= 1 AND seller_satisfaction <= 5', name='check_seller_satisfaction_range'),
    )
