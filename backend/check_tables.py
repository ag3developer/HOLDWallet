#!/usr/bin/env python3
"""Verifica se as tabelas de contabilidade existem"""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'accounting%'"))
    tables = [row[0] for row in result.fetchall()]
    print(f"Tabelas accounting: {tables}")
    
    if not tables:
        print("Tabelas não encontradas. Criando...")
        # Criar accounting_entries
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS accounting_entries (
                id VARCHAR(36) PRIMARY KEY,
                trade_id VARCHAR(36),
                reference_code VARCHAR(50),
                entry_type VARCHAR(20) NOT NULL,
                amount NUMERIC(18, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'BRL',
                percentage NUMERIC(5, 2),
                base_amount NUMERIC(18, 2),
                description VARCHAR(500),
                status VARCHAR(20) DEFAULT 'pending',
                erp_reference VARCHAR(100),
                erp_sent_at TIMESTAMP,
                user_id VARCHAR,
                created_by VARCHAR,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                metadata TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ae_trade_id ON accounting_entries(trade_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ae_entry_type ON accounting_entries(entry_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ae_status ON accounting_entries(status)"))
        
        # Criar accounting_reports
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS accounting_reports (
                id VARCHAR(36) PRIMARY KEY,
                period_type VARCHAR(20) NOT NULL,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                total_spread NUMERIC(18, 2) DEFAULT 0,
                total_network_fees NUMERIC(18, 2) DEFAULT 0,
                total_platform_fees NUMERIC(18, 2) DEFAULT 0,
                total_other_fees NUMERIC(18, 2) DEFAULT 0,
                grand_total NUMERIC(18, 2) DEFAULT 0,
                trades_count INTEGER DEFAULT 0,
                entries_count INTEGER DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'BRL',
                status VARCHAR(20) DEFAULT 'generated',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                report_data TEXT
            )
        """))
        conn.commit()
        print("Tabelas criadas!")
    else:
        print("Tabelas já existem!")
