"""
🏢 HOLD Wallet - Accounting Models
===================================

Models para registros contábeis de comissões e taxas da plataforma.
Usado para rastrear fees, spreads e outras receitas.

Author: HOLD Wallet Team
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, 
    Text, Numeric, Enum as SQLEnum, Index, func
)
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
import enum

from app.core.db import Base


class AccountingEntryType(str, enum.Enum):
    """Tipos de entrada contábil"""
    SPREAD = "spread"                    # Comissão spread
    NETWORK_FEE = "network_fee"          # Taxa de rede blockchain
    PLATFORM_FEE = "platform_fee"        # Total de fees da plataforma
    WITHDRAWAL_FEE = "withdrawal_fee"    # Taxa de saque
    DEPOSIT_FEE = "deposit_fee"          # Taxa de depósito
    TRANSACTION_FEE = "transaction_fee"  # Taxa de transação
    OTHER = "other"                      # Outras taxas


class AccountingEntryStatus(str, enum.Enum):
    """Status da entrada contábil"""
    PENDING = "pending"                  # Aguardando processamento
    SENT_TO_ERP = "sent_to_erp"          # Enviado ao ERP
    PROCESSED = "processed"              # Processado/Contabilizado
    CANCELLED = "cancelled"              # Cancelado
    FAILED = "failed"                    # Falhou


class AccountingEntry(Base):
    """
    Modelo para registros contábeis de receitas da plataforma
    
    Cada registro representa uma receita específica (spread, taxa de rede, etc.)
    relacionada a um trade ou transação.
    """
    __tablename__ = "accounting_entries"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Relacionamento com o trade (opcional - pode ser de outras fontes)
    trade_id = Column(String(36), ForeignKey("instant_trades.id"), nullable=True, index=True)
    
    # Referência externa (código do trade ou outra referência)
    reference_code = Column(String(50), nullable=True, index=True)
    
    # Tipo de entrada - usando String para compatibilidade
    entry_type = Column(
        String(20),
        nullable=False,
        index=True
    )
    
    # Valores
    amount = Column(Numeric(18, 2), nullable=False)       # Valor da entrada
    currency = Column(String(10), nullable=False, default="BRL")  # Moeda
    
    # Percentual aplicado (se aplicável)
    percentage = Column(Numeric(5, 2), nullable=True)  # Ex: 3.00 para 3%
    
    # Valor base usado para cálculo
    base_amount = Column(Numeric(18, 2), nullable=True)  # Valor sobre o qual foi calculado
    
    # Descrição detalhada
    description = Column(String(500), nullable=True)
    
    # Status - usando String para compatibilidade
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True
    )
    
    # Integração com ERP/Sistema Fiscal
    erp_reference = Column(String(100), nullable=True)   # ID no sistema externo
    erp_sent_at = Column(DateTime, nullable=True)        # Quando foi enviado
    
    # Usuário relacionado (dono do trade)
    user_id = Column(String, nullable=True, index=True)
    
    # Admin que registrou
    created_by = Column(String, nullable=True)  # Email do admin
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Metadados extras (JSON) - Note: 'metadata' is reserved in SQLAlchemy
    extra_data = Column(Text, nullable=True)
    
    # Relacionamentos
    trade = relationship(
        "InstantTrade",
        backref="accounting_entries",
        foreign_keys=[trade_id]
    )
    
    # Índices para performance
    __table_args__ = (
        Index('idx_accounting_entries_trade_id', 'trade_id'),
        Index('idx_accounting_entries_entry_type', 'entry_type'),
        Index('idx_accounting_entries_status', 'status'),
        Index('idx_accounting_entries_created_at', 'created_at'),
        Index('idx_accounting_entries_reference_code', 'reference_code'),
        Index('idx_accounting_entries_user_id', 'user_id'),
    )
    
    def __repr__(self):
        return f"<AccountingEntry(id={self.id}, type={self.entry_type}, amount={self.amount})>"


class AccountingReport(Base):
    """
    Modelo para relatórios contábeis consolidados
    
    Armazena resumos diários/semanais/mensais das receitas.
    """
    __tablename__ = "accounting_reports"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Período do relatório
    period_type = Column(String(20), nullable=False)  # 'daily', 'weekly', 'monthly'
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False)
    
    # Totais
    total_spread = Column(Numeric(18, 2), nullable=False, default=0)
    total_network_fees = Column(Numeric(18, 2), nullable=False, default=0)
    total_platform_fees = Column(Numeric(18, 2), nullable=False, default=0)
    total_other_fees = Column(Numeric(18, 2), nullable=False, default=0)
    grand_total = Column(Numeric(18, 2), nullable=False, default=0)
    
    # Contadores
    trades_count = Column(Integer, nullable=False, default=0)
    entries_count = Column(Integer, nullable=False, default=0)
    
    # Moeda
    currency = Column(String(10), nullable=False, default="BRL")
    
    # Status
    status = Column(String(20), nullable=False, default="generated")  # generated, sent, confirmed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Metadados (JSON com detalhes)
    report_data = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_accounting_reports_period', 'period_type', 'period_start'),
    )
    
    def __repr__(self):
        return f"<AccountingReport(id={self.id}, period={self.period_type}, total={self.grand_total})>"
