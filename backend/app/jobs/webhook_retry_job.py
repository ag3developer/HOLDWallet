"""
🔁 Webhook Retry Job - WolkPay Gateway
======================================
Reenvia webhooks que estão em PENDING/FAILED e cuja `next_attempt_at` já passou.

Sem este job, qualquer webhook que falhar uma vez (incluso queda momentânea
do servidor do merchant) **nunca** seria reenviado, pois o `send_webhook`
inicial só é chamado uma vez.

Estratégia:
  - A cada 60s, chama `WebhookService.retry_pending_webhooks()` que:
    * Pega até 100 webhooks com status PENDING/FAILED, attempts < max_attempts
      e next_attempt_at <= now.
    * Tenta reenviar cada um (com backoff exponencial via calculate_next_attempt).

Iniciado pelo lifespan startup do FastAPI.

@version 1.0.0
"""

import asyncio
import logging

from app.core.db import get_db

logger = logging.getLogger(__name__)

# Intervalo entre rodadas de retry
WEBHOOK_RETRY_INTERVAL_SECONDS = 60


async def run_one_retry_round() -> int:
    """
    Executa UMA rodada de retry de webhooks pendentes/falhados.

    Returns:
        int: número de webhooks processados na rodada
    """
    from app.services.gateway.webhook_service import WebhookService

    db = next(get_db())
    try:
        service = WebhookService(db)
        return await service.retry_pending_webhooks()
    except Exception as e:
        logger.exception(f"❌ [WEBHOOK RETRY] Erro inesperado na rodada: {e}")
        return 0
    finally:
        db.close()


async def webhook_retry_loop():
    """
    Loop infinito que reprocessa webhooks pendentes a cada
    WEBHOOK_RETRY_INTERVAL_SECONDS segundos.

    Deve ser iniciado no lifespan startup do FastAPI como background task.
    """
    logger.info(
        f"🚀 [WEBHOOK RETRY] Iniciando loop de retry de webhooks "
        f"(intervalo: {WEBHOOK_RETRY_INTERVAL_SECONDS}s)"
    )

    # Aguarda 45s antes da primeira rodada (deixa o app subir)
    await asyncio.sleep(45)

    while True:
        try:
            count = await run_one_retry_round()
            if count > 0:
                logger.info(f"🔁 [WEBHOOK RETRY] {count} webhook(s) processado(s) nesta rodada")
        except asyncio.CancelledError:
            logger.info("🛑 [WEBHOOK RETRY] Loop cancelado (shutdown)")
            raise
        except Exception as e:
            logger.exception(f"❌ [WEBHOOK RETRY] Erro inesperado no loop: {e}")

        try:
            await asyncio.sleep(WEBHOOK_RETRY_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.info("🛑 [WEBHOOK RETRY] Loop cancelado (shutdown)")
            raise
