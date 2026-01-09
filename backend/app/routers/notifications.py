"""
WOLK NOW - Push Notifications Router
=====================================

API endpoints para gerenciar Push Notifications.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, List, Any

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.push_notification_service import push_notification_service

router = APIRouter()


# ================== Schemas ==================

class SubscribeRequest(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # p256dh, auth
    device_info: Optional[Dict[str, Any]] = None


class UnsubscribeRequest(BaseModel):
    endpoint: str


class PreferencesUpdate(BaseModel):
    transactions: Optional[bool] = None
    security: Optional[bool] = None
    p2p_trading: Optional[bool] = None
    chat: Optional[bool] = None
    market: Optional[bool] = None
    reports: Optional[bool] = None
    system: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class TestNotificationRequest(BaseModel):
    title: str = "🔔 Notificação de Teste"
    body: str = "Esta é uma notificação de teste do WOLK NOW!"


class PriceAlertTestRequest(BaseModel):
    symbol: str = "ETH"
    price: str = "12.500,00"
    change_percent: Optional[float] = 8.5


# ================== Endpoints ==================

@router.get("/vapid-key")
async def get_vapid_key():
    """Retorna a chave pública VAPID para o frontend."""
    vapid_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
    
    if not vapid_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications not configured"
        )
    
    return {"vapid_key": vapid_key}


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra uma nova subscription de push notification."""
    try:
        subscription = push_notification_service.create_subscription(
            db=db,
            user_id=str(current_user.id),
            endpoint=request.endpoint,
            p256dh=request.keys.get("p256dh", ""),
            auth=request.keys.get("auth", ""),
            device_info=request.device_info
        )
        
        return {
            "success": True,
            "message": "Subscription registered successfully",
            "subscription_id": subscription.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register subscription: {str(e)}"
        )


@router.delete("/unsubscribe")
async def unsubscribe(
    request: UnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove uma subscription de push notification."""
    removed = push_notification_service.remove_subscription(db, request.endpoint)
    
    return {
        "success": removed,
        "message": "Subscription removed" if removed else "Subscription not found"
    }


@router.get("/preferences")
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna as preferências de notificação do usuário."""
    prefs = push_notification_service.get_user_preferences(db, str(current_user.id))
    
    return {
        "transactions": prefs.transactions,
        "security": prefs.security,
        "p2p_trading": prefs.p2p_trading,
        "chat": prefs.chat,
        "market": prefs.market,
        "reports": prefs.reports,
        "system": prefs.system,
        "quiet_hours_start": prefs.quiet_hours_start,
        "quiet_hours_end": prefs.quiet_hours_end,
    }


@router.put("/preferences")
async def update_preferences(
    preferences: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza as preferências de notificação do usuário."""
    prefs_dict = preferences.dict(exclude_unset=True)
    
    prefs = push_notification_service.update_user_preferences(
        db=db,
        user_id=str(current_user.id),
        preferences=prefs_dict
    )
    
    return {
        "success": True,
        "message": "Preferences updated",
        "preferences": {
            "transactions": prefs.transactions,
            "security": prefs.security,
            "p2p_trading": prefs.p2p_trading,
            "chat": prefs.chat,
            "market": prefs.market,
            "reports": prefs.reports,
            "system": prefs.system,
            "quiet_hours_start": prefs.quiet_hours_start,
            "quiet_hours_end": prefs.quiet_hours_end,
        }
    }


@router.post("/test")
async def send_test_notification(
    request: Optional[TestNotificationRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envia uma notificação de teste para o usuário."""
    # Usar valores padrão se não enviados
    title = request.title if request else "Notificação de Teste"
    body = request.body if request else "Esta é uma notificação de teste do WOLK NOW!"
    
    result = push_notification_service.send_push(
        db=db,
        user_id=str(current_user.id),
        title=title,
        body=body,
        data={"link": "/settings/notifications", "test": True},
        category="system",
        force=True  # Força envio ignorando preferências
    )
    
    return result


@router.post("/test/price-alert")
async def send_price_alert_test(
    request: PriceAlertTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envia uma notificação de teste de alerta de preço."""
    result = push_notification_service.notify_price_alert(
        db=db,
        user_id=str(current_user.id),
        symbol=request.symbol,
        price=request.price,
        change_percent=request.change_percent
    )
    
    return result


@router.get("/subscriptions")
async def list_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas as subscriptions do usuário."""
    subscriptions = push_notification_service.get_user_subscriptions(
        db, str(current_user.id)
    )
    
    return {
        "count": len(subscriptions),
        "subscriptions": [
            {
                "id": sub.id,
                "device_info": sub.device_info,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
                "last_used_at": sub.last_used_at.isoformat() if sub.last_used_at else None,
                "is_active": sub.is_active
            }
            for sub in subscriptions
        ]
    }
