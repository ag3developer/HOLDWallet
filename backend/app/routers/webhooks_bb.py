"""
🏦 WOLK NOW - Webhooks Banco do Brasil
=====================================

Router para receber notificações de pagamentos PIX do Banco do Brasil.

Endpoints:
- POST /webhooks/bb/pix - Recebe notificação de pagamento
- GET /webhooks/bb/pix - Health check (BB faz GET p            # Importa serviço de blockchain
            from app.services.multi_chain_service import multi_chain_service
            
            # Determina rede correta para o símbolo
            # Importante: cada token tem sua rede específica configurada
            symbol = str(trade.symbol).upper()
            
            # Se trade não tem rede, usar a rede padrão do símbolo
            if trade.network:
                network = trade.network
            else:
                # Buscar rede padrão para este símbolo
                network = multi_chain_service.get_network_for_symbol(symbol)
                if not network or network == 'unknown':
                    # Fallback para polygon se símbolo não encontrado
                    network = "polygon"
            
            logger.info(f"📤 Enviando {trade.crypto_amount} {symbol} para {trade.wallet_address} via {network}")idar URL)
- GET /webhooks/bb/status - Status do webhook

Author: GitHub Copilot para WOLK NOW
Date: Janeiro 2026
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session
import hmac
import hashlib
import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any

from app.core.db import get_db
from app.core.config import settings
from app.services.banco_brasil_service import get_banco_brasil_service
from app.models.instant_trade import InstantTrade, TradeStatus, InstantTradeHistory
from app.models.wolkpay import WolkPayPayment, WolkPayInvoice, InvoiceStatus, PaymentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/bb", tags=["Webhooks - Banco do Brasil"])


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verifica assinatura do webhook do Banco do Brasil.
    
    Args:
        payload: Corpo da requisição em bytes
        signature: Header x-webhook-signature
    
    Returns:
        True se assinatura válida
    """
    secret = getattr(settings, 'BB_WEBHOOK_SECRET', '')
    if not secret:
        logger.warning("⚠️ BB_WEBHOOK_SECRET não configurado, pulando validação")
        return True
    
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


@router.get("/pix")
async def webhook_health_check():
    """
    Health check para validação do webhook pelo Banco do Brasil.
    
    O BB faz um GET para verificar se a URL está ativa antes de enviar webhooks.
    """
    return {"status": "ok", "service": "WOLK NOW PIX Webhook", "timestamp": datetime.utcnow().isoformat()}


