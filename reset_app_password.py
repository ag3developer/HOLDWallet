#!/usr/bin/env python3
"""
Script para resetar a senha do usuário app@holdwallet.com
"""
import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, '/Users/josecarlosmartins/Documents/HOLDWallet/backend')

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.security import get_password_hash

print("🔗 Conectando ao banco de produção...")
engine = create_engine(settings.DATABASE_URL, echo=False)

# Nova senha
NEW_PASSWORD = "Abc123@@"
email = "app@holdwallet.com"

print(f"🔐 Gerando hash da senha: {NEW_PASSWORD}")
password_hash = get_password_hash(NEW_PASSWORD)
print(f"   Hash gerado: {password_hash[:50]}...")

try:
    with engine.connect() as conn:
        # Atualizar senha
        print(f"\n📝 Atualizando senha do usuário: {email}")
        result = conn.execute(
            text("""
                UPDATE users 
                SET password_hash = :password_hash,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = :email
                RETURNING id, email, username
            """),
            {"password_hash": password_hash, "email": email}
        )
        conn.commit()
        
        user = result.fetchone()
        if user:
            print(f"   ✅ Senha atualizada com sucesso!")
            print(f"   ID: {user[0]}")
            print(f"   Email: {user[1]}")
            print(f"   Username: {user[2]}")
            print(f"\n🎯 Teste agora:")
            print(f'   curl -X POST "https://api.wolknow.com/v1/auth/login" \\')
            print(f'     -H "Content-Type: application/json" \\')
            print(f'     -d \'{{"email":"{email}","password":"{NEW_PASSWORD}"}}\'')
        else:
            print(f"   ❌ Usuário não encontrado: {email}")
        
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
