"""
💰 EarnPool - Pydantic Schemas
==============================

Schemas para validação de entrada/saída da API EarnPool.

Author: WolkNow Team
"""

from pydantic import BaseModel, Field, field_validator, validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID


# ============================================================================
# ENUMS
# ============================================================================

class DepositStatusEnum(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    WITHDRAWAL_PENDING = "WITHDRAWAL_PENDING"
    WITHDRAWN = "WITHDRAWN"
    CANCELLED = "CANCELLED"


class WithdrawalStatusEnum(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class YieldStatusEnum(str, Enum):
    PENDING = "PENDING"
    DISTRIBUTED = "DISTRIBUTED"
    CANCELLED = "CANCELLED"


class YieldPeriodTypeEnum(str, Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


# ============================================================================
# CONFIG SCHEMAS
# ============================================================================

class EarnPoolConfigBase(BaseModel):
    min_deposit_usdt: Decimal = Field(default=Decimal("250.00"), description="Depósito mínimo em USDT")
    max_deposit_usdt: Optional[Decimal] = Field(default=None, description="Depósito máximo em USDT")
    lock_period_days: int = Field(default=30, description="Período de lock em dias")
    withdrawal_delay_days: int = Field(default=7, description="Delay para saque (D+X)")
    early_withdrawal_admin_fee: Decimal = Field(default=Decimal("2.00"), description="Taxa admin para saque antecipado (%)")
    early_withdrawal_op_fee: Decimal = Field(default=Decimal("1.00"), description="Taxa operacional para saque antecipado (%)")
    target_weekly_yield_percentage: Decimal = Field(default=Decimal("0.75"), description="Meta de rendimento (%)")
    yield_period_type: YieldPeriodTypeEnum = Field(default=YieldPeriodTypeEnum.WEEKLY, description="Tipo de período: WEEKLY, MONTHLY, YEARLY")
    max_pool_size_usdt: Optional[Decimal] = Field(default=None, description="Tamanho máximo do pool")
    is_accepting_deposits: bool = Field(default=True, description="Aceitando novos depósitos?")


class EarnPoolConfigResponse(EarnPoolConfigBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class EarnPoolConfigUpdate(BaseModel):
    min_deposit_usdt: Optional[Decimal] = None
    max_deposit_usdt: Optional[Decimal] = None
    lock_period_days: Optional[int] = None
    withdrawal_delay_days: Optional[int] = None
    early_withdrawal_admin_fee: Optional[Decimal] = None
    early_withdrawal_op_fee: Optional[Decimal] = None
    target_weekly_yield_percentage: Optional[Decimal] = None
    yield_period_type: Optional[YieldPeriodTypeEnum] = None
    max_pool_size_usdt: Optional[Decimal] = None
    is_accepting_deposits: Optional[bool] = None
    notes: Optional[str] = None


# ============================================================================
# DEPOSIT SCHEMAS
# ============================================================================

class DepositRequest(BaseModel):
    """Solicitação de depósito no EarnPool"""
    crypto_symbol: str = Field(..., description="Símbolo da crypto (BTC, ETH, USDT, etc.)")
    crypto_amount: Decimal = Field(..., gt=0, description="Quantidade de crypto a depositar")
    crypto_network: Optional[str] = Field(None, description="Network da crypto (bitcoin, ethereum, etc.)")
    usdt_amount: Optional[Decimal] = Field(None, description="Valor em USDT (opcional, calculado pelo backend)")
    
    @validator('crypto_symbol')
    def validate_symbol(cls, v):
        allowed = ['BTC', 'ETH', 'USDT', 'SOL', 'MATIC', 'BNB', 'AVAX', 'DOT', 'ADA', 'LTC', 'XRP', 'TRX', 'TRAY', 'USDC', 'DOGE', 'LINK', 'SHIB']
        if v.upper() not in allowed:
            raise ValueError(f'Crypto não suportada. Permitidas: {", ".join(allowed)}')
        return v.upper()


class DepositPreviewResponse(BaseModel):
    """Preview do depósito antes de confirmar"""
    crypto_symbol: str
    crypto_amount: Decimal
    crypto_price_usd: Decimal
    usdt_equivalent: Decimal
    meets_minimum: bool
    minimum_required: Decimal
    lock_period_days: int
    lock_ends_at: datetime
    message: Optional[str] = None


class DepositConfirmRequest(BaseModel):
    """Confirmação do depósito"""
    crypto_symbol: str
    crypto_amount: Decimal
    accept_terms: bool = Field(default=True, description="Usuário aceita os termos do EarnPool")
    crypto_network: Optional[str] = Field(None, description="Network da crypto")
    wallet_id: Optional[str] = Field(None, description="ID da wallet do usuário")
    
    @validator('accept_terms')
    def must_accept_terms(cls, v):
        if not v:
            raise ValueError('Você deve aceitar os termos do EarnPool')
        return v


class DepositResponse(BaseModel):
    """Resposta após depósito"""
    id: str
    user_id: str
    original_crypto_symbol: str
    original_crypto_amount: Decimal
    original_crypto_price_usd: Decimal
    usdt_amount: Decimal
    total_yield_earned: Decimal
    status: DepositStatusEnum
    deposited_at: datetime
    lock_ends_at: datetime
    last_yield_at: Optional[datetime]
    tx_hash_in: Optional[str]
    
    @field_validator('id', 'user_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


# ============================================================================
# WITHDRAWAL SCHEMAS
# ============================================================================

class WithdrawalRequest(BaseModel):
    """Solicitação de saque do EarnPool"""
    deposit_id: Optional[str] = Field(default=None, description="ID do depósito a sacar (opcional)")
    amount: Optional[Decimal] = Field(default=None, gt=0, description="Valor a sacar em USDT")
    amount_usdt: Optional[Decimal] = Field(default=None, description="Valor parcial (alias para amount)")
    destination_type: str = Field(default="wallet", description="Destino: wallet, pix, ted")
    destination_address: Optional[str] = Field(default=None, description="Endereço/chave de destino")
    destination_crypto: Optional[str] = Field(default="USDT", description="Crypto de destino (se wallet)")
    
    @validator('destination_type')
    def validate_destination(cls, v):
        allowed = ['wallet', 'pix', 'ted']
        if v.lower() not in allowed:
            raise ValueError(f'Destino inválido. Permitidos: {", ".join(allowed)}')
        return v.lower()
    
    @validator('amount_usdt', always=True)
    def sync_amount_fields(cls, v, values):
        # Se amount_usdt não foi fornecido mas amount sim, usar amount
        if v is None and values.get('amount') is not None:
            return values.get('amount')
        return v


class WithdrawalPreviewResponse(BaseModel):
    """Preview do saque antes de confirmar"""
    deposit_id: str
    usdt_balance: Decimal
    yield_balance: Decimal
    total_available: Decimal
    amount_requested: Decimal
    is_early_withdrawal: bool
    lock_ends_at: datetime
    
    # Taxas (se saque antecipado)
    admin_fee_percentage: Decimal
    admin_fee_amount: Decimal
    operational_fee_percentage: Decimal
    operational_fee_amount: Decimal
    total_fees: Decimal
    
    # Valor líquido
    net_amount: Decimal
    
    # Disponibilidade
    available_at: datetime
    processing_days: int
    
    message: Optional[str] = None


class WithdrawalConfirmRequest(BaseModel):
    """Confirmação do saque"""
    deposit_id: Optional[str] = Field(default=None, description="ID do depósito (opcional)")
    amount: Optional[Decimal] = Field(default=None, gt=0, description="Valor a sacar em USDT")
    amount_usdt: Optional[Decimal] = None
    destination_type: str = Field(default="wallet")
    destination_address: Optional[str] = None
    destination_crypto: Optional[str] = Field(default="USDT")
    accept_fees: bool = Field(default=True, description="Aceita as taxas (para saque antecipado)")
    
    @validator('amount_usdt', always=True)
    def sync_amount_fields(cls, v, values):
        if v is None and values.get('amount') is not None:
            return values.get('amount')
        return v


class WithdrawalResponse(BaseModel):
    """Resposta após solicitar saque"""
    id: str
    user_id: str
    deposit_id: str
    usdt_amount: Decimal
    yield_amount: Decimal
    admin_fee_amount: Decimal
    operational_fee_amount: Decimal
    net_amount: Decimal
    destination_type: str
    destination_address: Optional[str]
    destination_crypto: Optional[str]
    status: WithdrawalStatusEnum
    is_early_withdrawal: bool
    requested_at: datetime
    available_at: datetime
    
    @field_validator('id', 'user_id', 'deposit_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


# ============================================================================
# BALANCE & HISTORY SCHEMAS
# ============================================================================

class EarnPoolBalanceResponse(BaseModel):
    """Saldo completo do usuário no EarnPool"""
    total_deposited_usdt: Decimal
    total_yield_earned: Decimal
    total_balance: Decimal
    pending_withdrawals: Decimal
    available_balance: Decimal
    active_deposits_count: int
    deposits: List[DepositResponse]


class YieldHistoryItem(BaseModel):
    """Item do histórico de rendimentos"""
    id: str
    week_start: datetime
    week_end: datetime
    deposit_id: str
    user_pool_balance: Decimal
    pool_share_percentage: Decimal
    yield_amount: Decimal
    distributed_at: datetime
    
    @field_validator('id', 'deposit_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class EarnPoolHistoryResponse(BaseModel):
    """Histórico completo do usuário"""
    deposits: List[DepositResponse]
    withdrawals: List[WithdrawalResponse]
    yields: List[YieldHistoryItem]
    summary: dict


# ============================================================================
# ADMIN SCHEMAS
# ============================================================================

class AdminPoolOverviewResponse(BaseModel):
    """Visão geral do pool para admin"""
    total_pool_usdt: Decimal
    active_deposits_count: int
    total_users: int
    pending_withdrawals_count: int
    pending_withdrawals_amount: Decimal
    total_yields_distributed: Decimal
    this_week_yield: Optional[Decimal]
    config: EarnPoolConfigResponse


class AdminDepositListResponse(BaseModel):
    """Lista de depósitos para admin"""
    deposits: List[DepositResponse]
    total: int
    page: int
    per_page: int


class AdminWithdrawalApproveRequest(BaseModel):
    """Aprovar saque antecipado"""
    withdrawal_id: str
    approve: bool
    notes: Optional[str] = None


class ProcessYieldsRequest(BaseModel):
    """Processar rendimentos da semana"""
    week_start: datetime
    week_end: datetime
    platform_revenue_usdt: Decimal
    revenue_from_otc: Decimal = Decimal("0")
    revenue_from_bills: Decimal = Decimal("0")
    revenue_from_recharge: Decimal = Decimal("0")
    revenue_from_other: Decimal = Decimal("0")
    percentage_to_pool: Decimal = Field(..., ge=0, le=100, description="% da receita para o pool")
    notes: Optional[str] = None


class ProcessYieldsResponse(BaseModel):
    """Resultado do processamento de rendimentos"""
    yield_id: str
    week_start: datetime
    week_end: datetime
    total_pool_usdt: Decimal
    platform_revenue_usdt: Decimal
    percentage_to_pool: Decimal
    total_yield_distributed: Decimal
    effective_yield_percentage: Decimal
    distributions_count: int
    status: YieldStatusEnum


# ============================================================================
# VIRTUAL CREDITS & PERFORMANCE FEES SCHEMAS
# ============================================================================

class VirtualCreditCreateRequest(BaseModel):
    """Criar crédito virtual administrativo"""
    user_id: str = Field(..., description="ID do usuário")
    usdt_amount: Decimal = Field(..., gt=0, description="Valor em USDT a creditar")
    reason: str = Field(..., description="Motivo: INVESTOR_CORRECTION, MISSING_DEPOSIT, OTHER")
    reason_details: Optional[str] = Field(None, description="Detalhes da razão")
    notes: Optional[str] = Field(None, description="Notas internas")
    lock_period_days: int = Field(180, ge=180, le=365, description="Período de bloqueio em dias (180-365)")


class VirtualCreditResponse(BaseModel):
    """Resposta de crédito virtual"""
    id: str
    user_id: str
    usdt_amount: Decimal
    reason: str
    reason_details: Optional[str]
    total_yield_earned: Decimal
    credited_at: datetime
    is_active: bool
    credited_by_admin_id: str
    notes: Optional[str]
    # Campos de bloqueio
    lock_period_days: int = 180
    lock_ends_at: Optional[datetime] = None
    status: str = "LOCKED"
    yield_withdrawn: Decimal = Decimal("0")
    principal_withdrawn: Decimal = Decimal("0")
    
    @field_validator('id', 'user_id', 'credited_by_admin_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class VirtualCreditAdjustRequest(BaseModel):
    """Ajustar crédito virtual (admin)"""
    credit_id: str = Field(..., description="ID do crédito virtual")
    new_usdt_amount: Optional[Decimal] = Field(None, description="Novo valor em USDT")
    new_lock_period_days: Optional[int] = Field(None, ge=0, le=730, description="Novo período de bloqueio em dias")
    new_lock_ends_at: Optional[datetime] = Field(None, description="Nova data de desbloqueio")
    new_status: Optional[str] = Field(None, description="Novo status: LOCKED, UNLOCKED, WITHDRAWN")
    notes: Optional[str] = Field(None, description="Notas internas")


class VirtualCreditWithdrawRequest(BaseModel):
    """Solicitar saque de crédito virtual"""
    credit_id: str = Field(..., description="ID do crédito virtual")
    withdraw_type: str = Field(..., description="Tipo: YIELD_ONLY, PRINCIPAL_ONLY, FULL")
    amount: Optional[Decimal] = Field(None, gt=0, description="Valor específico (opcional)")


class PerformanceFeeCalculateRequest(BaseModel):
    """Calcular e creditar taxa de performance"""
    user_id: str = Field(..., description="ID do usuário")
    base_amount_usdt: Decimal = Field(..., gt=0, description="Montante em custódia (USDT)")
    performance_percentage: Decimal = Field(..., gt=0, le=100, description="Percentual de taxa (ex: 0.35)")
    period_description: str = Field(..., description="Período (ex: '2024-2025' ou 'Operações Passadas')")
    notes: Optional[str] = Field(None, description="Notas internas")


class PerformanceFeeResponse(BaseModel):
    """Resposta de taxa de performance"""
    id: str
    user_id: str
    base_amount_usdt: Decimal
    performance_percentage: Decimal
    fee_amount_usdt: Decimal
