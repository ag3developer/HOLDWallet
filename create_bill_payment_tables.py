#!/usr/bin/env python3
"""
🚀 Script para criar tabelas de Bill Payment usando SQLAlchemy
Funciona com qualquer banco (SQLite, PostgreSQL, etc.)
Execute: python create_bill_payment_tables.py
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.wolkpay import WolkPayBillPayment, WolkPayBillPaymentLog, Base

def create_tables():
    """Cria as tabelas de Bill Payment usando SQLAlchemy"""
    
    print("=" * 60)
    print("🚀 WolkPay Bill Payment - Criando Tabelas")
    print("=" * 60)
    
    # Conectar ao banco
    db_url = settings.DATABASE_URL
    print(f"\n🔗 Conectando ao banco de dados...")
    
    if 'sqlite' in db_url:
        print(f"   Usando SQLite local")
    else:
        print(f"   Host: {db_url.split('@')[1].split('/')[0] if '@' in db_url else 'local'}")
    
    try:
        engine = create_engine(db_url, echo=False)
        inspector = inspect(engine)
        
        # Verificar tabelas existentes
        existing_tables = inspector.get_table_names()
        print(f"\n📊 Tabelas existentes no banco: {len(existing_tables)}")
        
        # Verificar se tabelas já existem
        bill_table_exists = 'wolkpay_bill_payments' in existing_tables
        log_table_exists = 'wolkpay_bill_payment_logs' in existing_tables
        
        if bill_table_exists:
            print("   ⚠️  wolkpay_bill_payments já existe")
        if log_table_exists:
            print("   ⚠️  wolkpay_bill_payment_logs já existe")
        
        # Criar tabelas que não existem
        print("\n🔧 Criando tabelas...")
        
        # Criar apenas as tabelas de Bill Payment
        tables_to_create = []
        if not bill_table_exists:
            tables_to_create.append(WolkPayBillPayment.__table__)
        if not log_table_exists:
            tables_to_create.append(WolkPayBillPaymentLog.__table__)
        
        if tables_to_create:
            Base.metadata.create_all(engine, tables=tables_to_create)
            print(f"   ✅ {len(tables_to_create)} tabela(s) criada(s)")
        else:
            print("   ℹ️  Todas as tabelas já existem")
        
        # Verificar resultado
        inspector = inspect(engine)
        updated_tables = inspector.get_table_names()
        
        if 'wolkpay_bill_payments' in updated_tables:
            columns = inspector.get_columns('wolkpay_bill_payments')
            print(f"\n✅ wolkpay_bill_payments: {len(columns)} colunas")
            
        if 'wolkpay_bill_payment_logs' in updated_tables:
            columns = inspector.get_columns('wolkpay_bill_payment_logs')
            print(f"✅ wolkpay_bill_payment_logs: {len(columns)} colunas")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erro ao criar tabelas: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_tables()
    
    if success:
        print("\n" + "=" * 60)
        print("🎉 Tabelas de Bill Payment prontas!")
        print("=" * 60)
        print("\n📌 Próximos passos:")
        print("   1. Iniciar o backend: cd backend && uvicorn app.main:app --reload")
        print("   2. Iniciar o frontend: cd Frontend && npm run dev")
        print("   3. Testar endpoint: GET /wolkpay-bill/payments")
    else:
        print("\n❌ Falha ao criar tabelas. Verifique os logs acima.")
        sys.exit(1)
