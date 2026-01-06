#!/usr/bin/env python3
"""
Script para renomear coluna 'metadata' para 'extra_data' na tabela accounting_entries
O nome 'metadata' é reservado no SQLAlchemy.
"""

import os
import sys

# Adicionar o diretório ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine
from sqlalchemy import text

def fix_metadata_column():
    print("=" * 50)
    print("🔧 Corrigindo coluna 'metadata' -> 'extra_data'")
    print("=" * 50)
    
    try:
        with engine.connect() as conn:
            # Verificar quais colunas existem
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'accounting_entries' 
                AND column_name IN ('metadata', 'extra_data')
            """))
            columns = [row[0] for row in result.fetchall()]
            print(f"Colunas encontradas: {columns}")
            
            if 'metadata' in columns and 'extra_data' not in columns:
                print("📝 Renomeando coluna 'metadata' para 'extra_data'...")
                conn.execute(text("ALTER TABLE accounting_entries RENAME COLUMN metadata TO extra_data"))
                conn.commit()
                print("✅ Coluna renomeada com sucesso!")
            elif 'extra_data' in columns:
                print("✅ Coluna 'extra_data' já existe - nada a fazer!")
            elif not columns:
                print("ℹ️  Nenhuma coluna encontrada - tabela pode não existir ou ser nova")
            else:
                print(f"⚠️  Estado inesperado: {columns}")
                
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = fix_metadata_column()
    sys.exit(0 if success else 1)
