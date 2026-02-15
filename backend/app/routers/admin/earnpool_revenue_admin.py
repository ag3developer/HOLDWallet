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
from datetime import datetime
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.earnpool import (
    EarnPoolDeposit, EarnPoolTier, EarnPoolRevenuePool, 
    EarnPoolWithdrawal, EarnPoolConfig, EarnPoolYield
)
from app.services.earnpool_revenue_service import get_earnpool_revenue_service

router = APIRouter(prefix="/admin/earnpool", tags=["Admin - EarnPool"])
logger = logging.getLogger(__name__)


class AddRevenueRequest(BaseModel):
    amount: str
    source: str  # wolkpay, trade, boleto, other
    description: Optional[str] = None


class UpdateTierRequest(BaseModel):
    pool_share_percentage: Optional[float] = None
    min_usdt: Optional[float] = None
    max_usdt: Optional[float] = None
    is_active: Optional[bool] = None


class UpdateConfigRequest(BaseModel):
    min_deposit_usdt: Optional[float] = None
    max_deposit_usdt: Optional[float] = None
    lock_period_days: Optional[int] = None
    withdrawal_delay_days: Optional[int] = None
    early_withdrawal_admin_fee: Optional[float] = None
    early_withdrawal_op_fee: Optional[float] = None
    target_weekly_yield_percentage: Optional[float] = None


class RejectWithdrawalRequest(BaseModel):
    reason: str


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency para verificar se o usuário é admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user


# ============================================================================
# SUMMARY
# ============================================================================

@router.get("/summary")
async def get_earnpool_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Retorna resumo geral do EarnPool para dashboard admin.
    """
    # Total revenue from all periods
    total_revenue = db.query(func.sum(EarnPoolRevenuePool.total_revenue)).scalar() or Decimal(0)
    
    # Pending distribution (current active period)
    current_period = db.query(EarnPoolRevenuePool).filter(
        EarnPoolRevenuePool.status == "accumulating"
    ).first()
    pending_distribution = current_period.available_balance if current_period else Decimal(0)
    
    # Total distributed
    total_distributed = db.query(func.sum(EarnPoolRevenuePool.total_distributed)).scalar() or Decimal(0)
    
    # Last distribution date
    last_dist = db.query(EarnPoolRevenuePool).filter(
        EarnPoolRevenuePool.status == "DISTRIBUTED"
    ).order_by(EarnPoolRevenuePool.distributed_at.desc()).first()
    
    # Total cooperators (active deposits)
    total_cooperators = db.query(func.count(func.distinct(EarnPoolDeposit.user_id))).filter(
        EarnPoolDeposit.status == "ACTIVE"
    ).scalar() or 0
    
    # Total deposited USDT
    total_deposited = db.query(func.sum(EarnPoolDeposit.usdt_amount)).filter(
        EarnPoolDeposit.status == "ACTIVE"
    ).scalar() or Decimal(0)
    
    return {
        "total_revenue": float(total_revenue),
        "pending_distribution": float(pending_distribution),
        "total_distributed": float(total_distributed),
        "last_distribution": last_dist.distributed_at.isoformat() if last_dist and last_dist.distributed_at else None,
        "total_cooperators": total_cooperators,
        "total_deposited_usdt": float(total_deposited)
    }


# ============================================================================
# CONFIG
# ============================================================================

@router.get("/config")
async def get_earnpool_config(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Retorna configurações globais do EarnPool.
    """
    config = db.query(EarnPoolConfig).filter(EarnPoolConfig.is_active == True).first()
    
    if not config:
        # Return defaults if no config exists
        return {
            "id": 0,
            "min_deposit_usdt": 50,
            "max_deposit_usdt": None,
            "lock_period_days": 30,
            "withdrawal_delay_days": 7,
            "early_withdrawal_admin_fee": 5.0,
            "early_withdrawal_op_fee": 5.0,
            "target_weekly_yield_percentage": 0.75,
            "is_active": True
        }
    
    return {
        "id": config.id,
        "min_deposit_usdt": float(config.min_deposit_usdt),
        "max_deposit_usdt": float(config.max_deposit_usdt) if config.max_deposit_usdt else None,
        "lock_period_days": config.lock_period_days,
        "withdrawal_delay_days": config.withdrawal_delay_days,
        "early_withdrawal_admin_fee": float(config.early_withdrawal_admin_fee),
        "early_withdrawal_op_fee": float(config.early_withdrawal_op_fee),
        "target_weekly_yield_percentage": float(config.target_weekly_yield_percentage),
        "is_active": config.is_active
    }


