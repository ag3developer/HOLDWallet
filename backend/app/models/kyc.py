"""
🔐 KYC (Know Your Customer) Models
==================================
Modelos para verificação de identidade e compliance (BACEN, CVM, LGPD, AML/CFT)

Tabelas:
- KYCVerification: Verificação principal do usuário
- KYCPersonalData: Dados pessoais (criptografados)
- KYCDocument: Documentos enviados (S3)
- KYCAuditLog: Trilha de auditoria

Author: HOLD Wallet Team
"""

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, 
    ForeignKey, Enum, Numeric, Date, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, date
from typing import Optional, List
import uuid
import enum

from app.core.db import Base
from app.core.uuid_type import UUID


# ============================================================
# ENUMS
# ============================================================

class KYCStatus(str, enum.Enum):
    """Status da verificação KYC"""
    PENDING = "pending"                 # Iniciado, aguardando dados
    SUBMITTED = "submitted"             # Submetido para análise
    UNDER_REVIEW = "under_review"       # Em análise manual
    APPROVED = "approved"               # Aprovado
    REJECTED = "rejected"               # Rejeitado
    EXPIRED = "expired"                 # Expirado (precisa renovar)
    DOCUMENTS_REQUESTED = "documents_requested"  # Documentos adicionais solicitados


class KYCLevel(str, enum.Enum):
    """Níveis de verificação KYC"""
    NONE = "none"                       # Sem verificação
    BASIC = "basic"                     # Básico: Selfie
    INTERMEDIATE = "intermediate"       # Intermediário: Selfie + RG/CNH
    ADVANCED = "advanced"               # Avançado: + Comprovantes
    PREMIUM = "premium"                 # Premium: Verificação completa


class DocumentType(str, enum.Enum):
    """Tipos de documentos aceitos"""
    # Documentos de identidade
    IDENTITY_FRONT = "identity_front"   # RG/CNH frente (genérico)
    IDENTITY_BACK = "identity_back"     # RG/CNH verso (genérico)
    CNH_FRONT = "cnh_front"             # CNH frente
    CNH_BACK = "cnh_back"               # CNH verso
    RG_FRONT = "rg_front"               # RG frente
    RG_BACK = "rg_back"                 # RG verso
    CPF_PHOTO = "cpf_photo"             # Foto do CPF
    PASSPORT = "passport"               # Passaporte
    # Selfies
    SELFIE = "selfie"                   # Selfie simples
    SELFIE_WITH_DOCUMENT = "selfie_with_document"  # Selfie com documento
    SELFIE_LIVENESS = "selfie_liveness" # Selfie com prova de vida
    # Comprovantes
    ADDRESS_PROOF = "address_proof"     # Comprovante de endereço
    PROOF_OF_ADDRESS = "proof_of_address"  # Comprovante de endereço (alias)
    INCOME_PROOF = "income_proof"       # Comprovante de renda
    PROOF_OF_INCOME = "proof_of_income" # Comprovante de renda (alias)
    # Outros
    OTHER = "other"                     # Outro documento


class DocumentStatus(str, enum.Enum):
    """Status do documento"""
    PENDING = "pending"                 # Aguardando análise
    APPROVED = "approved"               # Aprovado
    REJECTED = "rejected"               # Rejeitado
    EXPIRED = "expired"                 # Expirado


class AuditAction(str, enum.Enum):
    """Ações auditadas"""
    VERIFICATION_STARTED = "verification_started"
    PERSONAL_DATA_SUBMITTED = "personal_data_submitted"
    PERSONAL_DATA_UPDATED = "personal_data_updated"
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_DELETED = "document_deleted"
    DOCUMENT_VIEWED = "document_viewed"
    SUBMITTED_FOR_REVIEW = "submitted_for_review"
    AUTO_APPROVED = "auto_approved"
    MANUALLY_APPROVED = "manually_approved"
    REJECTED = "rejected"
    DOCUMENTS_REQUESTED = "documents_requested"
    DATA_EXPORTED = "data_exported"
    CPF_VALIDATED = "cpf_validated"
    FACE_COMPARED = "face_compared"


class ActorType(str, enum.Enum):
    """Tipo de ator que executou a ação"""
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"


# ============================================================
# MODELS
# ============================================================

