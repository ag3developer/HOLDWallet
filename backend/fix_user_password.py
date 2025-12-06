#!/usr/bin/env python3
"""
Script para verificar e corrigir senha do usuário app@holdwallet.com
"""
import sys
import os

# Adicionar o diretório pai ao path para importar os módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.core.security import get_password_hash, verify_password
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Usar SQLite que está na raiz do projeto
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "holdwallet.db")
DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

print(f"📁 Usando banco de dados: {SQLITE_PATH}")

# Criar engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_and_fix_password():
    """Verifica e corrige a senha do usuário"""
    db = SessionLocal()
    
    try:
        # Buscar usuário - CORRIGIDO: usar dev@holdwallet.io
        user = db.query(User).filter(User.email == "dev@holdwallet.io").first()
        
        if not user:
            print("❌ Usuário dev@holdwallet.io não encontrado!")
            print("\n📋 Usuários disponíveis:")
            users = db.query(User).all()
            for u in users:
                print(f"  - {u.email} (username: {u.username})")
            return False
        
        print(f"✅ Usuário encontrado:")
        print(f"   Email: {user.email}")
        print(f"   Username: {user.username}")
        print(f"   ID: {user.id}")
        print(f"   Ativo: {user.is_active}")
        
        # Testar senhas conhecidas
        test_passwords = ["12345678", "Abc123@@", "Test@123", "holdwallet123"]
        
        print("\n🔍 Testando senhas conhecidas:")
        password_works = None
        for pwd in test_passwords:
            if verify_password(pwd, str(user.password_hash)):
                print(f"   ✅ Senha '{pwd}' FUNCIONA!")
                password_works = pwd
                break
            else:
                print(f"   ❌ Senha '{pwd}' não funciona")
        
        if not password_works:
            print("\n⚠️  Nenhuma senha conhecida funciona!")
            print("🔧 Configurando nova senha: 'Abc123@@'")
            
            # Atualizar senha
            new_password_hash = get_password_hash("Abc123@@")
            user.password_hash = new_password_hash
            db.commit()
            
            # Verificar novamente
            if verify_password("Abc123@@", str(user.password_hash)):
                print("✅ Senha 'Abc123@@' configurada com sucesso!")
                password_works = "Abc123@@"
            else:
                print("❌ Erro ao configurar nova senha!")
                return False
        
        print("\n" + "="*60)
        print("📝 CREDENCIAIS DE LOGIN:")
        print("="*60)
        print(f"Email:    dev@holdwallet.io")
        print(f"Senha:    {password_works if password_works else 'Abc123@@'}")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔐 Verificando senha do usuário dev@holdwallet.io")
    print("="*60)
    success = check_and_fix_password()
    
    if success:
        print("\n✅ Verificação concluída com sucesso!")
        print("💡 Tente fazer login novamente com as credenciais acima.")
    else:
        print("\n❌ Falha na verificação!")
        sys.exit(1)
