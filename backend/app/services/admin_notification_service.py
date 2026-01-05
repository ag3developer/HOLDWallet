"""
🔔 Admin Notifications Service
===============================

Serviço de notificações para administradores.

Tipos de notificações:
- Novas disputas P2P
- Trades de alto valor
- Atividades suspeitas
- Erros no sistema
- Novos usuários KYC pendente
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_, func

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_ESCALATED = "dispute_escalated"
    HIGH_VALUE_TRADE = "high_value_trade"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    KYC_PENDING = "kyc_pending"
    SYSTEM_ERROR = "system_error"
    NEW_USER = "new_user"
    WITHDRAWAL_LARGE = "withdrawal_large"
    FAILED_LOGIN_ATTEMPTS = "failed_login_attempts"


class AdminNotificationService:
    """Serviço de notificações para administradores."""
    
    # Thresholds configuráveis
    HIGH_VALUE_TRADE_BRL = 50000  # R$ 50.000
    LARGE_WITHDRAWAL_BRL = 100000  # R$ 100.000
    FAILED_LOGIN_THRESHOLD = 5  # tentativas
    
    def __init__(self):
        self.notifications: List[Dict[str, Any]] = []
    
    def get_pending_notifications(self, db: Session) -> Dict[str, Any]:
        """
        Busca todas as notificações pendentes para o admin.
        
        Returns:
            Dict com notificações categorizadas
        """
        notifications = {
            "urgent": [],
            "warning": [],
            "info": [],
            "summary": {
                "total": 0,
                "urgent_count": 0,
                "warning_count": 0,
                "info_count": 0
            }
        }
        
        try:
            # 1. Disputas abertas (URGENTE)
            disputes = self._get_open_disputes(db)
            for d in disputes:
                notifications["urgent"].append({
                    "type": NotificationType.DISPUTE_OPENED,
                    "title": "Disputa Aberta",
                    "message": f"Disputa #{d['id'][:8]} aguardando resolução",
                    "data": d,
                    "created_at": d.get("created_at"),
                    "action_url": f"/admin/p2p?tab=disputes&id={d['id']}"
                })
            
            # 2. Trades de alto valor (WARNING)
            high_value_trades = self._get_high_value_trades(db)
            for t in high_value_trades:
                notifications["warning"].append({
                    "type": NotificationType.HIGH_VALUE_TRADE,
                    "title": "Trade de Alto Valor",
                    "message": f"Trade de R$ {t['amount_brl']:,.2f} realizado",
                    "data": t,
                    "created_at": t.get("created_at"),
                    "action_url": f"/admin/trades/{t['id']}"
                })
            
            # 3. KYC pendente (INFO)
            kyc_pending = self._get_kyc_pending(db)
            if kyc_pending:
                notifications["info"].append({
                    "type": NotificationType.KYC_PENDING,
                    "title": "KYC Pendente",
                    "message": f"{len(kyc_pending)} usuários aguardando verificação KYC",
                    "data": {"count": len(kyc_pending), "users": kyc_pending},
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": "/admin/users?filter=kyc_pending"
                })
            
            # 4. Novos usuários nas últimas 24h (INFO)
            new_users = self._get_new_users_count(db)
            if new_users > 0:
                notifications["info"].append({
                    "type": NotificationType.NEW_USER,
                    "title": "Novos Usuários",
                    "message": f"{new_users} novos usuários nas últimas 24h",
                    "data": {"count": new_users},
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": "/admin/users?sort=created_at&order=desc"
                })
            
            # 5. Withdrawals grandes (WARNING)
            large_withdrawals = self._get_large_withdrawals(db)
            for w in large_withdrawals:
                notifications["warning"].append({
                    "type": NotificationType.WITHDRAWAL_LARGE,
                    "title": "Saque Grande",
                    "message": f"Saque de R$ {w['amount_brl']:,.2f} pendente",
                    "data": w,
                    "created_at": w.get("created_at"),
                    "action_url": f"/admin/transactions?id={w['id']}"
                })
            
            # Calcular summary
            notifications["summary"]["urgent_count"] = len(notifications["urgent"])
            notifications["summary"]["warning_count"] = len(notifications["warning"])
            notifications["summary"]["info_count"] = len(notifications["info"])
            notifications["summary"]["total"] = (
                notifications["summary"]["urgent_count"] +
                notifications["summary"]["warning_count"] +
                notifications["summary"]["info_count"]
            )
            
        except Exception as e:
            logger.error(f"Erro ao buscar notificações: {e}")
        
        return notifications
    
    def _get_open_disputes(self, db: Session) -> List[Dict[str, Any]]:
        """Busca disputas P2P abertas."""
        try:
            query = text("""
                SELECT 
                    d.id,
                    d.trade_id,
                    d.opened_by,
                    d.reason,
                    d.status,
                    d.created_at,
                    pt.amount_crypto,
                    pt.cryptocurrency,
                    pt.amount_fiat
                FROM p2p_disputes d
                JOIN p2p_trades pt ON d.trade_id = pt.id
                WHERE d.status IN ('open', 'under_review')
                ORDER BY d.created_at ASC
                LIMIT 10
            """)
            
            results = db.execute(query).fetchall()
            
            return [
                {
                    "id": str(r.id),
                    "trade_id": str(r.trade_id),
                    "opened_by": str(r.opened_by),
                    "reason": r.reason,
                    "status": r.status,
                    "amount_crypto": float(r.amount_crypto or 0),
                    "cryptocurrency": r.cryptocurrency,
                    "amount_fiat": float(r.amount_fiat or 0),
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar disputas: {e}")
            return []
    
    def _get_high_value_trades(self, db: Session) -> List[Dict[str, Any]]:
        """Busca trades de alto valor nas últimas 24h."""
        try:
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            
            query = text("""
                SELECT 
                    id,
                    user_id,
                    symbol,
                    side,
                    amount_brl,
                    amount_crypto,
                    status,
                    created_at
                FROM instant_trades
                WHERE amount_brl >= :threshold
                AND created_at >= :since
                AND status = 'completed'
                ORDER BY amount_brl DESC
                LIMIT 10
            """)
            
            results = db.execute(query, {
                "threshold": self.HIGH_VALUE_TRADE_BRL,
                "since": yesterday
            }).fetchall()
            
            return [
                {
                    "id": str(r.id),
                    "user_id": str(r.user_id),
                    "symbol": r.symbol,
                    "side": r.side,
                    "amount_brl": float(r.amount_brl or 0),
                    "amount_crypto": float(r.amount_crypto or 0),
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar trades de alto valor: {e}")
            return []
    
    def _get_kyc_pending(self, db: Session) -> List[Dict[str, Any]]:
        """Busca usuários com KYC pendente."""
        try:
            query = text("""
                SELECT 
                    u.id,
                    u.email,
                    u.full_name,
                    u.created_at,
                    k.status as kyc_status,
                    k.submitted_at
                FROM users u
                LEFT JOIN kyc_verifications k ON u.id = k.user_id
                WHERE k.status = 'pending'
                OR (k.id IS NULL AND u.is_active = true)
                ORDER BY u.created_at DESC
                LIMIT 20
            """)
            
            results = db.execute(query).fetchall()
            
            return [
                {
                    "id": str(r.id),
                    "email": r.email,
                    "full_name": r.full_name,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "kyc_status": r.kyc_status or "not_submitted"
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar KYC pendente: {e}")
            return []
    
    def _get_new_users_count(self, db: Session) -> int:
        """Conta novos usuários nas últimas 24h."""
        try:
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            
            query = text("""
                SELECT COUNT(*) as count
                FROM users
                WHERE created_at >= :since
            """)
            
            result = db.execute(query, {"since": yesterday}).fetchone()
            return result.count if result else 0
        except Exception as e:
            logger.error(f"Erro ao contar novos usuários: {e}")
            return 0
    
    def _get_large_withdrawals(self, db: Session) -> List[Dict[str, Any]]:
        """Busca saques grandes pendentes."""
        try:
            query = text("""
                SELECT 
                    id,
                    user_id,
                    cryptocurrency,
                    amount,
                    amount_brl,
                    status,
                    created_at
                FROM withdrawals
                WHERE amount_brl >= :threshold
                AND status = 'pending'
                ORDER BY amount_brl DESC
                LIMIT 10
            """)
            
            results = db.execute(query, {
                "threshold": self.LARGE_WITHDRAWAL_BRL
            }).fetchall()
            
            return [
                {
                    "id": str(r.id),
                    "user_id": str(r.user_id),
                    "cryptocurrency": r.cryptocurrency,
                    "amount": float(r.amount or 0),
                    "amount_brl": float(r.amount_brl or 0),
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar saques grandes: {e}")
            return []
    
    def get_dashboard_alerts(self, db: Session) -> List[Dict[str, Any]]:
        """
        Retorna alertas formatados para o dashboard admin.
        
        Útil para mostrar um resumo rápido na página inicial.
        """
        notifications = self.get_pending_notifications(db)
        
        alerts = []
        
        # Adicionar alertas urgentes primeiro
        for n in notifications["urgent"]:
            alerts.append({
                "severity": "error",
                "title": n["title"],
                "message": n["message"],
                "action_url": n.get("action_url")
            })
        
        # Depois warnings
        for n in notifications["warning"]:
            alerts.append({
                "severity": "warning",
                "title": n["title"],
                "message": n["message"],
                "action_url": n.get("action_url")
            })
        
        # Por último, info (limite de 3)
        for n in notifications["info"][:3]:
            alerts.append({
                "severity": "info",
                "title": n["title"],
                "message": n["message"],
                "action_url": n.get("action_url")
            })
        
        return alerts


# Instância singleton
admin_notification_service = AdminNotificationService()
