"""
🛡️ KYC Admin Router - Admin Endpoints
======================================
Endpoints administrativos para gestão de verificações KYC.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import uuid

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.kyc import KYCStatus, KYCLevel, DocumentType
from app.schemas.kyc import (
    KYCApproveRequest, KYCRejectRequest, KYCRequestDocumentsRequest,
    KYCAdminDetailResponse, KYCAdminListResponse, KYCStatsResponse,
    KYCStatusEnum, KYCLevelEnum, DocumentTypeEnum
)
from app.services.kyc_service import KYCService

router = APIRouter(prefix="/kyc", tags=["admin-kyc"])


def get_client_info(request: Request) -> tuple:
    """Extrai IP e User-Agent do request"""
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip, user_agent


# ============================================================
# LISTAGEM E ESTATÍSTICAS
# ============================================================

@router.get("", response_model=KYCAdminListResponse)
async def list_verifications(
    status: Optional[KYCStatusEnum] = Query(None, description="Filtrar por status"),
    level: Optional[KYCLevelEnum] = Query(None, description="Filtrar por nível"),
    search: Optional[str] = Query(None, max_length=100, description="Buscar por email/nome"),
    date_from: Optional[date] = Query(None, description="Data inicial"),
    date_to: Optional[date] = Query(None, description="Data final"),
    page: int = Query(1, ge=1, description="Página"),
    per_page: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Lista verificações KYC com filtros.
    
    Filtros disponíveis:
    - **status**: pending, submitted, under_review, approved, rejected, expired
    - **level**: basic, intermediate, advanced
    - **search**: Busca por email ou nome do usuário
    - **date_from/date_to**: Período de criação
    """
    service = KYCService(db)
    
    # Converte enums se fornecidos
    kyc_status = KYCStatus(status.value) if status else None
    kyc_level = KYCLevel(level.value) if level else None
    
    verifications, total = await service.list_verifications(
        status=kyc_status,
        level=kyc_level,
        search=search,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page
    )
    
    # Enriquece com dados do usuário
    items = []
    for v in verifications:
        user = db.query(User).filter(User.id == v.user_id).first()
        
        # Converte status/level - pode ser enum ou string dependendo do ORM
        status_value = v.status.value if hasattr(v.status, 'value') else str(v.status)
        level_value = v.level.value if hasattr(v.level, 'value') else str(v.level)
        
        item = {
            "id": v.id,
            "user_id": v.user_id,
            "status": KYCStatusEnum(status_value),
            "level": KYCLevelEnum(level_value),
            "created_at": v.created_at,
            "updated_at": v.updated_at,
            "submitted_at": v.submitted_at,
            "approved_at": v.approved_at,
            "rejected_at": v.rejected_at,
            "expiration_date": v.expiration_date,
            "auto_approved": v.auto_approved,
            "risk_score": float(v.risk_score) if v.risk_score else None,
            "rejection_reason": v.rejection_reason,
            "requested_documents": v.requested_documents,
            "consent_given": v.consent_given,
            "consent_at": v.consent_at,
            "documents": [
                {
                    "id": d.id,
                    "document_type": DocumentTypeEnum(d.document_type.value if hasattr(d.document_type, 'value') else str(d.document_type)),
                    "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
                    "original_name": d.original_name,
                    "mime_type": d.mime_type,
                    "file_size": d.file_size,
                    "uploaded_at": d.uploaded_at,
                    "ocr_processed": d.ocr_processed,
                    "ocr_confidence": float(d.ocr_confidence) if d.ocr_confidence else None,
                    "face_match_score": float(d.face_match_score) if d.face_match_score else None,
                    "liveness_passed": d.liveness_passed,
                    "rejection_reason": d.rejection_reason,
                }
                for d in v.documents
            ],
            # Dados do usuário
            "user_email": user.email if user else "N/A",
            "user_username": user.username if user else "N/A",
            "user_created_at": user.created_at if user else None,
            "personal_data_full": None,  # Preenchido apenas no detail
            "auto_analysis_result": v.auto_analysis_result,
            "risk_factors": v.risk_factors,
            "audit_logs": [],
            "reviewed_by_email": None,
            "admin_notes": v.admin_notes,
        }
        
        items.append(item)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.get("/stats", response_model=KYCStatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Obtém estatísticas de KYC para dashboard.
    
    Inclui:
    - Totais por status
    - Totais por nível (aprovados)
    - Métricas de performance
    - Números do dia e semana
    """
    service = KYCService(db)
    stats = await service.get_stats()
    return stats


# ============================================================
# DETALHES
# ============================================================

@router.get("/{verification_id}")
async def get_verification_detail(
    verification_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Obtém detalhes completos de uma verificação KYC.
    
    Inclui:
    - Dados da verificação
    - Dados pessoais (descriptografados para admin)
    - Lista de documentos
    - Resultado de análises automáticas
    - Logs de auditoria
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    verification = await service.get_verification_by_id(verification_id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    # Obtém dados do usuário
    user = db.query(User).filter(User.id == verification.user_id).first()
    
    # Obtém dados pessoais descriptografados
    personal_data = await service.get_personal_data(verification_id, decrypt=True)
    personal_data_dict = None
    
    if personal_data:
        from app.services.encryption_service import encryption_service
        
        def safe_decrypt(value):
            """Tenta descriptografar, retorna valor original se falhar"""
            if not value:
                return value
            try:
                decrypted = encryption_service.decrypt(str(value))
                return decrypted
            except Exception:
                # Valor pode não estar criptografado ou ser inválido
                return value
        
        personal_data_dict = {
            "full_name": personal_data.full_name,
            "social_name": personal_data.social_name,
            "birth_date": str(personal_data.birth_date) if personal_data.birth_date else None,
            "nationality": personal_data.nationality,
            "gender": personal_data.gender,
            "mother_name": personal_data.mother_name,
            "document_type": personal_data.document_type,
            # Descriptografados
            "document_number": safe_decrypt(personal_data.document_number),
            "rg_number": safe_decrypt(personal_data.rg_number),
            "rg_issuer": personal_data.rg_issuer,
            "rg_state": personal_data.rg_state,
            # Endereço - todos os campos criptografados
            "zip_code": safe_decrypt(personal_data.zip_code),
            "street": safe_decrypt(personal_data.street),
            "number": safe_decrypt(personal_data.number),
            "complement": safe_decrypt(personal_data.complement),
            "neighborhood": safe_decrypt(personal_data.neighborhood),
            "city": personal_data.city,
            "state": personal_data.state,
            "country": personal_data.country,
            # Contato
            "phone": safe_decrypt(personal_data.phone),
            "email": personal_data.email,
            # Financeiro
            "occupation": personal_data.occupation,
            "employer": personal_data.employer,
            "monthly_income": personal_data.monthly_income,
            "source_of_funds": personal_data.source_of_funds,
            # Compliance
            "pep": personal_data.pep,
            "pep_relationship": personal_data.pep_relationship,
            "fatca": personal_data.fatca,
            # Validações
            "cpf_validated": personal_data.cpf_validated,
            "cpf_validation_date": str(personal_data.cpf_validation_date) if personal_data.cpf_validation_date else None,
            "name_similarity_score": float(personal_data.name_similarity_score) if personal_data.name_similarity_score else None,
            "birth_date_matches": personal_data.birth_date_matches,
            "cpf_situation": personal_data.cpf_situation,
        }
    
    # Obtém admin que revisou
    reviewer_email = None
    if verification.reviewed_by:
        reviewer = db.query(User).filter(User.id == verification.reviewed_by).first()
        reviewer_email = reviewer.email if reviewer else None
    
    # Obtém audit logs
    audit_logs = [
        {
            "id": str(log.id),
            "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
            "actor_type": log.actor_type.value if hasattr(log.actor_type, 'value') else str(log.actor_type),
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "old_status": log.old_status,
            "new_status": log.new_status,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": str(log.created_at),
        }
        for log in verification.audit_logs
    ]
    
    return {
        "id": verification.id,
        "user_id": verification.user_id,
        "status": verification.status.value if hasattr(verification.status, 'value') else str(verification.status),
        "level": verification.level.value if hasattr(verification.level, 'value') else str(verification.level),
        "created_at": verification.created_at,
        "updated_at": verification.updated_at,
        "submitted_at": verification.submitted_at,
        "approved_at": verification.approved_at,
        "rejected_at": verification.rejected_at,
        "expiration_date": verification.expiration_date,
        "auto_approved": verification.auto_approved,
        "risk_score": float(verification.risk_score) if verification.risk_score else None,
        "rejection_reason": verification.rejection_reason,
        "requested_documents": verification.requested_documents,
        "consent_given": verification.consent_given,
        "consent_at": verification.consent_at,
        # Documentos
        "documents": [
            {
                "id": d.id,
                "document_type": d.document_type.value if hasattr(d.document_type, 'value') else str(d.document_type),
                "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
                "original_name": d.original_name,
                "mime_type": d.mime_type,
                "file_size": d.file_size,
                "uploaded_at": d.uploaded_at,
                "ocr_processed": d.ocr_processed,
                "ocr_data": d.ocr_data,
                "ocr_confidence": float(d.ocr_confidence) if d.ocr_confidence else None,
                "extracted_name": d.extracted_name,
                "extracted_cpf": d.extracted_cpf,
                "extracted_birth_date": str(d.extracted_birth_date) if d.extracted_birth_date else None,
                "face_detected": d.face_detected,
                "face_count": d.face_count,
                "face_match_score": float(d.face_match_score) if d.face_match_score else None,
                "liveness_passed": d.liveness_passed,
                "liveness_score": float(d.liveness_score) if d.liveness_score else None,
                "is_screenshot": d.is_screenshot,
                "is_photo_of_photo": d.is_photo_of_photo,
                "fraud_indicators": d.fraud_indicators,
                "rejection_reason": d.rejection_reason,
            }
            for d in verification.documents
        ],
        # Usuário
        "user_email": user.email if user else "N/A",
        "user_username": user.username if user else "N/A",
        "user_created_at": user.created_at if user else None,
        # Dados pessoais completos
        "personal_data_full": personal_data_dict,
        # Análise
        "auto_analysis_result": verification.auto_analysis_result,
        "risk_factors": verification.risk_factors,
        # Auditoria
        "audit_logs": audit_logs,
        # Admin
        "reviewed_by_email": reviewer_email,
        "admin_notes": verification.admin_notes,
    }


@router.get("/{verification_id}/documents/{document_id}/url")
async def get_document_url(
    verification_id: uuid.UUID,
    document_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Obtém URL pré-assinada para visualizar um documento.
    
    A URL expira em 1 hora.
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    # Verifica se o documento pertence à verificação
    verification = await service.get_verification_by_id(verification_id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    doc_ids = [str(d.id) for d in verification.documents]
    if str(document_id) not in doc_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    try:
        url = await service.get_document_url(document_id)
        
        # Log de visualização
        from app.models.kyc import AuditAction, ActorType
        await service._create_audit_log(
            verification_id=verification_id,
            actor_id=admin.id,
            actor_type=ActorType.ADMIN,
            action=AuditAction.DOCUMENT_VIEWED,
            details={"document_id": str(document_id)},
            ip_address=ip,
            user_agent=user_agent
        )
        
        return {"url": url, "expires_in": 3600}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================
# AÇÕES DO ADMIN
# ============================================================

@router.post("/{verification_id}/approve")
async def approve_verification(
    verification_id: uuid.UUID,
    data: KYCApproveRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Aprova uma verificação KYC.
    
    - **notes**: Notas internas (opcional)
    - **expiration_months**: Meses até expiração (padrão: 24)
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    try:
        verification = await service.approve(
            verification_id=verification_id,
            admin_id=admin.id,
            notes=data.notes,
            expiration_months=data.expiration_months,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "KYC aprovado com sucesso",
            "verification_id": str(verification.id),
            "status": verification.status.value,
            "expiration_date": str(verification.expiration_date)
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{verification_id}/reject")
async def reject_verification(
    verification_id: uuid.UUID,
    data: KYCRejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Rejeita uma verificação KYC.
    
    - **reason**: Motivo da rejeição (obrigatório)
    - **details**: Detalhes estruturados (opcional)
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    try:
        verification = await service.reject(
            verification_id=verification_id,
            admin_id=admin.id,
            reason=data.reason,
            details=data.details,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "KYC rejeitado",
            "verification_id": str(verification.id),
            "status": verification.status.value
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{verification_id}/request-documents")
async def request_additional_documents(
    verification_id: uuid.UUID,
    data: KYCRequestDocumentsRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Solicita documentos adicionais ao usuário.
    
    - **documents**: Lista de tipos de documentos necessários
    - **message**: Mensagem para o usuário (opcional)
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    try:
        # Converte enums
        doc_types = [DocumentType(d.value) for d in data.documents]
        
        verification = await service.request_documents(
            verification_id=verification_id,
            admin_id=admin.id,
            documents=doc_types,
            message=data.message,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "Documentos solicitados",
            "verification_id": str(verification.id),
            "status": verification.status.value,
            "requested_documents": verification.requested_documents
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{verification_id}/under-review")
async def set_under_review(
    verification_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Marca uma verificação como "em análise" pelo admin.
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    verification = await service.get_verification_by_id(verification_id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    if verification.status != KYCStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verificação não está no estado 'submitted'"
        )
    
    # Atualiza status
    from app.models.kyc import AuditAction, ActorType
    from datetime import datetime
    
    old_status = verification.status.value
    verification.status = KYCStatus.UNDER_REVIEW
    verification.reviewed_by = admin.id
    
    db.commit()
    db.refresh(verification)
    
    # Audit log
    await service._create_audit_log(
        verification_id=verification_id,
        actor_id=admin.id,
        actor_type=ActorType.ADMIN,
        action=AuditAction.VERIFICATION_STARTED,  # Reutilizando
        old_status=old_status,
        new_status=verification.status.value,
        ip_address=ip,
        user_agent=user_agent
    )
    
    return {
        "success": True,
        "message": "Verificação marcada como em análise",
        "status": verification.status.value
    }
