"""
💰 EarnPool - Admin API Routes
==============================

Endpoints administrativos do EarnPool.

Author: WolkNow Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.earnpool import (
    EarnPoolConfig, EarnPoolDeposit, EarnPoolWithdrawal, EarnPoolYield,
    EarnPoolVirtualCredit, EarnPoolPerformanceFee,
    DepositStatus, WithdrawalStatus, YieldStatus
)
from app.services.earnpool_service import get_earnpool_service, EarnPoolService
from app.schemas.earnpool import (
    EarnPoolConfigResponse, EarnPoolConfigUpdate,
    DepositResponse, WithdrawalResponse,
    AdminPoolOverviewResponse, AdminDepositListResponse,
    AdminWithdrawalApproveRequest, ProcessYieldsRequest, ProcessYieldsResponse,
    VirtualCreditCreateRequest, VirtualCreditResponse, VirtualCreditAdjustRequest,
    PerformanceFeeCalculateRequest, PerformanceFeeResponse
)

router = APIRouter(prefix="/admin/earnpool", tags=["Admin - EarnPool"])
logger = logging.getLogger(__name__)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Middleware para verificar se usuário é admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ============================================================================
# SEARCH USERS (para encontrar UUID)
# ============================================================================

@router.get("/search-users")
async def search_users(
    query: str = Query(None, description="Buscar por email ou username"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Buscar usuários para encontrar UUID.
    
    Útil para admin creditar investidores manualmente.
    Busca por email ou username (parcial).
    
    Returns lista de usuários com id, email, username.
    """
    from sqlalchemy import or_
    
    users_query = db.query(User)
    
    if query and query.strip():
        search = f"%{query.strip()}%"
        users_query = users_query.filter(
            or_(
                User.email.ilike(search),
                User.username.ilike(search)
            )
        )
    
    users = users_query.order_by(User.created_at.desc()).limit(limit).all()
    
    return {
        "success": True,
        "count": len(users),
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
    }


# ============================================================================
# OVERVIEW
# ============================================================================

@router.get("/overview", response_model=AdminPoolOverviewResponse)
async def get_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Get EarnPool overview for admin dashboard.
    
    Returns:
    - Total pool value
    - Active deposits count
    - Total users
    - Pending withdrawals
    - Total yields distributed
    - Current config
    """
    service = get_earnpool_service(db)
    return service.get_admin_overview()


# ============================================================================
# CONFIG
# ============================================================================

@router.get("/config", response_model=EarnPoolConfigResponse)
async def get_config(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get current EarnPool configuration"""
    service = get_earnpool_service(db)
    return service.get_or_create_config()


