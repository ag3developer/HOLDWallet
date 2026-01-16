"""
🔄 1inch DEX Aggregator Service
===============================

Integração com a API do 1inch para obter cotações e executar swaps.

Documentação: https://portal.1inch.dev/documentation
"""

import httpx
import logging
from typing import Dict, List, Optional, Any
from decimal import Decimal
from datetime import datetime
import os

logger = logging.getLogger(__name__)

# Configuração das redes suportadas
CHAIN_CONFIG = {
    1: {
        "name": "ethereum",
        "native_token": "ETH",
        "wrapped_native": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # WETH
    },
    137: {
        "name": "polygon", 
        "native_token": "MATIC",
        "wrapped_native": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",  # WMATIC
    },
    56: {
        "name": "bsc",
        "native_token": "BNB", 
        "wrapped_native": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",  # WBNB
    },
    42161: {
        "name": "arbitrum",
        "native_token": "ETH",
        "wrapped_native": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  # WETH Arbitrum
    },
    8453: {
        "name": "base",
        "native_token": "ETH",
        "wrapped_native": "0x4200000000000000000000000000000000000006",  # WETH Base
    },
    43114: {
        "name": "avalanche",
        "native_token": "AVAX",
        "wrapped_native": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",  # WAVAX
    },
}

# Endereço nativo (representa ETH/MATIC/BNB)
NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


