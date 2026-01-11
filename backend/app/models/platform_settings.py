"""
🛡️ HOLD Wallet - Platform Settings Model
=========================================

Modelo para armazenar configurações da plataforma no banco de dados.
Inclui taxas, limites e configurações gerais.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
import uuid

from app.core.db import Base


class PlatformSettings(Base):
    """
    Configurações da plataforma armazenadas no banco de dados.
    Usa chave-valor para flexibilidade.
    """
    __tablename__ = "platform_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Chave única da configuração
    key = Column(String(100), unique=True, nullable=False, index=True)
    
    # Valor da configuração (armazenado como string, convertido conforme o tipo)
    value = Column(Text, nullable=False)
    
    # Tipo do valor para conversão correta (float, int, bool, string, json)
    value_type = Column(String(20), nullable=False, default="string")
    
    # Categoria para organização (fees, limits, trading, security, etc)
    category = Column(String(50), nullable=False, index=True)
    
    # Descrição da configuração
    description = Column(Text, nullable=True)
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(36), nullable=True)  # ID do admin que alterou
    
    def __repr__(self):
        return f"<PlatformSettings {self.key}={self.value}>"
    
    def get_typed_value(self):
        """Retorna o valor convertido para o tipo correto"""
        if self.value_type == "float":
            return float(self.value)
        elif self.value_type == "int":
            return int(self.value)
        elif self.value_type == "bool":
            return self.value.lower() in ("true", "1", "yes")
        elif self.value_type == "json":
            import json
            return json.loads(self.value)
        return self.value
    
    @classmethod
    def set_typed_value(cls, value, value_type: str) -> str:
        """Converte o valor para string para armazenamento"""
        if value_type == "bool":
            return "true" if value else "false"
        elif value_type == "json":
            import json
            return json.dumps(value)
        return str(value)


# Configurações padrão para inicialização
DEFAULT_PLATFORM_SETTINGS = [
    # === TAXAS (fees) ===
    {
        "key": "otc_spread_percentage",
        "value": "3.0",
        "value_type": "float",
        "category": "fees",
        "description": "Spread percentual aplicado nas operações OTC (compra/venda instantânea)"
    },
    {
        "key": "network_fee_percentage",
        "value": "0.25",
        "value_type": "float",
        "category": "fees",
        "description": "Taxa percentual de rede para saques externos"
    },
    {
        "key": "p2p_fee_percentage",
        "value": "0.5",
        "value_type": "float",
        "category": "fees",
        "description": "Taxa percentual cobrada em trades P2P"
    },
    {
        "key": "wolkpay_service_fee_percentage",
        "value": "3.65",
        "value_type": "float",
        "category": "fees",
        "description": "Taxa percentual de serviço WolkPay cobrada nas faturas"
    },
    {
        "key": "wolkpay_network_fee_percentage",
        "value": "0.15",
        "value_type": "float",
        "category": "fees",
        "description": "Taxa percentual de rede WolkPay cobrada nas faturas"
    },
    
    # === LIMITES (limits) ===
    {
        "key": "daily_limit_brl",
        "value": "3000000.0",
        "value_type": "float",
        "category": "limits",
        "description": "Limite diário de operações em BRL"
    },
    {
        "key": "transaction_limit_brl",
        "value": "500000.0",
        "value_type": "float",
        "category": "limits",
        "description": "Limite máximo por transação em BRL"
    },
    {
        "key": "p2p_min_order_brl",
        "value": "50.0",
        "value_type": "float",
        "category": "limits",
        "description": "Valor mínimo para ordens P2P em BRL"
    },
    {
        "key": "p2p_max_order_brl",
        "value": "500000.0",
        "value_type": "float",
        "category": "limits",
        "description": "Valor máximo para ordens P2P em BRL"
    },
    {
        "key": "wolkpay_min_brl",
        "value": "100.0",
        "value_type": "float",
        "category": "limits",
        "description": "Valor mínimo para faturas WolkPay em BRL"
    },
    {
        "key": "wolkpay_max_brl",
        "value": "15000.0",
        "value_type": "float",
        "category": "limits",
        "description": "Valor máximo para faturas WolkPay em BRL"
    },
    {
        "key": "wolkpay_expiry_minutes",
        "value": "15",
        "value_type": "int",
        "category": "limits",
        "description": "Tempo em minutos para expiração de faturas WolkPay"
    },
    
    # === TRADING ===
    {
        "key": "trading_enabled",
        "value": "true",
        "value_type": "bool",
        "category": "trading",
        "description": "Habilita/desabilita trading OTC na plataforma"
    },
    {
        "key": "p2p_enabled",
        "value": "true",
        "value_type": "bool",
        "category": "trading",
        "description": "Habilita/desabilita trading P2P na plataforma"
    },
    {
        "key": "escrow_timeout_hours",
        "value": "24",
        "value_type": "int",
        "category": "trading",
        "description": "Tempo em horas para timeout do escrow P2P"
    },
    {
        "key": "max_open_orders_per_user",
        "value": "5",
        "value_type": "int",
        "category": "trading",
        "description": "Máximo de ordens P2P abertas por usuário"
    },
    
    # === MÉTODOS DE PAGAMENTO ===
    {
        "key": "payment_pix_enabled",
        "value": "true",
        "value_type": "bool",
        "category": "payment_methods",
        "description": "Habilita pagamento via PIX"
    },
    {
        "key": "payment_ted_enabled",
        "value": "true",
        "value_type": "bool",
        "category": "payment_methods",
        "description": "Habilita pagamento via TED"
    },
]
