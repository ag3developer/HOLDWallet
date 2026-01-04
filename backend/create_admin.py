"""
Script para criar usuário administrador
"""
from app.core.db import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
import uuid

db = SessionLocal()

try:
    # Verificar se admin já existe
    admin = db.query(User).filter(User.email == "admin@holdwallet.com").first()
    
    if admin:
        print(f"⚠️  Admin já existe: {admin.email}")
        print(f"   Atualizando flag is_admin...")
        admin.is_admin = True
        db.commit()
        print(f"✅ Admin atualizado!")
    else:
        print("📝 Criando novo usuário admin...")
        admin = User(
            id=uuid.uuid4(),
            username="admin",
            email="admin@holdwallet.com",
            password_hash=get_password_hash("Admin@2025"),
            is_active=True,
            is_email_verified=True,
            is_admin=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Admin criado com sucesso!")
    
    print("\n" + "="*50)
    print("CREDENCIAIS DO ADMIN:")
    print("="*50)
    print(f"Email:    admin@holdwallet.com")
    print(f"Password: Admin@2025")
    print(f"Username: admin")
    print("="*50)
    
except Exception as e:
    print(f"❌ Erro: {e}")
    db.rollback()
finally:
    db.close()
