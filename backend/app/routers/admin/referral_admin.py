"""
🎁 Referral Admin Routes - WOLK FRIENDS
========================================
Endpoints administrativos do programa de indicação

@version 1.0.0
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.referral import (
    ReferralCode, Referral, ReferralEarning, ReferralConfig,
    ReferralTier, ReferralStatus
)
from app.services.referral_service import get_referral_service, TIER_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/referral", tags=["admin-referral"])


# ===========================================================================
# SCHEMAS
# ===========================================================================

class ReferralConfigUpdate(BaseModel):
    """Atualização de configuração"""
    min_transaction_to_qualify: Optional[float] = None
    days_to_consider_active: Optional[int] = None
    is_program_active: Optional[bool] = None


class ReferralProgramStats(BaseModel):
    """Estatísticas do programa"""
    total_users_with_codes: int
    total_referrals: int
    active_referrals: int
    pending_referrals: int
    total_earnings_generated: float
    total_earnings_paid: float
    total_earnings_pending: float
    top_referrers: List[dict]
    tier_distribution: dict


# ===========================================================================
# MIDDLEWARE - ADMIN CHECK
# ===========================================================================

async def verify_admin(current_user: User = Depends(get_current_user)):
    """Verifica se o usuário é admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores."
        )
    return current_user


# ===========================================================================
# ENDPOINTS DE ESTATÍSTICAS
# ===========================================================================

