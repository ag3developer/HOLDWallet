"""
🚀 HOLD Wallet - Gas Sponsor Service
=====================================

Serviço profissional para patrocínio de gas em transações de VENDA.

CONCEITO:
- A plataforma "adianta" o gas (MATIC/ETH) para o usuário
- O valor é descontado do BRL que o usuário receberia
- Tudo é registrado e transparente

FLUXO:
1. Usuário solicita VENDA de 100 USDT
2. Sistema detecta que usuário não tem MATIC para gas
3. Plataforma envia MATIC necessário + margem de segurança
4. Transação de USDT é executada
5. Taxa de rede é descontada do valor BRL final

Author: HOLD Wallet Team
"""

import logging
from decimal import Decimal, ROUND_UP
from typing import Optional, Dict, Any
from datetime import datetime
from web3 import Web3
from eth_account import Account

from app.core.config import settings

logger = logging.getLogger(__name__)


class GasSponsorService:
    """
    Serviço de patrocínio de gas para transações de usuários.
    
    A plataforma paga o gas e desconta do valor BRL do usuário.
    """
    
    # Configuração por rede
    NETWORK_CONFIG = {
        "polygon": {
            "rpc_url": settings.POLYGON_RPC_URL,
            "chain_id": 137,
            "native_symbol": "MATIC",
            "gas_limit_transfer": 21000,
            "gas_limit_erc20": 100000,
            # Margem de segurança: 50% a mais do estimado
            "gas_margin": Decimal("1.5"),
            # Cotação aproximada MATIC/BRL (atualizar periodicamente)
            "native_to_brl_rate": Decimal("3.50"),
            # Taxa administrativa sobre o gas (ex: 10%)
            "admin_fee_percent": Decimal("0.10"),
        },
        "ethereum": {
            "rpc_url": settings.ETHEREUM_RPC_URL,
            "chain_id": 1,
            "native_symbol": "ETH",
            "gas_limit_transfer": 21000,
            "gas_limit_erc20": 65000,
            "gas_margin": Decimal("1.5"),
            "native_to_brl_rate": Decimal("18000.00"),  # ETH mais caro
            "admin_fee_percent": Decimal("0.10"),
        },
        "base": {
            "rpc_url": getattr(settings, 'BASE_RPC_URL', 'https://mainnet.base.org'),
            "chain_id": 8453,
            "native_symbol": "ETH",
            "gas_limit_transfer": 21000,
            "gas_limit_erc20": 65000,
            "gas_margin": Decimal("1.5"),
            "native_to_brl_rate": Decimal("18000.00"),
            "admin_fee_percent": Decimal("0.10"),
        }
    }
    
    def __init__(self):
        """Inicializa o serviço"""
        self.platform_private_key = settings.PLATFORM_WALLET_PRIVATE_KEY
        self.platform_address = settings.PLATFORM_WALLET_ADDRESS
        
        if not self.platform_private_key:
            logger.error("❌ CRITICAL: PLATFORM_WALLET_PRIVATE_KEY não configurada!")
        if not self.platform_address:
            logger.error("❌ CRITICAL: PLATFORM_WALLET_ADDRESS não configurada!")
    
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
            
            return w3
        except Exception as e:
            logger.error(f"❌ Erro conectando à rede {network}: {str(e)}")
            return None
    
    def check_user_gas_balance(
        self,
        w3: Web3,
        user_address: str,
        network: str,
        is_erc20: bool = True
    ) -> Dict[str, Any]:
        """
        Verifica se o usuário tem gas suficiente para a transação.
        
        Returns:
            {
                "has_enough_gas": bool,
                "current_balance": Decimal,  # em native token
                "required_gas": Decimal,     # em native token
                "gas_deficit": Decimal,      # quanto falta
                "gas_price_gwei": Decimal,   # preço atual do gas
            }
        """
        try:
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Saldo atual do usuário em native token
            balance_wei = w3.eth.get_balance(Web3.to_checksum_address(user_address))
            balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
            
            # Gas price atual
            gas_price_wei = w3.eth.gas_price
            gas_price_gwei = Decimal(str(w3.from_wei(gas_price_wei, 'gwei')))
            
            # Gas limit baseado no tipo de transação
            gas_limit = config["gas_limit_erc20"] if is_erc20 else config["gas_limit_transfer"]
            
            # Custo estimado do gas (com margem de segurança)
            gas_cost_wei = gas_price_wei * gas_limit
            gas_cost = Decimal(str(w3.from_wei(gas_cost_wei, 'ether')))
            gas_cost_with_margin = gas_cost * config["gas_margin"]
            
            # Verifica se tem o suficiente
            has_enough = balance >= gas_cost_with_margin
            gas_deficit = max(Decimal("0"), gas_cost_with_margin - balance)
            
            return {
                "has_enough_gas": has_enough,
                "current_balance": balance,
                "required_gas": gas_cost_with_margin,
                "gas_deficit": gas_deficit,
                "gas_price_gwei": gas_price_gwei,
                "native_symbol": config["native_symbol"],
            }
            
        except Exception as e:
            logger.error(f"❌ Erro verificando gas balance: {str(e)}")
            return {
                "has_enough_gas": False,
                "current_balance": Decimal("0"),
                "required_gas": Decimal("0"),
                "gas_deficit": Decimal("0"),
                "gas_price_gwei": Decimal("0"),
                "error": str(e)
            }
    
    def check_platform_gas_balance(
        self,
        w3: Web3,
        network: str,
        required_gas: Decimal
    ) -> Dict[str, Any]:
        """
        Verifica se a plataforma tem saldo suficiente para patrocinar gas.
        
        Args:
            w3: Instância Web3
            network: Nome da rede (polygon, ethereum, base)
            required_gas: Quantidade de gas necessária em native token
        
        Returns:
            {
                "has_enough": bool,
                "platform_balance": Decimal,  # saldo da plataforma
                "required_gas": Decimal,       # quanto precisa
                "deficit": Decimal,            # quanto falta (se aplicável)
            }
        """
        try:
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Saldo da plataforma em native token
            platform_balance_wei = w3.eth.get_balance(
                Web3.to_checksum_address(self.platform_address)
            )
            platform_balance = Decimal(str(w3.from_wei(platform_balance_wei, 'ether')))
            
            # Adiciona margem de segurança (para cobrir gas da própria transação de envio)
            # A plataforma precisa do gas para enviar + gas para a transação de envio
            gas_for_platform_tx = Decimal("0.001")  # Gas para a TX de envio
            total_required = required_gas + gas_for_platform_tx
            
            has_enough = platform_balance >= total_required
            deficit = max(Decimal("0"), total_required - platform_balance)
            
            logger.info(f"💰 Saldo plataforma {config['native_symbol']}: {platform_balance}")
            logger.info(f"   Necessário: {total_required} (gas: {required_gas} + tx: {gas_for_platform_tx})")
            logger.info(f"   Suficiente: {has_enough}")
            
            return {
                "has_enough": has_enough,
                "platform_balance": platform_balance,
                "required_gas": total_required,
                "deficit": deficit,
                "native_symbol": config["native_symbol"],
            }
            
        except Exception as e:
            logger.error(f"❌ Erro verificando saldo da plataforma: {str(e)}")
            return {
                "has_enough": False,
                "platform_balance": Decimal("0"),
                "required_gas": required_gas,
                "deficit": required_gas,
                "error": str(e)
            }
    
    def calculate_gas_fee_brl(
        self,
        gas_amount: Decimal,
        network: str
    ) -> Dict[str, Any]:
        """
        Calcula a taxa de rede em BRL para descontar do usuário.
        
        Returns:
            {
                "gas_amount_native": Decimal,   # ex: 0.005 MATIC
                "gas_amount_brl": Decimal,       # ex: R$ 0.0175
                "admin_fee_brl": Decimal,        # ex: R$ 0.00175 (10%)
                "total_fee_brl": Decimal,        # ex: R$ 0.01925
                "native_symbol": str,            # ex: "MATIC"
            }
        """
        try:
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Converte gas para BRL
            gas_brl = gas_amount * config["native_to_brl_rate"]
            
            # Taxa administrativa
            admin_fee = gas_brl * config["admin_fee_percent"]
            
            # Total
            total_fee = gas_brl + admin_fee
            
            # Arredonda para cima (2 casas decimais)
            total_fee = total_fee.quantize(Decimal("0.01"), rounding=ROUND_UP)
            
            return {
                "gas_amount_native": gas_amount,
                "gas_amount_brl": gas_brl.quantize(Decimal("0.01"), rounding=ROUND_UP),
                "admin_fee_brl": admin_fee.quantize(Decimal("0.01"), rounding=ROUND_UP),
                "total_fee_brl": total_fee,
                "native_symbol": config["native_symbol"],
                "native_to_brl_rate": config["native_to_brl_rate"],
            }
            
        except Exception as e:
            logger.error(f"❌ Erro calculando fee BRL: {str(e)}")
            return {
                "gas_amount_native": Decimal("0"),
                "gas_amount_brl": Decimal("0"),
                "admin_fee_brl": Decimal("0"),
                "total_fee_brl": Decimal("0"),
                "error": str(e)
            }
    
    def send_gas_to_user(
        self,
        w3: Web3,
        user_address: str,
        gas_amount: Decimal,
        network: str
    ) -> Dict[str, Any]:
        """
        Envia gas (MATIC/ETH) da plataforma para o usuário.
        
        Returns:
            {
                "success": bool,
                "tx_hash": str ou None,
                "amount_sent": Decimal,
                "error": str ou None
            }
        """
        try:
            if not self.platform_private_key:
                return {
                    "success": False,
                    "tx_hash": None,
                    "amount_sent": Decimal("0"),
                    "error": "PLATFORM_WALLET_PRIVATE_KEY não configurada"
                }
            
            config = self.NETWORK_CONFIG[network.lower()]
            
            # Converte para Wei
            amount_wei = w3.to_wei(float(gas_amount), 'ether')
            
            # Prepara a transação
            nonce = w3.eth.get_transaction_count(
                Web3.to_checksum_address(self.platform_address)
            )
            gas_price = w3.eth.gas_price
            
            transaction = {
                'nonce': nonce,
                'to': Web3.to_checksum_address(user_address),
                'value': amount_wei,
                'gas': config["gas_limit_transfer"],
                'gasPrice': gas_price,
                'chainId': config["chain_id"]
            }
            
            # Assina com a chave da plataforma
            signed_txn = w3.eth.account.sign_transaction(
                transaction,
                self.platform_private_key
            )
            
            # Envia (compatível com diferentes versões do web3.py)
            raw_tx = getattr(signed_txn, 'rawTransaction', None) or getattr(signed_txn, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = w3.to_hex(tx_hash)
            
            logger.info(f"✅ Gas enviado para usuário! TX: {tx_hash_hex}")
            logger.info(f"   Quantidade: {gas_amount} {config['native_symbol']}")
            logger.info(f"   Destino: {user_address}")
            
            return {
                "success": True,
                "tx_hash": tx_hash_hex,
                "amount_sent": gas_amount,
                "native_symbol": config["native_symbol"],
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Erro enviando gas: {str(e)}")
            return {
                "success": False,
                "tx_hash": None,
                "amount_sent": Decimal("0"),
                "error": str(e)
            }
    
    def wait_for_gas_confirmation(
        self,
        w3: Web3,
        tx_hash: str,
        timeout: int = 120
    ) -> bool:
        """
        Aguarda confirmação da transação de gas.
        
        Args:
            w3: Instância Web3
            tx_hash: Hash da transação
            timeout: Tempo máximo em segundos
        
        Returns:
            True se confirmada, False se falhou ou timeout
        """
        try:
            logger.info(f"⏳ Aguardando confirmação do gas... TX: {tx_hash}")
            
            receipt = w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=timeout
            )
            
            if receipt['status'] == 1:
                logger.info(f"✅ Gas confirmado! Block: {receipt['blockNumber']}")
                return True
            else:
                logger.error("❌ Transação de gas falhou!")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro aguardando confirmação: {str(e)}")
            return False
    
    def sponsor_gas_for_sell(
        self,
        w3: Web3,
        user_address: str,
        network: str,
        is_erc20: bool = True
    ) -> Dict[str, Any]:
        """
        MÉTODO PRINCIPAL: Patrocina gas para transação de VENDA.
        
        Fluxo completo:
        1. Verifica se usuário precisa de gas
        2. Se sim, calcula quanto enviar
        3. Envia gas da plataforma para usuário
        4. Aguarda confirmação
        5. Retorna taxa em BRL para descontar
        
        Returns:
            {
                "gas_sponsored": bool,          # True se gas foi enviado
                "gas_tx_hash": str ou None,      # TX do envio de gas
                "gas_amount_sent": Decimal,      # Quanto foi enviado
                "network_fee_brl": Decimal,      # Taxa para descontar do BRL
                "fee_breakdown": {               # Detalhamento da taxa
                    "gas_cost_brl": Decimal,
                    "admin_fee_brl": Decimal,
                    "total_brl": Decimal,
                },
                "native_symbol": str,
                "error": str ou None
            }
        """
        try:
            logger.info(f"🔍 Verificando necessidade de gas sponsor para {user_address}")
            
            config = self.NETWORK_CONFIG[network.lower()]
            
            # 1. Verifica saldo de gas do usuário
            gas_check = self.check_user_gas_balance(
                w3=w3,
                user_address=user_address,
                network=network,
                is_erc20=is_erc20
            )
            
            logger.info(f"💰 Gas check: {gas_check}")
            
            # 2. Se usuário tem gas suficiente, não precisa sponsor
            if gas_check["has_enough_gas"]:
                logger.info(f"✅ Usuário já tem gas suficiente: {gas_check['current_balance']} {config['native_symbol']}")
                return {
                    "gas_sponsored": False,
                    "gas_tx_hash": None,
                    "gas_amount_sent": Decimal("0"),
                    "network_fee_brl": Decimal("0"),
                    "fee_breakdown": {
                        "gas_cost_brl": Decimal("0"),
                        "admin_fee_brl": Decimal("0"),
                        "total_brl": Decimal("0"),
                    },
                    "native_symbol": config["native_symbol"],
                    "error": None
                }
            
            # 3. Calcula quanto gas enviar (déficit + margem extra)
            gas_to_send = gas_check["gas_deficit"] * Decimal("1.2")  # 20% extra de segurança
            
            # Mínimo de 0.01 para evitar micro-transações
            gas_to_send = max(gas_to_send, Decimal("0.01"))
            
            logger.info(f"📤 Precisa enviar {gas_to_send} {config['native_symbol']} para {user_address}")
            
            # 4. ⚠️ VERIFICA SE A PLATAFORMA TEM SALDO PARA PATROCINAR
            platform_check = self.check_platform_gas_balance(
                w3=w3,
                network=network,
                required_gas=gas_to_send
            )
            
            if not platform_check["has_enough"]:
                error_msg = (
                    f"Saldo insuficiente da plataforma para patrocinar gas. "
                    f"Disponível: {platform_check['platform_balance']:.6f} {config['native_symbol']}, "
                    f"Necessário: {platform_check['required_gas']:.6f} {config['native_symbol']}. "
                    f"Contate o administrador para adicionar fundos na carteira da plataforma."
                )
                logger.error(f"❌ {error_msg}")
                return {
                    "gas_sponsored": False,
                    "gas_tx_hash": None,
                    "gas_amount_sent": Decimal("0"),
                    "network_fee_brl": Decimal("0"),
                    "fee_breakdown": None,
                    "native_symbol": config["native_symbol"],
                    "error": error_msg,
                    "platform_balance": platform_check["platform_balance"],
                    "required_gas": platform_check["required_gas"],
                }
            
            logger.info(f"✅ Plataforma tem saldo suficiente: {platform_check['platform_balance']} {config['native_symbol']}")
            
            # 5. Calcula taxa em BRL
            fee_calc = self.calculate_gas_fee_brl(gas_to_send, network)
            
            logger.info(f"💵 Taxa calculada: R$ {fee_calc['total_fee_brl']}")
            
            # 6. Envia gas para o usuário
            send_result = self.send_gas_to_user(
                w3=w3,
                user_address=user_address,
                gas_amount=gas_to_send,
                network=network
            )
            
            if not send_result["success"]:
                return {
                    "gas_sponsored": False,
                    "gas_tx_hash": None,
                    "gas_amount_sent": Decimal("0"),
                    "network_fee_brl": Decimal("0"),
                    "fee_breakdown": None,
                    "native_symbol": config["native_symbol"],
                    "error": send_result.get("error", "Falha ao enviar gas")
                }
            
            # 7. Aguarda confirmação
            confirmed = self.wait_for_gas_confirmation(
                w3=w3,
                tx_hash=send_result["tx_hash"],
                timeout=120
            )
            
            if not confirmed:
                return {
                    "gas_sponsored": False,
                    "gas_tx_hash": send_result["tx_hash"],
                    "gas_amount_sent": gas_to_send,
                    "network_fee_brl": Decimal("0"),
                    "fee_breakdown": None,
                    "native_symbol": config["native_symbol"],
                    "error": "Timeout aguardando confirmação do gas"
                }
            
            # 8. Sucesso!
            logger.info("✅ Gas sponsor completo!")
            logger.info(f"   TX: {send_result['tx_hash']}")
            logger.info(f"   Enviado: {gas_to_send} {config['native_symbol']}")
            logger.info(f"   Taxa BRL: R$ {fee_calc['total_fee_brl']}")
            
            return {
                "gas_sponsored": True,
                "gas_tx_hash": send_result["tx_hash"],
                "gas_amount_sent": gas_to_send,
                "network_fee_brl": fee_calc["total_fee_brl"],
                "fee_breakdown": {
                    "gas_cost_brl": fee_calc["gas_amount_brl"],
                    "admin_fee_brl": fee_calc["admin_fee_brl"],
                    "total_brl": fee_calc["total_fee_brl"],
                },
                "native_symbol": config["native_symbol"],
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no gas sponsor: {str(e)}")
            return {
                "gas_sponsored": False,
                "gas_tx_hash": None,
                "gas_amount_sent": Decimal("0"),
                "network_fee_brl": Decimal("0"),
                "fee_breakdown": None,
                "native_symbol": self.NETWORK_CONFIG.get(network.lower(), {}).get("native_symbol", ""),
                "error": str(e)
            }
    
    def get_platform_gas_balance(self, network: str) -> Dict[str, Any]:
        """
        Verifica saldo de gas da carteira da plataforma.
        Útil para monitoramento e alertas.
        
        Returns:
            {
                "balance": Decimal,
                "native_symbol": str,
                "low_balance_alert": bool,  # True se < 0.1
            }
        """
        try:
            w3 = self.get_web3(network)
            if not w3:
                return {"error": f"Não conectou à rede {network}"}
            
            config = self.NETWORK_CONFIG[network.lower()]
            
            balance_wei = w3.eth.get_balance(
                Web3.to_checksum_address(self.platform_address)
            )
            balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
            
            return {
                "balance": balance,
                "native_symbol": config["native_symbol"],
                "low_balance_alert": balance < Decimal("0.1"),
                "platform_address": self.platform_address,
            }
            
        except Exception as e:
            logger.error(f"❌ Erro verificando saldo da plataforma: {str(e)}")
            return {"error": str(e)}


# Instância singleton
gas_sponsor_service = GasSponsorService()
