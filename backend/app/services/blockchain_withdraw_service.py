"""
🚀 HOLD Wallet - Blockchain Withdraw Service
=============================================

Serviço para retirar criptomoedas das wallets dos usuários (VENDA/SELL).
Usado quando o usuário quer vender crypto para a plataforma.

Fluxo:
1. Usuário solicita venda (ex: 100 USDT)
2. Sistema verifica saldo
3. Sistema usa a chave privada CUSTODIAL do usuário
4. Transfere crypto: User Wallet → Platform Wallet
5. Admin processa pagamento BRL

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
from app.services.crypto_service import CryptoService
from app.core.config import settings
from app.services.gas_sponsor_service import gas_sponsor_service

logger = logging.getLogger(__name__)


class BlockchainWithdrawService:
    """
    Serviço para transferir crypto das wallets dos usuários para a plataforma.
    
    IMPORTANTE: Este serviço usa wallets CUSTODIAIS, ou seja, a plataforma
    guarda as chaves privadas dos usuários de forma criptografada.
    """
    
    # Mapeamento de símbolos alternativos para o símbolo canônico
    SYMBOL_ALIASES = {
        "POL": "MATIC",  # POL é o novo nome de MATIC
        "WMATIC": "MATIC",
        "WETH": "ETH",
        "WBNB": "BNB",
    }
    
    # Tokens nativos de cada rede (não tem contrato, balance via get_balance)
    NATIVE_TOKENS = {
        "ethereum": ["ETH"],
        "polygon": ["MATIC", "POL"],  # POL é alias de MATIC
        "base": ["ETH"],
        "bsc": ["BNB"],
        "avalanche": ["AVAX"],
        "arbitrum": ["ETH"],
        "optimism": ["ETH"],
    }
    
    # Configuração de redes (mesma do deposit service)
    NETWORK_CONFIG = {
        "ethereum": {
            "rpc_url": settings.ETHEREUM_RPC_URL,
            "chain_id": 1,
            "gas_limit": 21000,
            "native_symbol": "ETH",
            "contracts": {
                "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "ETH": None,  # Native token
            }
        },
        "polygon": {
            "rpc_url": settings.POLYGON_RPC_URL,
            "chain_id": 137,
            "gas_limit": 21000,
            "native_symbol": "MATIC",
            "contracts": {
                "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                "USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                "TRAY": "0x6b62514E925099643abA13B322A62ff6298f8E8A",  # Trayon Token
                "MATIC": None,  # Native token
                "POL": None,    # POL é alias de MATIC (native token)
            }
        },
        "base": {
            "rpc_url": settings.BASE_RPC_URL,
            "chain_id": 8453,
            "gas_limit": 21000,
            "native_symbol": "ETH",
            "contracts": {
                "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "ETH": None,  # Native token
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
        self.crypto_service = CryptoService()
        
        # Endereço da carteira da plataforma (destino das vendas)
        self.platform_wallet_address = settings.PLATFORM_WALLET_ADDRESS
        if not self.platform_wallet_address:
            logger.error("❌ CRITICAL: PLATFORM_WALLET_ADDRESS não configurada no .env!")
            logger.error("   As vendas (SELL) não funcionarão sem esse endereço.")
            logger.error("   Configure: PLATFORM_WALLET_ADDRESS=0xSeuEnderecoAqui")
    
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
    
    def get_user_address(self, db: Session, user_id: str, network: str) -> Optional[Address]:
        """Busca o Address do usuário para a rede especificada"""
        try:
            # Busca wallet do usuário
            wallet = db.query(Wallet).filter(
                Wallet.user_id == user_id,
                Wallet.is_active == True
            ).first()
            
            if not wallet:
                logger.warning(f"⚠️ Wallet não encontrada para user={user_id}")
                return None
            
            # Busca address na rede específica
            address = db.query(Address).filter(
                Address.wallet_id == wallet.id,
                Address.network == network.lower(),
                Address.is_active == True
            ).first()
            
            if not address:
                logger.warning(f"⚠️ Address não encontrado para wallet={wallet.id}, network={network}")
                return None
            
            return address
        except Exception as e:
            logger.error(f"❌ Erro buscando address: {str(e)}")
            return None
    
    def decrypt_user_private_key(self, encrypted_key: str) -> Optional[str]:
        """Descriptografa a chave privada do usuário"""
        try:
            if not encrypted_key:
                logger.error("❌ Chave privada não encontrada")
                return None
            
            decrypted = self.crypto_service.decrypt_data(encrypted_key)
            return decrypted
        except Exception as e:
            logger.error(f"❌ Erro ao descriptografar chave: {str(e)}")
            return None
    
    def check_user_balance(
        self,
        w3: Web3,
        address: str,
        symbol: str,
        network: str,
        required_amount: Decimal
    ) -> Dict[str, Any]:
        """
        Verifica se usuário tem saldo suficiente.
        
        Trata corretamente:
        - Tokens nativos (ETH, MATIC/POL, BNB, AVAX)
        - Stablecoins ERC20 (USDT, USDC)
        - Alias de símbolos (POL -> MATIC)
        """
        try:
            config = self.NETWORK_CONFIG.get(network.lower())
            if not config:
                logger.error(f"❌ Rede não configurada: {network}")
                return {
                    "balance": 0,
                    "required": float(required_amount),
                    "has_enough": False,
                    "error": f"Rede {network} não configurada"
                }
            
            # Normalizar símbolo (POL -> MATIC, etc)
            normalized_symbol = self.SYMBOL_ALIASES.get(symbol.upper(), symbol.upper())
            logger.info(f"🔍 Verificando saldo: symbol={symbol} -> normalized={normalized_symbol}, network={network}")
            
            # Verificar se é token nativo da rede
            native_tokens = self.NATIVE_TOKENS.get(network.lower(), [])
            is_native_token = (
                normalized_symbol in native_tokens or 
                symbol.upper() in native_tokens or
                config["contracts"].get(normalized_symbol) is None or
                config["contracts"].get(symbol.upper()) is None
            )
            
            # Se não encontrou contrato E é símbolo conhecido como nativo, trata como nativo
            contract_address = config["contracts"].get(normalized_symbol) or config["contracts"].get(symbol.upper())
            
            if contract_address is None or is_native_token:
                # Token nativo (ETH, MATIC/POL, BNB, AVAX, etc)
                logger.info(f"💎 Token nativo detectado: {symbol} na rede {network}")
                balance_wei = w3.eth.get_balance(Web3.to_checksum_address(address))
                balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
            else:
                # Token ERC20 (USDT, USDC, etc)
                logger.info(f"📄 Token ERC20 detectado: {symbol} em {contract_address}")
                contract = w3.eth.contract(
                    address=Web3.to_checksum_address(contract_address),
                    abi=self.ERC20_ABI
                )
                decimals = contract.functions.decimals().call()
                balance_units = contract.functions.balanceOf(
                    Web3.to_checksum_address(address)
                ).call()
                balance = Decimal(str(balance_units)) / Decimal(str(10 ** decimals))
            
            has_enough = balance >= required_amount
            
            # Tolerância para erros de precisão de float (0.000001 = 1 microunidade)
            # Isso evita falsos negativos quando o saldo é praticamente igual ao necessário
            tolerance = Decimal("0.000001")
            if not has_enough and (required_amount - balance) < tolerance:
                logger.info(f"⚠️ Aplicando tolerância de precisão: diferença = {required_amount - balance}")
                has_enough = True
            
            logger.info(f"{'✅' if has_enough else '❌'} Saldo: {balance} {symbol}, Necessário: {required_amount}")
            
            return {
                "balance": float(balance),
                "required": float(required_amount),
                "has_enough": has_enough,
                "missing": float(required_amount - balance) if not has_enough else 0,
                "is_native": contract_address is None or is_native_token,
                "normalized_symbol": normalized_symbol
            }
            
        except Exception as e:
            logger.error(f"❌ Erro verificando saldo de {symbol} na rede {network}: {str(e)}")
            return {
                "balance": 0,
                "required": float(required_amount),
                "has_enough": False,
                "error": str(e)
            }
    
    def send_native_token(
        self,
        w3: Web3,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        network: str
    ) -> Optional[str]:
        """
        Envia token nativo (ETH, MATIC) do usuário para a plataforma
        
        Returns:
            tx_hash se sucesso, None se erro
        """
        try:
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Converte amount para Wei
            amount_wei = w3.to_wei(float(amount), 'ether')
            
            # Busca nonce
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(from_address))
            
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
            
            # Assina transação com a chave do USUÁRIO
            signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
            
            # Envia transação (compatível com diferentes versões do web3.py)
            raw_tx = getattr(signed_txn, 'rawTransaction', None) or getattr(signed_txn, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = w3.to_hex(tx_hash)
            
            logger.info(f"✅ Token nativo transferido! TX: {tx_hash_hex}")
            return tx_hash_hex
            
        except Exception as e:
            logger.error(f"❌ Erro enviando token nativo: {str(e)}")
            return None
    
    def send_erc20_token(
        self,
        w3: Web3,
        contract_address: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        network: str
    ) -> Optional[str]:
        """
        Envia token ERC20 (USDT, USDC) do usuário para a plataforma
        
        Returns:
            tx_hash se sucesso, None se erro
        """
        try:
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Cria instância do contrato
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.ERC20_ABI
            )
            
            # Busca decimais do token
            decimals = contract.functions.decimals().call()
            
            # Converte amount considerando decimals
            amount_units = int(float(amount) * (10 ** decimals))
            
            # Busca nonce
            nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(from_address))
            
            # Busca gas price
            gas_price = w3.eth.gas_price
            
            # Cria transação de transfer
            transaction = contract.functions.transfer(
                Web3.to_checksum_address(to_address),
                amount_units
            ).build_transaction({
                'from': Web3.to_checksum_address(from_address),
                'nonce': nonce,
                'gas': 100000,  # Gas limit maior para ERC20
                'gasPrice': gas_price,
                'chainId': config["chain_id"]
            })
            
            # Assina transação com a chave do USUÁRIO
            signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
            
            # Envia transação (compatível com diferentes versões do web3.py)
            raw_tx = getattr(signed_txn, 'rawTransaction', None) or getattr(signed_txn, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = w3.to_hex(tx_hash)
            
            logger.info(f"✅ Token ERC20 transferido! TX: {tx_hash_hex}")
            return tx_hash_hex
            
        except Exception as e:
            logger.error(f"❌ Erro enviando token ERC20: {str(e)}")
            return None
    
    def withdraw_crypto_from_user(
        self,
        db: Session,
        trade: InstantTrade,
        network: str = "polygon"
    ) -> Dict[str, Any]:
        """
        Retira criptomoeda da wallet do usuário para a plataforma (VENDA/SELL)
        
        FLUXO:
        1. Busca Address do usuário com chave privada criptografada
        2. Descriptografa chave privada
        3. Verifica saldo do usuário
        4. Transfere crypto: User Wallet → Platform Wallet
        5. Registra tx_hash
        
        Args:
            db: Sessão do banco
            trade: InstantTrade de VENDA com status PENDING
            network: Rede blockchain (ethereum, polygon, base)
        
        Returns:
            {
                "success": bool,
                "tx_hash": str ou None,
                "from_address": str ou None,
                "to_address": str ou None,
                "network": str,
                "error": str ou None
            }
        """
        try:
            logger.info(f"🚀 Iniciando withdraw para trade SELL {trade.reference_code}")
            
            # 0. Verifica se PLATFORM_WALLET_ADDRESS está configurado
            if not self.platform_wallet_address:
                logger.error("❌ PLATFORM_WALLET_ADDRESS não configurada!")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": None,
                    "to_address": None,
                    "network": network,
                    "error": "PLATFORM_WALLET_ADDRESS não configurada no servidor. Configure no .env"
                }
            
            # 1. Valida tipo de operação
            if trade.operation_type.value != "sell":
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": None,
                    "to_address": None,
                    "network": network,
                    "error": "Trade não é uma operação de VENDA"
                }
            
            # 2. Busca Address do usuário
            logger.info(f"📍 Buscando address do usuário {trade.user_id} na rede {network}")
            user_address = self.get_user_address(db, trade.user_id, network)
            if not user_address:
                logger.error(f"❌ Address não encontrado para user={trade.user_id}, network={network}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": None,
                    "to_address": None,
                    "network": network,
                    "error": f"Address do usuário não encontrado para network={network}"
                }
            
            logger.info(f"✅ Address encontrado: {user_address.address}")
            
            # 3. Descriptografa chave privada
            logger.info(f"🔐 Descriptografando chave privada do usuário...")
            has_encrypted_key = bool(user_address.encrypted_private_key)
            logger.info(f"   - Tem chave criptografada: {has_encrypted_key}")
            
            private_key = self.decrypt_user_private_key(user_address.encrypted_private_key)
            if not private_key:
                logger.error(f"❌ Falha ao descriptografar chave privada")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": None,
                    "network": network,
                    "error": "Não foi possível descriptografar a chave privada do usuário"
                }
            
            logger.info(f"✅ Chave privada descriptografada com sucesso")
            
            # 4. Conecta na rede
            logger.info(f"🌐 Conectando na rede {network}...")
            w3 = self.get_web3(network)
            if not w3:
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": None,
                    "network": network,
                    "error": f"Não foi possível conectar à rede {network}"
                }
            
            logger.info(f"✅ Conectado à rede {network}")
            
            # 5. Verifica saldo do usuário
            logger.info(f"💰 Verificando saldo de {trade.crypto_amount} {trade.symbol} em {user_address.address}...")
            balance_check = self.check_user_balance(
                w3=w3,
                address=user_address.address,
                symbol=trade.symbol,
                network=network,
                required_amount=trade.crypto_amount
            )
            
            logger.info(f"💰 Saldo verificado: {balance_check}")
            
            if not balance_check.get("has_enough"):
                logger.error(f"❌ Saldo insuficiente! Disponível: {balance_check['balance']}, Necessário: {balance_check['required']}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": self.platform_wallet_address,
                    "network": network,
                    "error": f"Saldo insuficiente. Disponível: {balance_check['balance']} {trade.symbol}, Necessário: {balance_check['required']}"
                }
            
            logger.info(f"✅ Saldo suficiente! Disponível: {balance_check['balance']}")
            
            # 6. Determina se é token nativo ou ERC20
            # Usar informação de is_native retornada pelo check_user_balance
            config = self.NETWORK_CONFIG[network.lower()]
            is_native_token = balance_check.get("is_native", False)
            
            # Se check_user_balance determinou que é nativo, contract_address é None
            if is_native_token:
                contract_address = None
            else:
                normalized_symbol = balance_check.get("normalized_symbol", trade.symbol.upper())
                contract_address = config["contracts"].get(normalized_symbol) or config["contracts"].get(trade.symbol.upper())
            
            is_erc20 = not is_native_token
            
            logger.info(f"📋 Token: {trade.symbol}, Native: {is_native_token}, Contract: {contract_address or 'NATIVO'}")
            logger.info(f"📍 Destino: {self.platform_wallet_address}")
            
            # 7. ⭐ GAS SPONSOR: Verifica e patrocina gas se necessário
            gas_sponsor_result = None
            network_fee_brl = Decimal("0")
            
            logger.info(f"⛽ Verificando necessidade de gas sponsor...")
            gas_sponsor_result = gas_sponsor_service.sponsor_gas_for_sell(
                w3=w3,
                user_address=str(user_address.address),
                network=network,
                is_erc20=is_erc20
            )
            
            if gas_sponsor_result.get("error"):
                logger.error(f"❌ Erro no gas sponsor: {gas_sponsor_result['error']}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": self.platform_wallet_address,
                    "network": network,
                    "error": f"Erro ao patrocinar gas: {gas_sponsor_result['error']}"
                }
            
            if gas_sponsor_result.get("gas_sponsored"):
                network_fee_brl = gas_sponsor_result.get("network_fee_brl", Decimal("0"))
                logger.info(f"✅ Gas patrocinado! Taxa de rede: R$ {network_fee_brl}")
                logger.info(f"   Gas TX: {gas_sponsor_result.get('gas_tx_hash')}")
            else:
                logger.info(f"✅ Usuário já tem gas suficiente, sem taxa adicional")
            
            # 8. Envia a transação
            tx_hash = None
            amount_to_send = Decimal(str(trade.crypto_amount))
            
            if contract_address is None:
                # Token nativo (ETH, MATIC) - PRECISA RESERVAR GAS!
                # Calcula quanto gas vai custar a transação
                gas_price_wei = w3.eth.gas_price
                gas_cost_wei = gas_price_wei * config["gas_limit"]
                gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
                gas_cost_with_margin = gas_cost * Decimal("1.5")  # 50% margem de segurança
                
                # Saldo atual
                balance_wei = w3.eth.get_balance(Web3.to_checksum_address(str(user_address.address)))
                current_balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
                
                # Calcula valor máximo que pode enviar (saldo - gas)
                max_sendable = current_balance - gas_cost_with_margin
                
                if max_sendable <= Decimal("0"):
                    logger.error(f"❌ Saldo insuficiente para cobrir gas! Saldo: {current_balance}, Gas necessário: {gas_cost_with_margin}")
                    return {
                        "success": False,
                        "tx_hash": None,
                        "from_address": str(user_address.address),
                        "to_address": self.platform_wallet_address,
                        "network": network,
                        "error": f"Saldo insuficiente para cobrir taxa de gas. Saldo: {current_balance:.6f} {trade.symbol}, Gas necessário: {gas_cost_with_margin:.6f}"
                    }
                
                # Se usuário quer vender mais do que o máximo possível, ajusta
                if amount_to_send > max_sendable:
                    logger.warning(f"⚠️ Ajustando valor de venda: {amount_to_send} → {max_sendable} (reservando {gas_cost_with_margin} para gas)")
                    amount_to_send = max_sendable
                else:
                    # Verifica se sobra suficiente para gas
                    remaining_after_send = current_balance - amount_to_send
                    if remaining_after_send < gas_cost_with_margin:
                        # Ajusta para deixar gas suficiente
                        amount_to_send = current_balance - gas_cost_with_margin
                        logger.warning(f"⚠️ Ajustando valor para reservar gas: {trade.crypto_amount} → {amount_to_send}")
                
                logger.info(f"📤 Transferindo {amount_to_send} {trade.symbol} (nativo) de {user_address.address} para plataforma")
                logger.info(f"   Gas reservado: {gas_cost_with_margin} {config['native_symbol']}")
                
                tx_hash = self.send_native_token(
                    w3=w3,
                    from_address=str(user_address.address),
                    private_key=private_key,
                    to_address=self.platform_wallet_address,
                    amount=amount_to_send,
                    network=network
                )
            else:
                # Token ERC20 (USDT, USDC)
                logger.info(f"📤 Transferindo {trade.crypto_amount} {trade.symbol} (ERC20) de {user_address.address} para plataforma")
                tx_hash = self.send_erc20_token(
                    w3=w3,
                    contract_address=contract_address,
                    from_address=str(user_address.address),
                    private_key=private_key,
                    to_address=self.platform_wallet_address,
                    amount=Decimal(str(trade.crypto_amount)),
                    network=network
                )
            
            if not tx_hash:
                logger.error("❌ Falha ao enviar transação - tx_hash é None")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": str(user_address.address),
                    "to_address": self.platform_wallet_address,
                    "network": network,
                    "error": "Falha ao enviar transação blockchain",
                    "gas_sponsor": gas_sponsor_result
                }
            
            # 9. Atualiza o trade com os dados blockchain
            trade.wallet_address = user_address.address
            trade.network = network
            trade.tx_hash = tx_hash
            trade.status = TradeStatus.CRYPTO_RECEIVED  # Novo status para VENDA
            
            # Registra a taxa de rede se houver
            if network_fee_brl > 0 and trade.brl_amount is not None:
                # Atualiza o valor final BRL descontando a taxa de rede
                original_brl = Decimal(str(trade.brl_amount))
                trade.brl_amount = original_brl - network_fee_brl
                logger.info(f"💰 Taxa de rede descontada: R$ {network_fee_brl}")
                logger.info(f"   BRL original: R$ {original_brl} → BRL final: R$ {trade.brl_amount}")
            
            db.commit()
            db.refresh(trade)
            
            logger.info(f"✅ Crypto recebida da wallet do usuário! TX: {tx_hash}")
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "from_address": user_address.address,
                "to_address": self.platform_wallet_address,
                "network": network,
                "error": None,
                # Informações do Gas Sponsor
                "gas_sponsor": {
                    "sponsored": gas_sponsor_result.get("gas_sponsored", False) if gas_sponsor_result else False,
                    "gas_tx_hash": gas_sponsor_result.get("gas_tx_hash") if gas_sponsor_result else None,
                    "gas_amount_sent": str(gas_sponsor_result.get("gas_amount_sent", 0)) if gas_sponsor_result else "0",
                    "network_fee_brl": str(network_fee_brl),
                    "native_symbol": gas_sponsor_result.get("native_symbol", "") if gas_sponsor_result else "",
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no withdraw: {str(e)}")
            db.rollback()
            return {
                "success": False,
                "tx_hash": None,
                "from_address": None,
                "to_address": None,
                "network": network,
                "error": str(e),
                "gas_sponsor": None
            }


    def transfer_to_platform(
        self,
        db: Session,
        user_id: str,
        symbol: str,
        amount: Decimal,
        network: str = "polygon",
        reference_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transfere criptomoeda da wallet do usuário para a plataforma.
        
        Método genérico usado para:
        - Pagamento de boletos
        - Qualquer operação que precise mover crypto para plataforma
        
        NÃO depende de InstantTrade - recebe parâmetros diretos.
        
        FLUXO:
        1. Busca Address do usuário com chave privada criptografada
        2. Descriptografa chave privada
        3. Verifica saldo do usuário na blockchain
        4. Patrocina gas se necessário
        5. Transfere crypto: User Wallet → Platform Wallet
        
        Args:
            db: Sessão do banco
            user_id: ID do usuário
            symbol: Símbolo do token (USDT, USDC, ETH, MATIC, etc)
            amount: Quantidade a transferir
            network: Rede blockchain (polygon, ethereum, bsc, base)
            reference_id: ID de referência (bill_payment_id, etc)
        
        Returns:
            {
                "success": bool,
                "tx_hash": str ou None,
                "from_address": str ou None,
                "to_address": str ou None,
                "network": str,
                "error": str ou None,
                "gas_sponsor": dict ou None
            }
        """
        try:
            logger.info(f"🚀 Iniciando transfer_to_platform: {amount} {symbol} na rede {network}")
            logger.info(f"   User: {user_id}, Ref: {reference_id}")
            
            # 0. Verifica se PLATFORM_WALLET_ADDRESS está configurado
            if not self.platform_wallet_address:
                logger.error("❌ PLATFORM_WALLET_ADDRESS não configurada!")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": None,
                    "to_address": None,
                    "network": network,
                    "error": "PLATFORM_WALLET_ADDRESS não configurada no servidor"
                }
            
            # 1. Busca Address do usuário
            logger.info(f"📍 Buscando address do usuário {user_id} na rede {network}")
            user_address = self.get_user_address(db, user_id, network)
            if not user_address:
                logger.error(f"❌ Address não encontrado para user={user_id}, network={network}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": None,
                    "to_address": None,
                    "network": network,
                    "error": f"Address do usuário não encontrado para network={network}"
                }
            
            logger.info(f"✅ Address encontrado: {user_address.address}")
            
            # 2. Descriptografa chave privada
            logger.info(f"🔐 Descriptografando chave privada...")
            private_key = self.decrypt_user_private_key(user_address.encrypted_private_key)
            if not private_key:
                logger.error(f"❌ Falha ao descriptografar chave privada")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": None,
                    "network": network,
                    "error": "Não foi possível descriptografar a chave privada do usuário"
                }
            
            logger.info(f"✅ Chave privada descriptografada")
            
            # 3. Conecta na rede
            logger.info(f"🌐 Conectando na rede {network}...")
            w3 = self.get_web3(network)
            if not w3:
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": None,
                    "network": network,
                    "error": f"Não foi possível conectar à rede {network}"
                }
            
            # 4. Verifica saldo do usuário
            logger.info(f"💰 Verificando saldo de {amount} {symbol} em {user_address.address}...")
            balance_check = self.check_user_balance(
                w3=w3,
                address=user_address.address,
                symbol=symbol,
                network=network,
                required_amount=amount
            )
            
            if not balance_check.get("has_enough"):
                logger.error(f"❌ Saldo insuficiente! Disponível: {balance_check['balance']}, Necessário: {balance_check['required']}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": self.platform_wallet_address,
                    "network": network,
                    "error": f"Saldo insuficiente na blockchain. Disponível: {balance_check['balance']} {symbol}, Necessário: {balance_check['required']}"
                }
            
            logger.info(f"✅ Saldo suficiente! Disponível: {balance_check['balance']}")
            
            # 5. Determina se é token nativo ou ERC20
            config = self.NETWORK_CONFIG[network.lower()]
            is_native_token = balance_check.get("is_native", False)
            
            if is_native_token:
                contract_address = None
            else:
                normalized_symbol = balance_check.get("normalized_symbol", symbol.upper())
                contract_address = config["contracts"].get(normalized_symbol) or config["contracts"].get(symbol.upper())
            
            is_erc20 = not is_native_token
            
            logger.info(f"📋 Token: {symbol}, Native: {is_native_token}, Contract: {contract_address or 'NATIVO'}")
            
            # 6. Gas Sponsor: Verifica e patrocina gas se necessário
            gas_sponsor_result = None
            network_fee_brl = Decimal("0")
            
            logger.info(f"⛽ Verificando necessidade de gas sponsor...")
            gas_sponsor_result = gas_sponsor_service.sponsor_gas_for_sell(
                w3=w3,
                user_address=str(user_address.address),
                network=network,
                is_erc20=is_erc20
            )
            
            if gas_sponsor_result.get("error"):
                logger.error(f"❌ Erro no gas sponsor: {gas_sponsor_result['error']}")
                return {
                    "success": False,
                    "tx_hash": None,
                    "from_address": user_address.address,
                    "to_address": self.platform_wallet_address,
                    "network": network,
                    "error": f"Erro ao patrocinar gas: {gas_sponsor_result['error']}"
                }
            
            if gas_sponsor_result.get("gas_sponsored"):
                network_fee_brl = gas_sponsor_result.get("network_fee_brl", Decimal("0"))
                logger.info(f"✅ Gas patrocinado! Taxa de rede: R$ {network_fee_brl}")
            else:
                logger.info(f"✅ Usuário já tem gas suficiente")
            
            # 7. Envia a transação
            tx_hash = None
            amount_to_send = amount
            
            if contract_address is None:
                # Token nativo - reserva gas
                gas_price_wei = w3.eth.gas_price
                gas_cost_wei = gas_price_wei * config["gas_limit"]
                gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
                gas_cost_with_margin = gas_cost * Decimal("1.5")
                
                balance_wei = w3.eth.get_balance(Web3.to_checksum_address(str(user_address.address)))
                current_balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
                
                max_sendable = current_balance - gas_cost_with_margin
                
                if max_sendable <= Decimal("0"):
                    logger.error(f"❌ Saldo insuficiente para gas!")
                    return {
                        "success": False,
                        "tx_hash": None,
                        "from_address": str(user_address.address),
                        "to_address": self.platform_wallet_address,
                        "network": network,
                        "error": f"Saldo insuficiente para cobrir taxa de gas"
                    }
                
                if amount_to_send > max_sendable:
                    amount_to_send = max_sendable
                    logger.warning(f"⚠️ Ajustando valor: {amount} → {amount_to_send}")
                
                logger.info(f"📤 Transferindo {amount_to_send} {symbol} (nativo)")
                tx_hash = self.send_native_token(
                    w3=w3,
                    from_address=str(user_address.address),
                    private_key=private_key,
                    to_address=self.platform_wallet_address,
                    amount=amount_to_send,
                    network=network
                )
            else:
                # Token ERC20
                logger.info(f"📤 Transferindo {amount_to_send} {symbol} (ERC20)")
                tx_hash = self.send_erc20_token(
                    w3=w3,
                    contract_address=contract_address,
                    from_address=str(user_address.address),
                    private_key=private_key,
                    to_address=self.platform_wallet_address,
                    amount=amount_to_send,
                    network=network
                )
            
            if not tx_hash:
                logger.error("❌ Falha ao enviar transação - tx_hash é None")
                return {
                "success": False,
                "tx_hash": None,
                "from_address": str(user_address.address),
                "to_address": self.platform_wallet_address,
                "network": network,
                "error": "Falha ao enviar transação blockchain",
                "gas_sponsor": gas_sponsor_result
            }
            
            logger.info(f"✅ Crypto transferida para plataforma! TX: {tx_hash}")
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "from_address": user_address.address,
                "to_address": self.platform_wallet_address,
                "network": network,
                "amount_sent": str(amount_to_send),
                "error": None,
                "gas_sponsor": {
                    "sponsored": gas_sponsor_result.get("gas_sponsored", False) if gas_sponsor_result else False,
                    "gas_tx_hash": gas_sponsor_result.get("gas_tx_hash") if gas_sponsor_result else None,
                    "network_fee_brl": str(network_fee_brl),
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no transfer_to_platform: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "tx_hash": None,
                "from_address": None,
                "to_address": None,
                "network": network,
                "error": str(e)
            }

    def transfer_to_address(
        self,
        db: Session,
        user_id: str,
        amount: float,
        symbol: str,
        network: str,
        to_address: str,
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Transfere crypto da carteira do usuário para um endereço específico.
        
        Método genérico que pode ser usado para transferências EarnPool,
        saques manuais ou outras operações.
        
        Args:
            db: Sessão do banco
            user_id: ID do usuário
            amount: Quantidade a transferir
            symbol: Símbolo da crypto (ETH, USDT, etc.)
            network: Rede blockchain (ethereum, polygon, etc.)
            to_address: Endereço de destino
            description: Descrição da operação
        
        Returns:
            Dict com resultado da transferência
        """
        try:
            logger.info(f"🚀 Iniciando transfer_to_address")
            logger.info(f"   User: {user_id}")
            logger.info(f"   Amount: {amount} {symbol}")
            logger.info(f"   Network: {network}")
            logger.info(f"   To: {to_address}")
            logger.info(f"   Description: {description}")
            
            # Normalizar símbolo
            symbol_upper = self.SYMBOL_ALIASES.get(symbol.upper(), symbol.upper())
            
            # Buscar Address do usuário
            user_address = self.get_user_address(db, user_id, network)
            if not user_address:
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": f"Address do usuário não encontrado para network={network}"
                }
            
            logger.info(f"✅ Address encontrado: {user_address.address}")
            
            # Descriptografar chave privada
            private_key = self.decrypt_user_private_key(user_address.encrypted_private_key)
            if not private_key:
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": "Não foi possível descriptografar a chave privada do usuário"
                }
            
            # Conectar na rede
            w3 = self.get_web3(network)
            if not w3:
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": f"Não foi possível conectar à rede {network}"
                }
            
            # Verificar saldo
            balance_check = self.check_user_balance(
                w3=w3,
                address=user_address.address,
                symbol=symbol_upper,
                network=network,
                required_amount=Decimal(str(amount))
            )
            
            if not balance_check.get("has_enough"):
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": f"Saldo insuficiente. Disponível: {balance_check['balance']}, Necessário: {amount}"
                }
            
            # Determinar se é token nativo ou ERC20
            config = self.NETWORK_CONFIG.get(network.lower(), {})
            is_native = balance_check.get("is_native", False)
            contract_address = None
            
            if not is_native:
                normalized_symbol = balance_check.get("normalized_symbol", symbol_upper)
                contract_address = config.get("contracts", {}).get(normalized_symbol) or config.get("contracts", {}).get(symbol_upper)
            
            logger.info(f"📋 Token: {symbol_upper}, Native: {is_native}, Contract: {contract_address or 'NATIVO'}")
            
            # Gas sponsor se necessário
            gas_sponsor_result = gas_sponsor_service.sponsor_gas_for_sell(
                w3=w3,
                user_address=str(user_address.address),
                network=network,
                is_erc20=not is_native
            )
            
            if gas_sponsor_result.get("error"):
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": f"Erro ao patrocinar gas: {gas_sponsor_result['error']}"
                }
            
            # Enviar transação
            tx_hash = None
            amount_decimal = Decimal(str(amount))
            
            if contract_address is None:
                # Token nativo
                gas_price_wei = w3.eth.gas_price
                gas_limit = config.get("gas_limit", 21000)
                gas_cost_wei = gas_price_wei * gas_limit
                gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
                gas_cost_with_margin = gas_cost * Decimal("1.5")
                
                amount_to_send = amount_decimal - gas_cost_with_margin
                if amount_to_send <= 0:
                    amount_to_send = amount_decimal * Decimal("0.98")
                
                tx_hash = self.send_native_token(
                    w3=w3,
                    from_address=user_address.address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount_to_send,
                    network=network
                )
            else:
                # ERC20 token
                tx_hash = self.send_erc20_token(
                    w3=w3,
                    contract_address=contract_address,
                    from_address=user_address.address,
                    private_key=private_key,
                    to_address=to_address,
                    amount=amount_decimal,
                    network=network
                )
            
            if not tx_hash:
                return {
                    "success": False,
                    "tx_hash": None,
                    "error": "Falha ao enviar transação blockchain"
                }
            
            logger.info(f"✅ Transferência concluída! TX: {tx_hash}")
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "from_address": user_address.address,
                "to_address": to_address,
                "network": network,
                "amount": str(amount),
                "symbol": symbol_upper,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no transfer_to_address: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "tx_hash": None,
                "error": str(e)
            }


# Instância singleton
blockchain_withdraw_service = BlockchainWithdrawService()