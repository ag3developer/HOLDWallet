#!/usr/bin/env python3
"""
Script para gerar um token 2FA/TOTP válido para teste de envio
"""

import os
import sys
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from cryptography.fernet import Fernet
import pyotp
import time
import base64

# Configuração
ENCRYPTION_KEY = "XFTBN_LoZLTcGlhj0MBKZl9uHkUvg4Xd2F6u4RfbBJU="
ENCRYPTED_SECRET = "Z0FBQUFBQnBKZlRHZzZpSnhndWpiejBtOXJGSW01ZDR1WHFrbTZMbWRMVnBablJSX0hEeGFTV2R2Q1pJRm9aSWtfVGlFV29xOUk0ellDZk1rdFZSTVliLWUzRGh6SU11cU5EZmJfT29HZ0NNV3FTV0RrT2xteVpuX2RPdnhNdDdUQndOM0huUzFiSUk="

def decrypt_secret(encrypted_data: str, key: str):
    """Descriptografa o secret TOTP"""
    try:
        # A chave e dados podem ser base64
        key_bytes = key.encode() if isinstance(key, str) else key
        encrypted_bytes = encrypted_data.encode() if isinstance(encrypted_data, str) else encrypted_data
        
        print(f"  Chave tipo: {type(key_bytes)}, tamanho: {len(key_bytes)}")
        print(f"  Dados tipo: {type(encrypted_bytes)}, tamanho: {len(encrypted_bytes)}")
        
        f = Fernet(key_bytes)
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        print(f"❌ Erro ao descriptografar: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None

# Descriptografar secret
print("🔐 Descriptografando secret TOTP...")
secret = decrypt_secret(ENCRYPTED_SECRET, ENCRYPTION_KEY)

if not secret:
    print("❌ Falha ao descriptografar secret")
    print("\nTentando usar pyotp.random_base32() para gerar um secret de teste...")
    secret = pyotp.random_base32()
    print(f"Secret de teste: {secret}")

print(f"✅ Secret: {secret}")
print()

# Gerar token TOTP
print("🔑 Gerando token TOTP...")
try:
    totp = pyotp.TOTP(secret)
    
    # Gerar vários tokens (em caso de mudança de tempo)
    print("\nTokens TOTP válidos (próximos 60 segundos):")
    print("=" * 50)
    
    for i in range(6):
        token = totp.now()
        remaining = 30 - (int(time.time()) % 30)
        print(f"Token: {token} (válido por ~{remaining}s)")
        time.sleep(10)
    
    print("=" * 50)
    print("\nUse um dos tokens acima no campo 'two_factor_token'")
except Exception as e:
    print(f"❌ Erro ao gerar token TOTP: {e}")
    import traceback
    traceback.print_exc()
