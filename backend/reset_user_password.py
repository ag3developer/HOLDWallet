#!/usr/bin/env python3
"""
Script para resetar a senha de um usuário específico no PostgreSQL
Usando SQL direto para evitar problemas de importação circular
"""
import sys
import os

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

print("📁 Conectando ao banco de dados PostgreSQL...")

# Criar engine
engine = create_engine(DATABASE_URL)

def get_password_hash(password: str) -> str:
    """Generate password hash usando bcrypt."""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def reset_password(email: str, new_password: str):
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
            
            # Gerar novo hash de senha
            new_hash = get_password_hash(new_password)
            
            # Atualizar senha
            conn.execute(
                text("UPDATE users SET password_hash = :hash WHERE email = :email"),
                {"hash": new_hash, "email": email}
            )
            conn.commit()
            
            print("\n✅ Senha atualizada com sucesso!")
            print(f"   Nova senha: {new_password}")
            
            return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    # Email do usuário a ser resetado
    TARGET_EMAIL = "mdhani212@proton.me"
    
    print("=" * 50)
    print("🔐 RESET DE SENHA - HOLDWallet")
    print("=" * 50)
    
    # Solicitar nova senha
    print(f"\n📧 Usuário: {TARGET_EMAIL}")
    new_password = input("🔑 Digite a nova senha: ").strip()
    
    if len(new_password) < 6:
        print("❌ A senha deve ter pelo menos 6 caracteres!")
        sys.exit(1)
    
    # Confirmar
    confirm = input(f"\n⚠️  Confirma reset da senha para '{TARGET_EMAIL}'? (s/n): ").strip().lower()
    
    if confirm != 's':
        print("❌ Operação cancelada!")
        sys.exit(0)
    
    # Executar reset
    if reset_password(TARGET_EMAIL, new_password):
        print("\n✅ Processo concluído com sucesso!")
    else:
        print("\n❌ Falha no processo!")
        sys.exit(1)
