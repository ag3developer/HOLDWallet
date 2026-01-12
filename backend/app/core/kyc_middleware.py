"""
🛡️ KYC Middleware - Decorators para verificação de KYC
======================================================
Decorators e dependências para validar KYC em rotas protegidas.

Author: HOLD Wallet Team
"""

from functools import wraps
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.kyc import KYCVerification, KYCStatus, KYCLevel
from app.services.kyc_service import KYCService


# ============================================================
# DEPENDÊNCIAS FASTAPI
# ============================================================

async def get_user_kyc(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> Optional[KYCVerification]:
    """
    Obtém a verificação KYC do usuário atual.
    Retorna None se não houver verificação.
    """
    service = KYCService(db)
    return await service.get_user_verification(user.id)


async def require_kyc_approved(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> KYCVerification:
    """
    Dependência que exige KYC aprovado.
    
    Uso:
        @router.get("/protected")
        async def protected_route(kyc: KYCVerification = Depends(require_kyc_approved)):
            ...
    """
    service = KYCService(db)
    verification = await service.get_user_verification(user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_NOT_STARTED",
                "message": "Verificação KYC necessária. Por favor, complete sua verificação.",
                "kyc_status": None
            }
        )
    
    if verification.status != KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_NOT_APPROVED",
                "message": _get_status_message(verification.status),
                "kyc_status": verification.status.value,
                "kyc_level": verification.level.value
            }
        )
    
    return verification


async def require_kyc_basic(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> KYCVerification:
    """
    Dependência que exige KYC aprovado nível básico ou superior.
    """
    verification = await _require_kyc_level(db, user, KYCLevel.BASIC)
    return verification


async def require_kyc_intermediate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> KYCVerification:
    """
    Dependência que exige KYC aprovado nível intermediário ou superior.
    """
    verification = await _require_kyc_level(db, user, KYCLevel.INTERMEDIATE)
    return verification


async def require_kyc_advanced(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> KYCVerification:
    """
    Dependência que exige KYC aprovado nível avançado.
    """
    verification = await _require_kyc_level(db, user, KYCLevel.ADVANCED)
    return verification


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

KYC_LEVEL_ORDER = {
    KYCLevel.NONE: 0,
    KYCLevel.BASIC: 1,
    KYCLevel.INTERMEDIATE: 2,
    KYCLevel.ADVANCED: 3
}


async def check_user_kyc_level(
    user_id,
    required_level: KYCLevel,
    db: Session
) -> bool:
    """
    Verifica se um usuário tem KYC aprovado no nível requerido.
    Levanta HTTPException se não tiver.
    
    Args:
        user_id: ID do usuário
        required_level: Nível KYC mínimo requerido
        db: Sessão do banco de dados
        
    Returns:
        True se o usuário tem o nível requerido
        
    Raises:
        HTTPException: Se o usuário não tiver KYC aprovado no nível requerido
    """
    from app.models.kyc import KYCVerification
    
    verification = db.query(KYCVerification).filter(
        KYCVerification.user_id == user_id,
        KYCVerification.status == KYCStatus.APPROVED
    ).first()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_NOT_APPROVED",
                "message": f"Verificação KYC nível {required_level.value} necessária para esta operação.",
                "required_level": required_level.value,
                "current_level": "none"
            }
        )
    
    # Verifica nível
    current_level_order = KYC_LEVEL_ORDER.get(verification.level, 0)
    required_level_order = KYC_LEVEL_ORDER.get(required_level, 0)
    
    if current_level_order < required_level_order:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_LEVEL_INSUFFICIENT",
                "message": f"Seu nível KYC ({verification.level.value}) é insuficiente. Nível {required_level.value} necessário.",
                "required_level": required_level.value,
                "current_level": verification.level.value
            }
        )
    
    return True