@router.put("/config")
async def update_earnpool_config(
    request: UpdateConfigRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Atualiza configurações globais do EarnPool.
    """
    config = db.query(EarnPoolConfig).filter(EarnPoolConfig.is_active == True).first()
    
    if not config:
        # Create new config
        config = EarnPoolConfig(
            min_deposit_usdt=request.min_deposit_usdt or 50,
            max_deposit_usdt=request.max_deposit_usdt,
            lock_period_days=request.lock_period_days or 30,
            withdrawal_delay_days=request.withdrawal_delay_days or 7,
            early_withdrawal_admin_fee=Decimal(str(request.early_withdrawal_admin_fee or 5)),
            early_withdrawal_op_fee=Decimal(str(request.early_withdrawal_op_fee or 5)),
            target_weekly_yield_percentage=Decimal(str(request.target_weekly_yield_percentage or 0.75)),
            is_active=True
        )
        db.add(config)
    else:
        # Update existing
        if request.min_deposit_usdt is not None:
            config.min_deposit_usdt = Decimal(str(request.min_deposit_usdt))
        if request.max_deposit_usdt is not None:
            config.max_deposit_usdt = Decimal(str(request.max_deposit_usdt)) if request.max_deposit_usdt else None
        if request.lock_period_days is not None:
            config.lock_period_days = request.lock_period_days
        if request.withdrawal_delay_days is not None:
            config.withdrawal_delay_days = request.withdrawal_delay_days
        if request.early_withdrawal_admin_fee is not None:
            config.early_withdrawal_admin_fee = Decimal(str(request.early_withdrawal_admin_fee))
        if request.early_withdrawal_op_fee is not None:
            config.early_withdrawal_op_fee = Decimal(str(request.early_withdrawal_op_fee))
        if request.target_weekly_yield_percentage is not None:
            config.target_weekly_yield_percentage = Decimal(str(request.target_weekly_yield_percentage))
    
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    
    logger.info(f"Admin {admin.email} updated EarnPool config")
    
    return {"success": True, "message": "Configurações atualizadas com sucesso"}


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
    tiers = db.query(EarnPoolTier).order_by(EarnPoolTier.tier_level).all()
    
    return [
        {
            "id": tier.id,
            "level": tier.tier_level,
            "name": tier.name,
            "name_pt": tier.name,  # Usar name como fallback (name_key é para i18n)
            "min_usdt": float(tier.min_deposit_usdt),
            "max_usdt": float(tier.max_deposit_usdt) if tier.max_deposit_usdt else None,
            "pool_share_percentage": float(tier.pool_share_percentage),
            "benefits_en": "",
            "benefits_pt": "",
            "is_active": tier.is_active
        }
        for tier in tiers
    ]


@router.put("/tiers/{tier_id}")
async def update_tier(
    tier_id: int,
    request: UpdateTierRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Atualiza um tier específico.
    """
    tier = db.query(EarnPoolTier).filter(EarnPoolTier.id == tier_id).first()
    
    if not tier:
        raise HTTPException(status_code=404, detail="Tier não encontrado")
    
    if request.pool_share_percentage is not None:
        tier.pool_share_percentage = Decimal(str(request.pool_share_percentage))
    if request.min_usdt is not None:
        tier.min_deposit_usdt = Decimal(str(request.min_usdt))
    if request.max_usdt is not None:
        tier.max_deposit_usdt = Decimal(str(request.max_usdt)) if request.max_usdt else None
    if request.is_active is not None:
        tier.is_active = request.is_active
    
    tier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tier)
    
    logger.info(f"Admin {admin.email} updated tier {tier_id}")
    
    return {"success": True, "message": f"Tier {tier.name} atualizado com sucesso"}


