#!/usr/bin/env python3
"""
🔧 Script para criar tabelas de Email/Password Reset
=====================================================

Cria as tabelas necessárias para o sistema de email:
- password_reset_tokens
- email_verification_tokens

Execute: python create_email_tables.py
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Carregar variáveis de ambiente
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada!")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# SQL para criar as tabelas
CREATE_TABLES_SQL = """
-- Tabela de tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45)
);

-- Índice para busca por token
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Índice para limpeza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);


-- Tabela de tokens de verificação de email
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por token
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Índice para limpeza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);
"""

def create_tables():
    """Cria as tabelas no banco de dados."""
    print("=" * 60)
    print("📧 CRIANDO TABELAS DE EMAIL/PASSWORD RESET")
    print("=" * 60)
    
    try:
        with engine.connect() as conn:
            # Executar cada comando separadamente
            for statement in CREATE_TABLES_SQL.split(';'):
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    conn.execute(text(statement))
            conn.commit()
            
        print("\n✅ Tabelas criadas com sucesso!")
        print("\n📋 Tabelas:")
        print("   - password_reset_tokens")
        print("   - email_verification_tokens")
        
        # Verificar se as tabelas foram criadas
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name IN ('password_reset_tokens', 'email_verification_tokens')
            """)).fetchall()
            
            print(f"\n✅ Verificação: {len(result)} tabelas encontradas")
            for row in result:
                print(f"   - {row[0]}")
                
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        return False
    
    return True

if __name__ == "__main__":
    if create_tables():
        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETO!")
        print("=" * 60)
    else:
        print("\n❌ Falha no setup!")
        sys.exit(1)
