"""
🛡️ User KYC Admin Router - Gestão Avançada de KYC por Usuário
=============================================================
Endpoints para gestão completa de níveis KYC, limites personalizados
e controle de acesso a serviços por usuário.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.kyc import (
    KYCVerification, KYCStatus, KYCLevel, 
    UserCustomLimit, UserServiceAccess, KYCServiceLimit,
    KYCAuditLog, AuditAction, ActorType
)
from app.schemas.kyc import (
    KYCLevelEnum, KYCStatusEnum, ServiceNameEnum,
    UserCustomLimitCreate, UserCustomLimitResponse,
    UserServiceAccessCreate, UserServiceAccessResponse,
    UserKYCUpdateRequest, UserKYCFullResponse, UserKYCListItem,
    UserKYCListResponse, BulkUserKYCUpdateRequest,
    ServiceLimitConfigRequest, AllServicesLimitsResponse
)
from app.services.kyc_service import KYCService

router = APIRouter(prefix="/kyc/users", tags=["admin-kyc-users"])


def get_client_info(request: Request) -> tuple:
    """Extrai IP e User-Agent do request"""
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip, user_agent


# Lista de serviços disponíveis com limites padrão
DEFAULT_SERVICE_LIMITS = {
    "instant_trade": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 1000, "monthly": 10000, "per_op": 500},
        "intermediate": {"daily": 10000, "monthly": 100000, "per_op": 5000},
        "advanced": {"daily": 50000, "monthly": 300000, "per_op": 30000},
        "premium": {"daily": None, "monthly": None, "per_op": None},  # Sem limite
    },
    "p2p": {
        "none": {"daily": 500, "monthly": 500, "per_op": 500},
        "basic": {"daily": 5000, "monthly": 50000, "per_op": 2000},
        "intermediate": {"daily": 20000, "monthly": 200000, "per_op": 10000},
        "advanced": {"daily": None, "monthly": None, "per_op": None},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
    "withdraw_crypto": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 1000, "monthly": 10000, "per_op": 1000},
        "intermediate": {"daily": 10000, "monthly": 100000, "per_op": 10000},
        "advanced": {"daily": 100000, "monthly": 500000, "per_op": 50000},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
    "withdraw_fiat": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 0, "monthly": 0, "per_op": 0},
        "intermediate": {"daily": 10000, "monthly": 100000, "per_op": 5000},
        "advanced": {"daily": 100000, "monthly": 500000, "per_op": 50000},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
    "pix_withdraw": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 0, "monthly": 0, "per_op": 0},
        "intermediate": {"daily": 10000, "monthly": 100000, "per_op": 5000},
        "advanced": {"daily": 100000, "monthly": 500000, "per_op": 50000},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
    "wolkpay": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 0, "monthly": 0, "per_op": 0},
        "intermediate": {"daily": 15000, "monthly": 150000, "per_op": 15000},
        "advanced": {"daily": 50000, "monthly": 500000, "per_op": 50000},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
    "internal_transfer": {
        "none": {"daily": 0, "monthly": 0, "per_op": 0},
        "basic": {"daily": 500, "monthly": 5000, "per_op": 500},
        "intermediate": {"daily": 50000, "monthly": 200000, "per_op": 20000},
        "advanced": {"daily": None, "monthly": None, "per_op": None},
        "premium": {"daily": None, "monthly": None, "per_op": None},
    },
}


# ============================================================
# LISTAGEM DE USUÁRIOS COM KYC
# ============================================================

@router.get("", response_model=UserKYCListResponse)
async def list_users_kyc(
    search: Optional[str] = Query(None, max_length=100, description="Buscar por email/username"),
    kyc_level: Optional[KYCLevelEnum] = Query(None, description="Filtrar por nível KYC"),
    has_custom_limits: Optional[bool] = Query(None, description="Filtrar usuários com limites personalizados"),
    has_blocked_services: Optional[bool] = Query(None, description="Filtrar usuários com serviços bloqueados"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Lista todos os usuários com informações de KYC.
    
    Permite filtrar por:
    - **search**: Busca por email ou username
    - **kyc_level**: Nível KYC específico
    - **has_custom_limits**: Usuários com limites personalizados
    - **has_blocked_services**: Usuários com serviços bloqueados
    """
    # Query base
    query = db.query(User).filter(User.is_active == True)
    
    # Filtro de busca
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%")
            )
        )
    
    # Subqueries para filtros avançados
    if has_custom_limits is not None:
        subq = db.query(UserCustomLimit.user_id).distinct()
        if has_custom_limits:
            query = query.filter(User.id.in_(subq))
        else:
            query = query.filter(~User.id.in_(subq))
    
    if has_blocked_services is not None:
        subq = db.query(UserServiceAccess.user_id).filter(UserServiceAccess.is_allowed == False).distinct()
        if has_blocked_services:
            query = query.filter(User.id.in_(subq))
        else:
            query = query.filter(~User.id.in_(subq))
    
    # Total antes da paginação
    total = query.count()
    
    # Paginação
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Monta response
    items = []
    for user in users:
        # Busca última verificação KYC aprovada
        verification = db.query(KYCVerification).filter(
            KYCVerification.user_id == user.id,
            KYCVerification.status == KYCStatus.APPROVED.value
        ).order_by(KYCVerification.approved_at.desc()).first()
        
        # Determina nível KYC
        user_kyc_level = KYCLevelEnum.NONE
        user_kyc_status = None
        
        if verification:
            # Tenta converter o nível com tratamento de erro
            try:
                level_value = verification.level.value if hasattr(verification.level, 'value') else str(verification.level)
                level_value = level_value.lower() if level_value else 'none'  # Normaliza para minúsculas
                user_kyc_level = KYCLevelEnum(level_value)
            except (ValueError, AttributeError):
                user_kyc_level = KYCLevelEnum.NONE
            
            # Tenta converter o status com tratamento de erro
            try:
                status_value = verification.status.value if hasattr(verification.status, 'value') else str(verification.status)
                status_value = status_value.lower() if status_value else None
                user_kyc_status = KYCStatusEnum(status_value) if status_value else None
            except (ValueError, AttributeError):
                user_kyc_status = None
        else:
            # Verifica se tem verificação pendente
            pending = db.query(KYCVerification).filter(
                KYCVerification.user_id == user.id,
                KYCVerification.status.in_([
                    KYCStatus.PENDING.value,
                    KYCStatus.SUBMITTED.value,
                    KYCStatus.UNDER_REVIEW.value
                ])
            ).first()
            if pending:
                try:
                    status_value = pending.status.value if hasattr(pending.status, 'value') else str(pending.status)
                    status_value = status_value.lower() if status_value else None
                    user_kyc_status = KYCStatusEnum(status_value) if status_value else None
                except (ValueError, AttributeError):
                    user_kyc_status = None
        
        # Filtro por nível
        if kyc_level and user_kyc_level != kyc_level:
            continue
        
        # Verifica se tem limites personalizados
        has_limits = db.query(UserCustomLimit).filter(
            UserCustomLimit.user_id == user.id
        ).first() is not None
        
        # Verifica se tem serviços bloqueados
        has_blocked = db.query(UserServiceAccess).filter(
            UserServiceAccess.user_id == user.id,
            UserServiceAccess.is_allowed == False
        ).first() is not None
        
        items.append(UserKYCListItem(
            user_id=user.id,
            username=user.username,
            email=user.email,
            kyc_level=user_kyc_level,
            kyc_status=user_kyc_status,
            user_created_at=user.created_at,
            has_custom_limits=has_limits,
            has_blocked_services=has_blocked
        ))
    
    return UserKYCListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page
    )


