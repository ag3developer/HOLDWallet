"""
System Wallet Send Service
==========================

Servico para enviar crypto das carteiras do sistema.
Suporta multiplas redes blockchain.
"""

import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from web3 import Web3
from eth_account import Account

from app.services.crypto_service import CryptoService
from app.models.system_blockchain_wallet import (
    SystemBlockchainWallet,
    SystemBlockchainAddress,
    SystemWalletTransaction
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class SystemWalletSendService:
    """Servico para enviar crypto das carteiras do sistema."""
    
    # RPCs por rede
    RPC_URLS = {
        "ethereum": "https://eth-mainnet.g.alchemy.com/v2/demo",
        "polygon": "https://polygon.drpc.org",
        "bsc": "https://bsc-dataseed.binance.org",
        "base": "https://mainnet.base.org",
        "avalanche": "https://api.avax.network/ext/bc/C/rpc",
    }
    
    # Chain IDs
    CHAIN_IDS = {
        "ethereum": 1,
        "polygon": 137,
        "bsc": 56,
        "base": 8453,
        "avalanche": 43114,
    }
    
    # Contratos de tokens por rede
    TOKEN_CONTRACTS = {
        "polygon": {
            "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            "DAI": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
            "TRAY": "0x0000000000000000000000000000000000000000",  # Adicionar endereco real
        },
        "ethereum": {
            "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "DAI": "0x6B175474E89094C44Da98b954EescdeCB5Dc3Bef7",
        },
        "bsc": {
            "USDT": "0x55d398326f99059fF775485246999027B3197955",
            "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        },
        "base": {
            "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        },
        "avalanche": {
            "USDT": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
            "USDC": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        },
    }
    
    # Explorers
    EXPLORERS = {
        "ethereum": "https://etherscan.io/tx/",
        "polygon": "https://polygonscan.com/tx/",
        "bsc": "https://bscscan.com/tx/",
        "base": "https://basescan.org/tx/",
        "avalanche": "https://snowtrace.io/tx/",
        "bitcoin": "https://blockstream.info/tx/",
        "tron": "https://tronscan.org/#/transaction/",
        "solana": "https://explorer.solana.com/tx/",
    }
    
    # ERC20 ABI minimo para transfer
    ERC20_ABI = [
        {
            "constant": False,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
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
        }
    ]
    
    def __init__(self):
        self.crypto_service = CryptoService()
    
    async def send_from_system_wallet(
        self,
        db: Session,
        wallet_name: str,
        network: str,
        to_address: str,
        amount: Decimal,
        token: str,
        admin_user_id: str,
        memo: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envia crypto da carteira do sistema para endereco externo.
        
        Args:
            db: Sessao do banco de dados
            wallet_name: Nome da carteira (ex: "main_fees_wallet")
            network: Rede blockchain (ex: "polygon")
            to_address: Endereco de destino
            amount: Valor a enviar
            token: "native" ou nome do token (USDT, USDC, etc.)
            admin_user_id: ID do admin que esta fazendo a operacao
            memo: Nota opcional
            
        Returns:
            Dict com resultado da operacao
        """
        try:
            logger.info(f"[SystemWalletSend] Iniciando envio...")
            logger.info(f"  Wallet: {wallet_name}")
            logger.info(f"  Network: {network}")
            logger.info(f"  To: {to_address}")
            logger.info(f"  Amount: {amount}")
            logger.info(f"  Token: {token}")
            
            # 1. Buscar carteira do sistema
            wallet = db.query(SystemBlockchainWallet).filter(
                SystemBlockchainWallet.name == wallet_name,
                SystemBlockchainWallet.is_active == True
            ).first()
            
            if not wallet:
                return {
                    "success": False,
                    "error": "WALLET_NOT_FOUND",
                    "error_code": "WALLET_NOT_FOUND",
                    "message": f"Carteira '{wallet_name}' nao encontrada ou inativa"
                }
            
            # 2. Verificar se carteira esta bloqueada
            if wallet.is_locked:
                return {
                    "success": False,
                    "error": "WALLET_LOCKED",
                    "error_code": "WALLET_LOCKED",
                    "message": "Carteira esta bloqueada para saques"
                }
            
            # 3. Buscar endereco da rede
            address_obj = db.query(SystemBlockchainAddress).filter(
                SystemBlockchainAddress.wallet_id == wallet.id,
                SystemBlockchainAddress.network == network.lower(),
                SystemBlockchainAddress.is_active == True
            ).first()
            
            if not address_obj:
                return {
                    "success": False,
                    "error": "ADDRESS_NOT_FOUND",
                    "error_code": "ADDRESS_NOT_FOUND",
                    "message": f"Endereco nao encontrado para rede: {network}"
                }
            
            from_address = str(address_obj.address)
            logger.info(f"  From: {from_address}")
            
            # 4. Obter private key
            if not address_obj.encrypted_private_key:
                return {
                    "success": False,
                    "error": "NO_PRIVATE_KEY",
                    "error_code": "NO_PRIVATE_KEY",
                    "message": "Private key nao encontrada para este endereco"
                }
            
            try:
                private_key = self.crypto_service.decrypt_data(address_obj.encrypted_private_key)
                if not private_key.startswith("0x"):
                    private_key = f"0x{private_key}"
            except Exception as e:
                logger.error(f"Erro ao descriptografar private key: {e}")
                return {
                    "success": False,
                    "error": "DECRYPT_ERROR",
                    "error_code": "DECRYPT_ERROR",
                    "message": "Erro ao descriptografar private key"
                }
            
            # 5. Executar envio baseado na rede
            result = None
            
            if network.lower() in ['ethereum', 'polygon', 'bsc', 'base', 'avalanche']:
                # Redes EVM
                if token == 'native':
                    result = await self._send_evm_native(
                        network=network,
                        from_address=from_address,
                        private_key=private_key,
                        to_address=to_address,
                        amount=amount
                    )
                else:
                    result = await self._send_evm_token(
                        network=network,
                        from_address=from_address,
                        private_key=private_key,
                        to_address=to_address,
                        amount=amount,
                        token=token
                    )
            
            elif network.lower() == 'bitcoin':
                result = await self._send_bitcoin(
                    from_address=from_address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount
                )
            
            elif network.lower() == 'tron':
                if token == 'native':
                    result = await self._send_tron_native(
                        from_address=from_address,
                        private_key=private_key,
                        to_address=to_address,
                        amount=amount
                    )
                else:
                    result = await self._send_tron_token(
                        from_address=from_address,
                        private_key=private_key,
                        to_address=to_address,
                        amount=amount,
                        token=token
                    )
            
            elif network.lower() == 'solana':
                result = await self._send_solana(
                    from_address=from_address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount
                )
            
            elif network.lower() == 'litecoin':
                result = await self._send_litecoin(
                    from_address=from_address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount
                )
            
            elif network.lower() == 'dogecoin':
                result = await self._send_dogecoin(
                    from_address=from_address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount
                )
            
            else:
                return {
                    "success": False,
                    "error": "UNSUPPORTED_NETWORK",
                    "error_code": "UNSUPPORTED_NETWORK",
                    "message": f"Rede '{network}' ainda nao suportada para envio"
                }
            
            # 6. Registrar transacao no historico
            if result and result.get("success"):
                try:
                    tx_record = SystemWalletTransaction(
                        address_id=address_obj.id,
                        tx_hash=result.get("tx_hash"),
                        direction="out",
                        amount=float(amount),
                        cryptocurrency=token if token != 'native' else address_obj.cryptocurrency,
                        network=network,
                        from_address=from_address,
                        to_address=to_address,
                        reference_type="withdrawal",
                        reference_id=admin_user_id,
                        status="pending",
                        notes=memo,
                        created_at=datetime.utcnow()
                    )
                    db.add(tx_record)
                    db.commit()
                    logger.info(f"  Transacao registrada: {tx_record.id}")
                except Exception as e:
                    logger.error(f"Erro ao registrar transacao: {e}")
                    # Nao falha a operacao, apenas loga
            
            # 7. Adicionar info extra ao resultado
            if result:
                result["from_address"] = from_address
                result["to_address"] = to_address
                result["amount"] = str(amount)
                result["token"] = token
                result["network"] = network
                result["wallet_name"] = wallet_name
            
            return result or {
                "success": False,
                "error": "UNKNOWN_ERROR",
                "message": "Erro desconhecido ao enviar transacao"
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar da carteira do sistema: {e}", exc_info=True)
            return {
                "success": False,
                "error": "INTERNAL_ERROR",
                "error_code": "INTERNAL_ERROR",
                "message": str(e)
            }
    
    async def _send_evm_native(
        self,
        network: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia token nativo em redes EVM (ETH, MATIC, BNB, etc.)"""
        try:
            rpc_url = self._get_rpc_url(network)
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            if not w3.is_connected():
                return {
                    "success": False,
                    "error": "RPC_CONNECTION_FAILED",
                    "message": f"Nao foi possivel conectar ao RPC de {network}"
                }
            
            # Verificar saldo
            balance_wei = w3.eth.get_balance(Web3.to_checksum_address(from_address))
            balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
            
            logger.info(f"  Saldo disponivel: {balance}")
            
            # Estimar gas
            gas_price = w3.eth.gas_price
            gas_limit = 21000  # Transfer simples
            gas_cost_wei = gas_price * gas_limit
            gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
            
            # Verificar se tem saldo suficiente (valor + gas)
            total_needed = amount + gas_cost
            if balance < total_needed:
                return {
                    "success": False,
                    "error": "INSUFFICIENT_BALANCE",
                    "message": f"Saldo insuficiente. Disponivel: {balance}, Necessario: {total_needed} (incluindo gas: {gas_cost})"
                }
            
            # Construir transacao
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(from_address))
            
            tx = {
                'nonce': nonce,
                'to': Web3.to_checksum_address(to_address),
                'value': w3.to_wei(amount, 'ether'),
                'gas': gas_limit,
                'gasPrice': gas_price,
                'chainId': self.CHAIN_IDS.get(network, 1)
            }
            
            # Assinar
            signed_tx = w3.eth.account.sign_transaction(tx, private_key)
            
            # Enviar
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"  TX Hash: {tx_hash_hex}")
            
            return {
                "success": True,
                "tx_hash": tx_hash_hex,
                "status": "pending",
                "explorer_url": f"{self.EXPLORERS.get(network, '')}{tx_hash_hex}",
                "gas_used": str(gas_limit),
                "gas_price": str(w3.from_wei(gas_price, 'gwei')) + " gwei"
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar EVM native: {e}", exc_info=True)
            return {
                "success": False,
                "error": "TRANSACTION_FAILED",
                "message": str(e)
            }
    
    async def _send_evm_token(
        self,
        network: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        token: str
    ) -> Dict[str, Any]:
        """Envia token ERC-20 em redes EVM (USDT, USDC, etc.)"""
        try:
            rpc_url = self._get_rpc_url(network)
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            if not w3.is_connected():
                return {
                    "success": False,
                    "error": "RPC_CONNECTION_FAILED",
                    "message": f"Nao foi possivel conectar ao RPC de {network}"
                }
            
            # Obter endereco do contrato do token
            contract_address = self.TOKEN_CONTRACTS.get(network, {}).get(token.upper())
            if not contract_address:
                return {
                    "success": False,
                    "error": "TOKEN_NOT_SUPPORTED",
                    "message": f"Token {token} nao suportado na rede {network}"
                }
            
            # Criar instancia do contrato
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.ERC20_ABI
            )
            
            # Obter decimals do token
            try:
                decimals = contract.functions.decimals().call()
            except Exception:
                decimals = 6 if token.upper() in ['USDT', 'USDC'] else 18
            
            # Verificar saldo do token
            token_balance_raw = contract.functions.balanceOf(
                Web3.to_checksum_address(from_address)
            ).call()
            token_balance = Decimal(str(token_balance_raw)) / Decimal(10 ** decimals)
            
            logger.info(f"  Saldo {token}: {token_balance}")
            
            if token_balance < amount:
                return {
                    "success": False,
                    "error": "INSUFFICIENT_TOKEN_BALANCE",
                    "message": f"Saldo de {token} insuficiente. Disponivel: {token_balance}, Necessario: {amount}"
                }
            
            # Verificar saldo nativo para gas
            native_balance_wei = w3.eth.get_balance(Web3.to_checksum_address(from_address))
            native_balance = Decimal(str(w3.from_wei(native_balance_wei, 'ether')))
            
            # Estimar gas para transfer de token
            gas_price = w3.eth.gas_price
            gas_limit = 100000  # Token transfer precisa de mais gas
            gas_cost_wei = gas_price * gas_limit
            gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
            
            if native_balance < gas_cost:
                symbol = self._get_native_symbol(network)
                return {
                    "success": False,
                    "error": "INSUFFICIENT_GAS",
                    "message": f"Saldo de {symbol} insuficiente para gas. Disponivel: {native_balance}, Necessario: {gas_cost}"
                }
            
            # Converter amount para wei do token
            amount_raw = int(amount * Decimal(10 ** decimals))
            
            # Construir transacao
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(from_address))
            
            tx = contract.functions.transfer(
                Web3.to_checksum_address(to_address),
                amount_raw
            ).build_transaction({
                'from': Web3.to_checksum_address(from_address),
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'chainId': self.CHAIN_IDS.get(network, 1)
            })
            
            # Assinar
            signed_tx = w3.eth.account.sign_transaction(tx, private_key)
            
            # Enviar
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"  TX Hash: {tx_hash_hex}")
            
            return {
                "success": True,
                "tx_hash": tx_hash_hex,
                "status": "pending",
                "explorer_url": f"{self.EXPLORERS.get(network, '')}{tx_hash_hex}",
                "gas_used": str(gas_limit),
                "gas_price": str(w3.from_wei(gas_price, 'gwei')) + " gwei"
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar EVM token: {e}", exc_info=True)
            return {
                "success": False,
                "error": "TRANSACTION_FAILED",
                "message": str(e)
            }
    
    async def _send_bitcoin(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia Bitcoin."""
        try:
            from app.services.btc_service import btc_service
            
            # Converter private key hex para WIF
            try:
                from bitcoinlib.keys import Key
                pk_clean = private_key.replace("0x", "")
                key = Key(import_key=pk_clean, network='bitcoin')
                private_key_wif = key.wif()
            except Exception as e:
                logger.error(f"Erro ao converter key para WIF: {e}")
                return {
                    "success": False,
                    "error": "KEY_CONVERSION_ERROR",
                    "message": "Erro ao processar chave Bitcoin"
                }
            
            result = await btc_service.send_btc(
                from_address=from_address,
                to_address=to_address,
                amount_btc=float(amount),
                private_key_wif=private_key_wif,
                fee_level='hour'
            )
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"{self.EXPLORERS.get('bitcoin', '')}{result.tx_hash}",
                    "gas_used": str(result.fee_paid) if result.fee_paid else None
                }
            else:
                return {
                    "success": False,
                    "error": "BTC_SEND_FAILED",
                    "message": result.error or "Erro ao enviar Bitcoin"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar Bitcoin: {e}", exc_info=True)
            return {
                "success": False,
                "error": "BTC_ERROR",
                "message": str(e)
            }
    
    async def _send_tron_native(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia TRX nativo."""
        try:
            from app.services.tron_service import tron_service
            
            pk_clean = private_key.replace("0x", "")
            
            result = await tron_service.send_trx(
                from_address=from_address,
                to_address=to_address,
                amount_trx=float(amount),
                private_key_hex=pk_clean
            )
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"{self.EXPLORERS.get('tron', '')}{result.tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "TRX_SEND_FAILED",
                    "message": result.error or "Erro ao enviar TRX"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar TRX: {e}", exc_info=True)
            return {
                "success": False,
                "error": "TRX_ERROR",
                "message": str(e)
            }
    
    async def _send_tron_token(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        token: str
    ) -> Dict[str, Any]:
        """Envia token TRC-20 (USDT, etc.)"""
        try:
            from app.services.tron_service import tron_service
            
            pk_clean = private_key.replace("0x", "")
            
            if token.upper() == 'USDT':
                result = await tron_service.send_trc20(
                    from_address=from_address,
                    to_address=to_address,
                    amount=float(amount),
                    private_key_hex=pk_clean
                )
            else:
                return {
                    "success": False,
                    "error": "TOKEN_NOT_SUPPORTED",
                    "message": f"Token {token} nao suportado na Tron"
                }
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"{self.EXPLORERS.get('tron', '')}{result.tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "TRC20_SEND_FAILED",
                    "message": result.error or f"Erro ao enviar {token} TRC-20"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar TRC-20: {e}", exc_info=True)
            return {
                "success": False,
                "error": "TRC20_ERROR",
                "message": str(e)
            }
    
    async def _send_solana(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia SOL."""
        try:
            from app.services.sol_service import SOLService
            import base58
            
            sol_service = SOLService()
            
            # Converter hex para base58 se necessario
            pk_clean = private_key.replace("0x", "")
            try:
                pk_bytes = bytes.fromhex(pk_clean)
                private_key_b58 = base58.b58encode(pk_bytes).decode()
            except Exception:
                private_key_b58 = pk_clean
            
            result = await sol_service.send_sol(
                from_address=from_address,
                to_address=to_address,
                amount_sol=float(amount),
                private_key_base58=private_key_b58
            )
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"{self.EXPLORERS.get('solana', '')}{result.tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "SOL_SEND_FAILED",
                    "message": result.error or "Erro ao enviar SOL"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar SOL: {e}", exc_info=True)
            return {
                "success": False,
                "error": "SOL_ERROR",
                "message": str(e)
            }
    
    async def _send_litecoin(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia Litecoin."""
        try:
            from app.services.ltc_doge_service import ltc_service
            
            # Converter para WIF
            pk_clean = private_key.replace("0x", "")
            try:
                from bitcoinlib.keys import Key
                key = Key(import_key=pk_clean, network='litecoin')
                private_key_wif = key.wif()
            except Exception as e:
                logger.error(f"Erro ao converter key para WIF: {e}")
                return {
                    "success": False,
                    "error": "KEY_CONVERSION_ERROR",
                    "message": "Erro ao processar chave Litecoin"
                }
            
            result = await ltc_service.send_ltc(
                from_address=from_address,
                to_address=to_address,
                amount_ltc=float(amount),
                private_key_wif=private_key_wif
            )
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"https://blockchair.com/litecoin/transaction/{result.tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "LTC_SEND_FAILED",
                    "message": result.error or "Erro ao enviar LTC"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar LTC: {e}", exc_info=True)
            return {
                "success": False,
                "error": "LTC_ERROR",
                "message": str(e)
            }
    
    async def _send_dogecoin(
        self,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Envia Dogecoin."""
        try:
            from app.services.ltc_doge_service import doge_service
            
            # Converter para WIF
            pk_clean = private_key.replace("0x", "")
            try:
                from bitcoinlib.keys import Key
                key = Key(import_key=pk_clean, network='dogecoin')
                private_key_wif = key.wif()
            except Exception as e:
                logger.error(f"Erro ao converter key para WIF: {e}")
                return {
                    "success": False,
                    "error": "KEY_CONVERSION_ERROR",
                    "message": "Erro ao processar chave Dogecoin"
                }
            
            result = await doge_service.send_doge(
                from_address=from_address,
                to_address=to_address,
                amount_doge=float(amount),
                private_key_wif=private_key_wif
            )
            
            if result.success:
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "status": "pending",
                    "explorer_url": f"https://dogechain.info/tx/{result.tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "DOGE_SEND_FAILED",
                    "message": result.error or "Erro ao enviar DOGE"
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar DOGE: {e}", exc_info=True)
            return {
                "success": False,
                "error": "DOGE_ERROR",
                "message": str(e)
            }
    
    def _get_rpc_url(self, network: str) -> str:
        """Retorna RPC URL para a rede."""
        # Tentar usar RPC do settings primeiro
        rpc_map = {
            "polygon": getattr(settings, 'POLYGON_RPC_URL', None),
            "ethereum": getattr(settings, 'ETHEREUM_RPC_URL', None),
            "bsc": getattr(settings, 'BSC_RPC_URL', None),
            "base": getattr(settings, 'BASE_RPC_URL', None),
            "avalanche": getattr(settings, 'AVALANCHE_RPC_URL', None),
        }
        
        custom_rpc = rpc_map.get(network.lower())
        if custom_rpc:
            return custom_rpc
        
        return self.RPC_URLS.get(network.lower(), self.RPC_URLS["ethereum"])
    
    def _get_native_symbol(self, network: str) -> str:
        """Retorna simbolo da moeda nativa."""
        symbols = {
            "ethereum": "ETH",
            "polygon": "MATIC",
            "bsc": "BNB",
            "base": "ETH",
            "avalanche": "AVAX",
        }
        return symbols.get(network.lower(), "ETH")


# Instancia singleton
system_wallet_send_service = SystemWalletSendService()
