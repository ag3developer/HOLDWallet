#!/usr/bin/env python3
"""
🔐 Script para Resetar Senha de Usuário
========================================

Uso:
    python reset_user_password.py <email>
    
Exemplo:
    python reset_user_password.py contato16171716@gmail.com
"""
import sys
import os
import secrets
import string

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import bcrypt

# Carregar variáveis de ambiente
load_dotenv()

# Usar PostgreSQL de produção do .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada no .env!")
    sys.exit(1)

# Criar engine
engine = create_engine(DATABASE_URL)

def get_password_hash(password: str) -> str:
    """Generate password hash usando bcrypt."""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def generate_temp_password(length: int = 12) -> str:
    """Gera senha temporária segura"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def reset_password(email: str):
    """Reseta a senha do usuário usando SQL direto"""
    
    try:
        with engine.connect() as conn:
            # Buscar usuário
            result = conn.execute(
                text("SELECT id, email, username, is_active FROM users WHERE email = :email"),
                {"email": email}
            ).fetchone()
            
            if not result:
                print(f"❌ Usuário com email '{email}' não encontrado!")
                print("\n📋 Listando alguns usuários disponíveis:")
                users = conn.execute(text("SELECT email, username FROM users LIMIT 10")).fetchall()
                for u in users:
                    print(f"  - {u[0]} (username: {u[1]})")
                return False
            
            print("\n✅ Usuário encontrado:")
            print(f"   Email: {result[1]}")
            print(f"   Username: {result[2]}")
            print(f"   ID: {result[0]}")
            print(f"   Ativo: {result[3]}")
            
            # Usar senha fixa definida
            new_password = "Mudar123@@"
            
            # Gerar novo hash de senha
            new_hash = get_password_hash(new_password)
            
            # Atualizar senha
            conn.execute(
                text("UPDATE users SET password_hash = :hash WHERE email = :email"),
                {"hash": new_hash, "email": email}
            )
            conn.commit()
            
            print("\n" + "=" * 50)
            print("✅ SENHA RESETADA COM SUCESSO!")
            print("=" * 50)
            print(f"📧 Email: {email}")
            print(f"🔑 Nova Senha: {new_password}")
            print("=" * 50)
            print("\n⚠️  Envie esta senha ao usuário e peça para trocar no primeiro login!")
            
            return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("🔐 RESET DE SENHA - HOLDWallet")
    print("=" * 50)
    
    if len(sys.argv) < 2:
        print("\n❌ Uso: python reset_user_password.py <email>")
        print("   Exemplo: python reset_user_password.py usuario@email.com")
        sys.exit(1)
    
    target_email = sys.argv[1]
    print(f"\n📧 Resetando senha para: {target_email}")
    
    if reset_password(target_email):
        print("\n✅ Processo concluído com sucesso!")
    else:
        print("\n❌ Falha no processo!")
        sys.exit(1)
