"""
🚀 WolkPay - Models for Third-Party Payment System
===================================================

Modelos para o sistema WolkPay que permite usuários WolkNow
criarem faturas de compra de criptomoedas que podem ser pagas por terceiros.

Compliance:
- Coleta completa de dados do pagador (PF/PJ)
- Limites anti-lavagem de dinheiro
- Auditoria completa de todas as operações
- Termos de aceite versionados

Author: HOLD Wallet Team
Date: January 2026
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, 
    Text, Numeric, Enum as SQLEnum, Index, func, Date
)
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import enum
import secrets

from app.core.db import Base


# ============================================
# ENUMS
# ============================================

class InvoiceStatus(str, enum.Enum):
    """Status da fatura WolkPay"""
    PENDING = "PENDING"                          # Fatura criada, aguardando pagador
    AWAITING_PAYMENT = "AWAITING_PAYMENT"        # Pagador preencheu dados, aguardando PIX
    PAID = "PAID"                                # Pagamento recebido, aguardando aprovação
    APPROVED = "APPROVED"                        # Admin aprovou
    COMPLETED = "COMPLETED"                      # Crypto enviada, operação concluída
    EXPIRED = "EXPIRED"                          # Fatura expirou (15 min)
    CANCELLED = "CANCELLED"                      # Cancelada pelo beneficiário
    REJECTED = "REJECTED"                        # Rejeitada pelo admin


class PersonType(str, enum.Enum):
    """Tipo de pessoa do pagador"""
    PF = "PF"  # Pessoa Física
    PJ = "PJ"  # Pessoa Jurídica


class DocumentType(str, enum.Enum):
    """Tipo de documento"""
    CPF = "CPF"
    CNPJ = "CNPJ"


class PaymentStatus(str, enum.Enum):
    """Status do pagamento PIX"""
    PENDING = "PENDING"        # Aguardando pagamento
    PROCESSING = "PROCESSING"  # Processando
    PAID = "PAID"              # Pago
    FAILED = "FAILED"          # Falhou
    REFUNDED = "REFUNDED"      # Estornado


class ApprovalAction(str, enum.Enum):
    """Ação de aprovação"""
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class FeePayer(str, enum.Enum):
    """Quem paga as taxas da operação"""
    BENEFICIARY = "BENEFICIARY"  # Beneficiário paga (padrão) - pagador paga valor cheio, beneficiário recebe menos
    PAYER = "PAYER"              # Pagador paga - pagador paga valor + taxas, beneficiário recebe valor cheio


# ============================================
# MODELS
# ============================================

class WolkPayInvoice(Base):
    """
    Fatura WolkPay - representa uma solicitação de compra de crypto
    
    Criada pelo beneficiário (usuário WolkNow), paga por terceiros.
    Validade: 15 minutos (devido à volatilidade crypto)
    """
    __tablename__ = "wolkpay_invoices"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Número da fatura (legível)
    invoice_number = Column(String(20), unique=True, nullable=False, index=True)
    
    # Beneficiário (usuário WolkNow que recebe a crypto)
    beneficiary_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Dados da criptomoeda
    crypto_currency = Column(String(20), nullable=False)  # BTC, ETH, USDT, etc
    crypto_amount = Column(Numeric(28, 18), nullable=False)  # Quantidade de crypto
    crypto_network = Column(String(50), nullable=True)  # Rede (ERC20, TRC20, etc)
    
    # Cotações no momento da criação
    usd_rate = Column(Numeric(18, 8), nullable=False)  # Cotação crypto/USD
    brl_rate = Column(Numeric(18, 4), nullable=False)  # Cotação USD/BRL
    
    # Valores em BRL
    base_amount_brl = Column(Numeric(18, 2), nullable=False)  # Valor base
    service_fee_percent = Column(Numeric(5, 2), default=3.65)  # Taxa serviço: 3.65%
    service_fee_brl = Column(Numeric(18, 2), nullable=False)  # Valor da taxa serviço
    network_fee_percent = Column(Numeric(5, 2), default=0.15)  # Taxa rede: 0.15%
    network_fee_brl = Column(Numeric(18, 2), nullable=False)  # Valor da taxa rede
    total_amount_brl = Column(Numeric(18, 2), nullable=False)  # Total a pagar pelo PAGADOR
    
    # Quem paga as taxas
    fee_payer = Column(SQLEnum(FeePayer), default=FeePayer.BENEFICIARY, nullable=False)
    # Valor que o beneficiário efetivamente recebe em crypto (descontadas as taxas se fee_payer=BENEFICIARY)
    beneficiary_receives_brl = Column(Numeric(18, 2), nullable=True)
    
    # Checkout
    checkout_token = Column(String(64), unique=True, nullable=False, index=True)
    checkout_url = Column(String(500), nullable=True)
    
    # Status e validade
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.PENDING, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # ========================================
    # DADOS DA TRANSAÇÃO BLOCKCHAIN
    # Salvos aqui para rastreabilidade completa
    # e para informe de operações à Receita Federal
    # ========================================
    crypto_tx_hash = Column(String(128), nullable=True, index=True)  # Hash da transação blockchain
    crypto_tx_network = Column(String(50), nullable=True)  # Rede onde a TX foi feita (polygon, ethereum, etc)
    crypto_wallet_address = Column(String(100), nullable=True)  # Endereço da carteira do beneficiário
    crypto_sent_at = Column(DateTime(timezone=True), nullable=True)  # Quando a crypto foi enviada
    crypto_explorer_url = Column(String(500), nullable=True)  # URL do explorer para verificação
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    payer = relationship("WolkPayPayer", back_populates="invoice", uselist=False)
    payment = relationship("WolkPayPayment", back_populates="invoice", uselist=False)
    approval = relationship("WolkPayApproval", back_populates="invoice", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index('ix_wolkpay_invoices_beneficiary_status', 'beneficiary_id', 'status'),
        Index('ix_wolkpay_invoices_created_at', 'created_at'),
    )
    
    @staticmethod
    def generate_invoice_number():
        """Gera número da fatura no formato WKPAY-YYYY-NNNN"""
        year = datetime.now().year
        random_part = secrets.randbelow(10000)
        return f"WKPAY-{year}-{random_part:04d}"
    
    @staticmethod
    def generate_checkout_token():
        """Gera token seguro para checkout"""
        return secrets.token_urlsafe(32)
    
    def is_expired(self) -> bool:
        """Verifica se a fatura expirou"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def __repr__(self):
        return f"<WolkPayInvoice {self.invoice_number} - {self.status}>"


