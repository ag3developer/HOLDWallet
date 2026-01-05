"""
🔔 Admin Notifications Router
==============================

Endpoints de notificações para administradores.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.core.db import get_db
from app.models.user import User
from app.services.admin_notification_service import admin_notification_service
from app.core.security import get_current_admin

router = APIRouter(
    prefix="/notifications",
    tags=["Admin Notifications"]
)


@router.get("", response_model=None)
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    📬 Buscar todas as notificações pendentes
    
    Retorna notificações categorizadas por urgência:
    - urgent: Requer ação imediata (disputas)
    - warning: Atenção necessária (trades alto valor)
    - info: Informativo (novos usuários, KYC)
    """
    notifications = admin_notification_service.get_pending_notifications(db)
    
    return {
        "success": True,
        "data": notifications
    }


@router.get("/dashboard-alerts", response_model=None)
async def get_dashboard_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    📊 Alertas formatados para o dashboard
    
    Retorna lista simplificada de alertas para
    exibição no dashboard admin.
    """
    alerts = admin_notification_service.get_dashboard_alerts(db)
    
    return {
        "success": True,
        "alerts": alerts,
        "count": len(alerts)
    }


@router.get("/summary", response_model=None)
async def get_notifications_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    📈 Resumo das notificações
    
    Retorna apenas o contador de notificações por categoria.
    Útil para badges de notificação.
    """
    notifications = admin_notification_service.get_pending_notifications(db)
    
    return {
        "success": True,
        "summary": notifications["summary"],
        "has_urgent": notifications["summary"]["urgent_count"] > 0
    }


@router.get("/disputes", response_model=None)
async def get_dispute_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    ⚠️ Notificações de disputas
    
    Retorna apenas notificações relacionadas a disputas P2P.
    """
    notifications = admin_notification_service.get_pending_notifications(db)
    
    # Filtrar apenas disputas
    disputes = [
        n for n in notifications["urgent"]
        if n["type"] in ["dispute_opened", "dispute_escalated"]
    ]
    
    return {
        "success": True,
        "disputes": disputes,
        "count": len(disputes)
    }


@router.get("/high-value", response_model=None)
async def get_high_value_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    💰 Notificações de alto valor
    
    Retorna notificações de trades e transações de alto valor.
    """
    notifications = admin_notification_service.get_pending_notifications(db)
    
    # Filtrar trades e saques de alto valor
    high_value = [
        n for n in notifications["warning"]
        if n["type"] in ["high_value_trade", "withdrawal_large"]
    ]
    
    return {
        "success": True,
        "high_value": high_value,
        "count": len(high_value),
        "thresholds": {
            "trade_brl": admin_notification_service.HIGH_VALUE_TRADE_BRL,
            "withdrawal_brl": admin_notification_service.LARGE_WITHDRAWAL_BRL
        }
    }


@router.put("/settings", response_model=None)
async def update_notification_settings(
    settings: Dict[str, Any],
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    ⚙️ Atualizar configurações de notificações
    
    Permite ajustar thresholds e preferências.
    
    Exemplo de body:
    ```json
    {
        "high_value_trade_brl": 100000,
        "large_withdrawal_brl": 200000,
        "failed_login_threshold": 10
    }
    ```
    """
    # Atualizar thresholds se fornecidos
    if "high_value_trade_brl" in settings:
        admin_notification_service.HIGH_VALUE_TRADE_BRL = settings["high_value_trade_brl"]
    
    if "large_withdrawal_brl" in settings:
        admin_notification_service.LARGE_WITHDRAWAL_BRL = settings["large_withdrawal_brl"]
    
    if "failed_login_threshold" in settings:
        admin_notification_service.FAILED_LOGIN_THRESHOLD = settings["failed_login_threshold"]
    
    return {
        "success": True,
        "message": "Configurações atualizadas",
        "current_settings": {
            "high_value_trade_brl": admin_notification_service.HIGH_VALUE_TRADE_BRL,
            "large_withdrawal_brl": admin_notification_service.LARGE_WITHDRAWAL_BRL,
            "failed_login_threshold": admin_notification_service.FAILED_LOGIN_THRESHOLD
        }
    }


@router.get("/settings", response_model=None)
async def get_notification_settings(
    current_user: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    📋 Obter configurações atuais de notificações
    """
    return {
        "success": True,
        "settings": {
            "high_value_trade_brl": admin_notification_service.HIGH_VALUE_TRADE_BRL,
            "large_withdrawal_brl": admin_notification_service.LARGE_WITHDRAWAL_BRL,
            "failed_login_threshold": admin_notification_service.FAILED_LOGIN_THRESHOLD
        }
    }
