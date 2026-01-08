"""
🔐 Blockchain Transaction Signer
================================

Real blockchain transaction signing for both custodial and non-custodial modes.
Supports: Ethereum, Polygon, BSC, Base, and other EVM chains + Bitcoin.
"""

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from decimal import Decimal
from typing import Dict, Optional, Tuple
import logging
from bitcoinlib.wallets import Wallet as BitcoinWallet
from bitcoinlib.transactions import Transaction as BitcoinTransaction

from app.core.exceptions import BlockchainError, ValidationError

logger = logging.getLogger(__name__)

class BlockchainSigner:
    """Service for signing and broadcasting blockchain transactions."""
    
    def __init__(self):
        """Initialize Web3 providers for different networks."""
        self.providers = self._init_providers()
        self.gas_limits = self._init_gas_limits()
    
    def _init_providers(self) -> Dict[str, Web3]:
        """Initialize Web3 providers for each network."""
        providers = {}
        
        # RPC endpoints (use environment variables in production)
        rpc_endpoints = {
            'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/demo',  # Replace with your key
            'polygon': 'https://polygon-rpc.com',
            'bsc': 'https://bsc-dataseed.binance.org',
            'base': 'https://mainnet.base.org',
            'avalanche': 'https://api.avax.network/ext/bc/C/rpc',
            
            # Testnets for development
            'ethereum-goerli': 'https://goerli.infura.io/v3/demo',
            'polygon-mumbai': 'https://rpc-mumbai.maticvigil.com',
            'bsc-testnet': 'https://data-seed-prebsc-1-s1.binance.org:8545'
        }
        
        for network, endpoint in rpc_endpoints.items():
            try:
                w3 = Web3(Web3.HTTPProvider(endpoint))
                
                # Add PoA middleware for BSC and Polygon
                if network in ['bsc', 'bsc-testnet', 'polygon', 'polygon-mumbai']:
                    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                
                providers[network] = w3
                logger.info(f"✅ Connected to {network}: {w3.is_connected()}")
            except Exception as e:
                logger.error(f"❌ Failed to connect to {network}: {e}")
        
        return providers
    
    def _init_gas_limits(self) -> Dict[str, int]:
        """Default gas limits for different transaction types."""
        return {
            'transfer': 21000,        # Simple ETH/BNB/MATIC transfer
            'erc20': 65000,          # ERC-20 token transfer
            'contract': 150000,      # Smart contract interaction
            'swap': 200000           # DEX swap
        }
    
    async def sign_evm_transaction(
        self,
        network: str,
        from_address: str,
        to_address: str,
        amount: str,
        private_key: str,
        gas_price_gwei: Optional[float] = None,
        nonce: Optional[int] = None
    ) -> Tuple[str, Dict]:
        """
        Sign an EVM-compatible transaction (Ethereum, Polygon, BSC, Base, etc).
        
        Args:
            network: Network name (ethereum, polygon, bsc, base)
            from_address: Sender address
            to_address: Recipient address
            amount: Amount in native currency (ETH, MATIC, BNB)
            private_key: Private key for signing
            gas_price_gwei: Optional gas price in Gwei (auto-estimated if None)
            nonce: Optional nonce (auto-fetched if None)
        
        Returns:
            Tuple of (tx_hash, transaction_details)
        """
        try:
            # Get Web3 provider
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                raise BlockchainError(f"Not connected to {network}")
            
            # Validate addresses
            if not w3.is_address(from_address) or not w3.is_address(to_address):
                raise ValidationError("Invalid Ethereum address")
            
            # Convert addresses to checksum format
            from_address = w3.to_checksum_address(from_address)
            to_address = w3.to_checksum_address(to_address)
            
            # Get nonce (transaction count)
            if nonce is None:
                nonce = w3.eth.get_transaction_count(from_address)
            
            # Get gas price
            if gas_price_gwei is None:
                # Auto-estimate with slight increase for faster confirmation
                base_gas_price = w3.eth.gas_price
                gas_price = int(base_gas_price * 1.1)  # 10% increase
            else:
                gas_price = w3.to_wei(gas_price_gwei, 'gwei')
            
            # Convert amount to Wei
            value_wei = w3.to_wei(Decimal(amount), 'ether')
            
            # Get chain ID
            chain_id = w3.eth.chain_id
            
            # Build transaction
            transaction = {
                'nonce': nonce,
                'to': to_address,
                'value': value_wei,
                'gas': self.gas_limits['transfer'],
                'gasPrice': gas_price,
                'chainId': chain_id
            }
            
            logger.info(f"🔨 Building transaction on {network}: {from_address} -> {to_address}")
            logger.info(f"   Amount: {amount} | Gas: {w3.from_wei(gas_price, 'gwei')} Gwei | Nonce: {nonce}")
            
            # Sign transaction
            signed_tx = w3.eth.account.sign_transaction(transaction, private_key)
            
            # Broadcast transaction (compatible with web3.py v5 and v6+)
            raw_tx = getattr(signed_tx, 'rawTransaction', None) or getattr(signed_tx, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"✅ Transaction broadcast: {tx_hash_hex}")
            
            # Transaction details for database
            tx_details = {
                'tx_hash': tx_hash_hex,
                'from_address': from_address,
                'to_address': to_address,
                'value': amount,
                'gas_price': str(w3.from_wei(gas_price, 'gwei')),
                'gas_limit': self.gas_limits['transfer'],
                'nonce': nonce,
                'chain_id': chain_id,
                'network': network
            }
            
            return tx_hash_hex, tx_details
            
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error signing {network} transaction: {e}")
            
            # Detectar erros específicos e retornar mensagens amigáveis em português
            if 'insufficient funds' in error_str.lower():
                # Mensagem detalhada sobre saldo insuficiente
                native_token = {
                    'polygon': 'MATIC',
                    'ethereum': 'ETH',
                    'bsc': 'BNB',
                    'base': 'ETH',
                    'avalanche': 'AVAX'
                }.get(network, 'moeda nativa')
                
                raise BlockchainError(
                    f"Saldo de {native_token} insuficiente para pagar a taxa de rede (gas). "
                    f"Reduza o valor da transação ou adicione mais {native_token} à sua carteira. "
                    f"Na rede {network.capitalize()}, recomendamos manter pelo menos 0.01 {native_token} para taxas."
                )
            elif 'nonce too low' in error_str.lower():
                raise BlockchainError(
                    "Existe uma transação pendente sendo processada. "
                    "Aguarde alguns minutos para a confirmação e tente novamente."
                )
            elif 'replacement transaction underpriced' in error_str.lower():
                raise BlockchainError(
                    "Taxa de gas muito baixa para substituir a transação pendente. "
                    "Aguarde a confirmação da transação anterior ou selecione uma taxa mais alta."
                )
            elif 'execution reverted' in error_str.lower():
                raise BlockchainError(
                    "A transação foi rejeitada pelo contrato. "
                    "Verifique se você tem saldo suficiente do token e tente novamente."
                )
            elif 'gas required exceeds' in error_str.lower():
                raise BlockchainError(
                    "O gas necessário excede o limite. "
                    "Tente reduzir o valor da transação."
                )
            else:
                raise BlockchainError(f"Falha ao processar transação: {error_str}")
    
    async def estimate_gas_price(self, network: str, speed: str = 'standard') -> Dict[str, float]:
        """
        Estimate gas prices for different confirmation speeds.
        
        Args:
            network: Network name
            speed: 'slow', 'standard', or 'fast'
        
        Returns:
            Dict with gas prices in Gwei
        """
        try:
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                raise BlockchainError(f"Not connected to {network}")
            
            # Get current gas price
            base_gas_price = w3.eth.gas_price
            base_gas_gwei = float(w3.from_wei(base_gas_price, 'gwei'))
            
            # Calculate different speed tiers
            gas_prices = {
                'slow': round(base_gas_gwei * 0.8, 2),      # 80% - slower but cheaper
                'standard': round(base_gas_gwei, 2),        # 100% - normal speed
                'fast': round(base_gas_gwei * 1.3, 2)       # 130% - faster but more expensive
            }
            
            # Calculate estimated costs in native currency
            gas_limit = self.gas_limits['transfer']
            costs = {
                'slow': {
                    'gas_price_gwei': gas_prices['slow'],
                    'estimated_cost': str(w3.from_wei(w3.to_wei(gas_prices['slow'], 'gwei') * gas_limit, 'ether')),
                    'estimated_time': '10-30 minutes'
                },
                'standard': {
                    'gas_price_gwei': gas_prices['standard'],
                    'estimated_cost': str(w3.from_wei(w3.to_wei(gas_prices['standard'], 'gwei') * gas_limit, 'ether')),
                    'estimated_time': '2-10 minutes'
                },
                'fast': {
                    'gas_price_gwei': gas_prices['fast'],
                    'estimated_cost': str(w3.from_wei(w3.to_wei(gas_prices['fast'], 'gwei') * gas_limit, 'ether')),
                    'estimated_time': '<2 minutes'
                }
            }
            
            return costs
            
        except Exception as e:
            logger.error(f"❌ Error estimating gas for {network}: {e}")
            raise BlockchainError(f"Failed to estimate gas: {str(e)}")
    
    async def get_transaction_status(
        self,
        network: str,
        tx_hash: str
    ) -> Dict:
        """
        Get transaction status and confirmations.
        
        Args:
            network: Network name
            tx_hash: Transaction hash
        
        Returns:
            Dict with transaction status
        """
        try:
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                raise BlockchainError(f"Not connected to {network}")
            
            # Get transaction receipt
            try:
                receipt = w3.eth.get_transaction_receipt(tx_hash)
                
                # Transaction is mined
                current_block = w3.eth.block_number
                confirmations = current_block - receipt['blockNumber']
                
                # Determine if transaction is final (enough confirmations)
                required_confirmations = 12 if network == 'ethereum' else 20
                is_final = confirmations >= required_confirmations
                
                status = {
                    'status': 'confirmed' if receipt['status'] == 1 else 'failed',
                    'confirmations': confirmations,
                    'block_number': receipt['blockNumber'],
                    'gas_used': receipt['gasUsed'],
                    'final': is_final
                }
                
            except Exception:
                # Transaction not mined yet
                status = {
                    'status': 'pending',
                    'confirmations': 0,
                    'block_number': None,
                    'gas_used': None,
                    'final': False
                }
            
            return status
            
        except Exception as e:
            logger.error(f"❌ Error getting transaction status: {e}")
            raise BlockchainError(f"Failed to get transaction status: {str(e)}")
    
    async def prepare_transaction_for_external_signing(
        self,
        network: str,
        from_address: str,
        to_address: str,
        amount: str,
        gas_price_gwei: Optional[float] = None
    ) -> Dict:
        """
        Prepare transaction data for external signing (MetaMask, WalletConnect).
        This is used in non-custodial mode where user signs with their own wallet.
        
        Returns:
            Dict with transaction parameters for frontend signing
        """
        try:
            w3 = self.providers.get(network)
            if not w3 or not w3.is_connected():
                raise BlockchainError(f"Not connected to {network}")
            
            # Validate addresses
            if not w3.is_address(to_address):
                raise ValidationError("Invalid recipient address")
            
            to_address = w3.to_checksum_address(to_address)
            
            # Get gas price
            if gas_price_gwei is None:
                gas_price = w3.eth.gas_price
            else:
                gas_price = w3.to_wei(gas_price_gwei, 'gwei')
            
            # Convert amount to Wei (hex format for MetaMask)
            value_wei = w3.to_wei(Decimal(amount), 'ether')
            
            # Prepare transaction object for MetaMask/WalletConnect
            transaction = {
                'from': from_address,
                'to': to_address,
                'value': hex(value_wei),
                'gas': hex(self.gas_limits['transfer']),
                'gasPrice': hex(gas_price),
                'chainId': hex(w3.eth.chain_id)
            }
            
            return {
                'transaction': transaction,
                'network': network,
                'chain_id': w3.eth.chain_id,
                'estimated_gas': self.gas_limits['transfer'],
                'gas_price_gwei': float(w3.from_wei(gas_price, 'gwei')),
                'message': 'Sign this transaction with your external wallet (MetaMask, Trust Wallet, etc.)'
            }
            
        except Exception as e:
            logger.error(f"❌ Error preparing transaction: {e}")
            raise BlockchainError(f"Failed to prepare transaction: {str(e)}")


# Singleton instance
blockchain_signer = BlockchainSigner()