class WolkPayPayer(Base):
    """
    Dados do pagador (terceira pessoa que paga a fatura)
    
    Coleta obrigatória para compliance:
    - Dados pessoais (PF) ou empresariais (PJ)
    - Endereço completo
    - Aceite dos termos
    """
    __tablename__ = "wolkpay_payers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("wolkpay_invoices.id"), nullable=False, unique=True)
    
    # Tipo de pessoa
    person_type = Column(SQLEnum(PersonType), nullable=False)
    
    # === PESSOA FÍSICA ===
    full_name = Column(String(200), nullable=True)
    cpf = Column(String(14), nullable=True)  # Formato: 123.456.789-00
    cpf_encrypted = Column(Text, nullable=True)  # CPF criptografado
    birth_date = Column(Date, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    
    # === PESSOA JURÍDICA ===
    company_name = Column(String(300), nullable=True)  # Razão Social
    cnpj = Column(String(18), nullable=True)  # Formato: 12.345.678/0001-90
    cnpj_encrypted = Column(Text, nullable=True)  # CNPJ criptografado
    trade_name = Column(String(200), nullable=True)  # Nome Fantasia
    state_registration = Column(String(50), nullable=True)  # Inscrição Estadual
    business_phone = Column(String(20), nullable=True)
    business_email = Column(String(200), nullable=True)
    responsible_name = Column(String(200), nullable=True)  # Responsável legal
    responsible_cpf = Column(String(14), nullable=True)
    responsible_cpf_encrypted = Column(Text, nullable=True)
    
    # === ENDEREÇO ===
    zip_code = Column(String(10), nullable=True)  # CEP
    street = Column(String(300), nullable=True)  # Logradouro
    number = Column(String(20), nullable=True)
    complement = Column(String(100), nullable=True)
    neighborhood = Column(String(100), nullable=True)  # Bairro
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)  # UF
    
    # === COMPLIANCE ===
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(Text, nullable=True)  # Browser/Device
    terms_accepted_at = Column(DateTime(timezone=True), nullable=True)
    terms_version = Column(String(10), nullable=True)  # v1.0, v1.1, etc
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    invoice = relationship("WolkPayInvoice", back_populates="payer")
    
    def get_document(self) -> str:
        """Retorna CPF ou CNPJ baseado no tipo de pessoa"""
        if self.person_type == PersonType.PF:
            return self.cpf
        return self.cnpj
    
    def get_name(self) -> str:
        """Retorna nome ou razão social"""
        if self.person_type == PersonType.PF:
            return self.full_name
        return self.company_name
    
    def __repr__(self):
        return f"<WolkPayPayer {self.get_name()} - {self.person_type}>"


