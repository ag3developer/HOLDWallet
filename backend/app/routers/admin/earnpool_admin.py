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
    DepositStatus, WithdrawalStatus, YieldStatus
)
from app.services.earnpool_service import get_earnpool_service, EarnPoolService
from app.schemas.earnpool import (
    EarnPoolConfigResponse, EarnPoolConfigUpdate,
    DepositResponse, WithdrawalResponse,
    AdminPoolOverviewResponse, AdminDepositListResponse,
    AdminWithdrawalApproveRequest, ProcessYieldsRequest, ProcessYieldsResponse
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
