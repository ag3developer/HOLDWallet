"""
💰 EarnPool Revenue Admin Routes
================================

Endpoints administrativos para gerenciar a receita do pool.

Author: WolkNow Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.earnpool_revenue_service import get_earnpool_revenue_service

router = APIRouter(prefix="/admin/earnpool/revenue", tags=["Admin - EarnPool Revenue"])
logger = logging.getLogger(__name__)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency para verificar se o usuário é admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user


# ============================================================================
# TIERS
# ============================================================================

@router.get("/tiers")
async def get_all_tiers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista todos os tiers configurados.
    """
    service = get_earnpool_revenue_service(db)
    tiers = service.get_all_tiers()
    
    return {
        "tiers": [
            {
                "id": tier.id,
                "tier_level": tier.tier_level,
                "name": tier.name,
                "name_key": tier.name_key,
                "min_deposit_usdt": float(tier.min_deposit_usdt),
                "max_deposit_usdt": float(tier.max_deposit_usdt) if tier.max_deposit_usdt else None,
                "pool_share_percentage": float(tier.pool_share_percentage),
                "withdrawal_priority_days": tier.withdrawal_priority_days,
                "early_withdrawal_discount": float(tier.early_withdrawal_discount or 0),
                "badge_color": tier.badge_color,
                "badge_icon": tier.badge_icon,
                "is_active": tier.is_active
            }
            for tier in tiers
        ]
    }


# ============================================================================
# REVENUE POOL
# ============================================================================

@router.get("/summary")
async def get_revenue_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Retorna resumo da receita do período atual.
    
    Mostra:
    - Receita por fonte (WolkPay, Trade, Boletos, Outros)
    - Total acumulado
    - Total já distribuído
    - Saldo restante
    """
    service = get_earnpool_revenue_service(db)
    return service.get_current_revenue_summary()


@router.post("/add")
async def add_revenue(
    amount: float,
    source: str,  # wolkpay, instant_trade, bills, other
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Adiciona receita manualmente ao pool.
    
    Normalmente a receita é adicionada automaticamente pelas operações,
    mas este endpoint permite adicionar manualmente se necessário.
    
    Args:
        amount: Valor em USDT
        source: Fonte (wolkpay, instant_trade, bills, other)
        description: Descrição opcional
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if source not in ["wolkpay", "instant_trade", "bills", "other"]:
        raise HTTPException(status_code=400, detail="Invalid source")
    
    service = get_earnpool_revenue_service(db)
    period = service.add_revenue(Decimal(str(amount)), source, description)
    
    return {
        "success": True,
        "message": f"Added ${amount} from {source}",
        "total_revenue": float(period.total_revenue)
    }


# ============================================================================
# DISTRIBUTION
# ============================================================================

@router.get("/calculate")
async def calculate_distribution(
    period_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Calcula a distribuição de receita por tier.
    
    NÃO distribui, apenas mostra como seria a distribuição.
    Use /distribute para executar.
    """
    service = get_earnpool_revenue_service(db)
    return service.calculate_distribution(period_id)


@router.post("/distribute")
async def distribute_revenue(
    period_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Executa a distribuição de receita para os cooperados.
    
    ⚠️ ATENÇÃO: Esta ação é irreversível!
    
    A distribuição:
    1. Calcula % de cada tier no pool
    2. Distribui proporcionalmente aos cooperados de cada tier
    3. Atualiza rendimentos nos depósitos
    4. Marca período como distribuído
    """
    service = get_earnpool_revenue_service(db)
    result = service.distribute_revenue(period_id, str(admin.id))
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============================================================================
# USER TIER INFO
# ============================================================================

@router.get("/user/{user_id}/tier")
async def get_user_tier(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Retorna informações do tier de um usuário específico.
    """
    service = get_earnpool_revenue_service(db)
    tier_info = service.get_user_tier(user_id)
    
    if not tier_info:
        return {"message": "User has no active deposits", "tier": None}
    
    return tier_info
