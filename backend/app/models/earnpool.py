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


class YieldPeriodType(str, enum.Enum):
    """Tipo de período para exibição da taxa de rendimento"""
    WEEKLY = "WEEKLY"      # Por semana
    MONTHLY = "MONTHLY"    # Por mês
    YEARLY = "YEARLY"      # Por ano (APY)


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
    yield_period_type = Column(String(20), nullable=False, default="WEEKLY")  # WEEKLY, MONTHLY, YEARLY
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
    
    # Transferência para sistema (admin)
    tx_hash_to_system = Column(String(100), nullable=True)  # TX de transferência para carteira do sistema
    transferred_to_system_at = Column(DateTime, nullable=True)  # Data da transferência
    transferred_by_admin = Column(String(50), nullable=True)  # ID do admin que fez a transferência
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    # Relacionamentos
    user = relationship("User", backref="earnpool_deposits")

    __table_args__ = (
        Index('ix_earnpool_deposits_user_status', 'user_id', 'status'),
        Index('ix_earnpool_deposits_status', 'status'),
        CheckConstraint('usdt_amount >= 50', name='ck_earnpool_min_deposit'),
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


# ============================================================================
# POOL TIERS - Sistema de Níveis para Revenue Sharing
# ============================================================================

class EarnPoolTier(Base):
    """
    Configuração dos Tiers do Pool de Liquidez
    
    Define os níveis de participação e as porcentagens de 
    compartilhamento da receita (taxa de rede) acumulada.
    
    A receita vem de:
    - WolkPay (pagamentos)
    - Trade Instantâneo
    - Boletos
    - Outros serviços
    
    Regras:
    - Cada tier tem um range de valor mínimo/máximo
    - Cada tier recebe uma % do pool de taxas acumulado
    - A distribuição é proporcional ao valor depositado pelo cooperado
    - NUNCA pode exceder o pool acumulado (revenue_pool)
    """
    __tablename__ = "earnpool_tiers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação do Tier
    tier_level = Column(Integer, nullable=False, unique=True)  # 1-10
    name = Column(String(50), nullable=False)                  # "Starter", "Bronze", etc.
    name_key = Column(String(50), nullable=False)              # i18n key: "tier.starter"
    
    # Range de valores (em USDT)
    min_deposit_usdt = Column(Numeric(18, 2), nullable=False)  # Mínimo para entrar no tier
    max_deposit_usdt = Column(Numeric(18, 2), nullable=True)   # Máximo (NULL = sem limite)
    
    # Porcentagem do Pool de Taxas que este tier recebe
    # Ex: 0.50 = 0.50% do pool de taxas acumulado
    pool_share_percentage = Column(Numeric(5, 4), nullable=False)
    
    # Benefícios adicionais
    withdrawal_priority_days = Column(Integer, default=7)       # Dias para saque (D+X)
    early_withdrawal_discount = Column(Numeric(5, 2), default=0) # Desconto na taxa de saque antecipado
    
    # Visual/Badge
    badge_color = Column(String(20), nullable=True)             # Cor do badge: "#FFD700"
    badge_icon = Column(String(50), nullable=True)              # Ícone: "star", "crown", "whale"
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (
        Index('ix_earnpool_tiers_level', 'tier_level'),
        CheckConstraint('tier_level >= 1 AND tier_level <= 10', name='ck_tier_level_range'),
        CheckConstraint('pool_share_percentage >= 0 AND pool_share_percentage <= 100', name='ck_pool_share_range'),
    )


class EarnPoolRevenuePool(Base):
    """
    Pool de Receita Acumulada (Taxa de Rede)
    
    Registra a receita acumulada de todas as operações da plataforma
    que será compartilhada com os cooperados do EarnPool.
    
    Fontes de receita:
    - WolkPay: taxas de pagamentos
    - Trade Instantâneo: spread + taxas
    - Boletos: taxas de processamento
    - Outros: qualquer taxa de rede
    """
    __tablename__ = "earnpool_revenue_pool"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Período
    period_start = Column(DateTime, nullable=False)             # Início do período
    period_end = Column(DateTime, nullable=False)               # Fim do período
    
    # Receitas por fonte (em USDT)
    revenue_wolkpay = Column(Numeric(18, 2), default=0)         # Taxas WolkPay
    revenue_instant_trade = Column(Numeric(18, 2), default=0)   # Taxas Trade Instantâneo
    revenue_bills = Column(Numeric(18, 2), default=0)           # Taxas de Boletos
    revenue_other = Column(Numeric(18, 2), default=0)           # Outras taxas
    
    # Total
    total_revenue = Column(Numeric(18, 2), nullable=False, default=0)
    
    # Distribuição
    total_distributed = Column(Numeric(18, 2), default=0)       # Total já distribuído
    remaining_balance = Column(Numeric(18, 2), default=0)       # Saldo restante
    
    # Status
    status = Column(String(20), default="ACCUMULATING")         # ACCUMULATING, DISTRIBUTING, DISTRIBUTED
    distributed_at = Column(DateTime, nullable=True)
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index('ix_earnpool_revenue_period', 'period_start', 'period_end'),
        Index('ix_earnpool_revenue_status', 'status'),
    )


