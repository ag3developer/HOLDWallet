"""
WOLK NOW - Push Notification Service
=====================================

Serviço para enviar Push Notifications via Web Push Protocol.
"""

import json
import time
import base64
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.config import settings
from app.models.push_subscription import PushSubscription, NotificationPreference

logger = logging.getLogger(__name__)


def _decode_private_key(key: Optional[str]) -> Optional[str]:
    """
    Decodifica a chave privada VAPID e converte para URL-safe Base64.
    
    A biblioteca pywebpush espera a chave em formato URL-safe Base64 (sem headers PEM).
    Esta função aceita múltiplos formatos e converte automaticamente.
    
    Suporta:
    - Chave PEM direta (com -----BEGIN EC PRIVATE KEY-----)
    - Chave PEM com \\n escapados
    - Chave PEM codificada em Base64 padrão
    - Chave já em URL-safe Base64
    """
    if not key:
        return None
    
    key = key.strip()
    pem_key = None
    
    # Caso 1: Se já tem o header PEM
    if '-----BEGIN' in key:
        if '\\n' in key:
            key = key.replace('\\n', '\n')
        pem_key = key
    
    # Caso 2: Tentar decodificar de Base64 padrão (pode ser PEM codificado)
    if not pem_key:
        try:
            decoded = base64.b64decode(key).decode('utf-8')
            if '-----BEGIN' in decoded:
                pem_key = decoded
        except Exception:
            pass
    
    # Caso 3: Se não é PEM, assumir que já é URL-safe Base64 (formato nativo)
    if not pem_key:
        # Já está no formato correto para pywebpush
        return key
    
    # Converter PEM para URL-safe Base64 (formato que pywebpush espera)
    try:
        # Carregar a chave PEM
        private_key = serialization.load_pem_private_key(
            pem_key.encode('utf-8'),
            password=None
        )
        
        # Extrair os bytes raw da chave privada (32 bytes para EC P-256)
        if isinstance(private_key, ec.EllipticCurvePrivateKey):
            private_numbers = private_key.private_numbers()
            # Converter para bytes (32 bytes para P-256)
            key_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')
            # Converter para URL-safe Base64 sem padding
            url_safe_key = base64.urlsafe_b64encode(key_bytes).decode('utf-8').rstrip('=')
            logger.info(f"Converted PEM to URL-safe Base64 ({len(url_safe_key)} chars)")
            return url_safe_key
        else:
            logger.error("Private key is not an EC key")
            return None
    except Exception as e:
        logger.error(f"Failed to convert PEM to URL-safe Base64: {e}")
        # Fallback: retornar PEM mesmo assim (algumas versões aceitam)
        return pem_key