# ============================================================
# DETALHES DO USUÁRIO
# ============================================================

@router.get("/{user_id}", response_model=UserKYCFullResponse)
async def get_user_kyc_details(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Obtém detalhes completos de KYC de um usuário específico.
    
    Inclui:
    - Nível KYC atual
    - Verificação atual
    - Limites personalizados
    - Acesso a serviços
    - Limites efetivos (personalizados ou padrão)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Busca última verificação aprovada
    verification = db.query(KYCVerification).filter(
        KYCVerification.user_id == user_id,
        KYCVerification.status == KYCStatus.APPROVED.value
    ).order_by(KYCVerification.approved_at.desc()).first()
    
    # Determina nível e status
    user_kyc_level = KYCLevelEnum.NONE
    user_kyc_status = None
    verification_id = None
    approved_at = None
    expiration_date = None
    
    if verification:
        # Tenta converter o nível com tratamento de erro
        try:
            level_value = verification.level.value if hasattr(verification.level, 'value') else str(verification.level)
            level_value = level_value.lower() if level_value else 'none'
            user_kyc_level = KYCLevelEnum(level_value)
        except (ValueError, AttributeError):
            user_kyc_level = KYCLevelEnum.NONE
        
        # Tenta converter o status com tratamento de erro
        try:
            status_value = verification.status.value if hasattr(verification.status, 'value') else str(verification.status)
            status_value = status_value.lower() if status_value else None
            user_kyc_status = KYCStatusEnum(status_value) if status_value else None
        except (ValueError, AttributeError):
            user_kyc_status = None
        
        verification_id = verification.id
        approved_at = verification.approved_at
        expiration_date = verification.expiration_date
    
    # Busca limites personalizados
    custom_limits = db.query(UserCustomLimit).filter(
        UserCustomLimit.user_id == user_id
    ).all()
    
    # Busca acessos a serviços
    service_access = db.query(UserServiceAccess).filter(
        UserServiceAccess.user_id == user_id
    ).all()
    
    # Calcula limites efetivos
    effective_limits = {}
    for service_name, levels in DEFAULT_SERVICE_LIMITS.items():
        level_key = user_kyc_level.value
        default_limits = levels.get(level_key, levels.get("none", {}))
        
        # Verifica se tem limite personalizado
        custom = next(
            (l for l in custom_limits if l.service_name == service_name),
            None
        )
        
        # Verifica acesso ao serviço
        access = next(
            (a for a in service_access if a.service_name == service_name),
            None
        )
        
        is_enabled = True
        if access and not access.is_allowed:
            is_enabled = False
        if custom and not custom.is_enabled:
            is_enabled = False
        
        effective_limits[service_name] = {
            "daily_limit": float(custom.daily_limit) if custom and custom.daily_limit else default_limits.get("daily"),
            "monthly_limit": float(custom.monthly_limit) if custom and custom.monthly_limit else default_limits.get("monthly"),
            "per_operation_limit": float(custom.per_operation_limit) if custom and custom.per_operation_limit else default_limits.get("per_op"),
            "is_enabled": is_enabled,
            "requires_approval": custom.requires_approval if custom else False,
            "is_custom": custom is not None,
            "blocked_reason": access.reason if access and not access.is_allowed else None,
        }
    
    return UserKYCFullResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
        user_created_at=user.created_at,
        kyc_level=user_kyc_level,
        kyc_status=user_kyc_status,
        verification_id=verification_id,
        approved_at=approved_at,
        expiration_date=expiration_date,
        custom_limits=[UserCustomLimitResponse.from_orm(l) for l in custom_limits],
        service_access=[UserServiceAccessResponse.from_orm(a) for a in service_access],
        effective_limits=effective_limits
    )


