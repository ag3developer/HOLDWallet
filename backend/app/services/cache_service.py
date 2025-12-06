"""
Cache Service - Sistema de cache Redis para performance
"""
import redis
import json
import asyncio
from typing import Any, Optional, Union
from datetime import timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """Serviço de cache usando Redis"""
    
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.redis_client: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Conecta ao Redis"""
        try:
            # Configurar o cliente Redis
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Testar conexão
            await asyncio.to_thread(self.redis_client.ping)
            self._connected = True
            logger.info("✅ Redis conectado com sucesso")
            
        except Exception as e:
            logger.warning(f"⚠️ Redis não disponível: {e}")
            self._connected = False
            self.redis_client = None
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self.redis_client:
            await asyncio.to_thread(self.redis_client.close)
            self._connected = False
            logger.info("Redis desconectado")
    
    def is_connected(self) -> bool:
        """Verifica se o Redis está conectado"""
        return self._connected and self.redis_client is not None
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Obtém valor do cache
        """
        if not self.is_connected():
            return None
        
        try:
            value = await asyncio.to_thread(self.redis_client.get, key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Erro ao obter cache key '{key}': {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[Union[int, timedelta]] = None
    ) -> bool:
        """
        Define valor no cache com TTL opcional
        """
        if not self.is_connected():
            return False
        
        try:
            json_value = json.dumps(value, default=str)
            
            if ttl:
                if isinstance(ttl, timedelta):
                    ttl = int(ttl.total_seconds())
                await asyncio.to_thread(
                    self.redis_client.setex, 
                    key, 
                    ttl, 
                    json_value
                )
            else:
                await asyncio.to_thread(
                    self.redis_client.set, 
                    key, 
                    json_value
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao definir cache key '{key}': {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Remove valor do cache"""
        if not self.is_connected():
            return False
        
        try:
            result = await asyncio.to_thread(self.redis_client.delete, key)
            return bool(result)
        except Exception as e:
            logger.error(f"Erro ao deletar cache key '{key}': {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Remove todas as chaves que correspondem ao padrão"""
        if not self.is_connected():
            return 0
        
        try:
            keys = await asyncio.to_thread(self.redis_client.keys, pattern)
            if keys:
                deleted = await asyncio.to_thread(self.redis_client.delete, *keys)
                logger.info(f"Removidas {deleted} chaves com padrão '{pattern}'")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Erro ao limpar padrão '{pattern}': {e}")
            return 0
    
    # Métodos específicos para o domínio
    
    async def get_balance_cache(self, address: str, network: str) -> Optional[dict]:
        """Obtém saldo do cache"""
        key = f"balance:{network}:{address}"
        return await self.get(key)
    
    async def set_balance_cache(
        self, 
        address: str, 
        network: str, 
        balance_data: dict,
        ttl: int = None
    ) -> bool:
        """Armazena saldo no cache"""
        key = f"balance:{network}:{address}"
        cache_ttl = ttl or settings.CACHE_TTL_BALANCE
        return await self.set(key, balance_data, cache_ttl)
    
    async def get_price_cache(self, symbol: str, currency: str = "USD") -> Optional[dict]:
        """Obtém preço do cache"""
        key = f"price:{symbol}:{currency}"
        return await self.get(key)
    
    async def set_price_cache(
        self, 
        symbol: str, 
        currency: str, 
        price_data: dict,
        ttl: int = None
    ) -> bool:
        """Armazena preço no cache"""
        key = f"price:{symbol}:{currency}"
        cache_ttl = ttl or settings.CACHE_TTL_PRICES
        return await self.set(key, price_data, cache_ttl)
    
    async def get_transaction_cache(self, address: str, network: str) -> Optional[list]:
        """Obtém transações do cache"""
        key = f"transactions:{network}:{address}"
        return await self.get(key)
    
    async def set_transaction_cache(
        self, 
        address: str, 
        network: str, 
        transactions: list,
        ttl: int = 300  # 5 minutos
    ) -> bool:
        """Armazena transações no cache"""
        key = f"transactions:{network}:{address}"
        return await self.set(key, transactions, ttl)
    
    async def invalidate_user_cache(self, user_id: int):
        """Invalida todo cache relacionado a um usuário"""
        patterns = [
            f"balance:*:user:{user_id}:*",
            f"transactions:*:user:{user_id}:*",
            f"wallet:user:{user_id}:*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.clear_pattern(pattern)
            total_deleted += deleted
        
        logger.info(f"Cache invalidado para usuário {user_id}: {total_deleted} chaves")
        return total_deleted
    
    async def get_fees_cache(self, network: str) -> Optional[dict]:
        """Obtém estimativas de taxa do cache"""
        key = f"fees:{network}"
        return await self.get(key)
    
    async def set_fees_cache(
        self, 
        network: str, 
        fees_data: dict,
        ttl: int = 60  # 1 minuto
    ) -> bool:
        """Armazena estimativas de taxa no cache"""
        key = f"fees:{network}"
        return await self.set(key, fees_data, ttl)


# Instância global do cache service
cache_service = CacheService()


# Decorator para cache automático
def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator para cache automático de funções
    
    Usage:
    @cached(ttl=60, key_prefix="balance")
    async def get_balance(address, network):
        return balance_data
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Gerar chave do cache
            cache_key = f"{key_prefix}:{func.__name__}:{':'.join(map(str, args))}:{':'.join(f'{k}={v}' for k, v in kwargs.items())}"
            
            # Tentar obter do cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit para {cache_key}")
                return cached_result
            
            # Executar função e cachear resultado
            result = await func(*args, **kwargs)
            if result is not None:
                await cache_service.set(cache_key, result, ttl)
                logger.debug(f"Cache set para {cache_key}")
            
            return result
        
        return wrapper
    return decorator
