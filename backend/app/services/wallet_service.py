from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Any
import uuid
from datetime import datetime
import logging
import hashlib

from app.models.wallet import Wallet
from app.models.address import Address
from app.services.crypto_service import CryptoService
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

class WalletService:
    """Service for wallet operations with HD wallet support."""
    
    # Network-specific BIP44 coin types
    coin_types = {
        "bitcoin": "0",      # BTC - Bitcoin
        "ethereum": "60",    # ETH - Ethereum  
        "polygon": "60",     # MATIC - Polygon (EVM compatible)
        "bsc": "60",         # BNB - Binance Smart Chain (EVM compatible)
        "solana": "501",     # SOL - Solana
        "usdt": "60",        # USDT - Tether (multi-chain, default ETH)
        "litecoin": "2",     # LTC - Litecoin
        "dogecoin": "3",     # DOGE - Dogecoin  
        "cardano": "1815",   # ADA - Cardano
        "avalanche": "9000", # AVAX - Avalanche
        "polkadot": "354",   # DOT - Polkadot
        "chainlink": "60",   # LINK - Chainlink (ERC-20)
        "usdc": "60",        # USDC - USD Coin (multi-chain)
        "shiba": "60",       # SHIB - Shiba Inu (ERC-20)
        "xrp": "144"         # XRP - Ripple
    }
    
    def __init__(self):
        self.crypto_service = CryptoService()
    
    async def get_or_create_master_seed(
        self,
        db: Session,
        user_id: str,
        passphrase: str = ""
    ) -> Dict[str, Any]:
        """
        🔑 Get existing master seed or create new one for user.
        
        This ensures ALL wallets use the SAME 12-word seed!
        """
        try:
            # Check if user already has any wallet (master seed exists)
            existing_wallet = db.query(Wallet).filter(
                Wallet.user_id == user_id,
                Wallet.is_active == True
            ).first()
            
            if existing_wallet:
                # Use existing master seed
                logger.info(f"Using existing master seed for user {user_id}")
                mnemonic = self.crypto_service.decrypt_data(str(existing_wallet.encrypted_seed))
                
                # Regenerate wallet data from existing mnemonic
                wallet_data = self.crypto_service.generate_wallet_data_from_mnemonic(mnemonic, passphrase)
                wallet_data["mnemonic"] = mnemonic
                wallet_data["is_new_seed"] = False
                
                return wallet_data
            else:
                # Create new master seed (first wallet)
                logger.info(f"Creating new master seed for user {user_id}")
                wallet_data = self.crypto_service.generate_wallet_data(passphrase)
                wallet_data["is_new_seed"] = True
                
                return wallet_data
                
        except Exception as e:
            logger.error(f"Failed to get/create master seed: {e}")
            raise ValidationError(f"Failed to get/create master seed: {str(e)}")
    
    async def create_wallet_with_mnemonic(
        self,
        db: Session,
        user_id: str,
        name: str,
        network: str,
        passphrase: str = ""
    ) -> Dict[str, Any]:
        """Create a new HD wallet using a shared master seed (first wallet creates it)."""
        try:
            logger.info(f"Creating HD wallet for user {user_id} on {network}")

            # Auto-gerar nome se vazio
            if not name or not name.strip():
                name = f"Wallet {network.title()}"

            # Obter ou criar seed mestre
            wallet_data = await self.get_or_create_master_seed(db, user_id, passphrase)

            # Derivation path BIP44
            coin_type = self.coin_types.get(network.lower(), "0")
            derivation_path = f"m/44'/{coin_type}'/0'"

            # Criar wallet via SQLAlchemy (removido hack sqlite)
            wallet = Wallet(
                user_id=user_id,
                name=name,
                network=network.lower(),
                derivation_path=derivation_path,
                encrypted_seed=wallet_data["encrypted_mnemonic"],
                seed_hash=wallet_data["seed_hash"],
            )
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

            # Gerar primeiro endereço (receiving index 0)
            receiving_address = await self.generate_address(
                db=db,
                wallet=wallet,
                address_type="receiving",
                derivation_index=0,
                wallet_data=wallet_data
            )

            # Se for carteira multi, gerar endereços para todas as redes suportadas
            if network.lower() == "multi":
                logger.info(f"Generating addresses for all networks in multi-chain wallet {wallet.id}")
                supported_networks = ["bitcoin", "ethereum", "polygon", "bsc"]
                
                for net in supported_networks:
                    try:
                        # Gerar endereço específico para esta rede
                        await self._generate_network_address(
                            db=db,
                            wallet=wallet,
                            network=net,
                            wallet_data=wallet_data
                        )
                    except Exception as e:
                        logger.warning(f"Failed to generate {net} address for wallet {wallet.id}: {e}")

            logger.info(f"Created wallet {wallet.id} with address {receiving_address.address}")

            return {
                "wallet": wallet,
                "mnemonic": wallet_data.get("mnemonic") if wallet_data.get("is_new_seed") else None,
                "first_address": receiving_address.address,
                "derivation_path": derivation_path,
                "network": network.lower(),
                "is_new_seed": wallet_data.get("is_new_seed", False)
            }
        except Exception as e:
            logger.error(f"Failed to create wallet: {e}")
            db.rollback()
            raise ValidationError(f"Failed to create wallet: {str(e)}")

    async def restore_wallet_from_mnemonic(
        self,
        db: Session,
        user_id: str,
        name: str,
        network: str,
        mnemonic: str,
        passphrase: str = ""
    ) -> Dict[str, Any]:
        """
        Restore wallet from existing mnemonic phrase.
        
        Args:
            db: Database session
            user_id: User ID
            name: Wallet name
            network: Blockchain network
            mnemonic: BIP39 mnemonic phrase
            passphrase: Optional passphrase
            
        Returns:
            Dictionary with restored wallet data
        """
        try:
            logger.info(f"Restoring wallet for user {user_id} on {network}")
            
            # Validate mnemonic
            if not self.crypto_service.validate_mnemonic(mnemonic):
                raise ValidationError("Invalid mnemonic phrase")
            
            # Generate seed and master keys
            seed = self.crypto_service.mnemonic_to_seed(mnemonic, passphrase)
            master_keys = self.crypto_service.derive_master_keys(seed)
            
            # Encrypt mnemonic for storage
            encrypted_mnemonic = self.crypto_service.encrypt_data(mnemonic)
            seed_hash = hashlib.sha256(seed).hexdigest()
            
            # Get coin type for network
            coin_type = self.coin_types.get(network.lower(), "0")
            derivation_path = f"m/44'/{coin_type}'/0'"
            
            # Create wallet in database
            wallet = Wallet(
                user_id=user_id,
                name=name,
                network=network,
                derivation_path=derivation_path,
                encrypted_seed=encrypted_mnemonic,
                seed_hash=seed_hash
            )
            
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
            
            # Generate first receiving address
            wallet_data = {
                "master_keys": master_keys,
                "encrypted_mnemonic": encrypted_mnemonic
            }
            
            receiving_address = await self.generate_address(
                db=db,
                wallet=wallet,
                address_type="receiving",
                derivation_index=0,
                wallet_data=wallet_data
            )
            
            logger.info(f"Restored wallet {wallet.id} with address {receiving_address.address}")
            
            return {
                "wallet": wallet,
                "first_address": receiving_address.address,
                "derivation_path": derivation_path,
                "network": network,
                "restored": True
            }
            
        except Exception as e:
            logger.error(f"Failed to restore wallet: {e}")
            db.rollback()
            raise ValidationError(f"Failed to restore wallet: {str(e)}")
    
    async def generate_address(
        self,
        db: Session,
        wallet: Wallet,
        address_type: str = "receiving",
        derivation_index: Optional[int] = None,
        wallet_data: Optional[Dict] = None
    ) -> Address:
        """
        Generate a new address for a wallet.
        
        Args:
            db: Database session
            wallet: Wallet object
            address_type: Address type (receiving/change)
            derivation_index: Specific index or auto-increment
            wallet_data: Pre-computed wallet data (optional)
            
        Returns:
            Generated Address object
        """
        try:
            # Get next index if not specified
            if derivation_index is None:
                last_address = db.query(Address).filter(
                    Address.wallet_id == wallet.id,
                    Address.address_type == address_type
                ).order_by(Address.derivation_index.desc()).first()
                
                # Get the actual integer value from the database row
                last_index = getattr(last_address, 'derivation_index', None)
                derivation_index = (last_index + 1) if last_index is not None else 0
            
            # Decrypt wallet seed if wallet_data not provided
            if not wallet_data:
                decrypted_mnemonic = self.crypto_service.decrypt_data(str(wallet.encrypted_seed))
                seed = self.crypto_service.mnemonic_to_seed(decrypted_mnemonic)
                master_keys = self.crypto_service.derive_master_keys(seed)
                wallet_data = {"master_keys": master_keys}
            
            # Derive address
            change_index = 1 if address_type == "change" else 0
            network_name = str(wallet.network)  # Convert to string
            derivation_index = derivation_index or 0  # Ensure it's not None
            
            address_data = self.crypto_service.derive_network_address(
                bip32=wallet_data["master_keys"]["bip32"],
                network=network_name,
                account=0,
                change=change_index,
                address_index=derivation_index
            )
            
            # Create address in database
            address = Address(
                wallet_id=wallet.id,  # corrigido (antes string)
                address=address_data["address"],
                network=network_name,
                address_type=address_type,
                derivation_index=derivation_index,
                encrypted_private_key=address_data["private_key_encrypted"],
                derivation_path=address_data["derivation_path"]
            )
            
            db.add(address)
            db.commit()
            db.refresh(address)
            
            logger.info(f"Generated {address_type} address {address.address} for wallet {wallet.id}")
            
            return address
            
        except Exception as e:
            logger.error(f"Failed to generate address: {e}")
            db.rollback()
            raise ValidationError(f"Failed to generate address: {str(e)}")
    
    async def get_wallet_addresses(
        self,
        db: Session,
        wallet_id: str,
        address_type: Optional[str] = None
    ) -> List[Address]:
        """Get all addresses for a wallet."""
        try:
            query = db.query(Address).filter(Address.wallet_id == wallet_id)
            
            if address_type:
                query = query.filter(Address.address_type == address_type)
            
            addresses = query.order_by(Address.derivation_index).all()
            return addresses
            
        except Exception as e:
            logger.error(f"Failed to get wallet addresses: {e}")
            raise ValidationError(f"Failed to get wallet addresses: {str(e)}")
    
    async def _generate_network_address(
        self,
        db: Session,
        wallet: Wallet,
        network: str,
        wallet_data: Dict
    ) -> Address:
        """
        Generate address for a specific network in a multi-chain wallet.
        
        Args:
            db: Database session
            wallet: Wallet object (must be multi-chain)
            network: Network name (bitcoin, ethereum, polygon, bsc)
            wallet_data: Pre-computed wallet data with master keys
            
        Returns:
            Generated Address object for the specific network
        """
        try:
            logger.info(f"Generating {network} address for multi-wallet {wallet.id}")
            
            # Derive address for specific network
            address_data = self.crypto_service.derive_network_address(
                bip32=wallet_data["master_keys"]["bip32"],
                network=network,
                account=0,
                change=0,  # receiving address
                address_index=0  # first address
            )
            
            # Create address in database
            address = Address(
                wallet_id=wallet.id,
                address=address_data["address"],
                network=network,
                address_type="receiving",
                derivation_index=0,
                encrypted_private_key=address_data["private_key_encrypted"],
                derivation_path=address_data["derivation_path"]
            )
            
            db.add(address)
            db.commit()
            db.refresh(address)
            
            logger.info(f"Generated {network} address {address.address} for wallet {wallet.id}")
            
            return address
            
        except Exception as e:
            logger.error(f"Failed to generate {network} address: {e}")
            db.rollback()
            raise ValidationError(f"Failed to generate {network} address: {str(e)}")
    
    async def validate_wallet_ownership(
        self,
        db: Session,
        wallet_id: str,
        user_id: str
    ) -> bool:
        """Validate that user owns the wallet."""
        try:
            wallet = db.query(Wallet).filter(
                Wallet.id == wallet_id,
                Wallet.user_id == user_id
            ).first()
            
            return wallet is not None
            
        except Exception as e:
            logger.error(f"Failed to validate wallet ownership: {e}")
            return False
    
    async def get_wallet_mnemonic(
        self,
        db: Session,
        wallet_id: str
    ) -> str:
        """
        🔐 Get wallet mnemonic (12 palavras-chave).
        
        ⚠️  SECURITY CRITICAL: This returns the seed phrase!
        Only call this method after proper authentication and ownership validation.
        """
        try:
            # Get wallet from database
            wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
            
            if not wallet:
                raise ValidationError("Wallet not found")
            
            # Decrypt and return mnemonic
            # The encrypted_seed contains the mnemonic
            mnemonic = self.crypto_service.decrypt_seed(str(wallet.encrypted_seed))
            
            logger.warning(f"🚨 SENSITIVE: Mnemonic accessed for wallet {wallet_id}")
            
            return mnemonic
            
        except Exception as e:
            logger.error(f"Failed to get wallet mnemonic: {e}")
            raise ValidationError(f"Failed to get wallet mnemonic: {str(e)}")

# Add required import
import hashlib

# Global instance
wallet_service = WalletService()
