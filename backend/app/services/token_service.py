"""
Token Service - Gerenciamento de tokens ERC-20 e similares
"""
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging
from web3 import Web3

from app.config.token_contracts import (
    get_token_contract,
    get_token_decimals,
    get_token_address,
    get_abi_for_network,
    get_supported_tokens,
    get_supported_networks_for_token
)

logger = logging.getLogger(__name__)

class TokenService:
    """Serviço para gerenciar operações com tokens"""
    
    @staticmethod
    def format_amount_for_contract(amount: str, token_symbol: str, network: str) -> str:
        """
        Converte um amount para o formato correto do contrato (com decimals)
        
        Ex: "10.5" USDT (6 decimals) → "10500000" (wei)
        
        Args:
            amount: Valor em formato legível (ex: "10.5")
            token_symbol: 'USDT', 'USDC', etc
            network: 'ethereum', 'polygon', etc
            
        Returns:
            str: Valor em wei/unidade atômica
        """
        try:
            decimals = get_token_decimals(token_symbol, network)
            amount_decimal = Decimal(amount)
            # Multiplica por 10^decimals
            wei_amount = int(amount_decimal * (10 ** decimals))
            return str(wei_amount)
        except Exception as e:
            logger.error(f"Erro ao converter amount: {e}")
            raise ValueError(f"Erro ao converter {amount} para {token_symbol}: {str(e)}")
    
    @staticmethod
    def format_amount_from_contract(amount: str, token_symbol: str, network: str) -> str:
        """
        Converte um amount do formato do contrato para formato legível
        
        Ex: "10500000" (wei, 6 decimals) → "10.5" USDT
        
        Args:
            amount: Valor em wei/unidade atômica
            token_symbol: 'USDT', 'USDC', etc
            network: 'ethereum', 'polygon', etc
            
        Returns:
            str: Valor em formato legível
        """
        try:
            decimals = get_token_decimals(token_symbol, network)
            amount_decimal = Decimal(amount) / (10 ** decimals)
            # Remover zeros desnecessários
            return str(amount_decimal.normalize())
        except Exception as e:
            logger.error(f"Erro ao converter amount: {e}")
            raise ValueError(f"Erro ao converter {amount} de {token_symbol}: {str(e)}")
    
    @staticmethod
    def get_token_info(token_symbol: str, network: str) -> Dict[str, Any]:
        """
        Obtém informações completas de um token em uma rede
        
        Args:
            token_symbol: 'USDT', 'USDC', etc
            network: 'ethereum', 'polygon', etc
            
        Returns:
            dict com informações do token
        """
        try:
            contract = get_token_contract(token_symbol, network)
            return {
                'symbol': token_symbol,
                'network': network,
                'address': contract['address'],
                'decimals': contract['decimals'],
                'name': contract['name'],
                'abi': get_abi_for_network(network)
            }
        except Exception as e:
            logger.error(f"Erro ao obter info do token: {e}")
            raise
    
    @staticmethod
    def get_transfer_function_data(
        to_address: str,
        amount: str,
        token_symbol: str,
        network: str
    ) -> Dict[str, Any]:
        """
        Gera os dados para chamar a função transfer de um token ERC-20
        
        Args:
            to_address: Endereço destinatário (0x...)
            amount: Valor em formato legível (ex: "10.5")
            token_symbol: 'USDT', 'USDC', etc
            network: 'ethereum', 'polygon', etc
            
        Returns:
            dict com dados da transação
        """
        try:
            # Validar endereço
            if not Web3.is_address(to_address):
                raise ValueError(f"Endereço inválido: {to_address}")
            
            # Converter para endereço checksum
            to_address_checksum = Web3.to_checksum_address(to_address)
            
            # Obter decimals e converter amount
            wei_amount = TokenService.format_amount_for_contract(
                amount, token_symbol, network
            )
            
            # Obter ABI
            abi = get_abi_for_network(network)
            
            # Criar contract interface
            contract = Web3().eth.contract(abi=abi)
            
            # Codificar função transfer
            transfer_function = contract.functions.transfer(
                to_address_checksum,
                int(wei_amount)
            )
            
            # Obter data codificada
            tx_data = transfer_function.build_transaction({
                'from': '0x0000000000000000000000000000000000000000'  # Placeholder
            })
            function_data = tx_data.get('data', '')
            
            return {
                'to': to_address_checksum,
                'amount_wei': wei_amount,
                'amount_formatted': amount,
                'function_data': function_data,
                'token_symbol': token_symbol,
                'network': network
            }
        except Exception as e:
            logger.error(f"Erro ao gerar transfer function data: {e}")
            raise ValueError(f"Erro ao preparar transação: {str(e)}")
    
    @staticmethod
    def validate_token_and_network(
        token_symbol: str,
        network: str
    ) -> bool:
        """
        Valida se um token está disponível em uma rede
        
        Args:
            token_symbol: 'USDT', 'USDC', etc
            network: 'ethereum', 'polygon', etc
            
        Returns:
            bool: True se válido
        """
        try:
            supported_networks = get_supported_networks_for_token(token_symbol)
            return network in supported_networks
        except Exception:
            return False
    
    @staticmethod
    def list_available_tokens() -> Dict[str, List[str]]:
        """
        Lista todos os tokens disponíveis e suas redes
        
        Returns:
            dict: {'USDT': ['ethereum', 'polygon', ...], 'USDC': [...]}
        """
        tokens = get_supported_tokens()
        result = {}
        for token in tokens:
            result[token] = get_supported_networks_for_token(token)
        return result
    
    @staticmethod
    def estimate_token_gas(
        network: str,
        from_address: str,
        token_symbol: str,
        to_address: str,
        amount: str
    ) -> Dict[str, Any]:
        """
        Estima gas para transação de token
        
        Args:
            network: 'ethereum', 'polygon', etc
            from_address: Endereço origem
            token_symbol: 'USDT', 'USDC', etc
            to_address: Endereço destino
            amount: Quantidade
            
        Returns:
            dict com estimativas de gas
        """
        try:
            # Transferência de token ERC-20 típica: 60,000 - 100,000 gas
            gas_estimates = {
                'ethereum': {
                    'safe': 70000,
                    'standard': 75000,
                    'fast': 85000,
                    'gwei': {
                        'safe': '20',
                        'standard': '25',
                        'fast': '35'
                    }
                },
                'polygon': {
                    'safe': 65000,
                    'standard': 70000,
                    'fast': 80000,
                    'gwei': {
                        'safe': '30',
                        'standard': '50',
                        'fast': '100'
                    }
                },
                'bsc': {
                    'safe': 60000,
                    'standard': 70000,
                    'fast': 80000,
                    'gwei': {
                        'safe': '1',
                        'standard': '2',
                        'fast': '5'
                    }
                },
                'arbitrum': {
                    'safe': 100000,
                    'standard': 120000,
                    'fast': 150000,
                    'gwei': {
                        'safe': '0.01',
                        'standard': '0.1',
                        'fast': '0.5'
                    }
                },
                'optimism': {
                    'safe': 100000,
                    'standard': 120000,
                    'fast': 150000,
                    'gwei': {
                        'safe': '0.001',
                        'standard': '0.01',
                        'fast': '0.1'
                    }
                }
            }
            
            # Retornar estimativas para a rede, ou padrão
            if network in gas_estimates:
                return gas_estimates[network]
            else:
                # Valores padrão para redes desconhecidas
                return {
                    'safe': 80000,
                    'standard': 90000,
                    'fast': 100000,
                    'gwei': {
                        'safe': '10',
                        'standard': '20',
                        'fast': '50'
                    }
                }
        except Exception as e:
            logger.error(f"Erro ao estimar gas: {e}")
            raise

# Instância global
token_service = TokenService()
