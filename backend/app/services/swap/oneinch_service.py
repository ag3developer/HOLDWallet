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
        
    def _get_headers(self) -> Dict[str, str]:
        """Headers para requisições à API."""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
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
