"""
🚀 WolkPay Gateway - Pydantic Schemas
======================================

Schemas para validação de requests e responses da API do Gateway.

Organizados por funcionalidade:
- Merchant: Cadastro e gerenciamento de empresas
- API Key: Autenticação e permissões
- Payment: Criação e consulta de pagamentos
- Webhook: Configuração e eventos
- Settings: Configurações do sistema

Author: HOLD Wallet Team
Date: January 2026
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from decimal import Decimal
from enum import Enum

from app.models.gateway import (
    MerchantStatus, 
    GatewayPaymentStatus, 
    GatewayPaymentMethod,
    GatewayWebhookEvent,
    GatewayWebhookStatus,
    SettlementCurrency
)


# ============================================
# ENUMS para API (String-based)
# ============================================

class PaymentMethodEnum(str, Enum):
    """Métodos de pagamento disponíveis"""
    PIX = "pix"
    CRYPTO = "crypto"


class CryptoCurrencyEnum(str, Enum):
    """Criptomoedas suportadas"""
    BTC = "BTC"
    ETH = "ETH"
    USDT = "USDT"
    USDC = "USDC"
    MATIC = "MATIC"
    BNB = "BNB"
    SOL = "SOL"
    DOGE = "DOGE"
    LTC = "LTC"


class CryptoNetworkEnum(str, Enum):
    """Redes blockchain suportadas"""
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    BSC = "bsc"
    BITCOIN = "bitcoin"
    SOLANA = "solana"
    LITECOIN = "litecoin"


# ============================================
# BASE SCHEMAS
# ============================================

class GatewayBaseSchema(BaseModel):
    """Schema base com configurações comuns"""
    
    class Config:
        from_attributes = True  # Pydantic v2 (antigo orm_mode)
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            Decimal: lambda v: str(v) if v else None,
        }


class PaginationParams(BaseModel):
    """Parâmetros de paginação"""
    page: int = Field(default=1, ge=1, description="Número da página")
    per_page: int = Field(default=20, ge=1, le=100, description="Itens por página")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseModel):
    """Response paginada genérica"""
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool


# ============================================
# MERCHANT SCHEMAS
# ============================================

class MerchantPublicRegister(BaseModel):
    """
    Schema simplificado para registro público de merchant.
    Cria usuário e merchant em uma única operação.
    """
    # Dados da empresa
    business_name: str = Field(..., min_length=3, max_length=300, description="Nome da empresa")
    business_document: str = Field(..., min_length=11, max_length=18, description="CNPJ ou CPF")
    business_email: EmailStr = Field(..., description="Email comercial")
    business_phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    website_url: Optional[str] = Field(None, max_length=500, description="Website")
    
    # Credenciais do usuário
    password: str = Field(..., min_length=6, max_length=100, description="Senha de acesso")
    
    @field_validator('business_document')
    @classmethod
    def validate_document(cls, v: str) -> str:
        """Remove formatação e valida documento"""
        doc_clean = ''.join(c for c in v if c.isdigit())
        if len(doc_clean) not in [11, 14]:  # CPF ou CNPJ
            raise ValueError('Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)')
        return doc_clean


class MerchantCreate(BaseModel):
    """Schema para criar novo merchant"""
    # Dados da empresa
    company_name: str = Field(..., min_length=3, max_length=300, description="Razão Social")
    trade_name: Optional[str] = Field(None, max_length=200, description="Nome Fantasia")
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ (com ou sem formatação)")
    
    # Contato
    email: EmailStr = Field(..., description="Email principal")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    website: Optional[str] = Field(None, max_length=500, description="Website")
    
    # Responsável
    owner_name: str = Field(..., min_length=3, max_length=200, description="Nome do responsável")
    owner_cpf: Optional[str] = Field(None, max_length=14, description="CPF do responsável")
    owner_email: Optional[EmailStr] = Field(None, description="Email do responsável")
    owner_phone: Optional[str] = Field(None, max_length=20, description="Telefone do responsável")
    
    # Endereço (opcional no cadastro inicial)
    zip_code: Optional[str] = Field(None, max_length=10)
    street: Optional[str] = Field(None, max_length=300)
    number: Optional[str] = Field(None, max_length=20)
    complement: Optional[str] = Field(None, max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    
    # Configurações de liquidação
    settlement_currency: SettlementCurrency = Field(
        default=SettlementCurrency.BRL,
        description="Moeda de liquidação"
    )
    settlement_wallet_address: Optional[str] = Field(None, max_length=100)
    settlement_wallet_network: Optional[str] = Field(None, max_length=50)
    
    # Conta bancária para PIX
    bank_pix_key: Optional[str] = Field(None, max_length=100)
    bank_pix_key_type: Optional[str] = Field(None, max_length=20)
    
    # Branding
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    
    # Webhook
    webhook_url: Optional[str] = Field(None, max_length=500)
    
    @field_validator('cnpj')
    @classmethod
    def validate_cnpj(cls, v: str) -> str:
        """Remove formatação e valida CNPJ"""
        cnpj_clean = ''.join(c for c in v if c.isdigit())
        if len(cnpj_clean) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        return cnpj_clean
    
    @field_validator('owner_cpf')
    @classmethod
    def validate_cpf(cls, v: Optional[str]) -> Optional[str]:
        """Remove formatação e valida CPF"""
        if v is None:
            return v
        cpf_clean = ''.join(c for c in v if c.isdigit())
        if len(cpf_clean) != 11:
            raise ValueError('CPF deve ter 11 dígitos')
        return cpf_clean


class MerchantUpdate(BaseModel):
    """Schema para atualizar merchant"""
    trade_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=500)
    
    # Endereço
    zip_code: Optional[str] = Field(None, max_length=10)
    street: Optional[str] = Field(None, max_length=300)
    number: Optional[str] = Field(None, max_length=20)
    complement: Optional[str] = Field(None, max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    
    # Configurações
    settlement_currency: Optional[SettlementCurrency] = None
    settlement_wallet_address: Optional[str] = Field(None, max_length=100)
    settlement_wallet_network: Optional[str] = Field(None, max_length=50)
    
    # Conta bancária
    bank_pix_key: Optional[str] = Field(None, max_length=100)
    bank_pix_key_type: Optional[str] = Field(None, max_length=20)
    bank_name: Optional[str] = Field(None, max_length=100)
    bank_account_holder: Optional[str] = Field(None, max_length=200)
    
    # Branding
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, max_length=7)
    
    # Webhook
    webhook_url: Optional[str] = Field(None, max_length=500)
    webhook_events: Optional[List[str]] = None


class MerchantResponse(GatewayBaseSchema):
    """Response com dados do merchant"""
    id: str
    merchant_code: str
    
    # Dados da empresa
    company_name: str
    trade_name: Optional[str]
    cnpj: str
    
    # Contato
    email: str
    phone: Optional[str]
    website: Optional[str]
    
    # Responsável
    owner_name: str
    owner_email: Optional[str]
    owner_phone: Optional[str]
    
    # Status
    status: MerchantStatus
    
    # Configurações
    settlement_currency: SettlementCurrency
    daily_limit_brl: Decimal
    monthly_limit_brl: Decimal
    min_payment_brl: Decimal
    max_payment_brl: Decimal
    
    # Taxas
    custom_fee_percent: Optional[Decimal]
    
    # Branding
    logo_url: Optional[str]
    primary_color: Optional[str]
    
    # Webhook
    webhook_url: Optional[str]
    
    # Timestamps
    created_at: datetime
    activated_at: Optional[datetime]


class MerchantPublicResponse(GatewayBaseSchema):
    """Response pública do merchant (para checkout)"""
    merchant_code: str
    company_name: str
    trade_name: Optional[str]
    logo_url: Optional[str]
    primary_color: Optional[str]


class MerchantStatsResponse(BaseModel):
    """Estatísticas do merchant"""
    merchant_id: str
    merchant_code: str
    
    # Totais
    total_payments: int
    total_completed: int
    total_pending: int
    total_expired: int
    total_failed: int
    
    # Valores
    total_volume_brl: Decimal
    total_fees_collected: Decimal
    total_settled: Decimal
    pending_settlement: Decimal
    
    # Período
    period_start: datetime
    period_end: datetime
    
    # Por método
    pix_payments: int
    crypto_payments: int
    pix_volume_brl: Decimal
    crypto_volume_brl: Decimal


# ============================================
# API KEY SCHEMAS
# ============================================

class ApiKeyCreate(BaseModel):
    """Schema para criar API key"""
    name: str = Field(..., min_length=2, max_length=100, description="Nome da API Key")
    description: Optional[str] = Field(None, max_length=500)
    is_test: bool = Field(default=False, description="True para ambiente sandbox")
    
    # Permissões
    permissions: Optional[List[str]] = Field(None, description="Lista de permissões")
    allowed_ips: Optional[List[str]] = Field(None, description="IPs permitidos (whitelist)")
    
    # Rate limiting
    rate_limit_per_minute: int = Field(default=60, ge=1, le=1000)
    rate_limit_per_hour: int = Field(default=1000, ge=10, le=10000)
    
    # Expiração
    expires_at: Optional[datetime] = Field(None, description="Data de expiração")


class ApiKeyResponse(GatewayBaseSchema):
    """Response da API key (sem a key completa)"""
    id: str
    merchant_id: str
    name: str
    description: Optional[str]
    key_prefix: str  # Apenas o prefixo visível
    
    is_test: bool
    is_active: bool
    
    permissions: Optional[List[str]]
    allowed_ips: Optional[List[str]]
    
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    
    last_used_at: Optional[datetime]
    total_requests: int
    expires_at: Optional[datetime]
    
    created_at: datetime


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Response após criar API key (inclui a key completa UMA VEZ)"""
    api_key: str = Field(..., description="API Key completa - SALVE AGORA, não será mostrada novamente!")


