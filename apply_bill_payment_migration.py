#!/usr/bin/env python3
"""
🚀 Script para aplicar migração das tabelas de Bill Payment
Execute: python apply_bill_payment_migration.py
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings

def apply_migration():
    """Aplica a migração SQL para criar as tabelas de Bill Payment"""
    
    print("=" * 60)
    print("🚀 WolkPay Bill Payment - Aplicando Migração")
    print("=" * 60)
    
    # Caminho do arquivo SQL
    migration_file = Path(__file__).parent / "backend" / "migrations" / "versions" / "add_wolkpay_bill_payment.sql"
    
    if not migration_file.exists():
        print(f"❌ Arquivo de migração não encontrado: {migration_file}")
        return False
    
    # Ler SQL
    print(f"\n📄 Lendo arquivo: {migration_file}")
    sql_content = migration_file.read_text()
    
    # Conectar ao banco
    db_url = settings.DATABASE_URL
    print(f"\n🔗 Conectando ao banco de dados...")
    print(f"   Host: {db_url.split('@')[1].split('/')[0] if '@' in db_url else 'local'}")
    
    try:
        engine = create_engine(db_url, echo=False)
        
        with engine.connect() as conn:
            # Verificar se tabelas já existem
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'wolkpay_bill_payments'
                );
            """))
            exists = result.scalar()
            
            if exists:
                print("\n⚠️  Tabela wolkpay_bill_payments já existe!")
                print("    As migrações serão aplicadas com IF NOT EXISTS...")
            
            # Aplicar migração
            print("\n🔧 Executando migração SQL...")
            
            # Dividir em statements individuais e executar
            statements = sql_content.split(';')
            
            for i, stmt in enumerate(statements):
                stmt = stmt.strip()
                if stmt and not stmt.startswith('--'):
                    try:
                        conn.execute(text(stmt))
                        if 'CREATE TABLE' in stmt:
                            table_name = stmt.split('EXISTS')[-1].split('(')[0].strip().split()[-1]
                            print(f"   ✅ Tabela criada/verificada: {table_name}")
                        elif 'CREATE INDEX' in stmt:
                            idx_name = stmt.split('EXISTS')[-1].split('ON')[0].strip().split()[-1]
                            print(f"   ✅ Índice criado/verificado: {idx_name}")
                    except Exception as e:
                        # Ignorar erros de "já existe"
                        if 'already exists' not in str(e):
                            print(f"   ⚠️  Statement {i}: {str(e)[:50]}...")
            
            conn.commit()
            
            # Verificar resultado
            result = conn.execute(text("""
                SELECT 
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count
                FROM information_schema.tables t
                WHERE table_name IN ('wolkpay_bill_payments', 'wolkpay_bill_payment_logs')
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            
            print("\n✅ Migração aplicada com sucesso!")
            print("\n📊 Tabelas criadas:")
            for table_name, col_count in tables:
                print(f"   - {table_name}: {col_count} colunas")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Erro ao aplicar migração: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = apply_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("🎉 Tabelas de Bill Payment prontas!")
        print("=" * 60)
        print("\n📌 Próximos passos:")
        print("   1. Iniciar o backend: cd backend && uvicorn app.main:app --reload")
        print("   2. Iniciar o frontend: cd Frontend && npm run dev")
        print("   3. Testar endpoint: GET /wolkpay-bill/payments")
    else:
        print("\n❌ Falha na migração. Verifique os logs acima.")
        sys.exit(1)
