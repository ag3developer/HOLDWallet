"""
Crypto service for HD wallet management.
Handles mnemonic generation, seed derivation, and address generation.
"""

import os
import hashlib
import hmac
import base58
from typing import List, Optional, Tuple, Dict, Any
from mnemonic import Mnemonic
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import secrets
from bip32 import BIP32
import logging
from datetime import datetime
from Crypto.Hash import keccak

from app.core.config import settings

logger = logging.getLogger(__name__)

class CryptoService:
    """Service for cryptographic operations."""
    
    def __init__(self):
        self.mnemo = Mnemonic("english")
        # Generate or load master encryption key
        self._encryption_key = self._get_encryption_key()
    
    def _get_encryption_key(self) -> bytes:
        """Get or generate encryption key for secure storage."""
        # In production, this should be stored securely (e.g., environment variable, HSM)
        key = settings.ENCRYPTION_KEY if hasattr(settings, 'ENCRYPTION_KEY') else None
        
        if not key:
            # Generate a new key - store this securely in production!
            key = Fernet.generate_key()
            logger.warning("Generated new encryption key. Store this securely!")
            logger.warning(f"ENCRYPTION_KEY: {key.decode()}")
        
        if isinstance(key, str):
            key = key.encode()
            
        return key
    
    def generate_mnemonic(self, strength: int = 128) -> str:
        """
        Generate a new mnemonic phrase.
        
        Args:
            strength: Entropy bits (128=12 words, 256=24 words)
            
        Returns:
            Mnemonic phrase as string
        """
        try:
            mnemonic = self.mnemo.generate(strength=strength)
            logger.info(f"Generated mnemonic with {len(mnemonic.split())} words")
            return mnemonic
        except Exception as e:
            logger.error(f"Failed to generate mnemonic: {e}")
            raise
    
    def validate_mnemonic(self, mnemonic: str) -> bool:
        """Validate if mnemonic phrase is valid."""
        try:
            return self.mnemo.check(mnemonic)
        except Exception as e:
            logger.error(f"Failed to validate mnemonic: {e}")
            return False
    
    def mnemonic_to_seed(self, mnemonic: str, passphrase: str = "") -> bytes:
        """
        Convert mnemonic phrase to seed.
        
        Args:
            mnemonic: BIP39 mnemonic phrase
            passphrase: Optional passphrase for additional security
            
        Returns:
            64-byte seed
        """
        try:
            if not self.validate_mnemonic(mnemonic):
                raise ValueError("Invalid mnemonic phrase")
            
            seed = self.mnemo.to_seed(mnemonic, passphrase)
            return seed
        except Exception as e:
            logger.error(f"Failed to convert mnemonic to seed: {e}")
            raise
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data."""
        try:
            f = Fernet(self._encryption_key)
            encrypted_data = f.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt data: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        try:
            if not encrypted_data:
                logger.error("Failed to decrypt data: encrypted_data is empty or None")
                raise ValueError("Encrypted data is empty")
            
            f = Fernet(self._encryption_key)
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = f.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            # Log mais detalhado para debug
            error_type = type(e).__name__
            logger.error(f"Failed to decrypt data: [{error_type}] {str(e)}")
            logger.error(f"Encrypted data length: {len(encrypted_data) if encrypted_data else 0}")
            logger.error(f"Encryption key prefix: {self._encryption_key[:10].decode() if self._encryption_key else 'None'}...")
            raise
    
    def decrypt_seed(self, encrypted_mnemonic: str) -> str:
        """
        🔐 Decrypt wallet mnemonic (seed phrase).
        
        Args:
            encrypted_mnemonic: Base64 encoded encrypted mnemonic
            
        Returns:
            Original mnemonic phrase (12 palavras-chave)
        """
        return self.decrypt_data(encrypted_mnemonic)
    
    def derive_master_keys(self, seed: bytes) -> Dict[str, Any]:
        """
        Derive master private and public keys from seed.
        
        Args:
            seed: 64-byte seed from mnemonic
            
        Returns:
            Dictionary with master keys and BIP32 object
        """
        try:
            bip32 = BIP32.from_seed(seed)
            master_private_key = bip32.get_privkey_from_path("m")
            master_public_key = bip32.get_pubkey_from_path("m")
            
            return {
                "bip32": bip32,
                "master_private_key": master_private_key.hex(),
                "master_public_key": master_public_key.hex(),
                "chaincode": "master"  # Simplified for this implementation
            }
        except Exception as e:
            logger.error(f"Failed to derive master keys: {e}")
            raise
    
    def derive_address_keys(
        self, 
        bip32: BIP32, 
        derivation_path: str
    ) -> Dict[str, str]:
        """
        Derive address keys from BIP32 object.
        
        Args:
            bip32: BIP32 object
            derivation_path: HD derivation path (e.g., "m/44'/0'/0'/0/0")
            
        Returns:
            Dictionary with private key, public key, and address
        """
        try:
            private_key = bip32.get_privkey_from_path(derivation_path)
            public_key = bip32.get_pubkey_from_path(derivation_path)
            
            return {
                "private_key": private_key.hex(),
                "public_key": public_key.hex(),
                "derivation_path": derivation_path
            }
        except Exception as e:
            logger.error(f"Failed to derive address keys for path {derivation_path}: {e}")
            raise
    
    def generate_wallet_data(self, passphrase: str = "") -> Dict[str, Any]:
        """
        Generate complete wallet data with mnemonic and master keys.
        
        Args:
            passphrase: Optional passphrase for additional security
            
        Returns:
            Dictionary with wallet data
        """
        try:
            # Generate mnemonic (12 words by default)
            mnemonic = self.generate_mnemonic(strength=128)
            
            # Convert to seed
            seed = self.mnemonic_to_seed(mnemonic, passphrase)
            
            # Derive master keys
            master_keys = self.derive_master_keys(seed)
            
            # Encrypt mnemonic for storage
            encrypted_mnemonic = self.encrypt_data(mnemonic)
            
            return {
                "mnemonic": mnemonic,  # NEVER store this unencrypted!
                "encrypted_mnemonic": encrypted_mnemonic,
                "seed_hash": hashlib.sha256(seed).hexdigest(),  # For verification
                "master_keys": master_keys,
                "seed": seed,  # Raw seed for Ed25519 derivation (Solana, etc)
                "created_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to generate wallet data: {e}")
            raise
    
    def generate_wallet_data_from_mnemonic(self, mnemonic: str, passphrase: str = "") -> Dict[str, Any]:
        """
        🔑 Generate wallet data from existing mnemonic.
        
        This allows multiple wallets to use the SAME master seed!
        
        Args:
            mnemonic: Existing BIP39 mnemonic phrase
            passphrase: Optional passphrase for additional security
            
        Returns:
            Dictionary with wallet data using existing mnemonic
        """
        try:
            # Validate mnemonic
            if not self.mnemo.check(mnemonic):
                raise ValueError("Invalid mnemonic phrase")
            
            # Convert to seed
            seed = self.mnemonic_to_seed(mnemonic, passphrase)
            
            # Derive master keys
            master_keys = self.derive_master_keys(seed)
            
            # Encrypt mnemonic for storage
            encrypted_mnemonic = self.encrypt_data(mnemonic)
            
            return {
                "mnemonic": mnemonic,  # Original mnemonic
                "encrypted_mnemonic": encrypted_mnemonic,
                "seed_hash": hashlib.sha256(seed).hexdigest(),  # For verification
                "master_keys": master_keys,
                "seed": seed,  # Raw seed for Ed25519 derivation (Solana, etc)
                "created_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to generate wallet data from mnemonic: {e}")
            raise
    
    def derive_network_address(
        self, 
        bip32: BIP32, 
        network: str, 
        account: int = 0, 
        change: int = 0, 
        address_index: int = 0,
        seed: Optional[bytes] = None  # Necessário para redes Ed25519 como Solana
    ) -> Dict[str, Any]:
        """
        Derive address for specific network.
        
        Args:
            bip32: BIP32 object
            network: Network type (bitcoin, ethereum, solana, etc.)
            account: Account index
            change: Change index (0=receiving, 1=change)
            address_index: Address index
            seed: Raw seed bytes (required for Ed25519 networks like Solana)
            
        Returns:
            Dictionary with address data
        """
        try:
            network_lower = network.lower()
            
            # ============================================
            # SOLANA - Usa Ed25519, não secp256k1/BIP44
            # ============================================
            if network_lower == 'solana':
                return self._derive_solana_address(seed, address_index)
            
            # ============================================
            # OUTRAS REDES - BIP44/secp256k1 padrão
            # ============================================
            # Network-specific derivation paths (BIP44)
            coin_types = {
                "bitcoin": "0",
                "ethereum": "60",
                "polygon": "60",
                "bsc": "60",
                "tron": "195",  # Tron has its own coin type
                "base": "60",   # Base is Ethereum L2, uses same derivation as ETH
                "litecoin": "2",
                "multi": "60"  # Multi-chain wallet uses Ethereum derivation (EVM compatible)
            }
            
            coin_type = coin_types.get(network_lower, "0")
            derivation_path = f"m/44'/{coin_type}'/{account}'/{change}/{address_index}"
            
            # Derive keys
            keys = self.derive_address_keys(bip32, derivation_path)
            
            # Generate address (this would be network-specific)
            address = self._generate_network_address(keys["public_key"], network)
            
            return {
                "address": address,
                "derivation_path": derivation_path,
                "public_key": keys["public_key"],
                "private_key_encrypted": self.encrypt_data(keys["private_key"]),
                "network": network,
                "account": account,
                "change": change,
                "address_index": address_index
            }
        except Exception as e:
            logger.error(f"Failed to derive {network} address: {e}")
            raise
    
    def _derive_solana_address(self, seed: Optional[bytes], address_index: int = 0) -> Dict[str, Any]:
        """
        Derive Solana address using Ed25519.
        Solana usa curva Ed25519, não secp256k1.
        
        Args:
            seed: Raw seed bytes from mnemonic
            address_index: Index for multiple addresses
            
        Returns:
            Dictionary with address data
        """
        try:
            if not seed:
                raise ValueError("Seed is required for Solana address derivation")
            
            # Derivar usando SLIP-0010 para Ed25519
            # Solana derivation path: m/44'/501'/{account}'/0/{address_index}'
            # Mas a maioria das wallets usa derivação simplificada
            
            # Usar PBKDF2 para derivar chave Ed25519 a partir da seed
            derived = hashlib.pbkdf2_hmac(
                'sha512', 
                seed, 
                b'solana' + str(address_index).encode(),  # Salt inclui index 
                2048
            )[:32]  # Ed25519 usa 32 bytes
            
            # Importar solders para criar keypair
            try:
                from solders.keypair import Keypair
                keypair = Keypair.from_seed(derived)
                address = str(keypair.pubkey())
                # Chave privada completa (64 bytes: 32 seed + 32 pubkey)
                private_key_bytes = bytes(keypair)
                private_key_hex = private_key_bytes.hex()
            except ImportError:
                logger.warning("solders not installed, using fallback Ed25519 derivation")
                # Fallback usando nacl
                import nacl.signing
                signing_key = nacl.signing.SigningKey(derived)
                verify_key = signing_key.verify_key
                address = base58.b58encode(bytes(verify_key)).decode('utf-8')
                # Chave privada em hex (32 bytes seed + 32 bytes pubkey para Ed25519)
                private_key_hex = (bytes(signing_key) + bytes(verify_key)).hex()
            
            derivation_path = f"m/44'/501'/0'/0/{address_index}"
            
            logger.info(f"✅ Generated Solana Ed25519 address: {address}")
            
            return {
                "address": address,
                "derivation_path": derivation_path,
                "public_key": address,  # Para Solana, o endereço É a chave pública
                "private_key_encrypted": self.encrypt_data(private_key_hex),
                "network": "solana",
                "account": 0,
                "change": 0,
                "address_index": address_index
            }
            
        except Exception as e:
            logger.error(f"Failed to derive Solana address: {e}")
            raise
    
    def _generate_network_address(self, public_key: str, network: str) -> str:
        """
        Generate valid address for specific network.
        """
        try:
            if network.lower() in ["bitcoin", "litecoin", "dogecoin"]:
                # Bitcoin-like address generation using bitcoinlib
                from bitcoinlib.keys import Key
                
                # Convert hex public key to Key object
                if public_key.startswith('0x'):
                    public_key = public_key[2:]
                
                # Create compressed public key (33 bytes)
                key = Key(public_key, compressed=True)
                
                # Generate P2PKH address for all Bitcoin-like networks
                # bitcoinlib handles the correct prefix for each network
                address = key.address()
                
                logger.info(f"Generated {network} address: {address}")
                return address
            
            elif network.lower() in ["ethereum", "polygon", "bsc", "usdt", "multi", "base"]:
                # Ethereum-compatible address generation using proper Keccak-256
                # BSC, Polygon, Base, USDT (on ETH), and multi-chain use the same format
                # Base is an Ethereum L2 and uses the same address format
                
                # Remove 0x prefix if present
                if public_key.startswith('0x'):
                    public_key = public_key[2:]
                
                # Convert to bytes
                public_key_bytes = bytes.fromhex(public_key)
                
                # Take last 64 bytes (uncompressed public key without 0x04 prefix)
                if len(public_key_bytes) == 65 and public_key_bytes[0] == 0x04:
                    public_key_bytes = public_key_bytes[1:]
                elif len(public_key_bytes) == 64:
                    pass  # Already correct format
                else:
                    # If compressed, decompress first
                    from coincurve import PublicKey
                    pk = PublicKey(public_key_bytes)
                    uncompressed = pk.format(compressed=False)
                    public_key_bytes = uncompressed[1:]  # Remove 0x04 prefix
                
                # Keccak-256 hash
                hash_obj = keccak.new(digest_bits=256)
                hash_obj.update(public_key_bytes)
                
                # Take last 20 bytes and add 0x prefix
                address = "0x" + hash_obj.hexdigest()[-40:]
                
                logger.info(f"Generated {network} address: {address}")
                return address
            
            elif network.lower() == "tron":
                # Tron (TRC-20) address generation using KECCAK-256 + Base58Check
                
                # Remove 0x prefix if present
                if public_key.startswith('0x'):
                    public_key = public_key[2:]
                
                # Convert to bytes
                public_key_bytes = bytes.fromhex(public_key)
                
                # Take last 64 bytes (uncompressed public key without 0x04 prefix)
                if len(public_key_bytes) == 65 and public_key_bytes[0] == 0x04:
                    public_key_bytes = public_key_bytes[1:]
                elif len(public_key_bytes) == 64:
                    pass  # Already correct format
                else:
                    # If compressed, decompress first
                    from coincurve import PublicKey
                    pk = PublicKey(public_key_bytes)
                    uncompressed = pk.format(compressed=False)
                    public_key_bytes = uncompressed[1:]  # Remove 0x04 prefix
                
                # Keccak-256 hash
                hash_obj = keccak.new(digest_bits=256)
                hash_obj.update(public_key_bytes)
                keccak_hash = hash_obj.digest()
                
                # Tron uses 0x41 prefix for mainnet addresses
                address_bytes = b'\x41' + keccak_hash[-20:]
                
                # Double SHA-256 for checksum
                checksum = hashlib.sha256(hashlib.sha256(address_bytes).digest()).digest()[:4]
                
                # Base58Check encoding
                address = base58.b58encode(address_bytes + checksum).decode('utf-8')
                
                logger.info(f"Generated Tron address: {address}")
                return address
            
            elif network.lower() == "solana":
                # Solana address generation using base58 encoding
                
                # Remove 0x prefix if present
                if public_key.startswith('0x'):
                    public_key = public_key[2:]
                
                # For Solana, use the first 32 bytes of the public key
                public_key_bytes = bytes.fromhex(public_key)
                
                # Take first 32 bytes for Solana address
                solana_key = public_key_bytes[:32]
                
                # Encode as base58
                address = base58.b58encode(solana_key).decode('utf-8')
                
                logger.info(f"Generated Solana address: {address}")
                return address
                
            elif network.lower() in ["cardano"]:
                # Cardano uses a different approach - for now return a placeholder
                # In production, you'd need cardano-python or similar library
                address = f"addr1{public_key[-40:]}"  # Simplified placeholder
                logger.info(f"Generated Cardano address: {address}")
                return address
                
            elif network.lower() in ["xrp"]:
                # XRP addresses use different encoding - placeholder for now
                # In production, you'd need xrpl-py or similar library  
                address = f"r{public_key[-30:]}"  # Simplified placeholder
                logger.info(f"Generated XRP address: {address}")
                return address
                
            elif network.lower() in ["avalanche", "polkadot", "chainlink", "usdc", "shiba"]:
                # For networks we don't have specific implementations yet, 
                # default to Ethereum-style addresses as many are EVM compatible
                
                # Remove '0x' if present
                if public_key.startswith('0x'):
                    public_key = public_key[2:]
                
                # Get public key bytes
                public_key_bytes = bytes.fromhex(public_key)
                
                # For uncompressed key, remove the first byte (0x04)
                if len(public_key_bytes) == 65 and public_key_bytes[0] == 4:
                    public_key_bytes = public_key_bytes[1:]
                elif len(public_key_bytes) == 33:
                    # Compressed key - expand to uncompressed for Keccak
                    try:
                        from coincurve import PublicKey
                        pub_key = PublicKey(public_key_bytes)
                        public_key_bytes = pub_key.format(compressed=False)[1:]  # Remove 0x04 prefix
                    except ImportError:
                        # Fallback if coincurve not available
                        logger.warning(f"coincurve not available for {network}, using simplified address")
                        address = f"0x{public_key[:40]}"
                        return address
                
                # Keccak hash
                keccak_hash = keccak.new(digest_bits=256)
                keccak_hash.update(public_key_bytes)
                hash_bytes = keccak_hash.digest()
                
                # Take last 20 bytes and add 0x prefix
                address = '0x' + hash_bytes[-20:].hex()
                logger.info(f"Generated {network} address: {address}")
                return address
            
            else:
                raise ValueError(f"Unsupported network: {network}")
                
        except Exception as e:
            logger.error(f"Failed to generate {network} address: {e}")
            raise


# Global instance
crypto_service = CryptoService()
