"""
💎 XRP (Ripple) Transaction Service
====================================

Serviço para envio automático de XRP usando APIs GRATUITAS.
XRP usa seu próprio protocolo de consenso.

APIs usadas:
- XRPL.org API (gratuita)
- XRPScan API

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import asyncio
import hashlib
import requests
import logging
import json
from decimal import Decimal
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================
DROPS = 1_000_000  # 1 XRP = 1,000,000 drops

# APIs
XRPL_MAINNET = "https://xrplcluster.com"
XRPL_TESTNET = "https://s.altnet.rippletest.net:51234"

# Explorers
XRPSCAN_EXPLORER = "https://xrpscan.com/tx"
BITHOMP_EXPLORER = "https://bithomp.com/explorer"


@dataclass
class XRPTransactionResult:
    """Resultado de uma transação XRP."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0  # em drops
    explorer_url: Optional[str] = None


class XRPService:
    """
    Serviço para transações XRP.
    Usa API pública XRPL gratuita.
    """
    
    def __init__(self, testnet: bool = False):
        self.testnet = testnet
        self.rpc_url = XRPL_TESTNET if testnet else XRPL_MAINNET
        self.explorer_base = XRPSCAN_EXPLORER
        logger.info(f"💎 XRPService initialized ({'testnet' if testnet else 'mainnet'})")
    
    def _rpc_call(self, method: str, params: Dict = None) -> Optional[Dict]:
        """Faz uma chamada RPC para o node XRPL."""
        try:
            payload = {
                "method": method,
                "params": [params or {}]
            }
            
            response = requests.post(
                self.rpc_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('result', {}).get('status') == 'error':
                    logger.error(f"❌ RPC error: {result['result'].get('error_message')}")
                    return None
                return result.get('result')
            
            return None
            
        except Exception as e:
            logger.error(f"❌ RPC call failed: {e}")
            return None
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço XRP (começa com r, 25-35 chars)."""
        if not address:
            return False
        if not address.startswith('r'):
            return False
        if len(address) < 25 or len(address) > 35:
            return False
        # Validação básica de caracteres base58
        valid_chars = set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
        return all(c in valid_chars for c in address)
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo de um endereço XRP."""
        try:
            result = self._rpc_call("account_info", {
                "account": address,
                "ledger_index": "validated"
            })
            
            if result and 'account_data' in result:
                balance_drops = int(result['account_data'].get('Balance', 0))
                return Decimal(str(balance_drops)) / Decimal(str(DROPS))
            return None
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo XRP: {e}")
            return None
    
    def get_account_sequence(self, address: str) -> Optional[int]:
        """Obtém o sequence number da conta."""
        result = self._rpc_call("account_info", {
            "account": address,
            "ledger_index": "current"
        })
        
        if result and 'account_data' in result:
            return result['account_data'].get('Sequence')
        return None
    
    def get_current_fee(self) -> int:
        """Retorna fee atual em drops."""
        result = self._rpc_call("fee")
        if result and 'drops' in result:
            return int(result['drops'].get('base_fee', 10))
        return 12  # Default 12 drops
    
    async def send_xrp(
        self,
        from_address: str,
        to_address: str,
        amount_xrp: float,
        private_key_hex: str,
        destination_tag: int = None
    ) -> XRPTransactionResult:
        """
        Envia XRP de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_xrp: Quantidade em XRP
            private_key_hex: Chave privada em hex
            destination_tag: Tag de destino (opcional)
            
        Returns:
            XRPTransactionResult com status da transação
        """
        try:
            logger.info(f"💎 Enviando {amount_xrp} XRP de {from_address[:10]}... para {to_address[:10]}...")
            
            # Usar xrpl-py para criar e assinar transação
            try:
                from xrpl.wallet import Wallet
                from xrpl.models.transactions import Payment
                from xrpl.models.amounts import XRPAmount
                from xrpl.transaction import sign, submit_and_wait
                from xrpl.clients import JsonRpcClient
                
                # Criar cliente
                client = JsonRpcClient(self.rpc_url)
                
                # Criar wallet
                wallet = Wallet.from_seed(private_key_hex)
                
                # Criar transação
                amount_drops = str(int(amount_xrp * DROPS))
                
                payment = Payment(
                    account=from_address,
                    destination=to_address,
                    amount=amount_drops
                )
                
                if destination_tag:
                    payment.destination_tag = destination_tag
                
                # Assinar e enviar
                response = submit_and_wait(payment, client, wallet)
                
                if response.is_successful():
                    tx_hash = response.result.get('hash')
                    logger.info(f"✅ XRP enviado! TX: {tx_hash}")
                    
                    return XRPTransactionResult(
                        success=True,
                        tx_hash=tx_hash,
                        fee_paid=int(response.result.get('Fee', 12)),
                        explorer_url=f"{self.explorer_base}/{tx_hash}"
                    )
                else:
                    return XRPTransactionResult(
                        success=False,
                        error=response.result.get('engine_result_message', 'Transação falhou')
                    )
                    
            except ImportError:
                # Fallback: usar API manual
                logger.warning("⚠️ xrpl-py não instalado, usando API manual...")
                
                # 1. Obter sequence
                sequence = self.get_account_sequence(from_address)
                if not sequence:
                    return XRPTransactionResult(
                        success=False,
                        error="Não foi possível obter sequence da conta"
                    )
                
                # 2. Obter fee
                fee = self.get_current_fee()
                
                # 3. Criar transação
                amount_drops = str(int(amount_xrp * DROPS))
                
                tx = {
                    "TransactionType": "Payment",
                    "Account": from_address,
                    "Destination": to_address,
                    "Amount": amount_drops,
                    "Fee": str(fee),
                    "Sequence": sequence
                }
                
                if destination_tag:
                    tx["DestinationTag"] = destination_tag
                
                # Para assinar manualmente precisaria do xrpl-py ou ripple-lib
                return XRPTransactionResult(
                    success=False,
                    error="xrpl-py não instalado. Execute: pip install xrpl-py"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando XRP: {e}")
            return XRPTransactionResult(
                success=False,
                error=str(e)
            )


# ============================================
# INSTÂNCIA SINGLETON
# ============================================
xrp_service = XRPService()
