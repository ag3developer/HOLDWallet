"""
Security Middleware - Middleware para verificações de segurança
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import logging

from app.core.db import SessionLocal
from app.services.security_service import SecurityService

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware para verificações de segurança em todas as requisições"""
    
    # Rotas que não precisam de verificação de IP
    EXCLUDED_PATHS = [
        "/docs",
        "/redoc", 
        "/openapi.json",
        "/health",
        "/api/health",
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        ip_address = self._get_client_ip(request)
        
        # Skip check for excluded paths
        if any(request.url.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return await call_next(request)
        
        # Check if IP is blocked
        if ip_address and ip_address != "unknown":
            db: Session = SessionLocal()
            try:
                if SecurityService.is_ip_blocked(db, ip_address):
                    logger.warning(f"Blocked IP {ip_address} attempted to access {request.url.path}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied. Your IP address has been blocked."
                    )
            finally:
                db.close()
        
        # Continue with request
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Obtém o IP real do cliente, considerando proxies
        """
        # Check X-Forwarded-For header (from reverse proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Get the first IP in the chain (original client)
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware para rate limiting básico"""
    
    # Rate limits por endpoint
    RATE_LIMITS = {
        "/api/auth/login": (5, 60),  # 5 requests per 60 seconds
        "/api/auth/register": (3, 60),  # 3 requests per 60 seconds
    }
    
    # In-memory cache para rate limiting (em produção usar Redis)
    _request_counts: dict = {}
    
    async def dispatch(self, request: Request, call_next):
        # Simple rate limiting implementation
        # In production, use Redis for distributed rate limiting
        
        ip_address = self._get_client_ip(request)
        path = request.url.path
        
        # Check if path has rate limit
        for limited_path, (max_requests, window_seconds) in self.RATE_LIMITS.items():
            if path.startswith(limited_path):
                key = f"{ip_address}:{limited_path}"
                
                # Check and update request count
                import time
                current_time = time.time()
                
                if key in self._request_counts:
                    count, start_time = self._request_counts[key]
                    
                    # Reset if window expired
                    if current_time - start_time > window_seconds:
                        self._request_counts[key] = (1, current_time)
                    elif count >= max_requests:
                        logger.warning(f"Rate limit exceeded for {ip_address} on {path}")
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many requests. Please try again later."
                        )
                    else:
                        self._request_counts[key] = (count + 1, start_time)
                else:
                    self._request_counts[key] = (1, current_time)
                
                break
        
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "unknown"