class WolkPayPayment(Base):
    """
    Registro do pagamento PIX
    
    Fase 1: PIX Conta Estática (verificação manual)
    Fase 2: BB-AUTO (verificação automática via webhook)
    """
    __tablename__ = "wolkpay_payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("wolkpay_invoices.id"), nullable=False, unique=True)
    payer_id = Column(String(36), ForeignKey("wolkpay_payers.id"), nullable=True)
    
    # Dados do PIX
    pix_key = Column(String(100), nullable=True)  # Chave PIX usada
    pix_txid = Column(String(100), nullable=True, index=True)  # TXID do PIX (BB-AUTO)
    pix_qrcode = Column(Text, nullable=True)  # Código PIX copia-e-cola
    pix_qrcode_image = Column(Text, nullable=True)  # Base64 da imagem QR
    pix_emv = Column(Text, nullable=True)  # Código EMV completo
    
    # Valor
    amount_brl = Column(Numeric(18, 2), nullable=False)
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    
    # Confirmação
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payer_confirmed_at = Column(DateTime(timezone=True), nullable=True)  # Quando pagador informou que pagou
    bank_transaction_id = Column(String(100), nullable=True)  # ID transação bancária
    payer_bank = Column(String(100), nullable=True)  # Banco do pagador
    payer_name_from_bank = Column(String(200), nullable=True)  # Nome no banco
    payer_document_from_bank = Column(String(20), nullable=True)  # CPF/CNPJ no banco
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    invoice = relationship("WolkPayInvoice", back_populates="payment")
    
    def __repr__(self):
        return f"<WolkPayPayment {self.invoice_id} - {self.status}>"


class WolkPayApproval(Base):
    """
    Registro de aprovação/rejeição pelo admin
    """
    __tablename__ = "wolkpay_approvals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("wolkpay_invoices.id"), nullable=False, unique=True)
    
    # Admin que aprovou/rejeitou
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Ação
    action = Column(SQLEnum(ApprovalAction), nullable=False)
    rejection_reason = Column(Text, nullable=True)
    
    # Dados do envio de crypto (se aprovado)
    crypto_tx_hash = Column(String(200), nullable=True)  # Hash da transação blockchain
    crypto_network = Column(String(50), nullable=True)  # Rede usada
    wallet_address = Column(String(200), nullable=True)  # Endereço destino
    
    # Observações
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationship
    invoice = relationship("WolkPayInvoice", back_populates="approval")
    
    def __repr__(self):
        return f"<WolkPayApproval {self.invoice_id} - {self.action}>"


class WolkPayTermsVersion(Base):
    """
    Versionamento dos termos de uso do WolkPay
    
    Importante para compliance: manter histórico de todas as versões
    """
    __tablename__ = "wolkpay_terms_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    version = Column(String(10), unique=True, nullable=False)  # v1.0, v1.1, etc
    content = Column(Text, nullable=False)  # Texto completo dos termos
    summary = Column(Text, nullable=True)  # Resumo das mudanças
    
    active = Column(Boolean, default=False, nullable=False)  # Se é a versão atual
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    activated_at = Column(DateTime(timezone=True), nullable=True)  # Quando foi ativada
    
    def __repr__(self):
        return f"<WolkPayTermsVersion {self.version} - Active: {self.active}>"


