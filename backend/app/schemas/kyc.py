"""
🔐 KYC Schemas - Pydantic Validation
====================================
Schemas para validação de dados do módulo KYC.

Author: HOLD Wallet Team
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid
import re


# ============================================================
# ENUMS (espelhados do model)
# ============================================================

class KYCStatusEnum(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    DOCUMENTS_REQUESTED = "documents_requested"


class KYCLevelEnum(str, Enum):
    NONE = "none"
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    PREMIUM = "premium"


class DocumentTypeEnum(str, Enum):
    # Documentos de identidade
    IDENTITY_FRONT = "identity_front"
    IDENTITY_BACK = "identity_back"
    CNH_FRONT = "cnh_front"
    CNH_BACK = "cnh_back"
    RG_FRONT = "rg_front"
    RG_BACK = "rg_back"
    CPF_PHOTO = "cpf_photo"
    PASSPORT = "passport"
    # Selfies
    SELFIE = "selfie"
    SELFIE_WITH_DOCUMENT = "selfie_with_document"
    SELFIE_LIVENESS = "selfie_liveness"
    # Comprovantes
    ADDRESS_PROOF = "address_proof"
    PROOF_OF_ADDRESS = "proof_of_address"
    INCOME_PROOF = "income_proof"
    PROOF_OF_INCOME = "proof_of_income"
    # Outros
    OTHER = "other"


class DocumentStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


# ============================================================
# VALIDATORS
# ============================================================

def validate_cpf(cpf: str) -> str:
    """Valida e formata CPF"""
    # Remove caracteres não numéricos
    cpf = re.sub(r'\D', '', cpf)
    
    if len(cpf) != 11:
        raise ValueError("CPF deve ter 11 dígitos")
    
    # Verifica se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        raise ValueError("CPF inválido")
    
    # Validação dos dígitos verificadores
    def calc_digit(cpf_slice: str, weights: List[int]) -> int:
        total = sum(int(d) * w for d, w in zip(cpf_slice, weights))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    
    if calc_digit(cpf[:9], weights1) != int(cpf[9]):
        raise ValueError("CPF inválido")
    if calc_digit(cpf[:10], weights2) != int(cpf[10]):
        raise ValueError("CPF inválido")
    
    return cpf


def validate_phone_br(phone: str) -> str:
    """Valida telefone brasileiro"""
    phone = re.sub(r'\D', '', phone)
    
    # Com DDI: 55 + DDD (2) + número (8-9)
    if len(phone) == 13 and phone.startswith('55'):
        phone = phone[2:]  # Remove DDI
    
    # DDD (2) + número (8-9)
    if len(phone) not in [10, 11]:
        raise ValueError("Telefone deve ter 10 ou 11 dígitos (com DDD)")
    
    return phone


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class KYCStartRequest(BaseModel):
    """Iniciar verificação KYC"""
    level: KYCLevelEnum = Field(default=KYCLevelEnum.BASIC, description="Nível de KYC desejado")
    consent: bool = Field(..., description="Consentimento LGPD obrigatório")
    
    @validator('consent')
    def consent_required(cls, v):
        if not v:
            raise ValueError("Consentimento LGPD é obrigatório para iniciar o KYC")
        return v


class KYCPersonalDataRequest(BaseModel):
    """Dados pessoais para KYC"""
    # Dados básicos
    full_name: str = Field(..., min_length=3, max_length=255, description="Nome completo")
    social_name: Optional[str] = Field(None, max_length=255, description="Nome social")
    birth_date: date = Field(..., description="Data de nascimento")
    nationality: str = Field(default="BR", max_length=2, description="Nacionalidade (ISO 3166-1)")
    gender: Optional[str] = Field(None, description="Gênero")
    mother_name: Optional[str] = Field(None, max_length=255, description="Nome da mãe")
    
    # Documento
    document_type: str = Field(default="cpf", description="Tipo de documento")
    document_number: str = Field(..., description="Número do CPF")
    rg_number: Optional[str] = Field(None, description="Número do RG")
    rg_issuer: Optional[str] = Field(None, max_length=50, description="Órgão emissor do RG")
    rg_state: Optional[str] = Field(None, max_length=2, description="UF do RG")
    
    # Endereço
    zip_code: Optional[str] = Field(None, description="CEP")
    street: Optional[str] = Field(None, max_length=255, description="Rua")
    number: Optional[str] = Field(None, max_length=20, description="Número")
    complement: Optional[str] = Field(None, max_length=100, description="Complemento")
    neighborhood: Optional[str] = Field(None, max_length=100, description="Bairro")
    city: Optional[str] = Field(None, max_length=100, description="Cidade")
    state: Optional[str] = Field(None, max_length=2, description="UF")
    country: str = Field(default="BR", max_length=2)
    
    # Contato
    phone: Optional[str] = Field(None, description="Telefone com DDD")
    email: Optional[EmailStr] = Field(None, description="Email")
    
    # Financeiro
    occupation: Optional[str] = Field(None, max_length=255, description="Profissão")
    employer: Optional[str] = Field(None, max_length=255, description="Empregador")
    monthly_income: Optional[str] = Field(None, description="Faixa de renda mensal")
    source_of_funds: Optional[str] = Field(None, description="Origem dos recursos")
    
    # Compliance
    pep: bool = Field(default=False, description="Pessoa Politicamente Exposta")
    pep_relationship: Optional[str] = Field(None, description="Relacionamento com PEP")
    fatca: bool = Field(default=False, description="Cidadão/residente EUA")
    fatca_tin: Optional[str] = Field(None, description="Tax ID Number (EUA)")
    
    @validator('document_number')
    def validate_document(cls, v, values):
        if values.get('document_type') == 'cpf':
            return validate_cpf(v)
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            return validate_phone_br(v)
        return v
    
    @validator('birth_date')
    def validate_birth_date(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError("Idade mínima é 18 anos")
        if age > 120:
            raise ValueError("Data de nascimento inválida")
        return v
    
    @validator('zip_code')
    def validate_zip_code(cls, v):
        if v:
            v = re.sub(r'\D', '', v)
            if len(v) != 8:
                raise ValueError("CEP deve ter 8 dígitos")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "João da Silva",
                "birth_date": "1990-05-15",
                "nationality": "BR",
                "document_type": "cpf",
                "document_number": "123.456.789-00",
                "phone": "11999999999",
                "zip_code": "01234567",
                "street": "Rua das Flores",
                "number": "123",
                "city": "São Paulo",
                "state": "SP",
                "occupation": "Desenvolvedor",
                "monthly_income": "5000-10000",
                "source_of_funds": "salary",
                "pep": False,
                "fatca": False
            }
        }


class KYCDocumentUploadRequest(BaseModel):
    """Metadados do documento (arquivo enviado via multipart/form-data)"""
    document_type: DocumentTypeEnum = Field(..., description="Tipo do documento")


class KYCSubmitRequest(BaseModel):
    """Submeter KYC para análise"""
    confirm: bool = Field(default=True, description="Confirmar submissão")


# ============================================================
# ADMIN REQUEST SCHEMAS
# ============================================================

class KYCApproveRequest(BaseModel):
    """Admin aprova KYC"""
    notes: Optional[str] = Field(None, max_length=1000, description="Notas do admin")
    expiration_months: int = Field(default=24, ge=6, le=60, description="Meses até expiração")


class KYCRejectRequest(BaseModel):
    """Admin rejeita KYC"""
    reason: str = Field(..., min_length=10, max_length=1000, description="Motivo da rejeição")
    details: Optional[Dict[str, Any]] = Field(None, description="Detalhes estruturados")


class KYCRequestDocumentsRequest(BaseModel):
    """Admin solicita documentos adicionais"""
    documents: List[DocumentTypeEnum] = Field(..., min_items=1, description="Documentos solicitados")
    message: Optional[str] = Field(None, max_length=500, description="Mensagem para o usuário")


class KYCListFilters(BaseModel):
    """Filtros para listagem de KYCs (admin)"""
    status: Optional[KYCStatusEnum] = None
    level: Optional[KYCLevelEnum] = None
    search: Optional[str] = Field(None, max_length=100, description="Busca por nome/email")
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class KYCDocumentResponse(BaseModel):
    """Resposta de documento KYC"""
    id: uuid.UUID
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    original_name: str
    mime_type: str
    file_size: int
    uploaded_at: datetime
    
    # Análise (quando disponível)
    ocr_processed: bool = False
    ocr_confidence: Optional[float] = None
    face_match_score: Optional[float] = None
    liveness_passed: Optional[bool] = None
    
    rejection_reason: Optional[str] = None
    
    class Config:
        from_attributes = True


class KYCPersonalDataResponse(BaseModel):
    """Resposta de dados pessoais (parcialmente mascarados)"""
    id: uuid.UUID
    full_name: str
    social_name: Optional[str] = None
    birth_date: date
    nationality: str
    
    # Documento (mascarado)
    document_type: str
    document_number_masked: str  # ***.***.789-00
    
    # Endereço (parcial)
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "BR"
    
    # Contato (mascarado)
    phone_masked: Optional[str] = None  # (**) *****-1234
    email: Optional[str] = None
    
    # Financeiro
    occupation: Optional[str] = None
    monthly_income: Optional[str] = None
    
    # Compliance
    pep: bool = False
    fatca: bool = False
    
    # Validações
    cpf_validated: bool = False
    name_similarity_score: Optional[float] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class KYCVerificationResponse(BaseModel):
    """Resposta de verificação KYC"""
    id: uuid.UUID
    user_id: uuid.UUID
    status: KYCStatusEnum
    level: KYCLevelEnum
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    expiration_date: Optional[date] = None
    
    # Análise
    auto_approved: bool = False
    risk_score: Optional[float] = None
    
    # Rejeição
    rejection_reason: Optional[str] = None
    
    # Documentos solicitados
    requested_documents: Optional[List[str]] = None
    
    # Dados relacionados
    personal_data: Optional[KYCPersonalDataResponse] = None
    documents: List[KYCDocumentResponse] = []
    
    # Consentimento
    consent_given: bool = False
    consent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class KYCStatusResponse(BaseModel):
    """Status simplificado do KYC para o usuário"""
    has_kyc: bool
    status: KYCStatusEnum
    level: KYCLevelEnum
    is_verified: bool
    
    # Progresso
    personal_data_complete: bool = False
    documents_uploaded: int = 0
    documents_required: int = 0
    documents_approved: int = 0
    
    # Campos adicionais para frontend
    consent_given: bool = False
    documents: List[Dict[str, Any]] = []
    
    # Próximos passos
    next_steps: List[str] = []
    
    # Se rejeitado
    rejection_reason: Optional[str] = None
    requested_documents: Optional[List[str]] = None
    
    # Expiração
    expires_at: Optional[date] = None
    days_until_expiration: Optional[int] = None
    
    # Verificação atual
    verification_id: Optional[uuid.UUID] = None


class KYCRequirementsResponse(BaseModel):
    """Requisitos para um nível de KYC"""
    level: KYCLevelEnum
    name: str
    description: str
    
    # Documentos necessários
    required_documents: List[Dict[str, str]]
    
    # Dados necessários
    required_fields: List[str]
    
    # Benefícios
    benefits: List[str]
    
    # Limites
    limits: Dict[str, Dict[str, Any]]


# ============================================================
# ADMIN RESPONSE SCHEMAS
# ============================================================

class KYCAdminDetailResponse(KYCVerificationResponse):
    """Detalhes completos do KYC para admin"""
    # Usuário
    user_email: str
    user_username: str
    user_created_at: datetime
    
    # Dados pessoais completos (não mascarados - admin only)
    personal_data_full: Optional[Dict[str, Any]] = None
    
    # Análise automática
    auto_analysis_result: Optional[Dict[str, Any]] = None
    risk_factors: Optional[List[str]] = None
    
    # Histórico
    audit_logs: List[Dict[str, Any]] = []
    
    # Admin info
    reviewed_by_email: Optional[str] = None
    admin_notes: Optional[str] = None


class KYCAdminListResponse(BaseModel):
    """Lista de KYCs para admin"""
    items: List[KYCAdminDetailResponse]
    total: int
    page: int
    per_page: int
    pages: int


class KYCStatsResponse(BaseModel):
    """Estatísticas de KYC para dashboard admin"""
    # Totais
    total_verifications: int
    
    # Por status
    pending: int
    submitted: int
    under_review: int
    approved: int
    rejected: int
    expired: int
    
    # Por nível (aprovados)
    basic_approved: int
    intermediate_approved: int
    advanced_approved: int
    
    # Métricas
    auto_approval_rate: float  # Porcentagem de auto-aprovações
    avg_review_time_hours: float  # Tempo médio de revisão
    rejection_rate: float  # Taxa de rejeição
    
    # Hoje
    submitted_today: int
    approved_today: int
    rejected_today: int
    
    # Esta semana
    submitted_this_week: int
    approved_this_week: int


# ============================================================
# SERVICE LIMIT SCHEMAS
# ============================================================

class KYCServiceLimitResponse(BaseModel):
    """Limite de serviço por nível KYC"""
    service_name: str
    kyc_level: KYCLevelEnum
    daily_limit: Optional[Decimal] = None
    monthly_limit: Optional[Decimal] = None
    per_operation_limit: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class KYCLimitCheckResponse(BaseModel):
    """Resultado da verificação de limite"""
    allowed: bool
    kyc_level: KYCLevelEnum
    service: str
    
    # Limites
    daily_limit: Optional[Decimal] = None
    monthly_limit: Optional[Decimal] = None
    per_operation_limit: Optional[Decimal] = None
    
    # Uso atual
    daily_used: Decimal = Decimal("0")
    monthly_used: Decimal = Decimal("0")
    
    # Disponível
    daily_available: Optional[Decimal] = None
    monthly_available: Optional[Decimal] = None
    
    # Se não permitido
    reason: Optional[str] = None
    required_level: Optional[KYCLevelEnum] = None
    redirect_url: str = "/kyc"


# ============================================================
# WEBHOOK / NOTIFICATION SCHEMAS
# ============================================================

class KYCWebhookPayload(BaseModel):
    """Payload para webhooks de KYC"""
    event: str  # kyc.approved, kyc.rejected, etc
    verification_id: uuid.UUID
    user_id: uuid.UUID
    status: KYCStatusEnum
    level: KYCLevelEnum
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