class ApiKeyRevokeRequest(BaseModel):
    """Request para revogar API key"""
    reason: Optional[str] = Field(None, max_length=200, description="Motivo da revogação")


# ============================================
# PAYMENT SCHEMAS
# ============================================

class PaymentCreateBase(BaseModel):
    """Base para criar pagamento"""
    # Valor
    amount: Decimal = Field(..., gt=0, description="Valor do pagamento")
    currency: str = Field(default="BRL", max_length=10, description="Moeda (BRL, USD)")
    
    # Identificação externa
    external_id: Optional[str] = Field(None, max_length=100, description="ID do pedido no merchant")
    description: Optional[str] = Field(None, max_length=500, description="Descrição do pagamento")
    
    # Cliente (opcional)
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=200)
    customer_phone: Optional[str] = Field(None, max_length=20)
    customer_document: Optional[str] = Field(None, max_length=20, description="CPF/CNPJ")
    
    # URLs de callback
    success_url: Optional[str] = Field(None, max_length=500)
    cancel_url: Optional[str] = Field(None, max_length=500)
    
    # Dados extras
    extra_data: Optional[Dict[str, Any]] = None
    
    # Expiração (minutos)
    expiration_minutes: int = Field(default=30, ge=5, le=1440)


class PaymentCreatePix(PaymentCreateBase):
    """Criar pagamento PIX"""
    payment_method: str = "pix"  # Valor fixo


