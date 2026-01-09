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
    private_key = vapid.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode()
    
    # Chave pública no formato URL-safe base64 (VAPID format)
    public_key = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_key_base64 = base64.urlsafe_b64encode(public_key).decode().rstrip("=")
    
    print("=" * 60)
    print("🔐 VAPID Keys Generated Successfully!")
    print("=" * 60)
    print()
    print("Add these to your .env file:")
    print()
    print(f"VAPID_PUBLIC_KEY={public_key_base64}")
    print()
    print("VAPID_PRIVATE_KEY=")
    print(private_key)
    print()
    print("VAPID_EMAIL=your@email.com")
    print()
    print("=" * 60)
    print()
    print("⚠️  IMPORTANT:")
    print("- Keep VAPID_PRIVATE_KEY secret!")
    print("- VAPID_PUBLIC_KEY can be shared with the frontend")
    print("- VAPID_EMAIL should be a valid email for push service contact")
    print("=" * 60)


if __name__ == "__main__":
    generate_vapid_keys()