class OneInchService:
    """Serviço de integração com a API do 1inch."""
    
    def __init__(self):
        self.api_key = os.getenv("ONEINCH_API_KEY", "")
        self.base_url = "https://api.1inch.dev"
        self.timeout = 30.0
        
        # Preços de fallback para desenvolvimento (em USD)
        self._fallback_prices = {
            "MATIC": 0.85, "POL": 0.85,
            "ETH": 3500, "WETH": 3500,
            "BNB": 600, "WBNB": 600,
            "AVAX": 35, "WAVAX": 35,
            "ARB": 1.5,
            "USDT": 1.0, "USDC": 1.0, "DAI": 1.0, "BUSD": 1.0,
            "WBTC": 95000, "BTC": 95000,
        }
        
    def _get_headers(self) -> Dict[str, str]:
        """Headers para requisições à API."""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    def _get_fallback_quote(
        self,
        chain_id: int,
        from_token: str,
        to_token: str,
        amount: str,
    ) -> Dict[str, Any]:
        """
        Gerar cotação de fallback para desenvolvimento.
        Usa preços estimados quando a API key não está configurada.
        """
        # Mapear tokens para símbolos conhecidos
        token_symbols = {
            # Native tokens
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
                137: "MATIC", 56: "BNB", 1: "ETH", 42161: "ETH", 8453: "ETH", 43114: "AVAX"
            },
            # USDT por rede
            "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": "USDT",  # Polygon
            "0x55d398326f99059ff775485246999027b3197955": "USDT",  # BSC
            "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",  # ETH
            "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": "USDT",  # Avalanche
            # USDC por rede
            "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": "USDC",  # Polygon
            "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "USDC",  # BSC
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",  # ETH
            "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": "USDC",  # Avalanche
            "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",  # Base
            "0xaf88d065e77c8cc2239327c5edb3a432268e5831": "USDC",  # Arbitrum
            # WETH
            "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": "WETH",  # Polygon
            "0x2170ed0880ac9a755fd29b2688956bd959f933f8": "ETH",   # BSC (ETH)
            "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": "WETH",  # Avalanche
        }
        
        # Obter símbolo do token de origem
        from_token_lower = from_token.lower()
        if from_token_lower == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee":
            from_symbol = token_symbols[from_token_lower].get(chain_id, "ETH")
        else:
            from_symbol = token_symbols.get(from_token_lower, "UNKNOWN")
        
        # Obter símbolo do token de destino
        to_token_lower = to_token.lower()
        if to_token_lower == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee":
            to_symbol = token_symbols[to_token_lower].get(chain_id, "ETH")
        else:
            to_symbol = token_symbols.get(to_token_lower, "UNKNOWN")
        
        # Obter preços
        from_price = self._fallback_prices.get(from_symbol, 1.0)
        to_price = self._fallback_prices.get(to_symbol, 1.0)
        
        # Calcular quantidade de saída (com 0.3% de slippage simulado)
        from_amount_float = float(amount) / 1e18  # Assumindo 18 decimals
        value_usd = from_amount_float * from_price
        to_amount_float = (value_usd / to_price) * 0.997  # 0.3% fee
        
        # Determinar decimals do token de destino
        to_decimals = 6 if to_symbol in ["USDT", "USDC"] else 18
        to_amount_wei = int(to_amount_float * (10 ** to_decimals))
        
        logger.info(f"📊 Fallback quote: {from_amount_float} {from_symbol} (~${value_usd:.2f}) → {to_amount_float:.6f} {to_symbol}")
        
        return {
            "success": True,
            "from_token": from_token,
            "to_token": to_token,
            "from_amount": amount,
            "to_amount": str(to_amount_wei),
            "gas_estimate": 150000,
            "protocols": [["Fallback (dev mode)"]],
            "raw_response": {"fallback": True, "from_symbol": from_symbol, "to_symbol": to_symbol},
        }
    
    async def get_quote(
        self,
        chain_id: int,
        from_token: str,
        to_token: str,
        amount: str,
        slippage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Obter cotação de swap.
        
        Args:
            chain_id: ID da rede (137=Polygon, 56=BSC, 1=Ethereum)
            from_token: Endereço do token de origem
            to_token: Endereço do token de destino
            amount: Quantidade em unidades mínimas (wei)
            slippage: Tolerância de slippage em %
            
        Returns:
            Cotação com melhor preço encontrado
        """
        try:
            # Validar chain_id
            if chain_id not in CHAIN_CONFIG:
                raise ValueError(f"Chain ID {chain_id} não suportada")
            
            # Normalizar endereços
            from_token = from_token if from_token else NATIVE_TOKEN_ADDRESS
            to_token = to_token if to_token else NATIVE_TOKEN_ADDRESS
            
            # Se não tem API key, usar fallback para desenvolvimento
            if not self.api_key:
                logger.warning("⚠️ ONEINCH_API_KEY não configurada - usando modo fallback")
                return self._get_fallback_quote(chain_id, from_token, to_token, amount)
            
            url = f"{self.base_url}/swap/v6.0/{chain_id}/quote"
            params = {
                "src": from_token,
                "dst": to_token,
                "amount": str(amount),
                "includeGas": "true",
            }
            
            logger.info(f"🔄 1inch Quote: {from_token} → {to_token} ({amount}) on chain {chain_id}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ Quote recebido: {data.get('dstAmount', 'N/A')}")
                    return {
                        "success": True,
                        "from_token": from_token,
                        "to_token": to_token,
                        "from_amount": amount,
                        "to_amount": data.get("dstAmount", "0"),
                        "gas_estimate": data.get("gas", 0),
                        "protocols": data.get("protocols", []),
                        "raw_response": data,
                    }
                else:
                    error_msg = response.text
                    logger.error(f"❌ 1inch quote error: {response.status_code} - {error_msg}")
                    
                    # Se for erro de autenticação, usar fallback
                    if response.status_code == 401:
                        logger.warning("⚠️ API Key inválida - usando modo fallback")
                        return self._get_fallback_quote(chain_id, from_token, to_token, amount)
                    
                    return {
                        "success": False,
                        "error": f"1inch API error: {response.status_code}",
                        "details": error_msg,
                    }
                    
        except Exception as e:
            logger.error(f"❌ 1inch quote exception: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_swap_data(
        self,
        chain_id: int,
        from_token: str,
        to_token: str,
        amount: str,
        from_address: str,
        slippage: float = 1.0,
        disable_estimate: bool = False,
    ) -> Dict[str, Any]:
        """
        Obter dados para executar swap.
        
        Args:
            chain_id: ID da rede
            from_token: Endereço do token de origem
            to_token: Endereço do token de destino
            amount: Quantidade em unidades mínimas
            from_address: Endereço da carteira que vai executar
            slippage: Tolerância de slippage em %
            disable_estimate: Desabilitar estimativa de gas (útil para debugging)
            
        Returns:
            Dados da transação pronta para assinar
        """
        try:
            if chain_id not in CHAIN_CONFIG:
                raise ValueError(f"Chain ID {chain_id} não suportada")
            
            from_token = from_token if from_token else NATIVE_TOKEN_ADDRESS
            to_token = to_token if to_token else NATIVE_TOKEN_ADDRESS
            
            url = f"{self.base_url}/swap/v6.0/{chain_id}/swap"
            params = {
                "src": from_token,
                "dst": to_token,
                "amount": str(amount),
                "from": from_address,
                "slippage": str(slippage),
                "disableEstimate": str(disable_estimate).lower(),
            }
            
            logger.info(f"🔄 1inch Swap data: {from_token} → {to_token} from {from_address}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    tx_data = data.get("tx", {})
                    
                    logger.info("✅ Swap data recebido")
                    return {
                        "success": True,
                        "from_token": from_token,
                        "to_token": to_token,
                        "from_amount": amount,
                        "to_amount": data.get("dstAmount", "0"),
                        "tx": {
                            "to": tx_data.get("to"),
                            "data": tx_data.get("data"),
                            "value": tx_data.get("value", "0"),
                            "gas": tx_data.get("gas", 200000),
                            "gasPrice": tx_data.get("gasPrice"),
                        },
                        "raw_response": data,
                    }
                else:
                    error_msg = response.text
                    logger.error(f"❌ 1inch swap error: {response.status_code} - {error_msg}")
                    return {
                        "success": False,
                        "error": f"1inch API error: {response.status_code}",
                        "details": error_msg,
                    }
                    
        except Exception as e:
            logger.error(f"❌ 1inch swap exception: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_tokens(self, chain_id: int) -> Dict[str, Any]:
        """
        Obter lista de tokens suportados em uma rede.
        
        Args:
            chain_id: ID da rede
            
        Returns:
            Dicionário de tokens com seus metadados
        """
        try:
            url = f"{self.base_url}/swap/v6.0/{chain_id}/tokens"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    tokens = data.get("tokens", {})
                    logger.info(f"✅ {len(tokens)} tokens carregados para chain {chain_id}")
                    return {
                        "success": True,
                        "tokens": tokens,
                        "count": len(tokens),
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Failed to fetch tokens: {response.status_code}",
                    }
                    
        except Exception as e:
            logger.error(f"❌ Get tokens error: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def check_allowance(
        self,
        chain_id: int,
        token_address: str,
        wallet_address: str,
    ) -> Dict[str, Any]:
        """
        Verificar allowance de um token para o router do 1inch.
        
        Args:
            chain_id: ID da rede
            token_address: Endereço do token
            wallet_address: Endereço da carteira
            
        Returns:
            Allowance atual
        """
        try:
            url = f"{self.base_url}/swap/v6.0/{chain_id}/approve/allowance"
            params = {
                "tokenAddress": token_address,
                "walletAddress": wallet_address,
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "allowance": data.get("allowance", "0"),
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Allowance check failed: {response.status_code}",
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_approve_data(
        self,
        chain_id: int,
        token_address: str,
        amount: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Obter dados para aprovar token para o router do 1inch.
        
        Args:
            chain_id: ID da rede
            token_address: Endereço do token
            amount: Quantidade a aprovar (None = unlimited)
            
        Returns:
            Dados da transação de approve
        """
        try:
            url = f"{self.base_url}/swap/v6.0/{chain_id}/approve/transaction"
            params = {"tokenAddress": token_address}
            if amount:
                params["amount"] = amount
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "tx": {
                            "to": data.get("to"),
                            "data": data.get("data"),
                            "value": "0",
                            "gas": data.get("gas", 50000),
                        },
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Approve data failed: {response.status_code}",
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    def get_router_address(self, chain_id: int) -> str:  # noqa: ARG002
        """Obter endereço do router do 1inch para uma rede."""
        # Router v6 addresses (mesmos em todas as redes EVM)
        _ = chain_id  # Mesmo endereço em todas as redes
        return "0x111111125421cA6dc452d289314280a0f8842A65"
    
    def is_native_token(self, token_address: str) -> bool:
        """Verificar se é o token nativo da rede."""
        return token_address.lower() == NATIVE_TOKEN_ADDRESS.lower()


# Singleton
oneinch_service = OneInchService()