# ============================================================================
# DEPOSITS
# ============================================================================

@router.get("/deposits")
async def get_all_deposits(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista todos os depósitos do EarnPool.
    
    Filtros disponíveis:
    - status: PENDING, ACTIVE, LOCKED, WITHDRAWAL_PENDING, WITHDRAWN, CANCELLED
    - user_email: Email do usuário para filtrar
    """
    from app.models.earnpool import DepositStatus
    
    query = db.query(EarnPoolDeposit)
    
    # Filtro por status - converter string para enum
    if status_filter:
        try:
            status_enum = DepositStatus(status_filter.upper())
            query = query.filter(EarnPoolDeposit.status == status_enum)
        except ValueError:
            # Se o status não for válido, tenta comparar como string
            query = query.filter(EarnPoolDeposit.status == status_filter)
    
    # Filtro por email do usuário
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            query = query.filter(EarnPoolDeposit.user_id == user.id)
        else:
            # Se não encontrar usuário, retorna lista vazia
            return []
    
    total = query.count()
    deposits = query.order_by(EarnPoolDeposit.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for dep in deposits:
        # Get user
        user = db.query(User).filter(User.id == dep.user_id).first()
        
        # Get tier
        tier = db.query(EarnPoolTier).filter(
            EarnPoolTier.is_active == True,
            EarnPoolTier.min_deposit_usdt <= dep.usdt_amount,
            (EarnPoolTier.max_deposit_usdt.is_(None) | (EarnPoolTier.max_deposit_usdt >= dep.usdt_amount))
        ).order_by(EarnPoolTier.min_deposit_usdt.desc()).first()
        
        result.append({
            "id": str(dep.id),
            "user_id": str(dep.user_id),
            "user_email": user.email if user else None,
            "crypto_symbol": dep.crypto_symbol,
            "crypto_amount": float(dep.crypto_amount),
            "usdt_amount": float(dep.usdt_amount),
            "exchange_rate": float(dep.exchange_rate or 0),
            "status": dep.status.value if hasattr(dep.status, 'value') else str(dep.status),
            "deposited_at": dep.created_at.isoformat() if dep.created_at else None,
            "lock_ends_at": dep.lock_ends_at.isoformat() if dep.lock_ends_at else None,
            "total_yield_earned": float(dep.total_yield_earned or 0),
            "tier_level": tier.tier_level if tier else 1,
            "tier_name": tier.name if tier else "Starter"
        })
    
    return result


# ============================================================================
# WITHDRAWALS
# ============================================================================

@router.get("/withdrawals")
async def get_all_withdrawals(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista todas as solicitações de saque do EarnPool.
    """
    query = db.query(EarnPoolWithdrawal)
    
    if status_filter:
        query = query.filter(EarnPoolWithdrawal.status == status_filter)
    
    total = query.count()
    withdrawals = query.order_by(EarnPoolWithdrawal.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for wd in withdrawals:
        # Get user
        user = db.query(User).filter(User.id == wd.user_id).first()
        
        # Get deposit for crypto symbol
        deposit = db.query(EarnPoolDeposit).filter(EarnPoolDeposit.id == wd.deposit_id).first()
        
        result.append({
            "id": str(wd.id),
            "user_id": str(wd.user_id),
            "user_email": user.email if user else None,
            "deposit_id": str(wd.deposit_id),
            "amount_crypto": float(deposit.crypto_amount) if deposit else 0,
            "amount_usdt": float(wd.usdt_amount),
            "crypto_symbol": deposit.crypto_symbol if deposit else "USDT",
            "admin_fee": float(wd.admin_fee_amount or 0),
            "operational_fee": float(wd.operational_fee_amount or 0),
            "net_amount": float(wd.net_amount or wd.usdt_amount),
            "destination_type": wd.destination_type or "wallet",
            "status": wd.status.value if hasattr(wd.status, 'value') else str(wd.status),
            "is_early_withdrawal": wd.is_early_withdrawal or False,
            "requested_at": wd.requested_at.isoformat() if wd.requested_at else None,
            "processed_at": wd.processed_at.isoformat() if wd.processed_at else None,
            "approved_by": str(wd.approved_by) if wd.approved_by else None
        })
    
    return result


@router.put("/withdrawals/{withdrawal_id}/approve")
async def approve_withwithdrawal(
    withdrawal_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Aprova uma solicitação de saque pendente.
    """
    from uuid import UUID
    try:
        wid = UUID(withdrawal_id)
    except:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    withdrawal = db.query(EarnPoolWithdrawal).filter(EarnPoolWithdrawal.id == wid).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    
    status_value = withdrawal.status.value if hasattr(withdrawal.status, 'value') else str(withdrawal.status)
    if status_value != "PENDING":
        raise HTTPException(status_code=400, detail=f"Saque não está pendente (status atual: {status_value})")
    
    from app.models.earnpool import WithdrawalStatus, DepositStatus
    withdrawal.status = WithdrawalStatus.APPROVED
    withdrawal.approved_by = admin.id
    withdrawal.processed_at = datetime.utcnow()
    
    # Update deposit status
    deposit = db.query(EarnPoolDeposit).filter(EarnPoolDeposit.id == withdrawal.deposit_id).first()
    if deposit:
        deposit.status = DepositStatus.WITHDRAWN
    
    db.commit()
    
    logger.info(f"Admin {admin.email} approved withdrawal {withdrawal_id}")
    
    return {"success": True, "message": "Saque aprovado com sucesso"}


@router.put("/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal(
    withdrawal_id: str,
    request: RejectWithdrawalRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Rejeita uma solicitação de saque pendente.
    """
    from uuid import UUID
    from app.models.earnpool import WithdrawalStatus, DepositStatus
    
    try:
        wid = UUID(withdrawal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    withdrawal = db.query(EarnPoolWithdrawal).filter(EarnPoolWithdrawal.id == wid).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    
    status_value = withdrawal.status.value if hasattr(withdrawal.status, 'value') else str(withdrawal.status)
    if status_value != "PENDING":
        raise HTTPException(status_code=400, detail=f"Saque não está pendente (status atual: {status_value})")
    
    withdrawal.status = WithdrawalStatus.REJECTED
    withdrawal.approval_notes = request.reason
    withdrawal.approved_by = admin.id
    withdrawal.processed_at = datetime.utcnow()
    
    # Restore deposit status to active
    deposit = db.query(EarnPoolDeposit).filter(EarnPoolDeposit.id == withdrawal.deposit_id).first()
    if deposit:
        deposit.status = DepositStatus.ACTIVE
    
    db.commit()
    
    logger.info(f"Admin {admin.email} rejected withdrawal {withdrawal_id}: {request.reason}")
    
    return {"success": True, "message": "Saque rejeitado"}


# ============================================================================
# COOPERATORS
# ============================================================================

@router.get("/cooperators")
async def get_cooperators(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista todos os cooperados com seus depósitos ativos.
    """
    # Aggregate deposits by user
    from sqlalchemy import distinct
    
    # Get all active deposits
    deposits = db.query(EarnPoolDeposit).filter(
        EarnPoolDeposit.status == "ACTIVE"
    ).all()
    
    # Aggregate by user
    user_data = {}
    for dep in deposits:
        uid = dep.user_id
        if uid not in user_data:
            user_data[uid] = {
                "total_deposited_usdt": Decimal(0),
                "total_yield_earned": Decimal(0),
                "active_deposits": 0,
                "deposits": []
            }
        user_data[uid]["total_deposited_usdt"] += dep.usdt_amount
        user_data[uid]["total_yield_earned"] += dep.total_yield_earned or Decimal(0)
        user_data[uid]["active_deposits"] += 1
        user_data[uid]["deposits"].append(dep)
    
    # Build result
    result = []
    total_pool = sum(d["total_deposited_usdt"] for d in user_data.values())
    
    for user_id, data in user_data.items():
        user = db.query(User).filter(User.id == user_id).first()
        
        # Get tier based on total deposit
        tier = db.query(EarnPoolTier).filter(
            EarnPoolTier.is_active == True,
            EarnPoolTier.min_deposit_usdt <= data["total_deposited_usdt"],
            (EarnPoolTier.max_deposit_usdt.is_(None) | (EarnPoolTier.max_deposit_usdt >= data["total_deposited_usdt"]))
        ).order_by(EarnPoolTier.min_deposit_usdt.desc()).first()
        
        pool_share = (data["total_deposited_usdt"] / total_pool * 100) if total_pool > 0 else 0
        
        result.append({
            "user_id": user_id,
            "email": user.email if user else "",
            "tier_level": tier.tier_level if tier else 1,
            "tier_name": tier.name if tier else "Starter",
            "total_deposited_usdt": float(data["total_deposited_usdt"]),
            "total_yield_earned": float(data["total_yield_earned"]),
            "active_deposits": data["active_deposits"],
            "pool_share_percentage": float(pool_share)
        })
    
    # Sort by total deposited
    result.sort(key=lambda x: x["total_deposited_usdt"], reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return result[start:end]


# ============================================================================
# DISTRIBUTION
# ============================================================================

@router.get("/distribution/preview")
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
        "amount_to_distribute": float(result.get("total_to_distribute", 0)),
        "cooperators_count": result.get("cooperators_count", 0),
        "preview": result.get("by_tier", [])
    }


@router.post("/distribute")
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
    
    return {
        "success": True,
        "cooperators_paid": result.get("cooperators_paid", 0),
        "total_distributed": result.get("total_distributed", 0)
    }


@router.get("/distributions")
async def get_distributions_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Histórico de distribuições realizadas.
    """
    total = db.query(func.count(EarnPoolRevenuePool.id)).filter(
        EarnPoolRevenuePool.status == "DISTRIBUTED"
    ).scalar() or 0
    
    periods = db.query(EarnPoolRevenuePool).filter(
        EarnPoolRevenuePool.status == "DISTRIBUTED"
    ).order_by(
        EarnPoolRevenuePool.distributed_at.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    
    return [
        {
            "id": period.id,
            "distributed_at": period.distributed_at.isoformat() if period.distributed_at else None,
            "total_amount": float(period.total_distributed or 0),
            "cooperators_count": period.cooperators_count or 0,
            "period_start": period.period_start.isoformat() if period.period_start else None,
            "period_end": period.period_end.isoformat() if period.period_end else None
        }
        for period in periods
    ]


# ============================================================================
# DIAGNÓSTICO
# ============================================================================

@router.get("/diagnostic")
async def get_diagnostic_info(
    user_email: Optional[str] = Query(None, description="Email do usuário para buscar"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Endpoint de diagnóstico para depurar problemas com depósitos.
    
    Retorna informações detalhadas do banco de dados para ajudar a identificar problemas.
    """
    from app.models.earnpool import DepositStatus, WithdrawalStatus
    
    result = {
        "total_deposits_all_status": 0,
        "deposits_by_status": {},
        "total_withdrawals": 0,
        "user_info": None,
        "user_deposits": [],
        "raw_sql_deposits": []
    }
    
    # Contagem total de depósitos
    result["total_deposits_all_status"] = db.query(EarnPoolDeposit).count()
    
    # Contagem por status
    for status in DepositStatus:
        count = db.query(EarnPoolDeposit).filter(
            EarnPoolDeposit.status == status
        ).count()
        result["deposits_by_status"][status.value] = count
    
    # Total de saques
    result["total_withdrawals"] = db.query(EarnPoolWithdrawal).count()
    
    # Se foi fornecido email, buscar dados do usuário
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        
        if user:
            result["user_info"] = {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            }
            
            # Buscar depósitos do usuário
            user_deposits = db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.user_id == user.id
            ).all()
            
            result["user_deposits"] = [
                {
                    "id": str(dep.id),
                    "crypto_symbol": dep.crypto_symbol,
                    "crypto_amount": float(dep.crypto_amount),
                    "usdt_amount": float(dep.usdt_amount),
                    "status": dep.status.value if hasattr(dep.status, 'value') else str(dep.status),
                    "status_raw": str(dep.status),
                    "created_at": dep.created_at.isoformat() if dep.created_at else None,
                    "deposited_at": dep.deposited_at.isoformat() if dep.deposited_at else None,
                    "lock_ends_at": dep.lock_ends_at.isoformat() if dep.lock_ends_at else None,
                    "total_yield_earned": float(dep.total_yield_earned or 0)
                }
                for dep in user_deposits
            ]
        else:
            result["user_info"] = {"error": f"Usuário com email {user_email} não encontrado"}
    
    # Buscar últimos 5 depósitos via SQL raw para comparação
    from sqlalchemy import text
    raw_result = db.execute(text("""
        SELECT id, user_id, crypto_symbol, crypto_amount, usdt_amount, status, created_at
        FROM earnpool_deposits 
        ORDER BY created_at DESC 
        LIMIT 5
    """)).fetchall()
    
    result["raw_sql_deposits"] = [
        {
            "id": str(row[0]),
            "user_id": str(row[1]),
            "crypto_symbol": row[2],
            "crypto_amount": float(row[3]) if row[3] else 0,
            "usdt_amount": float(row[4]) if row[4] else 0,
            "status": str(row[5]),
            "created_at": row[6].isoformat() if row[6] else None
        }
        for row in raw_result
    ]
    
    return result


# ============================================================================
# BLOCKCHAIN TRANSFER - ADMIN
# ============================================================================

class TransferToSystemRequest(BaseModel):
    deposit_id: Optional[str] = None  # Opcional - já vem na URL
    confirm: bool = False  # Precisa confirmar explicitamente


class BulkTransferRequest(BaseModel):
    status_filter: Optional[str] = "LOCKED"  # Status dos depósitos a transferir
    max_transfers: int = 10  # Máximo de transferências por vez
    confirm: bool = False


@router.post("/deposits/{deposit_id}/transfer-to-system")
async def transfer_deposit_to_system_wallet(
    deposit_id: str,
    request: TransferToSystemRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    🔐 TRANSFERÊNCIA ON-CHAIN
    
    Transfere os fundos de um depósito específico da carteira do usuário
    para a carteira do sistema via blockchain.
    
    IMPORTANTE:
    - Esta é uma transferência REAL on-chain
    - Requer gas fees
    - Irreversível após confirmação
    
    Fluxo:
    1. Busca o depósito
    2. Obtém endereço da carteira do sistema
    3. Executa transferência blockchain
    4. Atualiza status do depósito (tx_hash_to_system)
    """
    from app.services.blockchain_withdraw_service import blockchain_withdraw_service
    from app.services.system_blockchain_wallet_service import system_wallet_service
    from app.models.wallet import Wallet
    from app.models.address import Address
    
    # Buscar depósito
    deposit = db.query(EarnPoolDeposit).filter(EarnPoolDeposit.id == deposit_id).first()
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Depósito não encontrado")
    
    # Verificar se já foi transferido
    if deposit.tx_hash_to_system:
        return {
            "success": False,
            "error": "Este depósito já foi transferido para o sistema",
            "tx_hash": deposit.tx_hash_to_system
        }
    
    # Buscar usuário
    user = db.query(User).filter(User.id == deposit.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar carteira do usuário
    user_wallet = db.query(Wallet).filter(
        Wallet.user_id == deposit.user_id,
        Wallet.network == "multi"
    ).first()
    
    if not user_wallet:
        raise HTTPException(status_code=404, detail="Carteira do usuário não encontrada")
    
    # Determinar a rede baseado na crypto
    crypto_symbol = deposit.original_crypto_symbol or deposit.crypto_symbol
    crypto_amount = float(deposit.original_crypto_amount or deposit.crypto_amount or 0)
    
    # Mapeamento de crypto para network
    CRYPTO_TO_NETWORK = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "USDT": "polygon",  # Default USDT na Polygon
        "USDC": "polygon",  # Default USDC na Polygon
        "MATIC": "polygon",
        "POL": "polygon",
        "BNB": "bsc",
        "TRX": "tron",
        "SOL": "solana",
        "LTC": "litecoin",
        "DOGE": "dogecoin",
        "ADA": "cardano",
        "AVAX": "avalanche",
        "DOT": "polkadot",
        "XRP": "xrp",
        "LINK": "ethereum",
        "SHIB": "ethereum",
        "TRAY": "polygon",
    }
    
    network = CRYPTO_TO_NETWORK.get(crypto_symbol.upper(), "polygon")
    
    # Obter endereço do sistema para esta rede
    system_address = system_wallet_service.get_address_for_network(db, network)
    
    if not system_address:
        raise HTTPException(
            status_code=400, 
            detail=f"Sistema não possui endereço configurado para a rede {network}"
        )
    
    # Se não confirmou, retornar preview
    if not request.confirm:
        return {
            "preview": True,
            "deposit_id": deposit_id,
            "user_email": user.email,
            "crypto_symbol": crypto_symbol,
            "crypto_amount": crypto_amount,
            "usdt_value": float(deposit.usdt_amount),
            "network": network,
            "from_wallet_id": str(user_wallet.id),
            "to_address": system_address,
            "message": "Defina confirm=true para executar a transferência"
        }
    
    # Executar transferência on-chain
    try:
        logger.info(f"🔐 Admin {admin.email} iniciando transferência on-chain")
        logger.info(f"   Depósito: {deposit_id}")
        logger.info(f"   Usuário: {user.email}")
        logger.info(f"   Crypto: {crypto_amount} {crypto_symbol}")
        logger.info(f"   Rede: {network}")
        logger.info(f"   Destino: {system_address}")
        
        # Usar o método genérico transfer_to_address
        result = blockchain_withdraw_service.transfer_to_address(
            db=db,
            user_id=str(deposit.user_id),
            amount=crypto_amount,
            symbol=crypto_symbol,
            network=network,
            to_address=system_address,
            description=f"EarnPool transfer to system - Deposit {deposit_id}"
        )
        
        if result.get("success"):
            # Atualizar depósito com tx_hash
            deposit.tx_hash_to_system = result.get("tx_hash")
            deposit.transferred_to_system_at = datetime.utcnow()
            deposit.transferred_by_admin = str(admin.id)
            db.commit()
            
            logger.info(f"✅ Transferência concluída! TX: {result.get('tx_hash')}")
            
            return {
                "success": True,
                "deposit_id": deposit_id,
                "tx_hash": result.get("tx_hash"),
                "amount": crypto_amount,
                "symbol": crypto_symbol,
                "network": network,
                "to_address": system_address,
                "message": "Fundos transferidos com sucesso para a carteira do sistema"
            }
        else:
            error_msg = result.get("error", "Erro desconhecido na transferência")
            logger.error(f"❌ Falha na transferência: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Erro na transferência on-chain: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na transferência: {str(e)}")


@router.post("/deposits/bulk-transfer-to-system")
async def bulk_transfer_to_system_wallet(
    request: BulkTransferRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    🔐 TRANSFERÊNCIA EM LOTE
    
    Transfere múltiplos depósitos pendentes para a carteira do sistema.
    
    Útil para processar vários depósitos de uma vez.
    """
    from app.models.earnpool import DepositStatus
    
    # Buscar depósitos pendentes de transferência
    query = db.query(EarnPoolDeposit).filter(
        EarnPoolDeposit.tx_hash_to_system.is_(None)  # Não transferidos ainda
    )
    
    if request.status_filter:
        try:
            status_enum = DepositStatus(request.status_filter.upper())
            query = query.filter(EarnPoolDeposit.status == status_enum)
        except ValueError:
            query = query.filter(EarnPoolDeposit.status == request.status_filter)
    
    pending_deposits = query.order_by(EarnPoolDeposit.created_at.asc()).limit(request.max_transfers).all()
    
    if not pending_deposits:
        return {
            "success": True,
            "message": "Nenhum depósito pendente de transferência",
            "transferred": 0
        }
    
    # Se não confirmou, retornar preview
    if not request.confirm:
        preview_list = []
        for dep in pending_deposits:
            user = db.query(User).filter(User.id == dep.user_id).first()
            preview_list.append({
                "deposit_id": str(dep.id),
                "user_email": user.email if user else None,
                "crypto_symbol": dep.original_crypto_symbol or dep.crypto_symbol,
                "crypto_amount": float(dep.original_crypto_amount or dep.crypto_amount or 0),
                "usdt_value": float(dep.usdt_amount),
                "status": dep.status.value if hasattr(dep.status, 'value') else str(dep.status)
            })
        
        return {
            "preview": True,
            "deposits_to_transfer": len(preview_list),
            "deposits": preview_list,
            "message": "Defina confirm=true para executar as transferências"
        }
    
    # Executar transferências
    results = {
        "success": [],
        "failed": [],
        "skipped": []
    }
    
    for dep in pending_deposits:
        try:
            # Criar request interno
            transfer_request = TransferToSystemRequest(deposit_id=str(dep.id), confirm=True)
            
            result = await transfer_deposit_to_system_wallet(
                deposit_id=str(dep.id),
                request=transfer_request,
                db=db,
                admin=admin
            )
            
            if result.get("success"):
                results["success"].append({
                    "deposit_id": str(dep.id),
                    "tx_hash": result.get("tx_hash")
                })
            else:
                results["failed"].append({
                    "deposit_id": str(dep.id),
                    "error": result.get("error", "Erro desconhecido")
                })
                
        except HTTPException as e:
            results["failed"].append({
                "deposit_id": str(dep.id),
                "error": e.detail
            })
        except Exception as e:
            results["failed"].append({
                "deposit_id": str(dep.id),
                "error": str(e)
            })
    
    return {
        "success": True,
        "total_processed": len(pending_deposits),
        "transferred": len(results["success"]),
        "failed": len(results["failed"]),
        "results": results
    }


@router.get("/system-wallet/addresses")
async def get_system_wallet_addresses(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Lista os endereços da carteira do sistema para cada rede.
    
    Útil para verificar para onde os fundos serão transferidos.
    """
    from app.services.system_blockchain_wallet_service import system_wallet_service
    
    try:
        result = system_wallet_service.get_or_create_main_wallet(db, admin_user_id=str(admin.id))
        
        return {
            "success": True,
            "wallet_id": result.get("wallet_id"),
            "wallet_name": result.get("name"),
            "is_new": result.get("is_new", False),
            "addresses": result.get("addresses", {}),
            "networks_count": result.get("networks_count", 0)
        }
    except Exception as e:
        logger.exception(f"Erro ao obter endereços do sistema: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter carteira do sistema: {str(e)}")


@router.get("/deposits/{deposit_id}/transfer-status")
async def get_deposit_transfer_status(
    deposit_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Verifica o status de transferência de um depósito específico.
    """
    deposit = db.query(EarnPoolDeposit).filter(EarnPoolDeposit.id == deposit_id).first()
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Depósito não encontrado")
    
    user = db.query(User).filter(User.id == deposit.user_id).first()
    
    return {
        "deposit_id": str(deposit.id),
        "user_email": user.email if user else None,
        "crypto_symbol": deposit.original_crypto_symbol or deposit.crypto_symbol,
        "crypto_amount": float(deposit.original_crypto_amount or deposit.crypto_amount or 0),
        "usdt_amount": float(deposit.usdt_amount),
        "status": deposit.status.value if hasattr(deposit.status, 'value') else str(deposit.status),
        "is_transferred_to_system": deposit.tx_hash_to_system is not None,
        "tx_hash_to_system": deposit.tx_hash_to_system,
        "transferred_at": deposit.transferred_to_system_at.isoformat() if hasattr(deposit, 'transferred_to_system_at') and deposit.transferred_to_system_at else None,
        "transferred_by": deposit.transferred_by_admin if hasattr(deposit, 'transferred_by_admin') else None
    }