class KYCVerification(Base):
    """
    Verificação KYC principal do usuário.
    Um usuário pode ter múltiplas verificações (histórico).
    """
    __tablename__ = "kyc_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Status e Nível
    status = Column(
        String(30),
        default=KYCStatus.PENDING.value,
        nullable=False,
        index=True
    )
    level = Column(
        String(30),
        default=KYCLevel.BASIC.value,
        nullable=False
    )
    
    # Timestamps de processo
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    
    # Revisão
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    rejection_details = Column(JSON, nullable=True)  # Detalhes estruturados
    admin_notes = Column(Text, nullable=True)  # Notas internas do admin
    
    # Análise automática
    auto_approved = Column(Boolean, default=False, nullable=False)
    auto_analysis_result = Column(JSON, nullable=True)  # Resultado da análise automática
    
    # Score de risco (0.00 a 100.00)
    risk_score = Column(Numeric(5, 2), nullable=True)
    risk_factors = Column(JSON, nullable=True)  # Fatores que compõem o score
    
    # Validade
    expiration_date = Column(Date, nullable=True)
    
    # Consentimento LGPD
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime, nullable=True)
    consent_ip = Column(String(45), nullable=True)  # IPv4 ou IPv6
    consent_user_agent = Column(Text, nullable=True)
    
    # Documentos solicitados (quando status = documents_requested)
    requested_documents = Column(JSON, nullable=True)  # Lista de tipos de docs
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="kyc_verifications")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    personal_data = relationship("KYCPersonalData", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    documents = relationship("KYCDocument", back_populates="verification", cascade="all, delete-orphan")
    audit_logs = relationship("KYCAuditLog", back_populates="verification", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<KYCVerification(id={self.id}, user_id={self.user_id}, status={self.status}, level={self.level})>"
    
    @property
    def is_approved(self) -> bool:
        return self.status == KYCStatus.APPROVED
    
    @property
    def is_pending(self) -> bool:
        return self.status in [KYCStatus.PENDING, KYCStatus.SUBMITTED, KYCStatus.UNDER_REVIEW]
    
    @property
    def is_expired(self) -> bool:
        if self.expiration_date:
            return date.today() > self.expiration_date
        return False


class KYCPersonalData(Base):
    """
    Dados pessoais do usuário para KYC.
    Dados sensíveis são criptografados (CPF, RG, telefone, endereço).
    """
    __tablename__ = "kyc_personal_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("kyc_verifications.id"), nullable=False, unique=True)
    
    # ========== DADOS PESSOAIS ==========
    full_name = Column(String(255), nullable=False)
    social_name = Column(String(255), nullable=True)  # Nome social (se diferente)
    birth_date = Column(Date, nullable=False)
    nationality = Column(String(2), default="BR", nullable=False)  # ISO 3166-1 alpha-2
    gender = Column(String(20), nullable=True)  # male, female, other, prefer_not_say
    mother_name = Column(String(255), nullable=True)  # Nome da mãe (para validação)
    
    # ========== DOCUMENTOS (CRIPTOGRAFADOS) ==========
    document_type = Column(String(20), nullable=False)  # cpf, rg, cnh, passport
    document_number = Column(String(500), nullable=False)  # CPF criptografado
    rg_number = Column(String(500), nullable=True)  # RG criptografado
    rg_issuer = Column(String(50), nullable=True)  # Órgão emissor (SSP, DETRAN, etc)
    rg_state = Column(String(2), nullable=True)  # UF do RG
    
    # ========== ENDEREÇO (CRIPTOGRAFADOS) ==========
    zip_code = Column(String(200), nullable=True)  # CEP criptografado
    street = Column(String(500), nullable=True)  # Rua criptografada
    number = Column(String(100), nullable=True)  # Número criptografado
    complement = Column(String(300), nullable=True)  # Complemento criptografado
    neighborhood = Column(String(300), nullable=True)  # Bairro criptografado
    city = Column(String(200), nullable=True)
    state = Column(String(2), nullable=True)  # UF
    country = Column(String(2), default="BR", nullable=True)  # ISO 3166-1 alpha-2
    
    # ========== CONTATO (CRIPTOGRAFADOS) ==========
    phone = Column(String(300), nullable=True)  # Telefone criptografado
    phone_verified = Column(Boolean, default=False)
    email = Column(String(255), nullable=True)  # Email (pode ser diferente do login)
    
    # ========== FINANCEIRO ==========
    occupation = Column(String(255), nullable=True)  # Profissão
    employer = Column(String(255), nullable=True)  # Empregador
    monthly_income = Column(String(50), nullable=True)  # Faixa de renda
    source_of_funds = Column(String(100), nullable=True)  # Origem dos recursos
    
    # ========== COMPLIANCE ==========
    pep = Column(Boolean, default=False, nullable=False)  # Pessoa Politicamente Exposta
    pep_relationship = Column(String(255), nullable=True)  # Relacionamento com PEP
    fatca = Column(Boolean, default=False, nullable=False)  # Cidadão/residente EUA
    fatca_tin = Column(String(300), nullable=True)  # Tax ID Number (criptografado)
    
    # ========== VALIDAÇÕES EXTERNAS ==========
    cpf_validated = Column(Boolean, default=False)
    cpf_validation_date = Column(DateTime, nullable=True)
    cpf_validation_source = Column(String(50), nullable=True)  # serpro, bigdata, etc
    serpro_data = Column(Text, nullable=True)  # JSON criptografado com resposta SERPRO
    
    # Nome similarity score (comparação com SERPRO)
    name_similarity_score = Column(Numeric(5, 4), nullable=True)  # 0.0000 a 1.0000
    birth_date_matches = Column(Boolean, nullable=True)
    cpf_situation = Column(String(50), nullable=True)  # regular, irregular, etc
    
    # ========== TIMESTAMPS ==========
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    verification = relationship("KYCVerification", back_populates="personal_data")

    def __repr__(self):
        return f"<KYCPersonalData(id={self.id}, verification_id={self.verification_id}, name={self.full_name})>"


class KYCDocument(Base):
    """
    Documento enviado pelo usuário para verificação KYC.
    Arquivos são armazenados no S3 (bucket privado, criptografado).
    """
    __tablename__ = "kyc_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("kyc_verifications.id"), nullable=False, index=True)
    
    # Tipo e Status
    document_type = Column(
        String(50),
        nullable=False
    )
    status = Column(
        String(30),
        default=DocumentStatus.PENDING.value,
        nullable=False
    )
    
    # Arquivo
    s3_key = Column(String(500), nullable=False)  # Caminho no S3
    s3_bucket = Column(String(100), nullable=True)  # Nome do bucket S3
    file_hash = Column(String(64), nullable=False)  # SHA-256 do arquivo
    original_name = Column(String(255), nullable=False)  # Nome original
    mime_type = Column(String(100), nullable=False)  # image/jpeg, application/pdf, etc
    file_size = Column(Integer, nullable=False)  # Tamanho em bytes
    
    # Análise do documento
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)  # Admin que revisou
    reviewed_at = Column(DateTime, nullable=True)
    
    # ========== OCR (AWS Textract) ==========
    ocr_processed = Column(Boolean, default=False)
    ocr_data = Column(JSON, nullable=True)  # Dados extraídos pelo OCR
    ocr_confidence = Column(Numeric(5, 2), nullable=True)  # Confiança média (0-100)
    
    # Dados extraídos do OCR (para comparação)
    extracted_name = Column(String(255), nullable=True)
    extracted_cpf = Column(String(20), nullable=True)
    extracted_birth_date = Column(Date, nullable=True)
    
    # ========== FACE MATCH (AWS Rekognition) ==========
    face_detected = Column(Boolean, nullable=True)
    face_count = Column(Integer, nullable=True)  # Quantas faces detectadas
    face_match_score = Column(Numeric(5, 2), nullable=True)  # Similaridade (0-100)
    face_reference_doc_id = Column(UUID(as_uuid=True), nullable=True)  # Documento comparado
    
    # ========== LIVENESS DETECTION ==========
    liveness_passed = Column(Boolean, nullable=True)
    liveness_score = Column(Numeric(5, 2), nullable=True)
    
    # ========== ANTI-FRAUD ==========
    is_screenshot = Column(Boolean, nullable=True)  # Detectou captura de tela
    is_photo_of_photo = Column(Boolean, nullable=True)  # Foto de foto
    fraud_indicators = Column(JSON, nullable=True)  # Indicadores de fraude
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    verification = relationship("KYCVerification", back_populates="documents")

    def __repr__(self):
        return f"<KYCDocument(id={self.id}, type={self.document_type}, status={self.status})>"
    
    @property
    def is_image(self) -> bool:
        return self.mime_type.startswith("image/")
    
    @property
    def is_pdf(self) -> bool:
        return self.mime_type == "application/pdf"


class KYCAuditLog(Base):
    """
    Trilha de auditoria para compliance LGPD/BACEN.
    Registra todas as ações relacionadas ao KYC.
    """
    __tablename__ = "kyc_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("kyc_verifications.id"), nullable=False, index=True)
    
    # Ator
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Null para system
    actor_type = Column(
        String(30),
        nullable=False
    )
    
    # Ação
    action = Column(
        String(50),
        nullable=False,
        index=True
    )
    
    # Status antes/depois
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    
    # Detalhes da ação
    details = Column(JSON, nullable=True)  # Detalhes específicos da ação
    
    # Contexto
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    verification = relationship("KYCVerification", back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<KYCAuditLog(id={self.id}, action={self.action}, actor_type={self.actor_type})>"


# ============================================================
# TABELA DE LIMITES POR NÍVEL KYC
# ============================================================

class KYCServiceLimit(Base):
    """
    Limites de operação por serviço e nível KYC.
    Configurável pelo admin.
    """
    __tablename__ = "kyc_service_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Serviço e Nível
    service_name = Column(String(50), nullable=False, index=True)  # instant_trade, p2p, withdraw, etc
    kyc_level = Column(
        String(30),
        nullable=False
    )
    
    # Limites
    daily_limit = Column(Numeric(18, 2), nullable=True)  # Limite diário em BRL
    monthly_limit = Column(Numeric(18, 2), nullable=True)  # Limite mensal em BRL
    per_operation_limit = Column(Numeric(18, 2), nullable=True)  # Limite por operação em BRL
    
    # Ativo
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<KYCServiceLimit(service={self.service_name}, level={self.kyc_level})>"


# ============================================================
# LIMITES PERSONALIZADOS POR USUÁRIO
# ============================================================

class UserCustomLimit(Base):
    """
    Limites personalizados por usuário.
    Permite que admins configurem limites específicos para usuários individuais,
    sobrescrevendo os limites padrão do nível KYC.
    """
    __tablename__ = "user_custom_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Serviço
    service_name = Column(String(50), nullable=False)  # instant_trade, p2p, withdraw, pix, wolkpay, etc
    
    # Limites personalizados (null = usa limite padrão do KYC)
    daily_limit = Column(Numeric(18, 2), nullable=True)
    monthly_limit = Column(Numeric(18, 2), nullable=True)
    per_operation_limit = Column(Numeric(18, 2), nullable=True)
    
    # Controle de acesso ao serviço
    is_enabled = Column(Boolean, default=True, nullable=False)  # Permite ou bloqueia o serviço
    requires_approval = Column(Boolean, default=False, nullable=False)  # Requer aprovação manual para cada operação
    
    # Motivo/Notas
    reason = Column(Text, nullable=True)  # Motivo da personalização
    admin_notes = Column(Text, nullable=True)
    
    # Auditoria
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Limites temporários
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="custom_limits")
    created_by_admin = relationship("User", foreign_keys=[created_by])
    updated_by_admin = relationship("User", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<UserCustomLimit(user_id={self.user_id}, service={self.service_name})>"

    @property
    def is_expired(self) -> bool:
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False


class UserServiceAccess(Base):
    """
    Controle de acesso a serviços por usuário.
    Permite bloquear ou liberar serviços específicos independente do nível KYC.
    """
    __tablename__ = "user_service_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Serviço
    service_name = Column(String(50), nullable=False)  # instant_trade, p2p, withdraw, pix, wolkpay, etc
    
    # Acesso
    is_allowed = Column(Boolean, default=True, nullable=False)
    
    # Motivo
    reason = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    # Auditoria
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    blocked_until = Column(DateTime, nullable=True)  # Bloqueio temporário
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="service_access")
    created_by_admin = relationship("User", foreign_keys=[created_by])
    updated_by_admin = relationship("User", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<UserServiceAccess(user_id={self.user_id}, service={self.service_name}, allowed={self.is_allowed})>"


# ============================================================
# ÍNDICES COMPOSTOS (para performance)
# ============================================================
from sqlalchemy import Index

# Índice para buscar verificações por usuário e status
Index('ix_kyc_verifications_user_status', KYCVerification.user_id, KYCVerification.status)

# Índice para limites personalizados por usuário
Index('ix_user_custom_limits_user_service', UserCustomLimit.user_id, UserCustomLimit.service_name, unique=True)

# Índice para acesso a serviços por usuário
Index('ix_user_service_access_user_service', UserServiceAccess.user_id, UserServiceAccess.service_name, unique=True)

# Índice para buscar documentos por verificação e tipo
Index('ix_kyc_documents_verification_type', KYCDocument.verification_id, KYCDocument.document_type)

# Índice para auditoria por data
Index('ix_kyc_audit_logs_created', KYCAuditLog.created_at.desc())

# Índice para limites por serviço
Index('ix_kyc_service_limits_service_level', KYCServiceLimit.service_name, KYCServiceLimit.kyc_level, unique=True)
