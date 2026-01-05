#!/usr/bin/env python3
"""
Script para inicializar o banco de dados na primeira execução
Cria todas as tabelas automaticamente se não existirem
"""

import logging
from sqlalchemy import text, inspect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Inicializa o banco de dados criando todas as tabelas"""
    try:
        from app.core.db import engine, Base
        
        logger.info("🔍 Verificando estado do banco de dados...")
        
        # Verificar se já existem tabelas
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            logger.info(f"✅ Banco já inicializado com {len(existing_tables)} tabelas")
            return True
        
        logger.info("🔨 Banco vazio! Criando todas as tabelas...")
        
        # Importar todos os models para registrar no Base
        from app.models import user, wallet, address, transaction, two_factor
        from app.models import p2p, reputation, trader_profile, instant_trade, chat
        from app.models import system_wallet  # Sistema de taxas e carteira do sistema
        
        # Criar todas as tabelas
        Base.metadata.create_all(bind=engine)
        
        # Verificar se foram criadas
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            logger.info(f"✅ {len(tables)} tabelas criadas com sucesso!")
            for table in sorted(tables):
                logger.info(f"   - {table}")
            return True
        else:
            logger.error("❌ Falha ao criar tabelas!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Erro ao inicializar banco: {e}")
        # Log completo do erro
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1)
