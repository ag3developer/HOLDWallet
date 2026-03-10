"""
🚀 WolkPay Gateway - Models for E-commerce Payment Gateway
============================================================

Modelos para o sistema WolkPay Gateway que permite empresas/merchants
integrarem pagamentos PIX e cripto em suas lojas/marketplaces.

Features:
- API Keys para autenticação
- Webhook notifications
- Múltiplos métodos: PIX + 15+ criptomoedas
- Derivação HD de endereços únicos por pagamen    # Checkout
    checkout_token = Column(String(64), unique=True, nullable=True, index=True)
    checkout_url = Column(String(500), nullable=True)
    
    # Extra data
    extra_data = Column(JSON, nullable=True)  # Dados extras do merchant
    description = Column(String(500), nullable=True)  # Descrição do pagamentoshboard completo para merchants

Compliance:
- Auditoria completa de todas as operações
- Rate limiting por API Key
- Logs detalhados

Author: HOLD Wallet Team
Date: January 2026
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, 
    Text, Numeric, Enum as SQLEnum, Index, func, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import enum
import secrets
import hashlib

from app.core.db import Base


# ============================================
# ENUMS
# ============================================

class MerchantStatus(str, enum.Enum):
    """Status do merchant"""
    PENDING = "PENDING"              # Aguardando aprovação
    ACTIVE = "ACTIVE"                # Ativo, pode processar pagamentos
    SUSPENDED = "SUSPENDED"          # Suspenso (violação de termos)
    BLOCKED = "BLOCKED"              # Bloqueado (fraude detectada)


class GatewayPaymentStatus(str, enum.Enum):
    """Status do pagamento no gateway"""
    PENDING = "PENDING"              # Aguardando pagamento
    PROCESSING = "PROCESSING"        # Processando (confirmações blockchain)
    CONFIRMED = "CONFIRMED"          # Pagamento confirmado
    COMPLETED = "COMPLETED"          # Operação concluída (settlement feito)
    EXPIRED = "EXPIRED"              # Expirado (não pago no tempo limite)
    CANCELLED = "CANCELLED"          # Cancelado pelo merchant
    REFUNDED = "REFUNDED"            # Estornado
    FAILED = "FAILED"                # Falhou


class GatewayPaymentMethod(str, enum.Enum):
    """Método de pagamento"""
    PIX = "PIX"                      # PIX (BRL)
    CRYPTO = "CRYPTO"                # Criptomoeda


class GatewayWebhookEvent(str, enum.Enum):
    """Eventos de webhook"""
    PAYMENT_CREATED = "payment.created"
    PAYMENT_PENDING = "payment.pending"
    PAYMENT_PROCESSING = "payment.processing"
    PAYMENT_CONFIRMED = "payment.confirmed"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_EXPIRED = "payment.expired"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"


class GatewayWebhookStatus(str, enum.Enum):
    """Status do webhook"""
    PENDING = "PENDING"              # Aguardando envio
    SENT = "SENT"                    # Enviado com sucesso
    FAILED = "FAILED"                # Falhou (vai tentar novamente)
    EXHAUSTED = "EXHAUSTED"          # Todas as tentativas falharam


class GatewayAuditAction(str, enum.Enum):
    """Ações de auditoria"""
    MERCHANT_CREATED = "MERCHANT_CREATED"
    MERCHANT_UPDATED = "MERCHANT_UPDATED"
    MERCHANT_ACTIVATED = "MERCHANT_ACTIVATED"
    MERCHANT_SUSPENDED = "MERCHANT_SUSPENDED"
    MERCHANT_BLOCKED = "MERCHANT_BLOCKED"
    API_KEY_CREATED = "API_KEY_CREATED"
    API_KEY_REVOKED = "API_KEY_REVOKED"
    PAYMENT_CREATED = "PAYMENT_CREATED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PAYMENT_REFUNDED = "PAYMENT_REFUNDED"
    WEBHOOK_CONFIGURED = "WEBHOOK_CONFIGURED"
    SETTLEMENT_PROCESSED = "SETTLEMENT_PROCESSED"


class SettlementCurrency(str, enum.Enum):
    """Moeda de liquidação (o que o merchant recebe)"""
    BRL = "BRL"                      # Recebe em reais
    USDT = "USDT"                    # Recebe em USDT
    ORIGINAL = "ORIGINAL"            # Recebe na mesma crypto do pagamento


# ============================================
# MODELS
# ============================================

class GatewayMerchant(Base):
    """
    Merchant (Empresa/Loja) cadastrado no WolkPay Gateway
    
    Cada merchant pode ter múltiplas API Keys e processar
    pagamentos via PIX e cripto em suas plataformas.
    """
    __tablename__ = "gateway_merchants"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Identificador público (para URLs)
    merchant_code = Column(String(20), unique=True, nullable=False, index=True)
    
    # Dados da empresa
    company_name = Column(String(300), nullable=False)  # Razão Social
    trade_name = Column(String(200), nullable=True)  # Nome Fantasia
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    cnpj_encrypted = Column(Text, nullable=True)
    
    # Contato
    email = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    website = Column(String(500), nullable=True)
    
    # Responsável
    owner_name = Column(String(200), nullable=False)
    owner_cpf = Column(String(14), nullable=True)
    owner_cpf_encrypted = Column(Text, nullable=True)
    owner_email = Column(String(200), nullable=True)
    owner_phone = Column(String(20), nullable=True)
    
    # Endereço
    zip_code = Column(String(10), nullable=True)
    street = Column(String(300), nullable=True)
    number = Column(String(20), nullable=True)
    complement = Column(String(100), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)
    
    # Configurações
    status = Column(SQLEnum(MerchantStatus), default=MerchantStatus.PENDING, nullable=False, index=True)
    settlement_currency = Column(SQLEnum(SettlementCurrency), default=SettlementCurrency.BRL, nullable=False)
    
    # Taxas personalizadas (NULL = taxa padrão do sistema)
    custom_fee_percent = Column(Numeric(5, 2), nullable=True)  # Taxa por transação
    custom_network_fee_percent = Column(Numeric(5, 2), nullable=True)  # Taxa de rede
    
    # Limites
    daily_limit_brl = Column(Numeric(18, 2), default=100000)  # Limite diário
    monthly_limit_brl = Column(Numeric(18, 2), default=1000000)  # Limite mensal
    min_payment_brl = Column(Numeric(18, 2), default=10)  # Pagamento mínimo
    max_payment_brl = Column(Numeric(18, 2), default=50000)  # Pagamento máximo
    
    # Settlement automático
    auto_settlement = Column(Boolean, default=True, nullable=False)
    
    # Wallet para recebimento (se settlement_currency != BRL)
    settlement_wallet_address = Column(String(100), nullable=True)
    settlement_wallet_network = Column(String(50), nullable=True)
    
    # Conta bancária para PIX (settlement em BRL)
    bank_pix_key = Column(String(100), nullable=True)
    bank_pix_key_type = Column(String(20), nullable=True)  # CPF, CNPJ, EMAIL, PHONE, RANDOM
    bank_name = Column(String(100), nullable=True)
    bank_account_holder = Column(String(200), nullable=True)
    
    # Logo/Branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Hex color
    
    # Extra data
    extra_data = Column(JSON, nullable=True)  # Dados extras do merchant
    
    # HD Wallet Index (para derivação de endereços únicos)
    hd_index = Column(Integer, nullable=False, default=0, unique=True)
    next_payment_index = Column(Integer, nullable=False, default=0)
    
    # Webhooks configurados
    webhook_url = Column(String(500), nullable=True)
    webhook_secret = Column(String(64), nullable=True)  # Para assinatura HMAC
    webhook_events = Column(JSON, nullable=True)  # Lista de eventos a notificar
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    api_keys = relationship("GatewayApiKey", back_populates="merchant", lazy="dynamic")
    payments = relationship("GatewayPayment", back_populates="merchant", lazy="dynamic")
    audit_logs = relationship("GatewayAuditLog", back_populates="merchant", lazy="dynamic")
    
    # Indexes
    __table_args__ = (
        Index('ix_gateway_merchants_status_created', 'status', 'created_at'),
        Index('ix_gateway_merchants_email', 'email'),
    )
    
    @staticmethod
    def generate_merchant_code() -> str:
        """Gera código único do merchant no formato WKGW-XXXXXX"""
        random_part = secrets.token_hex(3).upper()
        return f"WKGW-{random_part}"
    
    @staticmethod
    def generate_webhook_secret() -> str:
        """Gera secret para assinatura de webhooks"""
        return secrets.token_hex(32)
    
    def get_next_payment_index(self) -> int:
        """Retorna e incrementa o índice para derivação HD"""
        current = self.next_payment_index
        self.next_payment_index += 1
        return current
    
    def is_active(self) -> bool:
        """Verifica se merchant está ativo"""
        return self.status == MerchantStatus.ACTIVE
    
    def __repr__(self):
        return f"<GatewayMerchant {self.merchant_code} - {self.company_name}>"


class GatewayApiKey(Base):
    """
    API Key para autenticação de merchants
    
    Cada merchant pode ter múltiplas API Keys (produção, teste, etc).
    Keys são hasheadas para segurança.
    """
    __tablename__ = "gateway_api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"), nullable=False, index=True)
    
    # Identificação
    name = Column(String(100), nullable=False)  # Nome amigável: "Produção", "Teste", etc
    description = Column(Text, nullable=True)
    
    # Key (prefixo visível + hash)
    key_prefix = Column(String(12), nullable=False, index=True)  # wkgw_live_xxxx
    key_hash = Column(String(64), nullable=False, unique=True)  # SHA256 da key completa
    
    # Tipo
    is_test = Column(Boolean, default=False, nullable=False)  # True = sandbox
    
    # Permissões
    permissions = Column(JSON, nullable=True)  # Lista de permissões específicas
    allowed_ips = Column(JSON, nullable=True)  # Lista de IPs permitidos (whitelist)
    
    # Rate limiting
    rate_limit_per_minute = Column(Integer, default=60)
    rate_limit_per_hour = Column(Integer, default=1000)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(200), nullable=True)
    
    # Uso
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    last_used_ip = Column(String(45), nullable=True)
    total_requests = Column(Integer, default=0)
    
    # Expiração (opcional)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    merchant = relationship("GatewayMerchant", back_populates="api_keys")
    
    # Indexes
    __table_args__ = (
        Index('ix_gateway_api_keys_merchant_active', 'merchant_id', 'is_active'),
    )
    
    @staticmethod
    def generate_api_key(is_test: bool = False) -> tuple:
        """
        Gera nova API key
        Returns: (full_key, prefix, hash)
        
        Formato: wkgw_[live|test]_[32 chars random]
        """
        mode = "test" if is_test else "live"
        random_part = secrets.token_urlsafe(32)
        full_key = f"wkgw_{mode}_{random_part}"
        prefix = full_key[:12]  # wkgw_live_xx ou wkgw_test_xx
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        return full_key, prefix, key_hash
    
    @staticmethod
    def hash_key(key: str) -> str:
        """Gera hash de uma API key para comparação"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def is_valid(self) -> bool:
        """Verifica se a API key é válida"""
        if not self.is_active:
            return False
        if self.revoked_at:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        return True
    
    def __repr__(self):
        return f"<GatewayApiKey {self.key_prefix}... - {self.name}>"


