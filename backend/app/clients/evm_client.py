import httpx
from web3 import Web3
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import BlockchainError

logger = get_logger("evm_client")

class EVMClient:
    """Client for interacting with EVM-compatible blockchains."""
    
    def __init__(self):
        self.networks = {
            "ethereum": {
                "rpc_url": settings.ETHEREUM_RPC_URL,
                "chain_id": 1,
                "explorer_api": "https://api.etherscan.io/api",
                "api_key": settings.ETHERSCAN_API_KEY,
                "decimals": 18,
                "symbol": "ETH",
                "name": "Ethereum"
            },
            "polygon": {
                "rpc_url": settings.POLYGON_RPC_URL,
                "chain_id": 137,
                "explorer_api": "https://api.polygonscan.com/api",
                "api_key": settings.POLYGONSCAN_API_KEY,
                "decimals": 18,
                "symbol": "MATIC",
                "name": "Polygon"
            },
            "bsc": {
                "rpc_url": settings.BSC_RPC_URL,
                "chain_id": 56,
                "explorer_api": "https://api.bscscan.com/api",
                "api_key": settings.BSCSCAN_API_KEY,
                "decimals": 18,
                "symbol": "BNB",
                "name": "Binance Smart Chain"
            }
        }
        
        # Initialize Web3 instances
        self.web3_instances = {}
        for network, config in self.networks.items():
            try:
                provider = Web3.HTTPProvider(
                    config["rpc_url"],
                    request_kwargs={"timeout": 30}
                )
                self.web3_instances[network] = Web3(provider)
                logger.info(f"Initialized Web3 for {network}")
            except Exception as e:
                logger.error(f"Failed to initialize Web3 for {network}: {e}")
    
    def get_web3(self, network: str) -> Optional[Web3]:
        """Get Web3 instance for a specific network."""
        return self.web3_instances.get(network)
    
    def validate_address(self, address: str) -> bool:
        """Validate EVM address format."""
        try:
            return Web3.is_address(address)
        except Exception:
            return False
    
    def to_checksum_address(self, address: str) -> str:
        """Convert address to checksum format."""
        try:
            return Web3.to_checksum_address(address)
        except Exception:
            raise BlockchainError(f"Invalid address format: {address}")
    
    async def get_native_balance(self, address: str, network: str) -> Optional[Decimal]:
        """
        Get native token balance (ETH, MATIC, BNB).
        
        Args:
            address: Wallet address
            network: Network name (ethereum, polygon, bsc)
            
        Returns:
            Balance in native token units or None if error
        """
        try:
            web3 = self.get_web3(network)
            if not web3:
                raise BlockchainError(f"Web3 not available for network: {network}")
            
            # Validate and convert address
            checksum_address = self.to_checksum_address(address)
            
            # Get balance in Wei
            balance_wei = web3.eth.get_balance(checksum_address)
            
            # Convert to native token units (ETH, MATIC, BNB)
            balance = Decimal(balance_wei) / Decimal(10 ** 18)
            
            logger.debug(f"Native balance for {address} on {network}: {balance}")
            return balance
            
        except Exception as e:
            logger.error(f"Error getting native balance: {e}")
            return None
    
    async def get_token_balance(
        self, 
        address: str, 
        token_address: str, 
        network: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get ERC20 token balance.
        
        Args:
            address: Wallet address
            token_address: Token contract address
            network: Network name
            
        Returns:
            Dict with balance and token info or None if error
        """
        try:
            web3 = self.get_web3(network)
            if not web3:
                raise BlockchainError(f"Web3 not available for network: {network}")
            
            # Validate addresses
            checksum_address = self.to_checksum_address(address)
            checksum_token = self.to_checksum_address(token_address)
            
            # ERC20 ABI for required functions
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function"
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function"
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "name",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function"
                }
            ]
            
            # Create contract instance
            contract = web3.eth.contract(address=checksum_token, abi=erc20_abi)
            
            # Get token info
            try:
                balance_raw = contract.functions.balanceOf(checksum_address).call()
                decimals = contract.functions.decimals().call()
                symbol = contract.functions.symbol().call()
                name = contract.functions.name().call()
            except Exception as e:
                logger.error(f"Error calling contract functions: {e}")
                return None
            
            # Calculate balance
            balance = Decimal(balance_raw) / Decimal(10 ** decimals)
            
            result = {
                "balance": str(balance),
                "balance_raw": str(balance_raw),
                "decimals": decimals,
                "symbol": symbol,
                "name": name,
                "token_address": token_address
            }
            
            logger.debug(f"Token balance for {address}: {balance} {symbol}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting token balance: {e}")
            return None
    
    async def get_transaction_history(
        self, 
        address: str, 
        network: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get transaction history using block explorer API.
        
        Args:
            address: Wallet address
            network: Network name
            limit: Maximum number of transactions
            
        Returns:
            List of transaction data
        """
        try:
            network_config = self.networks.get(network)
            if not network_config:
                raise BlockchainError(f"Unsupported network: {network}")
            
            # Validate address
            checksum_address = self.to_checksum_address(address)
            
            # Build API request
            params = {
                "module": "account",
                "action": "txlist",
                "address": checksum_address,
                "startblock": 0,
                "endblock": 99999999,
                "page": 1,
                "offset": min(limit, 10000),  # API limit
                "sort": "desc"
            }
            
            if network_config["api_key"]:
                params["apikey"] = network_config["api_key"]
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    network_config["explorer_api"], 
                    params=params
                )
                response.raise_for_status()
                data = response.json()
            
            if data.get("status") == "1" and "result" in data:
                transactions = data["result"]
                logger.info(f"Fetched {len(transactions)} transactions for {address} on {network}")
                return transactions
            else:
                logger.warning(f"No transactions found or API error: {data}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching transaction history: {e}")
            return []
    
    async def get_token_transactions(
        self, 
        address: str, 
        network: str,
        contract_address: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get ERC20 token transaction history.
        
        Args:
            address: Wallet address
            network: Network name
            contract_address: Token contract address (optional)
            limit: Maximum number of transactions
            
        Returns:
            List of token transaction data
        """
        try:
            network_config = self.networks.get(network)
            if not network_config:
                raise BlockchainError(f"Unsupported network: {network}")
            
            checksum_address = self.to_checksum_address(address)
            
            params = {
                "module": "account",
                "action": "tokentx",
                "address": checksum_address,
                "startblock": 0,
                "endblock": 99999999,
                "page": 1,
                "offset": min(limit, 10000),
                "sort": "desc"
            }
            
            if contract_address:
                params["contractaddress"] = self.to_checksum_address(contract_address)
            
            if network_config["api_key"]:
                params["apikey"] = network_config["api_key"]
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    network_config["explorer_api"],
                    params=params
                )
                response.raise_for_status()
                data = response.json()
            
            if data.get("status") == "1" and "result" in data:
                transactions = data["result"]
                logger.info(f"Fetched {len(transactions)} token transactions for {address}")
                return transactions
            else:
                logger.warning(f"No token transactions found: {data}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching token transactions: {e}")
            return []
    
    async def estimate_gas_price(self, network: str) -> Optional[Dict[str, int]]:
        """
        Estimate current gas prices for a network.
        
        Args:
            network: Network name
            
        Returns:
            Dict with slow/standard/fast gas prices in Wei or None if error
        """
        try:
            web3 = self.get_web3(network)
            if not web3:
                return None
            
            # Get current gas price from RPC
            current_gas_price = web3.eth.gas_price
            
            # Simple estimation strategy
            # In production, you might want to use EIP-1559 or gas station APIs
            gas_prices = {
                "slow": int(current_gas_price * 0.8),
                "standard": int(current_gas_price),
                "fast": int(current_gas_price * 1.2),
                "instant": int(current_gas_price * 1.5)
            }
            
            logger.debug(f"Gas prices for {network}: {gas_prices}")
            return gas_prices
            
        except Exception as e:
            logger.error(f"Error estimating gas price for {network}: {e}")
            return None
    
    async def get_transaction_receipt(
        self, 
        tx_hash: str, 
        network: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get transaction receipt by hash.
        
        Args:
            tx_hash: Transaction hash
            network: Network name
            
        Returns:
            Transaction receipt data or None if not found
        """
        try:
            web3 = self.get_web3(network)
            if not web3:
                return None
            
            receipt = web3.eth.get_transaction_receipt(tx_hash)
            
            # Convert receipt to serializable format
            receipt_dict = {
                "transactionHash": receipt.transactionHash.hex(),
                "blockNumber": receipt.blockNumber,
                "blockHash": receipt.blockHash.hex(),
                "transactionIndex": receipt.transactionIndex,
                "from": receipt["from"],
                "to": receipt.to,
                "gasUsed": receipt.gasUsed,
                "cumulativeGasUsed": receipt.cumulativeGasUsed,
                "status": receipt.status,
                "logs": [dict(log) for log in receipt.logs]
            }
            
            logger.debug(f"Retrieved transaction receipt: {tx_hash}")
            return receipt_dict
            
        except Exception as e:
            logger.error(f"Error getting transaction receipt: {e}")
            return None

# Global instance
evm_client = EVMClient()
