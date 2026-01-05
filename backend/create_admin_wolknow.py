"""
Script para criar usuário administrador Wolknow
===============================================

Email: admin@wolknow.com
Password: Admin123@@

Execute com: python -m backend.create_admin_wolknow
Ou: cd backend && python create_admin_wolknow.py
"""
import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.security import get_password_hash
from app.core.config import settings
import uuid

def create_admin():
    # Conectar diretamente ao banco
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar se admin já existe
        result = conn.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": "admin@wolknow.com"}
        )
        admin = result.fetchone()
        
        if admin:
            print(f"⚠️  Admin já existe: admin@wolknow.com")
            print("   Atualizando flag is_admin e senha...")
            conn.execute(
                text("""
                    UPDATE users 
                    SET is_admin = true, 
                        is_active = true, 
                        password_hash = :password_hash
                    WHERE email = :email
                """),
                {
                    "email": "admin@wolknow.com",
                    "password_hash": get_password_hash("Admin123@@")
                }
            )
            conn.commit()
            print("✅ Admin atualizado!")
        else:
            print("📝 Criando novo usuário admin...")
            admin_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO users (id, username, email, password_hash, is_active, is_admin, created_at)
                    VALUES (:id, :username, :email, :password_hash, true, true, NOW())
                """),
                {
                    "id": admin_id,
                    "username": "admin_wolknow",
                    "email": "admin@wolknow.com",
                    "password_hash": get_password_hash("Admin123@@")
                }
            )
            conn.commit()
            print("✅ Admin criado com sucesso!")
        
        print("\n" + "="*50)
        print("🔐 CREDENCIAIS DO ADMIN WOLKNOW:")
        print("="*50)
        print("📧 Email:    admin@wolknow.com")
        print("🔑 Password: Admin123@@")
        print("👤 Username: admin_wolknow")
        print("🛡️  Role:     ADMIN (is_admin=True)")
        print("="*50)
        print("\n✨ O admin será redirecionado para /admin após login")

if __name__ == "__main__":
    create_admin()