class PaymentCreateCrypto(PaymentCreateBase):
    """Criar pagamento Crypto"""
    payment_method: str = "crypto"  # Valor fixo
    
    crypto_currency: CryptoCurrencyEnum = Field(..., description="Criptomoeda")
    crypto_network: Optional[CryptoNetworkEnum] = Field(None, description="Rede blockchain")


class PaymentCreate(BaseModel):
    """Schema unificado para criar pagamento"""
    payment_method: PaymentMethodEnum = Field(..., description="Método: pix ou crypto")
    
    # Valor
    amount: Decimal = Field(..., gt=0, description="Valor do pagamento")
    currency: str = Field(default="BRL", max_length=10)
    
    # Crypto específico
    crypto_currency: Optional[str] = Field(None, description="Obrigatório para crypto")
    crypto_network: Optional[str] = Field(None, description="Rede blockchain")
    
    # Identificação
    external_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Cliente
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = Field(None, max_length=200)
    customer_phone: Optional[str] = Field(None, max_length=20)
    customer_document: Optional[str] = Field(None, max_length=20)
    
    # Callbacks
    success_url: Optional[str] = Field(None, max_length=500)
    cancel_url: Optional[str] = Field(None, max_length=500)
    
    # Extras
    extra_data: Optional[Dict[str, Any]] = None
    expiration_minutes: int = Field(default=30, ge=5, le=1440)
    
    @model_validator(mode='after')
    def validate_crypto_fields(self):
        """Valida campos obrigatórios para crypto"""
        if self.payment_method == PaymentMethodEnum.CRYPTO:
            if not self.crypto_currency:
                raise ValueError('crypto_currency é obrigatório para pagamentos crypto')
        return self


