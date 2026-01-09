#!/usr/bin/env python3
"""
Script para gerar par de chaves VAPID para Push Notifications.

Uso:
    python generate_vapid_keys.py

Adicione as chaves geradas ao seu arquivo .env:
    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...
    VAPID_EMAIL=seu@email.com
"""

import base64
from py_vapid import Vapid
from cryptography.hazmat.primitives import serialization


def generate_vapid_keys():
    """Gera um novo par de chaves VAPID."""
    
    # Criar instância Vapid
    vapid = Vapid()
    
    # Gerar par de chaves
    vapid.generate_keys()
    
    # Extrair chaves no formato correto
    private_key_pem = vapid.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode()
    
    # Extrair bytes raw da chave privada para URL-safe Base64 (formato nativo pywebpush)
    private_numbers = vapid.private_key.private_numbers()
    private_key_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')
    private_key_urlsafe = base64.urlsafe_b64encode(private_key_bytes).decode().rstrip('=')
    
    # Versão Base64 padrão da PEM (para quem prefere armazenar a PEM completa)
    private_key_pem_base64 = base64.b64encode(private_key_pem.encode()).decode()
    
    # Chave pública no formato URL-safe base64 (VAPID format)
    public_key = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_key_base64 = base64.urlsafe_b64encode(public_key).decode().rstrip("=")
    
    print("=" * 70)
    print("🔐 VAPID Keys Generated Successfully!")
    print("=" * 70)
    print()
    print("Add these to your .env file:")
    print()
    print(f"VAPID_PUBLIC_KEY={public_key_base64}")
    print()
    print("=" * 70)
    print("VAPID_PRIVATE_KEY - Choose ONE format:")
    print("=" * 70)
    print()
    print("📋 OPTION 1: URL-safe Base64 (RECOMMENDED - native pywebpush format)")
    print("-" * 70)
    print(f"VAPID_PRIVATE_KEY={private_key_urlsafe}")
    print()
    print("📋 OPTION 2: PEM encoded in Base64 (alternative)")
    print("-" * 70)
    print(f"VAPID_PRIVATE_KEY={private_key_pem_base64}")
    print()
    print("📋 OPTION 3: PEM Format (for local .env files only)")
    print("-" * 70)
    print("VAPID_PRIVATE_KEY=")
    print(private_key_pem)
    print()
    print("=" * 70)
    print("VAPID_EMAIL=your@email.com")
    print("=" * 70)
    print()
    print("⚠️  IMPORTANT:")
    print("- Keep VAPID_PRIVATE_KEY secret!")
    print("- For production env vars, use Option 1 (URL-safe Base64)")
    print("- Option 1 is the native format expected by pywebpush")
    print("- VAPID_PUBLIC_KEY can be shared with the frontend")
    print("- VAPID_EMAIL should be a valid email for push service contact")
    print("=" * 70)


if __name__ == "__main__":
    generate_vapid_keys()
