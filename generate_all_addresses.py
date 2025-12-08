#!/usr/bin/env python3
"""
Script para gerar todos os endereços faltando para a carteira multi-network.
"""
import sys
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from app.models import Wallet, User, Address
from app.services.wallet_service import WalletService
from app.services.crypto_service import CryptoService

# Database
DATABASE_URL = "sqlite:////Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# All 15 networks
ALL_NETWORKS = [
    "bitcoin", "ethereum", "polygon", "bsc", "base",
    "tron", "solana", "litecoin", "dogecoin", "cardano",
    "avalanche", "polkadot", "chainlink", "shiba", "xrp"
]

async def generate_addresses():
    """Generate addresses for all networks."""
    try:
        wallet_id = "ada6ce2a-9a69-4328-860c-e918d37f23bb"
        
        # Get wallet
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            print(f"❌ Wallet {wallet_id} not found")
            return
        
        print(f"✅ Found wallet: {wallet.name} (type: {wallet.wallet_type})")
        
        # Initialize services
        crypto_service = CryptoService()
        wallet_service = WalletService(crypto_service=crypto_service)
        
        # Get existing addresses
        existing_addresses = db.query(Address).filter(
            Address.wallet_id == wallet_id
        ).all()
        existing_networks = {addr.network for addr in existing_addresses}
        
        print(f"\n📊 Existing addresses: {existing_networks}")
        print(f"📊 Missing networks: {set(ALL_NETWORKS) - existing_networks}\n")
        
        # Generate missing addresses
        for network in ALL_NETWORKS:
            if network not in existing_networks:
                try:
                    print(f"🔨 Generating {network} address...", end=" ")
                    
                    address = await wallet_service.generate_address(
                        db=db,
                        wallet=wallet,
                        address_type="receiving",
                        network=network
                    )
                    
                    print(f"✅ {address.address}")
                    
                except Exception as e:
                    print(f"❌ Error: {str(e)}")
        
        # Show final status
        final_addresses = db.query(Address).filter(
            Address.wallet_id == wallet_id
        ).all()
        
        print(f"\n\n{'='*60}")
        print(f"FINAL STATUS: {len(final_addresses)} addresses generated")
        print(f"{'='*60}")
        
        for addr in sorted(final_addresses, key=lambda x: x.network):
            print(f"  {addr.network.upper():12} -> {addr.address}")
        
        print(f"\n✅ All addresses generated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(generate_addresses())
