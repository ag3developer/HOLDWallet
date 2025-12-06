import httpx
import re
from typing import Dict, List, Optional, Any
from decimal import Decimal
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import BlockchainError

logger = get_logger("btc_client")

class BTCClient:
    """Client for interacting with Bitcoin blockchain."""
    
    def __init__(self):
        self.base_url = settings.BTC_API_URL or "https://blockstream.info/api"
        self.timeout = 30.0
        
        # Bitcoin address patterns
        self.address_patterns = {
            "p2pkh": re.compile(r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$"),  # Legacy
            "p2sh": re.compile(r"^3[a-km-zA-HJ-NP-Z1-9]{25,34}$"),      # Script Hash
            "bech32": re.compile(r"^bc1[a-z0-9]{39,59}$"),              # SegWit v0
            "taproot": re.compile(r"^bc1p[a-z0-9]{58}$")                # SegWit v1 (Taproot)
        }
    
    def validate_address(self, address: str) -> bool:
        """
        Validate Bitcoin address format.
        
        Args:
            address: Bitcoin address
            
        Returns:
            True if valid, False otherwise
        """
        try:
            if not address:
                return False
            
            # Check against known patterns
            for pattern in self.address_patterns.values():
                if pattern.match(address):
                    return True
            
            return False
            
        except Exception:
            return False
    
    def get_address_type(self, address: str) -> Optional[str]:
        """
        Get the type of Bitcoin address.
        
        Args:
            address: Bitcoin address
            
        Returns:
            Address type or None if invalid
        """
        for addr_type, pattern in self.address_patterns.items():
            if pattern.match(address):
                return addr_type
        return None
    
    async def get_balance(self, address: str) -> Optional[Decimal]:
        """
        Get Bitcoin balance for an address.
        
        Args:
            address: Bitcoin address
            
        Returns:
            Balance in BTC or None if error
        """
        try:
            if not self.validate_address(address):
                raise BlockchainError(f"Invalid Bitcoin address: {address}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/address/{address}")
                response.raise_for_status()
                data = response.json()
            
            # Calculate balance from chain stats
            funded = data.get("chain_stats", {}).get("funded_txo_sum", 0)
            spent = data.get("chain_stats", {}).get("spent_txo_sum", 0)
            balance_satoshis = funded - spent
            
            # Convert satoshis to BTC
            balance_btc = Decimal(balance_satoshis) / Decimal(100_000_000)
            
            logger.debug(f"Bitcoin balance for {address}: {balance_btc} BTC")
            return balance_btc
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error getting Bitcoin balance: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting Bitcoin balance: {e}")
            return None
    
    async def get_address_stats(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed address statistics.
        
        Args:
            address: Bitcoin address
            
        Returns:
            Address statistics or None if error
        """
        try:
            if not self.validate_address(address):
                raise BlockchainError(f"Invalid Bitcoin address: {address}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/address/{address}")
                response.raise_for_status()
                data = response.json()
            
            chain_stats = data.get("chain_stats", {})
            mempool_stats = data.get("mempool_stats", {})
            
            # Calculate confirmed balance
            confirmed_balance = (
                chain_stats.get("funded_txo_sum", 0) - 
                chain_stats.get("spent_txo_sum", 0)
            ) / 100_000_000
            
            # Calculate unconfirmed balance
            unconfirmed_balance = (
                mempool_stats.get("funded_txo_sum", 0) - 
                mempool_stats.get("spent_txo_sum", 0)
            ) / 100_000_000
            
            total_balance = confirmed_balance + unconfirmed_balance
            
            stats = {
                "address": address,
                "address_type": self.get_address_type(address),
                "confirmed_balance": str(confirmed_balance),
                "unconfirmed_balance": str(unconfirmed_balance),
                "total_balance": str(total_balance),
                "tx_count": chain_stats.get("tx_count", 0) + mempool_stats.get("tx_count", 0),
                "confirmed_tx_count": chain_stats.get("tx_count", 0),
                "unconfirmed_tx_count": mempool_stats.get("tx_count", 0),
                "total_received": chain_stats.get("funded_txo_sum", 0) / 100_000_000,
                "total_sent": chain_stats.get("spent_txo_sum", 0) / 100_000_000,
            }
            
            logger.debug(f"Bitcoin address stats for {address}: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting Bitcoin address stats: {e}")
            return None
    
    async def get_transactions(
        self, 
        address: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get transaction history for a Bitcoin address.
        
        Args:
            address: Bitcoin address
            limit: Maximum number of transactions
            
        Returns:
            List of transaction data
        """
        try:
            if not self.validate_address(address):
                raise BlockchainError(f"Invalid Bitcoin address: {address}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/address/{address}/txs")
                response.raise_for_status()
                data = response.json()
            
            # Limit results
            transactions = data[:limit] if len(data) > limit else data
            
            # Enhance transaction data
            enhanced_txs = []
            for tx in transactions:
                enhanced_tx = await self._enhance_transaction(tx, address)
                if enhanced_tx:
                    enhanced_txs.append(enhanced_tx)
            
            logger.info(f"Fetched {len(enhanced_txs)} Bitcoin transactions for {address}")
            return enhanced_txs
            
        except Exception as e:
            logger.error(f"Error getting Bitcoin transactions: {e}")
            return []
    
    async def _enhance_transaction(
        self, 
        tx: Dict[str, Any], 
        address: str
    ) -> Optional[Dict[str, Any]]:
        """
        Enhance transaction data with calculated values.
        
        Args:
            tx: Raw transaction data
            address: Address we're analyzing for
            
        Returns:
            Enhanced transaction data
        """
        try:
            tx_id = tx.get("txid")
            block_height = tx.get("status", {}).get("block_height")
            confirmed = tx.get("status", {}).get("confirmed", False)
            
            # Calculate input/output values for this address
            total_input = 0
            total_output = 0
            
            # Check inputs (spent by this address)
            for vin in tx.get("vin", []):
                prevout = vin.get("prevout", {})
                if prevout.get("scriptpubkey_address") == address:
                    total_input += prevout.get("value", 0)
            
            # Check outputs (received by this address)
            for vout in tx.get("vout", []):
                if vout.get("scriptpubkey_address") == address:
                    total_output += vout.get("value", 0)
            
            # Determine transaction type and amount
            net_amount = total_output - total_input
            
            if net_amount > 0:
                tx_type = "receive"
                amount = net_amount
            elif net_amount < 0:
                tx_type = "send"
                amount = abs(net_amount)
            else:
                tx_type = "self"  # Internal transaction
                amount = total_output
            
            # Calculate fee (only for outgoing transactions)
            fee = 0
            if tx_type == "send":
                total_tx_input = sum(vin.get("prevout", {}).get("value", 0) for vin in tx.get("vin", []))
                total_tx_output = sum(vout.get("value", 0) for vout in tx.get("vout", []))
                fee = total_tx_input - total_tx_output
            
            enhanced = {
                "txid": tx_id,
                "type": tx_type,
                "amount": amount / 100_000_000,  # Convert to BTC
                "fee": fee / 100_000_000 if fee > 0 else 0,
                "confirmations": tx.get("status", {}).get("confirmations", 0),
                "confirmed": confirmed,
                "block_height": block_height,
                "block_time": tx.get("status", {}).get("block_time"),
                "size": tx.get("size"),
                "weight": tx.get("weight"),
                "raw_tx": tx  # Include raw data for reference
            }
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing transaction: {e}")
            return None
    
    async def get_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed transaction information by ID.
        
        Args:
            tx_id: Transaction ID (hash)
            
        Returns:
            Transaction details or None if not found
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/tx/{tx_id}")
                response.raise_for_status()
                data = response.json()
            
            logger.debug(f"Retrieved Bitcoin transaction: {tx_id}")
            return data
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Bitcoin transaction not found: {tx_id}")
                return None
            logger.error(f"HTTP error getting Bitcoin transaction: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting Bitcoin transaction: {e}")
            return None
    
    async def get_utxos(self, address: str) -> List[Dict[str, Any]]:
        """
        Get unspent transaction outputs (UTXOs) for an address.
        
        Args:
            address: Bitcoin address
            
        Returns:
            List of UTXO data
        """
        try:
            if not self.validate_address(address):
                raise BlockchainError(f"Invalid Bitcoin address: {address}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/address/{address}/utxo")
                response.raise_for_status()
                data = response.json()
            
            # Enhance UTXO data
            enhanced_utxos = []
            for utxo in data:
                enhanced_utxo = {
                    "txid": utxo.get("txid"),
                    "vout": utxo.get("vout"),
                    "value": utxo.get("value") / 100_000_000,  # Convert to BTC
                    "value_satoshis": utxo.get("value"),
                    "confirmations": utxo.get("status", {}).get("confirmations", 0),
                    "confirmed": utxo.get("status", {}).get("confirmed", False),
                    "block_height": utxo.get("status", {}).get("block_height")
                }
                enhanced_utxos.append(enhanced_utxo)
            
            logger.debug(f"Retrieved {len(enhanced_utxos)} UTXOs for {address}")
            return enhanced_utxos
            
        except Exception as e:
            logger.error(f"Error getting Bitcoin UTXOs: {e}")
            return []
    
    async def get_fee_estimates(self) -> Optional[Dict[str, float]]:
        """
        Get current Bitcoin fee estimates.
        
        Returns:
            Dict with fee estimates in sat/byte or None if error
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/fee-estimates")
                response.raise_for_status()
                data = response.json()
            
            # Extract common confirmation targets
            fee_estimates = {
                "fastest": data.get("1", 0),      # 1 block (~10 minutes)
                "fast": data.get("3", 0),         # 3 blocks (~30 minutes)
                "standard": data.get("6", 0),     # 6 blocks (~1 hour)
                "slow": data.get("12", 0),        # 12 blocks (~2 hours)
                "economy": data.get("24", 0)      # 24 blocks (~4 hours)
            }
            
            logger.debug(f"Bitcoin fee estimates: {fee_estimates}")
            return fee_estimates
            
        except Exception as e:
            logger.error(f"Error getting Bitcoin fee estimates: {e}")
            return None
    
    async def broadcast_transaction(self, raw_tx: str) -> Optional[str]:
        """
        Broadcast a signed Bitcoin transaction.
        
        Args:
            raw_tx: Raw signed transaction hex
            
        Returns:
            Transaction ID if successful, None if failed
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/tx",
                    content=raw_tx,
                    headers={"Content-Type": "text/plain"}
                )
                response.raise_for_status()
                tx_id = response.text.strip()
            
            logger.info(f"Bitcoin transaction broadcast successfully: {tx_id}")
            return tx_id
            
        except httpx.HTTPError as e:
            logger.error(f"Error broadcasting Bitcoin transaction: {e}")
            return None
        except Exception as e:
            logger.error(f"Error broadcasting Bitcoin transaction: {e}")
            return None

# Global instance
btc_client = BTCClient()
