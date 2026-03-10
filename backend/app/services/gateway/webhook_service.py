"""
📤 WolkPay Gateway - Webhook Service
=====================================

Gerenciamento de webhooks para merchants.

Features:
- Criação de webhooks
- Envio com retry exponencial
- Assinatura HMAC
- Status tracking

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import json
import hmac
import hashlib
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.gateway import (
    GatewayWebhook,
    GatewayWebhookStatus,
    GatewayWebhookEvent,
    GatewayPayment,
    GatewayMerchant
)

logger = logging.getLogger(__name__)


class WebhookService:
    """
    Serviço para gerenciamento e envio de webhooks
    """
    
    # Timeout para requests HTTP
    HTTP_TIMEOUT = 30
    
    # Headers padrão
    DEFAULT_HEADERS = {
        "Content-Type": "application/json",
        "User-Agent": "WolkPay-Gateway/1.0"
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===================================
    # WEBHOOK CREATION
    # ===================================
    
    async def create_webhook(
        self,
        payment_id: str,
        merchant_id: str,
        event: str
    ) -> Optional[GatewayWebhook]:
        """
        Cria um webhook para ser enviado ao merchant
        """
        # Buscar payment e merchant
        payment = self.db.query(GatewayPayment).filter(
            GatewayPayment.id == payment_id
        ).first()
        
        merchant = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not payment or not merchant:
            logger.warning(f"❌ Payment ou Merchant não encontrado para webhook")
            return None
        
        # Verificar se merchant tem webhook configurado
        if not merchant.webhook_url:
            logger.info(f"ℹ️ Merchant {merchant.merchant_code} não tem webhook configurado")
            return None
        
        # Verificar se evento está na lista de eventos do merchant
        if merchant.webhook_events and event not in merchant.webhook_events:
            logger.info(f"ℹ️ Evento {event} não está habilitado para merchant {merchant.merchant_code}")
            return None
        
        # Montar payload
        payload = self._build_payload(payment, merchant, event)
        
        # Gerar assinatura
        payload_json = json.dumps(payload, default=str)
        signature = self._generate_signature(payload_json, merchant.webhook_secret)
        
        # Criar webhook
        webhook = GatewayWebhook(
            payment_id=payment.id,
            merchant_id=merchant.id,
            event=event,
            payload=payload,
            signature=signature,
            url=merchant.webhook_url,
            status=GatewayWebhookStatus.PENDING,
            max_attempts=5,
            next_attempt_at=datetime.now(timezone.utc)
        )
        
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        
        logger.info(f"📤 Webhook criado: {event} para {merchant.merchant_code}")
        
        # Tentar enviar imediatamente
        await self.send_webhook(webhook.id)
        
        return webhook
    
    def _build_payload(
        self,
        payment: GatewayPayment,
        merchant: GatewayMerchant,
        event: str
    ) -> Dict[str, Any]:
        """Monta payload do webhook"""
        return {
            "event": event,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "webhook_id": None,  # Será preenchido após criar
            "data": {
                "payment_id": payment.payment_id,
                "external_id": payment.external_id,
                "merchant_code": merchant.merchant_code,
                "payment_method": payment.payment_method.value,
                "status": payment.status.value,
                "amount_requested": str(payment.amount_requested),
                "currency": payment.currency_requested,
                "amount_received": str(payment.amount_received) if payment.amount_received else None,
                "fee_amount": str(payment.fee_amount) if payment.fee_amount else None,
                "settlement_amount": str(payment.settlement_amount) if payment.settlement_amount else None,
                "settlement_currency": payment.settlement_currency,
                "customer_email": payment.customer_email,
                "customer_name": payment.customer_name,
                "description": payment.description,
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
                "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
                "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
                # PIX específico
                "pix_txid": payment.pix_txid if payment.pix_txid else None,
                # Crypto específico
                "crypto_currency": payment.crypto_currency,
                "crypto_network": payment.crypto_network,
                "crypto_address": payment.crypto_address,
                "crypto_tx_hash": payment.crypto_tx_hash,
                "crypto_amount": str(payment.crypto_amount) if payment.crypto_amount else None,
                "crypto_confirmations": payment.crypto_confirmations
            }
        }
    
    def _generate_signature(self, payload: str, secret: str) -> str:
        """Gera assinatura HMAC-SHA256"""
        if not secret:
            return ""
        
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    # ===================================
    # WEBHOOK SENDING
    # ===================================
    
    async def send_webhook(self, webhook_id: str) -> bool:
        """
        Envia um webhook
        
        Returns:
            bool: True se enviado com sucesso
        """
        webhook = self.db.query(GatewayWebhook).filter(
            GatewayWebhook.id == webhook_id
        ).first()
        
        if not webhook:
            logger.warning(f"❌ Webhook não encontrado: {webhook_id}")
            return False
        
        if webhook.status in [GatewayWebhookStatus.SENT, GatewayWebhookStatus.EXHAUSTED]:
            logger.info(f"ℹ️ Webhook já processado: {webhook_id}")
            return webhook.status == GatewayWebhookStatus.SENT
        
        # Atualizar webhook_id no payload
        webhook.payload['webhook_id'] = webhook_id
        payload_json = json.dumps(webhook.payload, default=str)
        
        # Incrementar tentativas
        webhook.attempts += 1
        
        try:
            async with httpx.AsyncClient(timeout=self.HTTP_TIMEOUT) as client:
                response = await client.post(
                    webhook.url,
                    content=payload_json,
                    headers={
                        **self.DEFAULT_HEADERS,
                        "X-WolkPay-Signature": webhook.signature,
                        "X-WolkPay-Event": webhook.event,
                        "X-WolkPay-Delivery": webhook_id
                    }
                )
                
                webhook.last_response_code = response.status_code
                webhook.last_response_body = response.text[:1000] if response.text else None
                
                if response.status_code in [200, 201, 202, 204]:
                    webhook.status = GatewayWebhookStatus.SENT
                    webhook.sent_at = datetime.now(timezone.utc)
                    
                    logger.info(f"✅ Webhook enviado: {webhook.event} -> {webhook.url}")
                    
                    self.db.commit()
                    return True
                else:
                    raise Exception(f"HTTP {response.status_code}")
                    
        except Exception as e:
            error_msg = str(e)[:500]
            webhook.last_error = error_msg
            
            logger.warning(f"⚠️ Webhook falhou ({webhook.attempts}/{webhook.max_attempts}): {error_msg}")
            
            if webhook.attempts >= webhook.max_attempts:
                webhook.status = GatewayWebhookStatus.EXHAUSTED
                logger.error(f"❌ Webhook esgotado: {webhook_id}")
            else:
                webhook.status = GatewayWebhookStatus.FAILED
                webhook.next_attempt_at = webhook.calculate_next_attempt()
            
            self.db.commit()
            return False
    
    async def retry_pending_webhooks(self) -> int:
        """
        Reenvia webhooks pendentes/falhados
        
        Deve ser chamado periodicamente (cron/celery)
        
        Returns:
            int: Número de webhooks processados
        """
        now = datetime.now(timezone.utc)
        
        # Buscar webhooks para retry
        pending_webhooks = self.db.query(GatewayWebhook).filter(
            and_(
                GatewayWebhook.status.in_([
                    GatewayWebhookStatus.PENDING,
                    GatewayWebhookStatus.FAILED
                ]),
                GatewayWebhook.next_attempt_at <= now,
                GatewayWebhook.attempts < GatewayWebhook.max_attempts
            )
        ).limit(100).all()
        
        count = 0
        for webhook in pending_webhooks:
            await self.send_webhook(webhook.id)
            count += 1
        
        if count > 0:
            logger.info(f"📤 {count} webhooks processados no retry")
        
        return count
    
    # ===================================
    # WEBHOOK MANAGEMENT
    # ===================================
    
    async def get_webhook_by_id(self, webhook_id: str) -> Optional[GatewayWebhook]:
        """Busca webhook por ID"""
        return self.db.query(GatewayWebhook).filter(
            GatewayWebhook.id == webhook_id
        ).first()
    
    async def list_webhooks(
        self,
        payment_id: Optional[str] = None,
        merchant_id: Optional[str] = None,
        status: Optional[GatewayWebhookStatus] = None,
        page: int = 1,
        per_page: int = 20
    ) -> List[GatewayWebhook]:
        """Lista webhooks com filtros"""
        query = self.db.query(GatewayWebhook)
        
        if payment_id:
            # Buscar pelo payment_id (campo ID, não payment_id)
            payment = self.db.query(GatewayPayment).filter(
                GatewayPayment.payment_id == payment_id
            ).first()
            if payment:
                query = query.filter(GatewayWebhook.payment_id == payment.id)
        
        if merchant_id:
            query = query.filter(GatewayWebhook.merchant_id == merchant_id)
        
        if status:
            query = query.filter(GatewayWebhook.status == status)
        
        offset = (page - 1) * per_page
        return query.order_by(
            GatewayWebhook.created_at.desc()
        ).offset(offset).limit(per_page).all()
    
    async def resend_webhook(self, webhook_id: str) -> bool:
        """
        Reenvia um webhook manualmente
        """
        webhook = await self.get_webhook_by_id(webhook_id)
        
        if not webhook:
            raise ValueError("Webhook não encontrado")
        
        # Reset para permitir reenvio
        webhook.status = GatewayWebhookStatus.PENDING
        webhook.attempts = 0
        webhook.next_attempt_at = datetime.now(timezone.utc)
        
        self.db.commit()
        
        return await self.send_webhook(webhook_id)
