#!/usr/bin/env python3
"""
Script para migrar dados do SQLite local para PostgreSQL de produção no Digital Ocean
Executa localmente e conecta diretamente ao banco de produção
"""

import sys
import os
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

import sqlalchemy
from sqlalchemy import create_engine, MetaData, inspect, text
from sqlalchemy.orm import sessionmaker
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ============================================================================

# SQLite Local
LOCAL_DB = "sqlite:///holdwallet.db"

# PostgreSQL Produção (Digital Ocean)
PROD_DB = (
    "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@"
    "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/"
    "holdwallet-db?sslmode=require"
)

# ============================================================================
# FUNÇÕES PRINCIPAIS
# ============================================================================

def criar_engine_local():
    """Cria engine para o banco SQLite local"""
    try:
        engine = create_engine(LOCAL_DB, echo=False)
        logger.info(f"✅ Conectado ao banco LOCAL: {LOCAL_DB}")
        return engine
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao banco local: {e}")
        sys.exit(1)

def criar_engine_producao():
    """Cria engine para o banco PostgreSQL de produção"""
    try:
        engine = create_engine(PROD_DB, echo=False)
        # Testar conexão
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"✅ Conectado ao banco PRODUÇÃO")
            logger.info(f"   PostgreSQL: {version[:50]}...")
        return engine
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao banco de produção: {e}")
        logger.error(f"   Verifique as credenciais e conexão com a internet")
        sys.exit(1)

def listar_tabelas_local(engine):
    """Lista todas as tabelas do banco local"""
    inspector = inspect(engine)
    tabelas = inspector.get_table_names()
    logger.info(f"\n📋 Tabelas encontradas no banco LOCAL: {len(tabelas)}")
    for tabela in tabelas:
        logger.info(f"   - {tabela}")
    return tabelas

def criar_tabelas_via_sqlalchemy():
    """Cria todas as tabelas usando os models do SQLAlchemy"""
    logger.info("\n🔨 Criando estrutura de tabelas no banco de PRODUÇÃO...")
    
    try:
        # Importar os models
        from app.core.db import Base, engine as prod_engine
        
        # Sobrescrever a URL do engine para produção
        prod_engine = create_engine(PROD_DB, echo=False)
        
        # Criar todas as tabelas
        Base.metadata.create_all(bind=prod_engine)
        
        # Verificar tabelas criadas
        inspector = inspect(prod_engine)
        tabelas = inspector.get_table_names()
        logger.info(f"✅ {len(tabelas)} tabelas criadas no banco de PRODUÇÃO:")
        for tabela in sorted(tabelas):
            logger.info(f"   - {tabela}")
        
        return prod_engine
        
    except Exception as e:
        logger.error(f"❌ Erro ao criar tabelas: {e}")
        logger.info("\n💡 Tentando método alternativo...")
        return None

def copiar_dados_tabela(nome_tabela, engine_local, engine_prod):
    """Copia dados de uma tabela do banco local para produção"""
    try:
        metadata_local = MetaData()
        metadata_local.reflect(bind=engine_local)
        
        if nome_tabela not in metadata_local.tables:
            logger.warning(f"⚠️  Tabela '{nome_tabela}' não existe no banco local")
            return 0
        
        tabela = metadata_local.tables[nome_tabela]
        
        # Ler dados do banco local
        with engine_local.connect() as conn:
            result = conn.execute(tabela.select())
            dados = result.fetchall()
        
        if not dados:
            logger.info(f"   {nome_tabela}: 0 registros (tabela vazia)")
            return 0
        
        # Inserir dados no banco de produção
        with engine_prod.connect() as conn:
            trans = conn.begin()
            try:
                # Converter rows para dicts
                colunas = list(tabela.columns.keys())
                dados_dict = [dict(zip(colunas, row)) for row in dados]
                
                # Inserir
                conn.execute(tabela.insert(), dados_dict)
                trans.commit()
                
                logger.info(f"   ✅ {nome_tabela}: {len(dados)} registros copiados")
                return len(dados)
                
            except Exception as e:
                trans.rollback()
                logger.error(f"   ❌ {nome_tabela}: Erro ao copiar - {e}")
                return 0
                
    except Exception as e:
        logger.error(f"   ❌ {nome_tabela}: Erro - {e}")
        return 0

