"""
🔺 TRON Transaction Service
============================

Serviço para envio automático de TRX e USDT-TRC20 usando APIs GRATUITAS.
TRON usa TVM (similar à EVM) mas com suas próprias particularidades.

APIs usadas:
- TronGrid API (gratuita)
- TronScan API

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import asyncio
import base58
import hashlib
import requests
import logging
import time
from decimal import Decimal
from typing import Dict, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================
SUN = 1_000_000  # 1 TRX = 1,000,000 SUN

# APIs
TRONGRID_API = "https://api.trongrid.io"
TRONSCAN_API = "https://apilist.tronscanapi.com/api"

# Explorers
TRONSCAN_EXPLORER = "https://tronscan.org/#/transaction"

# Contratos de Tokens TRC20
USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
USDC_TRC20_CONTRACT = "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8"


@dataclass
class TRXTransactionResult:
    """Resultado de uma transação TRON."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0  # em SUN
    explorer_url: Optional[str] = None


class TRONService:
    """
    Serviço para transações TRON.
    Suporta TRX nativo e tokens TRC20 (USDT, USDC).
    """
    
    def __init__(self):
        self.api_base = TRONGRID_API
        self.explorer_base = TRONSCAN_EXPLORER
        logger.info("🔺 TRONService initialized (mainnet)")
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço TRON (começa com T, 34 chars)."""
        if not address:
            return False
        if not address.startswith('T'):
            return False
        if len(address) != 34:
            return False
        try:
            decoded = base58.b58decode_check(address)
            return decoded[0] == 0x41  # TRON mainnet prefix
        except Exception:
            return False
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo TRX de um endereço."""
        try:
            response = requests.get(
                f"{self.api_base}/v1/accounts/{address}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data'):
                    balance_sun = data['data'][0].get('balance', 0)
                    return Decimal(str(balance_sun)) / Decimal(str(SUN))
            return Decimal('0')
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo TRX: {e}")
            return None
    
    def get_trc20_balance(self, address: str, contract: str = USDT_TRC20_CONTRACT) -> Optional[Decimal]:
        """Consulta saldo de token TRC20 (USDT, USDC)."""
        try:
            response = requests.get(
                f"{self.api_base}/v1/accounts/{address}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data'):
                    trc20_tokens = data['data'][0].get('trc20', [])
                    for token in trc20_tokens:
                        if contract in token:
                            balance = int(token[contract])
                            return Decimal(str(balance)) / Decimal('1000000')  # 6 decimals
            return Decimal('0')
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo TRC20: {e}")
            return None
    
    def _address_to_hex(self, address: str) -> str:
        """Converte endereço TRON base58 para hex."""
        decoded = base58.b58decode_check(address)
        return decoded.hex()
    
    def _hex_to_address(self, hex_address: str) -> str:
        """Converte endereço hex para base58."""
        if hex_address.startswith('0x'):
            hex_address = hex_address[2:]
        addr_bytes = bytes.fromhex(hex_address)
        return base58.b58encode_check(addr_bytes).decode()
    
    def _private_key_to_address(self, private_key_hex: str) -> str:
        """Gera endereço TRON a partir da private key."""
        from ecdsa import SigningKey, SECP256k1
        
        if private_key_hex.startswith('0x'):
            private_key_hex = private_key_hex[2:]
        
        sk = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
        vk = sk.get_verifying_key()
        
        # Keccak-256 da public key
        from Crypto.Hash import keccak
        public_key_bytes = vk.to_string()
        keccak_hash = keccak.new(digest_bits=256)
        keccak_hash.update(public_key_bytes)
        
        # Últimos 20 bytes + prefixo 0x41
        address_bytes = b'\x41' + keccak_hash.digest()[-20:]
        
        return base58.b58encode_check(address_bytes).decode()
    
    async def send_trx(
        self,
        from_address: str,
        to_address: str,
        amount_trx: float,
        private_key_hex: str
    ) -> TRXTransactionResult:
        """
        Envia TRX de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_trx: Quantidade em TRX
            private_key_hex: Chave privada em hex
            
        Returns:
            TRXTransactionResult com status da transação
        """
        try:
            logger.info(f"🔺 Enviando {amount_trx} TRX de {from_address[:10]}... para {to_address[:10]}...")
            
            from ecdsa import SigningKey, SECP256k1
            
            if private_key_hex.startswith('0x'):
                private_key_hex = private_key_hex[2:]
            
            amount_sun = int(amount_trx * SUN)
            
            # 1. Criar transação via API
            tx_data = {
                "owner_address": self._address_to_hex(from_address),
                "to_address": self._address_to_hex(to_address),
                "amount": amount_sun,
                "visible": False
            }
            
            response = requests.post(
                f"{self.api_base}/wallet/createtransaction",
                json=tx_data,
                timeout=30
            )
            
            if response.status_code != 200:
                return TRXTransactionResult(
                    success=False,
                    error=f"Erro criando TX: {response.text}"
                )
            
            tx = response.json()
            
            if 'Error' in tx:
                return TRXTransactionResult(
                    success=False,
                    error=tx.get('Error', 'Erro desconhecido')
                )
            
            # 2. Assinar transação
            raw_data = tx.get('raw_data_hex', '')
            
            if not raw_data:
                return TRXTransactionResult(
                    success=False,
                    error="raw_data_hex não encontrado na resposta"
                )
            
            # Criar hash da transação
            tx_hash = hashlib.sha256(bytes.fromhex(raw_data)).digest()
            
            # Assinar com ECDSA - TRON requer assinatura de 65 bytes (r + s + v)
            sk = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
            
            # Usar sign_digest_deterministic para ter resultado consistente
            # e obter r, s separadamente para calcular recovery id (v)
            from ecdsa.util import sigencode_string
            signature_rs = sk.sign_digest(tx_hash, sigencode=sigencode_string)
            r = int.from_bytes(signature_rs[:32], 'big')
            s = int.from_bytes(signature_rs[32:], 'big')
            
            # Calcular recovery id (v) - TRON usa 0 ou 1 (não 27/28 como Ethereum)
            # Precisamos encontrar qual v (0 ou 1) recupera a public key correta
            vk = sk.get_verifying_key()
            public_key_bytes = vk.to_string()
            
            # Tentar v=0 e v=1 para encontrar o correto
            recovery_id = 0
            for v in [0, 1]:
                try:
                    from ecdsa import VerifyingKey
                    recovered_key = VerifyingKey.from_public_key_recovery_with_digest(
                        signature_rs, tx_hash, SECP256k1, hashfunc=hashlib.sha256
                    )
                    for rk in recovered_key:
                        if rk.to_string() == public_key_bytes:
                            recovery_id = v
                            break
                except Exception:
                    pass
            
            # Montar assinatura de 65 bytes: r (32) + s (32) + v (1)
            signature_65 = r.to_bytes(32, 'big') + s.to_bytes(32, 'big') + bytes([recovery_id])
            
            # Adicionar assinatura
            tx['signature'] = [signature_65.hex()]
            
            # 3. Broadcast
            response = requests.post(
                f"{self.api_base}/wallet/broadcasttransaction",
                json=tx,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('result'):
                    tx_id = result.get('txid', tx.get('txID'))
                    logger.info(f"✅ TRX enviado! TX: {tx_id}")
                    
                    return TRXTransactionResult(
                        success=True,
                        tx_hash=tx_id,
                        fee_paid=100000,  # ~0.1 TRX bandwidth fee
                        explorer_url=f"{self.explorer_base}/{tx_id}"
                    )
                else:
                    return TRXTransactionResult(
                        success=False,
                        error=result.get('message', 'Broadcast falhou')
                    )
            else:
                return TRXTransactionResult(
                    success=False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando TRX: {e}")
            return TRXTransactionResult(
                success=False,
                error=str(e)
            )
    
    async def send_trc20(
        self,
        from_address: str,
        to_address: str,
        amount: float,
        private_key_hex: str,
        contract_address: str = USDT_TRC20_CONTRACT
    ) -> TRXTransactionResult:
        """
        Envia token TRC20 (USDT, USDC) de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount: Quantidade de tokens
            private_key_hex: Chave privada em hex
            contract_address: Contrato do token (default: USDT)
            
        Returns:
            TRXTransactionResult com status da transação
        """
        try:
            logger.info(f"🔺 Enviando {amount} USDT-TRC20 de {from_address[:10]}... para {to_address[:10]}...")
            
            from ecdsa import SigningKey, SECP256k1
            
            if private_key_hex.startswith('0x'):
                private_key_hex = private_key_hex[2:]
            
            # Quantidade com 6 decimais
            amount_units = int(amount * 1_000_000)
            
            # Codificar parâmetros do transfer(address,uint256)
            # Remover prefixo 41 do endereço destino e pad para 32 bytes
            to_hex = self._address_to_hex(to_address)[2:]  # Remove 41
            to_padded = to_hex.zfill(64)
            amount_padded = hex(amount_units)[2:].zfill(64)
            
            parameter = to_padded + amount_padded
            
            # 1. Trigger smart contract
            trigger_data = {
                "owner_address": self._address_to_hex(from_address),
                "contract_address": self._address_to_hex(contract_address),
                "function_selector": "transfer(address,uint256)",
                "parameter": parameter,
                "fee_limit": 100000000,  # 100 TRX max
                "visible": False
            }
            
            response = requests.post(
                f"{self.api_base}/wallet/triggersmartcontract",
                json=trigger_data,
                timeout=30
            )
            
            if response.status_code != 200:
                return TRXTransactionResult(
                    success=False,
                    error=f"Erro criando TX TRC20: {response.text}"
                )
            
            result = response.json()
            
            if not result.get('result', {}).get('result'):
                return TRXTransactionResult(
                    success=False,
                    error=result.get('result', {}).get('message', 'Erro no trigger')
                )
            
            tx = result.get('transaction', {})
            
            # 2. Assinar transação - TRON requer assinatura de 65 bytes (r + s + v)
            raw_data = tx.get('raw_data_hex', '')
            tx_hash = hashlib.sha256(bytes.fromhex(raw_data)).digest()
            
            sk = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
            
            # Usar sign_digest para obter r, s
            from ecdsa.util import sigencode_string
            signature_rs = sk.sign_digest(tx_hash, sigencode=sigencode_string)
            r = int.from_bytes(signature_rs[:32], 'big')
            s = int.from_bytes(signature_rs[32:], 'big')
            
            # Calcular recovery id (v)
            vk = sk.get_verifying_key()
            public_key_bytes = vk.to_string()
            
            recovery_id = 0
            for v in [0, 1]:
                try:
                    from ecdsa import VerifyingKey
                    recovered_key = VerifyingKey.from_public_key_recovery_with_digest(
                        signature_rs, tx_hash, SECP256k1, hashfunc=hashlib.sha256
                    )
                    for rk in recovered_key:
                        if rk.to_string() == public_key_bytes:
                            recovery_id = v
                            break
                except Exception:
                    pass
            
            # Montar assinatura de 65 bytes: r (32) + s (32) + v (1)
            signature_65 = r.to_bytes(32, 'big') + s.to_bytes(32, 'big') + bytes([recovery_id])
            
            tx['signature'] = [signature_65.hex()]
            
            # 3. Broadcast
            response = requests.post(
                f"{self.api_base}/wallet/broadcasttransaction",
                json=tx,
                timeout=30
            )
            
            if response.status_code == 200:
                broadcast_result = response.json()
                
                if broadcast_result.get('result'):
                    tx_id = broadcast_result.get('txid', tx.get('txID'))
                    logger.info(f"✅ USDT-TRC20 enviado! TX: {tx_id}")
                    
                    return TRXTransactionResult(
                        success=True,
                        tx_hash=tx_id,
                        fee_paid=10000000,  # ~10 TRX energy fee
                        explorer_url=f"{self.explorer_base}/{tx_id}"
                    )
                else:
                    return TRXTransactionResult(
                        success=False,
                        error=broadcast_result.get('message', 'Broadcast falhou')
                    )
            else:
                return TRXTransactionResult(
                    success=False,
                    error=f"HTTP {response.status_code}"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando TRC20: {e}")
            return TRXTransactionResult(
                success=False,
                error=str(e)
            )


# ============================================
# INSTÂNCIA SINGLETON
# ============================================
tron_service = TRONService()