class WolkPayPayerLimit(Base):
    """
    Controle de limites por pagador (anti-lavagem de dinheiro)
    
    Limites definidos:
    - Por operação: R$ 15.000,00
    - Por mês/pagador: R$ 300.000,00
    """
    __tablename__ = "wolkpay_payer_limits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Identificação do pagador
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    document_number = Column(String(20), nullable=False)  # CPF ou CNPJ (apenas números)
    document_hash = Column(String(64), nullable=False, index=True)  # Hash para busca
    
    # Período
    month_year = Column(String(7), nullable=False)  # Formato: 2026-01
    
    # Acumulado
    total_amount_brl = Column(Numeric(18, 2), default=0, nullable=False)
    transaction_count = Column(Integer, default=0, nullable=False)
    
    # Última transação
    last_transaction_at = Column(DateTime(timezone=True), nullable=True)
    
    # Bloqueio
    blocked = Column(Boolean, default=False, nullable=False)
    blocked_at = Column(DateTime(timezone=True), nullable=True)
    blocked_reason = Column(Text, nullable=True)
    blocked_by = Column(String(36), nullable=True)  # Admin que bloqueou
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('ix_wolkpay_payer_limits_doc_month', 'document_hash', 'month_year'),
    )
    
    # Limites constantes
    LIMIT_PER_OPERATION = Decimal('15000.00')
    LIMIT_PER_MONTH = Decimal('300000.00')
    
    def can_transact(self, amount: Decimal) -> tuple[bool, str]:
        """
        Verifica se o pagador pode realizar uma transação
        
        Returns:
            tuple: (pode_transacionar, mensagem_erro)
        """
        if self.blocked:
            return False, f"Pagador bloqueado: {self.blocked_reason}"
        
        if amount > self.LIMIT_PER_OPERATION:
            return False, f"Valor excede limite por operação (R$ {self.LIMIT_PER_OPERATION:,.2f})"
        
        new_total = self.total_amount_brl + amount
        if new_total > self.LIMIT_PER_MONTH:
            remaining = self.LIMIT_PER_MONTH - self.total_amount_brl
            return False, f"Limite mensal excedido. Disponível: R$ {remaining:,.2f}"
        
        return True, ""
    
    def __repr__(self):
        return f"<WolkPayPayerLimit {self.document_type}:{self.document_number} - {self.month_year}>"


