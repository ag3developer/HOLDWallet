"""
🎁 Referral API Routes - WOLK FRIENDS
======================================
Endpoints do programa de indicação

@version 1.0.0
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.referral_service import get_referral_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/referral", tags=["referral"])


# ===========================================================================
# SCHEMAS
# ===========================================================================

class ReferralCodeResponse(BaseModel):
    """Resposta com código de indicação"""
    referral_code: str
    current_tier: str
    commission_rate: float
    share_link: str


class ReferralStatsResponse(BaseModel):
    """Estatísticas completas do programa"""
    referral_code: str
    current_tier: str
    commission_rate: float
    total_referrals: int
    active_referrals: int
    pending_referrals: int
    inactive_referrals: int
    total_earned: float
    pending_earnings: float
    next_tier: Optional[str]
    referrals_to_next_tier: int


class ReferralEarningItem(BaseModel):
    """Item de ganho"""
    id: str
    transaction_type: str
    transaction_amount: float
    fee_amount: float
    commission_rate: float
    commission_amount: float
    tier: str
    is_paid: bool
    created_at: str


class ReferralItem(BaseModel):
    """Item de indicado"""
    id: str
    referred_username: str
    status: str
    created_at: str
    qualified_at: Optional[str]
    last_activity: Optional[str]
    total_volume: float
    total_commission: float


class ApplyReferralCodeRequest(BaseModel):
    """Request para aplicar código"""
    referral_code: str = Field(..., min_length=5, max_length=20)


class ProgramInfoResponse(BaseModel):
    """Informações do programa"""
    is_active: bool
    tiers: List[dict]
    rules: dict


# ===========================================================================
# ENDPOINTS PÚBLICOS
# ===========================================================================

@router.get("/program-info", response_model=ProgramInfoResponse)
async def get_program_info(db: Session = Depends(get_db)):
    """
    📖 Obtém informações públicas do programa de indicação
    
    Retorna:
    - Status do programa
    - Lista de tiers e suas comissões
    - Regras do programa
    """
    service = get_referral_service(db)
    return service.get_program_info()


@router.get("/validate/{code}")
async def validate_referral_code(code: str, db: Session = Depends(get_db)):
    """
    ✅ Valida se um código de indicação existe e está ativo
    
    Retorna:
    - valid: true/false
    - referrer_username (mascarado): se válido
    """
    service = get_referral_service(db)
    referral_code = service.get_referral_code_by_code(code)
    
    if not referral_code:
        return {"valid": False}
    
    # Busca username do indicador (mascarado)
    referrer = db.query(User).filter(User.id == referral_code.user_id).first()
    masked_username = "***" + referrer.username[-3:] if referrer else "***"
    
    return {
        "valid": True,
        "referrer_username": masked_username,
        "tier": referral_code.current_tier.value
    }


# ===========================================================================
# ENDPOINTS AUTENTICADOS
# ===========================================================================

@router.get("/code", response_model=ReferralCodeResponse)
async def get_my_referral_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔑 Obtém meu código de indicação
    
    Gera automaticamente se não existir.
    """
    service = get_referral_service(db)
    
    try:
        referral_code = service.get_or_create_referral_code(str(current_user.id))
        
        # Monta link de compartilhamento usando o username
        # Usa FRONTEND_URL para funcionar em dev e prod
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_link = f"{base_url}/register?ref={referral_code.code}"
        
        from app.services.referral_service import TIER_CONFIG
        
        return ReferralCodeResponse(
            referral_code=referral_code.code,
            current_tier=referral_code.current_tier.value,
            commission_rate=float(TIER_CONFIG[referral_code.current_tier]["commission_rate"]),
            share_link=share_link
        )
    except Exception as e:
        logger.error(f"Erro ao obter código de indicação: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter código de indicação"
        )


@router.get("/stats", response_model=ReferralStatsResponse)
async def get_my_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    📊 Obtém estatísticas do meu programa de indicação
    
    Retorna:
    - Tier atual e comissão
    - Total de indicados por status
    - Ganhos totais e pendentes
    - Progresso para próximo tier
    """
    service = get_referral_service(db)
    
    try:
        stats = service.get_user_referral_stats(str(current_user.id))
        return ReferralStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter estatísticas"
        )


@router.get("/earnings", response_model=List[ReferralEarningItem])
async def get_my_earnings(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    💰 Lista meus ganhos de indicação
    
    Query params:
    - limit: Número máximo de resultados (default: 20)
    """
    if limit > 100:
        limit = 100
    
    service = get_referral_service(db)
    
    try:
        earnings = service.get_recent_earnings(str(current_user.id), limit)
        return earnings
    except Exception as e:
        logger.error(f"Erro ao obter ganhos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter ganhos"
        )


@router.get("/list", response_model=List[ReferralItem])
async def get_my_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    👥 Lista meus indicados
    
    Retorna todos os usuários indicados com status e estatísticas.
    Usernames são mascarados para privacidade.
    """
    service = get_referral_service(db)
    
    try:
        referrals = service.get_referral_list(str(current_user.id))
        return referrals
    except Exception as e:
        logger.error(f"Erro ao obter indicados: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter lista de indicados"
        )


@router.post("/apply")
async def apply_referral_code(
    request: ApplyReferralCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🎫 Aplica um código de indicação
    
    Só pode ser usado uma vez por usuário.
    Normalmente usado durante o registro.
    """
    service = get_referral_service(db)
    
    try:
        # Verifica se usuário já tem indicação
        from app.models.referral import Referral
        existing = db.query(Referral).filter(
            Referral.referred_id == str(current_user.id)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você já utilizou um código de indicação"
            )
        
        # Aplica o código
        referral = service.register_referral(
            str(current_user.id),
            request.referral_code
        )
        
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de indicação inválido ou expirado"
            )
        
        return {
            "success": True,
            "message": "Código de indicação aplicado com sucesso!"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao aplicar código: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao aplicar código de indicação"
        )


# ===========================================================================
# ENDPOINT DE DASHBOARD (RESUMO)
# ===========================================================================

@router.get("/dashboard")
async def get_referral_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🎯 Dashboard completo do programa de indicação
    
    Combina:
    - Código de indicação
    - Estatísticas
    - Últimos ganhos
    - Lista de indicados recentes
    - Informações do programa
    """
    service = get_referral_service(db)
    
    try:
        stats = service.get_user_referral_stats(str(current_user.id))
        earnings = service.get_recent_earnings(str(current_user.id), 5)
        referrals = service.get_referral_list(str(current_user.id))[:5]
        program_info = service.get_program_info()
        
        # Link de compartilhamento - usa FRONTEND_URL para funcionar em dev e prod
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_link = f"{base_url}/register?ref={stats['referral_code']}"
        
        return {
            "referral_code": stats["referral_code"],
            "share_link": share_link,
            "tier": {
                "current": stats["current_tier"],
                "commission_rate": stats["commission_rate"],
                "next": stats["next_tier"],
                "progress": {
                    "current_active": stats["active_referrals"],
                    "needed_for_next": stats["referrals_to_next_tier"],
                }
            },
            "stats": {
                "total_referrals": stats["total_referrals"],
                "active_referrals": stats["active_referrals"],
                "pending_referrals": stats["pending_referrals"],
                "inactive_referrals": stats["inactive_referrals"],
            },
            "earnings": {
                "total": stats["total_earned"],
                "pending": stats["pending_earnings"],
                "recent": earnings
            },
            "recent_referrals": referrals,
            "program_tiers": program_info["tiers"],
        }
    except Exception as e:
        logger.error(f"Erro ao obter dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter dashboard"
        )
