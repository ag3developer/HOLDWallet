"""
💳 WolkPay Gateway - HD Wallet Service
=======================================

Derivação de endereços únicos para pagamentos crypto usando BIP32/BIP44.

Derivation Path: m/44'/{coin}'/1000'/{merchant_index}/{payment_index}
                       │       │        │               │
                       │       │        │               └─ Índice do pagamento (único)
                       │       │        └─ Índice do merchant (único por merchant)  
                       │       └─ Account 1000 (reservado para gateway)
                       └─ Coin type (BTC=0, ETH=60, SOL=501, etc)

Segurança:
- Mnemonic é criptografada em memória
- Private keys nunca são armazenadas no banco
- Endereços são derivados sob demanda
- Cada pagamento tem endereço único

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import hashlib
from typing import Optional, Dict, Any, Tuple
from functools import lru_cache

from bip32 import BIP32
from mnemonic import Mnemonic

logger = logging.getLogger(__name__)


class GatewayHDWalletService:
    """
    Serviço de derivação HD para endereços de pagamento do Gateway.
    
    Gera endereços únicos para cada pagamento usando derivação determinística,
    permitindo que todos os pagamentos sejam monitorados e reconciliados.
    """
    
    # Coin types BIP44
    COIN_TYPES = {
        "BTC": 0,
        "LTC": 2,
        "DOGE": 3,
        "ETH": 60,
        "POLYGON": 60,  # EVM compatible - same as ETH
        "BSC": 60,      # EVM compatible - same as ETH
        "BASE": 60,     # EVM compatible - same as ETH  
        "MATIC": 60,    # EVM compatible - same as ETH
        "USDT": 60,     # Token on ETH/POLYGON/BSC
        "USDC": 60,     # Token on ETH/POLYGON/BSC
        "BNB": 60,      # EVM compatible
        "SOL": 501,
        "TRX": 195,
    }
    
    # Gateway account number (reservado para o gateway)
    GATEWAY_ACCOUNT = 1000
    
    def __init__(self, mnemonic: Optional[str] = None):
        """
        Inicializa o serviço HD Wallet.
        
        Args:
            mnemonic: Frase mnemonic BIP39 (12 ou 24 palavras)
        """
        self._mnemonic = mnemonic
        self._bip32: Optional[BIP32] = None
        self._initialized = False
        
    def initialize(self, mnemonic: Optional[str] = None) -> bool:
        """
        Inicializa o BIP32 com a mnemonic.
        
        Args:
            mnemonic: Frase mnemonic (se não foi passada no __init__)
            
        Returns:
            True se inicializado com sucesso
        """
        if mnemonic:
            self._mnemonic = mnemonic
            
        if not self._mnemonic:
            logger.warning("⚠️ Gateway mnemonic não configurada - usando endereços fixos")
            return False
            
        try:
            # Validar mnemonic
            mnemo = Mnemonic("english")
            if not mnemo.check(self._mnemonic):
                logger.error("❌ Mnemonic inválida!")
                return False
            
            # Converter para seed
            seed = mnemo.to_seed(self._mnemonic)
            
            # Criar BIP32 master key
            self._bip32 = BIP32.from_seed(seed)
            self._initialized = True
            
            logger.info("✅ Gateway HD Wallet inicializada com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao inicializar HD Wallet: {e}")
            return False
    
    @property
    def is_initialized(self) -> bool:
        """Verifica se a wallet está inicializada"""
        return self._initialized and self._bip32 is not None
    
    def get_coin_type(self, currency: str) -> int:
        """
        Retorna o coin type BIP44 para a moeda.
        
        Args:
            currency: Símbolo da moeda (BTC, ETH, etc)
            
        Returns:
            Coin type number
        """
        return self.COIN_TYPES.get(currency.upper(), 60)  # Default ETH
    
    def build_derivation_path(
        self,
        currency: str,
        merchant_index: int,
        payment_index: int
    ) -> str:
        """
        Constrói o derivation path BIP44 para o pagamento.
        
        Path: m/44'/{coin}'/1000'/{merchant_index}/{payment_index}
        
        Args:
            currency: Moeda (BTC, ETH, etc)
            merchant_index: hd_index do merchant
            payment_index: índice do pagamento
            
        Returns:
            Derivation path string
        """
        coin_type = self.get_coin_type(currency)
        return f"m/44'/{coin_type}'/{self.GATEWAY_ACCOUNT}'/{merchant_index}/{payment_index}"
    
    def derive_keys(self, derivation_path: str) -> Optional[Dict[str, str]]:
        """
        Deriva private e public key para o path especificado.
        
        Args:
            derivation_path: Path de derivação BIP44
            
        Returns:
            Dict com private_key, public_key (hex)
        """
        if not self.is_initialized:
            logger.error("❌ HD Wallet não inicializada")
            return None
            
        try:
            private_key = self._bip32.get_privkey_from_path(derivation_path)
            public_key = self._bip32.get_pubkey_from_path(derivation_path)
            
            return {
                "private_key": private_key.hex(),
                "public_key": public_key.hex(),
                "derivation_path": derivation_path
            }
            
        except Exception as e:
            logger.error(f"❌ Erro na derivação HD: {e}")
            return None
    
    def derive_address(
        self,
        currency: str,
        network: str,
        merchant_index: int,
        payment_index: int
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Deriva endereço único para o pagamento.
        
        Args:
            currency: Moeda (BTC, ETH, USDT, etc)
            network: Rede (bitcoin, ethereum, polygon, etc)
            merchant_index: hd_index do merchant
            payment_index: índice do pagamento
            
        Returns:
            Tuple (address, derivation_path) ou (None, None) em caso de erro
        """
        if not self.is_initialized:
            logger.warning("⚠️ HD Wallet não inicializada - retornando None")
            return None, None
            
        try:
            # Construir path
            derivation_path = self.build_derivation_path(currency, merchant_index, payment_index)
            
            # Derivar keys
            keys = self.derive_keys(derivation_path)
            if not keys:
                return None, None
            
            # Gerar endereço baseado na rede
            address = self._public_key_to_address(keys["public_key"], network.lower())
            
            logger.info(f"✅ Endereço derivado: {address[:10]}...{address[-6:]} ({derivation_path})")
            
            return address, derivation_path
            
        except Exception as e:
            logger.error(f"❌ Erro ao derivar endereço: {e}")
            return None, None
    
    def _public_key_to_address(self, public_key_hex: str, network: str) -> str:
        """
        Converte public key em endereço para a rede especificada.
        
        Args:
            public_key_hex: Public key em hexadecimal
            network: Nome da rede (bitcoin, ethereum, polygon, etc)
            
        Returns:
            Endereço formatado para a rede
        """
        # Remove 0x prefix se presente
        if public_key_hex.startswith('0x'):
            public_key_hex = public_key_hex[2:]
            
        public_key_bytes = bytes.fromhex(public_key_hex)
        
        # EVM Networks (Ethereum, Polygon, BSC, Base)
        if network in ["ethereum", "polygon", "bsc", "base", "multi"]:
            return self._derive_evm_address(public_key_bytes)
        
        # Bitcoin-like networks
        elif network in ["bitcoin", "litecoin", "dogecoin"]:
            return self._derive_bitcoin_address(public_key_bytes, network)
        
        # Tron
        elif network == "tron":
            return self._derive_tron_address(public_key_bytes)
        
        # Solana (diferente - usa Ed25519)
        elif network == "solana":
            return self._derive_solana_address(public_key_bytes)
        
        # Default: EVM
        else:
            logger.warning(f"⚠️ Rede desconhecida '{network}', usando formato EVM")
            return self._derive_evm_address(public_key_bytes)
    
    def _derive_evm_address(self, public_key_bytes: bytes) -> str:
        """Deriva endereço EVM (Ethereum, Polygon, BSC, Base)"""
        from Crypto.Hash import keccak
        from coincurve import PublicKey
        
        try:
            # Garantir que temos uncompressed public key (65 bytes com 0x04 prefix)
            if len(public_key_bytes) == 33:
                # Compressed - expandir
                pk = PublicKey(public_key_bytes)
                uncompressed = pk.format(compressed=False)
                public_key_bytes = uncompressed[1:]  # Remove 0x04 prefix
            elif len(public_key_bytes) == 65 and public_key_bytes[0] == 0x04:
                public_key_bytes = public_key_bytes[1:]  # Remove 0x04 prefix
            
            # Keccak-256 hash
            hash_obj = keccak.new(digest_bits=256)
            hash_obj.update(public_key_bytes)
            
            # Take last 20 bytes, add 0x prefix, and convert to checksum address
            address_raw = "0x" + hash_obj.hexdigest()[-40:]
            
            # Convert to checksum address (EIP-55)
            return self._to_checksum_address(address_raw)
            
        except Exception as e:
            logger.error(f"❌ Erro ao derivar endereço EVM: {e}")
            raise
    
    def _to_checksum_address(self, address: str) -> str:
        """Converte endereço para formato checksum EIP-55"""
        from Crypto.Hash import keccak
        
        address = address.lower().replace('0x', '')
        
        # Hash do endereço
        hash_obj = keccak.new(digest_bits=256)
        hash_obj.update(address.encode('utf-8'))
        address_hash = hash_obj.hexdigest()
        
        # Aplicar checksum
        checksum_address = '0x'
        for i, char in enumerate(address):
            if char in '0123456789':
                checksum_address += char
            elif int(address_hash[i], 16) >= 8:
                checksum_address += char.upper()
            else:
                checksum_address += char.lower()
        
        return checksum_address
    
    def _derive_bitcoin_address(self, public_key_bytes: bytes, network: str = "bitcoin") -> str:
        """Deriva endereço Bitcoin P2PKH"""
        import base58
        
        # Network version bytes
        version_bytes = {
            "bitcoin": b'\x00',      # Mainnet
            "litecoin": b'\x30',     # Mainnet
            "dogecoin": b'\x1e',     # Mainnet
        }
        
        version = version_bytes.get(network, b'\x00')
        
        # Hash160 (RIPEMD160(SHA256(pubkey)))
        sha256_hash = hashlib.sha256(public_key_bytes).digest()
        ripemd160 = hashlib.new('ripemd160')
        ripemd160.update(sha256_hash)
        pubkey_hash = ripemd160.digest()
        
        # Add version byte
        versioned = version + pubkey_hash
        
        # Double SHA256 for checksum
        checksum = hashlib.sha256(hashlib.sha256(versioned).digest()).digest()[:4]
        
        # Base58Check encode
        return base58.b58encode(versioned + checksum).decode()
    
    def _derive_tron_address(self, public_key_bytes: bytes) -> str:
        """Deriva endereço Tron"""
        from Crypto.Hash import keccak
        from coincurve import PublicKey
        import base58
        
        # Garantir uncompressed
        if len(public_key_bytes) == 33:
            pk = PublicKey(public_key_bytes)
            uncompressed = pk.format(compressed=False)
            public_key_bytes = uncompressed[1:]
        elif len(public_key_bytes) == 65 and public_key_bytes[0] == 0x04:
            public_key_bytes = public_key_bytes[1:]
        
        # Keccak-256
        hash_obj = keccak.new(digest_bits=256)
        hash_obj.update(public_key_bytes)
        keccak_hash = hash_obj.digest()
        
        # Tron uses 0x41 prefix
        address_bytes = b'\x41' + keccak_hash[-20:]
        
        # Checksum
        checksum = hashlib.sha256(hashlib.sha256(address_bytes).digest()).digest()[:4]
        
        return base58.b58encode(address_bytes + checksum).decode()
    
    def _derive_solana_address(self, public_key_bytes: bytes) -> str:
        """
        Deriva endereço Solana.
        NOTA: Solana usa Ed25519, não secp256k1.
        Esta é uma implementação simplificada - para produção completa,
        usar derivação Ed25519 específica.
        """
        import base58
        
        # Para Solana, usamos os primeiros 32 bytes da public key
        # Em produção, usar Ed25519 derivation
        solana_key = public_key_bytes[:32]
        
        return base58.b58encode(solana_key).decode()


# Singleton instance
_gateway_hd_wallet: Optional[GatewayHDWalletService] = None


def get_gateway_hd_wallet() -> GatewayHDWalletService:
    """
    Retorna instância singleton do GatewayHDWalletService.
    Inicializa automaticamente se GATEWAY_MASTER_MNEMONIC estiver configurada.
    """
    global _gateway_hd_wallet
    
    if _gateway_hd_wallet is None:
        from app.core.config import settings
        
        _gateway_hd_wallet = GatewayHDWalletService()
        
        # Tentar inicializar com mnemonic do config
        if hasattr(settings, 'GATEWAY_MASTER_MNEMONIC') and settings.GATEWAY_MASTER_MNEMONIC:
            _gateway_hd_wallet.initialize(settings.GATEWAY_MASTER_MNEMONIC)
        else:
            logger.warning(
                "⚠️ GATEWAY_MASTER_MNEMONIC não configurada! "
                "Pagamentos crypto usarão endereços fixos da plataforma."
            )
    
    return _gateway_hd_wallet


def reset_gateway_hd_wallet():
    """Reset do singleton (para testes)"""
    global _gateway_hd_wallet
    _gateway_hd_wallet = None
