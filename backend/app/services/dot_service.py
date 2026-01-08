"""
🔴 Polkadot Transaction Service
================================

Serviço para envio automático de DOT usando APIs GRATUITAS.
Polkadot usa curva sr25519 (Schnorr) diferente do Bitcoin/Ethereum.

APIs usadas:
- Subscan API (gratuita)
- Polkadot RPC público

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import asyncio
import requests
import logging
from decimal import Decimal
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================
PLANCK = 10_000_000_000  # 1 DOT = 10^10 planck

# APIs
POLKADOT_RPC = "https://rpc.polkadot.io"
SUBSCAN_API = "https://polkadot.api.subscan.io"

# Explorers
SUBSCAN_EXPLORER = "https://polkadot.subscan.io/extrinsic"
POLKASCAN_EXPLORER = "https://explorer.polkascan.io/polkadot/transaction"


@dataclass
class DOTTransactionResult:
    """Resultado de uma transação Polkadot."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0  # em planck
    explorer_url: Optional[str] = None


class DOTService:
    """
    Serviço para transações Polkadot.
    Usa APIs públicas gratuitas.
    """
    
    def __init__(self):
        self.rpc_url = POLKADOT_RPC
        self.subscan_api = SUBSCAN_API
        self.explorer_base = SUBSCAN_EXPLORER
        logger.info("🔴 DOTService initialized (mainnet)")
    
    def _rpc_call(self, method: str, params: list = None) -> Optional[Dict]:
        """Faz uma chamada RPC para o node Polkadot."""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params or []
            }
            
            response = requests.post(
                self.rpc_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'error' in result:
                    logger.error(f"❌ RPC error: {result['error']}")
                    return None
                return result.get('result')
            
            return None
            
        except Exception as e:
            logger.error(f"❌ RPC call failed: {e}")
            return None
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço Polkadot (começa com 1, 47-48 chars)."""
        if not address:
            return False
        # Polkadot mainnet começa com 1
        if not address.startswith('1'):
            return False
        if len(address) < 45 or len(address) > 50:
            return False
        return True
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo de um endereço DOT via Subscan API."""
        try:
            response = requests.post(
                f"{self.subscan_api}/api/v2/scan/account",
                json={"address": address},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    balance_str = data.get('data', {}).get('account', {}).get('balance', '0')
                    balance_planck = int(float(balance_str) * PLANCK)
                    return Decimal(str(balance_planck)) / Decimal(str(PLANCK))
            return None
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo DOT: {e}")
            return None
    
    def get_nonce(self, address: str) -> Optional[int]:
        """Obtém o nonce da conta."""
        result = self._rpc_call("system_accountNextIndex", [address])
        return result
    
    def get_runtime_version(self) -> Optional[Dict]:
        """Obtém versão do runtime."""
        return self._rpc_call("state_getRuntimeVersion")
    
    def get_genesis_hash(self) -> Optional[str]:
        """Obtém genesis hash."""
        return self._rpc_call("chain_getBlockHash", [0])
    
    async def send_dot(
        self,
        from_address: str,
        to_address: str,
        amount_dot: float,
        private_key_hex: str
    ) -> DOTTransactionResult:
        """
        Envia DOT de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_dot: Quantidade em DOT
            private_key_hex: Chave privada em hex (seed de 32 bytes)
            
        Returns:
            DOTTransactionResult com status da transação
        """
        try:
            logger.info(f"🔴 Enviando {amount_dot} DOT de {from_address[:10]}... para {to_address[:10]}...")
            
            # Usar substrate-interface para criar e assinar transação
            try:
                from substrateinterface import SubstrateInterface, Keypair
                from substrateinterface.exceptions import SubstrateRequestException
                
                # Conectar ao node
                substrate = SubstrateInterface(
                    url=self.rpc_url,
                    ss58_format=0,  # Polkadot
                    type_registry_preset='polkadot'
                )
                
                # Criar keypair
                if private_key_hex.startswith('0x'):
                    private_key_hex = private_key_hex[2:]
                
                keypair = Keypair.create_from_seed(bytes.fromhex(private_key_hex))
                
                # Quantidade em planck
                amount_planck = int(amount_dot * PLANCK)
                
                # Criar call
                call = substrate.compose_call(
                    call_module='Balances',
                    call_function='transfer_keep_alive',
                    call_params={
                        'dest': to_address,
                        'value': amount_planck
                    }
                )
                
                # Criar extrinsic
                extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
                
                # Enviar
                receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
                
                if receipt.is_success:
                    tx_hash = receipt.extrinsic_hash
                    logger.info(f"✅ DOT enviado! TX: {tx_hash}")
                    
                    return DOTTransactionResult(
                        success=True,
                        tx_hash=tx_hash,
                        fee_paid=int(receipt.total_fee_amount or 0),
                        explorer_url=f"{self.explorer_base}/{tx_hash}"
                    )
                else:
                    return DOTTransactionResult(
                        success=False,
                        error=f"Transação falhou: {receipt.error_message}"
                    )
                    
            except ImportError:
                logger.error("❌ Biblioteca 'substrate-interface' não instalada!")
                return DOTTransactionResult(
                    success=False,
                    error="Biblioteca 'substrate-interface' não instalada. Execute: pip install substrate-interface"
                )
            except SubstrateRequestException as e:
                return DOTTransactionResult(
                    success=False,
                    error=f"Erro na requisição: {str(e)}"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando DOT: {e}")
            return DOTTransactionResult(
                success=False,
                error=str(e)
            )


# ============================================
# INSTÂNCIA SINGLETON
# ============================================
dot_service = DOTService()
