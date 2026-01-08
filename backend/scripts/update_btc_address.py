"""
🔶 Script para Atualizar Endereço BTC do Sistema
=================================================

Este script atualiza o endereço Bitcoin placeholder para um endereço REAL
usando a mesma private key já armazenada no banco.

Uso:
    python scripts/update_btc_address.py

O que faz:
1. Busca a carteira do sistema no banco
2. Encontra o endereço Bitcoin existente
3. Descriptografa a private key
4. Gera o endereço BTC REAL usando bitcoinlib
5. Atualiza o endereço no banco
"""

import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.models.system_blockchain_wallet import SystemBlockchainWallet, SystemBlockchainAddress
from app.services.crypto_service import CryptoService

def update_btc_address():
    """Atualiza o endereço BTC do sistema para um endereço REAL."""
    
    print("=" * 60)
    print("🔶 ATUALIZADOR DE ENDEREÇO BITCOIN DO SISTEMA")
    print("=" * 60)
    
    db = SessionLocal()
    crypto_service = CryptoService()
    
    try:
        # 1. Buscar carteira do sistema
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            print("❌ Carteira do sistema não encontrada!")
            print("   Execute primeiro: POST /admin/system-wallet/create")
            return False
        
        print(f"✅ Carteira encontrada: {wallet.id}")
        print(f"   Nome: {wallet.name}")
        
        # 2. Buscar endereço Bitcoin atual
        btc_address = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.network == "bitcoin"
        ).first()
        
        if not btc_address:
            print("❌ Endereço Bitcoin não encontrado na carteira!")
            return False
        
        old_address = btc_address.address
        print(f"\n📍 Endereço BTC atual: {old_address}")
        
        # Verificar se já é um endereço válido
        if old_address.startswith('bc1') or old_address.startswith('1') or old_address.startswith('3'):
            if not old_address.startswith('1') or len(old_address) == 34:
                # Parece ser um endereço válido
                print("⚠️  O endereço atual parece ser válido!")
                print("   Deseja continuar mesmo assim? (s/n)")
                resp = input().strip().lower()
                if resp != 's':
                    print("Operação cancelada.")
                    return False
        
        # 3. Descriptografar private key
        print("\n🔑 Descriptografando private key...")
        
        if not btc_address.encrypted_private_key:
            print("❌ Private key não encontrada!")
            return False
        
        private_key_hex = crypto_service.decrypt_data(btc_address.encrypted_private_key)
        print(f"   Private key recuperada: {private_key_hex[:10]}...{private_key_hex[-10:]}")
        
        # 4. Gerar endereço BTC REAL usando bitcoinlib
        print("\n🔶 Gerando endereço Bitcoin REAL...")
        
        try:
            from bitcoinlib.keys import Key
            
            # Criar key a partir do hex
            key = Key(import_key=private_key_hex, network='bitcoin')
            
            # Gerar endereço (SegWit nativo bc1...)
            new_address = key.address()
            wif = key.wif()
            
            print(f"   ✅ Novo endereço (SegWit): {new_address}")
            print(f"   🔑 WIF (para backup): {wif[:10]}...{wif[-10:]}")
            
            # Também gerar P2PKH legacy para referência
            try:
                legacy_address = key.address(encoding='base58')
                print(f"   📍 Endereço Legacy (1...): {legacy_address}")
            except:
                pass
            
        except Exception as e:
            print(f"❌ Erro ao gerar endereço com bitcoinlib: {e}")
            print("\n🔄 Tentando método alternativo (P2PKH manual)...")
            
            import hashlib
            import base58
            from ecdsa import SigningKey, SECP256k1
            
            # Converter hex para bytes
            private_key_bytes = bytes.fromhex(private_key_hex)
            
            # Gerar public key
            sk = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
            vk = sk.get_verifying_key()
            
            # Public key comprimida
            x = vk.pubkey.point.x()
            y = vk.pubkey.point.y()
            prefix = b'\x02' if y % 2 == 0 else b'\x03'
            pubkey_compressed = prefix + x.to_bytes(32, 'big')
            
            # SHA256 + RIPEMD160
            sha256_hash = hashlib.sha256(pubkey_compressed).digest()
            ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
            
            # Adicionar prefixo de rede (0x00 = mainnet)
            versioned = b'\x00' + ripemd160_hash
            
            # Checksum
            checksum = hashlib.sha256(hashlib.sha256(versioned).digest()).digest()[:4]
            
            # Base58
            new_address = base58.b58encode(versioned + checksum).decode()
            
            print(f"   ✅ Novo endereço P2PKH: {new_address}")
        
        # 5. Confirmar atualização
        print("\n" + "=" * 60)
        print("📋 RESUMO DA ATUALIZAÇÃO:")
        print("=" * 60)
        print(f"   Endereço ANTIGO: {old_address}")
        print(f"   Endereço NOVO:   {new_address}")
        print("=" * 60)
        
        print("\n⚠️  ATENÇÃO: Esta ação vai atualizar o banco de dados!")
        print("   Confirma a atualização? (digite 'CONFIRMAR' para prosseguir)")
        
        confirmacao = input().strip()
        if confirmacao != "CONFIRMAR":
            print("❌ Operação cancelada.")
            return False
        
        # 6. Atualizar no banco
        print("\n💾 Atualizando banco de dados...")
        
        btc_address.address = new_address
        db.commit()
        
        print("✅ SUCESSO! Endereço Bitcoin atualizado!")
        print(f"\n🔶 Novo endereço BTC do sistema: {new_address}")
        
        # 7. Mostrar informações para backup
        print("\n" + "=" * 60)
        print("📋 INFORMAÇÕES PARA BACKUP (GUARDE EM LOCAL SEGURO!):")
        print("=" * 60)
        print(f"Endereço: {new_address}")
        if 'wif' in dir():
            print(f"WIF: {wif}")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.close()