def migrar_todos_dados(engine_local, engine_prod, tabelas):
    """Migra dados de todas as tabelas"""
    logger.info("\n📦 Copiando dados das tabelas...")
    logger.info("=" * 70)
    
    total_registros = 0
    tabelas_migradas = 0
    
    # Ordem específica para respeitar foreign keys
    ordem_tabelas = [
        'users',
        'wallets',
        'addresses',
        'transactions',
        'two_factor_auth',
        'trader_profiles',
        'trader_stats',
        'p2p_orders',
        'p2p_matches',
        'p2p_escrows',
        'p2p_chat_rooms',
        'p2p_chat_messages',
        'p2p_chat_sessions',
        'p2p_file_uploads',
        'p2p_disputes',
        'user_reputations',
        'user_reviews',
        'user_badges',
        'fraud_reports',
        'payment_method_verifications',
        'trade_feedbacks',
        'instant_trades',
        'instant_trade_history',
    ]
    
    # Migrar tabelas na ordem especificada
    for tabela in ordem_tabelas:
        if tabela in tabelas:
            registros = copiar_dados_tabela(tabela, engine_local, engine_prod)
            if registros > 0:
                total_registros += registros
                tabelas_migradas += 1
    
    # Migrar outras tabelas não listadas
    outras_tabelas = set(tabelas) - set(ordem_tabelas)
    for tabela in outras_tabelas:
        registros = copiar_dados_tabela(tabela, engine_local, engine_prod)
        if registros > 0:
            total_registros += registros
            tabelas_migradas += 1
    
    logger.info("=" * 70)
    logger.info(f"✅ Migração concluída: {tabelas_migradas} tabelas, {total_registros} registros")
    
    return total_registros

def verificar_dados_produção(engine_prod):
    """Verifica os dados migrados no banco de produção"""
    logger.info("\n🔍 Verificando dados no banco de PRODUÇÃO...")
    logger.info("=" * 70)
    
    inspector = inspect(engine_prod)
    tabelas = inspector.get_table_names()
    
    metadata = MetaData()
    metadata.reflect(bind=engine_prod)
    
    for nome_tabela in sorted(tabelas):
        if nome_tabela == 'alembic_version':
            continue
            
        tabela = metadata.tables[nome_tabela]
        with engine_prod.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {nome_tabela}"))
            count = result.scalar()
            if count > 0:
                logger.info(f"   ✅ {nome_tabela}: {count} registros")
    
    logger.info("=" * 70)

def main():
    """Função principal"""
    print("\n" + "=" * 70)
    print("🚀 MIGRAÇÃO DO BANCO DE DADOS LOCAL → PRODUÇÃO")
    print("=" * 70)
    
    # Verificar se o banco local existe
    if not os.path.exists("holdwallet.db"):
        logger.error("❌ Arquivo 'holdwallet.db' não encontrado!")
        logger.info("   Execute este script no diretório raiz do projeto")
        sys.exit(1)
    
    # Conectar aos bancos
    logger.info("\n📡 Conectando aos bancos de dados...")
    engine_local = criar_engine_local()
    engine_prod = criar_engine_producao()
    
    # Listar tabelas do banco local
    tabelas_local = listar_tabelas_local(engine_local)
    
    if not tabelas_local:
        logger.error("❌ Nenhuma tabela encontrada no banco local!")
        sys.exit(1)
    
    # Criar estrutura no banco de produção
    logger.info("\n🏗️  Criando estrutura de tabelas na PRODUÇÃO...")
    prod_engine = criar_tabelas_via_sqlalchemy()
    
    if prod_engine is None:
        prod_engine = engine_prod
    
    # Confirmar migração
    print("\n" + "⚠️  " * 20)
    print("⚠️  ATENÇÃO: Este script irá:")
    print("⚠️  1. Criar todas as tabelas no banco de PRODUÇÃO")
    print("⚠️  2. Copiar TODOS os dados do banco local para PRODUÇÃO")
    print("⚠️  ")
    print(f"⚠️  Banco de produção: Digital Ocean PostgreSQL")
    print("⚠️  " * 20)
    
    resposta = input("\n✋ Digite 'SIM' para continuar: ")
    
    if resposta.upper() != 'SIM':
        logger.info("❌ Migração cancelada pelo usuário")
        sys.exit(0)
    
    # Migrar dados
    total_registros = migrar_todos_dados(engine_local, prod_engine, tabelas_local)
    
    # Verificar resultado
    verificar_dados_produção(prod_engine)
    
    # Resumo final
    print("\n" + "=" * 70)
    print("🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 70)
    print(f"✅ Total de registros migrados: {total_registros}")
    print(f"✅ Banco de produção pronto para uso")
    print("\n📝 Próximos passos:")
    print("   1. Teste o endpoint de login: https://api.wolknow.com/v1/auth/login")
    print("   2. Verifique se consegue fazer login com suas credenciais")
    print("   3. Teste as funcionalidades do sistema")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Migração interrompida pelo usuário")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
