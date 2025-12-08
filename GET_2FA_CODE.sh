#!/bin/bash

# 🔐 Script para gerar código 2FA válido
# Use: ./GET_2FA_CODE.sh

cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from app.db.database import SessionLocal
from app.models.two_factor import TwoFactorAuth
from app.services.crypto_service import crypto_service
import pyotp

db = SessionLocal()

two_fa = db.query(TwoFactorAuth).filter(
    TwoFactorAuth.user_id == "27e4563d-38a6-4414-bed1-be45f1dff305"
).first()

if two_fa:
    decrypted_secret = crypto_service.decrypt_data(two_fa.secret)
    totp = pyotp.TOTP(decrypted_secret)
    code = totp.now()
    
    import time
    time_remaining = 30 - (int(time.time()) % 30)
    
    print()
    print("═" * 50)
    print("🔐 CÓDIGO 2FA VÁLIDO")
    print("═" * 50)
    print(f"Código:     {code}")
    print(f"Válido por: ~{time_remaining} segundos")
    print("═" * 50)
    print()

db.close()
EOF