class EarnPoolTierDistribution(Base):
    """
    Distribuição de receita por Tier
    
    Registra quanto cada tier recebeu do pool de receita
    e como foi distribuído entre os cooperados daquele tier.
    """
    __tablename__ = "earnpool_tier_distributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    revenue_pool_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_revenue_pool.id"), nullable=False)
    tier_id = Column(Integer, ForeignKey("earnpool_tiers.id"), nullable=False)
    
    # Valores do Tier neste período
    tier_total_deposits = Column(Numeric(18, 2), nullable=False)  # Total depositado no tier
    tier_cooperators_count = Column(Integer, nullable=False)       # Qtd de cooperados no tier
    
    # Distribuição
    pool_share_percentage = Column(Numeric(5, 4), nullable=False)  # % do pool para este tier
    amount_to_distribute = Column(Numeric(18, 2), nullable=False)  # Valor a distribuir
    amount_distributed = Column(Numeric(18, 2), default=0)         # Valor já distribuído
    
    # Status
    status = Column(String(20), default="PENDING")                 # PENDING, DISTRIBUTED
    distributed_at = Column(DateTime, nullable=True)
    
    # Auditoria
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    revenue_pool = relationship("EarnPoolRevenuePool", backref="tier_distributions")
    tier = relationship("EarnPoolTier", backref="distributions")

    __table_args__ = (
        Index('ix_earnpool_tier_dist_revenue', 'revenue_pool_id'),
        Index('ix_earnpool_tier_dist_tier', 'tier_id'),
    )


class EarnPoolCooperatorDistribution(Base):
    """
    Distribuição individual para cada cooperado
    
    Registra quanto cada cooperado recebeu baseado em:
    - Seu tier atual
    - Seu valor depositado
    - Proporção em relação aos outros do mesmo tier
    """
    __tablename__ = "earnpool_cooperator_distributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    tier_distribution_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_tier_distributions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deposit_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_deposits.id"), nullable=False)
    
    # Valores do cooperado
    user_tier_level = Column(Integer, nullable=False)              # Tier do usuário no momento
    user_deposit_amount = Column(Numeric(18, 2), nullable=False)   # Valor depositado
    user_share_percentage = Column(Numeric(10, 8), nullable=False) # % dentro do tier
    
    # Rendimento recebido
    yield_amount = Column(Numeric(18, 8), nullable=False)          # Valor recebido
    
    # Auditoria
    distributed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    tier_distribution = relationship("EarnPoolTierDistribution", backref="cooperator_distributions")
    user = relationship("User", backref="earnpool_cooperator_distributions")
    deposit = relationship("EarnPoolDeposit", backref="cooperator_distributions")

    __table_args__ = (
        Index('ix_earnpool_coop_dist_user', 'user_id'),
        Index('ix_earnpool_coop_dist_tier', 'tier_distribution_id'),
    )


# ============================================================================
# VIRTUAL CREDITS & PERFORMANCE FEES
# ============================================================================

