"""
WOLK NOW - Notification Services
=================================

Sistema centralizado de notificações por email.
Todas as notificações transacionais da plataforma.

Módulos:
- email_templates: Templates HTML para emails
- trading_notifications: Notificações de P2P e trades
- wolkpay_notifications: Notificações de faturas WolkPay
- bill_notifications: Notificações de pagamento de boletos
- wallet_notifications: Notificações de depósitos/saques
- account_notifications: Notificações de conta (KYC, welcome)
- notification_service: Serviço principal que orquestra tudo

Author: WOLK NOW LLC
"""

from .notification_service import NotificationService, notification_service
from .email_templates import EmailTemplates, TRANSLATIONS
from .notification_integration import (
    # Trade notifications
    notify_trade_started,
    notify_trade_completed,
    notify_trade_cancelled,
    notify_trade_dispute,
    notify_new_chat_message,
    
    # Invoice notifications
    notify_invoice_created,
    notify_invoice_paid,
    notify_invoice_expired,
    
    # Bill payment notifications
    notify_bill_payment_processing,
    notify_bill_payment_completed,
    notify_bill_payment_failed,
    
    # Wallet notifications
    notify_deposit_received,
    notify_withdrawal_submitted,
    notify_withdrawal_completed,
    notify_withdrawal_failed,
    
    # Account notifications
    notify_welcome,
    notify_kyc_status_change,
    
    # Instant Trade OTC notifications
    notify_instant_buy_completed,
    notify_instant_sell_completed,
    notify_instant_trade_pending,
    
    # Helpers
    fire_and_forget,
    get_user_info,
    get_notification_preferences
)

__all__ = [
    "NotificationService",
    "notification_service",
    "EmailTemplates",
    "TRANSLATIONS",
    
    # Trade
    "notify_trade_started",
    "notify_trade_completed", 
    "notify_trade_cancelled",
    "notify_trade_dispute",
    "notify_new_chat_message",
    
    # Invoice
    "notify_invoice_created",
    "notify_invoice_paid",
    "notify_invoice_expired",
    
    # Bill Payment
    "notify_bill_payment_processing",
    "notify_bill_payment_completed",
    "notify_bill_payment_failed",
    
    # Wallet
    "notify_deposit_received",
    "notify_withdrawal_submitted",
    "notify_withdrawal_completed",
    "notify_withdrawal_failed",
    
    # Account
    "notify_welcome",
    "notify_kyc_status_change",
    
    # Instant Trade OTC
    "notify_instant_buy_completed",
    "notify_instant_sell_completed",
    "notify_instant_trade_pending",
    
    # Helpers
    "fire_and_forget",
    "get_user_info",
    "get_notification_preferences"
]
