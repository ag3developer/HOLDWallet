"""
Script para testar descriptografia de carteiras com diferentes ENCRYPTION_KEYs
"""

import os
import sys
import base64
from cryptography.fernet import Fernet, InvalidToken

# Adicionar o diretório app ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Definir as duas possíveis chaves
KEY_FROM_ENV = "8VH4CPZBtp6-LwZRiPJRQlSyagqY3x_KerMW1yFK0Fg="  # Do .env
KEY_FROM_CODE = "XFTBN_LoZLTcGlhj0MBKZl9uHkUvg4Xd2F6u4RfbBJU="  # Padrão do config.py

def try_decrypt(encrypted_data: str, key: str) -> tuple[bool, str]:
    """Tenta descriptografar com uma chave específica"""
    try:
        f = Fernet(key.encode())
        decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted_data = f.decrypt(decoded_data)
        return True, decrypted_data.decode()
    except InvalidToken:
        return False, "InvalidToken - Chave incorreta"
    except Exception as e:
        return False, f"Erro: {type(e).__name__} - {str(e)}"

def main():
    # Conectar ao banco
    from sqlalchemy import create_engine, text
    from app.core.config import settings
    
    print("=" * 60)
    print("🔍 DIAGNÓSTICO DE ENCRYPTION_KEY")
    print("=" * 60)
    
    print(f"\n📋 Chave do .env (atual): {KEY_FROM_ENV[:20]}...")
    print(f"📋 Chave do código (padrão): {KEY_FROM_CODE[:20]}...")
    print(f"📋 Chave carregada pelo settings: {settings.ENCRYPTION_KEY[:20]}...")
    
    # Conectar ao banco
    print(f"\n🔌 Conectando ao banco...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Buscar a carteira do usuário específico
        user_id = "caac82a2-d892-4b8d-aa3f-8f1255a84d23"
        
        result = conn.execute(text("""
            SELECT w.id, w.name, w.encrypted_seed, u.email 
            FROM wallets w 
            JOIN users u ON w.user_id = u.id 
            WHERE u.id = :user_id
            LIMIT 1
        """), {"user_id": user_id})
        
        row = result.fetchone()
        
        if not row:
            print(f"\n❌ Nenhuma carteira encontrada para o usuário {user_id}")
            return
        
        wallet_id, wallet_name, encrypted_seed, email = row
        
        print(f"\n📦 Carteira encontrada:")
        print(f"   ID: {wallet_id}")
        print(f"   Nome: {wallet_name}")
        print(f"   Email: {email}")
        print(f"   Encrypted Seed Length: {len(encrypted_seed) if encrypted_seed else 0}")
        
        if not encrypted_seed:
            print(f"\n❌ ERRO: encrypted_seed está vazio/NULL!")
            return
        
        print(f"   Encrypted Seed (primeiros 50 chars): {encrypted_seed[:50]}...")
        
        # Testar com a chave do .env
        print(f"\n🔑 Testando com chave do .env ({KEY_FROM_ENV[:15]}...):")
        success, result = try_decrypt(encrypted_seed, KEY_FROM_ENV)
        if success:
            print(f"   ✅ SUCESSO! Mnemônico: {result[:30]}...")
        else:
            print(f"   ❌ FALHOU: {result}")
        
        # Testar com a chave padrão do código
        print(f"\n🔑 Testando com chave padrão do código ({KEY_FROM_CODE[:15]}...):")
        success, result = try_decrypt(encrypted_seed, KEY_FROM_CODE)
        if success:
            print(f"   ✅ SUCESSO! Mnemônico: {result[:30]}...")
        else:
            print(f"   ❌ FALHOU: {result}")
        
        # Testar com a chave que o settings está usando
        print(f"\n🔑 Testando com chave do settings ({settings.ENCRYPTION_KEY[:15]}...):")
        success, result = try_decrypt(encrypted_seed, settings.ENCRYPTION_KEY)
        if success:
            print(f"   ✅ SUCESSO! Mnemônico: {result[:30]}...")
        else:
            print(f"   ❌ FALHOU: {result}")
    
    print("\n" + "=" * 60)
    print("FIM DO DIAGNÓSTICO")
    print("=" * 60)

if __name__ == "__main__":
    main()
