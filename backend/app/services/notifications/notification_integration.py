"""
🔔 WOLK NOW - Notification Integration Module
============================================

Módulo simplificado para integração de notificações nos endpoints existentes.
Fornece funções helper assíncronas que podem ser chamadas após operações.

Author: WOLK NOW Team
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, Any
import asyncio
from decimal import Decimal

logger = logging.getLogger(__name__)


def get_user_info(db: Session, user_id: str) -> Optional[Dict[str, Any]]:
    """Busca informações do usuário para notificação"""
    try:
        result = db.execute(text("""
            SELECT 
                u.id, u.email, u.full_name,
                COALESCE(us.language, 'pt') as language
            FROM users u
            LEFT JOIN user_settings us ON us.user_id = u.id
            WHERE u.id = CAST(:user_id AS UUID)
        """), {"user_id": str(user_id)}).fetchone()
        
        if result:
            return {
                "id": str(result.id),
                "email": result.email,
                "name": result.full_name or result.email.split("@")[0],
                "language": result.language or "pt"
            }
        return None
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        return None


def get_notification_preferences(db: Session, user_id: str) -> Dict[str, bool]:
    """Busca preferências de notificação do usuário"""
    try:
        result = db.execute(text("""
            SELECT trade_alerts, price_alerts, security_alerts, marketing_emails, weekly_report
            FROM notification_settings
            WHERE user_id = CAST(:user_id AS UUID)
        """), {"user_id": str(user_id)}).fetchone()
        
        if result:
            return {
                "trade_alerts": result.trade_alerts,
                "price_alerts": result.price_alerts,
                "security_alerts": result.security_alerts,
                "marketing_emails": result.marketing_emails,
                "weekly_report": result.weekly_report
            }
        # Default: all enabled
        return {
            "trade_alerts": True,
            "price_alerts": True,
            "security_alerts": True,
            "marketing_emails": True,
            "weekly_report": True
        }
    except Exception as e:
        logger.error(f"Error getting notification preferences: {e}")
        return {"trade_alerts": True, "security_alerts": True, "price_alerts": True, "marketing_emails": True, "weekly_report": True}


# ============================================
# P2P TRADE NOTIFICATIONS
# ============================================

async def notify_trade_started(
    db: Session,
    trade_id: str,
    buyer_id: str,
    seller_id: str,
    cryptocurrency: str,
    amount: float,
    total_fiat: float,
    fiat_currency: str = "BRL"
):
    """Notifica compradores e vendedores sobre novo trade P2P"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        # Buscar info do comprador
        buyer_info = get_user_info(db, buyer_id)
        if buyer_info:
            await notifier.send_trade_created(
                db=db,
                user_id=buyer_id,
                to_email=buyer_info["email"],
                username=buyer_info["name"],
                trade_type="buy",
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                fiat_amount=total_fiat,
                fiat_currency=fiat_currency,
                price_per_unit=total_fiat / amount if amount > 0 else 0,
                payment_method="PIX",
                order_id=trade_id,
                expires_hours=24
            )
        
        # Buscar info do vendedor
        seller_info = get_user_info(db, seller_id)
        if seller_info:
            await notifier.send_trade_created(
                db=db,
                user_id=seller_id,
                to_email=seller_info["email"],
                username=seller_info["name"],
                trade_type="sell",
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                fiat_amount=total_fiat,
                fiat_currency=fiat_currency,
                price_per_unit=total_fiat / amount if amount > 0 else 0,
                payment_method="PIX",
                order_id=trade_id,
                expires_hours=24
            )
        
        logger.info(f"Trade notifications sent for trade {trade_id}")
        
    except Exception as e:
        logger.error(f"Failed to send trade started notifications: {e}")


async def notify_trade_completed(
    db: Session,
    trade_id: str,
    buyer_id: str,
    seller_id: str,
    cryptocurrency: str,
    amount: float,
    total_fiat: float,
    fiat_currency: str = "BRL",
    fee_amount: float = 0.0
):
    """Notifica sobre trade P2P concluído"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        # Notificar comprador - recebeu crypto
        buyer_info = get_user_info(db, buyer_id)
        if buyer_info:
            await notifier.send_trade_completed(
                db=db,
                user_id=buyer_id,
                to_email=buyer_info["email"],
                username=buyer_info["name"],
                trade_type="buy",
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                fiat_amount=total_fiat,
                fiat_currency=fiat_currency,
                trade_id=trade_id
            )
        
        # Notificar vendedor - recebeu fiat (menos taxa)
        seller_info = get_user_info(db, seller_id)
        if seller_info:
            net_amount = total_fiat - fee_amount
            await notifier.send_trade_completed(
                db=db,
                user_id=seller_id,
                to_email=seller_info["email"],
                username=seller_info["name"],
                trade_type="sell",
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                fiat_amount=net_amount,
                fiat_currency=fiat_currency,
                trade_id=trade_id
            )
        
        logger.info(f"Trade completion notifications sent for trade {trade_id}")
        
    except Exception as e:
        logger.error(f"Failed to send trade completion notifications: {e}")


async def notify_trade_cancelled(
    db: Session,
    trade_id: str,
    buyer_id: str,
    seller_id: str,
    cryptocurrency: str,
    amount: float,
    reason: str = "Cancelado pelo usuário"
):
    """Notifica sobre trade P2P cancelado"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        # Notificar comprador
        buyer_info = get_user_info(db, buyer_id)
        if buyer_info:
            await notifier.send_trade_cancelled(
                db=db,
                user_id=buyer_id,
                to_email=buyer_info["email"],
                username=buyer_info["name"],
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                reason=reason,
                trade_id=trade_id
            )
        
        # Notificar vendedor
        seller_info = get_user_info(db, seller_id)
        if seller_info:
            await notifier.send_trade_cancelled(
                db=db,
                user_id=seller_id,
                to_email=seller_info["email"],
                username=seller_info["name"],
                crypto_amount=amount,
                crypto_symbol=cryptocurrency,
                reason=reason,
                trade_id=trade_id
            )
        
        logger.info(f"Trade cancellation notifications sent for trade {trade_id}")
        
    except Exception as e:
        logger.error(f"Failed to send trade cancellation notifications: {e}")


async def notify_trade_dispute(
    db: Session,
    trade_id: str,
    buyer_id: str,
    seller_id: str,
    cryptocurrency: str,
    amount: float,
    dispute_reason: str
):
    """Notifica sobre disputa aberta em trade P2P - apenas log por enquanto"""
    # NotificationService não tem template para disputas ainda
    logger.info(f"Trade dispute opened for trade {trade_id}: {dispute_reason}")
    # TODO: Implementar send_trade_disputed no NotificationService quando necessário


async def notify_new_chat_message(
    db: Session,
    trade_id: str,
    sender_id: str,
    recipient_id: str,
    message_preview: str
):
    """Notifica sobre nova mensagem no chat do trade - apenas log por enquanto"""
    # NotificationService não tem template para chat ainda
    logger.info(f"New chat message in trade {trade_id}")
    # TODO: Implementar send_chat_message no NotificationService quando necessário


# ============================================
# WOLKPAY INVOICE NOTIFICATIONS
# ============================================

async def notify_invoice_created(
    db: Session,
    user_id: str,
    invoice_id: str,
    amount: float,
    cryptocurrency: str,
    description: str
):
    """Notifica sobre invoice WolkPay criada"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for invoice notification: {user_id}")
            return
        
        # send_invoice_created precisa de payment_link
        frontend_url = "https://wolknow.com"
        payment_link = f"{frontend_url}/wolkpay/invoice/{invoice_id}"
        
        await notifier.send_invoice_created(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            invoice_id=invoice_id,
            amount=amount,
            currency=cryptocurrency,
            description=description,
            payment_link=payment_link,
            expires_hours=24
        )
        
        logger.info(f"Invoice created notification sent for invoice {invoice_id}")
        
    except Exception as e:
        logger.error(f"Failed to send invoice created notification: {e}")


async def notify_invoice_paid(
    db: Session,
    merchant_user_id: str,
    invoice_id: str,
    amount: float,
    cryptocurrency: str,
    payer_name: str = "Cliente"
):
    """Notifica sobre invoice WolkPay paga"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, merchant_user_id)
        if not user_info:
            logger.warning(f"User not found for invoice paid notification: {merchant_user_id}")
            return
        
        await notifier.send_invoice_paid(
            db=db,
            user_id=merchant_user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            invoice_id=invoice_id,
            amount=amount,
            currency="BRL",  # Fiat amount
            crypto_amount=amount,
            crypto_symbol=cryptocurrency,
            payer_email=None
        )
        
        logger.info(f"Invoice paid notification sent for invoice {invoice_id}")
        
    except Exception as e:
        logger.error(f"Failed to send invoice paid notification: {e}")


async def notify_invoice_expired(
    db: Session,
    user_id: str,
    invoice_id: str,
    amount: float,
    cryptocurrency: str
):
    """Notifica sobre invoice WolkPay expirada"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for invoice expired notification: {user_id}")
            return
        
        await notifier.send_invoice_expired(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            invoice_id=invoice_id,
            amount=amount,
            currency=cryptocurrency
        )
        
        logger.info(f"Invoice expired notification sent for invoice {invoice_id}")
        
    except Exception as e:
        logger.error(f"Failed to send invoice expired notification: {e}")


# ============================================
# BILL PAYMENT NOTIFICATIONS
# ============================================

async def notify_bill_payment_processing(
    db: Session,
    user_id: str,
    bill_type: str,
    amount: float,
    barcode: str,
    beneficiary: str = "Beneficiário",
    due_date: str = "",
    crypto_amount: float = 0,
    crypto_symbol: str = "USDT",
    transaction_id: str = ""
):
    """Notifica sobre boleto sendo processado"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for bill processing notification: {user_id}")
            return
        
        await notifier.send_bill_processing(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            barcode=barcode,
            beneficiary=beneficiary,
            amount=amount,
            due_date=due_date or "N/A",
            crypto_amount=crypto_amount,
            crypto_symbol=crypto_symbol,
            transaction_id=transaction_id or "N/A"
        )
        
        logger.info(f"Bill processing notification sent for barcode {barcode[-8:]}")
        
    except Exception as e:
        logger.error(f"Failed to send bill processing notification: {e}")


async def notify_bill_payment_completed(
    db: Session,
    user_id: str,
    bill_type: str,
    amount: float,
    transaction_id: str,
    beneficiary: str = "Beneficiário",
    authentication_code: str = "",
    crypto_amount: float = 0,
    crypto_symbol: str = "USDT"
):
    """Notifica sobre boleto pago com sucesso"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for bill completed notification: {user_id}")
            return
        
        await notifier.send_bill_paid(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            beneficiary=beneficiary,
            amount=amount,
            authentication_code=authentication_code or transaction_id[:12],
            crypto_amount=crypto_amount,
            crypto_symbol=crypto_symbol,
            transaction_id=transaction_id
        )
        
        logger.info(f"Bill completed notification sent for transaction {transaction_id}")
        
    except Exception as e:
        logger.error(f"Failed to send bill completed notification: {e}")


async def notify_bill_payment_failed(
    db: Session,
    user_id: str,
    bill_type: str,
    amount: float,
    reason: str,
    beneficiary: str = "Beneficiário",
    transaction_id: str = ""
):
    """Notifica sobre falha no pagamento de boleto"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for bill failed notification: {user_id}")
            return
        
        await notifier.send_bill_failed(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            beneficiary=beneficiary,
            amount=amount,
            reason=reason,
            transaction_id=transaction_id or "N/A"
        )
        
        logger.info("Bill failed notification sent")
        
    except Exception as e:
        logger.error(f"Failed to send bill failed notification: {e}")


# ============================================
# WALLET NOTIFICATIONS
# ============================================

async def notify_deposit_received(
    db: Session,
    user_id: str,
    amount: float,
    cryptocurrency: str,
    tx_hash: Optional[str] = None,
    network: str = "BTC"
):
    """Notifica sobre depósito recebido"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for deposit notification: {user_id}")
            return
        
        await notifier.send_deposit_received(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            amount=amount,
            symbol=cryptocurrency,
            network=network,
            tx_hash=tx_hash or "N/A",
            confirmations=1,
            new_balance=amount  # Simplified - we don't have balance here
        )
        
        logger.info(f"Deposit notification sent: {amount} {cryptocurrency}")
        
    except Exception as e:
        logger.error(f"Failed to send deposit notification: {e}")


async def notify_withdrawal_submitted(
    db: Session,
    user_id: str,
    amount: float,
    cryptocurrency: str,
    destination: str,
    network: str = "BTC"
):
    """Notifica sobre saque enviado para processamento"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for withdrawal submitted notification: {user_id}")
            return
        
        await notifier.send_withdrawal_requested(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            amount=amount,
            symbol=cryptocurrency,
            address=destination,
            network=network,
            fee=0.0,
            withdrawal_id="N/A"
        )
        
        logger.info(f"Withdrawal submitted notification sent: {amount} {cryptocurrency}")
        
    except Exception as e:
        logger.error(f"Failed to send withdrawal submitted notification: {e}")


async def notify_withdrawal_completed(
    db: Session,
    user_id: str,
    amount: float,
    cryptocurrency: str,
    tx_hash: Optional[str] = None,
    address: str = ""
):
    """Notifica sobre saque concluído"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for withdrawal completed notification: {user_id}")
            return
        
        await notifier.send_withdrawal_completed(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            amount=amount,
            symbol=cryptocurrency,
            address=address or "N/A",
            tx_hash=tx_hash or "N/A"
        )
        
        logger.info(f"Withdrawal completed notification sent: {amount} {cryptocurrency}")
        
    except Exception as e:
        logger.error(f"Failed to send withdrawal completed notification: {e}")


async def notify_withdrawal_failed(
    db: Session,
    user_id: str,
    amount: float,
    cryptocurrency: str,
    reason: str
):
    """Notifica sobre saque falhou"""
    # NotificationService não tem send_withdrawal_failed, usar log
    logger.info(f"Withdrawal failed for user {user_id}: {amount} {cryptocurrency} - {reason}")
    # TODO: Implementar send_withdrawal_failed no NotificationService quando necessário


# ============================================
# ACCOUNT NOTIFICATIONS
# ============================================

async def notify_welcome(db: Session, user_id: str, user_email: str, user_name: str):
    """Notifica novo usuário com email de boas-vindas"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        await notifier.send_welcome(
            db=db,
            user_id=user_id,
            to_email=user_email,
            username=user_name
        )
        
        logger.info(f"Welcome notification sent to {user_email}")
        
    except Exception as e:
        logger.error(f"Failed to send welcome notification: {e}")


async def notify_kyc_status_change(
    db: Session,
    user_id: str,
    new_status: str,
    level: Optional[str] = None,
    rejection_reason: Optional[str] = None
):
    """Notifica sobre mudança de status do KYC"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for KYC notification: {user_id}")
            return
        
        if new_status == "approved":
            await notifier.send_kyc_approved(
                db=db,
                user_id=user_id,
                to_email=user_info["email"],
                username=user_info["name"],
                level=level or "basic"
            )
        elif new_status == "rejected":
            await notifier.send_kyc_rejected(
                db=db,
                user_id=user_id,
                to_email=user_info["email"],
                username=user_info["name"],
                reason=rejection_reason or "Documentos inválidos"
            )
        elif new_status == "pending":
            # Não há template para pending, apenas log
            logger.info(f"KYC submitted for user {user_id}")
        
        logger.info(f"KYC status notification sent for user {user_id}: {new_status}")
        
    except Exception as e:
        logger.error(f"Failed to send KYC notification: {e}")


# ============================================
# INSTANT TRADE (OTC) NOTIFICATIONS
# ============================================

async def notify_instant_buy_completed(
    db: Session,
    user_id: str,
    crypto_amount: float,
    crypto_symbol: str,
    fiat_amount: float,
    transaction_id: str,
    fiat_currency: str = "BRL"
):
    """Notifica sobre compra instantânea (OTC) concluída"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for notification: {user_id}")
            return
        
        await notifier.send_instant_buy_completed(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            crypto_amount=crypto_amount,
            crypto_symbol=crypto_symbol,
            fiat_amount=fiat_amount,
            fiat_currency=fiat_currency,
            transaction_id=transaction_id
        )
        
        logger.info(f"Instant buy notification sent: {crypto_amount} {crypto_symbol} for user {user_id}")
        
    except Exception as e:
        logger.error(f"Failed to send instant buy notification: {e}")


async def notify_instant_sell_completed(
    db: Session,
    user_id: str,
    crypto_amount: float,
    crypto_symbol: str,
    fiat_amount: float,
    transaction_id: str,
    fiat_currency: str = "BRL"
):
    """Notifica sobre venda instantânea (OTC) concluída"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for notification: {user_id}")
            return
        
        await notifier.send_instant_sell_completed(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            crypto_amount=crypto_amount,
            crypto_symbol=crypto_symbol,
            fiat_amount=fiat_amount,
            fiat_currency=fiat_currency,
            transaction_id=transaction_id
        )
        
        logger.info(f"Instant sell notification sent: {crypto_amount} {crypto_symbol} for user {user_id}")
        
    except Exception as e:
        logger.error(f"Failed to send instant sell notification: {e}")


async def notify_instant_trade_pending(
    db: Session,
    user_id: str,
    operation_type: str,  # "buy" or "sell"
    crypto_amount: float,
    crypto_symbol: str,
    fiat_amount: float,
    reference_code: str,
    fiat_currency: str = "BRL"
):
    """Notifica sobre trade instantâneo aguardando pagamento/processamento"""
    try:
        from app.services.notifications import NotificationService
        
        notifier = NotificationService()
        
        user_info = get_user_info(db, user_id)
        if not user_info:
            logger.warning(f"User not found for notification: {user_id}")
            return
        
        await notifier.send_trade_created(
            db=db,
            user_id=user_id,
            to_email=user_info["email"],
            username=user_info["name"],
            trade_type=operation_type,
            crypto_amount=crypto_amount,
            crypto_symbol=crypto_symbol,
            fiat_amount=fiat_amount,
            fiat_currency=fiat_currency,
            price_per_unit=fiat_amount / crypto_amount if crypto_amount > 0 else 0,
            payment_method="PIX",
            order_id=reference_code,
            expires_hours=1  # OTC expires in ~15 min
        )
        
        logger.info(f"Instant trade pending notification sent: {reference_code}")
        
    except Exception as e:
        logger.error(f"Failed to send instant trade pending notification: {e}")


# ============================================
# HELPER: Fire and forget notifications
# ============================================

def fire_and_forget(coro):
    """Execute coroutine without waiting (fire and forget pattern)"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # No running loop, create new one
        asyncio.run(coro)
