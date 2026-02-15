"""
💰 EarnPool Revenue Admin Routes
================================

Endpoints administrativos para gerenciar a receita do pool.

Author: WolkNow Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.earnpool import EarnPoolDeposit, EarnPoolTier, EarnPoolRevenuePool
from app.services.earnpool_revenue_service import get_earnpool_revenue_service

router = APIRouter(prefix="/admin/earnpool", tags=["Admin - EarnPool"])
logger = logging.getLogger(__name__)


class AddRevenueRequest(BaseModel):
    amount: str
    source: str  # wolkpay, trade, boleto, other
    description: Optional[str] = None


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
        "data": [
            {
                "id": str(tier.id),
                "level": tier.tier_level,
                "name": tier.name,
                "name_key": tier.name_key,
                "min_deposit_usdt": str(tier.min_deposit_usdt),
                "max_deposit_usdt": str(tier.max_deposit_usdt) if tier.max_deposit_usdt else None,
                "pool_share_percentage": str(tier.pool_share_percentage),
                "withdrawal_priority_days": tier.withdrawal_priority_days,
                "early_withdrawal_discount": str(tier.early_withdrawal_discount or 0),
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

@router.get("/revenue/pool")
async def get_revenue_pool(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Retorna informações do pool de receita atual.
    """
    service = get_earnpool_revenue_service(db)
    summary = service.get_current_revenue_summary()
    
    return {
        "data": {
            "available_balance": str(summary.get("available_balance", 0)),
            "total_accumulated": str(summary.get("total_accumulated", 0)),
            "total_distributed": str(summary.get("total_distributed", 0)),
            "by_source": summary.get("by_source", {})
        }
    }


@router.post("/revenue/add")
async def add_revenue(
    request: AddRevenueRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Adiciona receita manualmente ao pool.
    """
    try:
        amount = Decimal(request.amount)
    except:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Mapear sources
    source_map = {
        "wolkpay": "wolkpay",
        "trade": "instant_trade",
        "boleto": "bills",
        "other": "other"
    }
    source = source_map.get(request.source, "other")
    
    service = get_earnpool_revenue_service(db)
    period = service.add_revenue(amount, source, request.description)
    
    return {
        "success": True,
        "message": f"Added ${amount} from {source}",
        "total_revenue": str(period.total_revenue)
    }


# ============================================================================
# COOPERATORS
# ============================================================================

@router.get("/cooperators")
async def get_cooperators(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista todos os cooperados com seus depósitos ativos.
    """
    # Total count
    total = db.query(func.count(EarnPoolDeposit.id)).filter(
        EarnPoolDeposit.status == "active"
    ).scalar() or 0
    
    # Query com join para user e tier
    deposits = db.query(EarnPoolDeposit).filter(
        EarnPoolDeposit.status == "active"
    ).order_by(
        EarnPoolDeposit.usdt_amount.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    
    data = []
    for dep in deposits:
        # Get user info
        user = db.query(User).filter(User.id == dep.user_id).first()
        
        # Get tier info
        tier = db.query(EarnPoolTier).filter(
            EarnPoolTier.is_active == True,
            EarnPoolTier.min_deposit_usdt <= dep.usdt_amount,
            (EarnPoolTier.max_deposit_usdt.is_(None) | (EarnPoolTier.max_deposit_usdt >= dep.usdt_amount))
        ).order_by(EarnPoolTier.min_deposit_usdt.desc()).first()
        
        data.append({
            "id": str(dep.id),
            "user_id": str(dep.user_id),
            "user": {
                "full_name": user.full_name if user else "N/A",
                "email": user.email if user else ""
            } if user else None,
            "crypto_symbol": dep.crypto_symbol,
            "crypto_amount": str(dep.crypto_amount),
            "usdt_amount": str(dep.usdt_amount),
            "tier": {
                "level": tier.tier_level,
                "name": tier.name,
                "pool_share_percentage": str(tier.pool_share_percentage)
            } if tier else None,
            "status": dep.status,
            "created_at": dep.created_at.isoformat() if dep.created_at else None
        })
    
    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


# ============================================================================
# DISTRIBUTION
# ============================================================================

@router.get("/revenue/distribution/preview")
async def preview_distribution(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Preview da distribuição sem executar.
    """
    service = get_earnpool_revenue_service(db)
    result = service.calculate_distribution()
    
    return {
        "data": {
            "pool_available": str(result.get("pool_available", 0)),
            "total_to_distribute": str(result.get("total_to_distribute", 0)),
            "cooperators_count": result.get("cooperators_count", 0),
            "reduction_factor": result.get("reduction_factor", 1),
            "by_tier": result.get("by_tier", [])
        }
    }


@router.post("/revenue/distribute")
async def distribute_revenue(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Executa a distribuição de receita para os cooperados.
    
    ⚠️ ATENÇÃO: Esta ação é irreversível!
    """
    service = get_earnpool_revenue_service(db)
    result = service.distribute_revenue(admin_id=str(admin.id))
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/revenue/distributions")
async def get_distributions_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Histórico de distribuições realizadas.
    """
    # Total count
    total = db.query(func.count(EarnPoolRevenuePool.id)).filter(
        EarnPoolRevenuePool.status == "distributed"
    ).scalar() or 0
    
    # Query
    periods = db.query(EarnPoolRevenuePool).filter(
        EarnPoolRevenuePool.status == "distributed"
    ).order_by(
        EarnPoolRevenuePool.distributed_at.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    
    data = []
    for period in periods:
        data.append({
            "id": str(period.id),
            "period_label": period.period_label,
            "total_distributed": str(period.total_distributed or 0),
            "cooperators_count": period.cooperators_count or 0,
            "status": period.status,
            "distributed_at": period.distributed_at.isoformat() if period.distributed_at else None,
            "created_at": period.created_at.isoformat() if period.created_at else None
        })
    
    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }
