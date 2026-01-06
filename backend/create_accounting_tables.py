#!/usr/bin/env python3
"""
Script simples para criar as tabelas de contabilidade
"""
import os
import sys

# Configurar path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

# Obter URL do banco
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Conectando ao banco de dados...")

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar conexão
        result = conn.execute(text("SELECT 1"))
        print("✅ Conexão estabelecida!")
        
        # Criar tabela accounting_entries
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS accounting_entries (
                id VARCHAR(36) PRIMARY KEY,
                trade_id VARCHAR(36) REFERENCES instant_trades(id),
                reference_code VARCHAR(50),
                entry_type VARCHAR(20) NOT NULL,
                amount NUMERIC(18, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
                percentage NUMERIC(5, 2),
                base_amount NUMERIC(18, 2),
                description VARCHAR(500),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                erp_reference VARCHAR(100),
                erp_sent_at TIMESTAMP,
                user_id VARCHAR,
                created_by VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """))
        print("✅ Tabela accounting_entries criada/verificada!")
        
        # Criar índices
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_trade_id ON accounting_entries(trade_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_entry_type ON accounting_entries(entry_type)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_status ON accounting_entries(status)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_created_at ON accounting_entries(created_at)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_reference_code ON accounting_entries(reference_code)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_user_id ON accounting_entries(user_id)
        """))
        print("✅ Índices criados!")
        
        # Criar tabela accounting_reports
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS accounting_reports (
                id VARCHAR(36) PRIMARY KEY,
                period_type VARCHAR(20) NOT NULL,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                total_spread NUMERIC(18, 2) NOT NULL DEFAULT 0,
                total_network_fees NUMERIC(18, 2) NOT NULL DEFAULT 0,
                total_platform_fees NUMERIC(18, 2) NOT NULL DEFAULT 0,
                total_other_fees NUMERIC(18, 2) NOT NULL DEFAULT 0,
                grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
                trades_count INTEGER NOT NULL DEFAULT 0,
                entries_count INTEGER NOT NULL DEFAULT 0,
                currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
                status VARCHAR(20) NOT NULL DEFAULT 'generated',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                report_data TEXT
            )
        """))
        print("✅ Tabela accounting_reports criada/verificada!")
        
        # Criar índice para reports
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_accounting_reports_period ON accounting_reports(period_type, period_start)
        """))
        print("✅ Índice de reports criado!")
        
        conn.commit()
        
        # Verificar se as tabelas existem
        result = conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('accounting_entries', 'accounting_reports')
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.fetchall()]
        print(f"\n📊 Tabelas no banco: {tables}")
        
        # Contar registros
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"   - {table}: {count} registros")
        
        print("\n✅ Migração concluída com sucesso!")
        
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
