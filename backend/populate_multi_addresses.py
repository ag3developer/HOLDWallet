"""
Script para gerar endereços de todas as redes para carteiras multi existentes
"""
import asyncio
from sqlalchemy.orm import Session
from app.core.db import SessionLocal, init_db
from app.models.wallet import Wallet
from app.services.wallet_service import WalletService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def populate_multi_wallet_addresses():
    """Gerar endereços para todas as redes em carteiras multi existentes"""
    logger.info("Iniciando população de endereços para carteiras multi...")
    
    # Initialize database
    init_db()
    db: Session = SessionLocal()
    
    try:
        # Encontrar todas as carteiras multi
        multi_wallets = db.query(Wallet).filter(
            Wallet.network == 'multi',
            Wallet.is_active == True
        ).all()
        
        logger.info(f"Encontradas {len(multi_wallets)} carteiras multi")
        
        wallet_service = WalletService()
        
        for wallet in multi_wallets:
            logger.info(f"\nProcessando carteira {wallet.id} ({wallet.name})")
            
            # Descriptografar seed
            try:
                decrypted_mnemonic = wallet_service.crypto_service.decrypt_data(str(wallet.encrypted_seed))
                seed = wallet_service.crypto_service.mnemonic_to_seed(decrypted_mnemonic)
                master_keys = wallet_service.crypto_service.derive_master_keys(seed)
                wallet_data = {"master_keys": master_keys}
                
                # Redes suportadas (agora com Tron e Base)
                supported_networks = ["bitcoin", "ethereum", "polygon", "bsc", "tron", "base"]
                
                for network in supported_networks:
                    # Verificar se já existe endereço para esta rede
                    from app.models.address import Address
                    existing = db.query(Address).filter(
                        Address.wallet_id == wallet.id,
                        Address.network == network
                    ).first()
                    
                    if existing:
                        logger.info(f"  ✓ {network}: {existing.address} (já existe)")
                        continue
                    
                    # Gerar novo endereço
                    try:
                        address = await wallet_service._generate_network_address(
                            db=db,
                            wallet=wallet,
                            network=network,
                            wallet_data=wallet_data
                        )
                        logger.info(f"  ✅ {network}: {address.address} (criado)")
                    except Exception as e:
                        logger.error(f"  ❌ {network}: Erro - {e}")
                
            except Exception as e:
                logger.error(f"Erro ao processar carteira {wallet.id}: {e}")
                continue
        
        logger.info("\n✅ População de endereços concluída!")
        
    except Exception as e:
        logger.error(f"Erro geral: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(populate_multi_wallet_addresses())
