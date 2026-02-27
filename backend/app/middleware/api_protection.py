"""
API Protection Middleware - Proteção contra scripts automatizados e acesso não autorizado

Funcionalidades:
1. Bloqueia User-Agents suspeitos (scripts, bots, etc)
2. Protege /docs e /redoc em produção
3. Rate limiting avançado por IP e endpoint
4. Detecção de padrões de automação
5. Bloqueio de IPs por país (opcional)
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import time
import re
import logging
import hashlib
import json
import asyncio

from app.core.db import SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# UTILITY FUNCTIONS (compartilhadas entre middlewares)
# ============================================================================

def get_client_ip(request: Request) -> str:
    """
    Obtém o IP real do cliente (suporta Cloudflare, proxies, nginx, etc).
    Função compartilhada entre todos os middlewares.
    """
    # Cloudflare - CF-Connecting-IP é o mais confiável
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()
    
    # True-Client-IP (usado por alguns CDNs)
    true_client_ip = request.headers.get("True-Client-IP")
    if true_client_ip:
        return true_client_ip.strip()
    
    # X-Forwarded-For (proxy padrão)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # X-Real-IP (nginx)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    if request.client:
        return request.client.host
    return "unknown"


# ============================================================================
# MIDDLEWARES
# ============================================================================

class APIProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware de proteção da API - FOCO EM ROTAS ADMIN.
    
    Para usuários normais: Apenas rate limit básico
    Para admin: Proteção completa (User-Agent, automação, bloqueio)
    
    A proteção de wallet é feita pelo WalletProtectionMiddleware.
    """
    
    # User-Agents suspeitos (bibliotecas de automação) - APENAS PARA ADMIN
    BLOCKED_USER_AGENTS = [
        r'python-requests',
        r'python-urllib',
        r'curl/',
        r'wget/',
        r'postman',
        r'insomnia',
        r'httpie',
        r'axios/',
        r'node-fetch',
        r'okhttp/',          # Android HTTP client usado no ataque
        r'java/',
        r'go-http-client',
        r'ruby',
        r'perl',
        r'php/',
        r'scrapy',
        r'selenium',
        r'puppeteer',
        r'playwright',
        r'headless',
        r'phantomjs',
        r'bot',
        r'spider',
        r'crawler',
    ]
    
    # Rotas públicas que não precisam de proteção
    PUBLIC_ROUTES = [
        '/health',
        '/api/health',
        '/api/v1/health',
        '/api/public',
        '/webhooks/',          # Webhooks precisam ser públicos
        '/api/webhooks/',
        '/prices/',            # Preços são públicos
        '/api/prices/',
        '/v1/prices/',
    ]
    
    # Rotas de autenticação que precisam funcionar sem bloqueio
    AUTH_ROUTES = [
        '/auth/',
        '/api/auth/',
        '/v1/auth/',
    ]
    
    # Rotas que precisam de auth mas não devem ser bloqueadas agressivamente
    PROTECTED_APP_ROUTES = [
        '/wallets/',
        '/v1/wallets/',
        '/api/wallets/',
        '/earnpool/',
        '/v1/earnpool/',
        '/api/earnpool/',
        '/transactions/',
        '/v1/transactions/',
        '/api/transactions/',
        '/user/',
        '/v1/user/',
        '/api/user/',
        '/prices/',
        '/v1/prices/',
        '/api/prices/',
    ]
    
    # IPs de desenvolvimento que ignoram todas as proteções
    DEV_BYPASS_IPS = [
        '127.0.0.1',
        'localhost',
        '::1',
        '0.0.0.0',
    ]
    
    # Rotas que só devem funcionar em desenvolvimento
    DEV_ONLY_ROUTES = [
        '/docs',
        '/redoc',
        '/openapi.json',
    ]
    
    # Cache de requisições por IP (para detecção de automação)
    _request_history: Dict[str, List[float]] = defaultdict(list)
    _blocked_ips: Dict[str, datetime] = {}
    _blocked_reasons: Dict[str, str] = {}  # Motivo do bloqueio por IP
    _suspicious_ips: Dict[str, int] = defaultdict(int)
    
    # Configurações
    MAX_REQUESTS_PER_MINUTE = 60  # Máximo de requests por minuto por IP
    MAX_REQUESTS_PER_SECOND = 10  # Máximo de requests por segundo (detecta scripts)
    BLOCK_DURATION_MINUTES = 30   # Tempo de bloqueio em minutos
    SUSPICIOUS_THRESHOLD = 5      # Número de violações antes de bloquear
    
    # IPs permitidos para /docs (desenvolvimento)
    ALLOWED_DOCS_IPS = [
        '127.0.0.1',
        'localhost',
        '::1',
    ]
    
    async def dispatch(self, request: Request, call_next):
        ip_address = self._get_client_ip(request)
        path = request.url.path
        user_agent = request.headers.get('user-agent', '').lower()
        
        # 0. IPs locais SEMPRE passam sem verificação (conexões internas/nginx)
        if ip_address in self.DEV_BYPASS_IPS:
            return await call_next(request)
        
        # 0.1 Rotas de autenticação têm proteção reduzida
        if self._is_auth_route(path):
            # Apenas verifica rate limit básico
            if self._check_rate_limit(ip_address):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Too many requests. Please slow down.",
                        "code": "RATE_LIMIT_EXCEEDED",
                        "retry_after": 60
                    },
                    headers={"Retry-After": "60"}
                )
            self._record_request(ip_address)
            return await call_next(request)
        
        # 0.2 Rotas protegidas do app (wallets, earnpool, etc) - proteção reduzida
        if self._is_protected_app_route(path):
            # Apenas verifica rate limit básico, não bloqueia por User-Agent
            if self._check_rate_limit(ip_address):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Too many requests. Please slow down.",
                        "code": "RATE_LIMIT_EXCEEDED",
                        "retry_after": 60
                    },
                    headers={"Retry-After": "60"}
                )
            self._record_request(ip_address)
            return await call_next(request)
        
        # 1. Verificar se IP está bloqueado temporariamente
        if self._is_ip_blocked(ip_address):
            block_reason = self._get_block_reason(ip_address)
            logger.warning(f"🚫 Blocked IP {ip_address} attempted access to {path} - Reason: {block_reason}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": f"Access temporarily blocked: {block_reason}",
                    "code": "IP_BLOCKED",
                    "blocked_until": self._blocked_ips.get(ip_address, datetime.now(timezone.utc)).isoformat() if ip_address in self._blocked_ips else None
                }
            )
        
        # 2. Permitir rotas públicas
        if self._is_public_route(path):
            return await call_next(request)
        
        # 3. Bloquear /docs em produção (exceto IPs permitidos)
        if self._is_dev_only_route(path):
            if not self._is_docs_allowed(ip_address, request):
                logger.warning(f"🚫 Unauthorized docs access from {ip_address}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "API documentation is disabled in production",
                        "code": "DOCS_DISABLED"
                    }
                )
        
        # 4. Verificar User-Agent suspeito
        if self._is_suspicious_user_agent(user_agent):
            self._record_suspicious_activity(ip_address, "suspicious_user_agent", user_agent)
            logger.warning(f"🤖 Suspicious User-Agent blocked: {user_agent} from {ip_address}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Automated access is not allowed. Please use the official app.",
                    "code": "BOT_DETECTED"
                }
            )
        
        # 5. Verificar User-Agent vazio ou ausente
        if not user_agent or len(user_agent) < 10:
            self._record_suspicious_activity(ip_address, "missing_user_agent", "")
            logger.warning(f"⚠️ Missing/Invalid User-Agent from {ip_address}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "detail": "Invalid request headers",
                    "code": "INVALID_HEADERS"
                }
            )
        
        # 6. Verificar rate limit por IP
        if self._check_rate_limit(ip_address):
            self._record_suspicious_activity(ip_address, "rate_limit_exceeded", path)
            logger.warning(f"⚡ Rate limit exceeded for {ip_address} on {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # 7. Detectar padrões de automação (requests muito rápidos)
        if self._detect_automation_pattern(ip_address):
            self._record_suspicious_activity(ip_address, "automation_detected", path)
            logger.warning(f"🤖 Automation pattern detected from {ip_address}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Unusual request pattern detected. Please use the official app.",
                    "code": "AUTOMATION_DETECTED"
                }
            )
        
        # Registrar request
        self._record_request(ip_address)
        
        # Continuar com a requisição
        try:
            response = await call_next(request)
            return response
        except asyncio.CancelledError:
            # Conexão foi cancelada (cliente desconectou)
            logger.debug(f"Request cancelled: {path}")
            raise  # Re-raise para que o framework lide corretamente
    
    def _get_client_ip(self, request: Request) -> str:
        """Wrapper para função compartilhada."""
        return get_client_ip(request)
    
    def _is_public_route(self, path: str) -> bool:
        """Verifica se a rota é pública."""
        return any(path.startswith(route) for route in self.PUBLIC_ROUTES)
    
    def _is_auth_route(self, path: str) -> bool:
        """Verifica se a rota é de autenticação (proteção reduzida)."""
        return any(path.startswith(route) for route in self.AUTH_ROUTES)
    
    def _is_protected_app_route(self, path: str) -> bool:
        """Verifica se a rota é do app (wallets, earnpool, etc) - proteção reduzida."""
        return any(path.startswith(route) for route in self.PROTECTED_APP_ROUTES)
    
    def _is_dev_only_route(self, path: str) -> bool:
        """Verifica se a rota é apenas para desenvolvimento."""
        return any(path.startswith(route) or path.endswith(route) for route in self.DEV_ONLY_ROUTES)
    
    def _is_docs_allowed(self, ip_address: str, request: Request) -> bool:
        """Verifica se o IP pode acessar /docs."""
        # Em desenvolvimento, permitir todos
        if settings.ENVIRONMENT in ['development', 'dev', 'local']:
            return True
        
        # Em produção, verificar se há um header especial de admin
        admin_key = request.headers.get("X-Admin-Key")
        if admin_key and admin_key == settings.SECRET_KEY[:32]:
            return True
        
        # Verificar IPs permitidos
        if ip_address in self.ALLOWED_DOCS_IPS:
            return True
        
        # Por padrão, bloquear em produção
        return False
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Verifica se o User-Agent é suspeito."""
        if not user_agent:
            return True
        
        ua_lower = user_agent.lower()
        for pattern in self.BLOCKED_USER_AGENTS:
            if re.search(pattern, ua_lower):
                return True
        
        return False
    
    def _is_ip_blocked(self, ip_address: str) -> bool:
        """Verifica se o IP está bloqueado temporariamente."""
        if ip_address in self._blocked_ips:
            blocked_until = self._blocked_ips[ip_address]
            if datetime.now(timezone.utc) < blocked_until:
                return True
            else:
                # Desbloquear após tempo expirar
                del self._blocked_ips[ip_address]
                if ip_address in self._blocked_reasons:
                    del self._blocked_reasons[ip_address]
        return False
    
    def _get_block_reason(self, ip_address: str) -> str:
        """Retorna o motivo do bloqueio de um IP."""
        return self._blocked_reasons.get(ip_address, "Multiple suspicious activities detected")
    
    def _record_request(self, ip_address: str):
        """Registra uma requisição para o IP."""
        now = time.time()
        self._request_history[ip_address].append(now)
        
        # Limpar histórico antigo (mais de 5 minutos)
        cutoff = now - 300
        self._request_history[ip_address] = [
            t for t in self._request_history[ip_address] if t > cutoff
        ]
    
    def _check_rate_limit(self, ip_address: str) -> bool:
        """Verifica se o IP excedeu o rate limit."""
        now = time.time()
        minute_ago = now - 60
        
        recent_requests = [
            t for t in self._request_history[ip_address] if t > minute_ago
        ]
        
        return len(recent_requests) >= self.MAX_REQUESTS_PER_MINUTE
    
    def _detect_automation_pattern(self, ip_address: str) -> bool:
        """Detecta padrões de automação (muitos requests em sequência)."""
        now = time.time()
        second_ago = now - 1
        
        recent_requests = [
            t for t in self._request_history[ip_address] if t > second_ago
        ]
        
        # Mais de 10 requests por segundo indica automação
        return len(recent_requests) >= self.MAX_REQUESTS_PER_SECOND
    
    def _record_suspicious_activity(self, ip_address: str, activity_type: str, details: str):
        """Registra atividade suspeita e bloqueia se necessário."""
        self._suspicious_ips[ip_address] += 1
        
        logger.warning(f"🔴 Suspicious activity from {ip_address}: {activity_type} - {details}")
        
        # Bloquear após muitas violações
        if self._suspicious_ips[ip_address] >= self.SUSPICIOUS_THRESHOLD:
            block_until = datetime.now(timezone.utc) + timedelta(minutes=self.BLOCK_DURATION_MINUTES)
            self._blocked_ips[ip_address] = block_until
            
            # Salvar o motivo do bloqueio
            reason_map = {
                "suspicious_user_agent": "Automated tool detected",
                "missing_user_agent": "Invalid request headers",
                "rate_limit_exceeded": "Too many requests",
                "automation_detected": "Automation pattern detected",
            }
            self._blocked_reasons[ip_address] = reason_map.get(activity_type, activity_type)
            
            logger.error(f"🚫 IP {ip_address} BLOCKED until {block_until} - Reason: {self._blocked_reasons[ip_address]}")
            
            # Registrar no banco de dados (opcional)
            self._log_block_to_database(ip_address, activity_type, details)
    
    def _log_block_to_database(self, ip_address: str, reason: str, details: str):
        """Registra o bloqueio no banco de dados."""
        try:
            db = SessionLocal()
            try:
                from app.services.security_service import SecurityService
                SecurityService.auto_block_ip(
                    db=db,
                    ip_address=ip_address,
                    reason=f"API Protection: {reason} - {details}"
                )
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to log block to database: {e}")
    
    @classmethod
    def unblock_ip(cls, ip_address: str) -> bool:
        """Desbloqueia um IP manualmente (para uso admin)."""
        unblocked = False
        
        if ip_address in cls._blocked_ips:
            del cls._blocked_ips[ip_address]
            unblocked = True
            
        if ip_address in cls._blocked_reasons:
            del cls._blocked_reasons[ip_address]
            
        if ip_address in cls._suspicious_ips:
            del cls._suspicious_ips[ip_address]
            
        if ip_address in cls._request_history:
            del cls._request_history[ip_address]
        
        if unblocked:
            logger.info(f"✅ IP {ip_address} unblocked manually")
        
        return unblocked
    
    @classmethod
    def get_blocked_ips(cls) -> Dict[str, dict]:
        """Retorna lista de IPs bloqueados com detalhes."""
        result = {}
        for ip, blocked_until in cls._blocked_ips.items():
            result[ip] = {
                "blocked_until": blocked_until.isoformat(),
                "reason": cls._blocked_reasons.get(ip, "Unknown"),
                "violations": cls._suspicious_ips.get(ip, 0)
            }
        return result
    
    @classmethod
    def clear_all_blocks(cls):
        """Limpa todos os bloqueios (usar com cuidado)."""
        cls._blocked_ips.clear()
        cls._blocked_reasons.clear()
        cls._suspicious_ips.clear()
        cls._request_history.clear()
        logger.warning("⚠️ All IP blocks cleared manually")


class AdminRouteProtection(BaseHTTPMiddleware):
    """
    Middleware específico para proteger rotas administrativas.
    Requer autenticação válida + verificação de IP.
    """
    
    ADMIN_ROUTES = [
        '/api/admin/',
        '/admin/',
    ]
    
    # IPs permitidos para admin (adicionar os seus)
    ADMIN_ALLOWED_IPS: Set[str] = set()
    
    # IPs brasileiros permitidos (prefixos)
    BRAZIL_IP_PREFIXES = ['2804:', '2803:', '181.', '177.', '179.', '186.', '187.', '189.', '190.', '191.', '200.', '201.']
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Verificar se é rota admin
        if any(path.startswith(route) for route in self.ADMIN_ROUTES):
            ip_address = self._get_client_ip(request)
            
            # Verificar se IP é brasileiro
            if not self._is_brazilian_ip(ip_address):
                logger.warning(f"🚫 Non-Brazilian IP attempted admin access: {ip_address}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "Admin access restricted by location",
                        "code": "LOCATION_RESTRICTED"
                    }
                )
        
        try:
            return await call_next(request)
        except asyncio.CancelledError:
            # Conexão foi cancelada (cliente desconectou)
            logger.debug(f"Request cancelled: {path}")
            raise  # Re-raise para que o framework lide corretamente
    
    def _get_client_ip(self, request: Request) -> str:
        """Wrapper para função compartilhada."""
        return get_client_ip(request)
    
    def _is_brazilian_ip(self, ip_address: str) -> bool:
        """Verifica se o IP é brasileiro."""
        # IPs locais são permitidos
        if ip_address in ['127.0.0.1', 'localhost', '::1']:
            return True
        
        # Verificar prefixos brasileiros
        for prefix in self.BRAZIL_IP_PREFIXES:
            if ip_address.startswith(prefix):
                return True
        
        # IPs específicos permitidos
        if ip_address in self.ADMIN_ALLOWED_IPS:
            return True
        
        return False


class RequestSignatureMiddleware(BaseHTTPMiddleware):
    """
    Middleware que valida assinatura das requisições.
    Cada request do app oficial deve incluir uma assinatura HMAC.
    """
    
    # Rotas que exigem assinatura
    SIGNED_ROUTES = [
        '/api/instant-trade/',
        '/api/admin/',
    ]
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Verificar se rota requer assinatura
        if any(path.startswith(route) for route in self.SIGNED_ROUTES):
            # Verificar assinatura no header
            signature = request.headers.get('X-Request-Signature')
            timestamp = request.headers.get('X-Request-Timestamp')
            
            if not signature or not timestamp:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Request signature required",
                        "code": "SIGNATURE_MISSING"
                    }
                )
            
            # Verificar se timestamp é recente (5 minutos)
            try:
                request_time = int(timestamp)
                current_time = int(time.time())
                if abs(current_time - request_time) > 300:  # 5 minutos
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={
                            "detail": "Request expired",
                            "code": "REQUEST_EXPIRED"
                        }
                    )
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid timestamp"}
                )
            
            # Verificar assinatura HMAC
            if not self._verify_signature(request, signature, timestamp):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Invalid request signature",
                        "code": "INVALID_SIGNATURE"
                    }
                )
        
        try:
            return await call_next(request)
        except asyncio.CancelledError:
            # Conexão foi cancelada (cliente desconectou)
            logger.debug(f"Request cancelled: {path}")
            raise  # Re-raise para que o framework lide corretamente
    
    def _verify_signature(self, request: Request, signature: str, timestamp: str) -> bool:
        """Verifica a assinatura HMAC da requisição."""
        try:
            # Construir string para assinar
            method = request.method
            path = request.url.path
            
            # String: METHOD|PATH|TIMESTAMP
            sign_string = f"{method}|{path}|{timestamp}"
            
            # Calcular HMAC
            import hmac
            expected_signature = hmac.new(
                settings.SECRET_KEY.encode(),
                sign_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception:
            return False


class WalletProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware de proteção de wallet - Detecta IPs suspeitos e força logout.
    
    Funcionalidades:
    1. Verifica se o IP atual é diferente dos IPs conhecidos do usuário
    2. Gera alerta de segurança para IPs novos
    3. Força logout se detectar mudança drástica de localização
    """
    
    # Rotas de wallet que precisam de proteção
    WALLET_ROUTES = [
        '/wallets/',
        '/v1/wallets/',
        '/api/wallets/',
    ]
    
    # Rotas sensíveis que exigem verificação extra (envio de saldo)
    SENSITIVE_WALLET_ROUTES = [
        '/wallets/send',
        '/wallets/withdraw',
        '/wallets/transfer',
        '/v1/wallets/send',
        '/v1/wallets/withdraw',
        '/v1/wallets/transfer',
    ]
    
    # Cache de IPs conhecidos por usuário (em produção usar Redis)
    _user_known_ips: Dict[str, Set[str]] = defaultdict(set)
    _user_last_ip: Dict[str, str] = {}
    _user_ip_countries: Dict[str, Set[str]] = defaultdict(set)
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Só verificar rotas de wallet
        if not any(path.startswith(route) for route in self.WALLET_ROUTES):
            return await call_next(request)
        
        # Obter IP e token do usuário
        ip_address = self._get_client_ip(request)
        auth_header = request.headers.get("Authorization", "")
        
        # Se não tem auth, deixa passar (vai falhar no endpoint)
        if not auth_header.startswith("Bearer "):
            return await call_next(request)
        
        token = auth_header.replace("Bearer ", "")
        
        # Extrair user_id do token (sem validar - só para cache)
        user_id = self._extract_user_id_from_token(token)
        if not user_id:
            return await call_next(request)
        
        # Verificar se é rota sensível (envio de saldo)
        is_sensitive = any(path.startswith(route) for route in self.SENSITIVE_WALLET_ROUTES)
        
        # Verificar se IP é suspeito para este usuário
        ip_status = self._check_ip_status(user_id, ip_address)
        
        if ip_status == "new_ip":
            # IP novo - registrar e gerar alerta
            self._register_new_ip(user_id, ip_address)
            self._create_security_alert(user_id, ip_address, "new_ip", path)
            logger.info(f"🆕 New IP {ip_address} for user {user_id[:8]}... - Alert created")
            
        elif ip_status == "suspicious_location":
            # Mudança drástica de localização - FORÇAR LOGOUT
            if is_sensitive:
                self._force_logout(user_id, ip_address, "suspicious_location_change")
                logger.warning(f"🚨 FORCED LOGOUT for user {user_id[:8]}... - Suspicious location change to {ip_address}")
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Session terminated for security. Please login again.",
                        "code": "SUSPICIOUS_LOCATION",
                        "logout_reason": "suspicious_location_change"
                    }
                )
            else:
                # Para rotas não sensíveis, apenas alertar
                self._create_security_alert(user_id, ip_address, "suspicious_location", path)
        
        # Atualizar último IP
        self._user_last_ip[user_id] = ip_address
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Wrapper para função compartilhada."""
        return get_client_ip(request)
    
    def _extract_user_id_from_token(self, token: str) -> Optional[str]:
        """Extrai user_id do JWT sem validar (apenas para cache)."""
        try:
            import base64
            parts = token.split(".")
            if len(parts) != 3:
                return None
            
            # Decodificar payload (parte 2)
            payload_b64 = parts[1]
            # Adicionar padding se necessário
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            
            payload_json = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_json)
            
            return payload.get("sub") or payload.get("user_id")
        except Exception:
            return None
    
    def _check_ip_status(self, user_id: str, ip_address: str) -> str:
        """Verifica o status do IP para o usuário."""
        known_ips = self._user_known_ips.get(user_id, set())
        
        # IP já conhecido - OK
        if ip_address in known_ips:
            return "known"
        
        # Primeiro acesso do usuário - registrar como conhecido
        if not known_ips:
            return "first_access"
        
        # IP novo - verificar se é mudança drástica
        last_ip = self._user_last_ip.get(user_id)
        if last_ip:
            # Verificar se mudou de país/região (baseado no prefixo do IP)
            if self._is_drastic_location_change(last_ip, ip_address):
                return "suspicious_location"
        
        return "new_ip"
    
    def _is_drastic_location_change(self, old_ip: str, new_ip: str) -> bool:
        """Verifica se houve mudança drástica de localização."""
        # Extrair prefixo do IP (primeiros 2 octetos para IPv4)
        try:
            old_prefix = ".".join(old_ip.split(".")[:2])
            new_prefix = ".".join(new_ip.split(".")[:2])
            
            # Se os prefixos são muito diferentes, pode ser mudança de país
            # Exemplos de prefixos brasileiros: 177., 179., 186., 187., 189., 200., 201.
            brazil_prefixes = ["177", "179", "181", "186", "187", "189", "190", "191", "200", "201"]
            
            old_is_brazil = old_prefix.split(".")[0] in brazil_prefixes
            new_is_brazil = new_prefix.split(".")[0] in brazil_prefixes
            
            # Se mudou de Brasil para fora ou vice-versa = suspeito
            if old_is_brazil != new_is_brazil:
                return True
            
            return False
        except Exception:
            return False
    
    def _register_new_ip(self, user_id: str, ip_address: str):
        """Registra um novo IP para o usuário."""
        self._user_known_ips[user_id].add(ip_address)
        
        # Limitar número de IPs conhecidos (máximo 20)
        if len(self._user_known_ips[user_id]) > 20:
            # Remover o mais antigo (converter para lista, remover primeiro, converter de volta)
            ips_list = list(self._user_known_ips[user_id])
            ips_list.pop(0)
            self._user_known_ips[user_id] = set(ips_list)
    
    def _create_security_alert(self, user_id: str, ip_address: str, alert_type: str, path: str):
        """Cria um alerta de segurança no banco de dados."""
        try:
            db = SessionLocal()
            try:
                from app.models.security import SecurityAlert
                from uuid import UUID
                
                alert = SecurityAlert(
                    user_id=UUID(user_id),
                    alert_type=alert_type,
                    severity="medium" if alert_type == "new_ip" else "high",
                    message=f"Access from {'new' if alert_type == 'new_ip' else 'suspicious'} IP: {ip_address}",
                    ip_address=ip_address,
                    extra_data={"path": path, "timestamp": datetime.now(timezone.utc).isoformat()},
                    is_resolved=False
                )
                db.add(alert)
                db.commit()
                
                logger.info(f"🔔 Security alert created for user {user_id[:8]}...: {alert_type}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to create security alert: {e}")
    
    def _force_logout(self, user_id: str, ip_address: str, reason: str):
        """Força logout do usuário invalidando todas as sessões."""
        try:
            db = SessionLocal()
            try:
                from app.models.security import UserSession
                from uuid import UUID
                
                # Invalidar todas as sessões do usuário
                db.query(UserSession).filter(
                    UserSession.user_id == UUID(user_id),
                    UserSession.is_active == True
                ).update({
                    "is_active": False,
                    "logged_out_at": datetime.now(timezone.utc),
                    "logout_reason": reason
                })
                db.commit()
                
                # Criar alerta crítico
                from app.models.security import SecurityAlert
                alert = SecurityAlert(
                    user_id=UUID(user_id),
                    alert_type="forced_logout",
                    severity="critical",
                    message=f"All sessions terminated due to suspicious activity from IP: {ip_address}",
                    ip_address=ip_address,
                    extra_data={"reason": reason, "timestamp": datetime.now(timezone.utc).isoformat()},
                    is_resolved=False
                )
                db.add(alert)
                db.commit()
                
                logger.warning(f"🚨 FORCED LOGOUT executed for user {user_id[:8]}... - Reason: {reason}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to force logout: {e}")
    
    @classmethod
    def load_user_ips_from_db(cls, user_id: str):
        """Carrega IPs conhecidos do usuário do banco de dados."""
        try:
            db = SessionLocal()
            try:
                from app.models.security import UserSession
                from uuid import UUID
                
                sessions = db.query(UserSession).filter(
                    UserSession.user_id == UUID(user_id)
                ).all()
                
                for session in sessions:
                    if session.ip_address:
                        cls._user_known_ips[user_id].add(session.ip_address)
                
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to load user IPs: {e}")
    
    @classmethod
    def get_user_known_ips(cls, user_id: str) -> Set[str]:
        """Retorna IPs conhecidos do usuário."""
        return cls._user_known_ips.get(user_id, set())
