#!/usr/bin/env python3
"""
Script para executar migrations Alembic no banco de produção
Conecta diretamente ao PostgreSQL do Digital Ocean e cria as tabelas
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Configurar variáveis de ambiente para produção
os.environ["DATABASE_URL"] = "postgresql://holdwallet-db:AVNS_lmvtH5JrIXZ0HAxXxZo@holdwallet-db-do-user-18593563-0.i.db.ondigitalocean.com:25060/holdwallet?sslmode=require"
os.environ["ENVIRONMENT"] = "production"

print("🚀 Iniciando migrations para o banco de PRODUÇÃO...")
print(f"📂 Backend dir: {backend_dir}")
print(f"🔗 Conectando ao PostgreSQL de produção...")

# Importar após configurar as variáveis de ambiente
from sqlalchemy import create_engine, text, inspect
from app.core.db import Base, engine as db_engine
from app.models import user, wallet, p2p, reputation, trader_profile, instant_trade, chat

def check_tables():
    """Verifica quantas tabelas existem"""
    inspector = inspect(db_engine)
    tables = inspector.get_table_names()
    print(f"📊 Tabelas encontradas: {len(tables)}")
    if tables:
        print(f"   Tabelas: {', '.join(tables)}")
    return tables

def create_tables_sqlalchemy():
    """Cria tabelas usando SQLAlchemy"""
    print("\n🔨 Tentando criar tabelas com SQLAlchemy...")
    try:
        Base.metadata.create_all(bind=db_engine)
        print("✅ Tabelas criadas com sucesso!")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        return False

def run_alembic_migrations():
    """Executa migrations do Alembic"""
    print("\n📝 Tentando executar Alembic migrations...")
    import subprocess
    
    try:
        # Mudar para o diretório backend
        os.chdir(backend_dir)
        
        # Executar alembic upgrade head
        result = subprocess.run(
            ["python3.9", "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            print("✅ Alembic migrations executadas com sucesso!")
            print(result.stdout)
            return True
        else:
            print(f"⚠️ Alembic falhou:")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Erro ao executar Alembic: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("  EXECUÇÃO DE MIGRATIONS NO BANCO DE PRODUÇÃO")
    print("="*60 + "\n")
    
    # 1. Verificar estado atual
    print("1️⃣ Verificando estado atual do banco...")
    initial_tables = check_tables()
    
    if len(initial_tables) > 0:
        print(f"\n⚠️ ATENÇÃO: Já existem {len(initial_tables)} tabelas no banco!")
        response = input("Deseja continuar? (s/n): ")
        if response.lower() != 's':
            print("❌ Operação cancelada pelo usuário")
            return
    
    # 2. Tentar Alembic primeiro
    print("\n2️⃣ Tentando método 1: Alembic migrations...")
    if run_alembic_migrations():
        print("\n✅ Migrations concluídas com sucesso via Alembic!")
    else:
        # 3. Fallback para SQLAlchemy
        print("\n3️⃣ Tentando método 2: SQLAlchemy create_all...")
        if create_tables_sqlalchemy():
            print("\n✅ Tabelas criadas com sucesso via SQLAlchemy!")
        else:
            print("\n❌ Não foi possível criar as tabelas automaticamente")
            print("\n📋 Solução manual:")
            print("   1. Acesse: https://cloud.digitalocean.com/apps")
            print("   2. Entre no app 'wolknow-backend'")
            print("   3. Clique em 'Console'")
            print("   4. Execute: cd /workspace/backend && python -m alembic upgrade head")
            return
    
    # 4. Verificar resultado final
    print("\n4️⃣ Verificando resultado final...")
    final_tables = check_tables()
    
    # 5. Resumo
    print("\n" + "="*60)
    print("  RESUMO DA OPERAÇÃO")
    print("="*60)
    print(f"📊 Tabelas antes:  {len(initial_tables)}")
    print(f"📊 Tabelas depois: {len(final_tables)}")
    print(f"✨ Tabelas criadas: {len(final_tables) - len(initial_tables)}")
    
    if len(final_tables) > len(initial_tables):
        print("\n🎉 SUCESSO! Tabelas criadas no banco de produção!")
        print("\n🧪 Próximo passo: Testar o registro de usuário")
        print("\ncurl -X POST https://api.wolknow.com/v1/auth/register \\")
        print('  -H "Content-Type: application/json" \\')
        print('  -d \'{"email":"admin@wolknow.com","username":"admin","password":"Admin@2025!Strong"}\'')
    else:
        print("\n⚠️ Nenhuma tabela nova foi criada")
        print("   Verifique os erros acima e tente a solução manual")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Operação interrompida pelo usuário")
    except Exception as e:
        print(f"\n\n❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
