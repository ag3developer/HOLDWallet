"""
🔑 WolkPay Gateway - API Key Service
=====================================

Gerenciamento de API Keys para autenticação de merchants.

Features:
- Geração de API Keys (live/test)
- Validação e autenticação
- Rate limiting
- Revogação

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.gateway import (
    GatewayApiKey,
    GatewayMerchant,
    MerchantStatus,
    GatewayAuditLog,
    GatewayAuditAction
)
from app.schemas.gateway import ApiKeyCreate

logger = logging.getLogger(__name__)


class ApiKeyService:
    """
    Serviço para gerenciamento de API Keys
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===================================
    # CRUD OPERATIONS
    # ===================================
    
    async def create_api_key(
        self,
        merchant_id: str,
        data: ApiKeyCreate,
        actor_id: Optional[str] = None
    ) -> Tuple[GatewayApiKey, str]:
        """
        Cria uma nova API Key para o merchant
        
        Returns:
            Tuple[GatewayApiKey, str]: (api_key_record, full_api_key)
            
        IMPORTANTE: A full_api_key só é retornada UMA VEZ!
        """
        # Verificar merchant
        merchant = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        if merchant.status != MerchantStatus.ACTIVE:
            raise ValueError("Merchant não está ativo")
        
        # Gerar API Key
        full_key, prefix, key_hash = GatewayApiKey.generate_api_key(
            is_test=data.is_test
        )
        
        # Criar registro
        api_key = GatewayApiKey(
            merchant_id=merchant_id,
            name=data.name,
            description=data.description,
            key_prefix=prefix,
            key_hash=key_hash,
            is_test=data.is_test,
            permissions=data.permissions,
            allowed_ips=data.allowed_ips,
            rate_limit_per_minute=data.rate_limit_per_minute,
            rate_limit_per_hour=data.rate_limit_per_hour,
            expires_at=data.expires_at
        )
        
        self.db.add(api_key)
        self.db.flush()
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant_id,
            api_key_id=api_key.id,
            actor_type="merchant",
            actor_id=actor_id,
            action=GatewayAuditAction.API_KEY_CREATED,
            description=f"API Key '{data.name}' criada",
            new_data={
                "name": data.name,
                "is_test": data.is_test,
                "key_prefix": prefix
            }
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(api_key)
        
        logger.info(f"🔑 API Key criada: {prefix}... para merchant {merchant.merchant_code}")
        
        return api_key, full_key
    
    async def get_api_key_by_id(self, api_key_id: str) -> Optional[GatewayApiKey]:
        """Busca API Key por ID"""
        return self.db.query(GatewayApiKey).filter(
            GatewayApiKey.id == api_key_id
        ).first()
    
    async def validate_api_key(
        self,
        api_key: str,
        ip_address: Optional[str] = None
    ) -> Tuple[bool, Optional[GatewayApiKey], Optional[str]]:
        """
        Valida uma API Key
        
        Returns:
            Tuple[bool, Optional[GatewayApiKey], Optional[str]]: 
            (is_valid, api_key_record, error_message)
        """
        # Hash da key fornecida
        key_hash = GatewayApiKey.hash_key(api_key)
        
        # Buscar pelo hash
        api_key_record = self.db.query(GatewayApiKey).filter(
            GatewayApiKey.key_hash == key_hash
        ).first()
        
        if not api_key_record:
            logger.warning(f"❌ API Key não encontrada: {api_key[:12]}...")
            return False, None, "API Key inválida"
        
        # Verificar se está ativa
        if not api_key_record.is_active:
            logger.warning(f"❌ API Key revogada: {api_key_record.key_prefix}")
            return False, api_key_record, "API Key revogada"
        
        # Verificar expiração
        if api_key_record.expires_at:
            if datetime.now(timezone.utc) > api_key_record.expires_at:
                logger.warning(f"❌ API Key expirada: {api_key_record.key_prefix}")
                return False, api_key_record, "API Key expirada"
        
        # Verificar merchant
        merchant = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == api_key_record.merchant_id
        ).first()
        
        if not merchant or merchant.status != MerchantStatus.ACTIVE:
            logger.warning(f"❌ Merchant não ativo para API Key: {api_key_record.key_prefix}")
            return False, api_key_record, "Merchant não está ativo"
        
        # Verificar IP whitelist
        if api_key_record.allowed_ips and ip_address:
            if ip_address not in api_key_record.allowed_ips:
                logger.warning(f"❌ IP não permitido: {ip_address} para {api_key_record.key_prefix}")
                return False, api_key_record, f"IP {ip_address} não autorizado"
        
        # Atualizar uso
        api_key_record.last_used_at = datetime.now(timezone.utc)
        api_key_record.last_used_ip = ip_address
        api_key_record.total_requests += 1
        
        self.db.commit()
        
        return True, api_key_record, None
    
    async def revoke_api_key(
        self,
        api_key_id: str,
        reason: Optional[str] = None,
        actor_id: Optional[str] = None
    ) -> GatewayApiKey:
        """Revoga uma API Key"""
        api_key = await self.get_api_key_by_id(api_key_id)
        
        if not api_key:
            raise ValueError("API Key não encontrada")
        
        if not api_key.is_active:
            raise ValueError("API Key já foi revogada")
        
        api_key.is_active = False
        api_key.revoked_at = datetime.now(timezone.utc)
        api_key.revoked_reason = reason
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=api_key.merchant_id,
            api_key_id=api_key.id,
            actor_type="merchant",
            actor_id=actor_id,
            action=GatewayAuditAction.API_KEY_REVOKED,
            description=f"API Key '{api_key.name}' revogada: {reason}",
            old_data={"is_active": True},
            new_data={"is_active": False, "reason": reason}
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(api_key)
        
        logger.warning(f"🔒 API Key revogada: {api_key.key_prefix}... - {reason}")
        
        return api_key
    
    async def list_api_keys(
        self,
        merchant_id: str,
        include_revoked: bool = False
    ) -> List[GatewayApiKey]:
        """Lista API Keys do merchant"""
        query = self.db.query(GatewayApiKey).filter(
            GatewayApiKey.merchant_id == merchant_id
        )
        
        if not include_revoked:
            query = query.filter(GatewayApiKey.is_active == True)
        
        return query.order_by(GatewayApiKey.created_at.desc()).all()
    
    # ===================================
    # RATE LIMITING
    # ===================================
    
    async def check_rate_limit(
        self,
        api_key_id: str,
        window_minutes: int = 1
    ) -> Tuple[bool, int]:
        """
        Verifica rate limit (implementação básica)
        
        Para produção, usar Redis para tracking mais eficiente.
        
        Returns:
            Tuple[bool, int]: (is_allowed, remaining_requests)
        """
        # TODO: Implementar com Redis para melhor performance
        # Por enquanto, apenas retorna True (permitido)
        api_key = await self.get_api_key_by_id(api_key_id)
        if not api_key:
            return False, 0
        
        # Placeholder - em produção usar Redis
        return True, api_key.rate_limit_per_minute
    
    # ===================================
    # HELPERS
    # ===================================
    
    async def get_merchant_from_api_key(
        self,
        api_key: str
    ) -> Optional[GatewayMerchant]:
        """
        Retorna o merchant associado a uma API Key
        """
        is_valid, api_key_record, _ = await self.validate_api_key(api_key)
        
        if not is_valid or not api_key_record:
            return None
        
        return self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == api_key_record.merchant_id
        ).first()