class PaymentResponse(GatewayBaseSchema):
    """Response do pagamento"""
    id: str
    payment_id: str
    external_id: Optional[str]
    
    # Merchant
    merchant_id: str
    
    # Método
    payment_method: GatewayPaymentMethod
    
    # Valores
    amount_requested: Decimal
    currency_requested: str
    amount_received: Optional[Decimal]
    
    # Taxas
    fee_percent: Decimal
    fee_amount: Optional[Decimal]
    settlement_amount: Optional[Decimal]
    
    # Status
    status: GatewayPaymentStatus
    expires_at: datetime
    
    # PIX
    pix_qrcode: Optional[str] = Field(None, description="PIX Copia-e-Cola")
    pix_qrcode_image: Optional[str] = Field(None, description="QR Code em Base64")
    
    # Crypto
    crypto_currency: Optional[str]
    crypto_network: Optional[str]
    crypto_address: Optional[str]
    crypto_amount: Optional[Decimal]
    crypto_tx_hash: Optional[str]
    crypto_confirmations: Optional[int]
    
    # Checkout
    checkout_url: Optional[str]
    
    # URLs
    success_url: Optional[str]
    cancel_url: Optional[str]
    
    # Descrição
    description: Optional[str]
    
    # Timestamps
    created_at: datetime
    confirmed_at: Optional[datetime]
    completed_at: Optional[datetime]


class PaymentPublicResponse(GatewayBaseSchema):
    """Response pública do pagamento (para checkout page)"""
    payment_id: str
    
    # Merchant (público)
    merchant: MerchantPublicResponse
    
    # Método
    payment_method: GatewayPaymentMethod
    
    # Valores
    amount_requested: Decimal
    currency_requested: str
    
    # Status
    status: GatewayPaymentStatus
    expires_at: datetime
    
    # PIX
    pix_qrcode: Optional[str]
    pix_qrcode_image: Optional[str]
    
    # Crypto
    crypto_currency: Optional[str]
    crypto_network: Optional[str]
    crypto_address: Optional[str]
    crypto_amount: Optional[Decimal]
    
    # Descrição
    description: Optional[str]
    
    # URLs de redirect
    success_url: Optional[str]
    cancel_url: Optional[str]


class PaymentListResponse(GatewayBaseSchema):
    """Response para listagem de pagamentos"""
    id: str
    payment_id: str
    external_id: Optional[str]
    payment_method: GatewayPaymentMethod
    amount_requested: Decimal
    currency_requested: str
    status: GatewayPaymentStatus
    customer_email: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


class PaymentFilterParams(BaseModel):
    """Filtros para listagem de pagamentos"""
    status: Optional[GatewayPaymentStatus] = None
    payment_method: Optional[GatewayPaymentMethod] = None
    external_id: Optional[str] = None
    customer_email: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None


class PaymentStatusUpdate(BaseModel):
    """Atualização de status (interno)"""
    status: GatewayPaymentStatus
    reason: Optional[str] = None


# ============================================
# WEBHOOK SCHEMAS
# ============================================

class WebhookConfigUpdate(BaseModel):
    """Configuração de webhook do merchant"""
    webhook_url: str = Field(..., max_length=500, description="URL para receber webhooks")
    webhook_events: List[str] = Field(
        default=["payment.confirmed", "payment.completed", "payment.expired", "payment.failed"],
        description="Eventos a serem notificados"
    )
    
    @field_validator('webhook_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL deve começar com http:// ou https://')
        return v


class WebhookPayload(BaseModel):
    """Payload enviado nos webhooks"""
    event: str
    created_at: datetime
    data: Dict[str, Any]
    
    # Identificação
    webhook_id: str
    payment_id: str
    merchant_id: str


class WebhookEventResponse(GatewayBaseSchema):
    """Response de evento de webhook"""
    id: str
    event: str
    status: GatewayWebhookStatus
    url: str
    
    attempts: int
    max_attempts: int
    next_attempt_at: Optional[datetime]
    
    last_response_code: Optional[int]
    last_error: Optional[str]
    
    created_at: datetime
    sent_at: Optional[datetime]


class WebhookResendRequest(BaseModel):
    """Request para reenviar webhook"""
    webhook_id: str


# ============================================
# CHECKOUT SCHEMAS
# ============================================

class CheckoutSessionCreate(BaseModel):
    """Criar sessão de checkout (hosted page)"""
    # Valor
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="BRL")
    
    # Métodos aceitos
    payment_methods: List[PaymentMethodEnum] = Field(
        default=[PaymentMethodEnum.PIX, PaymentMethodEnum.CRYPTO]
    )
    
    # Se crypto, quais moedas
    allowed_crypto: Optional[List[CryptoCurrencyEnum]] = None
    
    # Identificação
    external_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Cliente
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = None
    
    # URLs
    success_url: str = Field(..., max_length=500)
    cancel_url: str = Field(..., max_length=500)
    
    # Expiração
    expiration_minutes: int = Field(default=60, ge=15, le=1440)