class PushNotificationService:
    """Serviço para gerenciar e enviar Push Notifications."""
    
    def __init__(self):
        raw_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        self.vapid_private_key = _decode_private_key(raw_private_key)
        self.vapid_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        self.vapid_email = getattr(settings, 'VAPID_EMAIL', 'contato@wolknow.com')
        self.vapid_claims = {
            "sub": f"mailto:{self.vapid_email}"
        }
        
        # Log para debug (sem mostrar a chave completa)
        if self.vapid_private_key:
            logger.info(f"VAPID private key loaded ({len(self.vapid_private_key)} chars)")
        else:
            logger.warning("VAPID private key not configured")
    
    def is_configured(self) -> bool:
        """Verifica se o serviço está configurado corretamente."""
        return bool(self.vapid_private_key and self.vapid_public_key)
    
    # ================== CRUD Operations ==================
    
    def create_subscription(
        self,
        db: Session,
        user_id: str,
        endpoint: str,
        p256dh: str,
        auth: str,
        device_info: Optional[Dict] = None
    ) -> PushSubscription:
        """Cria ou atualiza uma subscription para um usuário."""
        # Verificar se já existe
        existing = db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint
        ).first()
        
        if existing:
            # Atualizar subscription existente
            existing.user_id = user_id
            existing.p256dh = p256dh
            existing.auth = auth
            existing.device_info = device_info
            existing.is_active = True
            existing.last_used_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"Updated push subscription for user {user_id}")
            return existing
        
        # Criar nova subscription
        subscription = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            device_info=device_info,
            is_active=True
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        logger.info(f"Created new push subscription for user {user_id}")
        return subscription
    
    def remove_subscription(self, db: Session, endpoint: str) -> bool:
        """Remove uma subscription pelo endpoint."""
        subscription = db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint
        ).first()
        
        if subscription:
            db.delete(subscription)
            db.commit()
            logger.info(f"Removed push subscription: {endpoint[:50]}...")
            return True
        return False
    
    def get_user_subscriptions(self, db: Session, user_id: str) -> List[PushSubscription]:
        """Retorna todas as subscriptions ativas de um usuário."""
        return db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).all()
    
    def deactivate_subscription(self, db: Session, subscription_id: int) -> None:
        """Desativa uma subscription (soft delete)."""
        subscription = db.query(PushSubscription).filter(
            PushSubscription.id == subscription_id
        ).first()
        if subscription:
            subscription.is_active = False
            db.commit()
    
    # ================== Preferences ==================
    
    def get_user_preferences(self, db: Session, user_id: str) -> NotificationPreference:
        """Retorna as preferências de notificação do usuário."""
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).first()
        
        if not prefs:
            # Criar preferências padrão
            prefs = NotificationPreference(user_id=user_id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        
        return prefs
    
    def update_user_preferences(
        self,
        db: Session,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> NotificationPreference:
        """Atualiza as preferências de notificação do usuário."""
        prefs = self.get_user_preferences(db, user_id)
        
        # Atualizar campos permitidos
        allowed_fields = [
            'transactions', 'security', 'p2p_trading', 'chat',
            'market', 'reports', 'system', 'quiet_hours_start', 'quiet_hours_end'
        ]
        
        for field in allowed_fields:
            if field in preferences:
                setattr(prefs, field, preferences[field])
        
        prefs.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(prefs)
        return prefs
    
    def should_send(self, prefs: NotificationPreference, category: str) -> bool:
        """Verifica se deve enviar notificação para uma categoria."""
        category_map = {
            'transactions': prefs.transactions,
            'transaction_received': prefs.transactions,
            'transaction_confirmed': prefs.transactions,
            'security': prefs.security,
            'new_login': prefs.security,
            'password_changed': prefs.security,
            'p2p_trading': prefs.p2p_trading,
            'order_matched': prefs.p2p_trading,
            'payment_received': prefs.p2p_trading,
            'escrow_released': prefs.p2p_trading,
            'chat': prefs.chat,
            'new_message': prefs.chat,
            'market': prefs.market,
            'price_alert': prefs.market,
            'significant_price_change': prefs.market,
            'reports': prefs.reports,
            'system': prefs.system,
        }
        return category_map.get(category, True)
    
    def is_quiet_hours(self, prefs: NotificationPreference) -> bool:
        """Verifica se está no horário de silêncio."""
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        now = datetime.utcnow().strftime("%H:%M")
        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end
        
        if start <= end:
            return start <= now <= end
        else:  # Cruza meia-noite
            return now >= start or now <= end
    
    # ================== Send Push ==================
    
    def send_push(
        self,
        db: Session,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        category: str = "system",
        icon: str = "/icons/icon-192x192.png",
        badge: str = "/icons/badge-72x72.png",
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Envia push notification para todos os dispositivos do usuário.
        
        Args:
            db: Sessão do banco de dados
            user_id: ID do usuário
            title: Título da notificação
            body: Corpo da notificação
            data: Dados extras (link, action, etc)
            category: Categoria da notificação
            icon: Ícone da notificação
            badge: Badge da notificação
            force: Forçar envio (ignora preferências)
        
        Returns:
            Dict com sucesso e quantidade enviada
        """
        if not self.is_configured():
            logger.warning("Push notifications not configured (missing VAPID keys)")
            return {"success": False, "sent": 0, "error": "Not configured"}
        
        # Verificar preferências
        if not force:
            prefs = self.get_user_preferences(db, user_id)
            
            if not self.should_send(prefs, category):
                logger.info(f"Push blocked by user preferences: {category}")
                return {"success": False, "sent": 0, "reason": "blocked_by_preferences"}
            
            # Verificar quiet hours (exceto segurança)
            if category != "security" and self.is_quiet_hours(prefs):
                logger.info(f"Push blocked by quiet hours: {category}")
                return {"success": False, "sent": 0, "reason": "quiet_hours"}
        
        # Buscar subscriptions
        subscriptions = self.get_user_subscriptions(db, user_id)
        if not subscriptions:
            logger.info(f"No active subscriptions for user {user_id}")
            return {"success": False, "sent": 0, "reason": "no_subscriptions"}
        
        # Preparar payload
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": icon,
            "badge": badge,
            "data": data or {},
            "tag": category,
            "timestamp": int(time.time() * 1000)
        })
        
        # Enviar para cada dispositivo
        sent = 0
        failed = 0
        
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=payload,
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims=self.vapid_claims
                )
                sent += 1
                sub.last_used_at = datetime.utcnow()
                logger.info(f"Push sent to subscription {sub.id}")
                
            except WebPushException as e:
                failed += 1
                logger.error(f"Push failed for subscription {sub.id}: {e}")
                
                # Se subscription expirou (410 Gone), desativar
                if e.response and e.response.status_code == 410:
                    self.deactivate_subscription(db, sub.id)
                    logger.info(f"Deactivated expired subscription {sub.id}")
        
        db.commit()
        
        return {
            "success": sent > 0,
            "sent": sent,
            "failed": failed,
            "total": len(subscriptions)
        }
    
    # ================== Convenience Methods ==================
    
    def notify_transaction_received(
        self,
        db: Session,
        user_id: str,
        amount: str,
        symbol: str,
        tx_hash: Optional[str] = None
    ):
        """Notifica sobre transação recebida."""
        return self.send_push(
            db=db,
            user_id=user_id,
            title="💰 Você recebeu crypto!",
            body=f"Recebido: {amount} {symbol}",
            data={"link": "/wallet", "tx_hash": tx_hash},
            category="transaction_received"
        )
    
    def notify_new_login(
        self,
        db: Session,
        user_id: str,
        device: str,
        location: Optional[str] = None
    ):
        """Notifica sobre novo login."""
        body = f"Novo login detectado - {device}"
        if location:
            body += f", {location}"
        
        return self.send_push(
            db=db,
            user_id=user_id,
            title="🔐 Novo login na sua conta",
            body=body,
            data={"link": "/settings/security"},
            category="new_login",
            force=True  # Segurança sempre notifica
        )
    
    def notify_trade_accepted(
        self,
        db: Session,
        user_id: str,
        trader_name: str,
        amount: str,
        symbol: str,
        trade_id: str
    ):
        """Notifica quando trade P2P é aceito."""
        return self.send_push(
            db=db,
            user_id=user_id,
            title="✅ Trade aceito!",
            body=f"{trader_name} aceitou seu trade de {amount} {symbol}",
            data={"link": f"/p2p/trade/{trade_id}"},
            category="order_matched"
        )
    
    def notify_payment_confirmed(
        self,
        db: Session,
        user_id: str,
        amount: str,
        currency: str,
        trade_id: str
    ):
        """Notifica quando pagamento é confirmado."""
        return self.send_push(
            db=db,
            user_id=user_id,
            title="💵 Pagamento confirmado!",
            body=f"Pagamento de {amount} {currency} confirmado",
            data={"link": f"/p2p/trade/{trade_id}"},
            category="payment_received"
        )
    
    def notify_escrow_released(
        self,
        db: Session,
        user_id: str,
        amount: str,
        symbol: str
    ):
        """Notifica quando escrow é liberado."""
        return self.send_push(
            db=db,
            user_id=user_id,
            title="🎉 Crypto liberado!",
            body=f"{amount} {symbol} foi liberado para sua carteira",
            data={"link": "/wallet"},
            category="escrow_released"
        )
    
    def notify_new_message(
        self,
        db: Session,
        user_id: str,
        sender_name: str,
        preview: str,
        chat_id: str
    ):
        """Notifica sobre nova mensagem no chat."""
        return self.send_push(
            db=db,
            user_id=user_id,
            title=f"💬 {sender_name}",
            body=preview[:100] + ("..." if len(preview) > 100 else ""),
            data={"link": f"/chat/{chat_id}"},
            category="new_message"
        )
    
    def notify_price_alert(
        self,
        db: Session,
        user_id: str,
        symbol: str,
        price: str,
        change_percent: Optional[float] = None
    ):
        """Notifica sobre variação de preço significativa."""
        if change_percent:
            emoji = "📈" if change_percent > 0 else "📉"
            body = f"{symbol} {'+' if change_percent > 0 else ''}{change_percent:.2f}% - R$ {price}"
        else:
            emoji = "🔔"
            body = f"{symbol} atingiu R$ {price}"
        
        return self.send_push(
            db=db,
            user_id=user_id,
            title=f"{emoji} Alerta de preço",
            body=body,
            data={"link": "/prices", "symbol": symbol},
            category="price_alert"
        )


# Instância global do serviço
push_notification_service = PushNotificationService()