class WolkPayAuditLog(Base):
    """
    Log de auditoria para todas as ações do WolkPay
    """
    __tablename__ = "wolkpay_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Referência
    invoice_id = Column(String(36), ForeignKey("wolkpay_invoices.id"), nullable=True, index=True)
    
    # Ator
    actor_type = Column(String(20), nullable=False)  # user, admin, system
    actor_id = Column(String(36), nullable=True)
    actor_ip = Column(String(45), nullable=True)
    
    # Ação
    action = Column(String(100), nullable=False)  # create_invoice, fill_payer_data, pay, approve, reject, etc
    description = Column(Text, nullable=True)
    
    # Dados (JSON)
    old_data = Column(Text, nullable=True)  # Estado anterior (JSON)
    new_data = Column(Text, nullable=True)  # Novo estado (JSON)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Index
    __table_args__ = (
        Index('ix_wolkpay_audit_logs_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<WolkPayAuditLog {self.action} - {self.created_at}>"


# ============================================
# WOLKPAY BILL PAYMENT - Pagamento de Boletos
# ============================================
# Fluxo: Usuário paga boletos usando crypto da carteira
# 1. Usuário escaneia/digita código de barras
# 2. Sistema valida boleto (não pode estar vencido, mínimo 1 dia antes do vencimento)
# 3. Sistema faz cotação (valor + taxas)
# 4. Usuário confirma pagamento
# 5. Crypto é DEBITADA IMEDIATAMENTE da carteira do usuário
# 6. Empresa liquida os ativos (crypto → BRL)
# 7. Operador WolkNow paga o boleto
# 8. Comprovante enviado ao usuário
# ============================================

class BillPaymentStatus(str, enum.Enum):
    """Status do pagamento de boleto"""
    PENDING = "PENDING"                    # Boleto validado, aguardando confirmação do usuário
    CRYPTO_DEBITED = "CRYPTO_DEBITED"      # Crypto debitada da carteira do usuário
    PROCESSING = "PROCESSING"              # Em processamento (liquidando ativos)
    PAYING = "PAYING"                      # Operador pagando o boleto
    PAID = "PAID"                          # Boleto pago com sucesso
    FAILED = "FAILED"                      # Falha no pagamento
    REFUNDED = "REFUNDED"                  # Crypto devolvida ao usuário
    CANCELLED = "CANCELLED"                # Cancelado pelo usuário (antes do débito)
    EXPIRED = "EXPIRED"                    # Cotação expirou (5 min)


class BillType(str, enum.Enum):
    """Tipo de boleto"""
    BANK_SLIP = "BANK_SLIP"                # Boleto bancário comum
    UTILITY = "UTILITY"                     # Conta de consumo (luz, água, gás)
    TAX = "TAX"                             # Guias de impostos (DARF, GPS, etc)
    OTHER = "OTHER"                         # Outros


class WolkPayBillPayment(Base):
    """
    Pagamento de Boleto com Crypto
    
    ⚠️ IMPORTANTE:
    - Boleto NÃO pode estar vencido
    - Deve ser pago com mínimo 1 dia de antecedência do vencimento
    - Crypto é debitada IMEDIATAMENTE após confirmação
    - Empresa assume risco de volatilidade
    
    Taxas:
    - Taxa de serviço: 4.75%
    - Taxa de rede: 0.25%
    - Total: 5.00%
    """
    __tablename__ = "wolkpay_bill_payments"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Número do pagamento (legível)
    payment_number = Column(String(25), unique=True, nullable=False, index=True)
    
    # Usuário que está pagando (dono da crypto)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # ========================================
    # DADOS DO BOLETO
    # ========================================
    bill_type = Column(SQLEnum(BillType), default=BillType.BANK_SLIP, nullable=False)
    barcode = Column(String(60), nullable=False)  # Código de barras (44 ou 47 dígitos)
    digitable_line = Column(String(60), nullable=True)  # Linha digitável
    
    # Dados extraídos do boleto
    bill_amount_brl = Column(Numeric(18, 2), nullable=False)  # Valor do boleto
    bill_due_date = Column(Date, nullable=False)  # Data de vencimento
    bill_beneficiary_name = Column(String(200), nullable=True)  # Nome do beneficiário (quem recebe)
    bill_beneficiary_document = Column(String(20), nullable=True)  # CNPJ/CPF do beneficiário
    bill_payer_name = Column(String(200), nullable=True)  # Nome do pagador original
    bill_payer_document = Column(String(20), nullable=True)  # CPF/CNPJ do pagador original
    bill_bank_code = Column(String(10), nullable=True)  # Código do banco
    bill_bank_name = Column(String(100), nullable=True)  # Nome do banco
    
    # ========================================
    # CRYPTO USADA PARA PAGAMENTO
    # ========================================
    crypto_currency = Column(String(20), nullable=False)  # BTC, ETH, USDT, etc
    crypto_amount = Column(Numeric(28, 18), nullable=False)  # Quantidade de crypto debitada
    crypto_network = Column(String(50), nullable=True)  # Rede
    
    # Cotações no momento da confirmação
    crypto_usd_rate = Column(Numeric(18, 8), nullable=False)  # Cotação crypto/USD
    brl_usd_rate = Column(Numeric(18, 4), nullable=False)  # Cotação USD/BRL
    
    # ========================================
    # VALORES E TAXAS
    # ========================================
    base_amount_brl = Column(Numeric(18, 2), nullable=False)  # Valor do boleto
    service_fee_percent = Column(Numeric(5, 2), default=4.75)  # Taxa serviço: 4.75%
    service_fee_brl = Column(Numeric(18, 2), nullable=False)  # Valor da taxa serviço
    network_fee_percent = Column(Numeric(5, 2), default=0.25)  # Taxa rede: 0.25%
    network_fee_brl = Column(Numeric(18, 2), nullable=False)  # Valor da taxa rede
    total_amount_brl = Column(Numeric(18, 2), nullable=False)  # Total debitado em BRL (boleto + taxas)
    
    # ========================================
    # STATUS E CONTROLE
    # ========================================
    status = Column(SQLEnum(BillPaymentStatus), default=BillPaymentStatus.PENDING, nullable=False, index=True)
    
    # Cotação válida por 5 minutos
    quote_expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Quando a crypto foi debitada da carteira do usuário
    crypto_debited_at = Column(DateTime(timezone=True), nullable=True)
    
    # Transação interna de débito
    internal_tx_id = Column(String(36), nullable=True)  # ID da transação interna
    
    # ========================================
    # PAGAMENTO DO BOLETO
    # ========================================
    # Operador que pagou
    paid_by_operator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Comprovante
    payment_receipt_url = Column(String(500), nullable=True)  # URL do comprovante
    payment_receipt_data = Column(Text, nullable=True)  # Dados do comprovante (JSON)
    bank_authentication = Column(String(100), nullable=True)  # Autenticação bancária
    
    # Quando foi pago
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # ========================================
    # EM CASO DE FALHA/REEMBOLSO
    # ========================================
    failure_reason = Column(Text, nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    refund_tx_id = Column(String(36), nullable=True)  # ID da transação de reembolso
    
    # ========================================
    # TIMESTAMPS
    # ========================================
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('ix_wolkpay_bill_user_status', 'user_id', 'status'),
        Index('ix_wolkpay_bill_created_at', 'created_at'),
        Index('ix_wolkpay_bill_barcode', 'barcode'),
    )
    
    # ========================================
    # CONSTANTES
    # ========================================
    SERVICE_FEE_PERCENT = Decimal('4.75')
    NETWORK_FEE_PERCENT = Decimal('0.25')
    TOTAL_FEE_PERCENT = Decimal('5.00')
    QUOTE_VALIDITY_MINUTES = 5  # Cotação válida por 5 minutos
    MIN_DAYS_BEFORE_DUE = 1  # Mínimo 1 dia antes do vencimento
    
    @staticmethod
    def generate_payment_number():
        """Gera número do pagamento no formato WKBILL-YYYY-NNNNNN"""
        year = datetime.now().year
        random_part = secrets.randbelow(1000000)
        return f"WKBILL-{year}-{random_part:06d}"
    
    def is_quote_expired(self) -> bool:
        """Verifica se a cotação expirou"""
        return datetime.now(timezone.utc) > self.quote_expires_at
    
    def validate_due_date(self) -> tuple[bool, str]:
        """
        Valida se o boleto pode ser pago
        
        Regras:
        - Boleto NÃO pode estar vencido
        - Deve ter mínimo 1 dia de antecedência
        
        Returns:
            tuple: (é_válido, mensagem_erro)
        """
        today = datetime.now(timezone.utc).date()
        
        # Boleto vencido
        if self.bill_due_date < today:
            days_overdue = (today - self.bill_due_date).days
            return False, f"Boleto vencido há {days_overdue} dia(s). Não é possível pagar boletos vencidos."
        
        # Vence hoje
        if self.bill_due_date == today:
            return False, "Boleto vence hoje. Por segurança, só aceitamos boletos com mínimo 1 dia de antecedência."
        
        # Vence amanhã ou depois - OK
        days_until_due = (self.bill_due_date - today).days
        if days_until_due < self.MIN_DAYS_BEFORE_DUE:
            return False, f"Boleto vence em {days_until_due} dia(s). Mínimo necessário: {self.MIN_DAYS_BEFORE_DUE} dia(s) de antecedência."
        
        return True, f"Boleto válido. Vence em {days_until_due} dias."
    
    def can_be_paid(self) -> tuple[bool, str]:
        """
        Verifica se o pagamento pode ser processado
        
        Returns:
            tuple: (pode_pagar, mensagem_erro)
        """
        # Verifica status
        if self.status != BillPaymentStatus.PENDING:
            return False, f"Pagamento não está pendente. Status atual: {self.status.value}"
        
        # Verifica cotação
        if self.is_quote_expired():
            return False, "Cotação expirada. Por favor, faça uma nova cotação."
        
        # Verifica vencimento
        valid, msg = self.validate_due_date()
        if not valid:
            return False, msg
        
        return True, "Pagamento pode ser processado."
    
    def __repr__(self):
        return f"<WolkPayBillPayment {self.payment_number} - {self.status}>"


class WolkPayBillPaymentLog(Base):
    """
    Log de eventos do pagamento de boleto
    
    Rastreia todo o ciclo de vida do pagamento
    """
    __tablename__ = "wolkpay_bill_payment_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Referência ao pagamento
    bill_payment_id = Column(String(36), ForeignKey("wolkpay_bill_payments.id"), nullable=False, index=True)
    
    # Evento
    event = Column(String(50), nullable=False)  # created, quoted, confirmed, crypto_debited, processing, paid, failed, refunded
    
    # Status anterior e novo
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    
    # Detalhes
    details = Column(Text, nullable=True)  # JSON com detalhes do evento
    
    # Ator
    actor_type = Column(String(20), nullable=False)  # user, system, operator
    actor_id = Column(String(36), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('ix_wolkpay_bill_log_payment_id', 'bill_payment_id'),
    )
    
    def __repr__(self):
        return f"<WolkPayBillPaymentLog {self.event} - {self.created_at}>"
