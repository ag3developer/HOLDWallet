#!/usr/bin/env python3
"""
🔐 Script para criar tabelas de System Blockchain Wallet
=========================================================

Execute este script para criar as tabelas no banco de dados.

Uso:
    python create_system_blockchain_tables.py

Tabelas criadas:
- system_blockchain_wallets (carteira HD do sistema)
- system_blockchain_addresses (16 endereços, um por rede)
- system_wallet_transactions (histórico de transações)
"""

import os
import sys

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def create_tables():
    """Cria as tabelas no banco de dados."""
    
    # Conectar ao banco
    engine = create_engine(settings.DATABASE_URL)
    
    print("🔗 Conectando ao banco de dados...")
    print(f"📍 URL: {settings.DATABASE_URL[:50]}...")
    
    with engine.connect() as conn:
        # Verificar se tabelas já existem
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        tables_to_create = [
            'system_blockchain_wallets',
            'system_blockchain_addresses', 
            'system_wallet_transactions'
        ]
        
        for table in tables_to_create:
            if table in existing_tables:
                print(f"✅ Tabela '{table}' já existe")
            else:
                print(f"📝 Criando tabela '{table}'...")
        
        # SQL para criar as tabelas
        sql_create_wallets = """
        CREATE TABLE IF NOT EXISTS system_blockchain_wallets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) UNIQUE NOT NULL,
            wallet_type VARCHAR(50) NOT NULL DEFAULT 'fees',
            description TEXT,
            encrypted_seed TEXT NOT NULL,
            seed_hash VARCHAR(64) NOT NULL,
            derivation_path VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            is_locked BOOLEAN DEFAULT FALSE NOT NULL,
            created_by UUID,
            last_accessed_by UUID,
            last_accessed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        sql_create_addresses = """
        CREATE TABLE IF NOT EXISTS system_blockchain_addresses (
            id SERIAL PRIMARY KEY,
            wallet_id UUID NOT NULL REFERENCES system_blockchain_wallets(id),
            address VARCHAR(255) NOT NULL,
            network VARCHAR(50) NOT NULL,
            cryptocurrency VARCHAR(20),
            encrypted_private_key TEXT,
            derivation_index INTEGER,
            derivation_path VARCHAR(100),
            cached_balance FLOAT DEFAULT 0.0,
            cached_balance_usd FLOAT DEFAULT 0.0,
            cached_balance_updated_at TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            address_type VARCHAR(50) DEFAULT 'receiving',
            label VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        sql_create_transactions = """
        CREATE TABLE IF NOT EXISTS system_wallet_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            address_id INTEGER NOT NULL REFERENCES system_blockchain_addresses(id),
            tx_hash VARCHAR(255),
            direction VARCHAR(10) NOT NULL,
            amount FLOAT NOT NULL,
            cryptocurrency VARCHAR(20) NOT NULL,
            network VARCHAR(50),
            from_address VARCHAR(255),
            to_address VARCHAR(255),
            reference_type VARCHAR(50),
            reference_id VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            confirmations INTEGER DEFAULT 0,
            usd_value_at_time FLOAT,
            brl_value_at_time FLOAT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            confirmed_at TIMESTAMP
        );
        """
        
        # Índices
        sql_indices = """
        CREATE INDEX IF NOT EXISTS idx_sys_bc_addresses_wallet_id ON system_blockchain_addresses(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_sys_bc_addresses_network ON system_blockchain_addresses(network);
        CREATE INDEX IF NOT EXISTS idx_sys_bc_addresses_address ON system_blockchain_addresses(address);
        CREATE INDEX IF NOT EXISTS idx_sys_wallet_tx_address_id ON system_wallet_transactions(address_id);
        CREATE INDEX IF NOT EXISTS idx_sys_wallet_tx_hash ON system_wallet_transactions(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_sys_wallet_tx_status ON system_wallet_transactions(status);
        """
        
        try:
            conn.execute(text(sql_create_wallets))
            print("✅ Tabela 'system_blockchain_wallets' criada/verificada")
            
            conn.execute(text(sql_create_addresses))
            print("✅ Tabela 'system_blockchain_addresses' criada/verificada")
            
            conn.execute(text(sql_create_transactions))
            print("✅ Tabela 'system_wallet_transactions' criada/verificada")
            
            conn.execute(text(sql_indices))
            print("✅ Índices criados/verificados")
            
            conn.commit()
            
        except Exception as e:
            print(f"❌ Erro ao criar tabelas: {e}")
            conn.rollback()
            return False
        
        # Verificar resultado
        inspector = inspect(engine)
        final_tables = inspector.get_table_names()
        
        print("\n📊 Verificação final:")
        for table in tables_to_create:
            status = "✅" if table in final_tables else "❌"
            print(f"  {status} {table}")
        
        print("\n🎉 Tabelas de System Blockchain Wallet prontas!")
        print("\n📝 Próximo passo:")
        print("   Use o endpoint POST /admin/system-blockchain-wallet/create")
        print("   para criar a carteira principal do sistema com 16 redes.")
        
        return True


if __name__ == "__main__":
    create_tables()
