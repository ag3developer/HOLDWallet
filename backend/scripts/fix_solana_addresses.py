"""
🔧 Script para Corrigir Endereços Solana
========================================

Os endereços Solana foram gerados incorretamente usando secp256k1 (curva do Bitcoin/Ethereum)
em vez de Ed25519 (curva correta do Solana).

Este script:
1. Encontra todos os endereços Solana no banco de dados
2. Re-deriva os endereços usando Ed25519 corretamente
3. Atualiza no banco de dados
"""

import sys
import os
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.crypto_service import CryptoService


def fix_solana_addresses():
    """Corrige endereços Solana para usar derivação Ed25519."""
    print("=" * 60)
    print("🔧 CORREÇÃO DE ENDEREÇOS SOLANA (Ed25519)")
    print("=" * 60)
    
    db = SessionLocal()
    crypto_service = CryptoService()
    
    try:
        # Buscar todos os endereços Solana
        solana_addresses = db.query(Address).filter(
            Address.network == 'solana'
        ).all()
        
        print(f"\n📊 Encontrados {len(solana_addresses)} endereços Solana no banco de dados")
        
        if not solana_addresses:
            print("✅ Nenhum endereço Solana para corrigir!")
            return
        
        fixed_count = 0
        skipped_count = 0
        error_count = 0
        
        for addr in solana_addresses:
            try:
                wallet = db.query(Wallet).filter(Wallet.id == addr.wallet_id).first()
                
                if not wallet or not wallet.encrypted_seed:
                    print(f"  ⚠️ Wallet {addr.wallet_id} não tem seed - pulando")
                    skipped_count += 1
                    continue
                
                # Descriptografar mnemonic e gerar seed
                mnemonic = crypto_service.decrypt_data(str(wallet.encrypted_seed))
                seed = crypto_service.mnemonic_to_seed(mnemonic)
                
                # Derivar endereço Solana correto usando Ed25519
                derivation_index = addr.derivation_index or 0
                address_data = crypto_service._derive_solana_address(seed, derivation_index)
                
                new_address = address_data["address"]
                old_address = addr.address
                
                # Verificar se o endereço mudou
                if old_address == new_address:
                    print(f"  ✓ Endereço {old_address[:8]}... já está correto!")
                    skipped_count += 1
                    continue
                
                # Atualizar endereço
                print(f"\n🔄 Corrigindo endereço da wallet {wallet.id}:")
                print(f"   Antigo (secp256k1): {old_address}")
                print(f"   Novo (Ed25519):     {new_address}")
                
                addr.address = new_address
                addr.encrypted_private_key = address_data["private_key_encrypted"]
                addr.derivation_path = address_data["derivation_path"]
                
                db.commit()
                fixed_count += 1
                print(f"   ✅ Atualizado!")
                
            except Exception as e:
                print(f"  ❌ Erro ao processar endereço {addr.id}: {e}")
                error_count += 1
                db.rollback()
        
        print("\n" + "=" * 60)
        print("📊 RESUMO:")
        print(f"   ✅ Corrigidos: {fixed_count}")
        print(f"   ⏭️ Já corretos/pulados: {skipped_count}")
        print(f"   ❌ Erros: {error_count}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Erro crítico: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Confirmar antes de executar
    print("\n⚠️  ATENÇÃO: Este script vai modificar endereços Solana no banco de dados!")
    print("   Certifique-se de ter um backup antes de continuar.\n")
    
    response = input("Deseja continuar? (s/n): ").strip().lower()
    
    if response == 's':
        fix_solana_addresses()
    else:
        print("Operação cancelada.")
