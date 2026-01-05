"""
🛡️ HOLD Wallet - Admin Report Service
======================================

Serviço de relatórios administrativos.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import logging

from app.models.user import User
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.p2p import P2POrder, P2PMatch, P2PDispute

logger = logging.getLogger(__name__)


class AdminReportService:
    """Serviço para geração de relatórios administrativos"""
    
    @staticmethod
    def get_period_start(period: str) -> Optional[datetime]:
        """Converte período em data de início"""
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            return now - timedelta(hours=24)
        elif period == "7d":
            return now - timedelta(days=7)
        elif period == "30d":
            return now - timedelta(days=30)
        elif period == "90d":
            return now - timedelta(days=90)
        else:
            return None
    
    @staticmethod
    def get_overview(db: Session, period: str = "30d") -> Dict[str, Any]:
        """Retorna resumo geral do sistema"""
        start_date = AdminReportService.get_period_start(period)
        now = datetime.now(timezone.utc)
        
        # Usuários
        users_query = db.query(func.count(User.id))
        if start_date:
            users_query = users_query.filter(User.created_at >= start_date)
        new_users = users_query.scalar() or 0
        
        # Trades
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
            "period": period,
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
    
    @staticmethod
    def get_trades_report(db: Session, period: str = "30d") -> Dict[str, Any]:
        """Relatório detalhado de trades"""
        start_date = AdminReportService.get_period_start(period)
        now = datetime.now(timezone.utc)
        
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
            "period": period,
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
    
    @staticmethod
    def get_p2p_report(db: Session, period: str = "30d") -> Dict[str, Any]:
        """Relatório P2P"""
        start_date = AdminReportService.get_period_start(period)
        now = datetime.now(timezone.utc)
        
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
        
        # Disputas
        disputes_open = db.query(func.count(P2PDispute.id)).filter(
            P2PDispute.status == "open"
        ).scalar() or 0
        
        return {
            "period": period,
            "orders": {
                "total": total_orders,
                "active": active_orders
            },
            "matches": {
                "total": total_matches,
                "completed": completed_matches,
                "completion_rate": round((completed_matches / total_matches * 100) if total_matches > 0 else 0, 2)
            },
            "disputes": {
                "open": disputes_open
            },
            "generated_at": now.isoformat()
        }
