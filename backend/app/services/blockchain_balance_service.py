"""
🔗 Blockchain Balance Service
==============================

Serviço para consultar saldos reais nas blockchains.
Suporta múltiplas redes e tokens (USDT, USDC, etc.)

APIs utilizadas:
- Ethereum/EVM: Etherscan, Polygonscan, BscScan, etc.
- Bitcoin: Blockchain.info, Blockstream
- Solana: Solana RPC
- Tron: TronGrid
"""

import logging
import httpx
from typing import Dict, Optional, Any
from decimal import Decimal
import asyncio
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


class BlockchainBalanceService:
    """Serviço para consultar saldos em múltiplas blockchains."""
    
    # API Keys (configurar em .env)
    API_KEYS = {
        "etherscan": getattr(settings, 'ETHERSCAN_API_KEY', ''),
        "polygonscan": getattr(settings, 'POLYGONSCAN_API_KEY', ''),
        "bscscan": getattr(settings, 'BSCSCAN_API_KEY', ''),
        "arbiscan": getattr(settings, 'ARBISCAN_API_KEY', ''),
    }
    
    # Endpoints das APIs
    API_ENDPOINTS = {
        "ethereum": "https://api.etherscan.io/api",
        "polygon": "https://api.polygonscan.com/api",
        "bsc": "https://api.bscscan.com/api",
        "arbitrum": "https://api.arbiscan.io/api",
        "avalanche": "https://api.snowtrace.io/api",
        "base": "https://api.basescan.org/api",
        "optimism": "https://api-optimistic.etherscan.io/api",
        "bitcoin": "https://blockchain.info",
        "bitcoin_blockstream": "https://blockstream.info/api",
        "solana": "https://api.mainnet-beta.solana.com",
        "tron": "https://api.trongrid.io",
        "litecoin": "https://api.blockcypher.com/v1/ltc/main",
        "dogecoin": "https://api.blockcypher.com/v1/doge/main",
    }
    
    # Contratos de tokens USDT
    USDT_CONTRACTS = {
        "ethereum": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "polygon": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "bsc": "0x55d398326f99059fF775485246999027B3197955",
        "avalanche": "0x9702230A8657203E2F72AE0e001Cab3f1995937b",
        "base": "0xd9aAEc860b8A647Ac0d7fc6e6e8E5AB5D29CEBda",
        "arbitrum": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        "tron": "TR7NHqjeKQxGTCi8q282JCZT1ijw8hQp2E",
    }
    
    # Contratos de tokens USDC
    USDC_CONTRACTS = {
        "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "polygon": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "bsc": "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d",
        "avalanche": "0xA7D8d9ef8D56B57FEB1A3c3d08293C1d8BD2a501",
        "base": "0x833589fC3F5dA236344f6d5f6644b87cfc8CC28c",
        "solana": "EPjFWaJy47gIdKjrWw68SWwuScqokQNuSoS16RJSpFj",
    }
    
    # Contrato do token TRAY (Trayon)
    TRAY_CONTRACTS = {
        "polygon": "0x6b62514E925099643abA13B322A62ff6298f8E8A",
    }
    
    # Decimais por rede
    DECIMALS = {
        "ethereum": 18,
        "polygon": 18,
        "bsc": 18,
        "bitcoin": 8,
        "litecoin": 8,
        "dogecoin": 8,
        "solana": 9,
        "tron": 6,
        "avalanche": 18,
        "cardano": 6,
        "polkadot": 10,
        "xrp": 6,
    }
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_native_balance(self, network: str, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo nativo de uma rede."""
        try:
            if network in ["ethereum", "polygon", "bsc", "avalanche", "base", "arbitrum", "optimism"]:
                return await self._get_evm_balance(network, address)
            elif network == "bitcoin":
                return await self._get_bitcoin_balance(address)
            elif network == "solana":
                return await self._get_solana_balance(address)
            elif network == "tron":
                return await self._get_tron_balance(address)
            elif network == "litecoin":
                return await self._get_blockcypher_balance("ltc", address)
            elif network == "dogecoin":
                return await self._get_blockcypher_balance("doge", address)
            else:
                logger.warning(f"Rede não suportada para consulta: {network}")
                return None
        except Exception as e:
            logger.error(f"Erro ao consultar saldo {network}: {e}")
            return None
    
    async def _get_evm_balance(self, network: str, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo em redes EVM (Ethereum, Polygon, BSC, etc.)."""
        try:
            # Tentar primeiro com APIs alternativas (sem rate limit)
            result = await self._get_evm_balance_alternative(network, address)
            if result:
                return result
            
            # Fallback para Etherscan API V2
            endpoint = self.API_ENDPOINTS.get(network)
            if not endpoint:
                return None
            
            # Pegar API key se disponível
            api_key = self.API_KEYS.get(f"{network}scan", "")
            
            params = {
                "module": "account",
                "action": "balance",
                "address": address,
                "tag": "latest",
            }
            if api_key:
                params["apikey"] = api_key
            
            response = await self.client.get(endpoint, params=params)
            data = response.json()
            
            if data.get("status") == "1":
                balance_wei = int(data.get("result", 0))
                decimals = self.DECIMALS.get(network, 18)
                balance = balance_wei / (10 ** decimals)
                
                return {
                    "success": True,
                    "network": network,
                    "address": address,
                    "balance": balance,
                    "balance_raw": balance_wei,
                    "symbol": self._get_native_currency(network),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            else:
                logger.warning(f"Erro na API {network}: {data.get('message')}")
                return {"success": False, "error": data.get('message', 'Unknown error')}
                
        except Exception as e:
            logger.error(f"Erro ao consultar EVM {network}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_evm_balance_alternative(self, network: str, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo via APIs alternativas (Ankr, Alchemy Public, etc.)."""
        try:
            # RPC endpoints públicos
            rpc_endpoints = {
                "ethereum": "https://eth.llamarpc.com",
                "polygon": "https://polygon-rpc.com",
                "bsc": "https://bsc-dataseed.binance.org",
                "avalanche": "https://api.avax.network/ext/bc/C/rpc",
                "base": "https://mainnet.base.org",
                "arbitrum": "https://arb1.arbitrum.io/rpc",
                "optimism": "https://mainnet.optimism.io",
            }
            
            rpc_url = rpc_endpoints.get(network)
            if not rpc_url:
                return None
            
            # JSON-RPC call para eth_getBalance
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_getBalance",
                "params": [address, "latest"]
            }
            
            response = await self.client.post(rpc_url, json=payload)
            data = response.json()
            
            if "result" in data:
                balance_hex = data["result"]
                balance_wei = int(balance_hex, 16)
                decimals = self.DECIMALS.get(network, 18)
                balance = balance_wei / (10 ** decimals)
                
                return {
                    "success": True,
                    "network": network,
                    "address": address,
                    "balance": balance,
                    "balance_raw": balance_wei,
                    "symbol": self._get_native_currency(network),
                    "source": "rpc",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            return None
        except Exception as e:
            logger.debug(f"RPC alternativo falhou para {network}: {e}")
            return None
    
    async def _get_bitcoin_balance(self, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo Bitcoin via Blockstream API."""
        try:
            url = f"{self.API_ENDPOINTS['bitcoin_blockstream']}/address/{address}"
            response = await self.client.get(url)
            data = response.json()
            
            # Saldo em satoshis
            funded = data.get("chain_stats", {}).get("funded_txo_sum", 0)
            spent = data.get("chain_stats", {}).get("spent_txo_sum", 0)
            balance_satoshi = funded - spent
            balance_btc = balance_satoshi / 100_000_000
            
            return {
                "success": True,
                "network": "bitcoin",
                "address": address,
                "balance": balance_btc,
                "balance_raw": balance_satoshi,
                "symbol": "BTC",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Erro ao consultar Bitcoin: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_solana_balance(self, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo Solana via RPC."""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getBalance",
                "params": [address]
            }
            
            response = await self.client.post(
                self.API_ENDPOINTS["solana"],
                json=payload
            )
            data = response.json()
            
            if "result" in data:
                balance_lamports = data["result"].get("value", 0)
                balance_sol = balance_lamports / 1_000_000_000
                
                return {
                    "success": True,
                    "network": "solana",
                    "address": address,
                    "balance": balance_sol,
                    "balance_raw": balance_lamports,
                    "symbol": "SOL",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return {"success": False, "error": "No result from Solana RPC"}
        except Exception as e:
            logger.error(f"Erro ao consultar Solana: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_tron_balance(self, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo Tron via TronGrid."""
        try:
            url = f"{self.API_ENDPOINTS['tron']}/v1/accounts/{address}"
            response = await self.client.get(url)
            data = response.json()
            
            if data.get("success") and data.get("data"):
                account_data = data["data"][0] if isinstance(data["data"], list) else data["data"]
                balance_sun = account_data.get("balance", 0)
                balance_trx = balance_sun / 1_000_000
                
                return {
                    "success": True,
                    "network": "tron",
                    "address": address,
                    "balance": balance_trx,
                    "balance_raw": balance_sun,
                    "symbol": "TRX",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return {"success": False, "error": "Account not found or empty"}
        except Exception as e:
            logger.error(f"Erro ao consultar Tron: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_blockcypher_balance(self, network: str, address: str) -> Optional[Dict[str, Any]]:
        """Consulta saldo via BlockCypher (LTC, DOGE)."""
        try:
            url = f"https://api.blockcypher.com/v1/{network}/main/addrs/{address}/balance"
            response = await self.client.get(url)
            data = response.json()
            
            balance_satoshi = data.get("balance", 0)
            balance = balance_satoshi / 100_000_000
            
            currency_map = {"ltc": "LTC", "doge": "DOGE"}
            
            return {
                "success": True,
                "network": network,
                "address": address,
                "balance": balance,
                "balance_raw": balance_satoshi,
                "symbol": currency_map.get(network, network.upper()),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Erro ao consultar {network}: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_token_balance(
        self, 
        network: str, 
        address: str, 
        token: str = "usdt"
    ) -> Optional[Dict[str, Any]]:
        """Consulta saldo de token (USDT, USDC, TRAY) em redes EVM via RPC."""
        try:
            supported_networks = ["ethereum", "polygon", "bsc", "avalanche", "base", "arbitrum"]
            if network not in supported_networks:
                logger.warning(f"Consulta de token não suportada para {network}")
                return {"success": False, "error": f"Network {network} not supported for token queries"}
            
            # Seleciona o contrato correto baseado no token
            token_lower = token.lower()
            if token_lower == "usdt":
                contracts = self.USDT_CONTRACTS
            elif token_lower == "usdc":
                contracts = self.USDC_CONTRACTS
            elif token_lower == "tray":
                contracts = self.TRAY_CONTRACTS
            else:
                return {"success": False, "error": f"Token {token.upper()} not supported"}
            
            contract_address = contracts.get(network)
            
            if not contract_address:
                return {"success": False, "error": f"No {token.upper()} contract for {network}"}
            
            # RPC endpoints
            rpc_endpoints = {
                "ethereum": "https://eth.llamarpc.com",
                "polygon": "https://polygon-rpc.com",
                "bsc": "https://bsc-dataseed.binance.org",
                "avalanche": "https://api.avax.network/ext/bc/C/rpc",
                "base": "https://mainnet.base.org",
                "arbitrum": "https://arb1.arbitrum.io/rpc",
            }
            
            rpc_url = rpc_endpoints.get(network)
            if not rpc_url:
                return {"success": False, "error": f"No RPC for {network}"}
            
            # balanceOf(address) = 0x70a08231
            address_padded = address[2:].lower().zfill(64)
            data = f'0x70a08231{address_padded}'
            
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_call",
                "params": [
                    {
                        "to": contract_address,
                        "data": data
                    },
                    "latest"
                ]
            }
            
            response = await self.client.post(rpc_url, json=payload)
            result = response.json()
            
            if "result" in result and result["result"] != "0x":
                balance_hex = result["result"]
                balance_raw = int(balance_hex, 16)
                # TRAY tem 18 decimais, USDT/USDC geralmente tem 6 (exceto BSC USDT que tem 18)
                if token_lower == "tray":
                    decimals = 18
                elif network == "bsc" and token_lower == "usdt":
                    decimals = 18
                else:
                    decimals = 6
                balance = balance_raw / (10 ** decimals)
                
                return {
                    "success": True,
                    "network": network,
                    "address": address,
                    "balance": balance,
                    "balance_raw": balance_raw,
                    "symbol": token.upper(),
                    "contract": contract_address,
                    "source": "rpc",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            return {"success": True, "network": network, "balance": 0, "symbol": token.upper()}
        except Exception as e:
            logger.error(f"Erro ao consultar token {token} em {network}: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_all_balances(self, addresses: Dict[str, str]) -> Dict[str, Any]:
        """
        Consulta saldos de múltiplos endereços em paralelo.
        
        Args:
            addresses: Dict com {network: address}
            
        Returns:
            Dict com saldos de cada rede
        """
        results = {}
        tasks = []
        
        for network, address in addresses.items():
            # Verificar se é uma rede de token (USDT, USDC, TRAY)
            if "_usdt" in network or "_usdc" in network or "_tray" in network:
                base_network = network.replace("_usdt", "").replace("_usdc", "").replace("_tray", "")
                if "_usdt" in network:
                    token = "usdt"
                elif "_usdc" in network:
                    token = "usdc"
                else:
                    token = "tray"
                tasks.append(self._fetch_token_balance(network, base_network, address, token))
            else:
                tasks.append(self._fetch_native_balance(network, address))
        
        # Executar em paralelo
        balances = await asyncio.gather(*tasks, return_exceptions=True)
        
        for balance in balances:
            if isinstance(balance, dict) and balance:
                network = balance.get("network")
                results[network] = balance
            elif isinstance(balance, Exception):
                logger.error(f"Erro na consulta: {balance}")
        
        return results
    
    async def _fetch_native_balance(self, network: str, address: str) -> Optional[Dict]:
        """Helper para buscar saldo nativo."""
        result = await self.get_native_balance(network, address)
        if result:
            result["network"] = network
        return result
    
    async def _fetch_token_balance(
        self, 
        full_network: str, 
        base_network: str, 
        address: str, 
        token: str
    ) -> Optional[Dict]:
        """Helper para buscar saldo de token."""
        result = await self.get_token_balance(base_network, address, token)
        if result:
            result["network"] = full_network
        return result
    
    def _get_native_currency(self, network: str) -> str:
        """Retorna símbolo da moeda nativa da rede."""
        currencies = {
            "ethereum": "ETH",
            "polygon": "MATIC",
            "bsc": "BNB",
            "avalanche": "AVAX",
            "base": "ETH",
            "arbitrum": "ETH",
            "optimism": "ETH",
            "bitcoin": "BTC",
            "solana": "SOL",
            "tron": "TRX",
            "litecoin": "LTC",
            "dogecoin": "DOGE",
        }
        return currencies.get(network, network.upper())
    
    async def get_complete_balance(self, network: str, address: str) -> Dict[str, Any]:
        """
        Consulta saldo completo de um endereço: nativo + USDT + USDC.
        
        Retorna todos os saldos disponíveis para aquele endereço na rede.
        """
        results = {
            "network": network,
            "address": address,
            "balances": [],
            "total_usd_estimate": 0
        }
        
        # Redes EVM que suportam tokens
        evm_networks = ["ethereum", "polygon", "bsc", "avalanche", "base", "arbitrum"]
        
        # 1. Consultar saldo nativo
        native_result = await self.get_native_balance(network, address)
        if native_result and native_result.get("success"):
            balance = native_result.get("balance", 0)
            if balance > 0:
                results["balances"].append({
                    "type": "native",
                    "symbol": native_result.get("symbol"),
                    "balance": balance,
                    "balance_raw": native_result.get("balance_raw", 0)
                })
        
        # 2. Se for rede EVM, consultar tokens USDT e USDC
        if network in evm_networks:
            # Consultar USDT
            usdt_result = await self.get_token_balance(network, address, "usdt")
            if usdt_result and usdt_result.get("success"):
                balance = usdt_result.get("balance", 0)
                if balance > 0:
                    results["balances"].append({
                        "type": "token",
                        "symbol": "USDT",
                        "balance": balance,
                        "balance_raw": usdt_result.get("balance_raw", 0),
                        "contract": usdt_result.get("contract")
                    })
            
            # Consultar USDC
            usdc_result = await self.get_token_balance(network, address, "usdc")
            if usdc_result and usdc_result.get("success"):
                balance = usdc_result.get("balance", 0)
                if balance > 0:
                    results["balances"].append({
                        "type": "token",
                        "symbol": "USDC",
                        "balance": balance,
                        "balance_raw": usdc_result.get("balance_raw", 0),
                        "contract": usdc_result.get("contract")
                    })
        
        results["has_balance"] = len(results["balances"]) > 0
        return results
    
    async def close(self):
        """Fecha o cliente HTTP."""
        await self.client.aclose()


# Instância singleton
blockchain_balance_service = BlockchainBalanceService()
