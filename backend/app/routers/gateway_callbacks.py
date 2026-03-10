"""
🔔 WolkPay Gateway - Webhook Callbacks Router
==============================================

Endpoints para receber webhooks externos:
- Banco do Brasil (PIX)
- Blockchain watchers (Crypto)

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import json
import hmac
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.config import settings
from app.services.gateway import GatewayPaymentService, WebhookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gateway/callbacks", tags=["Gateway Callbacks"])


# ============================================
# BANCO DO BRASIL PIX WEBHOOK
# ============================================

@router.post(
    "/pix/bb",
    status_code=status.HTTP_200_OK,
    summary="Webhook PIX Banco do Brasil",
    description="Recebe callbacks do Banco do Brasil quando PIX é pago"
)
async def bb_pix_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Webhook do Banco do Brasil para notificação de PIX recebido.
    
    O BB envia um POST com o payload contendo os PIX recebidos.
    Formato esperado:
    {
        "pix": [
            {
                "txid": "WKGWWKPAY20260309XXXXXX",
                "valor": "100.00",
                "horario": "2026-03-09T14:30:00.000Z",
                "pagador": {
                    "cpf": "12345678901",
                    "nome": "João Silva"
                },
                "endToEndId": "E00000000202603091430XXXXXXX"
            }
        ]
    }
    """
    try:
        # Ler body
        body = await request.body()
        payload = json.loads(body)
        
        logger.info(f"📥 Webhook PIX BB recebido: {len(payload.get('pix', []))} transações")
        
        # Processar cada PIX
        payment_service = GatewayPaymentService(db)
        
        for pix in payload.get('pix', []):
            txid = pix.get('txid')
            valor = Decimal(pix.get('valor', '0'))
            horario_str = pix.get('horario')
            end_to_end_id = pix.get('endToEndId')
            
            if not txid:
                logger.warning("PIX sem txid, ignorando")
                continue
            
            # Converter horário
            horario = None
            if horario_str:
                try:
                    horario = datetime.fromisoformat(horario_str.replace('Z', '+00:00'))
                except:
                    horario = datetime.now(timezone.utc)
            
            # Processar em background para não bloquear resposta
            background_tasks.add_task(
                process_pix_confirmation,
                db=db,
                txid=txid,
                valor=valor,
                horario=horario,
                end_to_end_id=end_to_end_id
            )
            
            logger.info(f"✅ PIX agendado para processamento: {txid} - R$ {valor}")
        
        return {"status": "ok", "processed": len(payload.get('pix', []))}
        
    except json.JSONDecodeError:
        logger.error("❌ Payload inválido no webhook BB")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload inválido"
        )
    except Exception as e:
        logger.error(f"❌ Erro no webhook BB: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar webhook"
        )


async def process_pix_confirmation(
    db: Session,
    txid: str,
    valor: Decimal,
    horario: datetime,
    end_to_end_id: Optional[str]
):
    """
    Processa confirmação de PIX em background.
    """
    try:
        payment_service = GatewayPaymentService(db)
        payment = await payment_service.confirm_pix_payment(
            txid=txid,
            valor_recebido=valor,
            horario=horario,
            end_to_end_id=end_to_end_id
        )
        
        if payment:
            logger.info(f"✅ PIX processado: {payment.payment_id}")
        else:
            logger.warning(f"⚠️ PIX não encontrado para TXID: {txid}")
            
    except Exception as e:
        logger.error(f"❌ Erro ao processar PIX {txid}: {str(e)}")


# ============================================
# CRYPTO BLOCKCHAIN WEBHOOK
# ============================================

@router.post(
    "/crypto/{network}",
    status_code=status.HTTP_200_OK,
    summary="Webhook Blockchain",
    description="Recebe callbacks de blockchain watchers"
)
async def crypto_webhook(
    network: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None)
):
    """
    Webhook para receber notificações de transações blockchain.
    
    Pode ser chamado por:
    - Nosso próprio watcher
    - Serviços como Alchemy, QuickNode, etc.
    
    Payload esperado:
    {
        "address": "0x...",
        "tx_hash": "0x...",
        "amount": "0.12345678",
        "currency": "ETH",
        "network": "ethereum",
        "confirmations": 12,
        "block_number": 12345678
    }
    """
    # Verificar secret (se configurado)
    expected_secret = getattr(settings, 'GATEWAY_CRYPTO_WEBHOOK_SECRET', None)
    if expected_secret and x_webhook_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret"
        )
    
    try:
        body = await request.body()
        payload = json.loads(body)
        
        address = payload.get('address')
        tx_hash = payload.get('tx_hash')
        amount = Decimal(str(payload.get('amount', '0')))
        currency = payload.get('currency', '').upper()
        confirmations = int(payload.get('confirmations', 0))
        
        if not address or not tx_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="address e tx_hash são obrigatórios"
            )
        
        logger.info(f"📥 Webhook Crypto {network}: {amount} {currency} -> {address[:10]}...")
        
        # Processar em background
        background_tasks.add_task(
            process_crypto_confirmation,
            db=db,
            address=address,
            tx_hash=tx_hash,
            amount=amount,
            confirmations=confirmations
        )
        
        return {"status": "ok"}
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload inválido"
        )
    except Exception as e:
        logger.error(f"❌ Erro no webhook crypto: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno"
        )


async def process_crypto_confirmation(
    db: Session,
    address: str,
    tx_hash: str,
    amount: Decimal,
    confirmations: int
):
    """
    Processa confirmação de crypto em background.
    """
    try:
        payment_service = GatewayPaymentService(db)
        payment = await payment_service.confirm_crypto_payment(
            address=address,
            amount=amount,
            tx_hash=tx_hash,
            confirmations=confirmations
        )
        
        if payment:
            logger.info(f"✅ Crypto processado: {payment.payment_id}")
        else:
            logger.warning(f"⚠️ Payment não encontrado para address: {address}")
            
    except Exception as e:
        logger.error(f"❌ Erro ao processar crypto {address}: {str(e)}")


# ============================================
# HEALTH CHECK
# ============================================

@router.get(
    "/health",
    summary="Health check",
    description="Verifica se o endpoint de callbacks está ativo"
)
async def callbacks_health():
    """Health check para callbacks"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoints": {
            "pix_bb": "/gateway/callbacks/pix/bb",
            "crypto": "/gateway/callbacks/crypto/{network}"
        }
    }