class GatewayPayment(Base):
    """
    Pagamento processado pelo Gateway
    
    Suporta PIX e Criptomoedas.
    Cada pagamento recebe um endereço único (derivação HD).
    """
    __tablename__ = "gateway_payments"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Identificadores
    payment_id = Column(String(30), unique=True, nullable=False, index=True)  # WKPAY-YYYYMMDD-XXXXXX
    external_id = Column(String(100), nullable=True, index=True)  # ID do merchant (order_id, etc)
    
    # Merchant
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"), nullable=False, index=True)
    api_key_id = Column(String(36), ForeignKey("gateway_api_keys.id"), nullable=True)
    
    # Método de pagamento
    payment_method = Column(SQLEnum(GatewayPaymentMethod), nullable=False, index=True)
    
    # === PIX ===
    pix_key = Column(String(100), nullable=True)
    pix_txid = Column(String(100), nullable=True, index=True)
    pix_qrcode = Column(Text, nullable=True)
    pix_qrcode_image = Column(Text, nullable=True)
    pix_emv = Column(Text, nullable=True)
    
    # === CRYPTO ===
    crypto_currency = Column(String(20), nullable=True)  # BTC, ETH, USDT, etc
    crypto_network = Column(String(50), nullable=True)  # ethereum, polygon, bsc, etc
    crypto_address = Column(String(100), nullable=True, index=True)  # Endereço único gerado
    crypto_amount = Column(Numeric(28, 18), nullable=True)  # Quantidade esperada
    crypto_amount_received = Column(Numeric(28, 18), nullable=True)  # Quantidade recebida
    crypto_tx_hash = Column(String(128), nullable=True, index=True)  # Hash da transação
    crypto_confirmations = Column(Integer, default=0)
    crypto_required_confirmations = Column(Integer, default=1)
    
    # HD Derivation Path
    hd_derivation_path = Column(String(100), nullable=True)  # m/44'/60'/1000'/merchant/payment
    hd_merchant_index = Column(Integer, nullable=True)
    hd_payment_index = Column(Integer, nullable=True)
    
    # Valores
    amount_requested = Column(Numeric(18, 8), nullable=False)  # Valor solicitado
    currency_requested = Column(String(10), nullable=False)  # BRL, USD, etc
    amount_received = Column(Numeric(18, 8), nullable=True)  # Valor recebido
    
    # Cotações
    exchange_rate = Column(Numeric(18, 8), nullable=True)  # Taxa de câmbio usada
    usd_rate = Column(Numeric(18, 8), nullable=True)  # Crypto/USD
    brl_rate = Column(Numeric(18, 4), nullable=True)  # USD/BRL
    
    # Taxas
    fee_percent = Column(Numeric(5, 2), nullable=False)  # Taxa cobrada
    fee_amount = Column(Numeric(18, 8), nullable=True)  # Valor da taxa
    network_fee = Column(Numeric(18, 8), nullable=True)  # Taxa de rede blockchain
    
    # Settlement (liquidação para o merchant)
    settlement_amount = Column(Numeric(18, 8), nullable=True)  # Valor líquido
    settlement_currency = Column(String(10), nullable=True)  # BRL, USDT, etc
    settlement_status = Column(String(20), nullable=True)  # pending, processing, completed
    settlement_tx_hash = Column(String(128), nullable=True)  # Hash da TX de settlement
    settled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(SQLEnum(GatewayPaymentStatus), default=GatewayPaymentStatus.PENDING, nullable=False, index=True)
    
    # Validade
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Cliente (informações opcionais do pagador)
    customer_email = Column(String(200), nullable=True)
    customer_name = Column(String(200), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    customer_document = Column(String(20), nullable=True)  # CPF/CNPJ
    
    # URLs de callback
    success_url = Column(String(500), nullable=True)  # Redirect após sucesso
    cancel_url = Column(String(500), nullable=True)  # Redirect após cancelamento
    
    # Checkout page
    checkout_token = Column(String(64), unique=True, nullable=True, index=True)
    checkout_url = Column(String(500), nullable=True)
    
    # Extra data
    extra_data = Column(JSON, nullable=True)  # Dados extras do merchant
    description = Column(String(500), nullable=True)  # Descrição do pagamento
    
    # Tracking
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    merchant = relationship("GatewayMerchant", back_populates="payments")
    api_key = relationship("GatewayApiKey")
    webhooks = relationship("GatewayWebhook", back_populates="payment", lazy="dynamic")
    
    # Indexes
    __table_args__ = (
        Index('ix_gateway_payments_merchant_status', 'merchant_id', 'status'),
        Index('ix_gateway_payments_merchant_created', 'merchant_id', 'created_at'),
        Index('ix_gateway_payments_status_expires', 'status', 'expires_at'),
    )
    
    @staticmethod
    def generate_payment_id() -> str:
        """Gera ID único do pagamento no formato WKPAY-YYYYMMDD-XXXXXX"""
        date_part = datetime.now().strftime("%Y%m%d")
        random_part = secrets.token_hex(3).upper()
        return f"WKPAY-{date_part}-{random_part}"
    
    @staticmethod
    def generate_checkout_token() -> str:
        """Gera token seguro para checkout"""
        return secrets.token_urlsafe(32)
    
    def is_expired(self) -> bool:
        """Verifica se o pagamento expirou"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_crypto(self) -> bool:
        """Verifica se é pagamento crypto"""
        return self.payment_method == GatewayPaymentMethod.CRYPTO
    
    def is_pix(self) -> bool:
        """Verifica se é pagamento PIX"""
        return self.payment_method == GatewayPaymentMethod.PIX
    
    def has_enough_confirmations(self) -> bool:
        """Verifica se tem confirmações suficientes"""
        return self.crypto_confirmations >= self.crypto_required_confirmations
    
    def __repr__(self):
        return f"<GatewayPayment {self.payment_id} - {self.status}>"


class GatewayWebhook(Base):
    """
    Registro de webhooks enviados aos merchants
    
    Implementa retry com backoff exponencial.
    """
    __tablename__ = "gateway_webhooks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = Column(String(36), ForeignKey("gateway_payments.id"), nullable=False, index=True)
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"), nullable=False, index=True)
    
    # Evento
    event = Column(
        SQLEnum(GatewayWebhookEvent, values_callable=lambda x: [e.value for e in x]),
        nullable=False, index=True
    )
    
    # Payload
    payload = Column(JSON, nullable=False)
    signature = Column(String(128), nullable=True)  # HMAC signature
    
    # Destino
    url = Column(String(500), nullable=False)
    
    # Status
    status = Column(SQLEnum(GatewayWebhookStatus), default=GatewayWebhookStatus.PENDING, nullable=False, index=True)
    
    # Tentativas
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resposta
    last_response_code = Column(Integer, nullable=True)
    last_response_body = Column(Text, nullable=True)
    last_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    payment = relationship("GatewayPayment", back_populates="webhooks")
    merchant = relationship("GatewayMerchant")
    
    # Indexes
    __table_args__ = (
        Index('ix_gateway_webhooks_status_next', 'status', 'next_attempt_at'),
    )
    
    def calculate_next_attempt(self) -> datetime:
        """Calcula próxima tentativa com backoff exponencial"""
        # Backoff: 1min, 5min, 15min, 1h, 4h
        delays = [60, 300, 900, 3600, 14400]
        delay_seconds = delays[min(self.attempts, len(delays) - 1)]
        return datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
    
    @staticmethod
    def generate_signature(payload: str, secret: str) -> str:
        """Gera assinatura HMAC-SHA256 do payload"""
        import hmac
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def __repr__(self):
        return f"<GatewayWebhook {self.event} - {self.status}>"


class GatewayAuditLog(Base):
    """
    Log de auditoria de todas as operações do Gateway
    
    Registra criação/alteração de merchants, API keys,
    pagamentos, refunds, settlements, etc.
    """
    __tablename__ = "gateway_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Referências
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"), nullable=True, index=True)
    payment_id = Column(String(36), ForeignKey("gateway_payments.id"), nullable=True, index=True)
    api_key_id = Column(String(36), ForeignKey("gateway_api_keys.id"), nullable=True)
    
    # Actor (quem executou a ação)
    actor_type = Column(String(20), nullable=False)  # system, admin, merchant, api
    actor_id = Column(String(36), nullable=True)  # ID do admin ou merchant
    actor_email = Column(String(200), nullable=True)
    
    # Ação
    action = Column(SQLEnum(GatewayAuditAction), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Dados
    old_data = Column(JSON, nullable=True)  # Estado anterior
    new_data = Column(JSON, nullable=True)  # Novo estado
    
    # Request info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(36), nullable=True)  # Para correlação
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship
    merchant = relationship("GatewayMerchant", back_populates="audit_logs")
    
    # Indexes
    __table_args__ = (
        Index('ix_gateway_audit_logs_merchant_action', 'merchant_id', 'action'),
        Index('ix_gateway_audit_logs_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<GatewayAuditLog {self.action} - {self.created_at}>"


class GatewaySettings(Base):
    """
    Configurações globais do Gateway
    
    Taxas padrão, limites, configurações do sistema.
    """
    __tablename__ = "gateway_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Identificador
    key = Column(String(100), unique=True, nullable=False, index=True)
    
    # Valor
    value = Column(JSON, nullable=False)
    
    # Descrição
    description = Column(Text, nullable=True)
    
    # Metadata
    updated_by = Column(String(36), nullable=True)  # Admin ID
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<GatewaySettings {self.key}>"
