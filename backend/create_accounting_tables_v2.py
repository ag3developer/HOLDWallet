#!/usr/bin/env python3
"""
Script para criar tabelas de accounting se não existirem
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine, Base
from sqlalchemy import inspect, text
from app.models.accounting import AccountingEntry, AccountingReport

def create_accounting_tables():
    print("=" * 60)
    print("🔍 Verificando tabelas de accounting...")
    print("=" * 60)
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    print(f"\nTabelas existentes no banco: {len(existing_tables)}")
    
    needs_creation = []
    
    if 'accounting_entries' not in existing_tables:
        print("❌ accounting_entries NÃO EXISTE")
        needs_creation.append('accounting_entries')
    else:
        print("✅ accounting_entries EXISTE")
        
    if 'accounting_reports' not in existing_tables:
        print("❌ accounting_reports NÃO EXISTE")
        needs_creation.append('accounting_reports')
    else:
        print("✅ accounting_reports EXISTE")
    
    if needs_creation:
        print(f"\n📝 Criando tabelas: {needs_creation}")
        
        # Criar apenas as tabelas de accounting
        Base.metadata.create_all(
            engine, 
            tables=[
                AccountingEntry.__table__,
                AccountingReport.__table__
            ]
        )
        
        print("✅ Tabelas criadas com sucesso!")
        
        # Verificar novamente
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if 'accounting_entries' in existing_tables:
            print("✅ accounting_entries confirmada")
        if 'accounting_reports' in existing_tables:
            print("✅ accounting_reports confirmada")
    else:
        print("\n✅ Todas as tabelas já existem!")
    
    print("\n" + "=" * 60)
    print("CONCLUÍDO")
    print("=" * 60)

if __name__ == "__main__":
    create_accounting_tables()
