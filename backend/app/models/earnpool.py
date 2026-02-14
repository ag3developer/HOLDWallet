"""
💰 EarnPool - Liquidity Pool Models
====================================

Models para o sistema EarnPool de rendimentos.
Usuários depositam crypto → convertido em USDT virtual → participam do pool de liquidez.
Rendimentos semanais baseados nas operações reais da plataforma.

Regras:
- Depósito mínimo: $250 USDT
- Lock mínimo: 30 dias
- Rendimentos: Semanais (variável, baseado em operações reais)
- Saque normal: D+7 após período mínimo
- Saque antecipado: Com taxa administrativa + operacional

Author: WolkNow Team
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    Text, Numeric, Enum as SQLEnum, Index, func, CheckConstraint
)
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import enum

from app.core.db import Base
from app.core.uuid_type import UUID


# ============================================================================
# ENUMS
# ============================================================================

class DepositStatus(str, enum.Enum):
    """Status do depósito EarnPool"""
    PENDING = "PENDING"              # Aguardando confirmação do swap
    ACTIVE = "ACTIVE"                # Ativo e gerando rendimentos
    LOCKED = "LOCKED"                # Dentro do período mínimo (30 dias)
    WITHDRAWAL_PENDING = "WITHDRAWAL_PENDING"  # Saque solicitado (D+7)
    WITHDRAWN = "WITHDRAWN"          # Saque concluído
    CANCELLED = "CANCELLED"          # Cancelado


class WithdrawalStatus(str, enum.Enum):
    """Status do saque EarnPool"""
    PENDING = "PENDING"              # Solicitado, aguardando D+7
    PROCESSING = "PROCESSING"        # Em processamento
    APPROVED = "APPROVED"            # Aprovado (para saques antecipados)
    COMPLETED = "COMPLETED"          # Concluído
    CANCELLED = "CANCELLED"          # Cancelado
    REJECTED = "REJECTED"            # Rejeitado (saque antecipado negado)


class YieldStatus(str, enum.Enum):
    """Status do rendimento semanal"""
    PENDING = "PENDING"              # Calculado, aguardando distribuição
    DISTRIBUTED = "DISTRIBUTED"      # Distribuído para os usuários
    CANCELLED = "CANCELLED"          # Cancelado


# ============================================================================
# MODELS
# ============================================================================

class EarnPoolConfig(Base):
    """
    Configurações globais do EarnPool
    
    Apenas uma linha ativa por vez (is_active=True).
    Histórico mantido para auditoria.
    """
    __tablename__ = "earnpool_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Limites
    min_deposit_usdt = Column(Numeric(18, 2), nullable=False, default=250.00)  # $250 mínimo
    max_deposit_usdt = Column(Numeric(18, 2), nullable=True)                   # Sem limite máximo
    
    # Períodos
    lock_period_days = Column(Integer, nullable=False, default=30)            # 30 dias lock
    withdrawal_delay_days = Column(Integer, nullable=False, default=7)        # D+7 para saque
    
    # Taxas
    early_withdrawal_admin_fee = Column(Numeric(5, 2), nullable=False, default=2.00)  # 2% taxa admin
    early_withdrawal_op_fee = Column(Numeric(5, 2), nullable=False, default=1.00)     # 1% taxa operacional
    
    # Pool
    target_weekly_yield_percentage = Column(Numeric(5, 4), nullable=False, default=0.7500)  # 0.75% meta semanal (~3% mês)
    max_pool_size_usdt = Column(Numeric(18, 2), nullable=True)                # Limite do pool (opcional)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_accepting_deposits = Column(Boolean, default=True)
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), nullable=True)  # Admin que criou
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index('ix_earnpool_config_active', 'is_active'),
    )


class EarnPoolDeposit(Base):
    """
    Depósitos dos usuários no EarnPool
    
    Fluxo:
    1. Usuário deposita crypto (BTC, ETH, etc.)
    2. Sistema converte para USDT (swap virtual)
    3. Crypto real vai para carteira operacional
    4. Usuário recebe saldo USDT virtual no pool
    5. A cada semana, rendimentos são creditados
    """
    __tablename__ = "earnpool_deposits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Crypto original depositada
    original_crypto_symbol = Column(String(10), nullable=False)      # BTC, ETH, USDT, etc.
    original_crypto_amount = Column(Numeric(28, 18), nullable=False) # Quantidade original
    original_crypto_price_usd = Column(Numeric(18, 8), nullable=False)  # Preço no momento
    
    # Valor convertido em USDT (virtual)
    usdt_amount = Column(Numeric(18, 2), nullable=False)             # Valor em USDT no pool
    
    # Rendimentos acumulados
    total_yield_earned = Column(Numeric(18, 8), nullable=False, default=0)  # Total ganho até agora
    
    # Datas
    deposited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    lock_ends_at = Column(DateTime, nullable=False)  # deposited_at + 30 dias
    last_yield_at = Column(DateTime, nullable=True)  # Último rendimento creditado
    
    # Status
    status = Column(SQLEnum(DepositStatus), nullable=False, default=DepositStatus.LOCKED)
    
    # Blockchain (crypto real movida para carteira operacional)
    tx_hash_in = Column(String(100), nullable=True)      # TX do depósito
    operational_wallet_address = Column(String(100), nullable=True)  # Destino da crypto
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    # Relacionamentos
    user = relationship("User", backref="earnpool_deposits")

    __table_args__ = (
        Index('ix_earnpool_deposits_user_status', 'user_id', 'status'),
        Index('ix_earnpool_deposits_status', 'status'),
        CheckConstraint('usdt_amount >= 250', name='ck_earnpool_min_deposit'),
    )


class EarnPoolWithdrawal(Base):
    """
    Saques do EarnPool
    
    Tipos de saque:
    1. Normal: Após 30 dias, solicita saque → D+7 → liberado
    2. Antecipado: Antes de 30 dias → taxa admin + operacional → aprovação manual
    """
    __tablename__ = "earnpool_withdrawals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    deposit_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_deposits.id"), nullable=False)
    
    # Valores
    usdt_amount = Column(Numeric(18, 2), nullable=False)             # Valor solicitado
    yield_amount = Column(Numeric(18, 8), nullable=False, default=0) # Rendimentos incluídos
    
    # Taxas (para saque antecipado)
    admin_fee_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    admin_fee_amount = Column(Numeric(18, 2), nullable=False, default=0)
    operational_fee_percentage = Column(Numeric(5, 2), nullable=False, default=0)
    operational_fee_amount = Column(Numeric(18, 2), nullable=False, default=0)
    
    # Total após taxas
    net_amount = Column(Numeric(18, 2), nullable=False)              # Valor líquido
    
    # Destino
    destination_type = Column(String(20), nullable=False, default="wallet")  # wallet, pix, ted
    destination_address = Column(String(200), nullable=True)         # Wallet address ou chave PIX
    destination_crypto = Column(String(10), nullable=True)           # Crypto de destino (se wallet)
    
    # Datas
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    available_at = Column(DateTime, nullable=False)                  # requested_at + 7 dias
    processed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Status
    status = Column(SQLEnum(WithdrawalStatus), nullable=False, default=WithdrawalStatus.PENDING)
    is_early_withdrawal = Column(Boolean, default=False)             # Saque antecipado?
    
    # Aprovação (para saque antecipado)
    approved_by = Column(UUID(as_uuid=True), nullable=True)                  # Admin que aprovou
    approval_notes = Column(Text, nullable=True)
    
    # Blockchain
    tx_hash_out = Column(String(100), nullable=True)                 # TX do pagamento
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    user = relationship("User", backref="earnpool_withdrawals")
    deposit = relationship("EarnPoolDeposit", backref="withdrawals")

    __table_args__ = (
        Index('ix_earnpool_withdrawals_user_status', 'user_id', 'status'),
        Index('ix_earnpool_withdrawals_status', 'status'),
    )


class EarnPoolYield(Base):
    """
    Rendimentos semanais do EarnPool
    
    Calculados com base nas operações reais da plataforma:
    - OTC trades (spread)
    - Boletos pagos
    - Recargas de celular
    - Outras operações
    
    Distribuídos proporcionalmente ao saldo de cada usuário.
    """
    __tablename__ = "earnpool_yields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Período
    week_start = Column(DateTime, nullable=False)                    # Início da semana
    week_end = Column(DateTime, nullable=False)                      # Fim da semana
    
    # Pool no período
    total_pool_usdt = Column(Numeric(18, 2), nullable=False)         # Total no pool
    active_deposits_count = Column(Integer, nullable=False)          # Número de depósitos ativos
    
    # Receita da plataforma no período
    platform_revenue_usdt = Column(Numeric(18, 2), nullable=False)   # Receita total
    revenue_from_otc = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_from_bills = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_from_recharge = Column(Numeric(18, 2), nullable=False, default=0)
    revenue_from_other = Column(Numeric(18, 2), nullable=False, default=0)
    
    # Distribuição
    percentage_to_pool = Column(Numeric(5, 2), nullable=False)       # % distribuído para o pool
    total_yield_distributed = Column(Numeric(18, 8), nullable=False) # Total distribuído
    effective_yield_percentage = Column(Numeric(8, 6), nullable=False)  # % efetivo da semana
    
    # Status
    status = Column(SQLEnum(YieldStatus), nullable=False, default=YieldStatus.PENDING)
    
    # Auditoria
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    distributed_at = Column(DateTime, nullable=True)
    calculated_by = Column(UUID(as_uuid=True), nullable=True)               # Admin ou "system"
    
    # Detalhes
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index('ix_earnpool_yields_period', 'week_start', 'week_end'),
        Index('ix_earnpool_yields_status', 'status'),
    )


class EarnPoolYieldDistribution(Base):
    """
    Distribuição individual de rendimentos
    
    Registro de quanto cada usuário recebeu em cada semana.
    """
    __tablename__ = "earnpool_yield_distributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    yield_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_yields.id"), nullable=False)
    deposit_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_deposits.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Valores
    user_pool_balance = Column(Numeric(18, 2), nullable=False)       # Saldo do usuário no momento
    pool_share_percentage = Column(Numeric(10, 8), nullable=False)   # % do pool
    yield_amount = Column(Numeric(18, 8), nullable=False)            # Rendimento recebido
    
    # Auditoria
    distributed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    yield_record = relationship("EarnPoolYield", backref="distributions")
    deposit = relationship("EarnPoolDeposit", backref="yield_distributions")
    user = relationship("User", backref="earnpool_yield_distributions")

    __table_args__ = (
        Index('ix_earnpool_yield_dist_user', 'user_id'),
        Index('ix_earnpool_yield_dist_yield', 'yield_id'),
    )
