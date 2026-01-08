"""
🔶 Bitcoin Transaction Service
==============================

Serviço para envio automático de Bitcoin usando APIs GRATUITAS:
- Blockstream.info: UTXOs e Broadcast
- Mempool.space: Estimativa de fees

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

from app.core.config import settings
from app.core.exceptions import BlockchainError

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================
SATOSHI = 100_000_000  # 1 BTC = 100,000,000 satoshis

# APIs Gratuitas
BLOCKSTREAM_API = "https://blockstream.info/api"
MEMPOOL_API = "https://mempool.space/api"
BLOCKCHAIN_INFO_API = "https://blockchain.info"

# Testnet (para desenvolvimento)
BLOCKSTREAM_TESTNET_API = "https://blockstream.info/testnet/api"
MEMPOOL_TESTNET_API = "https://mempool.space/testnet/api"


@dataclass
class UTXO:
    """Representa um Unspent Transaction Output."""
    txid: str
    vout: int
    value: int  # em satoshis
    script_pubkey: str = ""


@dataclass
class BTCTransactionResult:
    """Resultado de uma transação Bitcoin."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0  # em satoshis
    explorer_url: Optional[str] = None


class BTCService:
    """
    Serviço para transações Bitcoin.
    
    Usa APIs 100% gratuitas:
    - Blockstream.info para UTXOs e broadcast
    - Mempool.space para estimativa de fees
    """
    
    def __init__(self, testnet: bool = False):
        """
        Inicializa o serviço BTC.
        
        Args:
            testnet: Se True, usa testnet. Se False, usa mainnet.
        """
        self.testnet = testnet
        
        if testnet:
            self.blockstream_api = BLOCKSTREAM_TESTNET_API
            self.mempool_api = MEMPOOL_TESTNET_API
            self.explorer_base = "https://blockstream.info/testnet/tx"
        else:
            self.blockstream_api = BLOCKSTREAM_API
            self.mempool_api = MEMPOOL_API
            self.explorer_base = "https://blockstream.info/tx"
        
        logger.info(f"🔶 BTCService initialized ({'testnet' if testnet else 'mainnet'})")
    
    # ============================================
    # FUNÇÕES DE CARTEIRA
    # ============================================
    
    def generate_address_from_private_key(self, private_key_hex: str) -> Tuple[str, str]:
        """
        Gera endereço Bitcoin a partir de uma private key.
        
        Args:
            private_key_hex: Private key em formato hexadecimal
            
        Returns:
            Tuple de (address, wif_private_key)
        """
        try:
            from bitcoinlib.keys import Key
            
            # Criar key a partir do hex
            key = Key(import_key=private_key_hex, network='testnet' if self.testnet else 'bitcoin')
            
            # Obter endereço (SegWit nativo - bc1...)
            address = key.address()
            
            # Obter WIF (Wallet Import Format) para assinatura
            wif = key.wif()
            
            logger.info(f"🔑 Generated BTC address: {address[:10]}...")
            return address, wif
            
        except Exception as e:
            logger.error(f"❌ Error generating BTC address: {e}")
            raise BlockchainError(f"Falha ao gerar endereço Bitcoin: {str(e)}")
    
    def generate_new_wallet(self) -> Dict[str, str]:
        """
        Gera uma nova carteira Bitcoin.
        
        Returns:
            Dict com address, private_key (hex), wif, e seed_phrase
        """
        try:
            from bitcoinlib.keys import Key
            from bitcoinlib.mnemonic import Mnemonic
            
            # Gerar mnemonic (seed phrase)
            mnemonic = Mnemonic().generate(strength=256)  # 24 palavras
            
            # Derivar key da mnemonic
            key = Key.from_mnemonic(mnemonic, network='testnet' if self.testnet else 'bitcoin')
            
            return {
                'address': key.address(),
                'private_key_hex': key.private_hex,
                'wif': key.wif(),
                'seed_phrase': mnemonic,
                'network': 'testnet' if self.testnet else 'mainnet'
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating BTC wallet: {e}")
            raise BlockchainError(f"Falha ao gerar carteira Bitcoin: {str(e)}")
    
    # ============================================
    # CONSULTAS (APIs Gratuitas)
    # ============================================
    
    def get_balance(self, address: str) -> Dict:
        """
        Consulta saldo de um endereço Bitcoin.
        
        Args:
            address: Endereço Bitcoin
            
        Returns:
            Dict com confirmed, unconfirmed (em satoshis e BTC)
        """
        try:
            url = f"{self.blockstream_api}/address/{address}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Calcular saldo
            funded = data.get('chain_stats', {}).get('funded_txo_sum', 0)
            spent = data.get('chain_stats', {}).get('spent_txo_sum', 0)
            confirmed = funded - spent
            
            # Mempool (não confirmado)
            mempool_funded = data.get('mempool_stats', {}).get('funded_txo_sum', 0)
            mempool_spent = data.get('mempool_stats', {}).get('spent_txo_sum', 0)
            unconfirmed = mempool_funded - mempool_spent
            
            return {
                'address': address,
                'confirmed_satoshis': confirmed,
                'confirmed_btc': confirmed / SATOSHI,
                'unconfirmed_satoshis': unconfirmed,
                'unconfirmed_btc': unconfirmed / SATOSHI,
                'total_satoshis': confirmed + unconfirmed,
                'total_btc': (confirmed + unconfirmed) / SATOSHI
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error fetching BTC balance: {e}")
            raise BlockchainError(f"Falha ao consultar saldo Bitcoin: {str(e)}")
    
    def get_utxos(self, address: str) -> List[UTXO]:
        """
        Consulta UTXOs de um endereço.
        
        Args:
            address: Endereço Bitcoin
            
        Returns:
            Lista de UTXOs disponíveis
        """
        try:
            url = f"{self.blockstream_api}/address/{address}/utxo"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            utxos_data = response.json()
            
            utxos = []
            for utxo in utxos_data:
                # Só usar UTXOs confirmados
                if utxo.get('status', {}).get('confirmed', False):
                    utxos.append(UTXO(
                        txid=utxo['txid'],
                        vout=utxo['vout'],
                        value=utxo['value']
                    ))
            
            logger.info(f"📦 Found {len(utxos)} UTXOs for {address[:10]}...")
            return utxos
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error fetching UTXOs: {e}")
            raise BlockchainError(f"Falha ao consultar UTXOs: {str(e)}")
    
    def get_recommended_fees(self) -> Dict[str, int]:
        """
        Consulta fees recomendados (sat/vByte).
        
        Returns:
            Dict com fastest, halfHour, hour, economy, minimum
        """
        try:
            url = f"{self.mempool_api}/v1/fees/recommended"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            fees = response.json()
            
            return {
                'fastest': fees.get('fastestFee', 50),      # Próximo bloco
                'half_hour': fees.get('halfHourFee', 30),   # ~30 min
                'hour': fees.get('hourFee', 20),            # ~1 hora
                'economy': fees.get('economyFee', 10),      # Economia
                'minimum': fees.get('minimumFee', 1)        # Mínimo
            }
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ Error fetching fees, using defaults: {e}")
            # Fallback para valores padrão
            return {
                'fastest': 50,
                'half_hour': 30,
                'hour': 20,
                'economy': 10,
                'minimum': 1
            }
    
    # ============================================
    # ENVIO DE TRANSAÇÃO
    # ============================================
    
    async def send_btc(
        self,
        from_address: str,
        to_address: str,
        amount_btc: float,
        private_key_wif: str,
        fee_level: str = 'hour'
    ) -> BTCTransactionResult:
        """
        Envia Bitcoin de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_btc: Quantidade em BTC
            private_key_wif: Private key em formato WIF
            fee_level: 'fastest', 'half_hour', 'hour', 'economy'
            
        Returns:
            BTCTransactionResult com resultado da transação
        """
        try:
            from bitcoinlib.transactions import Transaction
            from bitcoinlib.keys import Key
            
            logger.info(f"🔶 Iniciando envio BTC: {amount_btc} BTC para {to_address[:10]}...")
            
            # Converter para satoshis
            amount_satoshis = int(Decimal(str(amount_btc)) * SATOSHI)
            
            # Obter fee rate
            fees = self.get_recommended_fees()
            fee_rate = fees.get(fee_level, fees['hour'])
            
            logger.info(f"💰 Fee rate: {fee_rate} sat/vByte")
            
            # Obter UTXOs
            utxos = self.get_utxos(from_address)
            if not utxos:
                return BTCTransactionResult(
                    success=False,
                    error="Nenhum UTXO disponível. Aguarde confirmações ou adicione fundos."
                )
            
            # Calcular total disponível
            total_available = sum(u.value for u in utxos)
            logger.info(f"📦 Total disponível: {total_available} satoshis ({total_available / SATOSHI} BTC)")
            
            # Estimar tamanho da transação (aproximado)
            # P2WPKH: ~68 vBytes por input + ~31 vBytes por output + ~10 overhead
            estimated_vsize = len(utxos) * 68 + 2 * 31 + 10
            estimated_fee = estimated_vsize * fee_rate
            
            logger.info(f"📊 Fee estimado: {estimated_fee} satoshis")
            
            # Verificar saldo suficiente
            if total_available < amount_satoshis + estimated_fee:
                deficit = (amount_satoshis + estimated_fee - total_available) / SATOSHI
                return BTCTransactionResult(
                    success=False,
                    error=f"Saldo insuficiente. Faltam {deficit:.8f} BTC (incluindo taxa de {estimated_fee} satoshis)"
                )
            
            # Criar transação usando bitcoinlib
            key = Key(private_key_wif, network='testnet' if self.testnet else 'bitcoin')
            
            # Construir transação
            tx = Transaction(network='testnet' if self.testnet else 'bitcoin')
            
            # Adicionar inputs (UTXOs)
            for utxo in utxos:
                tx.add_input(
                    prev_txid=utxo.txid,
                    output_n=utxo.vout,
                    keys=key,
                    value=utxo.value
                )
            
            # Adicionar output para destinatário
            tx.add_output(amount_satoshis, to_address)
            
            # Adicionar output de troco (se houver)
            change = total_available - amount_satoshis - estimated_fee
            if change > 546:  # Dust limit
                tx.add_output(change, from_address)
            
            # Assinar transação
            tx.sign()
            
            # Serializar
            raw_tx = tx.raw_hex()
            
            logger.info(f"📝 Transação criada: {len(raw_tx)} bytes")
            
            # Broadcast via API gratuita
            tx_hash = await self._broadcast_transaction(raw_tx)
            
            if tx_hash:
                explorer_url = f"{self.explorer_base}/{tx_hash}"
                logger.info(f"✅ BTC enviado! TX: {tx_hash}")
                
                return BTCTransactionResult(
                    success=True,
                    tx_hash=tx_hash,
                    fee_paid=estimated_fee,
                    explorer_url=explorer_url
                )
            else:
                return BTCTransactionResult(
                    success=False,
                    error="Falha ao transmitir transação para a rede"
                )
                
        except Exception as e:
            logger.error(f"❌ Error sending BTC: {e}")
            return BTCTransactionResult(
                success=False,
                error=f"Erro ao enviar Bitcoin: {str(e)}"
            )
    
    async def _broadcast_transaction(self, raw_tx_hex: str) -> Optional[str]:
        """
        Transmite transação para a rede Bitcoin.
        
        Args:
            raw_tx_hex: Transação serializada em hexadecimal
            
        Returns:
            TX hash se sucesso, None se falha
        """
        # Tentar Blockstream primeiro
        try:
            url = f"{self.blockstream_api}/tx"
            response = requests.post(url, data=raw_tx_hex, timeout=30)
            
            if response.status_code == 200:
                tx_hash = response.text.strip()
                logger.info(f"📡 Broadcast via Blockstream: {tx_hash}")
                return tx_hash
            else:
                logger.warning(f"⚠️ Blockstream error: {response.text}")
                
        except Exception as e:
            logger.warning(f"⚠️ Blockstream broadcast failed: {e}")
        
        # Fallback: Mempool.space
        try:
            url = f"{self.mempool_api}/tx"
            response = requests.post(url, data=raw_tx_hex, timeout=30)
            
            if response.status_code == 200:
                tx_hash = response.text.strip()
                logger.info(f"📡 Broadcast via Mempool.space: {tx_hash}")
                return tx_hash
            else:
                logger.warning(f"⚠️ Mempool.space error: {response.text}")
                
        except Exception as e:
            logger.warning(f"⚠️ Mempool.space broadcast failed: {e}")
        
        # Fallback: Blockchain.info (apenas mainnet)
        if not self.testnet:
            try:
                url = f"{BLOCKCHAIN_INFO_API}/pushtx"
                response = requests.post(url, data={'tx': raw_tx_hex}, timeout=30)
                
                if response.status_code == 200:
                    # Blockchain.info não retorna hash diretamente
                    # Calcular do raw tx
                    tx_hash = self._calculate_txid(raw_tx_hex)
                    logger.info(f"📡 Broadcast via Blockchain.info: {tx_hash}")
                    return tx_hash
                    
            except Exception as e:
                logger.warning(f"⚠️ Blockchain.info broadcast failed: {e}")
        
        return None
    
    def _calculate_txid(self, raw_tx_hex: str) -> str:
        """Calcula o TXID a partir do raw transaction."""
        tx_bytes = bytes.fromhex(raw_tx_hex)
        hash1 = hashlib.sha256(tx_bytes).digest()
        hash2 = hashlib.sha256(hash1).digest()
        return hash2[::-1].hex()  # Reverse byte order
    
    # ============================================
    # MÉTODOS AUXILIARES
    # ============================================
    
    def validate_address(self, address: str) -> bool:
        """
        Valida se um endereço Bitcoin é válido.
        
        Args:
            address: Endereço a validar
            
        Returns:
            True se válido, False se inválido
        """
        try:
            from bitcoinlib.keys import Address
            
            addr = Address.parse(address)
            
            # Verificar se é da rede correta
            if self.testnet:
                return addr.network.name in ['testnet', 'bitcoin_testnet']
            else:
                return addr.network.name in ['bitcoin', 'bitcoin_mainnet']
                
        except Exception:
            return False
    
    def get_transaction_status(self, tx_hash: str) -> Dict:
        """
        Consulta status de uma transação.
        
        Args:
            tx_hash: Hash da transação
            
        Returns:
            Dict com status, confirmations, block_height
        """
        try:
            url = f"{self.blockstream_api}/tx/{tx_hash}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            status = data.get('status', {})
            confirmed = status.get('confirmed', False)
            block_height = status.get('block_height')
            
            # Calcular confirmações
            confirmations = 0
            if confirmed and block_height:
                tip_url = f"{self.blockstream_api}/blocks/tip/height"
                tip_response = requests.get(tip_url, timeout=10)
                if tip_response.status_code == 200:
                    current_height = int(tip_response.text)
                    confirmations = current_height - block_height + 1
            
            return {
                'tx_hash': tx_hash,
                'confirmed': confirmed,
                'confirmations': confirmations,
                'block_height': block_height,
                'fee': data.get('fee', 0),
                'size': data.get('size', 0),
                'explorer_url': f"{self.explorer_base}/{tx_hash}"
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error fetching TX status: {e}")
            return {
                'tx_hash': tx_hash,
                'confirmed': False,
                'confirmations': 0,
                'error': str(e)
            }


# ============================================
# SINGLETON
# ============================================

# Instância para mainnet (produção)
btc_service = BTCService(testnet=False)

# Instância para testnet (desenvolvimento)
btc_service_testnet = BTCService(testnet=True)


# ============================================
# FUNÇÕES DE CONVENIÊNCIA
# ============================================

async def send_btc_from_platform(
    to_address: str,
    amount_btc: float,
    fee_level: str = 'hour'
) -> BTCTransactionResult:
    """
    Envia BTC da carteira da plataforma.
    
    Esta função lê as credenciais do .env:
    - PLATFORM_BTC_ADDRESS
    - PLATFORM_BTC_PRIVATE_KEY_WIF
    
    Args:
        to_address: Endereço de destino
        amount_btc: Quantidade em BTC
        fee_level: Nível de taxa ('fastest', 'half_hour', 'hour', 'economy')
        
    Returns:
        BTCTransactionResult
    """
    # Ler credenciais do .env
    platform_address = getattr(settings, 'PLATFORM_BTC_ADDRESS', None)
    platform_wif = getattr(settings, 'PLATFORM_BTC_PRIVATE_KEY_WIF', None)
    
    if not platform_address or not platform_wif:
        return BTCTransactionResult(
            success=False,
            error="Carteira BTC da plataforma não configurada. Configure PLATFORM_BTC_ADDRESS e PLATFORM_BTC_PRIVATE_KEY_WIF no .env"
        )
    
    return await btc_service.send_btc(
        from_address=platform_address,
        to_address=to_address,
        amount_btc=amount_btc,
        private_key_wif=platform_wif,
        fee_level=fee_level
    )


def get_platform_btc_balance() -> Dict:
    """
    Consulta saldo da carteira BTC da plataforma.
    
    Returns:
        Dict com saldo ou erro
    """
    platform_address = getattr(settings, 'PLATFORM_BTC_ADDRESS', None)
    
    if not platform_address:
        return {
            'error': "Carteira BTC da plataforma não configurada"
        }
    
    return btc_service.get_balance(platform_address)
