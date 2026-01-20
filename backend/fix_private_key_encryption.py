#!/usr/bin/env python3
"""
🔧 Fix Private Key Encryption
==============================

A private key foi criptografada com uma ENCRYPTION_KEY diferente.
Este script re-criptografa usando a chave correta do servidor.

IMPORTANTE: Execute no servidor de produção onde o backend está rodando,
ou use a mesma ENCRYPTION_KEY que está no .env de produção.
"""
import os
import sys
from cryptography.fernet import Fernet
import psycopg2
import base64

# ========================================
# CONFIGURAÇÃO - EDITE AQUI
# ========================================

# A private key REAL (sem criptografia) da main_fees_wallet
# Endereço: 0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7
PRIVATE_KEY = "0x62603e4b9eedf6aad1e43bf1b2e34902de88d3338a28ee37c26043323d28e773"

# ENCRYPTION_KEY do servidor de produção (pegar do .env de produção)
# Deve começar com "XFTBN_LoZL..." conforme os logs
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")

# Database config
DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "holdwallet-db",
    "sslmode": "require"
}

# Redes EVM para atualizar
EVM_NETWORKS = ['polygon', 'ethereum', 'bsc', 'base', 'avalanche', 'multi']


def encrypt_private_key(private_key: str, encryption_key: str) -> str:
    """Criptografa private key usando Fernet."""
    # Garantir que a chave está em formato base64 correto
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY não definida!")
    
    # Adicionar padding se necessário
    key = encryption_key
    while len(key) % 4 != 0:
        key += "="
    
    try:
        # Tentar usar diretamente
        fernet = Fernet(key.encode())
    except Exception:
        # Tentar converter para base64 URL-safe
        try:
            key_bytes = key.encode('utf-8')
            if len(key_bytes) != 32:
                # Se não tem 32 bytes, fazer hash ou truncar
                import hashlib
                key_bytes = hashlib.sha256(key.encode()).digest()
            key_b64 = base64.urlsafe_b64encode(key_bytes)
            fernet = Fernet(key_b64)
        except Exception as e:
            raise ValueError(f"Não foi possível criar Fernet com a chave: {e}")
    
    encrypted = fernet.encrypt(private_key.encode())
    return encrypted.decode()


def verify_decryption(encrypted_data: str, encryption_key: str, expected_pk: str) -> bool:
    """Verifica se consegue descriptografar e obter a PK esperada."""
    key = encryption_key
    while len(key) % 4 != 0:
        key += "="
    
    try:
        fernet = Fernet(key.encode())
        decrypted = fernet.decrypt(encrypted_data.encode()).decode()
        return decrypted == expected_pk
    except Exception:
        try:
            import hashlib
            key_bytes = hashlib.sha256(encryption_key.encode()).digest()
            key_b64 = base64.urlsafe_b64encode(key_bytes)
            fernet = Fernet(key_b64)
            decrypted = fernet.decrypt(encrypted_data.encode()).decode()
            return decrypted == expected_pk
        except Exception:
            return False


def main():
    print("=" * 60)
    print("🔧 FIX PRIVATE KEY ENCRYPTION")
    print("=" * 60)
    
    # Verificar ENCRYPTION_KEY
    if not ENCRYPTION_KEY:
        print("\n❌ ERRO: ENCRYPTION_KEY não definida!")
        print("\nDefina a variável de ambiente antes de executar:")
        print("  export ENCRYPTION_KEY='sua_chave_aqui'")
        print("\nOu edite este script e coloque a chave diretamente.")
        sys.exit(1)
    
    print(f"\n🔑 ENCRYPTION_KEY: {ENCRYPTION_KEY[:15]}...")
    print(f"📍 Endereço: 0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7")
    
    # Criptografar a private key
    print("\n📝 Criptografando private key...")
    try:
        encrypted_pk = encrypt_private_key(PRIVATE_KEY, ENCRYPTION_KEY)
        print(f"✅ Criptografado com sucesso!")
        print(f"   Tamanho: {len(encrypted_pk)} caracteres")
    except Exception as e:
        print(f"❌ Erro ao criptografar: {e}")
        sys.exit(1)
    
    # Verificar se consegue descriptografar
    print("\n🔍 Verificando descriptografia...")
    if verify_decryption(encrypted_pk, ENCRYPTION_KEY, PRIVATE_KEY):
        print("✅ Verificação OK - consegue descriptografar!")
    else:
        print("❌ ERRO: Não conseguiu descriptografar!")
        sys.exit(1)
    
    # Conectar ao banco
    print("\n📦 Conectando ao banco de dados...")
    try:
        conn = psycopg2.connect(**DB_CONFIG, connect_timeout=60)
        cursor = conn.cursor()
        print("✅ Conectado!")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        sys.exit(1)
    
    # Atualizar endereços
    print(f"\n📝 Atualizando endereços EVM...")
    updated = 0
    
    for network in EVM_NETWORKS:
        cursor.execute("""
            UPDATE system_blockchain_addresses 
            SET encrypted_private_key = %s
            WHERE address = '0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7'
            AND network = %s
            RETURNING id, network
        """, (encrypted_pk, network))
        
        result = cursor.fetchone()
        if result:
            print(f"   ✅ {network}: atualizado (ID: {result[0]})")
            updated += 1
        else:
            print(f"   ⚠️  {network}: não encontrado")
    
    conn.commit()
    
    # Verificar resultado
    print(f"\n📊 RESULTADO:")
    print(f"   Endereços atualizados: {updated}")
    
    # Mostrar estado atual
    cursor.execute("""
        SELECT network, LEFT(encrypted_private_key, 30) as pk_preview
        FROM system_blockchain_addresses 
        WHERE address = '0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7'
    """)
    
    print("\n📋 Estado atual dos endereços:")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}...")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 PRONTO! Agora reinicie o backend e tente enviar novamente.")
    print("=" * 60)


if __name__ == "__main__":
    main()
