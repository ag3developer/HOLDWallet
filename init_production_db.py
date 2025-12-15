#!/usr/bin/env python3
"""
Script para inicializar o banco de dados em produção
Cria todas as tabelas necessárias
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.db import create_tables, init_db
from app.core.logging import setup_logging, get_logger
from app.services.users_service import create_user

# Setup logging
setup_logging()
logger = get_logger("init_db")

async def main():
    """Initialize production database"""
    print("\n" + "="*50)
    print("🗄️  INICIALIZANDO BANCO DE DADOS EM PRODUÇÃO")
    print("="*50 + "\n")
    
    try:
        # Initialize database connection
        if init_db():
            logger.info("✅ Conexão com banco de dados estabelecida")
            
            # Create tables
            await create_tables()
            logger.info("✅ Tabelas criadas com sucesso")
            
            # Create test user if doesn't exist
            try:
                user = await create_user(
                    email="app@holdwallet.com",
                    username="app",
                    password="Abc123@@",
                    full_name="App User"
                )
                logger.info(f"✅ Usuário de teste criado: {user.email}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    logger.info("ℹ️  Usuário de teste já existe")
                else:
                    logger.error(f"❌ Erro ao criar usuário de teste: {e}")
            
            print("\n" + "="*50)
            print("✅ BANCO DE DADOS INICIALIZADO COM SUCESSO!")
            print("="*50)
            print("\nCredenciais de teste:")
            print("  Email: app@holdwallet.com")
            print("  Senha: Abc123@@")
            print("\n")
            
        else:
            logger.error("❌ Falha ao conectar ao banco de dados")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Erro durante inicialização: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
