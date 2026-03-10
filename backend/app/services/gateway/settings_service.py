"""
⚙️ WolkPay Gateway - Settings Service
======================================

Gerenciamento de configurações do Gateway.

Features:
- Taxas padrão
- Limites do sistema
- Configurações globais

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.gateway import GatewaySettings

logger = logging.getLogger(__name__)


# Configurações padrão do gateway
DEFAULT_SETTINGS = {
    "gateway.pix_fee_percent": {
        "value": "3.50",
        "description": "Taxa padrão para pagamentos PIX (%)"
    },
    "gateway.crypto_fee_percent": {
        "value": "2.50",
        "description": "Taxa padrão para pagamentos crypto (%)"
    },
    "gateway.network_fee_percent": {
        "value": "0.50",
        "description": "Taxa adicional de rede (%)"
    },
    "gateway.min_payment_brl": {
        "value": "10.00",
        "description": "Valor mínimo de pagamento (BRL)"
    },
    "gateway.max_payment_brl": {
        "value": "50000.00",
        "description": "Valor máximo de pagamento (BRL)"
    },
    "gateway.default_daily_limit": {
        "value": "100000.00",
        "description": "Limite diário padrão para merchants (BRL)"
    },
    "gateway.brl_usd_rate": {
        "value": "5.00",
        "description": "Taxa de conversão BRL/USD (atualizar periodicamente)"
    }
}


class GatewaySettingsService:
    """
    Serviço para gerenciamento de configurações do Gateway
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._cache: Dict[str, Any] = {}
    
    # ===================================
    # GET/SET SETTINGS
    # ===================================
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Obtém valor de uma configuração
        
        Args:
            key: Chave da configuração
            default: Valor padrão se não existir
            
        Returns:
            Valor da configuração
        """
        # Tentar cache primeiro
        if key in self._cache:
            return self._cache[key]
        
        setting = self.db.query(GatewaySettings).filter(
            GatewaySettings.key == key
        ).first()
        
        if setting:
            self._cache[key] = setting.value
            return setting.value
        
        # Usar padrão do sistema
        if key in DEFAULT_SETTINGS:
            return DEFAULT_SETTINGS[key]["value"]
        
        return default
    
    async def get_decimal(self, key: str, default: Decimal = Decimal('0')) -> Decimal:
        """Obtém configuração como Decimal"""
        value = await self.get(key)
        if value is None:
            return default
        try:
            return Decimal(str(value))
        except:
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        description: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> GatewaySettings:
        """
        Define valor de uma configuração
        
        Args:
            key: Chave da configuração
            value: Novo valor
            description: Descrição (opcional)
            admin_id: ID do admin que fez a alteração
            
        Returns:
            GatewaySettings: Registro atualizado/criado
        """
        setting = self.db.query(GatewaySettings).filter(
            GatewaySettings.key == key
        ).first()
        
        if setting:
            setting.value = value
            if description:
                setting.description = description
            setting.updated_by = admin_id
        else:
            setting = GatewaySettings(
                key=key,
                value=value,
                description=description or DEFAULT_SETTINGS.get(key, {}).get("description"),
                updated_by=admin_id
            )
            self.db.add(setting)
        
        # Atualizar cache
        self._cache[key] = value
        
        self.db.commit()
        self.db.refresh(setting)
        
        logger.info(f"⚙️ Setting atualizado: {key} = {value}")
        
        return setting
    
    async def list_all(self) -> List[GatewaySettings]:
        """Lista todas as configurações"""
        return self.db.query(GatewaySettings).order_by(
            GatewaySettings.key
        ).all()
    
    # ===================================
    # CONVENIENCE METHODS
    # ===================================
    
    async def get_pix_fee_percent(self) -> Decimal:
        """Taxa PIX"""
        return await self.get_decimal('gateway.pix_fee_percent', Decimal('3.50'))
    
    async def get_crypto_fee_percent(self) -> Decimal:
        """Taxa Crypto"""
        return await self.get_decimal('gateway.crypto_fee_percent', Decimal('2.50'))
    
    async def get_network_fee_percent(self) -> Decimal:
        """Taxa de rede"""
        return await self.get_decimal('gateway.network_fee_percent', Decimal('0.50'))
    
    async def get_min_payment(self) -> Decimal:
        """Pagamento mínimo"""
        return await self.get_decimal('gateway.min_payment_brl', Decimal('10.00'))
    
    async def get_max_payment(self) -> Decimal:
        """Pagamento máximo"""
        return await self.get_decimal('gateway.max_payment_brl', Decimal('50000.00'))
    
    async def get_brl_usd_rate(self) -> Decimal:
        """Taxa BRL/USD"""
        return await self.get_decimal('gateway.brl_usd_rate', Decimal('5.00'))
    
    async def get_fees_summary(self) -> Dict[str, Any]:
        """Retorna resumo de taxas"""
        return {
            "pix_fee_percent": str(await self.get_pix_fee_percent()),
            "crypto_fee_percent": str(await self.get_crypto_fee_percent()),
            "network_fee_percent": str(await self.get_network_fee_percent()),
            "min_payment_brl": str(await self.get_min_payment()),
            "max_payment_brl": str(await self.get_max_payment()),
            "brl_usd_rate": str(await self.get_brl_usd_rate())
        }
    
    # ===================================
    # INITIALIZATION
    # ===================================
    
    async def initialize_defaults(self) -> int:
        """
        Inicializa configurações padrão se não existirem
        
        Returns:
            int: Número de configurações criadas
        """
        created = 0
        
        for key, config in DEFAULT_SETTINGS.items():
            existing = self.db.query(GatewaySettings).filter(
                GatewaySettings.key == key
            ).first()
            
            if not existing:
                setting = GatewaySettings(
                    key=key,
                    value=config["value"],
                    description=config["description"]
                )
                self.db.add(setting)
                created += 1
                logger.info(f"⚙️ Setting criado: {key} = {config['value']}")
        
        if created > 0:
            self.db.commit()
            logger.info(f"⚙️ {created} configurações padrão criadas")
        
        return created
    
    def clear_cache(self):
        """Limpa o cache de configurações"""
        self._cache.clear()
        logger.debug("🔄 Cache de settings limpo")
