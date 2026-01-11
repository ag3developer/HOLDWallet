"""
🔐 KYC Service - Main Business Logic
=====================================
Serviço principal para gerenciamento de verificações KYC.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import logging

from app.models.kyc import (
    KYCVerification, KYCPersonalData, KYCDocument, KYCAuditLog,
    KYCServiceLimit, KYCStatus, KYCLevel, DocumentType, DocumentStatus,
    AuditAction, ActorType
)
from app.models.user import User
from app.schemas.kyc import (
    KYCStartRequest, KYCPersonalDataRequest, KYCStatusResponse,
    KYCVerificationResponse, KYCDocumentResponse, KYCPersonalDataResponse,
    KYCRequirementsResponse, KYCStatsResponse, KYCLimitCheckResponse,
    KYCLevelEnum, KYCStatusEnum, DocumentTypeEnum
)
from app.services.encryption_service import (
    encryption_service, encrypt_personal_data, decrypt_personal_data,
    KYC_ENCRYPTED_FIELDS
)
from app.services.s3_service import s3_service

logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURAÇÕES DE NÍVEIS KYC
# ============================================================

KYC_LEVEL_ORDER = {
    KYCLevel.NONE: 0,
    KYCLevel.BASIC: 1,
    KYCLevel.INTERMEDIATE: 2,
    KYCLevel.ADVANCED: 3,
    KYCLevel.PREMIUM: 4,
}

KYC_LEVEL_REQUIREMENTS = {
    KYCLevel.BASIC: {
        "name": "Básico",
        "description": "Verificação básica com selfie",
        "required_documents": [
            {"type": DocumentType.SELFIE, "name": "Selfie", "description": "Foto do seu rosto"}
        ],
        "required_fields": ["full_name", "birth_date", "document_number"],
        "benefits": [
            "Instant Trade até R$ 10.000/mês",
            "P2P até R$ 50.000/mês",
            "Saque crypto até R$ 10.000/dia",
        ],
        "expiration_months": 24,
    },
    KYCLevel.INTERMEDIATE: {
        "name": "Intermediário",
        "description": "Verificação com documento de identidade",
        "required_documents": [
            {"type": DocumentType.SELFIE, "name": "Selfie", "description": "Foto do seu rosto"},
            {"type": DocumentType.IDENTITY_FRONT, "name": "RG/CNH Frente", "description": "Frente do documento"},
            {"type": DocumentType.IDENTITY_BACK, "name": "RG/CNH Verso", "description": "Verso do documento"},
        ],
        "required_fields": [
            "full_name", "birth_date", "document_number", "rg_number",
            "phone", "zip_code", "street", "number", "city", "state"
        ],
        "benefits": [
            "WolkPay até R$ 15.000/operação",
            "Saque PIX/TED até R$ 10.000/dia",
            "Transferência interna até R$ 50.000/dia",
        ],
        "expiration_months": 24,
    },
    KYCLevel.ADVANCED: {
        "name": "Avançado",
        "description": "Verificação completa com comprovantes",
        "required_documents": [
            {"type": DocumentType.SELFIE, "name": "Selfie", "description": "Foto do seu rosto"},
            {"type": DocumentType.IDENTITY_FRONT, "name": "RG/CNH Frente", "description": "Frente do documento"},
            {"type": DocumentType.IDENTITY_BACK, "name": "RG/CNH Verso", "description": "Verso do documento"},
            {"type": DocumentType.ADDRESS_PROOF, "name": "Comprovante de Endereço", "description": "Documento com até 3 meses"},
            {"type": DocumentType.INCOME_PROOF, "name": "Comprovante de Renda", "description": "Holerite, IR ou extrato"},
        ],
        "required_fields": [
            "full_name", "birth_date", "document_number", "rg_number",
            "phone", "zip_code", "street", "number", "city", "state",
            "occupation", "monthly_income", "source_of_funds"
        ],
        "benefits": [
            "Instant Trade até R$ 300.000/mês",
            "WolkPay até R$ 50.000/operação",
            "P2P sem limite",
            "Saque crypto até R$ 100.000/dia",
            "Saque PIX/TED até R$ 100.000/dia",
        ],
        "expiration_months": 12,
    },
}

# Limites padrão por serviço e nível
DEFAULT_SERVICE_LIMITS = {
    "instant_trade": {
        KYCLevel.NONE: {"daily": 0, "monthly": 0, "per_op": 0},
        KYCLevel.BASIC: {"daily": 5000, "monthly": 10000, "per_op": 5000},
        KYCLevel.INTERMEDIATE: {"daily": 20000, "monthly": 50000, "per_op": 20000},
        KYCLevel.ADVANCED: {"daily": 100000, "monthly": 300000, "per_op": 100000},
    },
    "p2p": {
        KYCLevel.NONE: {"daily": 500, "monthly": 500, "per_op": 500},
        KYCLevel.BASIC: {"daily": 10000, "monthly": 50000, "per_op": 10000},
        KYCLevel.INTERMEDIATE: {"daily": 50000, "monthly": 200000, "per_op": 50000},
        KYCLevel.ADVANCED: {"daily": None, "monthly": None, "per_op": None},  # Sem limite
    },
    "withdraw_crypto": {
        KYCLevel.NONE: {"daily": 1000, "monthly": 5000, "per_op": 1000},
        KYCLevel.BASIC: {"daily": 10000, "monthly": 100000, "per_op": 10000},
        KYCLevel.INTERMEDIATE: {"daily": 50000, "monthly": 500000, "per_op": 50000},
        KYCLevel.ADVANCED: {"daily": 100000, "monthly": None, "per_op": 100000},
    },
    "withdraw_fiat": {
        KYCLevel.NONE: {"daily": 0, "monthly": 0, "per_op": 0},
        KYCLevel.BASIC: {"daily": 0, "monthly": 0, "per_op": 0},
        KYCLevel.INTERMEDIATE: {"daily": 10000, "monthly": 100000, "per_op": 10000},
        KYCLevel.ADVANCED: {"daily": 100000, "monthly": None, "per_op": 100000},
    },
    "wolkpay": {
        KYCLevel.NONE: {"daily": 0, "monthly": 0, "per_op": 0},
        KYCLevel.BASIC: {"daily": 0, "monthly": 0, "per_op": 0},
        KYCLevel.INTERMEDIATE: {"daily": 15000, "monthly": 100000, "per_op": 15000},
        KYCLevel.ADVANCED: {"daily": 50000, "monthly": 500000, "per_op": 50000},
    },
}


class KYCService:
    """
    Serviço principal de KYC.
    Gerencia verificações, documentos e análises.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================
    # CRIAÇÃO E CONSULTA
    # ============================================================
    
    async def create_verification(
        self,
        user_id: uuid.UUID,
        level: KYCLevel,
        consent: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCVerification:
        """
        Cria uma nova verificação KYC para o usuário.
        """
        if not consent:
            raise ValueError("Consentimento LGPD é obrigatório")
        
        # Verifica se já existe verificação ativa
        existing = self.db.query(KYCVerification).filter(
            KYCVerification.user_id == user_id,
            KYCVerification.status.in_([
                KYCStatus.PENDING, KYCStatus.SUBMITTED, KYCStatus.UNDER_REVIEW
            ])
        ).first()
        
        if existing:
            raise ValueError("Já existe uma verificação KYC em andamento")
        
        # Cria a verificação
        verification = KYCVerification(
            user_id=user_id,
            level=level,
            status=KYCStatus.PENDING,
            consent_given=True,
            consent_at=datetime.utcnow(),
            consent_ip=ip_address,
            consent_user_agent=user_agent,
        )
        
        self.db.add(verification)
        self.db.commit()
        self.db.refresh(verification)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification.id,
            actor_id=user_id,
            actor_type=ActorType.USER,
            action=AuditAction.VERIFICATION_STARTED,
            details={"level": level.value},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"✅ KYC verification created: {verification.id} for user {user_id}")
        return verification
    
    async def get_active_verification(self, user_id: uuid.UUID) -> Optional[KYCVerification]:
        """
        Obtém a verificação KYC ativa do usuário.
        Prioriza: aprovada > em andamento > mais recente
        """
        # Primeiro busca aprovada
        approved = self.db.query(KYCVerification).filter(
            KYCVerification.user_id == user_id,
            KYCVerification.status == KYCStatus.APPROVED.value
        ).order_by(desc(KYCVerification.approved_at)).first()
        
        if approved:
            # Verifica se não expirou
            if not approved.is_expired:
                return approved
        
        # Busca em andamento
        pending = self.db.query(KYCVerification).filter(
            KYCVerification.user_id == user_id,
            KYCVerification.status.in_([
                KYCStatus.PENDING, KYCStatus.SUBMITTED, 
                KYCStatus.UNDER_REVIEW, KYCStatus.DOCUMENTS_REQUESTED
            ])
        ).order_by(desc(KYCVerification.created_at)).first()
        
        if pending:
            return pending
        
        # Retorna a mais recente (mesmo rejeitada/expirada)
        return self.db.query(KYCVerification).filter(
            KYCVerification.user_id == user_id
        ).order_by(desc(KYCVerification.created_at)).first()
    
    async def get_user_kyc_level(self, user_id: uuid.UUID) -> KYCLevel:
        """
        Obtém o nível KYC atual do usuário.
        """
        verification = await self.get_active_verification(user_id)
        
        if verification and verification.status == KYCStatus.APPROVED and not verification.is_expired:
            return verification.level
        
        return KYCLevel.NONE
    
    async def get_verification_by_id(self, verification_id: uuid.UUID) -> Optional[KYCVerification]:
        """Obtém verificação por ID"""
        return self.db.query(KYCVerification).filter(
            KYCVerification.id == verification_id
        ).first()
    
    async def get_verification_by_user(self, user_id: uuid.UUID) -> Optional[KYCVerification]:
        """
        Obtém a verificação ativa mais recente do usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Verificação KYC ativa ou None
        """
        return self.db.query(KYCVerification).filter(
            KYCVerification.user_id == user_id
        ).order_by(KYCVerification.created_at.desc()).first()
    
    # ============================================================
    # DADOS PESSOAIS
    # ============================================================
    
    async def save_personal_data(
        self,
        verification_id: uuid.UUID,
        data: KYCPersonalDataRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCPersonalData:
        """
        Salva dados pessoais do usuário (criptografados).
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        if verification.status not in [KYCStatus.PENDING, KYCStatus.DOCUMENTS_REQUESTED]:
            raise ValueError("Verificação não está em estado que permite alteração")
        
        # Converte para dict e criptografa campos sensíveis
        data_dict = data.model_dump()
        encrypted_data = encrypt_personal_data(data_dict)
        
        # Verifica se já existe dados pessoais
        existing = self.db.query(KYCPersonalData).filter(
            KYCPersonalData.verification_id == verification_id
        ).first()
        
        is_update = existing is not None
        
        if existing:
            # Atualiza existente
            for key, value in encrypted_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            personal_data = existing
        else:
            # Cria novo
            personal_data = KYCPersonalData(
                verification_id=verification_id,
                **encrypted_data
            )
            self.db.add(personal_data)
        
        self.db.commit()
        self.db.refresh(personal_data)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=verification.user_id,
            actor_type=ActorType.USER,
            action=AuditAction.PERSONAL_DATA_UPDATED if is_update else AuditAction.PERSONAL_DATA_SUBMITTED,
            details={"fields_updated": list(data_dict.keys())},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"✅ Personal data {'updated' if is_update else 'saved'} for verification {verification_id}")
        return personal_data
    
    async def get_personal_data(
        self,
        verification_id: uuid.UUID,
        decrypt: bool = False
    ) -> Optional[KYCPersonalData]:
        """
        Obtém dados pessoais. Por padrão retorna criptografados.
        """
        data = self.db.query(KYCPersonalData).filter(
            KYCPersonalData.verification_id == verification_id
        ).first()
        
        # Se precisa descriptografar (apenas para admin ou exportação)
        if data and decrypt:
            # Descriptografa em memória (não altera o banco)
            for field in KYC_ENCRYPTED_FIELDS:
                if hasattr(data, field) and getattr(data, field):
                    try:
                        decrypted = encryption_service.decrypt(getattr(data, field))
                        setattr(data, f"_{field}_decrypted", decrypted)
                    except Exception:
                        pass
        
        return data
    
    # ============================================================
    # DOCUMENTOS
    # ============================================================
    
    async def upload_document(
        self,
        verification_id: uuid.UUID,
        file,
        document_type: DocumentType,
        original_filename: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCDocument:
        """
        Faz upload de um documento para o KYC.
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        if verification.status not in [KYCStatus.PENDING, KYCStatus.DOCUMENTS_REQUESTED]:
            raise ValueError("Verificação não aceita novos documentos")
        
        # Verifica se já existe documento desse tipo
        existing = self.db.query(KYCDocument).filter(
            KYCDocument.verification_id == verification_id,
            KYCDocument.document_type == document_type
        ).first()
        
        if existing:
            # Remove o anterior
            await self.delete_document(existing.id)
        
        # Upload para S3
        upload_result = await s3_service.upload_file(
            file=file,
            user_id=str(verification.user_id),
            verification_id=str(verification_id),
            document_type=document_type.value,
            original_filename=original_filename
        )
        
        # Cria registro do documento
        document = KYCDocument(
            verification_id=verification_id,
            document_type=document_type,
            status=DocumentStatus.PENDING,
            file_path=upload_result["file_path"],
            file_hash=upload_result["file_hash"],
            file_size=upload_result["file_size"],
            mime_type=upload_result["mime_type"],
            original_name=upload_result["original_name"],
        )
        
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=verification.user_id,
            actor_type=ActorType.USER,
            action=AuditAction.DOCUMENT_UPLOADED,
            details={
                "document_type": document_type.value,
                "file_hash": upload_result["file_hash"],
                "file_size": upload_result["file_size"],
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"✅ Document uploaded: {document.id} ({document_type.value})")
        return document
    
    async def delete_document(
        self,
        document_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Remove um documento do KYC.
        """
        document = self.db.query(KYCDocument).filter(
            KYCDocument.id == document_id
        ).first()
        
        if not document:
            return False
        
        verification = await self.get_verification_by_id(document.verification_id)
        
        # Remove do S3
        await s3_service.delete_file(document.file_path)
        
        # Remove do banco
        self.db.delete(document)
        self.db.commit()
        
        # Audit log
        if verification:
            await self._create_audit_log(
                verification_id=verification.id,
                actor_id=verification.user_id,
                actor_type=ActorType.USER,
                action=AuditAction.DOCUMENT_DELETED,
                details={"document_type": document.document_type.value},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        logger.info(f"✅ Document deleted: {document_id}")
        return True
    
    async def get_document_url(self, document_id: uuid.UUID, expires_in: int = 3600) -> str:
        """
        Obtém URL pré-assinada para visualização do documento.
        """
        document = self.db.query(KYCDocument).filter(
            KYCDocument.id == document_id
        ).first()
        
        if not document:
            raise ValueError("Documento não encontrado")
        
        return await s3_service.get_presigned_url(
            document.file_path,
            expires_in=expires_in,
            response_content_type=document.mime_type
        )
    
    # ============================================================
    # SUBMISSÃO E ANÁLISE
    # ============================================================
    
    async def submit_for_review(
        self,
        verification_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCVerification:
        """
        Submete o KYC para análise.
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        if verification.status not in [KYCStatus.PENDING, KYCStatus.DOCUMENTS_REQUESTED]:
            raise ValueError("Verificação não pode ser submetida neste estado")
        
        # Valida se tem dados pessoais
        personal_data = await self.get_personal_data(verification_id)
        if not personal_data:
            raise ValueError("Dados pessoais não preenchidos")
        
        # Valida documentos necessários
        level_config = KYC_LEVEL_REQUIREMENTS.get(verification.level)
        if level_config:
            required_docs = {doc["type"] for doc in level_config["required_documents"]}
            uploaded_docs = {doc.document_type for doc in verification.documents}
            
            missing = required_docs - uploaded_docs
            if missing:
                missing_names = [d.value for d in missing]
                raise ValueError(f"Documentos faltando: {', '.join(missing_names)}")
        
        # Atualiza status
        old_status = verification.status
        verification.status = KYCStatus.SUBMITTED
        verification.submitted_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(verification)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=verification.user_id,
            actor_type=ActorType.USER,
            action=AuditAction.SUBMITTED_FOR_REVIEW,
            old_status=old_status,
            new_status=verification.status,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # TODO: Dispara análise automática em background
        # await self._trigger_auto_analysis(verification_id)
        
        logger.info(f"✅ KYC submitted for review: {verification_id}")
        return verification
    
    # ============================================================
    # ADMIN ACTIONS
    # ============================================================
    
    async def approve(
        self,
        verification_id: uuid.UUID,
        admin_id: uuid.UUID,
        notes: Optional[str] = None,
        expiration_months: int = 24,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCVerification:
        """
        Admin aprova o KYC.
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        # Permite aprovar se ainda não foi aprovado/rejeitado
        if verification.status in [KYCStatus.APPROVED, KYCStatus.REJECTED, KYCStatus.EXPIRED]:
            raise ValueError("Verificação já foi processada anteriormente")
        
        old_status = verification.status
        
        # Atualiza verificação
        verification.status = KYCStatus.APPROVED
        verification.reviewed_at = datetime.utcnow()
        verification.approved_at = datetime.utcnow()
        verification.reviewed_by = admin_id
        verification.admin_notes = notes
        verification.expiration_date = date.today() + timedelta(days=expiration_months * 30)
        
        # Atualiza usuário
        user = self.db.query(User).filter(User.id == verification.user_id).first()
        if user:
            # Adiciona campos KYC ao usuário se não existirem
            if hasattr(user, 'kyc_level'):
                user.kyc_level = verification.level
            if hasattr(user, 'kyc_verified_at'):
                user.kyc_verified_at = datetime.utcnow()
        
        # Aprova todos os documentos pendentes
        for doc in verification.documents:
            if doc.status == DocumentStatus.PENDING:
                doc.status = DocumentStatus.APPROVED
                doc.reviewed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(verification)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=admin_id,
            actor_type=ActorType.ADMIN,
            action=AuditAction.MANUALLY_APPROVED,
            old_status=old_status,
            new_status=verification.status,
            details={"notes": notes, "expiration_months": expiration_months},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # TODO: Enviar notificação ao usuário
        
        logger.info(f"✅ KYC approved: {verification_id} by admin {admin_id}")
        return verification
    
    async def reject(
        self,
        verification_id: uuid.UUID,
        admin_id: uuid.UUID,
        reason: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCVerification:
        """
        Admin rejeita o KYC.
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        # Permite rejeitar se ainda não foi aprovado/rejeitado
        if verification.status in [KYCStatus.APPROVED, KYCStatus.REJECTED, KYCStatus.EXPIRED]:
            raise ValueError("Verificação já foi processada anteriormente")
        
        old_status = verification.status
        
        verification.status = KYCStatus.REJECTED
        verification.reviewed_at = datetime.utcnow()
        verification.rejected_at = datetime.utcnow()
        verification.reviewed_by = admin_id
        verification.rejection_reason = reason
        verification.rejection_details = details
        
        self.db.commit()
        self.db.refresh(verification)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=admin_id,
            actor_type=ActorType.ADMIN,
            action=AuditAction.REJECTED,
            old_status=old_status,
            new_status=verification.status,
            details={"reason": reason, "details": details},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # TODO: Enviar notificação ao usuário
        
        logger.info(f"✅ KYC rejected: {verification_id} by admin {admin_id}")
        return verification
    
    async def request_documents(
        self,
        verification_id: uuid.UUID,
        admin_id: uuid.UUID,
        documents: List[DocumentType],
        message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> KYCVerification:
        """
        Admin solicita documentos adicionais.
        """
        verification = await self.get_verification_by_id(verification_id)
        if not verification:
            raise ValueError("Verificação não encontrada")
        
        old_status = verification.status
        
        verification.status = KYCStatus.DOCUMENTS_REQUESTED
        verification.requested_documents = [d.value for d in documents]
        verification.admin_notes = message
        verification.reviewed_by = admin_id
        
        self.db.commit()
        self.db.refresh(verification)
        
        # Audit log
        await self._create_audit_log(
            verification_id=verification_id,
            actor_id=admin_id,
            actor_type=ActorType.ADMIN,
            action=AuditAction.DOCUMENTS_REQUESTED,
            old_status=old_status,
            new_status=verification.status,
            details={"documents": [d.value for d in documents], "message": message},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # TODO: Enviar notificação ao usuário
        
        logger.info(f"✅ Documents requested for KYC: {verification_id}")
        return verification
    
    # ============================================================
    # LISTAGEM E ESTATÍSTICAS (ADMIN)
    # ============================================================
    
    async def list_verifications(
        self,
        status: Optional[KYCStatus] = None,
        level: Optional[KYCLevel] = None,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[KYCVerification], int]:
        """
        Lista verificações com filtros (admin).
        """
        query = self.db.query(KYCVerification)
        
        if status:
            query = query.filter(KYCVerification.status == status)
        
        if level:
            query = query.filter(KYCVerification.level == level)
        
        if date_from:
            query = query.filter(KYCVerification.created_at >= datetime.combine(date_from, datetime.min.time()))
        
        if date_to:
            query = query.filter(KYCVerification.created_at <= datetime.combine(date_to, datetime.max.time()))
        
        if search:
            # Busca por email ou nome
            query = query.join(User).filter(
                or_(
                    User.email.ilike(f"%{search}%"),
                    User.username.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        
        verifications = query.order_by(desc(KYCVerification.created_at))\
            .offset((page - 1) * per_page)\
            .limit(per_page)\
            .all()
        
        return verifications, total
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Obtém estatísticas de KYC para dashboard admin.
        """
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        # Contagens por status
        status_counts = self.db.query(
            KYCVerification.status,
            func.count(KYCVerification.id)
        ).group_by(KYCVerification.status).all()
        
        status_dict = {s.value: 0 for s in KYCStatus}
        for status, count in status_counts:
            # status pode ser enum ou string
            status_key = status.value if hasattr(status, 'value') else str(status)
            status_dict[status_key] = count
        
        # Contagens por nível (apenas aprovados)
        level_counts = self.db.query(
            KYCVerification.level,
            func.count(KYCVerification.id)
        ).filter(
            KYCVerification.status == KYCStatus.APPROVED.value
        ).group_by(KYCVerification.level).all()
        
        level_dict = {l.value: 0 for l in KYCLevel if l != KYCLevel.NONE}
        for level, count in level_counts:
            # level pode ser enum ou string
            level_key = level.value if hasattr(level, 'value') else str(level)
            if level_key in level_dict:
                level_dict[level_key] = count
        
        # Hoje
        today_start = datetime.combine(today, datetime.min.time())
        submitted_today = self.db.query(KYCVerification).filter(
            KYCVerification.submitted_at >= today_start
        ).count()
        
        approved_today = self.db.query(KYCVerification).filter(
            KYCVerification.approved_at >= today_start
        ).count()
        
        rejected_today = self.db.query(KYCVerification).filter(
            KYCVerification.rejected_at >= today_start
        ).count()
        
        # Esta semana
        week_start = datetime.combine(week_ago, datetime.min.time())
        submitted_week = self.db.query(KYCVerification).filter(
            KYCVerification.submitted_at >= week_start
        ).count()
        
        approved_week = self.db.query(KYCVerification).filter(
            KYCVerification.approved_at >= week_start
        ).count()
        
        # Métricas
        total_approved = status_dict.get("approved", 0)
        total_rejected = status_dict.get("rejected", 0)
        total_reviewed = total_approved + total_rejected
        
        auto_approved_count = self.db.query(KYCVerification).filter(
            KYCVerification.auto_approved == True
        ).count()
        
        return {
            "total_verifications": sum(status_dict.values()),
            **status_dict,
            "basic_approved": level_dict.get("basic", 0),
            "intermediate_approved": level_dict.get("intermediate", 0),
            "advanced_approved": level_dict.get("advanced", 0),
            "auto_approval_rate": (auto_approved_count / total_approved * 100) if total_approved > 0 else 0,
            "rejection_rate": (total_rejected / total_reviewed * 100) if total_reviewed > 0 else 0,
            "avg_review_time_hours": 0,  # TODO: Calcular tempo médio
            "submitted_today": submitted_today,
            "approved_today": approved_today,
            "rejected_today": rejected_today,
            "submitted_this_week": submitted_week,
            "approved_this_week": approved_week,
        }
    
    # ============================================================
    # VERIFICAÇÃO DE LIMITES
    # ============================================================
    
    async def check_operation_limit(
        self,
        user_id: uuid.UUID,
        service: str,
        amount: Decimal
    ) -> KYCLimitCheckResponse:
        """
        Verifica se o usuário pode realizar uma operação baseado no KYC.
        """
        kyc_level = await self.get_user_kyc_level(user_id)
        
        # Obtém limites do banco ou usa padrão
        limits = DEFAULT_SERVICE_LIMITS.get(service, {}).get(kyc_level, {})
        
        daily_limit = limits.get("daily")
        monthly_limit = limits.get("monthly")
        per_op_limit = limits.get("per_op")
        
        # Verifica limite por operação
        if per_op_limit is not None and amount > Decimal(str(per_op_limit)):
            return KYCLimitCheckResponse(
                allowed=False,
                kyc_level=KYCLevelEnum(kyc_level.value),
                service=service,
                daily_limit=Decimal(str(daily_limit)) if daily_limit else None,
                monthly_limit=Decimal(str(monthly_limit)) if monthly_limit else None,
                per_operation_limit=Decimal(str(per_op_limit)) if per_op_limit else None,
                reason=f"Valor excede limite por operação de R$ {per_op_limit:,.2f}",
                required_level=self._get_required_level_for_amount(service, amount)
            )
        
        # TODO: Verificar uso diário e mensal (requer tabela de transações)
        
        return KYCLimitCheckResponse(
            allowed=True,
            kyc_level=KYCLevelEnum(kyc_level.value),
            service=service,
            daily_limit=Decimal(str(daily_limit)) if daily_limit else None,
            monthly_limit=Decimal(str(monthly_limit)) if monthly_limit else None,
            per_operation_limit=Decimal(str(per_op_limit)) if per_op_limit else None,
        )
    
    def _get_required_level_for_amount(self, service: str, amount: Decimal) -> Optional[KYCLevelEnum]:
        """
        Determina qual nível KYC é necessário para um valor.
        """
        service_limits = DEFAULT_SERVICE_LIMITS.get(service, {})
        
        for level in [KYCLevel.BASIC, KYCLevel.INTERMEDIATE, KYCLevel.ADVANCED]:
            limits = service_limits.get(level, {})
            per_op = limits.get("per_op")
            
            if per_op is None or amount <= Decimal(str(per_op)):
                return KYCLevelEnum(level.value)
        
        return KYCLevelEnum.ADVANCED
    
    # ============================================================
    # STATUS DO USUÁRIO
    # ============================================================
    
    async def get_user_status(self, user_id: uuid.UUID) -> KYCStatusResponse:
        """
        Obtém status simplificado do KYC para o usuário.
        """
        verification = await self.get_active_verification(user_id)
        
        if not verification:
            return KYCStatusResponse(
                has_kyc=False,
                status=KYCStatusEnum.PENDING,
                level=KYCLevelEnum.NONE,
                is_verified=False,
                next_steps=["Inicie sua verificação KYC para usar todos os recursos"]
            )
        
        # Conta documentos
        docs_uploaded = len(verification.documents)
        docs_approved = len([d for d in verification.documents if d.status == DocumentStatus.APPROVED])
        
        level_config = KYC_LEVEL_REQUIREMENTS.get(verification.level, {})
        docs_required = len(level_config.get("required_documents", []))
        
        # Determina próximos passos
        next_steps = []
        if verification.status == KYCStatus.PENDING:
            if not verification.personal_data:
                next_steps.append("Preencha seus dados pessoais")
            if docs_uploaded < docs_required:
                next_steps.append(f"Envie os documentos necessários ({docs_uploaded}/{docs_required})")
            if verification.personal_data and docs_uploaded >= docs_required:
                next_steps.append("Submeta para análise")
        elif verification.status == KYCStatus.DOCUMENTS_REQUESTED:
            next_steps.append("Envie os documentos solicitados")
        elif verification.status in [KYCStatus.SUBMITTED, KYCStatus.UNDER_REVIEW]:
            next_steps.append("Aguarde a análise da sua verificação")
        
        # Expiração
        days_until_expiration = None
        if verification.expiration_date:
            days_until_expiration = (verification.expiration_date - date.today()).days
        
        return KYCStatusResponse(
            has_kyc=True,
            status=KYCStatusEnum(verification.status),
            level=KYCLevelEnum(verification.level),
            is_verified=verification.status == KYCStatus.APPROVED.value and not verification.is_expired,
            personal_data_complete=verification.personal_data is not None,
            documents_uploaded=docs_uploaded,
            documents_required=docs_required,
            documents_approved=docs_approved,
            next_steps=next_steps,
            rejection_reason=verification.rejection_reason,
            requested_documents=verification.requested_documents,
            expires_at=verification.expiration_date,
            days_until_expiration=days_until_expiration,
            verification_id=verification.id
        )
    
    # ============================================================
    # REQUISITOS
    # ============================================================
    
    def get_requirements(self, level: KYCLevel) -> KYCRequirementsResponse:
        """
        Obtém requisitos para um nível de KYC.
        """
        config = KYC_LEVEL_REQUIREMENTS.get(level, {})
        
        if not config:
            raise ValueError(f"Nível KYC inválido: {level}")
        
        # Formata documentos
        required_documents = [
            {
                "type": doc["type"].value,
                "name": doc["name"],
                "description": doc.get("description", "")
            }
            for doc in config.get("required_documents", [])
        ]
        
        # Formata limites
        limits = {}
        for service, service_limits in DEFAULT_SERVICE_LIMITS.items():
            level_limits = service_limits.get(level, {})
            limits[service] = {
                "daily": level_limits.get("daily"),
                "monthly": level_limits.get("monthly"),
                "per_operation": level_limits.get("per_op"),
            }
        
        return KYCRequirementsResponse(
            level=KYCLevelEnum(level.value),
            name=config.get("name", level.value),
            description=config.get("description", ""),
            required_documents=required_documents,
            required_fields=config.get("required_fields", []),
            benefits=config.get("benefits", []),
            limits=limits
        )
    
    # ============================================================
    # AUDIT LOG
    # ============================================================
    
    async def _create_audit_log(
        self,
        verification_id: uuid.UUID,
        actor_type: ActorType,
        action: AuditAction,
        actor_id: Optional[uuid.UUID] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Cria registro de auditoria.
        """
        audit_log = KYCAuditLog(
            verification_id=verification_id,
            actor_id=actor_id,
            actor_type=actor_type,
            action=action,
            old_status=old_status,
            new_status=new_status,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(audit_log)
        self.db.commit()
