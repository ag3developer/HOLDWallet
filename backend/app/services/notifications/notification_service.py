"""
WOLK NOW - Notification Service
================================

Servico central de notificacoes por email.
Integra com o email_service existente e respeita preferencias do usuario.

Author: WOLK NOW LLC
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from .email_templates import EmailTemplates, TRANSLATIONS

logger = logging.getLogger(__name__)

# Importar resend
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend nao instalado. Execute: pip install resend")


class NotificationService:
    """
    Servico central de notificacoes.
    
    Envia emails transacionais respeitando as preferencias do usuario.
    Suporta: PT, EN, ES
    """
    
    FROM_EMAIL = "WOLK NOW <hello@wolknow.com>"
    FROM_EMAIL_TRANSACTIONS = "WOLK NOW <transactions@wolknow.com>"
    FROM_EMAIL_SECURITY = "WOLK NOW Security <security@wolknow.com>"
    
    def __init__(self):
        """Inicializa o servico."""
        self.api_key = os.getenv("RESEND_API_KEY")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://wolknow.com")
        self.is_configured = False
        
        if RESEND_AVAILABLE and self.api_key:
            resend.api_key = self.api_key
            self.is_configured = True
            logger.info("NotificationService configurado com Resend")
        else:
            logger.warning("NotificationService em modo log-only")
    
    def _get_user_language(self, db: Session, user_id: str) -> str:
        """Obtem o idioma preferido do usuario."""
        try:
            from app.models.user_settings import UserSettings
            settings = db.query(UserSettings).filter(
                UserSettings.user_id == user_id
            ).first()
            return settings.language if settings and settings.language else "pt"
        except Exception:
            return "pt"
    
    def _check_notification_enabled(
        self, 
        db: Session, 
        user_id: str, 
        notification_type: str
    ) -> bool:
        """Verifica se o usuario tem a notificacao habilitada."""
        try:
            from app.models.user_profile import NotificationSettings
            settings = db.query(NotificationSettings).filter(
                NotificationSettings.user_id == user_id
            ).first()
            
            if not settings:
                return True  # Default: habilitado
            
            # Mapear tipos de notificacao para campos
            type_map = {
                "trade": settings.trade_alerts,
                "security": settings.security_alerts,
                "price": settings.price_alerts,
                "marketing": settings.marketing_emails,
            }
            
            return type_map.get(notification_type, True)
        except Exception:
            return True
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Envia um email."""
        if not self.is_configured:
            logger.info(f"[LOG-ONLY] Email para {to_email}: {subject}")
            return {"success": False, "message": "Email service not configured", "log_only": True}
        
        try:
            result = resend.Emails.send({
                "from": from_email or self.FROM_EMAIL,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            
            logger.info(f"Email enviado para {to_email}: {subject}")
            return {"success": True, "message": "Email sent successfully", "id": str(result)}
            
        except Exception as e:
            logger.error(f"Erro ao enviar email para {to_email}: {str(e)}")
            return {"success": False, "message": str(e), "error": True}
    
    # ============================================
    # TRADING / P2P
    # ============================================
    
    async def send_trade_created(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        trade_type: str,  # "buy" ou "sell"
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        price_per_unit: float,
        payment_method: str,
        order_id: str,
        expires_hours: int = 24
    ) -> Dict[str, Any]:
        """Notifica que uma ordem P2P foi criada."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        trade_type_text = t("trade_buy") if trade_type == "buy" else t("trade_sell")
        
        rows = [
            EmailTemplates.data_row(t("trade_type"), trade_type_text),
            EmailTemplates.data_row(t("crypto_amount"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("fiat_amount", currency=fiat_currency), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
            EmailTemplates.data_row(t("price_per_unit"), EmailTemplates.format_currency(price_per_unit, fiat_currency)),
            EmailTemplates.data_row(t("payment_method"), payment_method),
            EmailTemplates.data_row(t("transaction_id"), order_id[:8] + "..."),
        ]
        
        content = f"""
            <h2>{t("trade_created_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("trade_created_message")}</p>
            
            {EmailTemplates.success_box(f"{trade_type_text}: {EmailTemplates.format_crypto(crypto_amount, crypto_symbol)}")}
            
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.info_box(t("order_expires", hours=expires_hours))}
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/p2p/order/{order_id}")}
        """
        
        html = EmailTemplates.get_base_template(t("trade_created_subject"), content, lang)
        return await self._send_email(to_email, t("trade_created_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_trade_match(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        counterparty_name: str,
        trade_type: str,
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        trade_id: str
    ) -> Dict[str, Any]:
        """Notifica que alguem quer negociar."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        trade_type_text = t("trade_buy") if trade_type == "buy" else t("trade_sell")
        
        rows = [
            EmailTemplates.data_row(t("counterparty"), counterparty_name),
            EmailTemplates.data_row(t("trade_type"), trade_type_text),
            EmailTemplates.data_row(t("crypto_amount"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("fiat_amount", currency=fiat_currency), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
        ]
        
        content = f"""
            <h2>{t("trade_match_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("trade_match_message")}</p>
            
            {EmailTemplates.success_box(t("trade_match_title"))}
            
            {EmailTemplates.data_table(rows)}
            
            <p>{t("trade_match_action")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/p2p/trade/{trade_id}")}
        """
        
        html = EmailTemplates.get_base_template(t("trade_match_subject"), content, lang)
        return await self._send_email(to_email, t("trade_match_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_payment_sent(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        is_buyer: bool,
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        trade_id: str
    ) -> Dict[str, Any]:
        """Notifica que o pagamento foi marcado como enviado."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        message = t("payment_sent_buyer_message") if is_buyer else t("payment_sent_seller_action")
        
        rows = [
            EmailTemplates.data_row(t("crypto_amount"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("fiat_amount", currency=fiat_currency), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
        ]
        
        content = f"""
            <h2>{t("payment_sent_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("payment_sent_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.warning_box(message) if not is_buyer else EmailTemplates.info_box(message)}
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/p2p/trade/{trade_id}")}
        """
        
        html = EmailTemplates.get_base_template(t("payment_sent_subject"), content, lang)
        return await self._send_email(to_email, t("payment_sent_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_trade_completed(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        trade_type: str,
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        trade_id: str
    ) -> Dict[str, Any]:
        """Notifica que o trade foi concluido."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        trade_type_text = t("trade_buy") if trade_type == "buy" else t("trade_sell")
        
        rows = [
            EmailTemplates.data_row(t("trade_type"), trade_type_text),
            EmailTemplates.data_row(t("crypto_amount"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("fiat_amount", currency=fiat_currency), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
            EmailTemplates.data_row(t("status"), t("completed")),
        ]
        
        content = f"""
            <h2>{t("trade_completed_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("trade_completed_message")}</p>
            
            {EmailTemplates.success_box(t("trade_completed_title"))}
            
            <h3>{t("trade_summary")}</h3>
            {EmailTemplates.data_table(rows)}
            
            <p style="text-align: center; color: #6b7280;">{t("trade_completed_thanks")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/p2p/trade/{trade_id}")}
        """
        
        html = EmailTemplates.get_base_template(t("trade_completed_subject"), content, lang)
        return await self._send_email(to_email, t("trade_completed_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_trade_cancelled(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        crypto_amount: float,
        crypto_symbol: str,
        reason: str,
        trade_id: str
    ) -> Dict[str, Any]:
        """Notifica que o trade foi cancelado."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("crypto_amount"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("cancellation_reason"), reason),
            EmailTemplates.data_row(t("status"), t("cancelled")),
        ]
        
        content = f"""
            <h2>{t("trade_cancelled_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("trade_cancelled_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.info_box(t("trade_cancelled_refund"))}
        """
        
        html = EmailTemplates.get_base_template(t("trade_cancelled_subject"), content, lang)
        return await self._send_email(to_email, t("trade_cancelled_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    # ============================================
    # INSTANT TRADE
    # ============================================
    
    async def send_instant_buy_completed(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Notifica compra instantanea concluida."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("you_bought"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("you_paid"), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
            EmailTemplates.data_row(t("transaction_id"), transaction_id[:12] + "..."),
            EmailTemplates.data_row(t("status"), t("completed")),
        ]
        
        content = f"""
            <h2>{t("instant_buy_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("instant_buy_message")}</p>
            
            {EmailTemplates.success_box(f"+{EmailTemplates.format_crypto(crypto_amount, crypto_symbol)}")}
            
            {EmailTemplates.data_table(rows)}
            
            <p>{t("crypto_credited")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/wallet")}
        """
        
        html = EmailTemplates.get_base_template(t("instant_buy_subject"), content, lang)
        return await self._send_email(to_email, t("instant_buy_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_instant_sell_completed(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        crypto_amount: float,
        crypto_symbol: str,
        fiat_amount: float,
        fiat_currency: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Notifica venda instantanea concluida."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("you_sold"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("you_received"), EmailTemplates.format_currency(fiat_amount, fiat_currency)),
            EmailTemplates.data_row(t("transaction_id"), transaction_id[:12] + "..."),
            EmailTemplates.data_row(t("status"), t("completed")),
        ]
        
        content = f"""
            <h2>{t("instant_sell_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("instant_sell_message")}</p>
            
            {EmailTemplates.success_box(f"+{EmailTemplates.format_currency(fiat_amount, fiat_currency)}")}
            
            {EmailTemplates.data_table(rows)}
            
            <p>{t("pix_credited")}</p>
        """
        
        html = EmailTemplates.get_base_template(t("instant_sell_subject"), content, lang)
        return await self._send_email(to_email, t("instant_sell_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    # ============================================
    # WOLKPAY (INVOICES)
    # ============================================
    
    async def send_invoice_created(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        invoice_id: str,
        amount: float,
        currency: str,
        description: str,
        payment_link: str,
        expires_hours: int = 24
    ) -> Dict[str, Any]:
        """Notifica que uma fatura WolkPay foi criada."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("invoice_id"), invoice_id[:12] + "..."),
            EmailTemplates.data_row(t("invoice_amount"), EmailTemplates.format_currency(amount, currency)),
            EmailTemplates.data_row(t("invoice_description"), description[:50] + "..." if len(description) > 50 else description),
        ]
        
        content = f"""
            <h2>{t("invoice_created_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("invoice_created_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            <p><strong>{t("payment_link")}:</strong></p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px; background-color: #f8fafc; padding: 12px; border-radius: 6px;">{payment_link}</p>
            
            {EmailTemplates.info_box(t("invoice_expires", hours=expires_hours))}
            
            <p>{t("share_link")}</p>
        """
        
        html = EmailTemplates.get_base_template(t("invoice_created_subject"), content, lang)
        return await self._send_email(to_email, t("invoice_created_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_invoice_paid(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        invoice_id: str,
        amount: float,
        currency: str,
        crypto_amount: float,
        crypto_symbol: str,
        payer_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notifica que uma fatura WolkPay foi paga."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("invoice_id"), invoice_id[:12] + "..."),
            EmailTemplates.data_row(t("invoice_amount"), EmailTemplates.format_currency(amount, currency)),
            EmailTemplates.data_row(t("crypto_received"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
        ]
        
        if payer_email:
            rows.insert(1, EmailTemplates.data_row(t("payer_email"), payer_email))
        
        content = f"""
            <h2>{t("invoice_paid_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("invoice_paid_message")}</p>
            
            {EmailTemplates.success_box(f"+{EmailTemplates.format_crypto(crypto_amount, crypto_symbol)}")}
            
            {EmailTemplates.data_table(rows)}
            
            <p>{t("invoice_paid_credited")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/wallet")}
        """
        
        html = EmailTemplates.get_base_template(t("invoice_paid_subject"), content, lang)
        return await self._send_email(to_email, t("invoice_paid_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_invoice_expired(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        invoice_id: str,
        amount: float,
        currency: str
    ) -> Dict[str, Any]:
        """Notifica que uma fatura WolkPay expirou."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("invoice_id"), invoice_id[:12] + "..."),
            EmailTemplates.data_row(t("invoice_amount"), EmailTemplates.format_currency(amount, currency)),
            EmailTemplates.data_row(t("status"), t("cancelled")),
        ]
        
        content = f"""
            <h2>{t("invoice_expired_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("invoice_expired_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.info_box(t("invoice_expired_tip"))}
        """
        
        html = EmailTemplates.get_base_template(t("invoice_expired_subject"), content, lang)
        return await self._send_email(to_email, t("invoice_expired_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    # ============================================
    # BILL PAYMENT (BOLETOS)
    # ============================================
    
    async def send_bill_processing(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        barcode: str,
        beneficiary: str,
        amount: float,
        due_date: str,
        crypto_amount: float,
        crypto_symbol: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Notifica que o pagamento de boleto esta em processamento."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("bill_beneficiary"), beneficiary[:30] + "..." if len(beneficiary) > 30 else beneficiary),
            EmailTemplates.data_row(t("amount"), EmailTemplates.format_currency(amount, "BRL")),
            EmailTemplates.data_row(t("bill_due_date"), due_date),
            EmailTemplates.data_row(t("crypto_deducted"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("transaction_id"), transaction_id[:12] + "..."),
        ]
        
        content = f"""
            <h2>{t("bill_processing_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("bill_processing_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            <p style="font-size: 12px; color: #6b7280;"><strong>{t("bill_barcode")}:</strong> {barcode[:20]}...{barcode[-10:]}</p>
            
            {EmailTemplates.info_box(t("bill_processing_time"))}
        """
        
        html = EmailTemplates.get_base_template(t("bill_processing_subject"), content, lang)
        return await self._send_email(to_email, t("bill_processing_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_bill_paid(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        beneficiary: str,
        amount: float,
        authentication_code: str,
        crypto_amount: float,
        crypto_symbol: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Notifica que o boleto foi pago."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("bill_beneficiary"), beneficiary[:30] + "..." if len(beneficiary) > 30 else beneficiary),
            EmailTemplates.data_row(t("amount"), EmailTemplates.format_currency(amount, "BRL")),
            EmailTemplates.data_row(t("crypto_deducted"), EmailTemplates.format_crypto(crypto_amount, crypto_symbol)),
            EmailTemplates.data_row(t("authentication_code"), authentication_code),
            EmailTemplates.data_row(t("status"), t("completed")),
        ]
        
        content = f"""
            <h2>{t("bill_paid_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("bill_paid_message")}</p>
            
            {EmailTemplates.success_box(t("bill_paid_title"))}
            
            <h3>{t("bill_paid_confirmation")}</h3>
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.info_box(t("bill_paid_receipt"))}
        """
        
        html = EmailTemplates.get_base_template(t("bill_paid_subject"), content, lang)
        return await self._send_email(to_email, t("bill_paid_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_bill_failed(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        beneficiary: str,
        amount: float,
        reason: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Notifica que o pagamento do boleto falhou."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("bill_beneficiary"), beneficiary[:30] + "..." if len(beneficiary) > 30 else beneficiary),
            EmailTemplates.data_row(t("amount"), EmailTemplates.format_currency(amount, "BRL")),
            EmailTemplates.data_row(t("failure_reason"), reason),
            EmailTemplates.data_row(t("status"), t("failed")),
        ]
        
        content = f"""
            <h2>{t("bill_failed_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("bill_failed_message")}</p>
            
            {EmailTemplates.error_box(reason)}
            
            {EmailTemplates.data_table(rows)}
            
            {EmailTemplates.info_box(t("bill_failed_refund"))}
            
            <p>{t("bill_failed_retry")}</p>
        """
        
        html = EmailTemplates.get_base_template(t("bill_failed_subject"), content, lang)
        return await self._send_email(to_email, t("bill_failed_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    # ============================================
    # WALLET (DEPOSITS/WITHDRAWALS)
    # ============================================
    
    async def send_deposit_received(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        amount: float,
        symbol: str,
        network: str,
        tx_hash: str,
        confirmations: int,
        new_balance: float
    ) -> Dict[str, Any]:
        """Notifica deposito recebido."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("deposit_amount"), EmailTemplates.format_crypto(amount, symbol)),
            EmailTemplates.data_row(t("deposit_network"), network),
            EmailTemplates.data_row(t("deposit_confirmations"), str(confirmations)),
            EmailTemplates.data_row(t("new_balance"), EmailTemplates.format_crypto(new_balance, symbol)),
        ]
        
        content = f"""
            <h2>{t("deposit_received_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("deposit_received_message")}</p>
            
            {EmailTemplates.success_box(f"+{EmailTemplates.format_crypto(amount, symbol)}")}
            
            {EmailTemplates.data_table(rows)}
            
            <p style="font-size: 12px; color: #6b7280;"><strong>{t("deposit_txhash")}:</strong> {tx_hash[:20]}...{tx_hash[-10:]}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/wallet")}
        """
        
        html = EmailTemplates.get_base_template(t("deposit_received_subject"), content, lang)
        return await self._send_email(to_email, t("deposit_received_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    async def send_withdrawal_requested(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        amount: float,
        symbol: str,
        address: str,
        network: str,
        fee: float,
        withdrawal_id: str
    ) -> Dict[str, Any]:
        """Notifica saque solicitado."""
        if not self._check_notification_enabled(db, user_id, "security"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("withdrawal_amount"), EmailTemplates.format_crypto(amount, symbol)),
            EmailTemplates.data_row(t("withdrawal_address"), f"{address[:10]}...{address[-10:]}"),
            EmailTemplates.data_row(t("deposit_network"), network),
            EmailTemplates.data_row(t("withdrawal_fee"), EmailTemplates.format_crypto(fee, symbol)),
        ]
        
        content = f"""
            <h2>{t("withdrawal_requested_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("withdrawal_requested_message")}</p>
            
            {EmailTemplates.data_table(rows)}
            
            <p>{t("withdrawal_processing")}</p>
            
            {EmailTemplates.warning_box(t("withdrawal_not_you"))}
        """
        
        html = EmailTemplates.get_base_template(t("withdrawal_requested_subject"), content, lang)
        return await self._send_email(to_email, t("withdrawal_requested_subject"), html, self.FROM_EMAIL_SECURITY)
    
    async def send_withdrawal_completed(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        amount: float,
        symbol: str,
        address: str,
        tx_hash: str
    ) -> Dict[str, Any]:
        """Notifica saque concluido."""
        if not self._check_notification_enabled(db, user_id, "trade"):
            return {"success": False, "message": "Notification disabled by user"}
        
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        rows = [
            EmailTemplates.data_row(t("withdrawal_amount"), EmailTemplates.format_crypto(amount, symbol)),
            EmailTemplates.data_row(t("withdrawal_address"), f"{address[:10]}...{address[-10:]}"),
            EmailTemplates.data_row(t("status"), t("completed")),
        ]
        
        content = f"""
            <h2>{t("withdrawal_completed_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("withdrawal_completed_message")}</p>
            
            {EmailTemplates.success_box(t("withdrawal_completed_title"))}
            
            {EmailTemplates.data_table(rows)}
            
            <p style="font-size: 12px; color: #6b7280;"><strong>{t("withdrawal_txhash")}:</strong> {tx_hash[:20]}...{tx_hash[-10:]}</p>
            
            <p>{t("withdrawal_completed_check")}</p>
        """
        
        html = EmailTemplates.get_base_template(t("withdrawal_completed_subject"), content, lang)
        return await self._send_email(to_email, t("withdrawal_completed_subject"), html, self.FROM_EMAIL_TRANSACTIONS)
    
    # ============================================
    # ACCOUNT
    # ============================================
    
    async def send_welcome(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str
    ) -> Dict[str, Any]:
        """Envia email de boas-vindas."""
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        content = f"""
            <h2>{t("welcome_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("welcome_intro")}</p>
            <p>{t("welcome_message")}</p>
            
            {EmailTemplates.success_box(t("welcome_title"))}
            
            <p><strong>{t("welcome_features")}</strong></p>
            <ul style="color: #4b5563; line-height: 1.8;">
                <li>{t("welcome_feature_1")}</li>
                <li>{t("welcome_feature_2")}</li>
                <li>{t("welcome_feature_3")}</li>
                <li>{t("welcome_feature_4")}</li>
            </ul>
            
            {EmailTemplates.info_box(t("welcome_verify"))}
            
            {EmailTemplates.button(t("welcome_button"), f"{self.frontend_url}/dashboard")}
        """
        
        html = EmailTemplates.get_base_template(t("welcome_subject"), content, lang)
        return await self._send_email(to_email, t("welcome_subject"), html)
    
    async def send_kyc_approved(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        kyc_level: str
    ) -> Dict[str, Any]:
        """Notifica KYC aprovado."""
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        content = f"""
            <h2>{t("kyc_approved_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("kyc_approved_message")}</p>
            
            {EmailTemplates.success_box(t("kyc_approved_title"))}
            
            {EmailTemplates.data_table([
                EmailTemplates.data_row(t("kyc_level"), kyc_level),
                EmailTemplates.data_row(t("status"), t("completed")),
            ])}
            
            <p>{t("kyc_approved_limits")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/profile")}
        """
        
        html = EmailTemplates.get_base_template(t("kyc_approved_subject"), content, lang)
        return await self._send_email(to_email, t("kyc_approved_subject"), html)
    
    async def send_kyc_rejected(
        self,
        db: Session,
        user_id: str,
        to_email: str,
        username: str,
        reason: str
    ) -> Dict[str, Any]:
        """Notifica KYC rejeitado."""
        lang = self._get_user_language(db, user_id)
        t = lambda key, **kw: EmailTemplates.t(key, lang, **kw)
        
        content = f"""
            <h2>{t("kyc_rejected_title")}</h2>
            <p>Ola, <strong>{username}</strong>!</p>
            <p>{t("kyc_rejected_message")}</p>
            
            {EmailTemplates.error_box(reason)}
            
            {EmailTemplates.data_table([
                EmailTemplates.data_row(t("kyc_rejection_reason"), reason),
                EmailTemplates.data_row(t("status"), t("failed")),
            ])}
            
            <p>{t("kyc_rejected_retry")}</p>
            
            {EmailTemplates.button(t("view_details"), f"{self.frontend_url}/kyc")}
        """
        
        html = EmailTemplates.get_base_template(t("kyc_rejected_subject"), content, lang)
        return await self._send_email(to_email, t("kyc_rejected_subject"), html)


# Singleton instance
notification_service = NotificationService()