async def _require_kyc_level(
    db: Session,
    user: User,
    required_level: KYCLevel
) -> KYCVerification:
    """
    Valida se o usuário tem KYC aprovado no nível requerido ou superior.
    """
    service = KYCService(db)
    verification = await service.get_verification_by_user(user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_NOT_STARTED",
                "message": f"Verificação KYC nível {required_level.value} necessária.",
                "required_level": required_level.value,
                "current_level": "none"
            }
        )
    
    if verification.status != KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_NOT_APPROVED",
                "message": _get_status_message(verification.status),
                "kyc_status": verification.status.value,
                "required_level": required_level.value,
                "current_level": verification.level.value
            }
        )
    
    # Verifica nível
    current_level_order = KYC_LEVEL_ORDER.get(verification.level, 0)
    required_level_order = KYC_LEVEL_ORDER.get(required_level, 0)
    
    if current_level_order < required_level_order:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_LEVEL_INSUFFICIENT",
                "message": f"Seu nível KYC ({verification.level.value}) é insuficiente. Nível {required_level.value} necessário.",
                "required_level": required_level.value,
                "current_level": verification.level.value
            }
        )
    
    return verification


def _get_status_message(status_: KYCStatus) -> str:
    """Retorna mensagem amigável para cada status."""
    messages = {
        KYCStatus.PENDING: "Sua verificação KYC está pendente. Por favor, complete os dados necessários.",
        KYCStatus.SUBMITTED: "Sua verificação KYC está em processamento. Aguarde a análise.",
        KYCStatus.UNDER_REVIEW: "Sua verificação KYC está sendo analisada por nossa equipe.",
        KYCStatus.REJECTED: "Sua verificação KYC foi rejeitada. Verifique os detalhes e tente novamente.",
        KYCStatus.EXPIRED: "Sua verificação KYC expirou. Por favor, realize uma nova verificação.",
        KYCStatus.APPROVED: "KYC aprovado.",
    }
    return messages.get(status_, "Status KYC desconhecido.")


# ============================================================
# VALIDAÇÃO DE LIMITES
# ============================================================

async def check_kyc_limit(
    db: Session,
    user: User,
    service_type: str,
    operation_type: str,
    amount_brl: float
) -> dict:
    """
    Verifica se uma operação está dentro dos limites KYC do usuário.
    
    Args:
        db: Sessão do banco de dados
        user: Usuário
        service_type: Tipo de serviço (instant_trade, p2p, wolkpay, etc)
        operation_type: Tipo de operação (daily, transaction, monthly)
        amount_brl: Valor em BRL
    
    Returns:
        Dict com informações de limite:
        {
            "allowed": bool,
            "kyc_level": str,
            "limit": float,
            "used": float,
            "remaining": float,
            "message": str
        }
    
    Raises:
        HTTPException se operação exceder limite
    """
    from decimal import Decimal
    
    kyc_service = KYCService(db)
    verification = await kyc_service.get_active_verification(user.id)
    
    # Determina nível
    if not verification or verification.status != KYCStatus.APPROVED:
        kyc_level = KYCLevel.NONE
    else:
        kyc_level = verification.level
    
    # Obtém limites do usuário (agora consulta banco de dados)
    limits = await kyc_service.get_user_limits(user.id)
    
    # Encontra limite relevante
    service_limits = limits.get(service_type, {})
    
    # Verifica se o serviço está habilitado
    if not service_limits.get("is_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "SERVICE_BLOCKED",
                "message": f"O serviço {service_type} está bloqueado para sua conta.",
                "kyc_level": kyc_level.value if hasattr(kyc_level, 'value') else str(kyc_level)
            }
        )
    
    # Converte Decimal para float e trata None como ilimitado
    def to_float(val):
        if val is None:
            return None  # None = sem limite
        if isinstance(val, Decimal):
            return float(val)
        return float(val) if val else 0
    
    if operation_type == "transaction":
        limit_value = to_float(service_limits.get("transaction_limit_brl"))
        used_value = 0  # Transação única
    elif operation_type == "daily":
        limit_value = to_float(service_limits.get("daily_limit_brl"))
        # TODO: Calcular usado hoje consultando histórico
        used_value = 0
    elif operation_type == "monthly":
        limit_value = to_float(service_limits.get("monthly_limit_brl"))
        # TODO: Calcular usado no mês consultando histórico
        used_value = 0
    else:
        limit_value = 0
        used_value = 0
    
    # None = sem limite (ilimitado)
    if limit_value is None:
        remaining = float('inf')
        allowed = True
    else:
        remaining = limit_value - used_value
        allowed = amount_brl <= remaining and (limit_value > 0 or limit_value is None)
    
    kyc_level_str = kyc_level.value if hasattr(kyc_level, 'value') else str(kyc_level)
    
    result = {
        "allowed": allowed,
        "kyc_level": kyc_level_str,
        "limit": limit_value if limit_value != float('inf') else None,
        "used": used_value,
        "remaining": remaining if remaining != float('inf') else None,
        "requested": amount_brl,
        "is_unlimited": limit_value is None
    }
    
    if not allowed:
        if limit_value == 0:
            result["message"] = f"Serviço {service_type} não disponível para seu nível KYC ({kyc_level_str}). Complete sua verificação para acessar este serviço."
        elif amount_brl > remaining:
            result["message"] = f"Limite excedido. Disponível: R$ {remaining:,.2f}. Solicitado: R$ {amount_brl:,.2f}."
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "KYC_LIMIT_EXCEEDED",
                **result
            }
        )
    
    return result


