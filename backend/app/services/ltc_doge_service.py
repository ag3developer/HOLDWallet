"""
🪙 Litecoin & Dogecoin Transaction Service
==========================================

Serviço para envio automático de LTC e DOGE usando APIs GRATUITAS.
Ambas as moedas usam o mesmo modelo UTXO do Bitcoin, então compartilham lógica.

APIs usadas:
- Blockcypher.com: UTXOs, broadcast, fees
- SoChain.com: Backup

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import asyncio
import hashlib
import requests
import logging
from decimal import Decimal
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================

# Litecoin
LTC_SATOSHI = 100_000_000
LTC_BLOCKCYPHER_API = "https://api.blockcypher.com/v1/ltc/main"
LTC_SOCHAIN_API = "https://sochain.com/api/v2"
LTC_EXPLORER = "https://blockchair.com/litecoin/transaction"

# Dogecoin
DOGE_SATOSHI = 100_000_000
DOGE_BLOCKCYPHER_API = "https://api.blockcypher.com/v1/doge/main"
DOGE_SOCHAIN_API = "https://sochain.com/api/v2"
DOGE_EXPLORER = "https://blockchair.com/dogecoin/transaction"


@dataclass
class UTXO:
    """Representa um Unspent Transaction Output."""
    txid: str
    vout: int
    value: int  # em satoshis
    script_pubkey: str = ""


@dataclass
class TransactionResult:
    """Resultado de uma transação."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0
    explorer_url: Optional[str] = None