def show_current_btc_info():
    """Mostra informações do BTC atual sem modificar."""
    
    print("=" * 60)
    print("🔍 INFORMAÇÕES ATUAIS DO BITCOIN DO SISTEMA")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            print("❌ Carteira do sistema não encontrada!")
            return
        
        print(f"Carteira ID: {wallet.id}")
        print(f"Nome: {wallet.name}")
        print(f"Tipo: {wallet.wallet_type}")
        
        btc_address = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.network == "bitcoin"
        ).first()
        
        if btc_address:
            print(f"\n🔶 Bitcoin:")
            print(f"   Endereço: {btc_address.address}")
            print(f"   Network: {btc_address.network}")
            print(f"   Cryptocurrency: {btc_address.cryptocurrency}")
            print(f"   Tem Private Key: {'Sim' if btc_address.encrypted_private_key else 'Não'}")
            print(f"   Saldo cacheado: {btc_address.cached_balance}")
            
            # Verificar se é placeholder
            if btc_address.address.startswith('btc_') or btc_address.address.startswith('1') and len(btc_address.address) != 34:
                print(f"\n⚠️  ATENÇÃO: Este parece ser um endereço PLACEHOLDER!")
                print("   Execute 'update' para gerar um endereço REAL.")
        else:
            print("\n❌ Endereço Bitcoin não encontrado!")
        
        # Listar todos os endereços
        print("\n📋 Todos os endereços da carteira:")
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id
        ).all()
        
        for addr in addresses:
            status = "✅" if (addr.address.startswith('0x') or 
                            addr.address.startswith('bc1') or 
                            (addr.address.startswith('1') and len(addr.address) == 34) or
                            addr.address.startswith('T')) else "⚠️"
            print(f"   {status} {addr.network}: {addr.address[:25]}...")
        
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Gerenciar endereço BTC do sistema")
    parser.add_argument('action', nargs='?', default='info', 
                       choices=['info', 'update'],
                       help='Ação: info (mostrar info) ou update (atualizar endereço)')
    
    args = parser.parse_args()
    
    if args.action == 'info':
        show_current_btc_info()
    elif args.action == 'update':
        update_btc_address()
