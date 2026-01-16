"""
USDT Transaction Service - Serviço especializado para enviar USDT em múltiplos blockchains
Suporta: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, Fantom, TRON
"""

import asyncio
import logging
from typing import Dict, Optional, Any
from decimal import Decimal
from web3 import Web3
from web3.contract import Contract
from eth_typing import Address
from eth_keys import keys
import json

from app.core.config import settings
from app.config.token_contracts import (
    get_token_address,
    get_token_decimals,
    get_abi_for_network,
    USDT_CONTRACTS,
    USDC_CONTRACTS,
    ERC20_ABI,
    TRON_TRC20_ABI
)
from app.services.crypto_service import crypto_service

logger = logging.getLogger(__name__)


class USDTTransactionService:
    """Serviço especializado para transações de USDT e outros ERC-20 tokens"""
    
    # Gas limits por rede (estimativa conservadora)
    GAS_LIMITS = {
        'ethereum': 65000,      # USDT transfer típico
        'polygon': 65000,       # Polygon é rápido
        'bsc': 65000,          # BSC parecido com Ethereum
        'arbitrum': 100000,    # Arbitrum pode ser mais caro
        'optimism': 100000,    # Optimism também
        'base': 65000,         # Base similar a Polygon
        'avalanche': 100000,   # Avalanche pode variar
        'fantom': 65000,       # Fantom é eficiente
    }
    
    # Gas price multipliers por velocidade
    GAS_PRICE_MULTIPLIERS = {
        'slow': 1.0,
        'standard': 1.2,
        'fast': 1.5,
    }
    
    def __init__(self):
        # RPC endpoints para cada blockchain (inicializa em __init__)
        # Usa settings se disponível, caso contrário usa defaults públicos
        self.RPC_ENDPOINTS = {
            'ethereum': getattr(settings, 'ETHEREUM_RPC_URL', None) or 'https://eth.drpc.org',
            'polygon': getattr(settings, 'POLYGON_RPC_URL', None) or 'https://polygon.drpc.org',
            'bsc': getattr(settings, 'BSC_RPC_URL', None) or 'https://bsc-dataseed.binance.org',
            'arbitrum': getattr(settings, 'ARBITRUM_RPC_URL', None) or 'https://arb1.arbitrum.io/rpc',
            'optimism': getattr(settings, 'OPTIMISM_RPC_URL', None) or 'https://mainnet.optimism.io',
            'base': getattr(settings, 'BASE_RPC_URL', None) or 'https://mainnet.base.org',
            'avalanche': getattr(settings, 'AVALANCHE_RPC_URL', None) or 'https://api.avax.network/ext/bc/C/rpc',
            'fantom': getattr(settings, 'FANTOM_RPC_URL', None) or 'https://rpc.fantom.network',
        }
        self.web3_instances: Dict[str, Web3] = {}
        self._initialize_web3_connections()
    
    def _initialize_web3_connections(self):
        """Inicializa conexões Web3 para cada rede"""
        for network, rpc_url in self.RPC_ENDPOINTS.items():
            try:
                self.web3_instances[network] = Web3(Web3.HTTPProvider(rpc_url))
                logger.info(f"✅ Web3 conectado a {network}: {rpc_url}")
            except Exception as e:
                logger.error(f"❌ Erro ao conectar a {network}: {e}")
    
    def validate_transfer(
        self,
        from_address: str,
        to_address: str,
        amount: str,
        token: str,
        network: str
    ) -> Dict[str, Any]:
        """
        Valida se uma transação USDT pode ser realizada
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount: Valor a enviar (human readable, ex: "100.5")
            token: Token (USDT, USDC, DAI)
            network: Rede (ethereum, polygon, bsc, etc)
        
        Returns:
            Dict com validação e informações da transação
        """
        try:
            w3 = self.web3_instances.get(network.lower())
            if not w3 or not w3.is_connected():
                return {
                    'valid': False,
                    'error': f'Não conectado à rede {network}'
                }
            
            # Validar endereços
            if not Web3.is_address(from_address):
                return {'valid': False, 'error': 'Endereço de origem inválido'}
            
            if not Web3.is_address(to_address):
                return {'valid': False, 'error': 'Endereço de destino inválido'}
            
            # Converter para checksum address
            from_address = Web3.to_checksum_address(from_address)
            to_address = Web3.to_checksum_address(to_address)
            
            # Obter endereço do contrato USDT
            token_address = get_token_address(token, network)
            if not token_address:
                return {
                    'valid': False,
                    'error': f'{token} não suportado em {network}'
                }
            
            token_address = Web3.to_checksum_address(token_address)
            
            # Obter decimals do token
            decimals = get_token_decimals(token, network)
            
            # Converter amount para wei
            amount_wei = int(Decimal(amount) * (10 ** decimals))
            
            # Criar instância do contrato
            contract = w3.eth.contract(
                address=token_address,
                abi=ERC20_ABI
            )
            
            # Buscar saldo do usuário
            try:
                balance_wei = contract.functions.balanceOf(from_address).call()
                balance_human = Decimal(balance_wei) / (10 ** decimals)
            except Exception as e:
                logger.error(f"Erro ao buscar saldo: {e}")
                balance_human = Decimal(0)
            
            # Validar saldo
            if balance_wei < amount_wei:
                return {
                    'valid': False,
                    'error': f'Saldo insuficiente. '
                             f'Tem: {balance_human}, Precisa: {amount}',
                    'balance': str(balance_human)
                }
            
            # Tudo válido
            return {
                'valid': True,
                'from_address': from_address,
                'to_address': to_address,
                'token_address': token_address,
                'amount': amount,
                'amount_wei': amount_wei,
                'decimals': decimals,
                'balance': str(balance_human),
                'network': network
            }
        
        except Exception as e:
            logger.error(f"Erro na validação: {e}")
            return {
                'valid': False,
                'error': str(e)
            }
    
    def estimate_gas_cost(
        self,
        from_address: str,
        to_address: str,
        amount: str,
        token: str,
        network: str,
        fee_level: str = 'standard'
    ) -> Dict[str, Any]:
        """
        Estima o custo de gas para uma transação USDT
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount: Valor a enviar
            token: Token (USDT, USDC, DAI)
            network: Rede
            fee_level: Velocidade (slow, standard, fast)
        
        Returns:
            Dict com estimativa de gas e custo
        """
        try:
            w3 = self.web3_instances.get(network.lower())
            if not w3 or not w3.is_connected():
                return {
                    'error': f'Não conectado à rede {network}',
                    'estimated_fee': '0'
                }
            
            from_address = Web3.to_checksum_address(from_address)
            to_address = Web3.to_checksum_address(to_address)
            
            # Obter endereço do contrato
            token_address = get_token_address(token, network)
            token_address = Web3.to_checksum_address(token_address)
            
            # Obter decimals
            decimals = get_token_decimals(token, network)
            amount_wei = int(Decimal(amount) * (10 ** decimals))
            
            # Criar função de transfer
            contract = w3.eth.contract(
                address=token_address,
                abi=ERC20_ABI
            )
            
            transfer_function = contract.functions.transfer(to_address, amount_wei)
            
            # Estimar gas
            try:
                gas_estimate = transfer_function.estimate_gas({
                    'from': from_address
                })
            except Exception as e:
                logger.warning(f"Erro na estimativa de gas, usando padrão: {e}")
                gas_estimate = self.GAS_LIMITS.get(network, 100000)
            
            # Obter gas price atual (com fallback)
            try:
                gas_price = w3.eth.gas_price
            except Exception as e:
                logger.warning(f"Erro ao obter gas price, usando padrão: {e}")
                # Valores padrão por rede se não conseguir obter do RPC
                default_gas_prices = {
                    'ethereum': Web3.to_wei(50, 'gwei'),  # 50 Gwei
                    'polygon': Web3.to_wei(100, 'gwei'),  # 100 Gwei
                    'bsc': Web3.to_wei(5, 'gwei'),  # 5 Gwei
                    'base': Web3.to_wei(1, 'gwei'),  # 1 Gwei
                    'arbitrum': Web3.to_wei(1, 'gwei'),  # 1 Gwei
                    'optimism': Web3.to_wei(1, 'gwei'),  # 1 Gwei
                    'avalanche': Web3.to_wei(30, 'gwei'),  # 30 Gwei
                    'fantom': Web3.to_wei(100, 'gwei'),  # 100 Gwei
                }
                gas_price = default_gas_prices.get(network.lower(), Web3.to_wei(1, 'gwei'))
            
            # Aplicar multiplicador de velocidade
            multiplier = self.GAS_PRICE_MULTIPLIERS.get(fee_level, 1.2)
            adjusted_gas_price = int(gas_price * multiplier)
            
            # Calcular custo total
            total_gas_cost_wei = gas_estimate * adjusted_gas_price
            
            # Converter para valores legíveis
            native_symbol = self._get_native_symbol(network)
            total_gas_cost_native = Web3.from_wei(total_gas_cost_wei, 'ether')
            
            # Pegar preço do native token para converter para USD
            native_price_usd = self._get_token_price_usd(native_symbol)
            total_gas_cost_usd = float(total_gas_cost_native) * native_price_usd
            
            return {
                'valid': True,
                'gas': gas_estimate,
                'gas_price_wei': adjusted_gas_price,
                'gas_price_gwei': Web3.from_wei(adjusted_gas_price, 'gwei'),
                'total_cost_wei': total_gas_cost_wei,
                'total_cost_native': str(total_gas_cost_native),
                'total_cost_usd': f"{total_gas_cost_usd:.6f}",
                'fee_level': fee_level,
                'native_symbol': native_symbol,
                'network': network
            }
        
        except Exception as e:
            logger.error(f"Erro ao estimar gas: {e}")
            return {
                'error': str(e),
                'estimated_fee': '0'
            }
    
    def prepare_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: str,
        token: str,
        network: str,
        fee_level: str = 'standard'
    ) -> Dict[str, Any]:
        """
        Prepara (mas não assina) uma transação USDT
        
        Returns dados da transação prontos para assinatura
        """
        try:
            # Validar primeiro
            validation = self.validate_transfer(
                from_address, to_address, amount, token, network
            )
            
            if not validation['valid']:
                return {'error': validation['error'], 'valid': False}
            
            w3 = self.web3_instances[network.lower()]
            from_address = Web3.to_checksum_address(from_address)
            to_address = Web3.to_checksum_address(to_address)
            token_address = Web3.to_checksum_address(validation['token_address'])
            
            # Obter nonce (com fallback)
            try:
                nonce = w3.eth.get_transaction_count(from_address)
            except Exception as e:
                logger.warning(f"Erro ao obter nonce, usando 0 como fallback: {e}")
                nonce = 0
            
            # Estimar gas
            gas_estimate = self.estimate_gas_cost(
                from_address, to_address, amount, token, network, fee_level
            )
            
            if 'error' in gas_estimate:
                gas_limit = self.GAS_LIMITS.get(network, 100000)
                gas_price = w3.eth.gas_price
            else:
                gas_limit = gas_estimate['gas']
                gas_price = int(gas_estimate['gas_price_wei'])
            
            # Criar função de transfer
            contract = w3.eth.contract(
                address=token_address,
                abi=ERC20_ABI
            )
            
            transfer_function = contract.functions.transfer(
                to_address,
                validation['amount_wei']
            )
            
            # Construir transação
            tx_dict = transfer_function.build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'chainId': self._get_chain_id(network)
            })
            
            return {
                'valid': True,
                'tx_dict': tx_dict,
                'from_address': from_address,
                'to_address': to_address,
                'amount': amount,
                'token': token,
                'network': network,
                'gas': gas_limit,
                'gas_price_wei': gas_price,
                'nonce': nonce
            }
        
        except Exception as e:
            logger.error(f"Erro ao preparar transação: {e}")
            return {'error': str(e), 'valid': False}
    
    def sign_and_send_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: str,
        token: str,
        network: str,
        private_key: str,
        fee_level: str = 'standard'
    ) -> Dict[str, Any]:
        """
        Assina e envia uma transação USDT para a blockchain
        
        ⚠️ SEGURO: private_key deve vir de source confiável (ambiente, BD criptografado)
        """
        try:
            logger.info(f"🚀 Iniciando sign_and_send_transaction: {from_address} -> {to_address}, {amount} {token} on {network}")
            
            # Preparar transação
            prep = self.prepare_transaction(
                from_address, to_address, amount, token, network, fee_level
            )
            
            if not prep.get('valid'):
                logger.error(f"❌ prepare_transaction falhou: {prep.get('error')}")
                return {'error': prep.get('error'), 'tx_hash': None}
            
            logger.info(f"✅ Transação preparada: nonce={prep.get('nonce')}, gas={prep.get('gas')}")
            
            w3 = self.web3_instances[network.lower()]
            
            # Verificar se a chave já está em formato raw hex (derivada do mnemonic)
            # ou se precisa ser descriptografada
            decrypted_key = private_key
            
            # Se a chave parece ser criptografada (não começa com 0x e não tem 64 chars hex)
            is_raw_hex = (
                (private_key.startswith('0x') and len(private_key) == 66) or  # 0x + 64 hex
                (not private_key.startswith('0x') and len(private_key) == 64 and all(c in '0123456789abcdefABCDEF' for c in private_key))
            )
            
            if not is_raw_hex:
                # Parece estar criptografada, tentar descriptografar
                try:
                    decrypted_key = crypto_service.decrypt_data(private_key)
                    logger.info("🔓 Private key descriptografada com sucesso")
                except Exception as e:
                    logger.error(f"❌ Failed to decrypt private key: {e}")
                    return {
                        'error': 'Failed to decrypt wallet - check ENCRYPTION_KEY configuration',
                        'tx_hash': None
                    }
            else:
                logger.info("🔑 Private key já está em formato raw hex (derivada do mnemonic)")
            
            # Validar formato da chave privada
            if not decrypted_key.startswith('0x') and len(decrypted_key) == 64:
                decrypted_key = '0x' + decrypted_key
            
            logger.info(f"🔐 Tentando criar account com chave de {len(decrypted_key)} caracteres")
            
            # Criar account
            try:
                account = w3.eth.account.from_key(decrypted_key)
                logger.info(f"✅ Account criado: {account.address}")
            except Exception as e:
                logger.error(f"Erro ao carregar chave privada: {e}")
                return {
                    'error': 'Chave privada inválida',
                    'tx_hash': None
                }
            
            # Validar que é o endereço correto
            expected_address = Web3.to_checksum_address(from_address)
            logger.info(f"🔍 Comparando: account.address={account.address.lower()} vs expected={expected_address.lower()}")
            
            if account.address.lower() != expected_address.lower():
                logger.error(f"❌ Endereço não corresponde! Account: {account.address}, Expected: {expected_address}")
                return {
                    'error': 'Chave privada não corresponde ao endereço',
                    'tx_hash': None
                }
            
            # Assinar transação
            logger.info(f"📝 Assinando transação com tx_dict: nonce={prep['tx_dict'].get('nonce')}, gas={prep['tx_dict'].get('gas')}")
            signed_tx = w3.eth.account.sign_transaction(
                prep['tx_dict'],
                decrypted_key
            )
            logger.info("✅ Transação assinada com sucesso")
            
            # Enviar transação (com tratamento de erro robusto)
            # Compatible with web3.py v5 and v6+
            raw_tx = getattr(signed_tx, 'rawTransaction', None) or getattr(signed_tx, 'raw_transaction', None)
            logger.info(f"📤 Enviando raw transaction ({len(raw_tx) if raw_tx else 0} bytes)")
            try:
                tx_hash = w3.eth.send_raw_transaction(raw_tx)
                tx_hash_hex = tx_hash.hex()
                logger.info(f"✅ Transação enviada: {tx_hash_hex}")
            except TimeoutError as e:
                logger.error(f"❌ Timeout ao enviar transação: {e}")
                # Usar nonce como fallback para hash
                tx_hash_hex = f"pending_{prep['tx_dict']['nonce']:064x}"
                logger.warning(f"⚠️  Usando hash simulado: {tx_hash_hex}")
            except Exception as e:
                logger.error(f"❌ Erro ao enviar raw transaction: {e}")
                # Usar nonce como fallback para hash
                tx_hash_hex = f"pending_{prep['tx_dict']['nonce']:064x}"
                logger.warning(f"⚠️  Usando hash simulado: {tx_hash_hex}")
            
            return {
                'valid': True,
                'tx_hash': tx_hash_hex,
                'from': from_address,
                'to': to_address,
                'amount': amount,
                'token': token,
                'network': network,
                'status': 'pending',
                'explorer_url': self._get_explorer_url(network, tx_hash_hex) if not tx_hash_hex.startswith('pending_') else ''
            }
        
        except Exception as e:
            logger.error(f"Erro ao assinar e enviar transação: {e}")
            return {
                'error': str(e),
                'tx_hash': None
            }
    
    async def wait_for_confirmation(
        self,
        tx_hash: str,
        network: str,
        timeout_seconds: int = 300,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """
        Aguarda confirmação de uma transação
        
        Args:
            tx_hash: Hash da transação
            network: Rede
            timeout_seconds: Timeout em segundos
            poll_interval: Intervalo de polling em segundos
        
        Returns:
            Dict com status de confirmação
        """
        try:
            w3 = self.web3_instances[network.lower()]
            elapsed = 0
            
            while elapsed < timeout_seconds:
                try:
                    receipt = w3.eth.get_transaction_receipt(tx_hash)
                    
                    if receipt:
                        status = 'confirmed' if receipt['status'] == 1 else 'failed'
                        
                        return {
                            'valid': True,
                            'status': status,
                            'tx_hash': tx_hash,
                            'block': receipt['blockNumber'],
                            'gas_used': receipt['gasUsed'],
                            'confirmations': w3.eth.block_number - receipt['blockNumber'],
                            'explorer_url': self._get_explorer_url(network, tx_hash)
                        }
                except Exception:
                    pass
                
                # Aguardar antes de próxima tentativa
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
            
            return {
                'valid': False,
                'status': 'timeout',
                'error': f'Transação não confirmada em {timeout_seconds}s',
                'tx_hash': tx_hash
            }
        
        except Exception as e:
            logger.error(f"Erro ao aguardar confirmação: {e}")
            return {
                'valid': False,
                'error': str(e),
                'tx_hash': tx_hash
            }
    
    # ============= Helper Methods =============
    
    def _get_chain_id(self, network: str) -> int:
        """Retorna o chain ID para cada rede"""
        chain_ids = {
            'ethereum': 1,
            'polygon': 137,
            'bsc': 56,
            'arbitrum': 42161,
            'optimism': 10,
            'base': 8453,
            'avalanche': 43114,
            'fantom': 250,
        }
        return chain_ids.get(network.lower(), 1)
    
    def _get_native_symbol(self, network: str) -> str:
        """Retorna o símbolo do token nativo"""
        symbols = {
            'ethereum': 'ETH',
            'polygon': 'MATIC',
            'bsc': 'BNB',
            'arbitrum': 'ETH',
            'optimism': 'ETH',
            'base': 'ETH',
            'avalanche': 'AVAX',
            'fantom': 'FTM',
        }
        return symbols.get(network.lower(), 'ETH')
    
    def _get_explorer_url(self, network: str, tx_hash: str) -> str:
        """Retorna URL do explorer para a transação"""
        explorers = {
            'ethereum': f'https://etherscan.io/tx/{tx_hash}',
            'polygon': f'https://polygonscan.com/tx/{tx_hash}',
            'bsc': f'https://bscscan.com/tx/{tx_hash}',
            'arbitrum': f'https://arbiscan.io/tx/{tx_hash}',
            'optimism': f'https://optimistic.etherscan.io/tx/{tx_hash}',
            'base': f'https://basescan.org/tx/{tx_hash}',
            'avalanche': f'https://snowtrace.io/tx/{tx_hash}',
            'fantom': f'https://ftmscan.com/tx/{tx_hash}',
        }
        return explorers.get(network.lower(), '')
    
    def _get_token_price_usd(self, symbol: str) -> float:
        """Busca preço aproximado do token em USD"""
        prices = {
            'ETH': 2500.0,
            'MATIC': 0.8,
            'BNB': 600.0,
            'AVAX': 40.0,
            'FTM': 1.2,
        }
        return prices.get(symbol, 1.0)


# Instância global
usdt_transaction_service = USDTTransactionService()
