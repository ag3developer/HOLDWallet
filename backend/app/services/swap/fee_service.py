"""
💰 Swap Fee Service
==================

Gerenciamento de taxas de swap.
Permite configuração dinâmica pelo admin.
"""

import logging
from typing import Dict, Optional, Any
from decimal import Decimal
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Taxas padrão (podem ser sobrescritas pelo banco)
DEFAULT_FEES = {
    "default": Decimal("0.003"),        # 0.3%
    "stablecoin": Decimal("0.0015"),    # 0.15%
    "cross_chain": Decimal("0.005"),    # 0.5%
}

# Tokens considerados stablecoins (principais)
STABLECOINS = {
    # Polygon
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "USDC",  # USDC Polygon
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "USDT",  # USDT Polygon
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063": "DAI",   # DAI Polygon
    
    # BSC
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": "USDC",  # USDC BSC
    "0x55d398326f99059fF775485246999027B3197955": "USDT",  # USDT BSC
    "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3": "DAI",   # DAI BSC
    
    # Ethereum
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",  # USDC Ethereum
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",  # USDT Ethereum
    "0x6B175474E89094C44Da98b954EesadFeE1BFc7C": "DAI",    # DAI Ethereum
    
    # Arbitrum
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": "USDC",  # USDC Arbitrum
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9": "USDT",  # USDT Arbitrum
}


class SwapFeeService:
    """Serviço para cálculo e gerenciamento de taxas de swap."""
    
    def __init__(self):
        self.fee_cache: Dict[str, Decimal] = {}
        self.limits = {
            "min_swap_usd": Decimal("10"),
            "max_swap_usd": Decimal("50000"),
            "max_swaps_per_day": 50,
            "max_slippage": Decimal("0.05"),
        }
    
    def is_stablecoin(self, token_address: str) -> bool:
        """Verificar se um token é stablecoin."""
        return token_address.lower() in [addr.lower() for addr in STABLECOINS.keys()]
    
    def get_fee_percentage(
        self,
        from_token: str,
        to_token: str,
        chain_id: int = 137,  # noqa: ARG002 - Para uso futuro com taxas por rede
        user_vip_level: str = "bronze",
        db: Optional[Session] = None,  # noqa: ARG002 - Para buscar config do banco
    ) -> Decimal:
        """
        Obter taxa de swap baseada nos tokens e nível VIP do usuário.
        
        Args:
            from_token: Endereço do token de origem
            to_token: Endereço do token de destino
            chain_id: ID da rede
            user_vip_level: Nível VIP do usuário
            db: Sessão do banco (para buscar configs customizadas)
            
        Returns:
            Taxa em decimal (0.003 = 0.3%)
        """
        # Verificar se é swap entre stablecoins
        from_is_stable = self.is_stablecoin(from_token)
        to_is_stable = self.is_stablecoin(to_token)
        
        if from_is_stable and to_is_stable:
            base_fee = DEFAULT_FEES["stablecoin"]
        else:
            base_fee = DEFAULT_FEES["default"]
        
        # Aplicar desconto VIP
        vip_discount = self._get_vip_discount(user_vip_level)
        final_fee = base_fee * (Decimal("1") - vip_discount)
        
        logger.info(
            f"💰 Fee calculada: {base_fee} - {vip_discount*100}% VIP = {final_fee} "
            f"({from_token[:8]}...→{to_token[:8]}...)"
        )
        
        return final_fee
    
    def _get_vip_discount(self, level: str) -> Decimal:
        """Obter desconto baseado no nível VIP."""
        discounts = {
            "bronze": Decimal("0"),
            "silver": Decimal("0.10"),
            "gold": Decimal("0.20"),
            "platinum": Decimal("0.30"),
            "diamond": Decimal("0.50"),
        }
        return discounts.get(level.lower(), Decimal("0"))
    
    def calculate_fee(
        self,
        amount: Decimal,
        fee_percentage: Decimal,
    ) -> Dict[str, Decimal]:
        """
        Calcular valor da taxa.
        
        Args:
            amount: Quantidade do swap
            fee_percentage: Taxa em decimal
            
        Returns:
            Dicionário com fee_amount e net_amount
        """
        fee_amount = amount * fee_percentage
        net_amount = amount - fee_amount
        
        return {
            "fee_amount": fee_amount,
            "fee_percentage": fee_percentage,
            "net_amount": net_amount,
            "gross_amount": amount,
        }
    
    def validate_swap_limits(
        self,
        amount_usd: Decimal,
        user_swaps_today: int = 0,
    ) -> Dict[str, Any]:
        """
        Validar se o swap está dentro dos limites.
        
        Args:
            amount_usd: Valor do swap em USD
            user_swaps_today: Quantidade de swaps do usuário hoje
            
        Returns:
            Dicionário com valid e message
        """
        if amount_usd < self.limits["min_swap_usd"]:
            return {
                "valid": False,
                "error": "amount_too_low",
                "message": f"Valor mínimo: ${self.limits['min_swap_usd']}",
                "min_usd": self.limits["min_swap_usd"],
            }
        
        if amount_usd > self.limits["max_swap_usd"]:
            return {
                "valid": False,
                "error": "amount_too_high",
                "message": f"Valor máximo: ${self.limits['max_swap_usd']}",
                "max_usd": self.limits["max_swap_usd"],
            }
        
        if user_swaps_today >= self.limits["max_swaps_per_day"]:
            return {
                "valid": False,
                "error": "daily_limit_reached",
                "message": f"Limite diário: {self.limits['max_swaps_per_day']} swaps",
                "max_per_day": self.limits["max_swaps_per_day"],
            }
        
        return {
            "valid": True,
            "message": "OK",
        }
    
    def get_limits(self) -> Dict[str, Any]:
        """Obter limites atuais."""
        return {
            "min_swap_usd": float(self.limits["min_swap_usd"]),
            "max_swap_usd": float(self.limits["max_swap_usd"]),
            "max_swaps_per_day": self.limits["max_swaps_per_day"],
            "max_slippage_percent": float(self.limits["max_slippage"] * 100),
        }
    
    def get_fee_structure(self) -> Dict[str, float]:
        """Obter estrutura de taxas atual."""
        return {
            "default_percent": float(DEFAULT_FEES["default"] * 100),
            "stablecoin_percent": float(DEFAULT_FEES["stablecoin"] * 100),
            "cross_chain_percent": float(DEFAULT_FEES["cross_chain"] * 100),
        }


# Singleton
swap_fee_service = SwapFeeService()
