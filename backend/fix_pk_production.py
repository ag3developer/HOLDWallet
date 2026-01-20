#!/usr/bin/env python3
"""
🔧 Fix Private Key - Executar no servidor de produção
======================================================
Este script usa o CryptoService do próprio backend para criptografar
a private key com a ENCRYPTION_KEY correta do servidor.

EXECUTAR NO SERVIDOR:
  cd /root/HOLDWallet/backend
  source venv/bin/activate  
  python fix_pk_production.py
"""
import sys
import os

# Adicionar o diretório do backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar do próprio backend
from app.services.crypto_service import CryptoService
from app.core.db import SessionLocal

# A private key REAL da main_fees_wallet
# Endereço: 0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7
PRIVATE_KEY = "0x62603e4b9eedf6aad1e43bf1b2e34902de88d3338a28ee37c26043323d28e773"

# Redes EVM para atualizar
EVM_NETWORKS = ['polygon', 'ethereum', 'bsc', 'base', 'avalanche', 'multi']

def main():
    print("=" * 60)
    print("🔧 FIX PRIVATE KEY ENCRYPTION - PRODUÇÃO")
    print("=" * 60)
    
    # Usar o CryptoService do backend (usa a ENCRYPTION_KEY do .env)
    crypto = CryptoService()
    
    print(f"\n🔑 Criptografando private key...")
    encrypted_pk = crypto.encrypt_data(PRIVATE_KEY)
    print(f"✅ Criptografado! Tamanho: {len(encrypted_pk)} chars")
    
    # Verificar se consegue descriptografar
    print("\n🔍 Verificando descriptografia...")
    decrypted = crypto.decrypt_data(encrypted_pk)
    if decrypted == PRIVATE_KEY:
        print("✅ Verificação OK!")
    else:
        print("❌ ERRO: Descriptografia falhou!")
        sys.exit(1)
    
    # Conectar ao banco via SQLAlchemy do próprio backend
    print("\n📦 Conectando ao banco de dados...")
    db = SessionLocal()
    
    try:
        # Atualizar todos os endereços EVM
        print(f"\n📝 Atualizando endereços EVM...")
        
        from sqlalchemy import text
        
        for network in EVM_NETWORKS:
            result = db.execute(text("""
                UPDATE system_blockchain_addresses 
                SET encrypted_private_key = :encrypted_pk
                WHERE address = '0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7'
                AND network = :network
                RETURNING id
            """), {"encrypted_pk": encrypted_pk, "network": network})
            
            row = result.fetchone()
            if row:
                print(f"   ✅ {network}: atualizado (ID: {row[0]})")
            else:
                print(f"   ⚠️  {network}: não encontrado")
        
        db.commit()
        print("\n✅ Commit realizado!")
        
        # Verificar resultado
        result = db.execute(text("""
            SELECT network, LEFT(encrypted_private_key, 40) as pk_preview
            FROM system_blockchain_addresses 
            WHERE address = '0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7'
        """))
        
        print("\n📋 Estado atual:")
        for row in result.fetchall():
            print(f"   {row[0]}: {row[1]}...")
        
    finally:
        db.close()
    
    print("\n" + "=" * 60)
    print("🎉 PRONTO! Teste o envio novamente.")
    print("=" * 60)

if __name__ == "__main__":
    main()
