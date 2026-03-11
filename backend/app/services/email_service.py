"""
📧 HOLD Wallet - Email Service
===============================

Serviço de envio de emails usando Resend.
Suporta templates HTML bonitos para:
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
    logger.warning("⚠️ Resend não instalado. Execute: pip install resend")


class EmailService:
    """
    Serviço de envio de emails transacionais.
    
    Usa Resend como provedor principal.
    Fallback para modo "log only" se não configurado.
    """
    
    # Configurações
    FROM_EMAIL = "HOLD Wallet <noreply@wolknow.com>"
    FROM_EMAIL_SECURITY = "HOLD Wallet Security <security@wolknow.com>"
    
    # Templates base
    TEMPLATE_STYLE = """
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
            .header img { max-width: 150px; }
            .header h1 { color: white; margin: 15px 0 0 0; font-size: 24px; }
            .content { padding: 30px; }
            .content h2 { color: #1f2937; margin-top: 0; }
            .content p { color: #4b5563; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { opacity: 0.9; }
            .code-box { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 4px; font-family: monospace; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .warning p { color: #92400e; margin: 0; }
            .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .info p { color: #1e40af; margin: 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 5px 0; }
            .social { margin: 15px 0; }
            .social a { margin: 0 10px; color: #6b7280; text-decoration: none; }
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
            logger.info("✅ EmailService configurado com Resend")
        else:
            logger.warning("⚠️ EmailService em modo log-only (sem RESEND_API_KEY)")
    
    def _get_base_template(self, title: str, content: str) -> str:
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
                    <h1>🔐 HOLD Wallet</h1>
                </div>
                <div class="content">
                    {content}
                </div>
                <div class="footer">
                    <div class="social">
                        <a href="https://wolknow.com">Website</a>
                        <a href="#">Suporte</a>
                        <a href="#">Termos</a>
                    </div>
                    <p>© {datetime.now().year} HOLD Wallet. Todos os direitos reservados.</p>
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
            
            logger.info(f"✅ Email enviado para {to_email}: {subject}")
            return {
                "success": True,
                "message": "Email sent successfully",
                "id": result.get("id") if isinstance(result, dict) else str(result)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar email para {to_email}: {str(e)}")
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
                <a href="{reset_url}" class="button">🔑 Redefinir Senha</a>
            </div>
            
            <div class="warning">
                <p>⚠️ Este link expira em <strong>{expires_in_hours} hora(s)</strong>.</p>
            </div>
            
            <p>Se você não solicitou a redefinição de senha, ignore este email.</p>
            <p>Sua senha atual permanecerá inalterada.</p>
            
            <div class="info">
                <p>💡 <strong>Dica de segurança:</strong> Nunca compartilhe este link com ninguém.</p>
            </div>
        """
        
        html = self._get_base_template("Recuperação de Senha - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="🔐 Recuperação de Senha - HOLD Wallet",
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
            <h2>Bem-vindo à HOLD Wallet! 🎉</h2>
            <p>Olá, <strong>{username}</strong>!</p>
            <p>Obrigado por criar sua conta. Para começar a usar todos os recursos, 
            precisamos verificar seu email.</p>
            
            <div style="text-align: center;">
                <a href="{verify_url}" class="button">✅ Verificar Email</a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px;">
                {verify_url}
            </p>
            
            <div class="info">
                <p>💡 Após verificar, você terá acesso a:</p>
                <ul style="color: #1e40af; margin: 10px 0;">
                    <li>Compra e venda de criptomoedas</li>
                    <li>Transferências P2P</li>
                    <li>Carteira multi-crypto</li>
                </ul>
            </div>
        """
        
        html = self._get_base_template("Verificar Email - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="✅ Verifique seu email - HOLD Wallet",
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
                <p style="margin: 0 0 10px 0; color: #6b7280;">Sua nova senha temporária:</p>
                <span class="code">{temp_password}</span>
            </div>
            
            <div class="warning">
                <p>⚠️ <strong>IMPORTANTE:</strong> Por segurança, troque esta senha 
                imediatamente após fazer login.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/login" class="button">🔓 Fazer Login</a>
            </div>
            
            <p>Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.</p>
        """
        
        html = self._get_base_template("Senha Redefinida - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="🔑 Sua senha foi redefinida - HOLD Wallet",
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
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">📅 Data/Hora:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">
                            {login_time.strftime('%d/%m/%Y às %H:%M')}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">🌐 Endereço IP:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{ip_address}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">📱 Dispositivo:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{device}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">📍 Localização:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">{location_text}</td>
                    </tr>
                </table>
            </div>
            
            <p><strong>Foi você?</strong> Se sim, você pode ignorar este email.</p>
            
            <div class="warning">
                <p>⚠️ <strong>Não reconhece este acesso?</strong> Sua conta pode estar comprometida.</p>
                <p style="margin-top: 10px;">
                    <a href="{self.frontend_url}/settings/security" style="color: #92400e; font-weight: 600;">
                        Proteja sua conta agora →
                    </a>
                </p>
            </div>
        """
        
        html = self._get_base_template("Alerta de Login - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="🔔 Novo login detectado - HOLD Wallet",
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
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <span style="font-size: 48px;">✅</span>
                <p style="color: #065f46; margin: 10px 0 0 0; font-weight: 600;">
                    Sua senha foi atualizada
                </p>
            </div>
            
            {f'<p style="color: #6b7280; font-size: 14px;">IP: {ip_address}</p>' if ip_address else ''}
            
            <div class="warning">
                <p>⚠️ <strong>Não foi você?</strong> Entre em contato com o suporte imediatamente 
                e redefina sua senha.</p>
            </div>
        """
        
        html = self._get_base_template("Senha Alterada - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="✅ Sua senha foi alterada - HOLD Wallet",
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
            
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <span style="font-size: 48px;">🛡️</span>
                <p style="color: #065f46; margin: 10px 0 0 0; font-weight: 600;">
                    Sua conta está mais segura!
                </p>
            </div>
            
            <div class="info">
                <p>💡 <strong>Dica:</strong> Guarde seus códigos de recuperação em um local seguro.</p>
            </div>
        """
        
        html = self._get_base_template("2FA Ativado - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="🛡️ 2FA ativado na sua conta - HOLD Wallet",
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
            
            <div class="warning">
                <p>⚠️ <strong>Atenção:</strong> Sua conta agora está menos protegida.</p>
                <p style="margin-top: 10px;">
                    Recomendamos manter o 2FA ativado para maior segurança.
                </p>
            </div>
            
            <p>Se você não desativou o 2FA, entre em contato com o suporte imediatamente.</p>
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/settings/security" class="button">
                    🔒 Configurações de Segurança
                </a>
            </div>
        """
        
        html = self._get_base_template("2FA Desativado - HOLD Wallet", content)
        
        return await self.send_email(
            to_email=to_email,
            subject="⚠️ 2FA desativado na sua conta - HOLD Wallet",
            html_content=html,
            from_email=self.FROM_EMAIL_SECURITY
        )


# Singleton instance
email_service = EmailService()