@router.post("/pix")
async def receive_pix_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint para receber webhooks de pagamento PIX do Banco do Brasil.

    Fluxo quando um pagamento é confirmado:
    1. Valida assinatura do webhook (se configurado)
    2. Identifica o trade pelo txid
    3. Atualiza status para PAYMENT_CONFIRMED
    4. Dispara envio automático de crypto em background
    5. Atualiza status para COMPLETED após envio

    Returns:
        Dict com status do processamento
    """
    try:
        # 1. Obter dados do webhook
        payload = await request.body()
        signature = request.headers.get("x-webhook-signature", "")

        logger.info("📩 Webhook PIX recebido do Banco do Brasil")

        # 2. Validar assinatura (ativar em produção!)
        # Descomente para produção:
        # if not verify_webhook_signature(payload, signature):
        #     logger.error("❌ Assinatura do webhook inválida!")
        #     raise HTTPException(status_code=401, detail="Invalid webhook signature")

        webhook_data = await request.json()
        logger.info(f"📦 Payload do webhook: {str(webhook_data)[:500]}")

        # 3. Processar pagamentos PIX
        pix_list = webhook_data.get("pix", [])
        
        if not pix_list:
            logger.info("ℹ️ Webhook sem pagamentos - pode ser notificação de expiração")
            return {"status": "ok", "processed": 0, "message": "No payments to process"}

        processed_count = 0
        
        for pix in pix_list:
            txid = pix.get("txid")
            valor_recebido = pix.get("valor")
            horario = pix.get("horario")
            end_to_end_id = pix.get("endToEndId")

            logger.info(f"💰 Processando pagamento: txid={txid}, valor=R${valor_recebido}, e2e={end_to_end_id}")

            # 4. Buscar trade pelo pix_txid (OTC InstantTrade)
            trade = db.query(InstantTrade).filter(
                InstantTrade.pix_txid == txid
            ).first()

            # Tenta buscar pelo reference_code se não encontrou
            if not trade:
                trade = db.query(InstantTrade).filter(
                    InstantTrade.reference_code.contains(txid)
                ).first()

            # 4b. Se não é OTC, buscar em WolkPay
            wolkpay_payment = None
            if not trade:
                wolkpay_payment = db.query(WolkPayPayment).filter(
                    WolkPayPayment.pix_txid == txid
                ).first()
            
            if not trade and not wolkpay_payment:
                logger.warning(f"⚠️ Trade/WolkPay não encontrado para txid: {txid}")
                continue

            # ===== PROCESSAR OTC (InstantTrade) =====
            if trade:
                # 5. Verificar se já foi processado
                if trade.status in [TradeStatus.PAYMENT_CONFIRMED, TradeStatus.COMPLETED]:
                    logger.info(f"ℹ️ Trade {trade.reference_code} já processado (status={trade.status})")
                    continue

                # 6. Atualizar status para PAYMENT_CONFIRMED
                old_status = trade.status
                trade.status = TradeStatus.PAYMENT_CONFIRMED
                trade.payment_confirmed_at = datetime.utcnow()
                
                # Salvar valor recebido (se o modelo tiver o campo)
                if hasattr(trade, 'pix_valor_recebido'):
                    trade.pix_valor_recebido = Decimal(str(valor_recebido))
                
                # Salvar end_to_end_id
                if hasattr(trade, 'pix_end_to_end_id'):
                    trade.pix_end_to_end_id = end_to_end_id
                
                if hasattr(trade, 'pix_confirmado_em'):
                    trade.pix_confirmado_em = datetime.utcnow()

                # Criar histórico
                history = InstantTradeHistory(
                    trade_id=trade.id,
                    old_status=old_status,
                    new_status=TradeStatus.PAYMENT_CONFIRMED,
                    reason="Pagamento PIX confirmado automaticamente via Webhook BB",
                    history_details=f"Valor: R${valor_recebido}, e2e: {end_to_end_id}, Horário: {horario}"
                )
                db.add(history)
                db.commit()
                
                processed_count += 1
                logger.info(f"✅ Trade {trade.reference_code} atualizado para PAYMENT_CONFIRMED")

                # 7. Disparar envio de crypto em background
                background_tasks.add_task(
                    process_crypto_deposit_background,
                    trade_id=str(trade.id),
                    db_url=str(settings.DATABASE_URL)
                )
                logger.info(f"🚀 Depósito de crypto agendado para trade {trade.reference_code}")
            
            # ===== PROCESSAR WOLKPAY =====
            elif wolkpay_payment:
                # Verificar se já foi processado
                if wolkpay_payment.status == PaymentStatus.PAID:
                    logger.info(f"ℹ️ WolkPay payment {wolkpay_payment.id} já processado")
                    continue
                
                # Buscar invoice associada
                invoice = db.query(WolkPayInvoice).filter(
                    WolkPayInvoice.id == wolkpay_payment.invoice_id
                ).first()
                
                if not invoice:
                    logger.warning(f"⚠️ Invoice não encontrada para payment {wolkpay_payment.id}")
                    continue
                
                # Atualizar payment
                wolkpay_payment.status = PaymentStatus.PAID
                wolkpay_payment.paid_at = datetime.utcnow()
                wolkpay_payment.bank_transaction_id = end_to_end_id
                
                # Atualizar invoice
                invoice.status = InvoiceStatus.PAID
                
                db.commit()
                
                processed_count += 1
                logger.info(f"✅ WolkPay Invoice {invoice.invoice_number} atualizado para PAID")
                
                # Disparar aprovação automática em background (enviar crypto)
                background_tasks.add_task(
                    process_wolkpay_approval_background,
                    invoice_id=str(invoice.id),
                    db_url=str(settings.DATABASE_URL)
                )
                logger.info(f"🚀 Aprovação WolkPay agendada para invoice {invoice.invoice_number}")

        return {
            "status": "ok", 
            "processed": processed_count,
            "message": f"Processed {processed_count} payment(s)"
        }

    except Exception as e:
        logger.error(f"❌ Erro processando webhook: {str(e)}")
        # Retorna 200 mesmo em erro para BB não retentar infinitamente
        # mas loga o erro para investigação
        return {
            "status": "error",
            "message": str(e),
            "processed": 0
        }


async def process_crypto_deposit_background(trade_id: str, db_url: str):
    """
    Processa depósito de crypto em background após confirmação de pagamento.
    
    Esta função é executada de forma assíncrona para não bloquear o webhook.
    
    Args:
        trade_id: ID do trade a processar
        db_url: URL do banco para criar nova sessão
    """
    from app.core.db import SessionLocal
    
    logger.info(f"🔄 Iniciando depósito automático em background para trade {trade_id}")
    
    try:
        # Usa o SessionLocal existente para evitar criar engines adicionais
        db = SessionLocal()
        
        try:
            # Busca trade
            trade = db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()
            
            if not trade:
                logger.error(f"❌ Trade {trade_id} não encontrado para depósito")
                return
            
            # Verifica status
            if trade.status != TradeStatus.PAYMENT_CONFIRMED:
                logger.info(f"ℹ️ Trade {trade.reference_code} não está em PAYMENT_CONFIRMED")
                return
            
            # Importa serviço de blockchain
            from app.services.multi_chain_service import multi_chain_service
            
            # Determina rede (polygon como default para USDT/TRAY)
            network = trade.network or "polygon"
            
            logger.info(f"📤 Enviando {trade.crypto_amount} {trade.symbol} para {trade.wallet_address} via {network}")
            
            # Envia crypto usando multi-chain service (suporta todos os tokens)
            result = await multi_chain_service.send_crypto(
                db=db,
                trade=trade,
                network=network
            )

            if result.success:
                # Atualiza trade como completado
                trade.status = TradeStatus.COMPLETED.value
                trade.completed_at = datetime.utcnow()
                trade.tx_hash = result.tx_hash
                trade.network = result.network or network
                
                # Atualiza wallet_address se retornado
                if hasattr(result, 'wallet_address') and result.wallet_address:
                    trade.wallet_address = result.wallet_address

                # Histórico de conclusão
                history = InstantTradeHistory(
                    trade_id=trade.id,
                    old_status=TradeStatus.PAYMENT_CONFIRMED,
                    new_status=TradeStatus.COMPLETED,
                    reason="Crypto depositada automaticamente após pagamento PIX",
                    history_details=f"TX: {result.tx_hash}, Network: {result.network}"
                )
                db.add(history)
                db.commit()

                logger.info(f"✅ Depósito automático concluído! Trade: {trade.reference_code}, TX: {result.tx_hash}")
            else:
                error_msg = result.error or 'Erro desconhecido'
                logger.error(f"❌ Depósito falhou para {trade.reference_code}: {error_msg}")
                
                # Marca como falha mas não reverte pagamento
                trade.status = TradeStatus.FAILED.value
                trade.error_message = f"Depósito automático falhou: {error_msg}"
                
                history = InstantTradeHistory(
                    trade_id=trade.id,
                    old_status=TradeStatus.PAYMENT_CONFIRMED,
                    new_status=TradeStatus.FAILED,
                    reason="Falha no depósito automático de crypto",
                    history_details=error_msg
                )
                db.add(history)
                db.commit()

        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Erro crítico no depósito automático: {str(e)}")


async def process_wolkpay_approval_background(invoice_id: str, db_url: str):
    """
    Processa aprovação WolkPay em background após confirmação de pagamento PIX.
    
    Envia crypto automaticamente para o beneficiário após pagamento confirmado.
    
    Args:
        invoice_id: ID da invoice WolkPay
        db_url: URL do banco para criar nova sessão
    """
    from app.core.db import SessionLocal
    
    logger.info(f"🔄 Iniciando aprovação automática WolkPay para invoice {invoice_id}")
    
    try:
        # Usa o SessionLocal existente para evitar criar engines adicionais
        db = SessionLocal()
        
        try:
            # Busca invoice
            invoice = db.query(WolkPayInvoice).filter(WolkPayInvoice.id == invoice_id).first()
            
            if not invoice:
                logger.error(f"❌ Invoice {invoice_id} não encontrada para aprovação")
                return
            
            # Verifica status
            if invoice.status != InvoiceStatus.PAID:
                logger.info(f"ℹ️ Invoice {invoice.invoice_number} não está em PAID, status={invoice.status}")
                return
            
            # Importa serviço WolkPay
            from app.services.wolkpay_service import WolkPayService
            
            service = WolkPayService(db)
            
            # Determinar rede preferida
            network = invoice.crypto_network or "polygon"
            
            logger.info(f"📤 Aprovando automaticamente WolkPay: {invoice.crypto_amount} {invoice.crypto_currency} via {network}")
            
            # Aprovar invoice (isso envia a crypto)
            # Usando admin_id como "system" para indicar aprovação automática
            approval = await service.approve_invoice(
                invoice_id=invoice_id,
                admin_id="00000000-0000-0000-0000-000000000000",  # System user
                network=network,
                notes="Aprovação automática via webhook PIX BB"
            )
            
            logger.info(f"✅ WolkPay aprovado automaticamente! Invoice: {invoice.invoice_number}, TX: {approval.crypto_tx_hash}")
            
        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Erro crítico na aprovação WolkPay: {str(e)}")


@router.get("/status")
async def webhook_status(db: Session = Depends(get_db)):
    """
    Verifica status da configuração do webhook.
    
    Returns:
        Status da configuração e últimas atividades
    """
    try:
        bb_service = get_banco_brasil_service(db)
        webhook_config = await bb_service.consultar_webhook()
        
        # Conta trades processados automaticamente (últimas 24h)
        from datetime import timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        auto_confirmed = db.query(InstantTradeHistory).filter(
            InstantTradeHistory.created_at >= yesterday,
            InstantTradeHistory.reason.contains("automaticamente via Webhook BB")
        ).count()
        
        return {
            "status": "ok",
            "webhook": webhook_config,
            "environment": getattr(settings, 'BB_ENVIRONMENT', 'sandbox'),
            "statistics": {
                "auto_confirmed_24h": auto_confirmed
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Erro verificando status webhook: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.post("/configure")
async def configure_webhook(
    webhook_url: str = None,
    db: Session = Depends(get_db)
):
    """
    Configura URL do webhook no Banco do Brasil.
    
    Se não fornecida URL, usa a configurada em BB_WEBHOOK_URL.
    
    Args:
        webhook_url: URL para receber webhooks (opcional)
    
    Returns:
        Status da configuração
    """
    try:
        bb_service = get_banco_brasil_service(db)
        
        url = webhook_url or getattr(settings, 'BB_WEBHOOK_URL', '')
        
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="webhook_url não fornecido e BB_WEBHOOK_URL não configurado"
            )
        
        result = await bb_service.configurar_webhook(url)
        
        if result.get("success"):
            return {
                "status": "ok",
                "message": "Webhook configurado com sucesso",
                "webhook_url": url
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Erro ao configurar webhook")
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro configurando webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/test")
async def test_webhook_processing(
    test_txid: str,
    test_valor: float = 100.00,
    db: Session = Depends(get_db)
):
    """
    Endpoint de teste para simular recebimento de webhook.
    
    APENAS PARA DESENVOLVIMENTO/SANDBOX!
    
    Args:
        test_txid: TXID do PIX para simular
        test_valor: Valor a simular (default R$100)
    """
    if getattr(settings, 'BB_ENVIRONMENT', 'sandbox') == 'production':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint de teste não disponível em produção"
        )
    
    # Simula payload de webhook
    mock_webhook = {
        "pix": [
            {
                "txid": test_txid,
                "valor": f"{test_valor:.2f}",
                "horario": datetime.utcnow().isoformat(),
                "endToEndId": f"E00000000{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            }
        ]
    }
    
    bb_service = get_banco_brasil_service(db)
    result = bb_service.processar_webhook(mock_webhook)
    
    return {
        "status": "test_processed",
        "mock_payload": mock_webhook,
        "result": result
    }
