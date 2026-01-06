"""
🔧 HOLD Wallet - Script de Migração para Tabelas de Contabilidade
==================================================================

Este script cria as tabelas necessárias para o módulo de contabilidade:
- accounting_entries: Registros individuais de receitas (spread, taxas, etc.)
- accounting_reports: Relatórios consolidados por período

Execução:
    python migrate_accounting_tables.py
"""

import os
import sys

# Adiciona o diretório do backend ao path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.db import Base

# Importar os modelos para registrá-los
from app.models.accounting import AccountingEntry, AccountingReport, AccountingEntryType, AccountingEntryStatus
from app.models.instant_trade import InstantTrade, InstantTradeHistory

def get_database_url():
    """Obtém a URL do banco de dados do .env"""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL não encontrada no .env")
    return url

def create_accounting_tables():
    """Cria as tabelas de contabilidade no banco de dados"""
    
    database_url = get_database_url()
    
    # Criar engine
    engine = create_engine(database_url, echo=True)
    
    print("\n" + "="*60)
    print("🔧 HOLD Wallet - Migração de Tabelas de Contabilidade")
    print("="*60 + "\n")
    
    # Verificar conexão
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database(), current_user"))
            db_name, user = result.fetchone()
            print(f"✅ Conectado ao banco: {db_name}")
            print(f"✅ Usuário: {user}")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return False
    
    print("\n📋 Tabelas a serem criadas/verificadas:")
    print("   - accounting_entries")
    print("   - accounting_reports")
    print()
    
    try:
        # Verificar se as tabelas já existem
        with engine.connect() as conn:
            # Verificar accounting_entries
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'accounting_entries'
                )
            """))
            accounting_entries_exists = result.scalar()
            
            # Verificar accounting_reports
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'accounting_reports'
                )
            """))
            accounting_reports_exists = result.scalar()
            
            # Verificar instant_trades
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'instant_trades'
                )
            """))
            instant_trades_exists = result.scalar()
            
            print(f"   instant_trades: {'✅ Existe' if instant_trades_exists else '⚠️ Não existe'}")
            print(f"   accounting_entries: {'✅ Existe' if accounting_entries_exists else '🆕 Será criada'}")
            print(f"   accounting_reports: {'✅ Existe' if accounting_reports_exists else '🆕 Será criada'}")
        
        # Criar tabelas
        print("\n🔄 Criando/Atualizando tabelas...")
        
        # Criar todas as tabelas baseadas no Base.metadata
        Base.metadata.create_all(engine, checkfirst=True)
        
        print("✅ Tabelas criadas/verificadas com sucesso!")
        
        # Verificar estrutura das tabelas criadas
        with engine.connect() as conn:
            # Listar colunas de accounting_entries
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'accounting_entries'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            if columns:
                print("\n📊 Estrutura da tabela 'accounting_entries':")
                for col_name, data_type, nullable in columns:
                    null_str = "NULL" if nullable == 'YES' else "NOT NULL"
                    print(f"   - {col_name}: {data_type} {null_str}")
            
            # Listar colunas de accounting_reports
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'accounting_reports'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            if columns:
                print("\n📊 Estrutura da tabela 'accounting_reports':")
                for col_name, data_type, nullable in columns:
                    null_str = "NULL" if nullable == 'YES' else "NOT NULL"
                    print(f"   - {col_name}: {data_type} {null_str}")
        
        print("\n" + "="*60)
        print("✅ Migração concluída com sucesso!")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erro durante a migração: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_instant_trades_table():
    """Verifica se a tabela instant_trades existe e tem as colunas necessárias"""
    
    database_url = get_database_url()
    engine = create_engine(database_url, echo=False)
    
    print("\n📋 Verificando tabela instant_trades...")
    
    try:
        with engine.connect() as conn:
            # Verificar se existe
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'instant_trades'
                )
            """))
            
            if not result.scalar():
                print("⚠️ Tabela instant_trades não existe! Criando...")
                Base.metadata.create_all(engine, tables=[InstantTrade.__table__, InstantTradeHistory.__table__], checkfirst=True)
                print("✅ Tabela instant_trades criada!")
            else:
                # Verificar colunas
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'instant_trades'
                """))
                
                columns = [row[0] for row in result.fetchall()]
                print(f"✅ Tabela existe com {len(columns)} colunas")
                
                # Verificar colunas essenciais
                required_columns = ['id', 'user_id', 'status', 'spread_amount', 'network_fee_amount']
                missing = [col for col in required_columns if col not in columns]
                
                if missing:
                    print(f"⚠️ Colunas faltando: {missing}")
                else:
                    print("✅ Todas as colunas essenciais presentes")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False


if __name__ == "__main__":
    print("\n🚀 Iniciando migração...\n")
    
    # Primeiro verificar instant_trades
    verify_instant_trades_table()
    
    # Então criar as tabelas de contabilidade
    success = create_accounting_tables()
    
    if success:
        print("🎉 Tudo pronto! As tabelas de contabilidade estão disponíveis.\n")
    else:
        print("😞 Houve problemas na migração. Verifique os erros acima.\n")
        sys.exit(1)
