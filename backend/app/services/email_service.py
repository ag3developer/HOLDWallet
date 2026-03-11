"""
HOLD Wallet - Email Service
============================

Serviço de envio de emails usando Resend.
Suporta templates HTML profissionais para:
- Reset de senha
- Verificação de email
- Alertas de segurança
- Notificações de transações

Author: HOLD Wallet Team
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
    
    # Configurações
    FROM_EMAIL = "HOLD Wallet <noreply@wolknow.com>"
    FROM_EMAIL_SECURITY = "HOLD Wallet Security <security@wolknow.com>"
    
    # Ícones SVG inline (estilo Lucide)
    ICONS = {
        "lock": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        "key": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>',
        "shield": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>',
        "shield_check": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
        "shield_alert": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
        "mail_check": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/></svg>',
        "check_circle": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
        "alert_triangle": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        "info": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        "log_in": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
        "calendar": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
        "globe": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        "smartphone": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
        "map_pin": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
        "lightbulb": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
        "wallet": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
        "settings": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    }
    
    # Templates base
    TEMPLATE_STYLE = """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
            .header-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 12px; margin-bottom: 12px; }
            .header-icon svg { color: white; width: 28px; height: 28px; }
            .header h1 { color: white; margin: 10px 0 0 0; font-size: 22px; font-weight: 600; }
            .content { padding: 32px; }
            .content h2 { color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; }
            .content p { color: #4b5563; line-height: 1.7; margin: 12px 0; }
            .button { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 14px; }
            .button svg { width: 18px; height: 18px; }
            .button:hover { opacity: 0.9; }
            .code-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
            .code { font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: 6px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
            .alert { display: flex; align-items: flex-start; gap: 12px; padding: 16px; margin: 20px 0; border-radius: 8px; }
            .alert-icon { flex-shrink: 0; width: 20px; height: 20px; margin-top: 2px; }
            .alert-warning { background: #fef3c7; border: 1px solid #fde68a; }
            .alert-warning p { color: #92400e; margin: 0; }
            .alert-warning svg { color: #d97706; }
            .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; }
            .alert-info p { color: #1e40af; margin: 0; }
            .alert-info svg { color: #3b82f6; }
            .alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; }
            .alert-success p { color: #065f46; margin: 0; }
            .alert-success svg { color: #10b981; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
            .footer-links { margin: 12px 0; }
            .footer-links a { margin: 0 12px; color: #6b7280; text-decoration: none; font-size: 13px; }
            .footer-links a:hover { color: #6366f1; }
            .info-table { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .info-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .info-row svg { color: #6b7280; margin-right: 10px; flex-shrink: 0; }
            .info-label { color: #6b7280; font-size: 13px; min-width: 100px; }
            .info-value { color: #1f2937; font-weight: 500; font-size: 14px; }
            .success-box { background: #ecfdf5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
            .success-box svg { color: #10b981; width: 48px; height: 48px; margin-bottom: 12px; }
            .success-box p { color: #065f46; font-weight: 600; margin: 0; }
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
    
    def _icon(self, name: str, size: int = 24) -> str:
        """Retorna o SVG do ícone com tamanho customizado."""
        icon = self.ICONS.get(name, "")
        if size != 24:
            icon = icon.replace('width="24"', f'width="{size}"').replace('height="24"', f'height="{size}"')
        return icon
    
    def _get_base_template(self, title: str, content: str, header_icon: str = "wallet") -> str:
        """Gera template HTML base."""
        return f"""
        <!DOCTYPE html>
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
                    <div class="header-icon">
                        {self._icon(header_icon, 28)}
                    </div>
                    <h1>HOLD Wallet</h1>
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
                    <p>&copy; {datetime.now().year} HOLD Wallet. Todos os direitos reservados.</p>
                    <p>Este é um email automático, não responda.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envia um email.
        
        Args:
            to_email: Email do destinatário
            subject: Assunto do email
            html_content: Conteúdo HTML
            from_email: Email do remetente (opcional)
        
        Returns:
            Dict com resultado do envio
        """
        if not self.is_configured:
            logger.info(f"📧 [LOG-ONLY] Email para {to_email}: {subject}")
            return {
                "success": False,
                "message": "Email service not configured",
                "log_only": True
            }
        
        try:
            result = resend.Emails.send({
                "from": from_email or self.FROM_EMAIL,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            
            logger.info(f"Email enviado para {to_email}: {subject}")
            return {
                "success": True,
                "message": "Email sent successfully",
                "id": result.get("id") if isinstance(result, dict) else str(result)
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar email para {to_email}: {str(e)}")
            return {
                "success": False,
                "message": str(e),
                "error": True
            }
    
    # ==========================================
    # TEMPLATES DE EMAIL
    # ==========================================
    
    async def send_password_reset(
        self,
        to_email: str,
        username: str,
        reset_token: str,
        expires_in_hours: int = 1
    ) -> Dict[str, Any]:
        """
        Envia email de recuperação de senha.
        
        Args:
            to_email: Email do usuário
            username: Nome do usuário
            reset_token: Token de reset
            expires_in_hours: Horas até expirar
        """
        reset_url = f"{self.frontend_url}/forgot-password?token={reset_token}"
        
        content = f"""
            <h2>Recuperação de Senha</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta HOLD Wallet.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center;">
                <a href="{reset_url}" class="button">
                    {self._icon("key", 18)}
                    Redefinir Senha
                </a>
            </div>
            
            <div class="alert alert-warning">
                <div class="alert-icon">{self._icon("alert_triangle", 20)}</div>
                <div>
                    <p>Este link expira em <strong>{expires_in_hours} hora(s)</strong>.</p>
                </div>
            </div>
            
            <p>Se você não solicitou a redefinição de senha, ignore este email.</p>
            <p>Sua senha atual permanecerá inalterada.</p>
            
            <div class="alert alert-info">
                <div class="alert-icon">{self._icon("lightbulb", 20)}</div>
                <div>
                    <p><strong>Dica de segurança:</strong> Nunca compartilhe este link com ninguém.</p>
                </div>
            </div>
        """
        
        html = self._get_base_template("Recuperação de Senha - HOLD Wallet", content, "key")
        
        return await self.send_email(
            to_email=to_email,
            subject="Recuperação de Senha - HOLD Wallet",
            html_content=html
        )
    
    async def send_email_verification(
        self,
        to_email: str,
        username: str,
        verification_token: str
    ) -> Dict[str, Any]:
        """
        Envia email de verificação de conta.
        
        Args:
            to_email: Email do usuário
            username: Nome do usuário
            verification_token: Token de verificação
        """
        verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"
        
        content = f"""
            <h2>Bem-vindo à HOLD Wallet!</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Obrigado por criar sua conta. Para começar a usar todos os recursos, 
            precisamos verificar seu email.</p>
            
            <div style="text-align: center;">
                <a href="{verify_url}" class="button">
                    {self._icon("mail_check", 18)}
                    Verificar Email
                </a>
            </div>
            
            <p style="font-size: 13px; color: #6b7280;">Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px;">
                {verify_url}
            </p>
            
            <div class="alert alert-info">
                <div class="alert-icon">{self._icon("lightbulb", 20)}</div>
                <div>
                    <p><strong>Após verificar, você terá acesso a:</strong></p>
                    <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
                        <li>Compra e venda de criptomoedas</li>
                        <li>Transferências P2P</li>
                        <li>Carteira multi-crypto</li>
                    </ul>
                </div>
            </div>
        """
        
        html = self._get_base_template("Verificar Email - HOLD Wallet", content, "mail_check")
        
        return await self.send_email(
            to_email=to_email,
            subject="Verifique seu email - HOLD Wallet",
            html_content=html
        )
    
    async def send_password_reset_admin(
        self,
        to_email: str,
        username: str,
        temp_password: str
    ) -> Dict[str, Any]:
        """
        Envia email quando admin reseta a senha.
        
        Args:
            to_email: Email do usuário
            username: Nome do usuário
            temp_password: Senha temporária gerada
        """
        content = f"""
            <h2>Sua Senha Foi Redefinida</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Um administrador redefiniu a senha da sua conta HOLD Wallet.</p>
            
            <div class="code-box">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">Sua nova senha temporária:</p>
                <span class="code">{temp_password}</span>
            </div>
            
            <div class="alert alert-warning">
                <div class="alert-icon">{self._icon("alert_triangle", 20)}</div>
                <div>
                    <p><strong>IMPORTANTE:</strong> Por segurança, troque esta senha 
                    imediatamente após fazer login.</p>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/login" class="button">
                    {self._icon("log_in", 18)}
                    Fazer Login
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.</p>
        """
        
        html = self._get_base_template("Senha Redefinida - HOLD Wallet", content, "key")
        
        return await self.send_email(
            to_email=to_email,
            subject="Sua senha foi redefinida - HOLD Wallet",
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
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Envia alerta de novo login.
        
        Args:
            to_email: Email do usuário
            username: Nome do usuário
            ip_address: IP do login
            device: Dispositivo usado
            location: Localização aproximada
            timestamp: Data/hora do login
        """
        login_time = timestamp or datetime.now()
        location_text = location or "Não identificada"
        
        content = f"""
            <h2>Novo Login Detectado</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Detectamos um novo acesso à sua conta HOLD Wallet:</p>
            
            <div class="info-table">
                <div class="info-row">
                    {self._icon("calendar", 16)}
                    <span class="info-label">Data/Hora:</span>
                    <span class="info-value">{login_time.strftime('%d/%m/%Y às %H:%M')}</span>
                </div>
                <div class="info-row">
                    {self._icon("globe", 16)}
                    <span class="info-label">Endereço IP:</span>
                    <span class="info-value">{ip_address}</span>
                </div>
                <div class="info-row">
                    {self._icon("smartphone", 16)}
                    <span class="info-label">Dispositivo:</span>
                    <span class="info-value">{device}</span>
                </div>
                <div class="info-row">
                    {self._icon("map_pin", 16)}
                    <span class="info-label">Localização:</span>
                    <span class="info-value">{location_text}</span>
                </div>
            </div>
            
            <p><strong>Foi você?</strong> Se sim, você pode ignorar este email.</p>
            
            <div class="alert alert-warning">
                <div class="alert-icon">{self._icon("alert_triangle", 20)}</div>
                <div>
                    <p><strong>Não reconhece este acesso?</strong> Sua conta pode estar comprometida.</p>
                    <p style="margin-top: 8px;">
                        <a href="{self.frontend_url}/settings/security" style="color: #92400e; font-weight: 600; text-decoration: none;">
                            Proteja sua conta agora →
                        </a>
                    </p>
                </div>
            </div>
        """
        
        html = self._get_base_template("Alerta de Login - HOLD Wallet", content, "log_in")
        
        return await self.send_email(
            to_email=to_email,
            subject="Novo login detectado - HOLD Wallet",
            html_content=html,
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_password_changed(
        self,
        to_email: str,
        username: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifica que a senha foi alterada.
        
        Args:
            to_email: Email do usuário
            username: Nome do usuário
            ip_address: IP de onde foi alterada
        """
        content = f"""
            <h2>Senha Alterada com Sucesso</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A senha da sua conta HOLD Wallet foi alterada com sucesso.</p>
            
            <div class="success-box">
                {self._icon("check_circle", 48)}
                <p>Sua senha foi atualizada</p>
            </div>
            
            {f'<p style="color: #6b7280; font-size: 13px;">IP: {ip_address}</p>' if ip_address else ''}
            
            <div class="alert alert-warning">
                <div class="alert-icon">{self._icon("alert_triangle", 20)}</div>
                <div>
                    <p><strong>Não foi você?</strong> Entre em contato com o suporte imediatamente 
                    e redefina sua senha.</p>
                </div>
            </div>
        """
        
        html = self._get_base_template("Senha Alterada - HOLD Wallet", content, "check_circle")
        
        return await self.send_email(
            to_email=to_email,
            subject="Sua senha foi alterada - HOLD Wallet",
            html_content=html,
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_2fa_enabled(
        self,
        to_email: str,
        username: str
    ) -> Dict[str, Any]:
        """Notifica que 2FA foi ativado."""
        content = f"""
            <h2>2FA Ativado com Sucesso</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A autenticação de dois fatores (2FA) foi ativada na sua conta.</p>
            
            <div class="success-box">
                {self._icon("shield_check", 48)}
                <p>Sua conta está mais segura!</p>
            </div>
            
            <div class="alert alert-info">
                <div class="alert-icon">{self._icon("lightbulb", 20)}</div>
                <div>
                    <p><strong>Dica:</strong> Guarde seus códigos de recuperação em um local seguro.</p>
                </div>
            </div>
        """
        
        html = self._get_base_template("2FA Ativado - HOLD Wallet", content, "shield_check")
        
        return await self.send_email(
            to_email=to_email,
            subject="2FA ativado na sua conta - HOLD Wallet",
            html_content=html,
            from_email=self.FROM_EMAIL_SECURITY
        )
    
    async def send_2fa_disabled(
        self,
        to_email: str,
        username: str
    ) -> Dict[str, Any]:
        """Notifica que 2FA foi desativado."""
        content = f"""
            <h2>2FA Desativado</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>A autenticação de dois fatores (2FA) foi desativada na sua conta.</p>
            
            <div class="alert alert-warning">
                <div class="alert-icon">{self._icon("shield_alert", 20)}</div>
                <div>
                    <p><strong>Atenção:</strong> Sua conta agora está menos protegida.</p>
                    <p style="margin-top: 8px;">Recomendamos manter o 2FA ativado para maior segurança.</p>
                </div>
            </div>
            
            <p>Se você não desativou o 2FA, entre em contato com o suporte imediatamente.</p>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/settings/security" class="button">
                    {self._icon("settings", 18)}
                    Configurações de Segurança
                </a>
            </div>
        """
        
        html = self._get_base_template("2FA Desativado - HOLD Wallet", content, "shield_alert")
        
        return await self.send_email(
            to_email=to_email,
            subject="2FA desativado na sua conta - HOLD Wallet",
            html_content=html,
            from_email=self.FROM_EMAIL_SECURITY
        )


# Singleton instance
email_service = EmailService()