class LTCService:
    """
    Serviço para transações Litecoin.
    Usa APIs gratuitas: Blockcypher, SoChain.
    """
    
    def __init__(self):
        self.api_base = LTC_BLOCKCYPHER_API
        self.sochain_api = LTC_SOCHAIN_API
        self.explorer_base = LTC_EXPLORER
        self.satoshi = LTC_SATOSHI
        logger.info("🪙 LTCService initialized (mainnet)")
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço Litecoin."""
        if not address:
            return False
        # LTC: L (P2PKH), M (P2SH), ltc1 (bech32)
        if address.startswith('L') and len(address) == 34:
            return True
        if address.startswith('M') and len(address) == 34:
            return True
        if address.startswith('ltc1') and len(address) >= 42:
            return True
        return False
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo de um endereço LTC."""
        try:
            response = requests.get(
                f"{self.api_base}/addrs/{address}/balance",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                balance_satoshi = data.get('balance', 0)
                return Decimal(str(balance_satoshi)) / Decimal(str(self.satoshi))
            return None
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo LTC: {e}")
            return None
    
    def get_utxos(self, address: str) -> List[UTXO]:
        """Busca UTXOs de um endereço."""
        utxos = []
        try:
            response = requests.get(
                f"{self.api_base}/addrs/{address}?unspentOnly=true",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                txrefs = data.get('txrefs', [])
                
                for tx in txrefs:
                    utxos.append(UTXO(
                        txid=tx['tx_hash'],
                        vout=tx['tx_output_n'],
                        value=tx['value'],
                        script_pubkey=tx.get('script', '')
                    ))
            
            logger.info(f"📦 Encontrados {len(utxos)} UTXOs para {address[:15]}...")
            return utxos
            
        except Exception as e:
            logger.error(f"❌ Erro buscando UTXOs LTC: {e}")
            return []
    
    def get_recommended_fee(self) -> int:
        """Retorna fee recomendada em satoshis/byte."""
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Blockcypher retorna em satoshi/kB, converter para sat/byte
                high_fee = data.get('high_fee_per_kb', 100000) // 1000
                return max(high_fee, 10)  # Mínimo 10 sat/byte
            return 20  # Default
        except:
            return 20
    
    async def send_ltc(
        self,
        from_address: str,
        to_address: str,
        amount_ltc: float,
        private_key_wif: str,
        fee_level: str = 'medium'
    ) -> TransactionResult:
        """
        Envia LTC de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_ltc: Quantidade em LTC
            private_key_wif: Chave privada em formato WIF
            fee_level: 'fast', 'medium', 'slow'
            
        Returns:
            TransactionResult com status da transação
        """
        try:
            logger.info(f"🪙 Enviando {amount_ltc} LTC de {from_address[:10]}... para {to_address[:10]}...")
            
            # Usar Blockcypher para criar e enviar transação
            # Blockcypher tem um endpoint que facilita muito
            
            amount_satoshi = int(amount_ltc * self.satoshi)
            
            # 1. Criar nova transação
            tx_data = {
                "inputs": [{"addresses": [from_address]}],
                "outputs": [{"addresses": [to_address], "value": amount_satoshi}]
            }
            
            response = requests.post(
                f"{self.api_base}/txs/new",
                json=tx_data,
                timeout=30
            )
            
            if response.status_code != 201:
                return TransactionResult(
                    success=False,
                    error=f"Erro criando TX: {response.text}"
                )
            
            tx_skeleton = response.json()
            
            # 2. Assinar transação
            from bitcoinlib.keys import Key
            
            key = Key(private_key_wif, network='litecoin')
            
            # Assinar cada input
            signatures = []
            pubkeys = []
            
            for tosign in tx_skeleton.get('tosign', []):
                # Converter hash para bytes e assinar
                sig = key.sign(bytes.fromhex(tosign))
                signatures.append(sig.hex())
                pubkeys.append(key.public_hex)
            
            tx_skeleton['signatures'] = signatures
            tx_skeleton['pubkeys'] = pubkeys
            
            # 3. Enviar transação assinada
            response = requests.post(
                f"{self.api_base}/txs/send",
                json=tx_skeleton,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                tx_hash = result.get('tx', {}).get('hash')
                
                logger.info(f"✅ LTC enviado! TX: {tx_hash}")
                
                return TransactionResult(
                    success=True,
                    tx_hash=tx_hash,
                    fee_paid=result.get('tx', {}).get('fees', 0),
                    explorer_url=f"{self.explorer_base}/{tx_hash}"
                )
            else:
                return TransactionResult(
                    success=False,
                    error=f"Erro enviando TX: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando LTC: {e}")
            return TransactionResult(
                success=False,
                error=str(e)
            )


class DOGEService:
    """
    Serviço para transações Dogecoin.
    Usa APIs gratuitas: Blockcypher, SoChain.
    """
    
    def __init__(self):
        self.api_base = DOGE_BLOCKCYPHER_API
        self.sochain_api = DOGE_SOCHAIN_API
        self.explorer_base = DOGE_EXPLORER
        self.satoshi = DOGE_SATOSHI
        logger.info("🐕 DOGEService initialized (mainnet)")
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço Dogecoin."""
        if not address:
            return False
        # DOGE: D (P2PKH), A ou 9 (P2SH)
        if address.startswith('D') and len(address) == 34:
            return True
        if address.startswith('A') and len(address) == 34:
            return True
        if address.startswith('9') and len(address) == 34:
            return True
        return False
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo de um endereço DOGE."""
        try:
            response = requests.get(
                f"{self.api_base}/addrs/{address}/balance",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                balance_satoshi = data.get('balance', 0)
                return Decimal(str(balance_satoshi)) / Decimal(str(self.satoshi))
            return None
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo DOGE: {e}")
            return None
    
    def get_utxos(self, address: str) -> List[UTXO]:
        """Busca UTXOs de um endereço."""
        utxos = []
        try:
            response = requests.get(
                f"{self.api_base}/addrs/{address}?unspentOnly=true",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                txrefs = data.get('txrefs', [])
                
                for tx in txrefs:
                    utxos.append(UTXO(
                        txid=tx['tx_hash'],
                        vout=tx['tx_output_n'],
                        value=tx['value'],
                        script_pubkey=tx.get('script', '')
                    ))
            
            logger.info(f"📦 Encontrados {len(utxos)} UTXOs para {address[:15]}...")
            return utxos
            
        except Exception as e:
            logger.error(f"❌ Erro buscando UTXOs DOGE: {e}")
            return []
    
    def get_recommended_fee(self) -> int:
        """Retorna fee recomendada em satoshis/byte."""
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                high_fee = data.get('high_fee_per_kb', 100000000) // 1000
                return max(high_fee, 1000)  # DOGE tem fees baixas
            return 1000  # Default 1000 sat/byte
        except:
            return 1000
    
    async def send_doge(
        self,
        from_address: str,
        to_address: str,
        amount_doge: float,
        private_key_wif: str,
        fee_level: str = 'medium'
    ) -> TransactionResult:
        """
        Envia DOGE de um endereço para outro.
        """
        try:
            logger.info(f"🐕 Enviando {amount_doge} DOGE de {from_address[:10]}... para {to_address[:10]}...")
            
            amount_satoshi = int(amount_doge * self.satoshi)
            
            # 1. Criar nova transação via Blockcypher
            tx_data = {
                "inputs": [{"addresses": [from_address]}],
                "outputs": [{"addresses": [to_address], "value": amount_satoshi}]
            }
            
            response = requests.post(
                f"{self.api_base}/txs/new",
                json=tx_data,
                timeout=30
            )
            
            if response.status_code != 201:
                return TransactionResult(
                    success=False,
                    error=f"Erro criando TX: {response.text}"
                )
            
            tx_skeleton = response.json()
            
            # 2. Assinar transação
            from bitcoinlib.keys import Key
            
            key = Key(private_key_wif, network='dogecoin')
            
            signatures = []
            pubkeys = []
            
            for tosign in tx_skeleton.get('tosign', []):
                sig = key.sign(bytes.fromhex(tosign))
                signatures.append(sig.hex())
                pubkeys.append(key.public_hex)
            
            tx_skeleton['signatures'] = signatures
            tx_skeleton['pubkeys'] = pubkeys
            
            # 3. Enviar transação assinada
            response = requests.post(
                f"{self.api_base}/txs/send",
                json=tx_skeleton,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                tx_hash = result.get('tx', {}).get('hash')
                
                logger.info(f"✅ DOGE enviado! TX: {tx_hash}")
                
                return TransactionResult(
                    success=True,
                    tx_hash=tx_hash,
                    fee_paid=result.get('tx', {}).get('fees', 0),
                    explorer_url=f"{self.explorer_base}/{tx_hash}"
                )
            else:
                return TransactionResult(
                    success=False,
                    error=f"Erro enviando TX: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"❌ Erro enviando DOGE: {e}")
            return TransactionResult(
                success=False,
                error=str(e)
            )


# ============================================
# INSTÂNCIAS SINGLETON
# ============================================
ltc_service = LTCService()
doge_service = DOGEService()
