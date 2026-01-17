"""
🚀 HOLD Wallet - Blockchain Deposit Service
==========================================

Serviço para depositar criptomoedas nas wallets dos usuários após confirmação de pagamento.
Suporta múltiplas redes: Ethereum, Polygon, Base, Bitcoin, etc.

Author: HOLD Wallet Team
"""

import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from datetime import datetime
from web3 import Web3
from eth_account import Account
from sqlalchemy.orm import Session

from app.models.wallet import Wallet
from app.models.address import Address
from app.models.instant_trade import InstantTrade, TradeStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cryptos que NÃO são EVM (requerem tratamento especial)
NON_EVM_CRYPTOS = ['BTC', 'LTC', 'DOGE', 'XRP', 'XLM', 'ADA', 'SOL', 'AVAX', 'DOT']


class BlockchainDepositService:
    """Serviço para depositar crypto nas wallets dos usuários"""
    
    # Configuração de redes
    NETWORK_CONFIG = {
        "ethereum": {
            "rpc_url": settings.ETHEREUM_RPC_URL,
            "chain_id": 1,
            "gas_limit": 21000,
            "contracts": {
                "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            }
        },
        "polygon": {
            "rpc_url": settings.POLYGON_RPC_URL,
            "chain_id": 137,
            "gas_limit": 21000,
            "contracts": {
                "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                "USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                "TRAY": "0x6b62514E925099643abA13B322A62ff6298f8E8A",  # Trayon Token
                "MATIC": None,  # Native token
            }
        },
        "base": {
            "rpc_url": settings.BASE_RPC_URL,
            "chain_id": 8453,
            "gas_limit": 21000,
            "contracts": {
                "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            }
        }
    }
    
    # ABI mínima para ERC20
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
        """Inicializa o serviço"""
        self.platform_wallet_private_key = settings.PLATFORM_WALLET_PRIVATE_KEY
        if not self.platform_wallet_private_key:
            logger.error("❌ PLATFORM_WALLET_PRIVATE_KEY não configurada!")
    
    def get_web3(self, network: str) -> Optional[Web3]:
        """Retorna instância Web3 para a rede especificada"""
        try:
            config = self.NETWORK_CONFIG.get(network.lower())
            if not config:
                logger.error(f"❌ Rede não suportada: {network}")
                return None
            
            w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
            if not w3.is_connected():
                logger.error(f"❌ Não conectou à rede {network}")
                return None
            
            logger.info(f"✅ Conectado à rede {network}")
            return w3
        except Exception as e:
            logger.error(f"❌ Erro conectando à rede {network}: {str(e)}")
            return None
    
    def get_user_wallet(self, db: Session, user_id: str, network: str) -> Optional[Address]:
        """Busca o endereço da wallet do usuário para a rede especificada"""
        try:
            from sqlalchemy import func
            
            # Busca o endereço diretamente na tabela addresses
            # Faz join com wallets para garantir que pertence ao usuário e está ativa
            # Usa LOWER() para busca case-insensitive
            address = db.query(Address).join(
                Wallet, Address.wallet_id == Wallet.id
            ).filter(
                Wallet.user_id == user_id,
                Wallet.is_active == True,
                func.lower(Address.network) == network.lower(),
                Address.is_active == True
            ).first()
            
            if address:
                logger.info(f"✅ Endereço encontrado para user={user_id}, network={network}: {address.address}")
                return address
            
            # Se não encontrou na rede específica, tenta buscar em qualquer rede EVM
            # Redes EVM compartilham o mesmo endereço (MultiWallet)
            evm_networks = ['ethereum', 'polygon', 'base', 'bsc', 'arbitrum', 'optimism', 'multi']
            if network.lower() in evm_networks:
                logger.info(f"⚠️ Endereço não encontrado para {network}, buscando em outras redes EVM/MULTI...")
                
                address = db.query(Address).join(
                    Wallet, Address.wallet_id == Wallet.id
                ).filter(
                    Wallet.user_id == user_id,
                    Wallet.is_active == True,
                    func.lower(Address.network).in_(evm_networks),
                    Address.is_active == True
                ).first()
                
                if address:
                    logger.info(f"✅ Endereço EVM encontrado (rede {address.network}): {address.address}")
                    return address
            
            logger.warning(f"⚠️ Nenhum endereço encontrado para user={user_id}, network={network}")
            return None
        except Exception as e:
            logger.error(f"❌ Erro buscando endereço: {str(e)}")
            return None
    
    def send_native_token(
        self,
        w3: Web3,
        to_address: str,
        amount: Decimal,
        network: str
    ) -> Optional[str]:
        """
        Envia token nativo (ETH, MATIC, etc) para o endereço do usuário
        
        Returns:
            tx_hash se sucesso, None se erro
        """
        try:
            # Verificar se private key está configurada
            if not self.platform_wallet_private_key:
                logger.error("❌ PLATFORM_WALLET_PRIVATE_KEY não configurada no .env!")
                return None
            
            config = self.NETWORK_CONFIG[network.lower()]
            account = Account.from_key(self.platform_wallet_private_key)
            
            # Converte amount para Wei
            amount_wei = w3.to_wei(float(amount), 'ether')
            
            # Busca nonce
            nonce = w3.eth.get_transaction_count(account.address)
            
            # Busca gas price
            gas_price = w3.eth.gas_price
            
            # Cria transação
            transaction = {
                'nonce': nonce,
                'to': Web3.to_checksum_address(to_address),
                'value': amount_wei,
                'gas': config["gas_limit"],
                'gasPrice': gas_price,
                'chainId': config["chain_id"]
            }
            
            # Assina transação
            signed_txn = w3.eth.account.sign_transaction(transaction, self.platform_wallet_private_key)
            
            # Envia transação (compatível com diferentes versões do web3.py)
            raw_tx = getattr(signed_txn, 'rawTransaction', None) or getattr(signed_txn, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = w3.to_hex(tx_hash)
            
            logger.info(f"✅ Token nativo enviado! TX: {tx_hash_hex}")
            return tx_hash_hex
            
        except Exception as e:
            logger.error(f"❌ Erro enviando token nativo: {str(e)}")
            return None
    
    def send_erc20_token(
        self,
        w3: Web3,
        contract_address: str,
        to_address: str,
        amount: Decimal,
        network: str
    ) -> tuple:
        """
        Envia token ERC20 (USDT, USDC, etc) para o endereço do usuário
        
        Returns:
            tuple: (tx_hash, error_message) - tx_hash se sucesso, error_message se erro
        """
        try:
            # Verificar se private key está configurada
            if not self.platform_wallet_private_key:
                error_msg = "PLATFORM_WALLET_PRIVATE_KEY não configurada no .env! Acesse /admin/system-wallet e exporte a private key."
                logger.error(f"❌ {error_msg}")
                return (None, error_msg)
            
            config = self.NETWORK_CONFIG[network.lower()]
            account = Account.from_key(self.platform_wallet_private_key)
            
            # Verificar saldo de gas (MATIC para Polygon, ETH para Ethereum, etc.)
            gas_balance = w3.eth.get_balance(account.address)
            gas_balance_native = w3.from_wei(gas_balance, 'ether')
            logger.info(f"💰 Saldo gas da plataforma: {gas_balance_native} ({network})")
            
            if gas_balance < w3.to_wei(0.001, 'ether'):  # Mínimo 0.001 para gas
                error_msg = f"Saldo insuficiente para gas! Saldo: {gas_balance_native} - Envie MATIC para a System Wallet"
                logger.error(f"❌ {error_msg}")
                return (None, error_msg)
            
            # Cria instância do contrato
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.ERC20_ABI
            )
            
            # Busca decimais do token
            decimals = contract.functions.decimals().call()
            
            # Converte amount considerando decimals
            amount_units = int(float(amount) * (10 ** decimals))
            
            # Verificar saldo do token
            token_balance = contract.functions.balanceOf(account.address).call()
            token_balance_decimal = Decimal(str(token_balance)) / Decimal(str(10 ** decimals))
            logger.info(f"💰 Saldo token da plataforma: {token_balance_decimal} USDT ({network})")
            
            if token_balance < amount_units:
                error_msg = f"Saldo USDT insuficiente! Necessário: {amount}, Disponível: {token_balance_decimal}"
                logger.error(f"❌ {error_msg}")
                return (None, error_msg)
            
            # Busca nonce
            nonce = w3.eth.get_transaction_count(account.address)
            
            # Busca gas price
            gas_price = w3.eth.gas_price
            
            # Cria transação de transfer
            transaction = contract.functions.transfer(
                Web3.to_checksum_address(to_address),
                amount_units
            ).build_transaction({
                'nonce': nonce,
                'gas': 100000,  # Gas limit maior para ERC20
                'gasPrice': gas_price,
                'chainId': config["chain_id"]
            })
            
            # Assina transação
            signed_txn = w3.eth.account.sign_transaction(transaction, self.platform_wallet_private_key)
            
            # Envia transação (compatível com diferentes versões do web3.py)
            raw_tx = getattr(signed_txn, 'rawTransaction', None) or getattr(signed_txn, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = w3.to_hex(tx_hash)
            
            logger.info(f"✅ Token ERC20 enviado! TX: {tx_hash_hex}")
            return (tx_hash_hex, None)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Erro enviando token ERC20: {error_msg}")
            
            # Mensagens de erro mais amigáveis
            if "insufficient funds" in error_msg.lower():
                error_msg = "Saldo insuficiente para gas (MATIC). Deposite MATIC na System Wallet."
            elif "execution reverted" in error_msg.lower():
                error_msg = "Transação revertida. Verifique o saldo de USDT na System Wallet."
            elif "nonce too low" in error_msg.lower():
                error_msg = "Erro de nonce. Tente novamente em alguns segundos."
            
            return (None, error_msg)
    
    def deposit_crypto_to_user(
        self,
        db: Session,
        trade: InstantTrade,
        network: str = "polygon"
    ) -> Dict[str, Any]:
        """
        Deposita criptomoeda na wallet do usuário após confirmação de pagamento
        
        Args:
            db: Sessão do banco
            trade: InstantTrade com pagamento confirmado
            network: Rede blockchain (ethereum, polygon, base)
        
        Returns:
            {
                "success": bool,
                "tx_hash": str ou None,
                "wallet_address": str ou None,
                "network": str,
                "error": str ou None
            }
        """
        try:
            logger.info(f"🚀 Iniciando depósito para trade {trade.reference_code}")
            
            # 1. Valida status do trade
            if trade.status != TradeStatus.PAYMENT_CONFIRMED:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": None,
                    "network": network,
                    "error": f"Trade não está com pagamento confirmado (status: {trade.status})"
                }
            
            # 2. Busca endereço do usuário
            user_address = self.get_user_wallet(db, trade.user_id, network)
            if not user_address:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": None,
                    "network": network,
                    "error": f"Wallet não encontrada para network={network}"
                }
            
            # 3. Conecta na rede
            w3 = self.get_web3(network)
            if not w3:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": str(user_address.address),
                    "network": network,
                    "error": f"Não foi possível conectar à rede {network}"
                }
            
            # 4. Determina se é token nativo ou ERC20
            config = self.NETWORK_CONFIG[network.lower()]
            contract_address = config["contracts"].get(trade.symbol.upper())
            
            # 5. Envia a transação
            tx_hash = None
            error_msg = None
            
            if contract_address is None:
                # Token nativo (ETH, MATIC)
                logger.info(f"📤 Enviando {trade.crypto_amount} {trade.symbol} (nativo) para {user_address.address}")
                tx_hash = self.send_native_token(
                    w3=w3,
                    to_address=str(user_address.address),
                    amount=Decimal(str(trade.crypto_amount)),
                    network=network
                )
                if not tx_hash:
                    error_msg = "Falha ao enviar token nativo. Verifique o saldo de gas."
            else:
                # Token ERC20 (USDT, USDC)
                logger.info(f"📤 Enviando {trade.crypto_amount} {trade.symbol} (ERC20) para {user_address.address}")
                tx_hash, error_msg = self.send_erc20_token(
                    w3=w3,
                    contract_address=contract_address,
                    to_address=str(user_address.address),
                    amount=Decimal(str(trade.crypto_amount)),
                    network=network
                )
            
            if not tx_hash:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": str(user_address.address),
                    "network": network,
                    "error": error_msg or "Falha ao enviar transação blockchain"
                }
            
            # 6. Atualiza o trade com os dados blockchain
            trade.wallet_id = str(user_address.wallet_id)
            trade.wallet_address = str(user_address.address)
            trade.network = network
            trade.tx_hash = str(tx_hash)
            trade.status = TradeStatus.COMPLETED
            trade.completed_at = datetime.now()
            
            db.commit()
            db.refresh(trade)
            
            logger.info(f"✅ Depósito concluído! TX: {tx_hash}")
            
            return {
                "success": True,
                "tx_hash": str(tx_hash),
                "wallet_address": str(user_address.address),
                "network": network,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no depósito: {str(e)}")
            db.rollback()
            return {
                "success": False,
                "tx_hash": None,
                "wallet_address": None,
                "network": network,
                "error": str(e)
            }
    
    def check_platform_balance(self, network: str, symbol: str) -> Optional[Decimal]:
        """
        Verifica saldo da plataforma para garantir que há crypto suficiente
        
        Returns:
            Saldo em Decimal ou None se erro
        """
        try:
            w3 = self.get_web3(network)
            if not w3:
                return None
            
            account = Account.from_key(self.platform_wallet_private_key)
            config = self.NETWORK_CONFIG[network.lower()]
            contract_address = config["contracts"].get(symbol.upper())
            
            if contract_address is None:
                # Token nativo
                balance_wei = w3.eth.get_balance(account.address)
                balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
            else:
                # Token ERC20
                contract = w3.eth.contract(
                    address=Web3.to_checksum_address(contract_address),
                    abi=self.ERC20_ABI
                )
                decimals = contract.functions.decimals().call()
                balance_units = contract.functions.balanceOf(account.address).call()
                balance = Decimal(str(balance_units)) / Decimal(str(10 ** decimals))
            
            logger.info(f"💰 Saldo plataforma: {balance} {symbol} ({network})")
            return balance
            
        except Exception as e:
            logger.error(f"❌ Erro verificando saldo: {str(e)}")
            return None
    
    # ============================================
    # BITCOIN - Envio automático
    # ============================================
    
    async def send_btc_to_user(
        self,
        db: Session,
        trade: InstantTrade,
    ) -> Dict[str, Any]:
        """
        Envia Bitcoin para o usuário após confirmação de pagamento.
        Usa APIs gratuitas (Blockstream, Mempool.space).
        
        Obtém credenciais BTC de:
        1. Carteira do sistema (banco de dados) - preferencial
        2. Variáveis de ambiente (.env) - fallback
        
        Args:
            db: Sessão do banco
            trade: InstantTrade com pagamento confirmado
            
        Returns:
            Dict com resultado da transação
        """
        try:
            from app.services.btc_service import btc_service
            
            logger.info(f"🔶 Iniciando envio BTC para trade {trade.reference_code}")
            
            # 1. Obter credenciais da plataforma (banco ou .env)
            btc_credentials = self.get_platform_btc_credentials(db)
            if not btc_credentials:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": None,
                    "network": "bitcoin",
                    "error": "Carteira BTC da plataforma não configurada. Configure no banco ou .env"
                }
            
            platform_address = btc_credentials['address']
            platform_wif = btc_credentials['private_key_wif']
            
            # 2. Buscar endereço BTC do usuário
            user_address = self.get_user_wallet(db, str(trade.user_id), 'bitcoin')
            if not user_address:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": None,
                    "network": "bitcoin",
                    "error": "Endereço Bitcoin do usuário não encontrado"
                }
            
            # 3. Validar endereço do usuário
            if not btc_service.validate_address(str(user_address.address)):
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": str(user_address.address),
                    "network": "bitcoin",
                    "error": f"Endereço Bitcoin inválido: {user_address.address}"
                }
            
            # 4. Enviar BTC usando o btc_service diretamente
            result = await btc_service.send_btc(
                from_address=platform_address,
                to_address=str(user_address.address),
                amount_btc=float(trade.crypto_amount),
                private_key_wif=platform_wif,
                fee_level='hour'  # Fee moderado (~1 hora)
            )
            
            if result.success:
                # 4. Atualizar trade
                trade.wallet_id = str(user_address.wallet_id)
                trade.wallet_address = str(user_address.address)
                trade.network = "bitcoin"
                trade.tx_hash = result.tx_hash
                trade.status = TradeStatus.COMPLETED
                trade.completed_at = datetime.now()
                
                db.commit()
                db.refresh(trade)
                
                logger.info(f"✅ BTC enviado! TX: {result.tx_hash}")
                
                return {
                    "success": True,
                    "tx_hash": result.tx_hash,
                    "wallet_address": str(user_address.address),
                    "network": "bitcoin",
                    "explorer_url": result.explorer_url,
                    "fee_paid_satoshis": result.fee_paid,
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "tx_hash": None,
                    "wallet_address": str(user_address.address),
                    "network": "bitcoin",
                    "error": result.error
                }
                
        except Exception as e:
            logger.error(f"❌ Erro enviando BTC: {str(e)}")
            db.rollback()
            return {
                "success": False,
                "tx_hash": None,
                "wallet_address": None,
                "network": "bitcoin",
                "error": str(e)
            }
    
    def is_btc_auto_enabled(self, db: Session = None) -> bool:
        """
        Verifica se o envio automático de BTC está configurado.
        
        Primeiro verifica se há chaves no banco (system wallet),
        depois verifica no .env como fallback.
        """
        # Opção 1: Verificar no banco de dados (carteira do sistema)
        if db:
            try:
                from app.services.system_blockchain_wallet_service import system_wallet_service
                btc_data = system_wallet_service.get_private_key_for_sending(db, 'bitcoin')
                if btc_data and btc_data.get('private_key_wif'):
                    return True
            except Exception as e:
                logger.warning(f"⚠️ Erro verificando BTC no banco: {e}")
        
        # Opção 2: Fallback para .env
        return bool(
            getattr(settings, 'PLATFORM_BTC_ADDRESS', None) and
            getattr(settings, 'PLATFORM_BTC_PRIVATE_KEY_WIF', None)
        )
    
    def get_platform_btc_credentials(self, db: Session) -> Optional[Dict]:
        """
        Obtém as credenciais BTC da plataforma.
        
        Primeiro busca na carteira do sistema (banco de dados),
        depois tenta o .env como fallback.
        
        Returns:
            Dict com address e private_key_wif, ou None
        """
        # Opção 1: Buscar da carteira do sistema no banco
        try:
            from app.services.system_blockchain_wallet_service import system_wallet_service
            btc_data = system_wallet_service.get_private_key_for_sending(db, 'bitcoin')
            
            if btc_data and btc_data.get('private_key_wif'):
                logger.info(f"🔑 BTC credentials obtidas do banco: {btc_data['address'][:15]}...")
                return {
                    "address": btc_data['address'],
                    "private_key_wif": btc_data['private_key_wif']
                }
        except Exception as e:
            logger.warning(f"⚠️ Erro buscando BTC do banco: {e}")
        
        # Opção 2: Fallback para .env
        env_address = getattr(settings, 'PLATFORM_BTC_ADDRESS', None)
        env_wif = getattr(settings, 'PLATFORM_BTC_PRIVATE_KEY_WIF', None)
        
        if env_address and env_wif:
            logger.info(f"🔑 BTC credentials obtidas do .env: {env_address[:15]}...")
            return {
                "address": env_address,
                "private_key_wif": env_wif
            }
        
        logger.warning("⚠️ Nenhuma credencial BTC encontrada (banco ou .env)")
        return None

    def get_platform_btc_balance(self, db: Session = None) -> Optional[Dict]:
        """Consulta saldo BTC da plataforma."""
        try:
            from app.services.btc_service import get_platform_btc_balance
            return get_platform_btc_balance()
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo BTC: {e}")
            return None


# Instância singleton
blockchain_deposit_service = BlockchainDepositService()
