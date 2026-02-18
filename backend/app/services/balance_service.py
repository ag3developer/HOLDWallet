"""
💰 Balance Service
==================

Service for fetching token balances (USDT, USDC, etc) from blockchain.
"""

from web3 import Web3
from web3.middleware import geth_poa_middleware
from decimal import Decimal
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class BalanceService:
    """Service for fetching cryptocurrency and token balances."""
    
    def __init__(self):
        """Initialize Web3 providers for different networks."""
        self.providers = self._init_providers()
        
        # Token contract addresses
        self.token_contracts = {
            "ethereum": {
                "usdt": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "usdc": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            },
            "polygon": {
                "usdt": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                "usdc": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
            },
            "bsc": {
                "usdt": "0x55d398326f99059fF775485246999027B3197955",
                "usdc": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
            },
            "base": {
                "usdt": "0x0",
                "usdc": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            },
            "avalanche": {
                "usdt": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
                "usdc": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
            }
        }
    
    def _init_providers(self) -> Dict[str, Web3]:
        """Initialize Web3 providers for each network."""
        providers = {}
        
        rpc_endpoints = {
            'ethereum': 'https://eth.llamarpc.com',
            'polygon': 'https://polygon.drpc.org',
            'bsc': 'https://bsc-dataseed.binance.org',
            'base': 'https://mainnet.base.org',
            'avalanche': 'https://api.avax.network/ext/bc/C/rpc'
        }
        
        for network, endpoint in rpc_endpoints.items():
            try:
                w3 = Web3(Web3.HTTPProvider(endpoint))
                
                # Add PoA middleware for BSC and Polygon
                if network in ['bsc', 'polygon']:
                    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                
                providers[network] = w3
                logger.info(f"✅ Connected to {network}: {w3.is_connected()}")
            except Exception as e:
                logger.error(f"❌ Failed to connect to {network}: {e}")
        
        return providers
    
    async def get_token_balance(
        self,
        address: str,
        token_type: str,
        network: str,
        decimals: int = 6
    ) -> Decimal:
        """
        Get token balance (USDT, USDC) for an address.
        
        Args:
            address: Wallet address
            token_type: 'usdt' or 'usdc'
            network: Network name (ethereum, polygon, bsc, base)
            decimals: Token decimals (6 for USDT/USDC)
        
        Returns:
            Token balance as Decimal
        """
        try:
            # Get Web3 provider
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                logger.error(f"Not connected to {network}")
                return Decimal(0)
            
            # Get token contract address
            network_contracts = self.token_contracts.get(network.lower())
            if not network_contracts:
                logger.error(f"No token contracts for {network}")
                return Decimal(0)
            
            token_address = network_contracts.get(token_type.lower())
            if not token_address or token_address == "0x0":
                logger.error(f"{token_type.upper()} not available on {network}")
                return Decimal(0)
            
            # ERC-20 ABI for balanceOf function
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ]
            
            # Create contract instance
            token_contract = w3.eth.contract(
                address=w3.to_checksum_address(token_address),
                abi=erc20_abi
            )
            
            # Get balance
            balance_wei = token_contract.functions.balanceOf(
                w3.to_checksum_address(address)
            ).call()
            
            # Convert to human-readable format
            balance = Decimal(balance_wei) / Decimal(10 ** decimals)
            
            logger.info(f"✅ {token_type.upper()} balance on {network}: {balance}")
            return balance
            
        except Exception as e:
            logger.error(f"❌ Error getting token balance: {e}")
            return Decimal(0)
    
    async def get_native_balance(
        self,
        address: str,
        network: str
    ) -> Decimal:
        """
        Get native currency balance (ETH, MATIC, BNB, etc).
        
        Args:
            address: Wallet address
            network: Network name
        
        Returns:
            Native balance as Decimal
        """
        try:
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                logger.error(f"Not connected to {network}")
                return Decimal(0)
            
            balance_wei = w3.eth.get_balance(w3.to_checksum_address(address))
            balance = Decimal(w3.from_wei(balance_wei, 'ether'))
            
            logger.info(f"✅ Native balance on {network}: {balance}")
            return balance
            
        except Exception as e:
            logger.error(f"❌ Error getting native balance: {e}")
            return Decimal(0)
    
    async def get_all_balances(
        self,
        address: str,
        network: str
    ) -> Dict[str, Decimal]:
        """
        Get all balances (native + USDT + USDC) for an address.
        
        Args:
            address: Wallet address
            network: Network name
        
        Returns:
            Dict with balances: {'native': ..., 'usdt': ..., 'usdc': ...}
        """
        balances = {}
        
        # Get native balance
        balances['native'] = await self.get_native_balance(address, network)
        
        # Get USDT balance
        balances['usdt'] = await self.get_token_balance(address, 'usdt', network)
        
        # Get USDC balance
        balances['usdc'] = await self.get_token_balance(address, 'usdc', network)
        
        return balances


# Singleton instance
balance_service = BalanceService()