# ============================================================
# ATUALIZAR NÍVEL KYC
# ============================================================

@router.put("/{user_id}/level")
async def update_user_kyc_level(
    user_id: uuid.UUID,
    data: UserKYCUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Atualiza o nível KYC de um usuário manualmente.
    
    Cria uma nova verificação aprovada com o nível especificado.
    Requer motivo obrigatório para auditoria.
    """
    ip, user_agent = get_client_info(request)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Busca verificação atual
    current_verification = db.query(KYCVerification).filter(
        KYCVerification.user_id == user_id,
        KYCVerification.status == KYCStatus.APPROVED.value
    ).order_by(KYCVerification.approved_at.desc()).first()
    
    old_level = "none"
    if current_verification:
        old_level = current_verification.level.value if hasattr(current_verification.level, 'value') else str(current_verification.level)
    
    # Cria nova verificação aprovada
    expiration_date = date.today() + timedelta(days=data.expiration_months * 30)
    
    new_verification = KYCVerification(
        user_id=user_id,
        status=KYCStatus.APPROVED.value,
        level=data.kyc_level.value,
        submitted_at=datetime.utcnow(),
        reviewed_at=datetime.utcnow(),
        approved_at=datetime.utcnow(),
        reviewed_by=admin.id,
        admin_notes=f"Alteração manual por admin.\nMotivo: {data.reason}\n{data.admin_notes or ''}",
        auto_approved=False,
        consent_given=True,
        consent_at=datetime.utcnow(),
        expiration_date=expiration_date
    )
    
    db.add(new_verification)
    db.flush()
    
    # Audit log
    audit_log = KYCAuditLog(
        verification_id=new_verification.id,
        actor_id=admin.id,
        actor_type=ActorType.ADMIN.value,
        action=AuditAction.MANUALLY_APPROVED.value,
        old_status=old_level,
        new_status=data.kyc_level.value,
        details={
            "reason": data.reason,
            "admin_notes": data.admin_notes,
            "old_level": old_level,
            "new_level": data.kyc_level.value,
            "manual_override": True
        },
        ip_address=ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Nível KYC alterado de {old_level} para {data.kyc_level.value}",
        "verification_id": str(new_verification.id),
        "old_level": old_level,
        "new_level": data.kyc_level.value,
        "expiration_date": str(expiration_date)
    }


# ============================================================
# LIMITES PERSONALIZADOS
# ============================================================

@router.post("/{user_id}/limits")
async def set_user_custom_limit(
    user_id: uuid.UUID,
    data: UserCustomLimitCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Define ou atualiza limite personalizado para um serviço específico.
    
    Os limites personalizados sobrescrevem os limites padrão do nível KYC.
    """
    ip, user_agent = get_client_info(request)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Verifica se já existe limite para este serviço
    existing = db.query(UserCustomLimit).filter(
        UserCustomLimit.user_id == user_id,
        UserCustomLimit.service_name == data.service_name.value
    ).first()
    
    if existing:
        # Atualiza existente
        existing.daily_limit = data.daily_limit
        existing.monthly_limit = data.monthly_limit
        existing.per_operation_limit = data.per_operation_limit
        existing.is_enabled = data.is_enabled
        existing.requires_approval = data.requires_approval
        existing.reason = data.reason
        existing.admin_notes = data.admin_notes
        existing.expires_at = data.expires_at
        existing.updated_by = admin.id
        existing.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(existing)
        
        return {
            "success": True,
            "message": "Limite atualizado",
            "limit": UserCustomLimitResponse.from_orm(existing)
        }
    else:
        # Cria novo
        new_limit = UserCustomLimit(
            user_id=user_id,
            service_name=data.service_name.value,
            daily_limit=data.daily_limit,
            monthly_limit=data.monthly_limit,
            per_operation_limit=data.per_operation_limit,
            is_enabled=data.is_enabled,
            requires_approval=data.requires_approval,
            reason=data.reason,
            admin_notes=data.admin_notes,
            expires_at=data.expires_at,
            created_by=admin.id
        )
        
        db.add(new_limit)
        db.commit()
        db.refresh(new_limit)
        
        return {
            "success": True,
            "message": "Limite criado",
            "limit": UserCustomLimitResponse.from_orm(new_limit)
        }


@router.delete("/{user_id}/limits/{service_name}")
async def delete_user_custom_limit(
    user_id: uuid.UUID,
    service_name: ServiceNameEnum,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Remove limite personalizado de um serviço.
    O usuário voltará a usar os limites padrão do nível KYC.
    """
    limit = db.query(UserCustomLimit).filter(
        UserCustomLimit.user_id == user_id,
        UserCustomLimit.service_name == service_name.value
    ).first()
    
    if not limit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Limite não encontrado"
        )
    
    db.delete(limit)
    db.commit()
    
    return {
        "success": True,
        "message": f"Limite do serviço {service_name.value} removido"
    }


# ============================================================
# CONTROLE DE ACESSO A SERVIÇOS
# ============================================================

@router.post("/{user_id}/access")
async def set_user_service_access(
    user_id: uuid.UUID,
    data: UserServiceAccessCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Define ou atualiza acesso a um serviço específico.
    
    Permite bloquear ou liberar serviços independente do nível KYC.
    """
    ip, user_agent = get_client_info(request)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Verifica se já existe
    existing = db.query(UserServiceAccess).filter(
        UserServiceAccess.user_id == user_id,
        UserServiceAccess.service_name == data.service_name.value
    ).first()
    
    if existing:
        existing.is_allowed = data.is_allowed
        existing.reason = data.reason
        existing.admin_notes = data.admin_notes
        existing.blocked_until = data.blocked_until
        existing.updated_by = admin.id
        existing.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(existing)
        
        return {
            "success": True,
            "message": "Acesso atualizado",
            "access": UserServiceAccessResponse.from_orm(existing)
        }
    else:
        new_access = UserServiceAccess(
            user_id=user_id,
            service_name=data.service_name.value,
            is_allowed=data.is_allowed,
            reason=data.reason,
            admin_notes=data.admin_notes,
            blocked_until=data.blocked_until,
            created_by=admin.id
        )
        
        db.add(new_access)
        db.commit()
        db.refresh(new_access)
        
        return {
            "success": True,
            "message": "Acesso configurado",
            "access": UserServiceAccessResponse.from_orm(new_access)
        }


@router.delete("/{user_id}/access/{service_name}")
async def delete_user_service_access(
    user_id: uuid.UUID,
    service_name: ServiceNameEnum,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Remove configuração de acesso personalizada.
    O usuário voltará a usar as regras padrão do nível KYC.
    """
    access = db.query(UserServiceAccess).filter(
        UserServiceAccess.user_id == user_id,
        UserServiceAccess.service_name == service_name.value
    ).first()
    
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração de acesso não encontrada"
        )
    
    db.delete(access)
    db.commit()
    
    return {
        "success": True,
        "message": f"Configuração de acesso ao serviço {service_name.value} removida"
    }


# ============================================================
# OPERAÇÕES EM LOTE
# ============================================================

@router.post("/bulk/level")
async def bulk_update_kyc_level(
    data: BulkUserKYCUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Atualiza o nível KYC de múltiplos usuários de uma vez.
    
    Máximo de 100 usuários por requisição.
    """
    ip, user_agent = get_client_info(request)
    
    success = []
    errors = []
    
    for user_id in data.user_ids:
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                errors.append({"user_id": str(user_id), "error": "Usuário não encontrado"})
                continue
            
            # Cria nova verificação
            expiration_date = date.today() + timedelta(days=24 * 30)
            
            new_verification = KYCVerification(
                user_id=user_id,
                status=KYCStatus.APPROVED.value,
                level=data.kyc_level.value,
                submitted_at=datetime.utcnow(),
                reviewed_at=datetime.utcnow(),
                approved_at=datetime.utcnow(),
                reviewed_by=admin.id,
                admin_notes=f"Alteração em lote.\nMotivo: {data.reason}",
                auto_approved=False,
                consent_given=True,
                consent_at=datetime.utcnow(),
                expiration_date=expiration_date
            )
            
            db.add(new_verification)
            success.append(str(user_id))
            
        except Exception as e:
            errors.append({"user_id": str(user_id), "error": str(e)})
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{len(success)} usuários atualizados",
        "updated_count": len(success),
        "error_count": len(errors),
        "updated_users": success,
        "errors": errors
    }


# ============================================================
# CONFIGURAÇÕES GLOBAIS DE LIMITES
# ============================================================

@router.get("/config/limits", response_model=AllServicesLimitsResponse)
async def get_all_service_limits(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Retorna todos os limites configurados por serviço e nível.
    
    Consulta primeiro o banco de dados, depois usa defaults como fallback.
    Usado para exibir e editar configurações globais no admin.
    """
    # Busca limites do banco
    db_limits = db.query(KYCServiceLimit).filter(
        KYCServiceLimit.is_active == True
    ).all()
    
    # Mapa para lookup rápido
    db_limits_map = {}
    for limit in db_limits:
        key = f"{limit.service_name}_{limit.kyc_level}"
        db_limits_map[key] = {
            "daily": float(limit.daily_limit) if limit.daily_limit else None,
            "monthly": float(limit.monthly_limit) if limit.monthly_limit else None,
            "per_op": float(limit.per_operation_limit) if limit.per_operation_limit else None,
            "from_db": True
        }
    
    # Monta resposta combinando banco + defaults
    result = {}
    for service_name, levels in DEFAULT_SERVICE_LIMITS.items():
        result[service_name] = {}
        for level_name, default_limits in levels.items():
            key = f"{service_name}_{level_name}"
            if key in db_limits_map:
                # Usa limite do banco
                result[service_name][level_name] = db_limits_map[key]
            else:
                # Usa default
                result[service_name][level_name] = {
                    **default_limits,
                    "from_db": False
                }
    
    return AllServicesLimitsResponse(services=result)


@router.put("/config/limits")
async def update_service_limit_config(
    data: ServiceLimitConfigRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Atualiza configuração de limite padrão para um serviço/nível.
    
    Afeta todos os usuários daquele nível que não têm limite personalizado.
    """
    # Verifica se já existe
    existing = db.query(KYCServiceLimit).filter(
        KYCServiceLimit.service_name == data.service_name.value,
        KYCServiceLimit.kyc_level == data.kyc_level.value
    ).first()
    
    if existing:
        existing.daily_limit = data.daily_limit
        existing.monthly_limit = data.monthly_limit
        existing.per_operation_limit = data.per_operation_limit
        existing.is_active = data.is_active
        existing.updated_at = datetime.utcnow()
    else:
        new_limit = KYCServiceLimit(
            service_name=data.service_name.value,
            kyc_level=data.kyc_level.value,
            daily_limit=data.daily_limit,
            monthly_limit=data.monthly_limit,
            per_operation_limit=data.per_operation_limit,
            is_active=data.is_active
        )
        db.add(new_limit)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Limite do serviço {data.service_name.value} para nível {data.kyc_level.value} atualizado"
    }
