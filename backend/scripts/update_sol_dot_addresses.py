"""
🔄 Script para Atualizar Endereços Solana e Polkadot do Sistema
================================================================

Este script atualiza os endereços placeholder de Solana e Polkadot
para endereços REAIS.

Solana: Ed25519 (curva diferente de Bitcoin/Ethereum)
Polkadot: sr25519 (curva Schnorr)
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.models.system_blockchain_wallet import SystemBlockchainWallet, SystemBlockchainAddress
from app.services.crypto_service import CryptoService


def generate_solana_address_from_seed(seed_bytes: bytes) -> tuple:
    """
    Gera endereço Solana a partir de seed bytes.
    Solana usa Ed25519.
    
    Returns:
        (address, private_key_bytes)
    """
    from solders.keypair import Keypair
    import hashlib
    
    # Derivar 32 bytes para Ed25519 usando HMAC-SHA512
    derived = hashlib.pbkdf2_hmac('sha512', seed_bytes, b'solana', 2048)[:32]
    
    # Criar keypair Solana
    keypair = Keypair.from_seed(derived)
    
    address = str(keypair.pubkey())
    private_key = bytes(keypair)
    
    return address, private_key.hex()


def generate_polkadot_address_from_seed(seed_bytes: bytes) -> tuple:
    """
    Gera endereço Polkadot a partir de seed bytes.
    Polkadot usa sr25519 (Schnorr).
    
    Returns:
        (address, private_key_hex)
    """
    from substrateinterface import Keypair as SubstrateKeypair
    import hashlib
    
    # Derivar 32 bytes para sr25519
    derived = hashlib.pbkdf2_hmac('sha512', seed_bytes, b'polkadot', 2048)[:32]
    
    # Criar keypair Polkadot
    # SS58 format 0 = Polkadot mainnet
    keypair = SubstrateKeypair.create_from_seed(
        seed_hex='0x' + derived.hex(),
        ss58_format=0  # Polkadot mainnet
    )
    
    address = keypair.ss58_address
    private_key = derived.hex()
    
    return address, private_key


def update_solana_polkadot():
    """Atualiza endereços Solana e Polkadot do sistema."""
    
    print("=" * 70)
    print("🔄 ATUALIZADOR DE ENDEREÇOS SOLANA E POLKADOT")
    print("=" * 70)
    
    db = SessionLocal()
    crypto_service = CryptoService()
    
    try:
        # Buscar carteira do sistema
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            print("❌ Carteira do sistema não encontrada!")
            return False
        
        print(f"✅ Carteira: {wallet.id}")
        
        # Recuperar seed da carteira
        print("\n🔑 Recuperando seed da carteira...")
        mnemonic = crypto_service.decrypt_data(wallet.encrypted_seed)
        seed = crypto_service.mnemonic_to_seed(mnemonic)
        
        print(f"   Seed recuperada: {seed[:10].hex()}...{seed[-10:].hex()}")
        
        updated = []
        
        # ============================================
        # SOLANA
        # ============================================
        print("\n" + "=" * 50)
        print("🟣 SOLANA")
        print("=" * 50)
        
        sol_address_obj = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.network == "solana"
        ).first()
        
        if sol_address_obj:
            old_sol = sol_address_obj.address
            print(f"   Endereço atual: {old_sol}")
            
            if old_sol.startswith('So') or len(old_sol) < 32:
                print("   ⚠️  É placeholder! Gerando endereço REAL...")
                
                try:
                    new_sol, sol_priv = generate_solana_address_from_seed(seed)
                    print(f"   ✅ Novo endereço: {new_sol}")
                    
                    # Atualizar
                    sol_address_obj.address = new_sol
                    sol_address_obj.encrypted_private_key = crypto_service.encrypt_data(sol_priv)
                    updated.append(('SOLANA', old_sol, new_sol))
                    
                except Exception as e:
                    print(f"   ❌ Erro: {e}")
            else:
                print("   ✅ Já parece ser válido!")
        else:
            print("   ⚠️  Endereço Solana não encontrado na carteira")
        
        # ============================================
        # POLKADOT
        # ============================================
        print("\n" + "=" * 50)
        print("🔴 POLKADOT")
        print("=" * 50)
        
        dot_address_obj = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.network == "polkadot"
        ).first()
        
        if dot_address_obj:
            old_dot = dot_address_obj.address
            print(f"   Endereço atual: {old_dot}")
            
            # Polkadot válido começa com 1 e tem ~48 chars, mas nosso placeholder começa com 1 também
            if len(old_dot) > 50 or not old_dot.startswith('1'):
                print("   ⚠️  É placeholder! Gerando endereço REAL...")
                
                try:
                    new_dot, dot_priv = generate_polkadot_address_from_seed(seed)
                    print(f"   ✅ Novo endereço: {new_dot}")
                    
                    # Atualizar
                    dot_address_obj.address = new_dot
                    dot_address_obj.encrypted_private_key = crypto_service.encrypt_data(dot_priv)
                    updated.append(('POLKADOT', old_dot, new_dot))
                    
                except Exception as e:
                    print(f"   ❌ Erro: {e}")
            else:
                # Verificar se é realmente válido (Polkadot SS58 tem checksum)
                try:
                    from substrateinterface import Keypair as SubstrateKeypair
                    SubstrateKeypair(ss58_address=old_dot)
                    print("   ✅ Endereço válido!")
                except:
                    print("   ⚠️  Endereço inválido! Gerando REAL...")
                    try:
                        new_dot, dot_priv = generate_polkadot_address_from_seed(seed)
                        print(f"   ✅ Novo endereço: {new_dot}")
                        
                        dot_address_obj.address = new_dot
                        dot_address_obj.encrypted_private_key = crypto_service.encrypt_data(dot_priv)
                        updated.append(('POLKADOT', old_dot, new_dot))
                    except Exception as e:
                        print(f"   ❌ Erro: {e}")
        else:
            print("   ⚠️  Endereço Polkadot não encontrado na carteira")
        
        # ============================================
        # RESUMO E COMMIT
        # ============================================
        if updated:
            print("\n" + "=" * 70)
            print("📋 RESUMO DAS ATUALIZAÇÕES:")
            print("=" * 70)
            for network, old, new in updated:
                print(f"\n{network}:")
                print(f"   ANTIGO: {old}")
                print(f"   NOVO:   {new}")
            
            print("\n💾 Salvando no banco de dados...")
            db.commit()
            print("✅ SUCESSO! Endereços atualizados!")
            
            # Mostrar para backup
            print("\n" + "=" * 70)
            print("📋 NOVOS ENDEREÇOS (GUARDE PARA REFERÊNCIA):")
            print("=" * 70)
            for network, old, new in updated:
                print(f"{network}: {new}")
            print("=" * 70)
        else:
            print("\n✅ Nenhuma atualização necessária!")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()


if __name__ == "__main__":
    update_solana_polkadot()
