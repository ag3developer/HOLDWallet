"""
🔄 Swap Service Principal
=========================

Orquestra o fluxo completo de swap:

FLUXO CORRETO:
1. User Wallet → System Wallet (depósito do token de origem)
2. System Wallet → DEX (executa swap via 1inch)
3. System Wallet → User Wallet (envia resultado MENOS a taxa)
4. Taxa FICA na System Wallet

Modelo: HOLDWallet controla System Wallets que executam os swaps.
"""

import logging
import uuid
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import os

from .oneinch_service import oneinch_service, NATIVE_TOKEN_ADDRESS
from .fee_service import swap_fee_service
from app.services.blockchain_signer import BlockchainSigner
from app.services.price_aggregator import price_aggregator

logger = logging.getLogger(__name__)

# Cache de cotações (em produção, usar Redis)
quote_cache: Dict[str, Dict] = {}

# Configuração das System Wallets (carteiras da plataforma)
# Em produção, buscar do banco de dados ou vault seguro
SYSTEM_WALLETS = {
    # chain_id: { address, private_key_env }
    137: {  # Polygon
        "address": os.getenv("SYSTEM_WALLET_POLYGON_ADDRESS", ""),
        "private_key_env": "SYSTEM_WALLET_POLYGON_PRIVATE_KEY",
    },
    56: {  # BSC
        "address": os.getenv("SYSTEM_WALLET_BSC_ADDRESS", ""),
        "private_key_env": "SYSTEM_WALLET_BSC_PRIVATE_KEY",
    },
    1: {  # Ethereum
        "address": os.getenv("SYSTEM_WALLET_ETH_ADDRESS", ""),
        "private_key_env": "SYSTEM_WALLET_ETH_PRIVATE_KEY",
    },
    42161: {  # Arbitrum
        "address": os.getenv("SYSTEM_WALLET_ARBITRUM_ADDRESS", ""),
        "private_key_env": "SYSTEM_WALLET_ARBITRUM_PRIVATE_KEY",
    },
    8453: {  # Base
        "address": os.getenv("SYSTEM_WALLET_BASE_ADDRESS", ""),
        "private_key_env": "SYSTEM_WALLET_BASE_PRIVATE_KEY",
    },
}