class EarnPoolVirtualCredit(Base):
    """
    Crédito Virtual Administrativo
    
    Quando um investidor não foi processado automaticamente no sistema
    (ex: 2.779 USDT do seu caso), o admin pode creditar manualmente.
    
    Funciona como um depósito virtual:
    - Usuário recebe crédito de USDT no pool
    - Participa dos rendimentos semanais
    - Pode solicitar saque após período de bloqueio
    
    Sistema de Bloqueio:
    - lock_period_days: Período de bloqueio (180-365 dias)
    - lock_ends_at: Data que o bloqueio termina
    - Antes do bloqueio: só pode sacar o yield (performance fee)
    - Após bloqueio: pode sacar tudo
    
    Diferenças vs depósito normal:
    - Sem blockchain (é virtual)
    - Criado manualmente pelo admin
    - Pode ter motivo/notas explicando a origem
    """
    __tablename__ = "earnpool_virtual_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Crédito
    usdt_amount = Column(Numeric(18, 2), nullable=False)           # Valor creditado (principal)
    reason = Column(String(100), nullable=False)                   # Ex: "INVESTOR_CORRECTION", "MISSING_DEPOSIT"
    reason_details = Column(Text, nullable=True)                   # Detalhes da razão
    
    # Rendimentos acumulados
    total_yield_earned = Column(Numeric(18, 8), nullable=False, default=0)
    
    # 🔒 SISTEMA DE BLOQUEIO
    lock_period_days = Column(Integer, nullable=False, default=180)  # Período de bloqueio (6-12 meses)
    lock_ends_at = Column(DateTime, nullable=True)                   # Data que o bloqueio termina
    
    # Controle de saques
    yield_withdrawn = Column(Numeric(18, 8), nullable=False, default=0)  # Quanto de yield já foi sacado
    principal_withdrawn = Column(Numeric(18, 2), nullable=False, default=0)  # Quanto do principal foi sacado
    
    # Datas
    credited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_yield_at = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)                      # Se está gerando rendimentos
    status = Column(String(20), default="LOCKED")                  # LOCKED, UNLOCKED, WITHDRAWN
    
    # Auditoria
    credited_by_admin_id = Column(UUID(as_uuid=True), nullable=False)      # Admin que creditou
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    # Relacionamentos
    user = relationship("User", backref="earnpool_virtual_credits")
    
    @property
    def is_locked(self) -> bool:
        """Verifica se o crédito ainda está bloqueado"""
        if not self.lock_ends_at:
            return True
        return datetime.now(timezone.utc) < self.lock_ends_at
    
    @property
    def available_yield(self) -> Decimal:
        """Yield disponível para saque (pode sacar mesmo durante bloqueio)"""
        return Decimal(str(self.total_yield_earned or 0)) - Decimal(str(self.yield_withdrawn or 0))
    
    @property
    def available_principal(self) -> Decimal:
        """Principal disponível para saque (só após desbloqueio)"""
        if self.is_locked:
            return Decimal("0")
        return Decimal(str(self.usdt_amount)) - Decimal(str(self.principal_withdrawn or 0))
    
    @property
    def days_until_unlock(self) -> int:
        """Dias até o desbloqueio"""
        if not self.lock_ends_at or not self.is_locked:
            return 0
        delta = self.lock_ends_at - datetime.now(timezone.utc)
        return max(0, delta.days)

    __table_args__ = (
        Index('ix_earnpool_vc_user', 'user_id'),
        Index('ix_earnpool_vc_active', 'is_active'),
        Index('ix_earnpool_vc_status', 'status'),
        CheckConstraint('usdt_amount > 0', name='ck_vc_amount_positive'),
        CheckConstraint('lock_period_days >= 180 AND lock_period_days <= 365', name='ck_vc_lock_period_valid'),
    )


class EarnPoolPerformanceFee(Base):
    """
    Taxa de Performance do Investidor
    
    Admin pode pagar uma taxa de performance baseada em % do montante
    do investidor em custódia, referente a operações passadas.
    
    Exemplo:
    - Investidor depositou: 2.779 USDT
    - Taxa de performance: 0.35%
    - Valor pago: 2.779 * 0.35% = 9.73 USDT
    
    Funciona como:
    - Admin define o percentual
    - Sistema calcula o valor
    - Cria um "virtual credit" para o investidor
    - Rastreia tudo para auditoria
    """
    __tablename__ = "earnpool_performance_fees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamentos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    virtual_credit_id = Column(UUID(as_uuid=True), ForeignKey("earnpool_virtual_credits.id"), nullable=True)
    
    # Cálculo
    base_amount_usdt = Column(Numeric(18, 2), nullable=False)      # Montante em custódia
    performance_percentage = Column(Numeric(5, 2), nullable=False) # Percentual (ex: 0.35)
    fee_amount_usdt = Column(Numeric(18, 8), nullable=False)       # Valor calculado
    
    # Período (operações passadas)
    period_description = Column(String(100), nullable=False)       # Ex: "2024-2025" ou "Operações Passadas"
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String(20), default="CALCULATED")              # CALCULATED, CREDITED, PAID_OUT
    
    # Pagamento
    credited_at = Column(DateTime, nullable=True)                  # Quando foi creditado
    
    # Auditoria
    created_by_admin_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    # Relacionamentos
    user = relationship("User", backref="earnpool_performance_fees")
    virtual_credit = relationship("EarnPoolVirtualCredit", backref="performance_fees")

    __table_args__ = (
        Index('ix_earnpool_pf_user', 'user_id'),
        Index('ix_earnpool_pf_status', 'status'),
        CheckConstraint('fee_amount_usdt > 0', name='ck_pf_amount_positive'),
    )
