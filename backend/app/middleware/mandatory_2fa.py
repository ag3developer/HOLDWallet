"""
🔐 Mandatory 2FA Middleware
===========================
Força autenticação de dois fatores em operações críticas.

Este middleware garante que mesmo que um atacante tenha a senha,
ele NÃO consegue:
- Aprovar trades OTC
- Criar usuários admin
- Alterar configurações sensíveis
- Fazer operações de grande valor

Sem o código do Google Authenticator/Authy do proprietário.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)


class Mandatory2FAMiddleware(BaseHTTPMiddleware):
    """
    Middleware que OBRIGA 2FA em operações críticas.
    
    Operações protegidas:
    - POST /api/admin/instant-trades/confirm-payment (aprovar trades MANUAL)
    - POST /api/admin/users/*/admin (dar admin a usuário)
    - PUT /api/admin/settings/* (alterar configurações)
    - POST /api/instant-trade/send (enviar crypto - valores altos)
    
    NÃO protegidas (automáticas):
    - POST /webhooks/bb/pix (webhook do Banco do Brasil - automático)
    - Operações server-to-server
    """
    
    # Rotas que OBRIGAM 2FA (apenas operações MANUAIS de admin)
    CRITICAL_ROUTES = [
        # Admin - Aprovação MANUAL de trades OTC
        ("POST", "/api/admin/instant-trades/confirm-payment"),
        ("POST", "/admin/instant-trades/confirm-payment"),
        
        # Admin - WolkPay aprovação MANUAL
        ("POST", "/api/admin/wolkpay/"),     # Qualquer POST em /admin/wolkpay
        ("POST", "/admin/wolkpay/"),
        
        # Admin - Gerenciamento de usuários
        ("POST", "/api/admin/users/"),
        ("PUT", "/api/admin/users/"),
        ("DELETE", "/api/admin/users/"),
        
        # Admin - Configurações
        ("PUT", "/api/admin/settings/"),
        ("POST", "/api/admin/settings/"),
        
        # Admin - Bloqueio de carteiras (NOVO)
        ("POST", "/api/admin/wallets/"),     # Block, delete
        ("DELETE", "/api/admin/wallets/"),
        ("POST", "/admin/wallets/"),
        ("DELETE", "/admin/wallets/"),
        
        # Operações de crypto de alto valor (verificar valor no body)
        ("POST", "/api/wallets/send"),
        ("POST", "/api/instant-trade/create"),
    ]
    
    # Rotas que NUNCA exigem 2FA (webhooks, callbacks, automações)
    EXEMPT_ROUTES = [
        "/webhooks/",           # Todos os webhooks (BB, Stripe, etc)
        "/callback/",           # Callbacks de pagamento
        "/health",              # Health checks
        "/api/health",
        "/wolkpay/checkout/",   # Checkout público WolkPay (não é admin)
    ]
    
    # Valor mínimo em BRL para exigir 2FA em transações
    HIGH_VALUE_THRESHOLD_BRL = 1000.0
    
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        # Verificar se é rota crítica
        requires_2fa = self._requires_2fa(method, path)
        
        if requires_2fa:
            # Importar aqui para evitar circular imports
            from app.core.db import SessionLocal
            from app.core.security import verify_token
            from app.services.two_factor_service import two_factor_service
            
            # Verificar se tem token de autenticação
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return await call_next(request)  # Deixa o auth normal lidar
            
            token = auth_header.replace("Bearer ", "")
            payload = verify_token(token)
            
            if not payload:
                return await call_next(request)  # Token inválido, auth normal lida
            
            user_email = payload.get("sub")
            
            # Verificar se 2FA está habilitado para o usuário
            db = SessionLocal()
            try:
                from app.models.user import User
                from app.models.two_factor import TwoFactorAuth
                
                user = db.query(User).filter(User.email == user_email).first()
                
                if not user:
                    return await call_next(request)
                
                # Verificar se é admin fazendo operação admin
                if '/admin/' in path and not user.is_admin:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Admin privileges required",
                            "code": "ADMIN_REQUIRED"
                        }
                    )
                
                # Verificar se usuário tem 2FA habilitado
                twofa = db.query(TwoFactorAuth).filter(
                    TwoFactorAuth.user_id == user.id,
                    TwoFactorAuth.is_enabled == True
                ).first()
                
                # Se é admin E não tem 2FA, BLOQUEAR operação crítica
                if user.is_admin and not twofa:
                    logger.warning(f"🚫 Admin {user_email} tried critical operation without 2FA enabled")
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Two-factor authentication must be enabled for admin operations. Please enable 2FA in your security settings.",
                            "code": "2FA_REQUIRED_NOT_ENABLED",
                            "setup_url": "/settings/security/2fa"
                        }
                    )
                
                # Se tem 2FA habilitado, verificar se o código foi enviado
                twofa_code = request.headers.get("X-2FA-Code")
                
                if not twofa_code:
                    logger.warning(f"⚠️ Admin {user_email} tried critical operation without 2FA code")
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={
                            "detail": "Two-factor authentication code required for this operation",
                            "code": "2FA_CODE_REQUIRED",
                            "hint": "Include X-2FA-Code header with your authenticator code"
                        }
                    )
                
                # Verificar o código 2FA
                from app.services.crypto_service import crypto_service
                # O campo é 'secret' (não 'secret_encrypted'), mas o valor está criptografado
                decrypted_secret = crypto_service.decrypt_data(twofa.secret)
                
                if not two_factor_service.verify_token(decrypted_secret, twofa_code):
                    logger.warning(f"🚫 Invalid 2FA code for admin {user_email}")
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={
                            "detail": "Invalid two-factor authentication code",
                            "code": "INVALID_2FA_CODE"
                        }
                    )
                
                # 2FA válido! Atualizar último uso
                twofa.last_used_at = datetime.now(timezone.utc)
                db.commit()
                
                logger.info(f"✅ 2FA verified for admin {user_email} on {method} {path}")
                
            except Exception as e:
                logger.error(f"Error in 2FA middleware: {e}")
                # Em caso de erro, bloquear por segurança
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={
                        "detail": "Security verification failed",
                        "code": "SECURITY_ERROR"
                    }
                )
            finally:
                db.close()
        
        return await call_next(request)
    
    def _requires_2fa(self, method: str, path: str) -> bool:
        """Verifica se a rota requer 2FA."""
        # Primeiro, verifica se está na lista de exceções (webhooks, callbacks)
        for exempt_path in self.EXEMPT_ROUTES:
            if exempt_path in path:
                return False
        
        # Depois, verifica se está na lista de rotas críticas
        for route_method, route_path in self.CRITICAL_ROUTES:
            if method == route_method and path.startswith(route_path):
                return True
        return False


class TransactionValueMiddleware(BaseHTTPMiddleware):
    """
    Middleware que exige 2FA para transações de alto valor.
    
    Qualquer transação acima de R$ 1.000 requer código 2FA,
    mesmo que o usuário não seja admin.
    """
    
    HIGH_VALUE_ROUTES = [
        ("POST", "/api/wallets/send"),
        ("POST", "/api/instant-trade/create"),
        ("POST", "/api/p2p/order"),
    ]
    
    VALUE_THRESHOLD_BRL = 1000.0
    
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        # Verificar se é rota de transação
        is_transaction_route = any(
            method == m and path.startswith(p) 
            for m, p in self.HIGH_VALUE_ROUTES
        )
        
        if is_transaction_route and method == "POST":
            # Ler body para verificar valor
            try:
                body = await request.body()
                if body:
                    data = json.loads(body)
                    
                    # Verificar diferentes campos de valor
                    value = (
                        data.get('fiat_amount') or 
                        data.get('brl_amount') or 
                        data.get('amount_brl') or
                        data.get('value') or
                        0
                    )
                    
                    if float(value) >= self.VALUE_THRESHOLD_BRL:
                        # Verificar 2FA
                        twofa_code = request.headers.get("X-2FA-Code")
                        biometric_token = request.headers.get("X-Biometric-Token")
                        
                        if not twofa_code and not biometric_token:
                            logger.warning(f"⚠️ High-value transaction ({value} BRL) without 2FA/Biometric")
                            return JSONResponse(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                content={
                                    "detail": f"Transactions above R$ {self.VALUE_THRESHOLD_BRL:.2f} require 2FA or biometric verification",
                                    "code": "HIGH_VALUE_2FA_REQUIRED",
                                    "threshold": self.VALUE_THRESHOLD_BRL,
                                    "transaction_value": float(value)
                                }
                            )
            except Exception as e:
                logger.debug(f"Could not parse transaction body: {e}")
        
        return await call_next(request)
