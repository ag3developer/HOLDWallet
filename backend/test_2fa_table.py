"""
Script para testar a criação da tabela two_factor_auth
"""
from app.core.db import Base, engine
from app.models.two_factor import TwoFactorAuth
from app.models.user import User

# Criar tabelas
print("🔧 Criando tabelas...")
Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas com sucesso!")

# Verificar se tabela foi criada
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"\n📋 Tabelas no banco de dados: {tables}")

if 'two_factor_auth' in tables:
    print("✅ Tabela 'two_factor_auth' encontrada!")
    
    # Mostrar colunas
    columns = inspector.get_columns('two_factor_auth')
    print("\n📊 Colunas da tabela 'two_factor_auth':")
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
else:
    print("❌ Tabela 'two_factor_auth' NÃO encontrada!")
