"""
🛡️ HOLD Wallet - Platform Settings Service
===========================================

Serviço para gerenciar configurações da plataforma.
Inclui cache em memória para performance.

Author: HOLD Wallet Team
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
from datetime import datetime, timezone

from app.models.platform_settings import PlatformSettings, DEFAULT_PLATFORM_SETTINGS

logger = logging.getLogger(__name__)


class PlatformSettingsService:
    """
    Serviço para gerenciar configurações da plataforma.
    Usa cache em memória para evitar consultas repetidas ao banco.
    """
    
    def __init__(self):
        # Cache em memória
        self._cache: Dict[str, Any] = {}
        self._cache_loaded = False
    
    def _load_cache(self, db: Session) -> None:
        """Carrega todas as configurações para o cache"""
        try:
            settings = db.query(PlatformSettings).all()
            
            for setting in settings:
                self._cache[setting.key] = {
                    "value": setting.get_typed_value(),
                    "category": setting.category,
                    "description": setting.description
                }
            
            self._cache_loaded = True
            logger.info(f"✅ Cache de configurações carregado: {len(settings)} itens")
        except Exception as e:
            logger.error(f"❌ Erro carregando cache de configurações: {e}")
    
    def _ensure_cache(self, db: Session) -> None:
        """Garante que o cache está carregado"""
        if not self._cache_loaded:
            self._load_cache(db)
    
    def invalidate_cache(self) -> None:
        """Invalida o cache para forçar recarregamento"""
        self._cache = {}
        self._cache_loaded = False
        logger.info("🔄 Cache de configurações invalidado")
    
    def initialize_defaults(self, db: Session) -> int:
        """
        Inicializa configurações padrão no banco de dados.
        Só cria configurações que não existem ainda.
        
        Returns:
            Número de configurações criadas
        """
        try:
            created_count = 0
            
            for default in DEFAULT_PLATFORM_SETTINGS:
                existing = db.query(PlatformSettings).filter(
                    PlatformSettings.key == default["key"]
                ).first()
                
                if not existing:
                    setting = PlatformSettings(
                        key=default["key"],
                        value=default["value"],
                        value_type=default["value_type"],
                        category=default["category"],
                        description=default.get("description")
                    )
                    db.add(setting)
                    created_count += 1
                    logger.info(f"➕ Criada configuração: {default['key']}")
            
            if created_count > 0:
                db.commit()
                self.invalidate_cache()
                logger.info(f"✅ {created_count} configurações padrão criadas")
            
            return created_count
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Erro inicializando configurações: {e}")
            raise
    
    def get(self, db: Session, key: str, default: Any = None) -> Any:
        """
        Obtém valor de uma configuração específica.
        Usa cache para performance.
        """
        self._ensure_cache(db)
        
        if key in self._cache:
            return self._cache[key]["value"]
        
        # Tenta buscar do banco se não estiver no cache
        setting = db.query(PlatformSettings).filter(
            PlatformSettings.key == key
        ).first()
        
        if setting:
            value = setting.get_typed_value()
            self._cache[key] = {
                "value": value,
                "category": setting.category,
                "description": setting.description
            }
            return value
        
        return default
    
    def get_by_category(self, db: Session, category: str) -> Dict[str, Any]:
        """
        Obtém todas as configurações de uma categoria.
        """
        self._ensure_cache(db)
        
        result = {}
        for key, data in self._cache.items():
            if data["category"] == category:
                result[key] = data["value"]
        
        return result
    
    def get_all(self, db: Session) -> Dict[str, Dict[str, Any]]:
        """
        Obtém todas as configurações organizadas por categoria.
        """
        self._ensure_cache(db)
        
        result = {}
        for key, data in self._cache.items():
            category = data["category"]
            if category not in result:
                result[category] = {}
            result[category][key] = data["value"]
        
        return result
    
    def set(
        self, 
        db: Session, 
        key: str, 
        value: Any, 
        admin_id: Optional[str] = None
    ) -> bool:
        """
        Define valor de uma configuração.
        Atualiza no banco e no cache.
        """
        try:
            setting = db.query(PlatformSettings).filter(
                PlatformSettings.key == key
            ).first()
            
            if not setting:
                logger.warning(f"⚠️ Configuração não encontrada: {key}")
                return False
            
            # Converte valor para string
            setting.value = PlatformSettings.set_typed_value(value, setting.value_type)
            setting.updated_at = datetime.now(timezone.utc)
            setting.updated_by = admin_id
            
            db.commit()
            
            # Atualiza cache
            self._cache[key] = {
                "value": value,
                "category": setting.category,
                "description": setting.description
            }
            
            logger.info(f"⚙️ Configuração atualizada: {key} = {value}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Erro atualizando configuração {key}: {e}")
            raise
    
    def set_multiple(
        self, 
        db: Session, 
        updates: Dict[str, Any], 
        admin_id: Optional[str] = None
    ) -> Dict[str, bool]:
        """
        Atualiza múltiplas configurações de uma vez.
        """
        results = {}
        
        try:
            for key, value in updates.items():
                setting = db.query(PlatformSettings).filter(
                    PlatformSettings.key == key
                ).first()
                
                if setting:
                    setting.value = PlatformSettings.set_typed_value(value, setting.value_type)
                    setting.updated_at = datetime.now(timezone.utc)
                    setting.updated_by = admin_id
                    
                    # Atualiza cache
                    self._cache[key] = {
                        "value": value,
                        "category": setting.category,
                        "description": setting.description
                    }
                    results[key] = True
                else:
                    results[key] = False
                    logger.warning(f"⚠️ Configuração não encontrada: {key}")
            
            db.commit()
            logger.info(f"⚙️ {len([r for r in results.values() if r])} configurações atualizadas")
            return results
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Erro atualizando configurações: {e}")
            raise
    
    # === Métodos de conveniência para categorias específicas ===
    
    def get_fees(self, db: Session) -> Dict[str, float]:
        """Retorna todas as taxas"""
        return self.get_by_category(db, "fees")
    
    def get_limits(self, db: Session) -> Dict[str, float]:
        """Retorna todos os limites"""
        return self.get_by_category(db, "limits")
    
    def get_trading_settings(self, db: Session) -> Dict[str, Any]:
        """Retorna configurações de trading"""
        return self.get_by_category(db, "trading")
    
    def get_payment_methods(self, db: Session) -> Dict[str, bool]:
        """Retorna métodos de pagamento habilitados"""
        return self.get_by_category(db, "payment_methods")
    
    def get_otc_spread(self, db: Session) -> float:
        """Retorna spread OTC (para uso nos cálculos de preço)"""
        return self.get(db, "otc_spread_percentage", 3.0)
    
    def get_p2p_fee(self, db: Session) -> float:
        """Retorna taxa P2P"""
        return self.get(db, "p2p_fee_percentage", 0.5)
    
    def get_network_fee(self, db: Session) -> float:
        """Retorna taxa de rede"""
        return self.get(db, "network_fee_percentage", 0.25)


# Instância singleton
platform_settings_service = PlatformSettingsService()