class SwapService:
    """
    Serviço principal de swap.
    
    Fluxo:
    1. Quote: Obtém cotação do 1inch usando endereço da System Wallet
    2. Execute: 
       a) User envia tokens para System Wallet
       b) System Wallet executa swap no DEX
       c) System Wallet envia resultado para User (menos taxa)
       d) Taxa fica retida na System Wallet
    """
    
    def __init__(self):
        self.oneinch = oneinch_service
        self.fee_service = swap_fee_service
        self.signer = BlockchainSigner()
        self.quote_validity_seconds = 60
    
    def get_system_wallet(self, chain_id: int) -> Dict[str, str]:
        """Obter endereço e chave da System Wallet para uma rede."""
        wallet_config = SYSTEM_WALLETS.get(chain_id)
        if not wallet_config:
            raise ValueError(f"System Wallet não configurada para chain {chain_id}")
        
        address = wallet_config["address"]
        private_key = os.getenv(wallet_config["private_key_env"], "")
        
        if not address or not private_key:
            raise ValueError(f"System Wallet não configurada para chain {chain_id}")
        
        return {
            "address": address,
            "private_key": private_key,
        }
        
    async def get_quote(
        self,
        chain_id: int,
        from_token: str,
        to_token: str,
        from_amount: str,
        user_address: str,
        user_vip_level: str = "bronze",
        slippage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Obter cotação completa para swap.
        
        Args:
            chain_id: ID da rede
            from_token: Endereço do token de origem
            to_token: Endereço do token de destino
            from_amount: Quantidade em unidades mínimas (wei)
            user_address: Endereço da carteira do usuário
            user_vip_level: Nível VIP do usuário
            slippage: Tolerância de slippage em %
            
        Returns:
            Cotação com detalhes de taxas e valores
        """
        try:
            logger.info(f"🔄 Iniciando cotação: {from_token[:10]}... → {to_token[:10]}...")
            
            # 0. Obter System Wallet para esta rede
            try:
                system_wallet = self.get_system_wallet(chain_id)
                system_wallet_address = system_wallet["address"]
            except ValueError as e:
                return {
                    "success": False,
                    "error": "network_not_supported",
                    "message": str(e),
                }
            
            # 1. Obter cotação do 1inch (usando endereço da SYSTEM WALLET)
            quote_result = await self.oneinch.get_quote(
                chain_id=chain_id,
                from_token=from_token,
                to_token=to_token,
                amount=from_amount,
                slippage=slippage,
            )
            
            if not quote_result.get("success"):
                return {
                    "success": False,
                    "error": quote_result.get("error", "Failed to get quote"),
                    "details": quote_result.get("details"),
                }
            
            to_amount = Decimal(quote_result.get("to_amount", "0"))
            
            # 2. Calcular taxa HOLDWallet
            fee_percentage = self.fee_service.get_fee_percentage(
                from_token=from_token,
                to_token=to_token,
                chain_id=chain_id,
                user_vip_level=user_vip_level,
            )
            
            fee_calc = self.fee_service.calculate_fee(
                amount=to_amount,
                fee_percentage=fee_percentage,
            )
            
            # 3. Obter preços em USD para validação de limites
            from_token_symbol = await self._get_token_symbol(from_token, chain_id)
            to_token_symbol = await self._get_token_symbol(to_token, chain_id)
            
            prices = await price_aggregator.get_prices([from_token_symbol, to_token_symbol], "usd")
            from_price_usd = prices.get(from_token_symbol, {}).get("price", 0)
            to_price_usd = prices.get(to_token_symbol, {}).get("price", 0)
            
            # Calcular valor em USD
            from_amount_decimal = Decimal(from_amount) / Decimal(10**18)  # Assumindo 18 decimais
            swap_value_usd = from_amount_decimal * Decimal(str(from_price_usd))
            
            # 4. Validar limites
            validation = self.fee_service.validate_swap_limits(
                amount_usd=swap_value_usd,
                user_swaps_today=0,  # TODO: Buscar do banco
            )
            
            if not validation.get("valid"):
                return {
                    "success": False,
                    "error": validation.get("error"),
                    "message": validation.get("message"),
                }
            
            # 5. Gerar quote_id e salvar no cache
            quote_id = f"q_{uuid.uuid4().hex[:12]}"
            expires_at = datetime.now() + timedelta(seconds=self.quote_validity_seconds)
            
            quote_data = {
                "quote_id": quote_id,
                "chain_id": chain_id,
                "from_token": from_token,
                "to_token": to_token,
                "from_amount": from_amount,
                "to_amount_gross": str(to_amount),
                "to_amount_net": str(fee_calc["net_amount"]),
                "fee_percentage": float(fee_percentage),
                "fee_amount": str(fee_calc["fee_amount"]),
                "user_address": user_address,
                "slippage": slippage,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now().isoformat(),
                "oneinch_data": quote_result,
            }
            
            # Salvar no cache
            quote_cache[quote_id] = quote_data
            
            # 6. Montar resposta
            return {
                "success": True,
                "quote_id": quote_id,
                "from_token": {
                    "address": from_token,
                    "symbol": from_token_symbol,
                    "amount": from_amount,
                    "amount_usd": float(swap_value_usd),
                },
                "to_token": {
                    "address": to_token,
                    "symbol": to_token_symbol,
                    "amount_gross": str(to_amount),
                    "amount_net": str(fee_calc["net_amount"]),
                },
                "fee": {
                    "percentage": float(fee_percentage * 100),
                    "amount": str(fee_calc["fee_amount"]),
                    "amount_usd": float(Decimal(str(fee_calc["fee_amount"])) * Decimal(str(to_price_usd)) / Decimal(10**18)),
                },
                "rate": float(to_amount / Decimal(from_amount)) if Decimal(from_amount) > 0 else 0,
                "gas_estimate": quote_result.get("gas_estimate", 200000),
                "slippage": slippage,
                "expires_at": expires_at.isoformat(),
                "valid_for_seconds": self.quote_validity_seconds,
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter cotação: {e}")
            return {
                "success": False,
                "error": "quote_failed",
                "message": str(e),
            }
    
    async def execute_swap(
        self,
        quote_id: str,
        user_private_key: str,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Executar swap baseado em uma cotação.
        
        FLUXO CORRETO:
        1. User Wallet → System Wallet (depósito do from_token)
        2. System Wallet → DEX (swap via 1inch)
        3. System Wallet → User Wallet (enviar to_token MENOS a taxa)
        4. Taxa FICA na System Wallet
        
        Args:
            quote_id: ID da cotação
            user_private_key: Chave privada do usuário (custodial)
            db: Sessão do banco
            
        Returns:
            Resultado da execução
        """
        try:
            # 1. Buscar cotação do cache
            quote_data = quote_cache.get(quote_id)
            if not quote_data:
                return {
                    "success": False,
                    "error": "quote_not_found",
                    "message": "Cotação não encontrada ou expirada",
                }
            
            # 2. Verificar se não expirou
            expires_at = datetime.fromisoformat(quote_data["expires_at"])
            if datetime.now() > expires_at:
                return {
                    "success": False,
                    "error": "quote_expired",
                    "message": "Cotação expirada. Solicite uma nova.",
                }
            
            chain_id = quote_data["chain_id"]
            user_address = quote_data["user_address"]
            from_token = quote_data["from_token"]
            to_token = quote_data["to_token"]
            from_amount = quote_data["from_amount"]
            to_amount_net = quote_data["to_amount_net"]  # Valor que o user vai receber
            fee_amount = quote_data["fee_amount"]  # Taxa que fica na System Wallet
            
            logger.info(f"🔄 Executando swap {quote_id}: {from_token[:10]}... → {to_token[:10]}...")
            
            # 3. Obter System Wallet
            try:
                system_wallet = self.get_system_wallet(chain_id)
                system_wallet_address = system_wallet["address"]
                system_wallet_private_key = system_wallet["private_key"]
            except ValueError as e:
                return {
                    "success": False,
                    "error": "network_not_supported",
                    "message": str(e),
                }
            
            # ══════════════════════════════════════════════════════════════
            # PASSO 1: User Wallet → System Wallet (Depósito)
            # ══════════════════════════════════════════════════════════════
            logger.info(f"📥 PASSO 1: Transferindo {from_amount} do User para System Wallet...")
            
            deposit_tx_hash = await self._transfer_token(
                chain_id=chain_id,
                token_address=from_token,
                from_address=user_address,
                to_address=system_wallet_address,
                amount=from_amount,
                private_key=user_private_key,
            )
            
            if not deposit_tx_hash:
                return {
                    "success": False,
                    "error": "deposit_failed",
                    "message": "Falha ao transferir tokens para System Wallet",
                }
            
            logger.info(f"✅ Depósito TX: {deposit_tx_hash}")
            
            # ══════════════════════════════════════════════════════════════
            # PASSO 2: System Wallet executa Swap no DEX
            # ══════════════════════════════════════════════════════════════
            logger.info(f"🔄 PASSO 2: System Wallet executando swap no 1inch...")
            
            # 2a. Aprovar token na System Wallet (se necessário)
            if not self.oneinch.is_native_token(from_token):
                allowance_result = await self.oneinch.check_allowance(
                    chain_id=chain_id,
                    token_address=from_token,
                    wallet_address=system_wallet_address,
                )
                
                current_allowance = int(allowance_result.get("allowance", "0"))
                required_amount = int(from_amount)
                
                if current_allowance < required_amount:
                    logger.info(f"📝 Aprovando token na System Wallet...")
                    approve_result = await self._approve_token(
                        chain_id=chain_id,
                        token_address=from_token,
                        user_address=system_wallet_address,
                        private_key=system_wallet_private_key,
                        amount=from_amount,
                    )
                    
                    if not approve_result.get("success"):
                        # Reverter: devolver tokens ao usuário
                        logger.error(f"❌ Falha no approve, revertendo...")
                        await self._transfer_token(
                            chain_id=chain_id,
                            token_address=from_token,
                            from_address=system_wallet_address,
                            to_address=user_address,
                            amount=from_amount,
                            private_key=system_wallet_private_key,
                        )
                        return {
                            "success": False,
                            "error": "approve_failed",
                            "message": approve_result.get("error"),
                        }
            
            # 2b. Obter dados do swap do 1inch (usando System Wallet)
            swap_data = await self.oneinch.get_swap_data(
                chain_id=chain_id,
                from_token=from_token,
                to_token=to_token,
                amount=from_amount,
                from_address=system_wallet_address,  # System Wallet executa!
                slippage=quote_data["slippage"],
            )
            
            if not swap_data.get("success"):
                # Reverter: devolver tokens ao usuário
                logger.error(f"❌ Falha ao obter swap data, revertendo...")
                await self._transfer_token(
                    chain_id=chain_id,
                    token_address=from_token,
                    from_address=system_wallet_address,
                    to_address=user_address,
                    amount=from_amount,
                    private_key=system_wallet_private_key,
                )
                return {
                    "success": False,
                    "error": "swap_data_failed",
                    "message": swap_data.get("error"),
                }
            
            # 2c. Executar transação de swap (System Wallet → DEX)
            tx_data = swap_data["tx"]
            swap_tx_hash = await self._send_transaction(
                chain_id=chain_id,
                from_address=system_wallet_address,  # System Wallet!
                to_address=tx_data["to"],
                value=tx_data.get("value", "0"),
                data=tx_data["data"],
                gas=tx_data.get("gas", 300000),
                private_key=system_wallet_private_key,  # Chave da System Wallet!
            )
            
            if not swap_tx_hash:
                # Reverter: devolver tokens ao usuário
                logger.error(f"❌ Falha no swap, revertendo...")
                await self._transfer_token(
                    chain_id=chain_id,
                    token_address=from_token,
                    from_address=system_wallet_address,
                    to_address=user_address,
                    amount=from_amount,
                    private_key=system_wallet_private_key,
                )
                return {
                    "success": False,
                    "error": "swap_tx_failed",
                    "message": "Falha ao executar swap no DEX",
                }
            
            logger.info(f"✅ Swap TX: {swap_tx_hash}")
            
            # ══════════════════════════════════════════════════════════════
            # PASSO 3: System Wallet → User Wallet (enviar resultado MENOS taxa)
            # ══════════════════════════════════════════════════════════════
            logger.info(f"📤 PASSO 3: Enviando {to_amount_net} para User (taxa {fee_amount} fica na System Wallet)...")
            
            withdraw_tx_hash = await self._transfer_token(
                chain_id=chain_id,
                token_address=to_token,
                from_address=system_wallet_address,
                to_address=user_address,
                amount=to_amount_net,  # Valor MENOS a taxa!
                private_key=system_wallet_private_key,
            )
            
            if not withdraw_tx_hash:
                # CRÍTICO: Swap executou mas não conseguiu enviar ao user
                # Marcar para resolução manual
                logger.error(f"� CRÍTICO: Swap executou mas falhou ao enviar ao usuário!")
                return {
                    "success": False,
                    "error": "withdraw_failed",
                    "message": "Swap executado mas falha ao enviar. Suporte irá resolver.",
                    "swap_tx_hash": swap_tx_hash,
                    "requires_manual_resolution": True,
                }
            
            logger.info(f"✅ Withdraw TX: {withdraw_tx_hash}")
            
            # ══════════════════════════════════════════════════════════════
            # SUCESSO! Taxa já ficou na System Wallet automaticamente
            # ══════════════════════════════════════════════════════════════
            swap_id = f"sw_{uuid.uuid4().hex[:12]}"
            
            logger.info(f"🎉 Swap {swap_id} completo! Taxa {fee_amount} retida na System Wallet")
            
            # Limpar cotação do cache
            del quote_cache[quote_id]
            
            return {
                "success": True,
                "swap_id": swap_id,
                "quote_id": quote_id,
                "status": "completed",
                "transactions": {
                    "deposit": deposit_tx_hash,
                    "swap": swap_tx_hash,
                    "withdraw": withdraw_tx_hash,
                },
                "from_token": from_token,
                "to_token": to_token,
                "from_amount": from_amount,
                "to_amount_received": to_amount_net,
                "fee_amount": fee_amount,
                "fee_retained_in": system_wallet_address,
                "chain_id": chain_id,
                "created_at": datetime.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao executar swap: {e}")
            return {
                "success": False,
                "error": "swap_execution_failed",
                "message": str(e),
            }
    
    async def _approve_token(
        self,
        chain_id: int,
        token_address: str,
        user_address: str,
        private_key: str,
        amount: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Aprovar token para o router do 1inch."""
        try:
            approve_data = await self.oneinch.get_approve_data(
                chain_id=chain_id,
                token_address=token_address,
                amount=amount,
            )
            
            if not approve_data.get("success"):
                return approve_data
            
            tx_data = approve_data["tx"]
            tx_hash = await self._send_transaction(
                chain_id=chain_id,
                from_address=user_address,
                to_address=tx_data["to"],
                value="0",
                data=tx_data["data"],
                gas=tx_data.get("gas", 50000),
                private_key=private_key,
            )
            
            if tx_hash:
                logger.info(f"✅ Approve TX enviado: {tx_hash}")
                # Aguardar confirmação seria feito aqui em produção
                return {"success": True, "tx_hash": tx_hash}
            else:
                return {"success": False, "error": "Failed to send approve tx"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _transfer_token(
        self,
        chain_id: int,
        token_address: str,
        from_address: str,
        to_address: str,
        amount: str,
        private_key: str,
    ) -> Optional[str]:
        """
        Transferir tokens ERC20 ou nativos.
        
        Args:
            chain_id: ID da rede
            token_address: Endereço do token (ou NATIVE para moeda nativa)
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount: Quantidade em unidades mínimas (wei)
            private_key: Chave privada para assinar
            
        Returns:
            Hash da transação ou None se falhar
        """
        try:
            # Se for token nativo, fazer transfer simples
            if self.oneinch.is_native_token(token_address):
                tx_hash = await self._send_transaction(
                    chain_id=chain_id,
                    from_address=from_address,
                    to_address=to_address,
                    value=amount,
                    data="0x",
                    gas=21000,
                    private_key=private_key,
                )
                return tx_hash
            
            # Se for ERC20, chamar transfer()
            # ABI do transfer: transfer(address to, uint256 amount)
            # Function selector: 0xa9059cbb
            to_address_padded = to_address[2:].lower().zfill(64)
            amount_hex = hex(int(amount))[2:].zfill(64)
            transfer_data = f"0xa9059cbb{to_address_padded}{amount_hex}"
            
            tx_hash = await self._send_transaction(
                chain_id=chain_id,
                from_address=from_address,
                to_address=token_address,  # Contrato do token
                value="0",
                data=transfer_data,
                gas=65000,
                private_key=private_key,
            )
            
            return tx_hash
            
        except Exception as e:
            logger.error(f"❌ Erro ao transferir token: {e}")
            return None
    
    async def _collect_fee(
        self,
        chain_id: int,
        token_address: str,
        from_address: str,
        fee_amount: str,
        private_key: str,
    ) -> Optional[str]:
        """
        Coletar taxa do swap.
        
        Transfere a taxa do token recebido para a FEE_WALLET.
        Este é o passo final do fluxo custodial.
        
        Args:
            chain_id: ID da rede
            token_address: Endereço do token a transferir
            from_address: Carteira do usuário
            fee_amount: Valor da taxa em unidades mínimas
            private_key: Chave privada do usuário
            
        Returns:
            Hash da transação ou None se falhar
        """
        try:
            # Endereço da FEE Wallet (deve vir de config/env)
            fee_wallets = {
                1: "0x...",      # Ethereum - TODO: Configurar
                137: "0x...",    # Polygon - TODO: Configurar
                56: "0x...",     # BSC - TODO: Configurar
                42161: "0x...",  # Arbitrum - TODO: Configurar
                8453: "0x...",   # Base - TODO: Configurar
            }
            
            fee_wallet = fee_wallets.get(chain_id)
            if not fee_wallet or fee_wallet == "0x...":
                logger.warning(f"⚠️ FEE_WALLET não configurada para chain {chain_id}")
                return None
            
            # Se for token nativo, fazer transfer simples
            if self.oneinch.is_native_token(token_address):
                tx_hash = await self._send_transaction(
                    chain_id=chain_id,
                    from_address=from_address,
                    to_address=fee_wallet,
                    value=fee_amount,
                    data="0x",
                    gas=21000,
                    private_key=private_key,
                )
                return tx_hash
            
            # Se for ERC20, chamar transfer()
            # ABI do transfer: transfer(address to, uint256 amount)
            # Function selector: 0xa9059cbb
            to_address_padded = fee_wallet[2:].lower().zfill(64)
            amount_hex = hex(int(fee_amount))[2:].zfill(64)
            transfer_data = f"0xa9059cbb{to_address_padded}{amount_hex}"
            
            tx_hash = await self._send_transaction(
                chain_id=chain_id,
                from_address=from_address,
                to_address=token_address,  # Contrato do token
                value="0",
                data=transfer_data,
                gas=60000,
                private_key=private_key,
            )
            
            return tx_hash
            
        except Exception as e:
            logger.error(f"❌ Erro ao coletar taxa: {e}")
            return None
    
    async def _send_transaction(
        self,
        chain_id: int,
        from_address: str,
        to_address: str,
        value: str,
        data: str,
        gas: int,
        private_key: str,
    ) -> Optional[str]:
        """Enviar transação assinada para a blockchain."""
        try:
            # Mapear chain_id para nome da rede
            chain_names = {
                1: "ethereum",
                137: "polygon",
                56: "bsc",
                42161: "arbitrum",
                8453: "base",
            }
            network = chain_names.get(chain_id, "polygon")
            
            # Usar o blockchain_signer existente para transações com data
            w3 = self.signer.providers.get(network)
            if not w3 or not w3.is_connected():
                logger.error(f"❌ Não conectado à rede {network}")
                return None
            
            # Obter nonce
            nonce = w3.eth.get_transaction_count(w3.to_checksum_address(from_address))
            
            # Obter gas price
            gas_price = w3.eth.gas_price
            
            # Construir transação
            transaction = {
                "nonce": nonce,
                "to": w3.to_checksum_address(to_address),
                "value": int(value) if value else 0,
                "gas": gas,
                "gasPrice": int(gas_price * 1.1),  # 10% a mais para confirmar rápido
                "chainId": chain_id,
                "data": data,
            }
            
            # Assinar e enviar
            signed_tx = w3.eth.account.sign_transaction(transaction, private_key)
            raw_tx = getattr(signed_tx, 'rawTransaction', None) or getattr(signed_tx, 'raw_transaction', None)
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            
            return tx_hash.hex()
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar transação: {e}")
            return None
    
    async def _get_token_symbol(self, token_address: str, chain_id: int) -> str:
        """Obter símbolo do token."""
        if self.oneinch.is_native_token(token_address):
            native_symbols = {
                1: "ETH",
                137: "MATIC",
                56: "BNB",
                42161: "ETH",
                8453: "ETH",
            }
            return native_symbols.get(chain_id, "ETH")
        
        # TODO: Buscar do 1inch tokens ou cache
        return "TOKEN"
    
    async def get_swap_status(self, swap_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """Obter status de um swap."""
        # TODO: Buscar do banco de dados
        return {
            "swap_id": swap_id,
            "status": "pending",
            "message": "Aguardando confirmação na blockchain",
        }
    
    async def get_user_history(
        self, 
        user_id: str, 
        page: int = 1, 
        per_page: int = 20,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Obter histórico de swaps do usuário."""
        # TODO: Buscar do banco de dados
        return {
            "swaps": [],
            "total": 0,
            "page": page,
            "per_page": per_page,
        }
    
    def get_supported_tokens(self, chain_id: int) -> Dict[str, Any]:
        """Obter tokens suportados para uma rede - 16+ tokens multichain."""
        # Lista expandida de tokens populares suportados pelos DEX agregadores
        tokens = {
            137: [  # Polygon - 20+ tokens
                {"symbol": "MATIC", "address": NATIVE_TOKEN_ADDRESS, "name": "Polygon", "decimals": 18},
                {"symbol": "USDT", "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "name": "Tether USD", "decimals": 6},
                {"symbol": "USDC", "address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "name": "USD Coin", "decimals": 6},
                {"symbol": "WETH", "address": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "name": "Wrapped Ether", "decimals": 18},
                {"symbol": "WBTC", "address": "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "name": "Wrapped Bitcoin", "decimals": 8},
                {"symbol": "DAI", "address": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", "name": "Dai Stablecoin", "decimals": 18},
                {"symbol": "LINK", "address": "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", "name": "Chainlink", "decimals": 18},
                {"symbol": "UNI", "address": "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", "name": "Uniswap", "decimals": 18},
                {"symbol": "AAVE", "address": "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", "name": "Aave", "decimals": 18},
                {"symbol": "CRV", "address": "0x172370d5Cd63279eFa6d502DAB29171933a610AF", "name": "Curve DAO", "decimals": 18},
                {"symbol": "SUSHI", "address": "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", "name": "SushiSwap", "decimals": 18},
                {"symbol": "GRT", "address": "0x5fe2B58c013d7601147DcdD68C143A77499f5531", "name": "The Graph", "decimals": 18},
                {"symbol": "SNX", "address": "0x50B728D8D964fd00C2d0AAD81718b71311feF68a", "name": "Synthetix", "decimals": 18},
                {"symbol": "MKR", "address": "0x6f7C932e7684666C9fd1d44527765433e01fF61d", "name": "Maker", "decimals": 18},
                {"symbol": "COMP", "address": "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c", "name": "Compound", "decimals": 18},
                {"symbol": "1INCH", "address": "0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f", "name": "1inch", "decimals": 18},
                {"symbol": "BAL", "address": "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", "name": "Balancer", "decimals": 18},
                {"symbol": "LDO", "address": "0xC3C7d422809852031b44ab29EEC9F1EfF2A58756", "name": "Lido DAO", "decimals": 18},
                {"symbol": "SAND", "address": "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683", "name": "The Sandbox", "decimals": 18},
                {"symbol": "MANA", "address": "0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4", "name": "Decentraland", "decimals": 18},
            ],
            56: [  # BSC - 20+ tokens
                {"symbol": "BNB", "address": NATIVE_TOKEN_ADDRESS, "name": "BNB", "decimals": 18},
                {"symbol": "USDT", "address": "0x55d398326f99059fF775485246999027B3197955", "name": "Tether USD", "decimals": 18},
                {"symbol": "USDC", "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "name": "USD Coin", "decimals": 18},
                {"symbol": "WETH", "address": "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", "name": "Wrapped Ether", "decimals": 18},
                {"symbol": "BTCB", "address": "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", "name": "Bitcoin BEP2", "decimals": 18},
                {"symbol": "DAI", "address": "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", "name": "Dai Stablecoin", "decimals": 18},
                {"symbol": "CAKE", "address": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", "name": "PancakeSwap", "decimals": 18},
                {"symbol": "LINK", "address": "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", "name": "Chainlink", "decimals": 18},
                {"symbol": "UNI", "address": "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", "name": "Uniswap", "decimals": 18},
                {"symbol": "AAVE", "address": "0xfb6115445Bff7b52FeB98650C87f44907E58f802", "name": "Aave", "decimals": 18},
                {"symbol": "DOT", "address": "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", "name": "Polkadot", "decimals": 18},
                {"symbol": "LTC", "address": "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", "name": "Litecoin", "decimals": 18},
                {"symbol": "ADA", "address": "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", "name": "Cardano", "decimals": 18},
                {"symbol": "XRP", "address": "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", "name": "XRP", "decimals": 18},
                {"symbol": "DOGE", "address": "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", "name": "Dogecoin", "decimals": 8},
                {"symbol": "SHIB", "address": "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", "name": "Shiba Inu", "decimals": 18},
                {"symbol": "AVAX", "address": "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", "name": "Avalanche", "decimals": 18},
                {"symbol": "TRX", "address": "0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B", "name": "TRON", "decimals": 18},
                {"symbol": "ATOM", "address": "0x0Eb3a705fc54725037CC9e008bDede697f62F335", "name": "Cosmos", "decimals": 18},
                {"symbol": "FTM", "address": "0xAD29AbB318791D579433D831ed122aFeAf29dcfe", "name": "Fantom", "decimals": 18},
            ],
            42161: [  # Arbitrum - 20+ tokens
                {"symbol": "ETH", "address": NATIVE_TOKEN_ADDRESS, "name": "Ethereum", "decimals": 18},
                {"symbol": "USDT", "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "name": "Tether USD", "decimals": 6},
                {"symbol": "USDC", "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "name": "USD Coin", "decimals": 6},
                {"symbol": "WBTC", "address": "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "name": "Wrapped Bitcoin", "decimals": 8},
                {"symbol": "DAI", "address": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", "name": "Dai Stablecoin", "decimals": 18},
                {"symbol": "ARB", "address": "0x912CE59144191C1204E64559FE8253a0e49E6548", "name": "Arbitrum", "decimals": 18},
                {"symbol": "LINK", "address": "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", "name": "Chainlink", "decimals": 18},
                {"symbol": "UNI", "address": "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", "name": "Uniswap", "decimals": 18},
                {"symbol": "AAVE", "address": "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196", "name": "Aave", "decimals": 18},
                {"symbol": "CRV", "address": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978", "name": "Curve DAO", "decimals": 18},
                {"symbol": "GMX", "address": "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", "name": "GMX", "decimals": 18},
                {"symbol": "GRT", "address": "0x23A941036Ae778Ac51Ab04CEa08Ed6e2FE103614", "name": "The Graph", "decimals": 18},
                {"symbol": "SUSHI", "address": "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A", "name": "SushiSwap", "decimals": 18},
                {"symbol": "COMP", "address": "0x354A6dA3fcde098F8389cad84b0182725c6C91dE", "name": "Compound", "decimals": 18},
                {"symbol": "MKR", "address": "0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879", "name": "Maker", "decimals": 18},
                {"symbol": "LDO", "address": "0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60", "name": "Lido DAO", "decimals": 18},
                {"symbol": "PENDLE", "address": "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8", "name": "Pendle", "decimals": 18},
                {"symbol": "RDNT", "address": "0x3082CC23568eA640225c2467653dB90e9250AaA0", "name": "Radiant", "decimals": 18},
                {"symbol": "MAGIC", "address": "0x539bdE0d7Dbd336b79148AA742883198BBF60342", "name": "Magic", "decimals": 18},
                {"symbol": "GRAIL", "address": "0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8", "name": "Camelot", "decimals": 18},
            ],
            8453: [  # Base - 16+ tokens
                {"symbol": "ETH", "address": NATIVE_TOKEN_ADDRESS, "name": "Ethereum", "decimals": 18},
                {"symbol": "USDC", "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "name": "USD Coin", "decimals": 6},
                {"symbol": "USDbC", "address": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", "name": "USD Base Coin", "decimals": 6},
                {"symbol": "DAI", "address": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", "name": "Dai Stablecoin", "decimals": 18},
                {"symbol": "WETH", "address": "0x4200000000000000000000000000000000000006", "name": "Wrapped Ether", "decimals": 18},
                {"symbol": "cbETH", "address": "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", "name": "Coinbase ETH", "decimals": 18},
                {"symbol": "COMP", "address": "0x9e1028F5F1D5eDE59748FFceE5532509976840E0", "name": "Compound", "decimals": 18},
                {"symbol": "BAL", "address": "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1", "name": "Balancer", "decimals": 18},
                {"symbol": "AERO", "address": "0x940181a94A35A4569E4529A3CDfB74e38FD98631", "name": "Aerodrome", "decimals": 18},
                {"symbol": "BRETT", "address": "0x532f27101965dd16442E59d40670FaF5eBB142E4", "name": "Brett", "decimals": 18},
                {"symbol": "DEGEN", "address": "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "name": "Degen", "decimals": 18},
                {"symbol": "TOSHI", "address": "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4", "name": "Toshi", "decimals": 18},
                {"symbol": "WELL", "address": "0xA88594D404727625A9437C3f886C7643872296AE", "name": "Moonwell", "decimals": 18},
                {"symbol": "SNX", "address": "0x22e6966B799c4D5B13BE962E1D117b56327FDa66", "name": "Synthetix", "decimals": 18},
                {"symbol": "EXTRA", "address": "0x2dAD3a13ef0C6366220f989157009e501e7938F8", "name": "Extra Finance", "decimals": 18},
                {"symbol": "YFI", "address": "0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239", "name": "yearn.finance", "decimals": 18},
            ],
            1: [  # Ethereum Mainnet - 20+ tokens
                {"symbol": "ETH", "address": NATIVE_TOKEN_ADDRESS, "name": "Ethereum", "decimals": 18},
                {"symbol": "USDT", "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "name": "Tether USD", "decimals": 6},
                {"symbol": "USDC", "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "name": "USD Coin", "decimals": 6},
                {"symbol": "WBTC", "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "name": "Wrapped Bitcoin", "decimals": 8},
                {"symbol": "DAI", "address": "0x6B175474E89094C44Da98b954EescdecB5dE52d", "name": "Dai Stablecoin", "decimals": 18},
                {"symbol": "LINK", "address": "0x514910771AF9Ca656af840dff83E8264EcF986CA", "name": "Chainlink", "decimals": 18},
                {"symbol": "UNI", "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "name": "Uniswap", "decimals": 18},
                {"symbol": "AAVE", "address": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", "name": "Aave", "decimals": 18},
                {"symbol": "CRV", "address": "0xD533a949740bb3306d119CC777fa900bA034cd52", "name": "Curve DAO", "decimals": 18},
                {"symbol": "MKR", "address": "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", "name": "Maker", "decimals": 18},
                {"symbol": "COMP", "address": "0xc00e94Cb662C3520282E6f5717214004A7f26888", "name": "Compound", "decimals": 18},
                {"symbol": "SNX", "address": "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", "name": "Synthetix", "decimals": 18},
                {"symbol": "SUSHI", "address": "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", "name": "SushiSwap", "decimals": 18},
                {"symbol": "GRT", "address": "0xc944E90C64B2c07662A292be6244BDf05Cda44a7", "name": "The Graph", "decimals": 18},
                {"symbol": "LDO", "address": "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", "name": "Lido DAO", "decimals": 18},
                {"symbol": "1INCH", "address": "0x111111111117dC0aa78b770fA6A738034120C302", "name": "1inch", "decimals": 18},
                {"symbol": "ENS", "address": "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72", "name": "ENS", "decimals": 18},
                {"symbol": "APE", "address": "0x4d224452801ACEd8B2F0aebE155379bb5D594381", "name": "ApeCoin", "decimals": 18},
                {"symbol": "SHIB", "address": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", "name": "Shiba Inu", "decimals": 18},
                {"symbol": "PEPE", "address": "0x6982508145454Ce325dDbE47a25d4ec3d2311933", "name": "Pepe", "decimals": 18},
            ],
        }
        
        return {
            "chain_id": chain_id,
            "tokens": tokens.get(chain_id, []),
        }


# Singleton
swap_service = SwapService()
