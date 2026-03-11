"""
WOLK NOW - Email Service (Multi-language)
==========================================

Serviço de envio de emails usando Resend.
Suporta templates HTML profissionais em múltiplos idiomas:
- Português (pt)
- English (en)
- Español (es)

Author: WOLK NOW LLC
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Tentar importar resend
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend não instalado. Execute: pip install resend")


# ============================================
# TRADUÇÕES DOS EMAILS
# ============================================

TRANSLATIONS = {
    "pt": {
        # Geral
        "company_name": "WOLK NOW",
        "all_rights_reserved": "Todos os direitos reservados",
        "auto_email": "Este é um email automático. Responda se precisar de ajuda.",
        "website": "Website",
        "support": "Suporte",
        "terms": "Termos",
        
        # Password Reset
        "password_reset_subject": "Recuperação de Senha - WOLK NOW",
        "password_reset_title": "Recuperação de Senha",
        "password_reset_greeting": "Olá, <strong>{username}</strong>!",
        "password_reset_message": "Recebemos uma solicitação para redefinir a senha da sua conta WOLK NOW.",
        "password_reset_instruction": "Clique no botão abaixo para criar uma nova senha:",
        "password_reset_button": "Redefinir Senha",
        "password_reset_warning": "Este link expira em <strong>{hours} hora(s)</strong>.",
        "password_reset_ignore": "Se você não solicitou a redefinição de senha, ignore este email. Sua senha atual permanecerá inalterada.",
        "password_reset_tip": "Nunca compartilhe este link com ninguém.",
        "attention": "Atenção",
        "security_tip": "Dica de segurança",
        
        # Email Verification
        "verify_email_subject": "Verifique seu email - WOLK NOW",
        "verify_email_title": "Bem-vindo à WOLK NOW!",
        "verify_email_greeting": "Olá, <strong>{username}</strong>!",
        "verify_email_message": "Obrigado por criar sua conta. Para começar a usar todos os recursos, precisamos verificar seu email.",
        "verify_email_button": "Verificar Email",
        "verify_email_copy": "Ou copie e cole este link no seu navegador:",
        "verify_email_features_title": "Após verificar, você terá acesso a:",
        "verify_email_feature_1": "Compra e venda de criptomoedas",
        "verify_email_feature_2": "Transferências P2P",
        "verify_email_feature_3": "Carteira multi-crypto",
        
        # Password Reset Admin
        "password_reset_admin_subject": "Sua senha foi redefinida - WOLK NOW",
        "password_reset_admin_title": "Sua Senha Foi Redefinida",
        "password_reset_admin_message": "Um administrador redefiniu a senha da sua conta WOLK NOW.",
        "password_reset_admin_temp": "Sua nova senha temporária:",
        "password_reset_admin_warning": "Por segurança, troque esta senha imediatamente após fazer login.",
        "password_reset_admin_login": "Fazer Login",
        "password_reset_admin_contact": "Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.",
        "important": "IMPORTANTE",
        
        # Login Alert
        "login_alert_subject": "Novo login detectado - WOLK NOW",
        "login_alert_title": "Novo Login Detectado",
        "login_alert_message": "Detectamos um novo acesso à sua conta WOLK NOW:",
        "login_alert_datetime": "Data/Hora",
        "login_alert_ip": "Endereço IP",
        "login_alert_device": "Dispositivo",
        "login_alert_location": "Localização",
        "login_alert_location_unknown": "Não identificada",
        "login_alert_confirm": "Se sim, você pode ignorar este email.",
        "login_alert_was_you": "Foi você?",
        "login_alert_not_you": "Não reconhece este acesso?",
        "login_alert_compromised": "Sua conta pode estar comprometida.",
        "login_alert_protect": "Proteja sua conta agora →",
        
        # Password Changed
        "password_changed_subject": "Sua senha foi alterada - WOLK NOW",
        "password_changed_title": "Senha Alterada com Sucesso",
        "password_changed_message": "A senha da sua conta WOLK NOW foi alterada com sucesso.",
        "password_changed_success": "Sua senha foi atualizada",
        "password_changed_not_you": "Entre em contato com o suporte imediatamente e redefina sua senha.",
        "not_you": "Não foi você?",
        
        # 2FA
        "2fa_enabled_subject": "2FA ativado na sua conta - WOLK NOW",
        "2fa_enabled_title": "2FA Ativado com Sucesso",
        "2fa_enabled_message": "A autenticação de dois fatores (2FA) foi ativada na sua conta.",
        "2fa_enabled_success": "Sua conta está mais segura!",
        "2fa_enabled_tip": "Guarde seus códigos de recuperação em um local seguro.",
        "tip": "Dica",
        
        "2fa_disabled_subject": "2FA desativado na sua conta - WOLK NOW",
        "2fa_disabled_title": "2FA Desativado",
        "2fa_disabled_message": "A autenticação de dois fatores (2FA) foi desativada na sua conta.",
        "2fa_disabled_warning": "Sua conta agora está menos protegida.",
        "2fa_disabled_recommend": "Recomendamos manter o 2FA ativado para maior segurança.",
        "2fa_disabled_contact": "Se você não desativou o 2FA, entre em contato com o suporte imediatamente.",
        "2fa_disabled_button": "Configurações de Segurança",
    },
    
    "en": {
        # General
        "company_name": "WOLK NOW",
        "all_rights_reserved": "All rights reserved",
        "auto_email": "This is an automated email. Reply if you need help.",
        "website": "Website",
        "support": "Support",
        "terms": "Terms",
        
        # Password Reset
        "password_reset_subject": "Password Recovery - WOLK NOW",
        "password_reset_title": "Password Recovery",
        "password_reset_greeting": "Hello, <strong>{username}</strong>!",
        "password_reset_message": "We received a request to reset your WOLK NOW account password.",
        "password_reset_instruction": "Click the button below to create a new password:",
        "password_reset_button": "Reset Password",
        "password_reset_warning": "This link expires in <strong>{hours} hour(s)</strong>.",
        "password_reset_ignore": "If you didn't request a password reset, ignore this email. Your current password will remain unchanged.",
        "password_reset_tip": "Never share this link with anyone.",
        "attention": "Attention",
        "security_tip": "Security tip",
        
        # Email Verification
        "verify_email_subject": "Verify your email - WOLK NOW",
        "verify_email_title": "Welcome to WOLK NOW!",
        "verify_email_greeting": "Hello, <strong>{username}</strong>!",
        "verify_email_message": "Thank you for creating your account. To start using all features, we need to verify your email.",
        "verify_email_button": "Verify Email",
        "verify_email_copy": "Or copy and paste this link in your browser:",
        "verify_email_features_title": "After verifying, you'll have access to:",
        "verify_email_feature_1": "Buy and sell cryptocurrencies",
        "verify_email_feature_2": "P2P transfers",
        "verify_email_feature_3": "Multi-crypto wallet",
        
        # Password Reset Admin
        "password_reset_admin_subject": "Your password has been reset - WOLK NOW",
        "password_reset_admin_title": "Your Password Has Been Reset",
        "password_reset_admin_message": "An administrator has reset your WOLK NOW account password.",
        "password_reset_admin_temp": "Your new temporary password:",
        "password_reset_admin_warning": "For security, change this password immediately after logging in.",
        "password_reset_admin_login": "Log In",
        "password_reset_admin_contact": "If you didn't request this change, contact support immediately.",
        "important": "IMPORTANT",
        
        # Login Alert
        "login_alert_subject": "New login detected - WOLK NOW",
        "login_alert_title": "New Login Detected",
        "login_alert_message": "We detected a new access to your WOLK NOW account:",
        "login_alert_datetime": "Date/Time",
        "login_alert_ip": "IP Address",
        "login_alert_device": "Device",
        "login_alert_location": "Location",
        "login_alert_location_unknown": "Not identified",
        "login_alert_confirm": "If yes, you can ignore this email.",
        "login_alert_was_you": "Was this you?",
        "login_alert_not_you": "Don't recognize this access?",
        "login_alert_compromised": "Your account may be compromised.",
        "login_alert_protect": "Protect your account now →",
        
        # Password Changed
        "password_changed_subject": "Your password has been changed - WOLK NOW",
        "password_changed_title": "Password Changed Successfully",
        "password_changed_message": "Your WOLK NOW account password has been changed successfully.",
        "password_changed_success": "Your password has been updated",
        "password_changed_not_you": "Contact support immediately and reset your password.",
        "not_you": "Wasn't you?",
        
        # 2FA
        "2fa_enabled_subject": "2FA enabled on your account - WOLK NOW",
        "2fa_enabled_title": "2FA Enabled Successfully",
        "2fa_enabled_message": "Two-factor authentication (2FA) has been enabled on your account.",
        "2fa_enabled_success": "Your account is more secure!",
        "2fa_enabled_tip": "Keep your recovery codes in a safe place.",
        "tip": "Tip",
        
        "2fa_disabled_subject": "2FA disabled on your account - WOLK NOW",
        "2fa_disabled_title": "2FA Disabled",
        "2fa_disabled_message": "Two-factor authentication (2FA) has been disabled on your account.",
        "2fa_disabled_warning": "Your account is now less protected.",
        "2fa_disabled_recommend": "We recommend keeping 2FA enabled for better security.",
        "2fa_disabled_contact": "If you didn't disable 2FA, contact support immediately.",
        "2fa_disabled_button": "Security Settings",
    },
    
    "es": {
        # General
        "company_name": "WOLK NOW",
        "all_rights_reserved": "Todos los derechos reservados",
        "auto_email": "Este es un correo automático. Responda si necesita ayuda.",
        "website": "Sitio Web",
        "support": "Soporte",
        "terms": "Términos",
        
        # Password Reset
        "password_reset_subject": "Recuperación de Contraseña - WOLK NOW",
        "password_reset_title": "Recuperación de Contraseña",
        "password_reset_greeting": "Hola, <strong>{username}</strong>!",
        "password_reset_message": "Recibimos una solicitud para restablecer la contraseña de tu cuenta WOLK NOW.",
        "password_reset_instruction": "Haz clic en el botón de abajo para crear una nueva contraseña:",
        "password_reset_button": "Restablecer Contraseña",
        "password_reset_warning": "Este enlace expira en <strong>{hours} hora(s)</strong>.",
        "password_reset_ignore": "Si no solicitaste el restablecimiento de contraseña, ignora este correo. Tu contraseña actual permanecerá sin cambios.",
        "password_reset_tip": "Nunca compartas este enlace con nadie.",
        "attention": "Atención",
        "security_tip": "Consejo de seguridad",
        
        # Email Verification
        "verify_email_subject": "Verifica tu correo - WOLK NOW",
        "verify_email_title": "¡Bienvenido a WOLK NOW!",
        "verify_email_greeting": "Hola, <strong>{username}</strong>!",
        "verify_email_message": "Gracias por crear tu cuenta. Para comenzar a usar todas las funciones, necesitamos verificar tu correo.",
        "verify_email_button": "Verificar Correo",
        "verify_email_copy": "O copia y pega este enlace en tu navegador:",
        "verify_email_features_title": "Después de verificar, tendrás acceso a:",
        "verify_email_feature_1": "Compra y venta de criptomonedas",
        "verify_email_feature_2": "Transferencias P2P",
        "verify_email_feature_3": "Billetera multi-crypto",
        
        # Password Reset Admin
        "password_reset_admin_subject": "Tu contraseña ha sido restablecida - WOLK NOW",
        "password_reset_admin_title": "Tu Contraseña Ha Sido Restablecida",
        "password_reset_admin_message": "Un administrador ha restablecido la contraseña de tu cuenta WOLK NOW.",
        "password_reset_admin_temp": "Tu nueva contraseña temporal:",
        "password_reset_admin_warning": "Por seguridad, cambia esta contraseña inmediatamente después de iniciar sesión.",
        "password_reset_admin_login": "Iniciar Sesión",
        "password_reset_admin_contact": "Si no solicitaste este cambio, contacta al soporte inmediatamente.",
        "important": "IMPORTANTE",
        
        # Login Alert
        "login_alert_subject": "Nuevo inicio de sesión detectado - WOLK NOW",
        "login_alert_title": "Nuevo Inicio de Sesión Detectado",
        "login_alert_message": "Detectamos un nuevo acceso a tu cuenta WOLK NOW:",
        "login_alert_datetime": "Fecha/Hora",
        "login_alert_ip": "Dirección IP",
        "login_alert_device": "Dispositivo",
        "login_alert_location": "Ubicación",
        "login_alert_location_unknown": "No identificada",
        "login_alert_confirm": "Si fuiste tú, puedes ignorar este correo.",
        "login_alert_was_you": "¿Fuiste tú?",
        "login_alert_not_you": "¿No reconoces este acceso?",
        "login_alert_compromised": "Tu cuenta puede estar comprometida.",
        "login_alert_protect": "Protege tu cuenta ahora →",
        
        # Password Changed
        "password_changed_subject": "Tu contraseña ha sido cambiada - WOLK NOW",
        "password_changed_title": "Contraseña Cambiada con Éxito",
        "password_changed_message": "La contraseña de tu cuenta WOLK NOW ha sido cambiada con éxito.",
        "password_changed_success": "Tu contraseña ha sido actualizada",
        "password_changed_not_you": "Contacta al soporte inmediatamente y restablece tu contraseña.",
        "not_you": "¿No fuiste tú?",
        
        # 2FA
        "2fa_enabled_subject": "2FA activado en tu cuenta - WOLK NOW",
        "2fa_enabled_title": "2FA Activado con Éxito",
        "2fa_enabled_message": "La autenticación de dos factores (2FA) ha sido activada en tu cuenta.",
        "2fa_enabled_success": "¡Tu cuenta está más segura!",
        "2fa_enabled_tip": "Guarda tus códigos de recuperación en un lugar seguro.",
        "tip": "Consejo",
        
        "2fa_disabled_subject": "2FA desactivado en tu cuenta - WOLK NOW",
        "2fa_disabled_title": "2FA Desactivado",
        "2fa_disabled_message": "La autenticación de dos factores (2FA) ha sido desactivada en tu cuenta.",
        "2fa_disabled_warning": "Tu cuenta ahora está menos protegida.",
        "2fa_disabled_recommend": "Recomendamos mantener el 2FA activado para mayor seguridad.",
        "2fa_disabled_contact": "Si no desactivaste el 2FA, contacta al soporte inmediatamente.",
        "2fa_disabled_button": "Configuración de Seguridad",
    }
}


class EmailService:
    """
    Serviço de envio de emails transacionais com suporte multi-idioma.
    
    Usa Resend como provedor principal.
    Suporta: Português (pt), English (en), Español (es)
    """
    
    # Configurações
    FROM_EMAIL = "WOLK NOW <hello@wolknow.com>"
    FROM_EMAIL_SECURITY = "WOLK NOW Security <security@wolknow.com>"
    DEFAULT_LANGUAGE = "pt"
    SUPPORTED_LANGUAGES = ["pt", "en", "es"]
    
    # Templates base - Design compatível com todos os clientes de email
    # NOTA: Usa estilos inline e cores sólidas (gradientes não funcionam em emails)
    TEMPLATE_STYLE = """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background-color: #6366f1; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px; }
            .content h2 { color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; }
            .content p { color: #4b5563; line-height: 1.7; margin: 12px 0; }
            .alert { padding: 16px; margin: 20px 0; border-radius: 8px; }
            .alert-warning { background-color: #fef3c7; border: 1px solid #fde68a; }
            .alert-warning p { color: #92400e; margin: 0; }
            .alert-info { background-color: #eff6ff; border: 1px solid #bfdbfe; }
            .alert-info p { color: #1e40af; margin: 0; }
            .alert-success { background-color: #ecfdf5; border: 1px solid #a7f3d0; }
            .alert-success p { color: #065f46; margin: 0; }
            .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
            .footer-links { margin: 12px 0; }
            .footer-links a { margin: 0 12px; color: #6b7280; text-decoration: none; font-size: 13px; }
        </style>
    """
    
    # Botão inline que funciona em todos os clientes de email
    BUTTON_STYLE = "display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 14px;"
    
    # Info table styles
    INFO_TABLE_STYLE = "background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;"
    INFO_ROW_STYLE = "padding: 10px 0; border-bottom: 1px solid #e5e7eb;"
    INFO_LABEL_STYLE = "color: #6b7280; font-size: 13px; display: inline-block; min-width: 100px;"
    INFO_VALUE_STYLE = "color: #1f2937; font-weight: 500; font-size: 14px;"
    
    # Code box styles
    CODE_BOX_STYLE = "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;"
    CODE_STYLE = "font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: 6px; font-family: monospace;"
    
    # Success box styles
    SUCCESS_BOX_STYLE = "background-color: #ecfdf5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;"
    SUCCESS_TEXT_STYLE = "color: #065f46; font-weight: 600; margin: 0; font-size: 18px;"
    
    def __init__(self):
        """Inicializa o serviço de email."""
        self.api_key = os.getenv("RESEND_API_KEY")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://wolknow.com")
        self.is_configured = False
        
        if RESEND_AVAILABLE and self.api_key:
            resend.api_key = self.api_key
            self.is_configured = True
            logger.info("EmailService configurado com Resend (multi-idioma)")
        else:
            logger.warning("EmailService em modo log-only (sem RESEND_API_KEY)")
    
    def _get_translation(self, key: str, language: str = "pt", **kwargs) -> str:
        """Obtém tradução com fallback para português."""
        lang = language if language in self.SUPPORTED_LANGUAGES else self.DEFAULT_LANGUAGE
        translations = TRANSLATIONS.get(lang, TRANSLATIONS["pt"])
        text = translations.get(key, TRANSLATIONS["pt"].get(key, key))
        
        # Substituir variáveis
        if kwargs:
            try:
                text = text.format(**kwargs)
            except KeyError:
                pass
        
        return text
    
    def _t(self, key: str, language: str = "pt", **kwargs) -> str:
        """Atalho para _get_translation."""
        return self._get_translation(key, language, **kwargs)
    
    def _get_base_template(self, title: str, content: str, language: str = "pt") -> str:
        """Gera template HTML base com idioma."""
        year = datetime.now().year
        t = lambda key, **kw: self._t(key, language, **kw)
        
        return f"""<!DOCTYPE html>
<html lang="{language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    {self.TEMPLATE_STYLE}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{t("company_name")}</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <div class="footer-links">
                <a href="https://wolknow.com">{t("website")}</a>
                <a href="https://wolknow.com/support">{t("support")}</a>
                <a href="https://wolknow.com/terms">{t("terms")}</a>
            </div>
            <p>&copy; {year} WOLK NOW LLC. {t("all_rights_reserved")}.</p>
            <p>{t("auto_email")}</p>
        </div>
    </div>
</body>
</html>"""
    
    async def send_email(
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
            return {"success": True, "message": "Email sent successfully", "id": result.get("id") if isinstance(result, dict) else str(result)}
            
        except Exception as e:
            logger.error(f"Erro ao enviar email para {to_email}: {str(e)}")
            return {"success": False, "message": str(e), "error": True}
    
    async def send_password_reset(
        self, 
        to_email: str, 
        username: str, 
        reset_token: str, 
        expires_in_hours: int = 1,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Envia email de recuperação de senha."""
        t = lambda key, **kw: self._t(key, language, **kw)
        reset_url = f"{self.frontend_url}/forgot-password?token={reset_token}"
        
        content = f"""
            <h2>{t("password_reset_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("password_reset_message")}</p>
            <p>{t("password_reset_instruction")}</p>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="{reset_url}" style="{self.BUTTON_STYLE}">{t("password_reset_button")}</a>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0;"><strong>{t("attention")}:</strong> {t("password_reset_warning", hours=expires_in_hours)}</p>
            </div>
            
            <p>{t("password_reset_ignore")}</p>
            
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #1e40af; margin: 0;"><strong>{t("security_tip")}:</strong> {t("password_reset_tip")}</p>
            </div>
        """
        
        html = self._get_base_template(t("password_reset_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("password_reset_subject"), 
            html_content=html
        )
    
    async def send_email_verification(
        self, 
        to_email: str, 
        username: str, 
        verification_token: str,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Envia email de verificação de conta."""
        t = lambda key, **kw: self._t(key, language, **kw)
        verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"
        
        content = f"""
            <h2>{t("verify_email_title")}</h2>
            <p>{t("verify_email_greeting", username=username)}</p>
            <p>{t("verify_email_message")}</p>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="{verify_url}" style="{self.BUTTON_STYLE}">{t("verify_email_button")}</a>
            </div>
            
            <p style="font-size: 13px; color: #6b7280;">{t("verify_email_copy")}</p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px; background-color: #f8fafc; padding: 12px; border-radius: 6px;">{verify_url}</p>
            
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #1e40af; margin: 0;"><strong>{t("verify_email_features_title")}</strong></p>
                <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
                    <li>{t("verify_email_feature_1")}</li>
                    <li>{t("verify_email_feature_2")}</li>
                    <li>{t("verify_email_feature_3")}</li>
                </ul>
            </div>
        """
        
        html = self._get_base_template(t("verify_email_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("verify_email_subject"), 
            html_content=html
        )
    
    async def send_password_reset_admin(
        self, 
        to_email: str, 
        username: str, 
        temp_password: str,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Envia email quando admin reseta a senha."""
        t = lambda key, **kw: self._t(key, language, **kw)
        
        content = f"""
            <h2>{t("password_reset_admin_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("password_reset_admin_message")}</p>
            
            <div style="{self.CODE_BOX_STYLE}">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">{t("password_reset_admin_temp")}</p>
                <span style="{self.CODE_STYLE}">{temp_password}</span>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0;"><strong>{t("important")}:</strong> {t("password_reset_admin_warning")}</p>
            </div>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="{self.frontend_url}/login" style="{self.BUTTON_STYLE}">{t("password_reset_admin_login")}</a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">{t("password_reset_admin_contact")}</p>
        """
        
        html = self._get_base_template(t("password_reset_admin_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("password_reset_admin_subject"), 
            html_content=html, 
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_login_alert(
        self, 
        to_email: str, 
        username: str, 
        ip_address: str, 
        device: str, 
        location: Optional[str] = None, 
        timestamp: Optional[datetime] = None,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Envia alerta de novo login."""
        t = lambda key, **kw: self._t(key, language, **kw)
        login_time = timestamp or datetime.now()
        location_text = location or t("login_alert_location_unknown")
        
        # Formato de data por idioma
        if language == "en":
            date_format = login_time.strftime('%m/%d/%Y at %H:%M')
        elif language == "es":
            date_format = login_time.strftime('%d/%m/%Y a las %H:%M')
        else:
            date_format = login_time.strftime('%d/%m/%Y às %H:%M')
        
        content = f"""
            <h2>{t("login_alert_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("login_alert_message")}</p>
            
            <div style="{self.INFO_TABLE_STYLE}">
                <div style="{self.INFO_ROW_STYLE}">
                    <span style="{self.INFO_LABEL_STYLE}">{t("login_alert_datetime")}:</span>
                    <span style="{self.INFO_VALUE_STYLE}">{date_format}</span>
                </div>
                <div style="{self.INFO_ROW_STYLE}">
                    <span style="{self.INFO_LABEL_STYLE}">{t("login_alert_ip")}:</span>
                    <span style="{self.INFO_VALUE_STYLE}">{ip_address}</span>
                </div>
                <div style="{self.INFO_ROW_STYLE}">
                    <span style="{self.INFO_LABEL_STYLE}">{t("login_alert_device")}:</span>
                    <span style="{self.INFO_VALUE_STYLE}">{device}</span>
                </div>
                <div style="padding: 10px 0;">
                    <span style="{self.INFO_LABEL_STYLE}">{t("login_alert_location")}:</span>
                    <span style="{self.INFO_VALUE_STYLE}">{location_text}</span>
                </div>
            </div>
            
            <p><strong>{t("login_alert_was_you")}</strong> {t("login_alert_confirm")}</p>
            
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0;"><strong>{t("login_alert_not_you")}</strong> {t("login_alert_compromised")}</p>
                <p style="margin-top: 8px;"><a href="{self.frontend_url}/settings/security" style="color: #92400e; font-weight: 600;">{t("login_alert_protect")}</a></p>
            </div>
        """
        
        html = self._get_base_template(t("login_alert_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("login_alert_subject"), 
            html_content=html, 
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_password_changed(
        self, 
        to_email: str, 
        username: str, 
        ip_address: Optional[str] = None,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Notifica que a senha foi alterada."""
        t = lambda key, **kw: self._t(key, language, **kw)
        ip_text = f'<p style="color: #6b7280; font-size: 13px;">IP: {ip_address}</p>' if ip_address else ''
        
        content = f"""
            <h2>{t("password_changed_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("password_changed_message")}</p>
            
            <div style="{self.SUCCESS_BOX_STYLE}">
                <p style="{self.SUCCESS_TEXT_STYLE}">{t("password_changed_success")}</p>
            </div>
            {ip_text}
            
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0;"><strong>{t("not_you")}</strong> {t("password_changed_not_you")}</p>
            </div>
        """
        
        html = self._get_base_template(t("password_changed_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("password_changed_subject"), 
            html_content=html, 
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_2fa_enabled(
        self, 
        to_email: str, 
        username: str,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Notifica que 2FA foi ativado."""
        t = lambda key, **kw: self._t(key, language, **kw)
        
        content = f"""
            <h2>{t("2fa_enabled_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("2fa_enabled_message")}</p>
            
            <div style="{self.SUCCESS_BOX_STYLE}">
                <p style="{self.SUCCESS_TEXT_STYLE}">{t("2fa_enabled_success")}</p>
            </div>
            
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #1e40af; margin: 0;"><strong>{t("tip")}:</strong> {t("2fa_enabled_tip")}</p>
            </div>
        """
        
        html = self._get_base_template(t("2fa_enabled_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("2fa_enabled_subject"), 
            html_content=html, 
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_2fa_disabled(
        self, 
        to_email: str, 
        username: str,
        language: str = "pt"
    ) -> Dict[str, Any]:
        """Notifica que 2FA foi desativado."""
        t = lambda key, **kw: self._t(key, language, **kw)
        
        content = f"""
            <h2>{t("2fa_disabled_title")}</h2>
            <p>{t("password_reset_greeting", username=username)}</p>
            <p>{t("2fa_disabled_message")}</p>
            
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0;"><strong>{t("attention")}:</strong> {t("2fa_disabled_warning")}</p>
                <p style="color: #92400e; margin-top: 8px;">{t("2fa_disabled_recommend")}</p>
            </div>
            
            <p>{t("2fa_disabled_contact")}</p>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="{self.frontend_url}/settings/security" style="{self.BUTTON_STYLE}">{t("2fa_disabled_button")}</a>
            </div>
        """
        
        html = self._get_base_template(t("2fa_disabled_subject"), content, language)
        return await self.send_email(
            to_email=to_email, 
            subject=t("2fa_disabled_subject"), 
            html_content=html, 
            from_email=self.FROM_EMAIL_SECURITY
        )


# Singleton instance
email_service = EmailService()
