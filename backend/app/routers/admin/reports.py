"""
🛡️ HOLD Wallet - Admin Reports Router
======================================

Relatórios e analytics do sistema.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.transaction import Transaction
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.p2p import P2POrder, P2PMatch

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["Admin - Reports"],
    dependencies=[Depends(get_current_admin)]
)


@router.get("/overview", response_model=dict)
async def get_reports_overview(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Resumo geral de relatórios
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Definir período
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Usuários
        users_query = db.query(func.count(User.id))
        if start_date:
            users_query = users_query.filter(User.created_at >= start_date)
        new_users = users_query.scalar() or 0
        
        # Trades OTC
        trades_query = db.query(InstantTrade)
        if start_date:
            trades_query = trades_query.filter(InstantTrade.created_at >= start_date)
        
        total_trades = trades_query.count()
        completed_trades = trades_query.filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).count()
        
        # Volume
        volume_query = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_query = volume_query.filter(InstantTrade.created_at >= start_date)
        total_volume = volume_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "users": {
                    "new_registrations": new_users
                },
                "trades": {
                    "total": total_trades,
                    "completed": completed_trades,
                    "completion_rate": round((completed_trades / total_trades * 100) if total_trades > 0 else 0, 2)
                },
                "volume": {
                    "total_brl": float(total_volume)
                },
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/users", response_model=dict)
async def get_users_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório de usuários
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Estatísticas
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        verified_users = db.query(func.count(User.id)).filter(User.is_email_verified == True).scalar() or 0
        admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
        
        # Novos no período
        new_query = db.query(func.count(User.id))
        if start_date:
            new_query = new_query.filter(User.created_at >= start_date)
        new_users = new_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "verified_users": verified_users,
                "unverified_users": total_users - verified_users,
                "admin_users": admin_users,
                "new_users_period": new_users,
                "verification_rate": round((verified_users / total_users * 100) if total_users > 0 else 0, 2),
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório de usuários: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/trades", response_model=dict)
async def get_trades_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório de trades OTC
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Base query
        base_query = db.query(InstantTrade)
        if start_date:
            base_query = base_query.filter(InstantTrade.created_at >= start_date)
        
        total = base_query.count()
        pending = base_query.filter(InstantTrade.status == TradeStatus.PENDING).count()
        completed = base_query.filter(InstantTrade.status == TradeStatus.COMPLETED).count()
        failed = base_query.filter(InstantTrade.status == TradeStatus.FAILED).count()
        cancelled = base_query.filter(InstantTrade.status == TradeStatus.CANCELLED).count()
        expired = base_query.filter(InstantTrade.status == TradeStatus.EXPIRED).count()
        
        # Volume
        volume_query = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_query = volume_query.filter(InstantTrade.created_at >= start_date)
        total_volume = volume_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "total_trades": total,
                "by_status": {
                    "pending": pending,
                    "completed": completed,
                    "failed": failed,
                    "cancelled": cancelled,
                    "expired": expired
                },
                "volume_brl": float(total_volume),
                "completion_rate": round((completed / total * 100) if total > 0 else 0, 2),
                "failure_rate": round((failed / total * 100) if total > 0 else 0, 2),
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório de trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/p2p", response_model=dict)
async def get_p2p_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório P2P
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Ordens
        orders_query = db.query(P2POrder)
        if start_date:
            orders_query = orders_query.filter(P2POrder.created_at >= start_date)
        
        total_orders = orders_query.count()
        active_orders = orders_query.filter(P2POrder.status == "active").count()
        
        # Matches
        matches_query = db.query(P2PMatch)
        if start_date:
            matches_query = matches_query.filter(P2PMatch.created_at >= start_date)
        
        total_matches = matches_query.count()
        completed_matches = matches_query.filter(P2PMatch.status == "completed").count()
        
        return {
            "success": True,
            "period": period,
            "data": {
                "orders": {
                    "total": total_orders,
                    "active": active_orders
                },
                "matches": {
                    "total": total_matches,
                    "completed": completed_matches,
                    "completion_rate": round((completed_matches / total_matches * 100) if total_matches > 0 else 0, 2)
                },
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório P2P: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