class CheckoutSessionResponse(BaseModel):
    """Response da sessão de checkout"""
    checkout_url: str
    checkout_token: str
    expires_at: datetime
    
    # Dados do pagamento criado
    payment_id: str
    amount: Decimal
    currency: str


# ============================================
# SETTINGS SCHEMAS
# ============================================

class GatewaySettingResponse(GatewayBaseSchema):
    """Response de configuração"""
    key: str
    value: Any
    description: Optional[str]
    updated_at: Optional[datetime]


class GatewaySettingUpdate(BaseModel):
    """Atualizar configuração (admin)"""
    value: Any
    description: Optional[str] = None


class GatewayFeesResponse(BaseModel):
    """Taxas do gateway"""
    pix_fee_percent: Decimal
    crypto_fee_percent: Decimal
    network_fee_percent: Decimal
    min_fee_brl: Decimal
    
    # Limites
    min_payment_brl: Decimal
    max_payment_brl: Decimal
    daily_limit_brl: Decimal


# ============================================
# ERROR SCHEMAS
# ============================================

class GatewayErrorResponse(BaseModel):
    """Response de erro padronizado"""
    error: str
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None


class ValidationErrorDetail(BaseModel):
    """Detalhe de erro de validação"""
    field: str
    message: str
    value: Optional[Any] = None


class ValidationErrorResponse(BaseModel):
    """Response de erro de validação"""
    error: str = "validation_error"
    error_code: str = "VALIDATION_ERROR"
    message: str = "Erro de validação nos dados enviados"
    errors: List[ValidationErrorDetail]


# ============================================
# CALLBACK/WEBHOOK EVENT SCHEMAS
# ============================================

class BBPixWebhookPayload(BaseModel):
    """Payload do webhook PIX do Banco do Brasil"""
    pix: List[Dict[str, Any]]


class CryptoWebhookPayload(BaseModel):
    """Payload de webhook de confirmação crypto"""
    tx_hash: str
    address: str
    amount: Decimal
    currency: str
    network: str
    confirmations: int
    block_number: Optional[int] = None


# ============================================
# ADMIN SCHEMAS
# ============================================

class AdminMerchantUpdate(BaseModel):
    """Atualização de merchant pelo admin"""
    status: Optional[MerchantStatus] = None
    custom_fee_percent: Optional[Decimal] = Field(None, ge=0, le=10)
    custom_network_fee_percent: Optional[Decimal] = Field(None, ge=0, le=5)
    daily_limit_brl: Optional[Decimal] = Field(None, gt=0)
    monthly_limit_brl: Optional[Decimal] = Field(None, gt=0)
    min_payment_brl: Optional[Decimal] = Field(None, gt=0)
    max_payment_brl: Optional[Decimal] = Field(None, gt=0)
    
    # Notas do admin
    admin_notes: Optional[str] = Field(None, max_length=1000)


class AdminMerchantApprove(BaseModel):
    """Aprovar merchant"""
    approved: bool
    notes: Optional[str] = Field(None, max_length=500)


class AdminSettlementProcess(BaseModel):
    """Processar settlement"""
    merchant_id: str
    payment_ids: List[str]
    settlement_currency: SettlementCurrency
    
    # Para crypto
    destination_address: Optional[str] = None
    
    # Para PIX
    pix_key: Optional[str] = None


# ============================================
# REPORT SCHEMAS
# ============================================

class DailyReportResponse(BaseModel):
    """Relatório diário"""
    date: datetime
    total_payments: int
    total_completed: int
    total_volume_brl: Decimal
    total_fees_brl: Decimal
    
    # Por método
    pix_count: int
    pix_volume: Decimal
    crypto_count: int
    crypto_volume: Decimal
    
    # Top merchants
    top_merchants: List[Dict[str, Any]]


class MerchantReportResponse(BaseModel):
    """Relatório do merchant"""
    merchant_id: str
    period_start: datetime
    period_end: datetime
    
    # Totais
    total_payments: int
    completed_payments: int
    failed_payments: int
    expired_payments: int
    
    # Valores
    total_volume_brl: Decimal
    total_fees_paid: Decimal
    total_received: Decimal
    pending_settlement: Decimal
    
    # Por método
    breakdown_by_method: Dict[str, Dict[str, Any]]
    
    # Por status
    breakdown_by_status: Dict[str, int]
    
    # Daily breakdown
    daily_breakdown: List[Dict[str, Any]]
