#!/usr/bin/env python3
"""
Script para adicionar coluna cached_tray_balance na tabela system_blockchain_addresses.
Execute diretamente com: python apply_tray_migration.py
"""

import os
import sys

# Adicionar path do backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect

# Importar configurações
try:
    from app.core.config import settings
    DATABASE_URL = settings.DATABASE_URL
except Exception:
    # Fallback para variável de ambiente
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ DATABASE_URL não encontrada!")
        sys.exit(1)

print(f"🔗 Conectando ao banco de dados...")
print(f"   URL: {DATABASE_URL[:50]}...")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar se a coluna já existe
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('system_blockchain_addresses')]
        
        if 'cached_tray_balance' in columns:
            print("ℹ️ Coluna cached_tray_balance já existe! Nada a fazer.")
        else:
            print("📦 Adicionando coluna cached_tray_balance...")
            
            # Adicionar a coluna
            conn.execute(text("""
                ALTER TABLE system_blockchain_addresses 
                ADD COLUMN cached_tray_balance FLOAT DEFAULT 0.0
            """))
            conn.commit()
            
            print("✅ Coluna cached_tray_balance adicionada com sucesso!")
        
        # Verificar resultado
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'system_blockchain_addresses' 
            AND column_name LIKE '%tray%'
        """))
        
        rows = result.fetchall()
        if rows:
            print("\n📊 Colunas TRAY encontradas:")
            for row in rows:
                print(f"   - {row[0]}: {row[1]} (default: {row[2]})")
        
        print("\n🎉 Migration concluída!")
        
except Exception as e:
    print(f"❌ Erro: {e}")
    sys.exit(1)
