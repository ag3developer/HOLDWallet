#!/usr/bin/env python3
"""
Script para verificar e corrigir senha do usuário app@holdwallet.com
Versão SQLite
"""
import sqlite3
from passlib.context import CryptContext
import os

# Configurar password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def check_and_fix_password():
    """Verifica e corrige a senha do usuário"""
    
    # Tentar encontrar o banco de dados
    db_paths = [
        "/Users/josecarlosmartins/Documents/HOLDWallet/holdwallet.db",
        "/Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db",
        "./holdwallet.db",
        "../holdwallet.db"
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("❌ Banco de dados não encontrado!")
        print("📂 Procurei em:")
        for path in db_paths:
            print(f"   - {path}")
        return False
    
    print(f"✅ Banco de dados encontrado: {db_path}")
    
    try:
        # Conectar ao banco
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Buscar usuário
        cursor.execute("SELECT id, email, username, password_hash, is_active, is_verified FROM users WHERE email = ?", 
                      ("app@holdwallet.com",))
        user = cursor.fetchone()
        
        if not user:
            print("❌ Usuário app@holdwallet.com não encontrado!")
            print("\n📋 Usuários disponíveis:")
            cursor.execute("SELECT email, username FROM users")
            users = cursor.fetchall()
            for email, username in users:
                print(f"  - {email} (username: {username})")
            conn.close()
            return False
        
        user_id, email, username, password_hash, is_active, is_verified = user
        
        print(f"\n✅ Usuário encontrado:")
        print(f"   Email: {email}")
        print(f"   Username: {username}")
        print(f"   ID: {user_id}")
        print(f"   Ativo: {bool(is_active)}")
        print(f"   Verificado: {bool(is_verified)}")
        
        # Testar senhas conhecidas
        test_passwords = ["12345678", "Abc123@@", "Test@123", "holdwallet123"]
        
        print("\n🔍 Testando senhas conhecidas:")
        password_works = None
        for pwd in test_passwords:
            if verify_password(pwd, password_hash):
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
            cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", 
                          (new_password_hash, "app@holdwallet.com"))
            conn.commit()
            
            # Verificar novamente
            cursor.execute("SELECT password_hash FROM users WHERE email = ?", ("app@holdwallet.com",))
            updated_hash = cursor.fetchone()[0]
            
            if verify_password("Abc123@@", updated_hash):
                print("✅ Senha 'Abc123@@' configurada com sucesso!")
                password_works = "Abc123@@"
            else:
                print("❌ Erro ao configurar nova senha!")
                conn.close()
                return False
        
        print("\n" + "="*60)
        print("📝 CREDENCIAIS DE LOGIN:")
        print("="*60)
        print(f"Email:    app@holdwallet.com")
        print(f"Senha:    {password_works}")
        print("="*60)
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔐 Verificando senha do usuário app@holdwallet.com")
    print("="*60)
    success = check_and_fix_password()
    
    if success:
        print("\n✅ Verificação concluída com sucesso!")
        print("💡 Tente fazer login novamente com as credenciais acima.")
        print("\n🌐 Acesse: http://localhost:3000/login")
    else:
        print("\n❌ Falha na verificação!")
        exit(1)