# ============================================================
# DECORATOR PARA ROTAS (USO OPCIONAL)
# ============================================================

def require_kyc(level: KYCLevel = KYCLevel.BASIC):
    """
    Decorator para exigir KYC em uma rota.
    
    NOTA: Prefira usar as dependências (require_kyc_basic, etc.)
    Este decorator é para casos especiais.
    
    Uso:
        @router.get("/protected")
        @require_kyc(level=KYCLevel.INTERMEDIATE)
        async def protected_route(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extrai user e db dos kwargs
            user = kwargs.get('user')
            db = kwargs.get('db')
            
            if not user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Configuração incorreta do decorator @require_kyc"
                )
            
            await _require_kyc_level(db, user, level)
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================
# UTILITÁRIOS
# ============================================================

def get_kyc_level_name(level: KYCLevel) -> str:
    """Retorna nome amigável do nível."""
    names = {
        KYCLevel.NONE: "Sem verificação",
        KYCLevel.BASIC: "Básico",
        KYCLevel.INTERMEDIATE: "Intermediário",
        KYCLevel.ADVANCED: "Avançado"
    }
    return names.get(level, "Desconhecido")


def get_kyc_benefits(level: KYCLevel) -> List[str]:
    """Retorna lista de benefícios do nível."""
    benefits = {
        KYCLevel.NONE: [
            "Acesso básico à plataforma",
            "Visualização de cotações"
        ],
        KYCLevel.BASIC: [
            "Instant Trade até R$ 1.000/transação",
            "Limite diário de R$ 3.000",
            "P2P até R$ 5.000/mês"
        ],
        KYCLevel.INTERMEDIATE: [
            "Instant Trade até R$ 50.000/transação",
            "Limite diário de R$ 100.000",
            "P2P até R$ 100.000/mês",
            "WolkPay habilitado",
            "Transferências internacionais"
        ],
        KYCLevel.ADVANCED: [
            "Limites personalizados",
            "Operações de grande volume",
            "Acesso a serviços OTC",
            "Conta empresarial",
            "Suporte prioritário"
        ]
    }
    return benefits.get(level, [])


def get_upgrade_requirements(current_level: KYCLevel) -> dict:
    """Retorna requisitos para upgrade de nível."""
    if current_level == KYCLevel.NONE:
        return {
            "next_level": KYCLevel.BASIC.value,
            "requirements": [
                "CPF válido",
                "Dados pessoais completos",
                "Selfie com documento"
            ]
        }
    elif current_level == KYCLevel.BASIC:
        return {
            "next_level": KYCLevel.INTERMEDIATE.value,
            "requirements": [
                "Comprovante de residência (últimos 3 meses)",
                "Validação biométrica com liveness"
            ]
        }
    elif current_level == KYCLevel.INTERMEDIATE:
        return {
            "next_level": KYCLevel.ADVANCED.value,
            "requirements": [
                "Comprovante de renda",
                "Análise de perfil financeiro"
            ]
        }
    else:
        return {
            "next_level": None,
            "requirements": [],
            "message": "Você já possui o nível máximo de verificação."
        }