@router.put("/config", response_model=EarnPoolConfigResponse)
async def update_config(
    updates: EarnPoolConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Update EarnPool configuration.
    
    Creates a new config version (old one is deactivated for audit trail).
    
    Configurable:
    - Minimum/maximum deposit
    - Lock period
    - Withdrawal delay
    - Early withdrawal fees
    - Target yield percentage
    - Pool size limit
    - Whether accepting deposits
    """
    service = get_earnpool_service(db)
    
    try:
        new_config = service.update_config(
            updates=updates.dict(exclude_unset=True),
            admin_id=str(admin.id)
        )
        logger.info(f"📝 EarnPool config updated by admin {admin.id}")
        return new_config
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DEPOSITS
# ============================================================================

@router.get("/deposits")
async def list_deposits(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    List all EarnPool deposits.
    
    Filters:
    - status: PENDING, ACTIVE, LOCKED, WITHDRAWAL_PENDING, WITHDRAWN, CANCELLED
    - user_id: Filter by specific user
    """
    query = db.query(EarnPoolDeposit)
    
    if status_filter:
        try:
            status_enum = DepositStatus(status_filter.upper())
            query = query.filter(EarnPoolDeposit.status == status_enum)
        except ValueError:
            pass
    
    if user_id:
        query = query.filter(EarnPoolDeposit.user_id == user_id)
    
    total = query.count()
    deposits = query.order_by(EarnPoolDeposit.deposited_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    
    return {
        "deposits": [DepositResponse.from_orm(d) for d in deposits],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.get("/deposit/{deposit_id}", response_model=DepositResponse)
async def get_deposit(
    deposit_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get details of a specific deposit"""
    deposit = db.query(EarnPoolDeposit).filter(
        EarnPoolDeposit.id == deposit_id
    ).first()
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    return deposit


# ============================================================================
# WITHDRAWALS
# ============================================================================

@router.get("/withdrawals")
async def list_withdrawals(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    early_only: bool = Query(False, description="Show only early withdrawals"),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    List all EarnPool withdrawals.
    
    Filters:
    - status: PENDING, PROCESSING, APPROVED, COMPLETED, CANCELLED, REJECTED
    - early_only: Show only early withdrawals (need approval)
    - user_id: Filter by specific user
    """
    query = db.query(EarnPoolWithdrawal)
    
    if status_filter:
        try:
            status_enum = WithdrawalStatus(status_filter.upper())
            query = query.filter(EarnPoolWithdrawal.status == status_enum)
        except ValueError:
            pass
    
    if early_only:
        query = query.filter(EarnPoolWithdrawal.is_early_withdrawal == True)
    
    if user_id:
        query = query.filter(EarnPoolWithdrawal.user_id == user_id)
    
    total = query.count()
    withdrawals = query.order_by(EarnPoolWithdrawal.requested_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    
    return {
        "withdrawals": [WithdrawalResponse.from_orm(w) for w in withdrawals],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.post("/withdrawal/approve")
async def approve_withdrawal(
    request: AdminWithdrawalApproveRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Approve or reject an early withdrawal.
    
    Only applicable for early withdrawals (before lock period ends).
    """
    service = get_earnpool_service(db)
    
    try:
        withdrawal = service.approve_early_withdrawal(
            withdrawal_id=request.withdrawal_id,
            admin_id=str(admin.id),
            approve=request.approve,
            notes=request.notes
        )
        
        action = "approved" if request.approve else "rejected"
        logger.info(f"📝 Early withdrawal {request.withdrawal_id} {action} by admin {admin.id}")
        
        return {
            "success": True,
            "message": f"Withdrawal {action}",
            "withdrawal": WithdrawalResponse.from_orm(withdrawal)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# YIELDS
# ============================================================================

@router.get("/yields")
async def list_yields(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    List all yield distributions.
    """
    query = db.query(EarnPoolYield)
    
    if status_filter:
        try:
            status_enum = YieldStatus(status_filter.upper())
            query = query.filter(EarnPoolYield.status == status_enum)
        except ValueError:
            pass
    
    total = query.count()
    yields = query.order_by(EarnPoolYield.week_start.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    
    return {
        "yields": yields,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.post("/yields/process", response_model=ProcessYieldsResponse)
async def process_yields(
    request: ProcessYieldsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Process and distribute weekly yields.
    
    This should be run weekly by admin with:
    - Platform revenue for the week
    - Breakdown by source (OTC, bills, recharge, other)
    - Percentage to distribute to pool
    
    The system will:
    1. Calculate total pool value
    2. Calculate yield for each user proportionally
    3. Credit yields to user deposits
    4. Update deposit statuses (LOCKED → ACTIVE if lock ended)
    """
    service = get_earnpool_service(db)
    
    try:
        result = service.process_weekly_yields(
            admin_id=str(admin.id),
            request=request
        )
        
        logger.info(f"💰 Weekly yields processed: ${result.total_yield_distributed} distributed to {result.distributions_count} deposits")
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing yields: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yields/{yield_id}")
async def get_yield_details(
    yield_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get details of a specific yield distribution, including individual distributions."""
    from app.models.earnpool import EarnPoolYieldDistribution
    
    yield_record = db.query(EarnPoolYield).filter(
        EarnPoolYield.id == yield_id
    ).first()
    
    if not yield_record:
        raise HTTPException(status_code=404, detail="Yield record not found")
    
    distributions = db.query(EarnPoolYieldDistribution).filter(
        EarnPoolYieldDistribution.yield_id == yield_id
    ).all()
    
    return {
        "yield": yield_record,
        "distributions": distributions,
        "distributions_count": len(distributions)
    }


# ============================================================================
# STATISTICS
# ============================================================================

@router.get("/stats")
async def get_statistics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Get detailed EarnPool statistics.
    """
    # Total deposits by status
    deposits_by_status = db.query(
        EarnPoolDeposit.status,
        func.count(EarnPoolDeposit.id),
        func.sum(EarnPoolDeposit.usdt_amount)
    ).group_by(EarnPoolDeposit.status).all()
    
    # Total withdrawals by status
    withdrawals_by_status = db.query(
        EarnPoolWithdrawal.status,
        func.count(EarnPoolWithdrawal.id),
        func.sum(EarnPoolWithdrawal.net_amount)
    ).group_by(EarnPoolWithdrawal.status).all()
    
    # Total yields distributed
    total_yields = db.query(func.sum(EarnPoolYield.total_yield_distributed)).filter(
        EarnPoolYield.status == YieldStatus.DISTRIBUTED
    ).scalar() or Decimal("0")
    
    # Average yield percentage
    avg_yield_pct = db.query(func.avg(EarnPoolYield.effective_yield_percentage)).filter(
        EarnPoolYield.status == YieldStatus.DISTRIBUTED
    ).scalar() or Decimal("0")
    
    # Top depositors
    top_depositors = db.query(
        EarnPoolDeposit.user_id,
        func.sum(EarnPoolDeposit.usdt_amount + EarnPoolDeposit.total_yield_earned).label('total')
    ).filter(
        EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
    ).group_by(EarnPoolDeposit.user_id).order_by(
        func.sum(EarnPoolDeposit.usdt_amount + EarnPoolDeposit.total_yield_earned).desc()
    ).limit(10).all()
    
    return {
        "deposits_by_status": [
            {"status": str(s.value), "count": c, "amount": float(a or 0)}
            for s, c, a in deposits_by_status
        ],
        "withdrawals_by_status": [
            {"status": str(s.value), "count": c, "amount": float(a or 0)}
            for s, c, a in withdrawals_by_status
        ],
        "total_yields_distributed": float(total_yields),
        "average_weekly_yield_pct": float(avg_yield_pct),
        "top_depositors": [
            {"user_id": uid, "total_balance": float(t)}
            for uid, t in top_depositors
        ]
    }


# ============================================================================
# VIRTUAL CREDITS & PERFORMANCE FEES (NEW)
# ============================================================================

@router.get("/investor/{user_id}/credits")
async def get_investor_credits(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Buscar todos os créditos virtuais e taxas de performance de um investidor.
    """
    from app.models.earnpool import EarnPoolVirtualCredit, EarnPoolPerformanceFee
    
    # Verificar se usuário existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar créditos virtuais
    virtual_credits = db.query(EarnPoolVirtualCredit).filter(
        EarnPoolVirtualCredit.user_id == user_id
    ).order_by(EarnPoolVirtualCredit.credited_at.desc()).all()
    
    # Buscar taxas de performance
    performance_fees = db.query(EarnPoolPerformanceFee).filter(
        EarnPoolPerformanceFee.user_id == user_id
    ).order_by(EarnPoolPerformanceFee.created_at.desc()).all()
    
    # Calcular totais
    total_virtual_credits = sum(float(vc.usdt_amount) for vc in virtual_credits)
    total_yield_earned = sum(float(vc.total_yield_earned or 0) for vc in virtual_credits)
    total_yield_available = sum(float(vc.total_yield_earned or 0) - float(vc.yield_withdrawn or 0) for vc in virtual_credits)
    total_performance_fees = sum(float(pf.fee_amount_usdt) for pf in performance_fees)
    
    # Calcular valores bloqueados vs disponíveis
    # Usar datetime.now() naive para comparar com lock_ends_at do banco (que pode ser naive)
    now = datetime.now()
    
    def is_locked(vc) -> bool:
        """Verifica se o crédito está bloqueado, tratando timezones"""
        if not vc.lock_ends_at:
            return False
        lock_ends = vc.lock_ends_at
        # Se lock_ends_at for aware, converte para naive (UTC)
        if hasattr(lock_ends, 'tzinfo') and lock_ends.tzinfo is not None:
            lock_ends = lock_ends.replace(tzinfo=None)
        return now < lock_ends
    
    total_locked = sum(float(vc.usdt_amount) for vc in virtual_credits if is_locked(vc))
    total_unlocked = sum(float(vc.usdt_amount) for vc in virtual_credits if not is_locked(vc))
    
    return {
        "success": True,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username
        },
        "summary": {
            "total_virtual_credits_usdt": total_virtual_credits,
            "total_yield_earned_usdt": total_yield_earned,
            "total_yield_available_usdt": total_yield_available,  # Yield disponível para saque
            "total_performance_fees_usdt": total_performance_fees,
            "total_locked_usdt": total_locked,      # Principal bloqueado
            "total_unlocked_usdt": total_unlocked,  # Principal desbloqueado
            "grand_total_usdt": total_virtual_credits + total_performance_fees
        },
        "virtual_credits": [
            {
                "id": str(vc.id),
                "usdt_amount": float(vc.usdt_amount),
                "reason": vc.reason,
                "reason_details": vc.reason_details,
                "total_yield_earned": float(vc.total_yield_earned or 0),
                "yield_withdrawn": float(vc.yield_withdrawn or 0),
                "yield_available": float(vc.total_yield_earned or 0) - float(vc.yield_withdrawn or 0),
                "principal_withdrawn": float(vc.principal_withdrawn or 0),
                "credited_at": vc.credited_at.isoformat() if vc.credited_at else None,
                "is_active": vc.is_active,
                "status": vc.status or "LOCKED",
                "lock_period_days": vc.lock_period_days or 180,
                "lock_ends_at": vc.lock_ends_at.isoformat() if vc.lock_ends_at else None,
                "is_locked": vc.lock_ends_at and now < vc.lock_ends_at,
                "days_until_unlock": max(0, (vc.lock_ends_at - now).days) if vc.lock_ends_at and now < vc.lock_ends_at else 0,
                "notes": vc.notes
            }
            for vc in virtual_credits
        ],
        "performance_fees": [
            {
                "id": str(pf.id),
                "base_amount_usdt": float(pf.base_amount_usdt),
                "performance_percentage": float(pf.performance_percentage),
                "fee_amount_usdt": float(pf.fee_amount_usdt),
                "period_description": pf.period_description,
                "status": pf.status,
                "created_at": pf.created_at.isoformat() if pf.created_at else None,
                "notes": pf.notes
            }
            for pf in performance_fees
        ]
    }


@router.post("/investor/virtual-credit")
async def create_investor_virtual_credit(
    request: VirtualCreditCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Criar crédito virtual para um investidor que não foi processado automaticamente.
    
    Exemplo de uso:
    - Investidor depositou 2.779 USDT mas o sistema não processou automaticamente
    - Admin cria um crédito virtual para registrar o valor no pool
    - Investidor passa a gerar rendimentos normalmente
    
    Request:
    {
        "user_id": "uuid-do-usuario",
        "usdt_amount": 2779.00,
        "reason": "INVESTOR_CORRECTION",
        "reason_details": "Investidor que entrou por fora do sistema automático",
        "notes": "Referência de contato: João Silva"
    }
    """
    service = get_earnpool_service(db)
    
    try:
        virtual_credit, message = service.create_virtual_credit(
            user_id=request.user_id,
            usdt_amount=request.usdt_amount,
            reason=request.reason,
            admin_id=str(admin.id),
            reason_details=request.reason_details,
            notes=request.notes,
            lock_period_days=request.lock_period_days
        )
        
        logger.info(f"💰 Investor virtual credit created: ${request.usdt_amount} for user {request.user_id}")
        
        return {
            "success": True,
            "message": message,
            "virtual_credit": VirtualCreditResponse.from_orm(virtual_credit)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating virtual credit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investor/performance-fee")
async def create_investor_performance_fee(
    request: PerformanceFeeCalculateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Calcular e creditar taxa de performance para um investidor.
    
    Paga performance sobre operações passadas baseado em % do montante em custódia.
    Cria automaticamente um virtual credit com o valor calculado.
    
    Exemplo de uso:
    - Investidor em custódia: 2.779 USDT
    - Taxa de performance: 0.35%
    - Valor pago: 2.779 * 0.35% = 9.73 USDT
    - Sistema cria virtual credit de 9.73 USDT para o investidor
    
    Request:
    {
        "user_id": "uuid-do-usuario",
        "base_amount_usdt": 2779.00,
        "performance_percentage": 0.35,
        "period_description": "Operações Passadas 2024",
        "notes": "Primeira distribuição de performance"
    }
    """
    service = get_earnpool_service(db)
    
    try:
        performance_fee, virtual_credit, total_credited = service.create_performance_fee(
            user_id=request.user_id,
            base_amount_usdt=request.base_amount_usdt,
            performance_percentage=request.performance_percentage,
            period_description=request.period_description,
            admin_id=str(admin.id),
            notes=request.notes,
            auto_credit=True  # Criar virtual credit automaticamente
        )
        
        logger.info(
            f"💰 Performance fee calculated: ${performance_fee.fee_amount_usdt} "
            f"({request.performance_percentage}% of ${request.base_amount_usdt}) "
            f"for user {request.user_id}"
        )
        
        return {
            "success": True,
            "message": f"Taxa de performance de ${performance_fee.fee_amount_usdt} USDT calculada e creditada",
            "performance_fee": PerformanceFeeResponse.from_orm(performance_fee),
            "virtual_credit": VirtualCreditResponse.from_orm(virtual_credit) if virtual_credit else None,
            "total_credited_usdt": float(total_credited)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating performance fee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ADJUST VIRTUAL CREDIT ====================
@router.post("/investor/adjust-credit")
async def adjust_virtual_credit(
    request: VirtualCreditAdjustRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Ajustar crédito virtual existente (Admin only)
    - Alterar valor USDT
    - Alterar período de bloqueio
    - Alterar status
    """
    try:
        from datetime import datetime, timedelta
        
        # Buscar crédito existente
        credit = db.query(EarnPoolVirtualCredit).filter(
            EarnPoolVirtualCredit.id == request.credit_id
        ).first()
        
        if not credit:
            raise HTTPException(status_code=404, detail="Crédito virtual não encontrado")
        
        changes = []
        
        # Atualizar valor USDT se fornecido
        if request.new_usdt_amount is not None:
            old_amount = credit.usdt_amount
            credit.usdt_amount = request.new_usdt_amount
            changes.append(f"USDT: {old_amount} → {request.new_usdt_amount}")
        
        # Atualizar período de bloqueio se fornecido
        if request.new_lock_period_days is not None:
            old_period = credit.lock_period_days
            credit.lock_period_days = request.new_lock_period_days
            # Recalcular data de desbloqueio baseado na data de criação
            credit.lock_ends_at = credit.credited_at + timedelta(days=request.new_lock_period_days)
            changes.append(f"Lock period: {old_period} → {request.new_lock_period_days} days")
        
        # Atualizar data de desbloqueio diretamente se fornecida
        if request.new_lock_ends_at is not None:
            old_date = credit.lock_ends_at
            credit.lock_ends_at = request.new_lock_ends_at
            changes.append(f"Lock ends at: {old_date} → {request.new_lock_ends_at}")
        
        # Atualizar status se fornecido
        if request.new_status is not None:
            if request.new_status not in ["LOCKED", "UNLOCKED", "WITHDRAWN"]:
                raise HTTPException(status_code=400, detail="Status inválido. Use: LOCKED, UNLOCKED, WITHDRAWN")
            old_status = credit.status
            credit.status = request.new_status
            changes.append(f"Status: {old_status} → {request.new_status}")
        
        # Atualizar notas se fornecidas
        if request.notes:
            credit.notes = f"{credit.notes or ''}\n[{datetime.now().isoformat()}] {request.notes}".strip()
        
        db.commit()
        db.refresh(credit)
        
        logger.info(
            f"✏️ Admin {admin.username} adjusted credit {credit.id} for user {credit.user_id}: "
            f"{', '.join(changes)}"
        )
        
        return {
            "success": True,
            "message": f"Crédito ajustado com sucesso. Alterações: {', '.join(changes)}",
            "credit": {
                "id": str(credit.id),
                "user_id": str(credit.user_id),
                "usdt_amount": float(credit.usdt_amount),
                "lock_period_days": credit.lock_period_days,
                "lock_ends_at": credit.lock_ends_at.isoformat() if credit.lock_ends_at else None,
                "status": credit.status,
                "notes": credit.notes
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting virtual credit: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WITHDRAW YIELD ====================
@router.post("/investor/withdraw-yield")
async def withdraw_yield_from_credit(
    credit_id: str,
    amount: Optional[float] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Processar retirada de yield de um crédito virtual
    - Yield pode ser retirado a qualquer momento
    - Principal só pode ser retirado após período de bloqueio
    """
    try:
        from datetime import datetime
        from decimal import Decimal
        
        # Buscar crédito
        credit = db.query(EarnPoolVirtualCredit).filter(
            EarnPoolVirtualCredit.id == credit_id
        ).first()
        
        if not credit:
            raise HTTPException(status_code=404, detail="Crédito virtual não encontrado")
        
        # Calcular yield disponível
        total_yield = float(credit.total_yield_earned or 0)
        yield_already_withdrawn = float(credit.yield_withdrawn or 0)
        yield_available = total_yield - yield_already_withdrawn
        
        if yield_available <= 0:
            raise HTTPException(status_code=400, detail="Nenhum yield disponível para retirada")
        
        # Se não especificou amount, retirar todo yield disponível
        withdrawal_amount = amount if amount is not None else yield_available
        
        if withdrawal_amount > yield_available:
            raise HTTPException(
                status_code=400, 
                detail=f"Valor solicitado ({withdrawal_amount}) maior que yield disponível ({yield_available})"
            )
        
        # Atualizar yield retirado
        credit.yield_withdrawn = Decimal(str(yield_already_withdrawn + withdrawal_amount))
        credit.notes = f"{credit.notes or ''}\n[{datetime.now().isoformat()}] Yield withdrawal: ${withdrawal_amount:.2f} by admin {admin.username}".strip()
        
        db.commit()
        db.refresh(credit)
        
        logger.info(
            f"💸 Yield withdrawal processed: ${withdrawal_amount:.2f} from credit {credit.id} "
            f"for user {credit.user_id} by admin {admin.username}"
        )
        
        return {
            "success": True,
            "message": f"Retirada de yield processada: ${withdrawal_amount:.2f} USDT",
            "withdrawal": {
                "credit_id": str(credit.id),
                "user_id": str(credit.user_id),
                "withdrawal_amount": withdrawal_amount,
                "yield_remaining": yield_available - withdrawal_amount,
                "total_yield_earned": total_yield,
                "total_yield_withdrawn": float(credit.yield_withdrawn)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing yield withdrawal: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DELETE VIRTUAL CREDIT ====================
@router.delete("/investor/virtual-credit/{credit_id}")
async def delete_virtual_credit(
    credit_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deletar crédito virtual (Admin only)
    """
    try:
        credit = db.query(EarnPoolVirtualCredit).filter(
            EarnPoolVirtualCredit.id == credit_id
        ).first()
        
        if not credit:
            raise HTTPException(status_code=404, detail="Crédito virtual não encontrado")
        
        user_id = str(credit.user_id)
        amount = float(credit.usdt_amount)
        
        db.delete(credit)
        db.commit()
        
        logger.info(
            f"🗑️ Admin {admin.username} deleted virtual credit {credit_id} "
            f"(${amount} USDT) for user {user_id}"
        )
        
        return {
            "success": True,
            "message": f"Crédito virtual de ${amount} USDT deletado com sucesso"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting virtual credit: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
