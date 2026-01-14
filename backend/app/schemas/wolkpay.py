"""
🚀 WolkPay - Pydantic Schemas
==============================

Schemas para validação de requests/responses da API WolkPay.

Author: HOLD Wallet Team
Date: January 2026
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


# ============================================
# ENUMS (espelhando os do model)
# ============================================

class PersonTypeEnum(str, Enum):
    PF = "PF"
    PJ = "PJ"


class InvoiceStatusEnum(str, Enum):
    PENDING = "PENDING"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    PAID = "PAID"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class FeePayerEnum(str, Enum):
    """Quem paga as taxas"""
    BENEFICIARY = "BENEFICIARY"  # Beneficiário paga (padrão)
    PAYER = "PAYER"              # Pagador paga


# ============================================
# INVOICE SCHEMAS
# ============================================

class CreateInvoiceRequest(BaseModel):
    """Request para criar uma fatura WolkPay"""
    crypto_currency: str = Field(..., min_length=2, max_length=20, description="Símbolo da crypto: BTC, ETH, USDT, etc")
    crypto_amount: Decimal = Field(..., gt=0, description="Quantidade de crypto desejada")
    crypto_network: Optional[str] = Field(None, description="Rede: ERC20, TRC20, etc")
    fee_payer: FeePayerEnum = Field(
        default=FeePayerEnum.BENEFICIARY, 
        description="Quem paga as taxas: BENEFICIARY (padrão) ou PAYER"
    )
    
    @validator('crypto_currency')
    def validate_crypto(cls, v):
        return v.upper().strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "crypto_currency": "USDT",
                "crypto_amount": "100.00",
                "crypto_network": "TRC20",
                "fee_payer": "BENEFICIARY"
            }
        }


class InvoiceResponse(BaseModel):
    """Response com dados da fatura"""
    id: str
    invoice_number: str
    status: str
    
    # Beneficiário (dados parciais por privacidade)
    beneficiary_name: Optional[str] = None  # Nome parcial: J***o M***s
    beneficiary_id: str
    
    # Crypto
    crypto_currency: str
    crypto_amount: Decimal
    crypto_network: Optional[str] = None
    
    # Valores
    usd_rate: Decimal
    brl_rate: Decimal
    base_amount_brl: Decimal
    service_fee_percent: Decimal
    service_fee_brl: Decimal
    network_fee_percent: Decimal
    network_fee_brl: Decimal
    total_amount_brl: Decimal
    
    # Quem paga as taxas
    fee_payer: str = "BENEFICIARY"
    beneficiary_receives_brl: Optional[Decimal] = None
    
    # Checkout
    checkout_token: str
    checkout_url: Optional[str] = None
    
    # Transação Blockchain (TX)
    crypto_tx_hash: Optional[str] = None
    crypto_tx_network: Optional[str] = None
    crypto_wallet_address: Optional[str] = None
    crypto_sent_at: Optional[datetime] = None
    crypto_explorer_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    expires_at: datetime
    expires_in_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True


class InvoiceCreatedResponse(BaseModel):
    """Response após criar fatura (com dados para compartilhar)"""
    invoice: InvoiceResponse
    share_url: str
    share_qr_code: Optional[str] = None  # Base64 do QR Code do link
    message: str = "Fatura criada com sucesso! Compartilhe o link com o pagador."


class InvoiceListResponse(BaseModel):
    """Lista de faturas do beneficiário"""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int


# ============================================
# PAYER SCHEMAS (Checkout)
# ============================================

class PayerAddressData(BaseModel):
    """Dados de endereço do pagador"""
    zip_code: str = Field(..., min_length=8, max_length=10, description="CEP")
    street: str = Field(..., min_length=3, max_length=300, description="Logradouro")
    number: str = Field(..., min_length=1, max_length=20)
    complement: Optional[str] = Field(None, max_length=100)
    neighborhood: str = Field(..., min_length=2, max_length=100, description="Bairro")
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=2, description="UF")
    
    @validator('zip_code')
    def validate_zip(cls, v):
        # Remove caracteres não numéricos
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 8:
            raise ValueError("CEP deve ter 8 dígitos")
        return v
    
    @validator('state')
    def validate_state(cls, v):
        valid_states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
                       'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
                       'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
        if v.upper() not in valid_states:
            raise ValueError("UF inválida")
        return v.upper()


class PayerPFData(BaseModel):
    """Dados de Pessoa Física"""
    full_name: str = Field(..., min_length=5, max_length=200, description="Nome completo")
    cpf: str = Field(..., min_length=11, max_length=14, description="CPF")
    birth_date: date = Field(..., description="Data de nascimento")
    phone: str = Field(..., min_length=10, max_length=20, description="Telefone")
    email: EmailStr = Field(..., description="E-mail")
    
    @validator('cpf')
    def validate_cpf(cls, v):
        # Remove caracteres não numéricos
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        # Validação básica de CPF
        if clean == clean[0] * 11:
            raise ValueError("CPF inválido")
        return v
    
    @validator('birth_date')
    def validate_birth_date(cls, v):
        from datetime import date as dt
        today = dt.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError("Pagador deve ter pelo menos 18 anos")
        if age > 120:
            raise ValueError("Data de nascimento inválida")
        return v


class PayerPJData(BaseModel):
    """Dados de Pessoa Jurídica"""
    company_name: str = Field(..., min_length=5, max_length=300, description="Razão Social")
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ")
    trade_name: Optional[str] = Field(None, max_length=200, description="Nome Fantasia")
    state_registration: Optional[str] = Field(None, max_length=50, description="Inscrição Estadual")
    business_phone: str = Field(..., min_length=10, max_length=20, description="Telefone comercial")
    business_email: EmailStr = Field(..., description="E-mail comercial")
    responsible_name: str = Field(..., min_length=5, max_length=200, description="Nome do responsável")
    responsible_cpf: str = Field(..., min_length=11, max_length=14, description="CPF do responsável")
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        return v
    
    @validator('responsible_cpf')
    def validate_responsible_cpf(cls, v):
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 11:
            raise ValueError("CPF do responsável deve ter 11 dígitos")
        return v


class SavePayerDataRequest(BaseModel):
    """Request para salvar dados do pagador no checkout"""
    person_type: PersonTypeEnum = Field(..., description="Tipo: PF ou PJ")
    
    # Dados PF (obrigatórios se person_type == PF)
    pf_data: Optional[PayerPFData] = None
    
    # Dados PJ (obrigatórios se person_type == PJ)
    pj_data: Optional[PayerPJData] = None
    
    # Endereço (sempre obrigatório)
    address: PayerAddressData
    
    # Termos aceitos
    terms_accepted: bool = Field(..., description="Aceite dos termos")
    terms_version: str = Field(default="v1.0", description="Versão dos termos")
    
    @validator('pf_data', always=True)
    def validate_pf_data(cls, v, values):
        if values.get('person_type') == PersonTypeEnum.PF and v is None:
            raise ValueError("Dados de Pessoa Física são obrigatórios")
        return v
    
    @validator('pj_data', always=True)
    def validate_pj_data(cls, v, values):
        if values.get('person_type') == PersonTypeEnum.PJ and v is None:
            raise ValueError("Dados de Pessoa Jurídica são obrigatórios")
        return v
    
    @validator('terms_accepted')
    def validate_terms(cls, v):
        if not v:
            raise ValueError("É obrigatório aceitar os termos")
        return v


# ============================================
# PAYMENT SCHEMAS
# ============================================

class GeneratePixRequest(BaseModel):
    """Request para gerar PIX (após preencher dados do pagador)"""
    # Não precisa de campos adicionais, usa o token do checkout
    pass


class PixPaymentResponse(BaseModel):
    """Response com dados do PIX para pagamento"""
    invoice_id: str
    invoice_number: str
    
    # Dados do PIX
    pix_key: str  # Chave PIX (CNPJ da HOLD)
    pix_qrcode: str  # Código copia-e-cola
    pix_qrcode_image: Optional[str] = None  # Base64 da imagem
    pix_txid: Optional[str] = None  # TXID do PIX (BB-AUTO)
    
    # Valor
    amount_brl: Decimal
    
    # Favorecido
    recipient_name: str = "HOLD DIGITAL ASSETS LTDA"
    recipient_document: str = "24.275.355/0001-51"
    
    # Validade
    expires_at: datetime
    expires_in_seconds: int
    
    # Instruções
    instructions: str = "Pague o valor EXATO. Valores diferentes serão recusados."
    
    # Indica se é PIX automático (BB) ou estático (manual)
    is_automatic: bool = True


class PaymentStatusResponse(BaseModel):
    """Response com status do pagamento"""
    invoice_id: str
    invoice_number: str
    status: str
    paid: bool = False
    paid_at: Optional[datetime] = None
    message: str


# ============================================
# CHECKOUT SCHEMAS
# ============================================

class CheckoutDataResponse(BaseModel):
    """Response com dados do checkout (página pública)"""
    invoice_id: str
    invoice_number: str
    status: str
    
    # Beneficiário (dados parciais por privacidade)
    beneficiary_name: str  # Nome completo mascarado: J***o M***s
    beneficiary_uid: str  # UID da conta: WK-XXXX
    beneficiary_verified: bool = True
    
    # Valores
    crypto_currency: str
    crypto_amount: Decimal
    total_amount_brl: Decimal  # Valor que o pagador vai pagar
    
    # Quem paga as taxas - info transparente para o pagador
    fee_payer: str = "BENEFICIARY"
    service_fee_brl: Optional[Decimal] = None
    network_fee_brl: Optional[Decimal] = None
    total_fees_brl: Optional[Decimal] = None
    fee_payer_label: str = "Taxas pagas pelo beneficiário"  # Texto amigável
    
    # Validade
    expires_at: datetime
    expires_in_seconds: int
    is_expired: bool
    
    # Termos
    terms_version: str = "v1.0"


class CheckoutExpiredResponse(BaseModel):
    """Response quando checkout expirou"""
    invoice_id: str
    invoice_number: str
    status: str = "EXPIRED"
    message: str = "Esta fatura expirou. Solicite uma nova fatura ao beneficiário."
    expired_at: datetime


# ============================================
# ADMIN SCHEMAS
# ============================================

class AdminInvoiceResponse(BaseModel):
    """Response detalhado para admin"""
    invoice: InvoiceResponse
    
    # Dados completos do pagador
    payer: Optional[dict] = None
    
    # Dados do pagamento
    payment: Optional[dict] = None
    
    # Dados da aprovação
    approval: Optional[dict] = None


class AdminInvoiceListResponse(BaseModel):
    """Lista de faturas para admin"""
    invoices: List[AdminInvoiceResponse]
    total: int
    pending_count: int
    paid_count: int
    approved_count: int
    page: int
    per_page: int


class ApproveInvoiceRequest(BaseModel):
    """Request para aprovar uma fatura e enviar crypto"""
    network: Optional[str] = Field(None, description="Rede blockchain para envio: polygon, ethereum, bitcoin, etc")
    notes: Optional[str] = Field(None, max_length=500, description="Observações do admin")


class RejectInvoiceRequest(BaseModel):
    """Request para rejeitar uma fatura"""
    rejection_reason: str = Field(..., min_length=10, max_length=500, description="Motivo da rejeição")
    notes: Optional[str] = Field(None, max_length=500, description="Observações adicionais")


class ApprovalResponse(BaseModel):
    """Response após aprovar/rejeitar"""
    invoice_id: str
    invoice_number: str
    action: str  # APPROVED ou REJECTED
    message: str
    crypto_tx_hash: Optional[str] = None  # Hash da transação (se aprovado)


# ============================================
# REPORTS SCHEMAS
# ============================================

class ReportPeriodRequest(BaseModel):
    """Request para relatório por período"""
    start_date: date
    end_date: date
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError("Data final deve ser maior que data inicial")
        return v


class ReportSummary(BaseModel):
    """Resumo do relatório"""
    period_start: date
    period_end: date
    
    # Totais
    total_operations: int
    total_volume_brl: Decimal
    total_service_fee_brl: Decimal
    total_network_fee_brl: Decimal
    net_revenue_brl: Decimal
    
    # Por status
    completed_count: int
    pending_count: int
    expired_count: int
    rejected_count: int


class ReportDetailItem(BaseModel):
    """Item detalhado do relatório"""
    date: date
    invoice_number: str
    beneficiary_name: str
    payer_name: str
    payer_document: str  # CPF/CNPJ parcial
    crypto_currency: str
    crypto_amount: Decimal
    total_amount_brl: Decimal
    service_fee_brl: Decimal
    network_fee_brl: Decimal
    status: str


class ReportResponse(BaseModel):
    """Response completo do relatório"""
    summary: ReportSummary
    details: List[ReportDetailItem]
    generated_at: datetime


# ============================================
# LIMIT CHECK SCHEMAS
# ============================================

class LimitCheckRequest(BaseModel):
    """Request para verificar limites de um pagador"""
    document_type: Literal["CPF", "CNPJ"]
    document_number: str
    amount: Decimal


class LimitCheckResponse(BaseModel):
    """Response da verificação de limites"""
    can_transact: bool
    document_type: str
    month_year: str
    
    # Limites
    limit_per_operation: Decimal
    limit_per_month: Decimal
    
    # Usado no mês
    used_this_month: Decimal
    transaction_count: int
    
    # Disponível
    available: Decimal
    
    # Bloqueio
    is_blocked: bool
    blocked_reason: Optional[str] = None
    
    # Mensagem
    message: str


# ============================================
# PAYER TO USER CONVERSION SCHEMAS
# ============================================

class ConvertPayerToUserRequest(BaseModel):
    """Request para converter pagador em usuário WolkNow"""
    # Apenas precisa de senha - os outros dados já estão no pagador
    password: str = Field(..., min_length=8, max_length=100, description="Senha para a nova conta")
    confirm_password: str = Field(..., min_length=8, max_length=100, description="Confirmação de senha")
    accept_terms: bool = Field(..., description="Aceitar termos de uso da plataforma")
    accept_privacy: bool = Field(..., description="Aceitar política de privacidade")
    
    # Opcional: receber comunicações
    accept_marketing: bool = Field(default=False, description="Aceitar receber comunicações de marketing")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError("As senhas não conferem")
        return v
    
    @validator('accept_terms')
    def must_accept_terms(cls, v):
        if not v:
            raise ValueError("É obrigatório aceitar os termos de uso")
        return v
    
    @validator('accept_privacy')
    def must_accept_privacy(cls, v):
        if not v:
            raise ValueError("É obrigatório aceitar a política de privacidade")
        return v


class ConvertPayerToUserResponse(BaseModel):
    """Response após criar conta do pagador"""
    success: bool
    user_id: str
    email: str
    name: str
    message: str = "Conta criada com sucesso! Faça login para acessar seus benefícios."
    
    # Benefícios destacados (usar ícones lucide-react no frontend)
    benefits: List[str] = [
        "Bônus de boas-vindas em crypto",
        "Taxas reduzidas em operações",
        "Acesso ao painel de investimentos",
        "Carteira segura com backup",
        "Compra e venda instantânea",
        "App mobile exclusivo"
    ]
    
    # Próximos passos
    next_steps: List[str] = [
        "Confirme seu e-mail",
        "Complete a verificação de identidade",
        "Faça seu primeiro depósito",
        "Comece a investir!"
    ]


class PayerConversionEligibility(BaseModel):
    """Verifica se pagador pode criar conta"""
    can_convert: bool
    reason: Optional[str] = None
    
    # Dados que serão usados
    email: str
    name: str
    document_type: str  # CPF ou CNPJ
    document_masked: str  # ***.***.***-** 
    
    # Promoção/benefícios
    welcome_bonus: Optional[str] = None  # Ex: "R$ 10,00 em BTC"
    promo_message: Optional[str] = None


class PayerBenefitsInfo(BaseModel):
    """Informações sobre benefícios para exibir no checkout"""
    show_conversion_offer: bool = True
    
    # Mensagem principal
    headline: str = "Já pagou? Aproveite e crie sua conta WolkNow!"
    subheadline: str = "Use os mesmos dados e ganhe benefícios exclusivos"
    
    # Benefícios em destaque (icon = nome do ícone lucide-react)
    benefits: List[dict] = [
        {"icon": "Gift", "title": "Bônus de Boas-vindas", "description": "Ganhe crypto grátis ao criar sua conta"},
        {"icon": "Percent", "title": "Taxas Reduzidas", "description": "Pague menos em todas as operações"},
        {"icon": "LineChart", "title": "Painel Completo", "description": "Acompanhe seus investimentos em tempo real"},
        {"icon": "ShieldCheck", "title": "Segurança Total", "description": "Carteira com backup e 2FA"},
    ]
    
    # CTA
    cta_text: str = "Criar Minha Conta Grátis"
    cta_subtitle: str = "Leva menos de 1 minuto!"


# ============================================
# BILL PAYMENT SCHEMAS - Pagamento de Boletos
# ============================================

class BillTypeEnum(str, Enum):
    """Tipo de boleto"""
    BANK_SLIP = "BANK_SLIP"   # Boleto bancário comum
    UTILITY = "UTILITY"       # Conta de consumo (luz, água, gás)
    TAX = "TAX"               # Guias de impostos (DARF, GPS, etc)
    OTHER = "OTHER"           # Outros


class BillPaymentStatusEnum(str, Enum):
    """Status do pagamento de boleto"""
    PENDING = "PENDING"
    CRYPTO_DEBITED = "CRYPTO_DEBITED"
    PROCESSING = "PROCESSING"
    PAYING = "PAYING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class ValidateBillRequest(BaseModel):
    """
    Request para validar/escanear um boleto
    Primeira etapa: usuário envia código de barras
    """
    barcode: str = Field(..., description="Código de barras do boleto (44-47 dígitos)")
    
    @validator('barcode')
    def validate_barcode(cls, v):
        # Remove espaços, pontos e outros caracteres não numéricos
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) < 44 or len(clean) > 48:
            raise ValueError(f"Código de barras deve ter entre 44 e 48 dígitos. Recebido: {len(clean)} dígitos")
        return clean


class BillInfoResponse(BaseModel):
    """
    Response com informações do boleto validado
    ⚠️ IMPORTANTE: Mostra alerta se vencimento < 1 dia
    
    Inclui detalhes sobre:
    - Status de vencimento (dias vencido/a vencer)
    - Multas e juros aplicados (quando vencido)
    - Valor original vs valor final
    """
    valid: bool
    error_message: Optional[str] = None
    
    barcode: str
    digitable_line: Optional[str] = None
    bill_type: BillTypeEnum
    
    # Valores detalhados
    original_amount_brl: Decimal = Field(description="Valor original do boleto (sem multa/juros)")
    fine_amount_brl: Decimal = Field(default=Decimal("0"), description="Multa por atraso (2%)")
    interest_amount_brl: Decimal = Field(default=Decimal("0"), description="Juros por atraso (~1% ao mês)")
    amount_brl: Decimal = Field(description="Valor final a pagar (original + multa + juros)")
    
    # Informações de vencimento
    due_date: date
    days_until_due: int = Field(description="Dias até vencimento (negativo = vencido)")
    is_overdue: bool = Field(default=False, description="True se o boleto está vencido")
    days_overdue: int = Field(default=0, description="Quantidade de dias vencido (0 se não vencido)")
    due_date_valid: bool
    due_date_warning: Optional[str] = None
    
    # Status detalhado
    status: str = Field(default="valid", description="valid, overdue, expired, due_today, near_due")
    status_message: Optional[str] = Field(default=None, description="Mensagem amigável sobre o status")
    
    # Dados do beneficiário
    beneficiary_name: Optional[str] = None
    beneficiary_document: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    
    # Informação extra para transparência
    fees_disclaimer: Optional[str] = Field(
        default="Multas e juros são cobrados pelo emissor do boleto, não pela plataforma.",
        description="Aviso sobre origem das multas/juros"
    )


class QuoteBillPaymentRequest(BaseModel):
    """
    Request para cotar pagamento de boleto
    Segunda etapa: usuário escolhe qual crypto usar
    """
    barcode: str = Field(..., description="Código de barras validado")
    crypto_currency: str = Field(..., description="Crypto para pagar: BTC, ETH, USDT, etc")
    crypto_network: Optional[str] = Field(None, description="Rede: polygon, ethereum, tron, etc")
    
    @validator('crypto_currency')
    def validate_crypto(cls, v):
        return v.upper().strip()


class BillPaymentQuoteResponse(BaseModel):
    """
    Response com cotação para pagamento do boleto
    ⚠️ Cotação válida por 5 minutos
    """
    quote_id: str
    
    barcode: str
    bill_amount_brl: Decimal
    due_date: date
    beneficiary_name: Optional[str] = None
    
    crypto_currency: str
    crypto_network: Optional[str] = None
    crypto_amount: Decimal
    
    crypto_usd_rate: Decimal
    brl_usd_rate: Decimal
    
    service_fee_percent: Decimal = Field(default=Decimal("4.75"))
    service_fee_brl: Decimal
    network_fee_percent: Decimal = Field(default=Decimal("0.25"))
    network_fee_brl: Decimal
    total_fees_brl: Decimal
    
    total_amount_brl: Decimal
    total_crypto_amount: Decimal
    
    quote_expires_at: datetime
    quote_valid_seconds: int = Field(default=300)
    
    user_crypto_balance: Decimal
    has_sufficient_balance: bool
    
    summary: dict = Field(default_factory=dict)


class ConfirmBillPaymentRequest(BaseModel):
    """
    Request para confirmar pagamento do boleto
    ⚠️ IMPORTANTE: Após confirmação, crypto é DEBITADA IMEDIATAMENTE
    """
    quote_id: str = Field(..., description="ID da cotação")
    confirm_debit: bool = Field(..., description="Usuário confirma débito imediato")
    
    @validator('confirm_debit')
    def must_confirm(cls, v):
        if not v:
            raise ValueError("Você deve confirmar o débito para prosseguir")
        return v


class BillPaymentResponse(BaseModel):
    """Response do pagamento de boleto"""
    id: str
    payment_number: str
    status: BillPaymentStatusEnum
    
    barcode: str
    bill_amount_brl: Decimal
    due_date: date
    beneficiary_name: Optional[str] = None
    bank_name: Optional[str] = None
    
    crypto_currency: str
    crypto_amount: Decimal
    crypto_network: Optional[str] = None
    
    total_amount_brl: Decimal
    service_fee_brl: Decimal
    network_fee_brl: Decimal
    
    created_at: datetime
    crypto_debited_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    payment_receipt_url: Optional[str] = None
    bank_authentication: Optional[str] = None
    
    status_message: str


class BillPaymentListResponse(BaseModel):
    """Lista de pagamentos de boletos do usuário"""
    payments: List[BillPaymentResponse]
    total: int
    page: int
    per_page: int


class OperatorPayBillRequest(BaseModel):
    """Request para operador marcar boleto como pago"""
    payment_id: str
    bank_authentication: str
    payment_receipt_url: Optional[str] = None
    notes: Optional[str] = None


class RefundBillPaymentRequest(BaseModel):
    """Request para reembolsar crypto ao usuário"""
    payment_id: str
    reason: str