@router.get("/stats")
async def get_program_stats(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    📊 Estatísticas gerais do programa de indicação
    """
    # Total de códigos
    total_codes = db.query(ReferralCode).count()
    
    # Total de indicações
    total_referrals = db.query(Referral).count()
    
    # Por status
    active_referrals = db.query(Referral).filter(
        Referral.status == ReferralStatus.ACTIVE
    ).count()
    
    pending_referrals = db.query(Referral).filter(
        Referral.status == ReferralStatus.PENDING
    ).count()
    
    # Ganhos
    total_earnings = db.query(
        func.sum(ReferralEarning.commission_amount)
    ).scalar() or Decimal("0")
    
    paid_earnings = db.query(
        func.sum(ReferralEarning.commission_amount)
    ).filter(ReferralEarning.is_paid == True).scalar() or Decimal("0")
    
    pending_earnings = total_earnings - paid_earnings
    
    # Top referrers
    top_referrers_query = db.query(
        ReferralCode.user_id,
        ReferralCode.code,
        ReferralCode.current_tier,
        ReferralCode.total_referrals,
        ReferralCode.active_referrals,
        ReferralCode.total_earned
    ).order_by(desc(ReferralCode.total_earned)).limit(10).all()
    
    top_referrers = []
    for r in top_referrers_query:
        user = db.query(User).filter(User.id == r.user_id).first()
        top_referrers.append({
            "user_id": str(r.user_id),
            "username": user.username if user else "N/A",
            "code": r.code,
            "tier": r.current_tier.value,
            "total_referrals": r.total_referrals,
            "active_referrals": r.active_referrals,
            "total_earned": float(r.total_earned)
        })
    
    # Distribuição por tier
    tier_distribution = {}
    for tier in ReferralTier:
        count = db.query(ReferralCode).filter(
            ReferralCode.current_tier == tier
        ).count()
        tier_distribution[tier.value] = count
    
    return {
        "total_users_with_codes": total_codes,
        "total_referrals": total_referrals,
        "active_referrals": active_referrals,
        "pending_referrals": pending_referrals,
        "total_earnings_generated": float(total_earnings),
        "total_earnings_paid": float(paid_earnings),
        "total_earnings_pending": float(pending_earnings),
        "top_referrers": top_referrers,
        "tier_distribution": tier_distribution
    }


@router.get("/dashboard")
async def get_admin_dashboard(
    period_days: int = Query(30, ge=1, le=365),
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    📈 Dashboard administrativo com métricas por período
    """
    start_date = datetime.utcnow() - timedelta(days=period_days)
    
    # Novas indicações no período
    new_referrals = db.query(Referral).filter(
        Referral.created_at >= start_date
    ).count()
    
    # Indicações qualificadas no período
    qualified_referrals = db.query(Referral).filter(
        Referral.qualified_at >= start_date
    ).count()
    
    # Ganhos gerados no período
    period_earnings = db.query(
        func.sum(ReferralEarning.commission_amount)
    ).filter(
        ReferralEarning.created_at >= start_date
    ).scalar() or Decimal("0")
    
    # Volume gerado por indicações no período
    period_volume = db.query(
        func.sum(ReferralEarning.transaction_amount)
    ).filter(
        ReferralEarning.created_at >= start_date
    ).scalar() or Decimal("0")
    
    # Taxa média de comissão
    avg_rate = db.query(
        func.avg(ReferralEarning.commission_rate)
    ).filter(
        ReferralEarning.created_at >= start_date
    ).scalar() or Decimal("0")
    
    # Conversão (referências que qualificaram)
    total_in_period = db.query(Referral).filter(
        Referral.created_at >= start_date
    ).count()
    
    conversion_rate = (qualified_referrals / total_in_period * 100) if total_in_period > 0 else 0
    
    return {
        "period_days": period_days,
        "new_referrals": new_referrals,
        "qualified_referrals": qualified_referrals,
        "conversion_rate": round(conversion_rate, 2),
        "period_earnings": float(period_earnings),
        "period_volume": float(period_volume),
        "average_commission_rate": float(round(avg_rate, 2)),
    }


# ===========================================================================
# ENDPOINTS DE GERENCIAMENTO
# ===========================================================================

@router.get("/referrers")
async def list_referrers(
    tier: Optional[str] = None,
    min_referrals: int = 0,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    👥 Lista todos os indicadores
    """
    query = db.query(ReferralCode)
    
    if tier:
        try:
            tier_enum = ReferralTier(tier)
            query = query.filter(ReferralCode.current_tier == tier_enum)
        except ValueError:
            pass
    
    if min_referrals > 0:
        query = query.filter(ReferralCode.total_referrals >= min_referrals)
    
    total = query.count()
    
    referrers = query.order_by(
        desc(ReferralCode.total_earned)
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for r in referrers:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": str(r.id),
            "user_id": str(r.user_id),
            "username": user.username if user else "N/A",
            "email": user.email if user else "N/A",
            "code": r.code,
            "tier": r.current_tier.value,
            "total_referrals": r.total_referrals,
            "active_referrals": r.active_referrals,
            "total_earned": float(r.total_earned),
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat()
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "referrers": result
    }


@router.get("/referrals")
async def list_referrals(
    status_filter: Optional[str] = None,
    referrer_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    📋 Lista todas as indicações
    """
    query = db.query(Referral)
    
    if status_filter:
        try:
            status_enum = ReferralStatus(status_filter)
            query = query.filter(Referral.status == status_enum)
        except ValueError:
            pass
    
    if referrer_id:
        query = query.filter(Referral.referrer_id == referrer_id)
    
    total = query.count()
    
    referrals = query.order_by(
        desc(Referral.created_at)
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for r in referrals:
        referrer = db.query(User).filter(User.id == r.referrer_id).first()
        referred = db.query(User).filter(User.id == r.referred_id).first()
        
        result.append({
            "id": str(r.id),
            "referrer_username": referrer.username if referrer else "N/A",
            "referred_username": referred.username if referred else "N/A",
            "status": r.status.value,
            "created_at": r.created_at.isoformat(),
            "qualified_at": r.qualified_at.isoformat() if r.qualified_at else None,
            "last_activity": r.last_activity_at.isoformat() if r.last_activity_at else None,
            "total_volume": float(r.total_volume_generated),
            "total_commission": float(r.total_commission_paid)
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "referrals": result
    }


@router.get("/earnings")
async def list_earnings(
    is_paid: Optional[bool] = None,
    referrer_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    💰 Lista todos os ganhos
    """
    query = db.query(ReferralEarning)
    
    if is_paid is not None:
        query = query.filter(ReferralEarning.is_paid == is_paid)
    
    if referrer_id:
        query = query.filter(ReferralEarning.referrer_id == referrer_id)
    
    total = query.count()
    
    earnings = query.order_by(
        desc(ReferralEarning.created_at)
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for e in earnings:
        referrer = db.query(User).filter(User.id == e.referrer_id).first()
        
        result.append({
            "id": str(e.id),
            "referrer_username": referrer.username if referrer else "N/A",
            "transaction_type": e.transaction_type,
            "transaction_amount": float(e.transaction_amount),
            "fee_amount": float(e.fee_amount),
            "commission_rate": float(e.commission_rate),
            "commission_amount": float(e.commission_amount),
            "tier": e.tier_at_earning.value,
            "is_paid": e.is_paid,
            "paid_at": e.paid_at.isoformat() if e.paid_at else None,
            "created_at": e.created_at.isoformat()
        })
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "earnings": result
    }


# ===========================================================================
# ENDPOINTS DE CONFIGURAÇÃO
# ===========================================================================

@router.get("/config")
async def get_config(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    ⚙️ Obtém configuração atual do programa
    """
    config = db.query(ReferralConfig).first()
    
    if not config:
        # Retorna valores padrão
        return {
            "is_program_active": True,
            "min_transaction_to_qualify": 1.0,
            "days_to_consider_active": 30,
            "tiers": [
                {
                    "tier": tier.value,
                    "min_referrals": TIER_CONFIG[tier]["min_referrals"],
                    "commission_rate": float(TIER_CONFIG[tier]["commission_rate"])
                }
                for tier in ReferralTier
            ]
        }
    
    return {
        "is_program_active": config.is_program_active,
        "min_transaction_to_qualify": float(config.min_transaction_to_qualify),
        "days_to_consider_active": config.days_to_consider_active,
        "tiers": [
            {
                "tier": tier.value,
                "min_referrals": TIER_CONFIG[tier]["min_referrals"],
                "commission_rate": float(TIER_CONFIG[tier]["commission_rate"])
            }
            for tier in ReferralTier
        ]
    }


@router.put("/config")
async def update_config(
    update: ReferralConfigUpdate,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    ⚙️ Atualiza configuração do programa
    """
    config = db.query(ReferralConfig).first()
    
    if not config:
        config = ReferralConfig()
        db.add(config)
    
    if update.min_transaction_to_qualify is not None:
        config.min_transaction_to_qualify = Decimal(str(update.min_transaction_to_qualify))
    
    if update.days_to_consider_active is not None:
        config.days_to_consider_active = update.days_to_consider_active
    
    if update.is_program_active is not None:
        config.is_program_active = update.is_program_active
    
    config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(config)
    
    logger.info(f"⚙️ Configuração do programa de indicação atualizada por {admin.username}")
    
    return {
        "success": True,
        "message": "Configuração atualizada com sucesso"
    }


# ===========================================================================
# AÇÕES ADMINISTRATIVAS
# ===========================================================================

@router.post("/process-inactive")
async def process_inactive_referrals(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    🔄 Processa indicações inativas (marca como inativas as que não transacionaram há 30+ dias)
    """
    service = get_referral_service(db)
    count = service.check_and_update_inactive_referrals()
    
    logger.info(f"🔄 {count} indicações marcadas como inativas por {admin.username}")
    
    return {
        "success": True,
        "inactive_count": count,
        "message": f"{count} indicações marcadas como inativas"
    }


@router.post("/mark-earnings-paid")
async def mark_earnings_paid(
    earning_ids: List[str],
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    ✅ Marca ganhos como pagos
    """
    count = 0
    for earning_id in earning_ids:
        earning = db.query(ReferralEarning).filter(
            ReferralEarning.id == earning_id
        ).first()
        
        if earning and not earning.is_paid:
            earning.is_paid = True
            earning.paid_at = datetime.utcnow()
            count += 1
    
    db.commit()
    
    logger.info(f"✅ {count} ganhos marcados como pagos por {admin.username}")
    
    return {
        "success": True,
        "paid_count": count,
        "message": f"{count} ganhos marcados como pagos"
    }


@router.post("/deactivate-code/{code_id}")
async def deactivate_code(
    code_id: str,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    🚫 Desativa um código de indicação
    """
    code = db.query(ReferralCode).filter(ReferralCode.id == code_id).first()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Código não encontrado"
        )
    
    code.is_active = False
    db.commit()
    
    logger.warning(f"🚫 Código {code.code} desativado por {admin.username}")
    
    return {
        "success": True,
        "message": f"Código {code.code} desativado"
    }


@router.post("/activate-code/{code_id}")
async def activate_code(
    code_id: str,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """
    ✅ Reativa um código de indicação
    """
    code = db.query(ReferralCode).filter(ReferralCode.id == code_id).first()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Código não encontrado"
        )
    
    code.is_active = True
    db.commit()
    
    logger.info(f"✅ Código {code.code} reativado por {admin.username}")
    
    return {
        "success": True,
        "message": f"Código {code.code} reativado"
    }
