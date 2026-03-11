"""
WOLK NOW - Email Service
============================

Serviço de envio de emails usando Resend.
Suporta templates HTML profissionais para:
- Reset de senha
- Verificação de email
- Alertas de segurança
- Notificações de transações

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


class EmailService:
    """
    Serviço de envio de emails transacionais.
    
    Usa Resend como provedor principal.
    Fallback para modo "log only" se não configurado.
    """
    
    # Configurações - Usando "hello@" em vez de "noreply@" para melhor deliverability
    FROM_EMAIL = "WOLK NOW <hello@wolknow.com>"
    FROM_EMAIL_SECURITY = "WOLK NOW Security <security@wolknow.com>"
    
    # Templates base - Design limpo sem ícones
    TEMPLATE_STYLE = """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px; }
            .content h2 { color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; }
            .content p { color: #4b5563; line-height: 1.7; margin: 12px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 14px; }
            .button:hover { opacity: 0.9; }
            .code-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
            .code { font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: 6px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
            .alert { padding: 16px; margin: 20px 0; border-radius: 8px; }
            .alert-warning { background: #fef3c7; border: 1px solid #fde68a; }
            .alert-warning p { color: #92400e; margin: 0; }
            .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; }
            .alert-info p { color: #1e40af; margin: 0; }
            .alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; }
            .alert-success p { color: #065f46; margin: 0; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
            .footer-links { margin: 12px 0; }
            .footer-links a { margin: 0 12px; color: #6b7280; text-decoration: none; font-size: 13px; }
            .footer-links a:hover { color: #6366f1; }
            .info-table { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .info-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #6b7280; font-size: 13px; min-width: 100px; }
            .info-value { color: #1f2937; font-weight: 500; font-size: 14px; }
            .success-box { background: #ecfdf5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
            .success-box p { color: #065f46; font-weight: 600; margin: 0; font-size: 18px; }
        </style>
    """
    
    def __init__(self):
        """Inicializa o serviço de email."""
        self.api_key = os.getenv("RESEND_API_KEY")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://wolknow.com")
        self.is_configured = False
        
        if RESEND_AVAILABLE and self.api_key:
            resend.api_key = self.api_key
            self.is_configured = True
            logger.info("EmailService configurado com Resend")
        else:
            logger.warning("EmailService em modo log-only (sem RESEND_API_KEY)")
    
    def _get_base_template(self, title: str, content: str) -> str:
        """Gera template HTML base."""
        year = datetime.now().year
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    {self.TEMPLATE_STYLE}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WOLK NOW</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <div class="footer-links">
                <a href="https://wolknow.com">Website</a>
                <a href="https://wolknow.com/support">Suporte</a>
                <a href="https://wolknow.com/terms">Termos</a>
            </div>
            <p>&copy; {year} WOLK NOW LLC. Todos os direitos reservados.</p>
            <p>Este é um email automático. Responda se precisar de ajuda.</p>
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
    
    async def send_password_reset(self, to_email: str, username: str, reset_token: str, expires_in_hours: int = 1) -> Dict[str, Any]:
        """Envia email de recuperação de senha."""
        reset_url = f"{self.frontend_url}/forgot-password?token={reset_token}"
        
        content = f"""
            <h2>Recuperação de Senha</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta WOLK NOW.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center;">
                <a href="{reset_url}" class="button">Redefinir Senha</a>
            </div>
            
            <div class="alert alert-warning">
                <p><strong>Atenção:</strong> Este link expira em <strong>{expires_in_hours} hora(s)</strong>.</p>
            </div>
            
            <p>Se você não solicitou a redefinição de senha, ignore este email. Sua senha atual permanecerá inalterada.</p>
            
            <div class="alert alert-info">
                <p><strong>Dica de segurança:</strong> Nunca compartilhe este link com ninguém.</p>
            </div>
        """
        
        html = self._get_base_template("Recuperação de Senha - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="Recuperação de Senha - WOLK NOW", html_content=html)
    
    async def send_email_verification(self, to_email: str, username: str, verification_token: str) -> Dict[str, Any]:
        """Envia email de verificação de conta."""
        verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"
        
        content = f"""
            <h2>Bem-vindo à WOLK NOW!</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Obrigado por criar sua conta. Para começar a usar todos os recursos, precisamos verificar seu email.</p>
            
            <div style="text-align: center;">
                <a href="{verify_url}" class="button">Verificar Email</a>
            </div>
            
            <p style="font-size: 13px; color: #6b7280;">Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px;">{verify_url}</p>
            
            <div class="alert alert-info">
                <p><strong>Após verificar, você terá acesso a:</strong></p>
                <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
                    <li>Compra e venda de criptomoedas</li>
                    <li>Transferências P2P</li>
                    <li>Carteira multi-crypto</li>
                </ul>
            </div>
        """
        
        html = self._get_base_template("Verificar Email - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="Verifique seu email - WOLK NOW", html_content=html)
    
    async def send_password_reset_admin(self, to_email: str, username: str, temp_password: str) -> Dict[str, Any]:
        """Envia email quando admin reseta a senha."""
        content = f"""
            <h2>Sua Senha Foi Redefinida</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Um administrador redefiniu a senha da sua conta WOLK NOW.</p>
            
            <div class="code-box">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">Sua nova senha temporária:</p>
                <span class="code">{temp_password}</span>
            </div>
            
            <div class="alert alert-warning">
                <p><strong>IMPORTANTE:</strong> Por segurança, troque esta senha imediatamente após fazer login.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/login" class="button">Fazer Login</a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.</p>
        """
        
        html = self._get_base_template("Senha Redefinida - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="Sua senha foi redefinida - WOLK NOW", html_content=html, from_email=self.FROM_EMAIL_SECURITY)
    
    async def send_login_alert(self, to_email: str, username: str, ip_address: str, device: str, location: Optional[str] = None, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        """Envia alerta de novo login."""
        login_time = timestamp or datetime.now()
        location_text = location or "Não identificada"
        
        content = f"""
            <h2>Novo Login Detectado</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Detectamos um novo acesso à sua conta WOLK NOW:</p>
            
            <div class="info-table">
                <div class="info-row">
                    <span class="info-label">Data/Hora:</span>
                    <span class="info-value">{login_time.strftime('%d/%m/%Y às %H:%M')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Endereço IP:</span>
                    <span class="info-value">{ip_address}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dispositivo:</span>
                    <span class="info-value">{device}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Localização:</span>
                    <span class="info-value">{location_text}</span>
                </div>
            </div>
            
            <p><strong>Foi você?</strong> Se sim, você pode ignorar este email.</p>
            
            <div class="alert alert-warning">
                <p><strong>Não reconhece este acesso?</strong> Sua conta pode estar comprometida.</p>
                <p style="margin-top: 8px;"><a href="{self.frontend_url}/settings/security" style="color: #92400e; font-weight: 600;">Proteja sua conta agora →</a></p>
            </div>
        """
        
        html = self._get_base_template("Alerta de Login - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="Novo login detectado - WOLK NOW", html_content=html, from_email=self.FROM_EMAIL_SECURITY)
    
    async def send_password_changed(self, to_email: str, username: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Notifica que a senha foi alterada."""
        ip_text = f'<p style="color: #6b7280; font-size: 13px;">IP: {ip_address}</p>' if ip_address else ''
        
        content = f"""
            <h2>Senha Alterada com Sucesso</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A senha da sua conta WOLK NOW foi alterada com sucesso.</p>
            
            <div class="success-box">
                <p>Sua senha foi atualizada</p>
            </div>
            {ip_text}
            
            <div class="alert alert-warning">
                <p><strong>Não foi você?</strong> Entre em contato com o suporte imediatamente e redefina sua senha.</p>
            </div>
        """
        
        html = self._get_base_template("Senha Alterada - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="Sua senha foi alterada - WOLK NOW", html_content=html, from_email=self.FROM_EMAIL_SECURITY)
    
    async def send_2fa_enabled(self, to_email: str, username: str) -> Dict[str, Any]:
        """Notifica que 2FA foi ativado."""
        content = f"""
            <h2>2FA Ativado com Sucesso</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A autenticação de dois fatores (2FA) foi ativada na sua conta.</p>
            
            <div class="success-box">
                <p>Sua conta está mais segura!</p>
            </div>
            
            <div class="alert alert-info">
                <p><strong>Dica:</strong> Guarde seus códigos de recuperação em um local seguro.</p>
            </div>
        """
        
        html = self._get_base_template("2FA Ativado - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="2FA ativado na sua conta - WOLK NOW", html_content=html, from_email=self.FROM_EMAIL_SECURITY)
    
    async def send_2fa_disabled(self, to_email: str, username: str) -> Dict[str, Any]:
        """Notifica que 2FA foi desativado."""
        content = f"""
            <h2>2FA Desativado</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A autenticação de dois fatores (2FA) foi desativada na sua conta.</p>
            
            <div class="alert alert-warning">
                <p><strong>Atenção:</strong> Sua conta agora está menos protegida.</p>
                <p style="margin-top: 8px;">Recomendamos manter o 2FA ativado para maior segurança.</p>
            </div>
            
            <p>Se você não desativou o 2FA, entre em contato com o suporte imediatamente.</p>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/settings/security" class="button">Configurações de Segurança</a>
            </div>
        """
        
        html = self._get_base_template("2FA Desativado - WOLK NOW", content)
        return await self.send_email(to_email=to_email, subject="2FA desativado na sua conta - WOLK NOW", html_content=html, from_email=self.FROM_EMAIL_SECURITY)


# Singleton instance
email_service = EmailService()
