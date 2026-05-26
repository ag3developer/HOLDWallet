"""
🔄 PIX Reconciliation Job - WolkPay Gateway
===========================================
Job de reconciliação de pagamentos PIX recebidos via Banco do Brasil.

Resolve o problema de pagamentos que ficam "pendurados" em PENDING
quando o webhook do BB falha ou não é entregue.

Estratégia:
  - A cada N segundos, lista todos os GatewayPayment com:
    * payment_method = PIX
    * status in (PENDING, PROCESSING)
    * created_at >= (now - 24h)
    * expires_at >= now (ainda não expirou)
  - Para cada um, consulta o BB via verificar_pagamento(txid).
  - Se BB confirma pagamento → chama payment_service.confirm_pix_payment(...)

Esse é um FALLBACK do webhook (que continua sendo a fonte primária).

@version 1.0.0
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from app.core.db import get_db

logger = logging.getLogger(__name__)

# Intervalo entre cada rodada de reconciliação (segundos)
RECONCILIATION_INTERVAL_SECONDS = 120  # 2 minutos

# Janela de tempo: olha pagamentos criados nas últimas 24h
LOOKBACK_HOURS = 24

# Limite máximo de pagamentos verificados por rodada (proteção)
MAX_PAYMENTS_PER_RUN = 50


async def reconcile_pending_pix_payments() -> dict:
    """
    Executa UMA rodada de reconciliação dos pagamentos PIX pendentes.
    
    Returns:
        dict com estatísticas: checked, confirmed, errors
    """
    from app.models.gateway import (
        GatewayPayment,
        GatewayPaymentStatus,
        GatewayPaymentMethod,
    )
    from app.services.banco_brasil_service import BancoBrasilService
    from app.services.gateway.payment_service import GatewayPaymentService
    
    stats = {"checked": 0, "confirmed": 0, "errors": 0, "skipped": 0}
    
    db = next(get_db())
    
    try:
        now = datetime.now(timezone.utc)
        lookback = now - timedelta(hours=LOOKBACK_HOURS)
        
        # Busca PIX pendentes
        pending_payments = (
            db.query(GatewayPayment)
            .filter(
                GatewayPayment.payment_method == GatewayPaymentMethod.PIX,
                GatewayPayment.status.in_([
                    GatewayPaymentStatus.PENDING,
                    GatewayPaymentStatus.PROCESSING,
                ]),
                GatewayPayment.created_at >= lookback,
                GatewayPayment.pix_txid.isnot(None),
            )
            .order_by(GatewayPayment.created_at.desc())
            .limit(MAX_PAYMENTS_PER_RUN)
            .all()
        )
        
        if not pending_payments:
            return stats
        
        logger.info(
            f"🔄 [PIX RECON] Verificando {len(pending_payments)} pagamentos PIX pendentes..."
        )
        
        # Instancia serviços
        try:
            bb_service = BancoBrasilService()
        except Exception as e:
            logger.error(f"❌ [PIX RECON] Erro ao inicializar BancoBrasilService: {e}")
            stats["errors"] = len(pending_payments)
            return stats
        
        payment_service = GatewayPaymentService(db)
        
        for payment in pending_payments:
            stats["checked"] += 1
            
            # Pular se já expirou (não vamos consultar BB para PIX expirados)
            if payment.expires_at and payment.expires_at < now:
                stats["skipped"] += 1
                continue
            
            txid = payment.pix_txid
            if not txid:
                stats["skipped"] += 1
                continue
            
            try:
                # Consulta status no BB
                bb_result = await bb_service.verificar_pagamento(str(txid))
                
                if bb_result.get("pago") is True:
                    valor_pago = bb_result.get("valor_pago") or Decimal("0")
                    horario_str = bb_result.get("horario_pagamento")
                    end_to_end_id = bb_result.get("end_to_end_id")
                    
                    # Parse do horario (ISO string vinda do BB)
                    horario_dt: Optional[datetime] = None
                    if horario_str:
                        try:
                            horario_dt = datetime.fromisoformat(
                                str(horario_str).replace("Z", "+00:00")
                            )
                        except (ValueError, TypeError):
                            horario_dt = now
                    else:
                        horario_dt = now
                    
                    # Confirma o pagamento
                    confirmed = await payment_service.confirm_pix_payment(
                        txid=str(txid),
                        valor_recebido=Decimal(str(valor_pago)),
                        horario=horario_dt,
                        end_to_end_id=str(end_to_end_id) if end_to_end_id else None,
                    )
                    
                    if confirmed:
                        stats["confirmed"] += 1
                        logger.info(
                            f"✅ [PIX RECON] Confirmado via polling: "
                            f"payment_id={payment.payment_id} txid={txid} valor={valor_pago}"
                        )
            except Exception as e:
                stats["errors"] += 1
                logger.warning(
                    f"⚠️ [PIX RECON] Erro ao verificar payment {payment.payment_id} "
                    f"(txid={txid}): {e}"
                )
        
        if stats["confirmed"] > 0 or stats["errors"] > 0:
            logger.info(
                f"🔄 [PIX RECON] Rodada concluída: {stats['confirmed']} confirmados, "
                f"{stats['skipped']} pulados, {stats['errors']} erros "
                f"(de {stats['checked']} verificados)"
            )
        
        return stats
        
    finally:
        db.close()


async def pix_reconciliation_loop():
    """
    Loop infinito que executa a reconciliação a cada N segundos.
    Deve ser iniciado no lifespan startup do FastAPI como background task.
    """
    logger.info(
        f"🚀 [PIX RECON] Iniciando loop de reconciliação "
        f"(intervalo: {RECONCILIATION_INTERVAL_SECONDS}s)"
    )
    
    # Aguarda 30s antes da primeira rodada (deixa o app subir)
    await asyncio.sleep(30)
    
    while True:
        try:
            await reconcile_pending_pix_payments()
        except asyncio.CancelledError:
            logger.info("🛑 [PIX RECON] Loop cancelado (shutdown)")
            raise
        except Exception as e:
            logger.exception(f"❌ [PIX RECON] Erro inesperado no loop: {e}")
        
        try:
            await asyncio.sleep(RECONCILIATION_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.info("🛑 [PIX RECON] Loop cancelado (shutdown)")
            raise
