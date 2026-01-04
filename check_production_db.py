#!/usr/bin/env python3
"""
Verifica o estado do banco PostgreSQL de produção
"""

from sqlalchemy import create_engine, text, inspect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# PostgreSQL Produção
PROD_DB = (
    "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@"
    "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/"
    "holdwallet-db?sslmode=require"
)

def main():
    print("\n" + "=" * 70)
    print("🔍 VERIFICANDO BANCO DE DADOS DE PRODUÇÃO")
    print("=" * 70)
    
    try:
        engine = create_engine(PROD_DB, echo=False)
        
        # Testar conexão
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"\n✅ Conectado ao PostgreSQL")
            print(f"   Versão: {version[:80]}...")
            
            # Listar todas as tabelas
            inspector = inspect(engine)
            tabelas = inspector.get_table_names()
            
            print(f"\n📋 Tabelas encontradas: {len(tabelas)}")
            if tabelas:
                for tabela in sorted(tabelas):
                    # Contar registros
                    result = conn.execute(text(f'SELECT COUNT(*) FROM "{tabela}"'))
                    count = result.scalar()
                    status = "✅" if count > 0 else "⚪"
                    print(f"   {status} {tabela}: {count} registros")
            else:
                print("   ❌ Nenhuma tabela encontrada!")
                
            # Verificar se a tabela users existe
            print(f"\n🔍 Verificando estrutura da tabela 'users'...")
            if 'users' in tabelas:
                colunas = inspector.get_columns('users')
                print(f"   ✅ Tabela 'users' existe com {len(colunas)} colunas:")
                for col in colunas:
                    print(f"      - {col['name']}: {col['type']}")
            else:
                print("   ❌ Tabela 'users' NÃO existe!")
                
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
