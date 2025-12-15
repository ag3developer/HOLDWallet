#!/bin/bash
# Script para criar tabelas no banco de produção via Digital Ocean Console

echo "=========================================================================="
echo "🔨 COMANDOS PARA CRIAR TABELAS NO DIGITAL OCEAN"
echo "=========================================================================="
echo ""
echo "📋 COPIE E COLE ESTES COMANDOS NO CONSOLE DO DIGITAL OCEAN:"
echo ""
echo "1. Acesse: https://cloud.digitalocean.com/apps"
echo "2. Clique no app 'wolknow-backend'"
echo "3. Clique em 'Console' no menu lateral"
echo "4. Cole os comandos abaixo:"
echo ""
echo "=========================================================================="
echo ""
cat << 'EOF'
# COMANDO 1: Ir para o diretório do backend
cd /workspace/backend

# COMANDO 2: Verificar estado atual das migrations
python -m alembic current

# COMANDO 3: Executar todas as migrations (CRIAR AS TABELAS)
python -m alembic upgrade head

# COMANDO 4: Verificar se as tabelas foram criadas
python << 'PYTHON_EOF'
from app.core.db import engine
from sqlalchemy import inspect, text

print("\n" + "="*70)
print("🔍 VERIFICANDO TABELAS CRIADAS")
print("="*70)

insp = inspect(engine)
tables = insp.get_table_names()

if tables:
    print(f"\n✅ {len(tables)} tabelas criadas com sucesso:\n")
    for table in sorted(tables):
        with engine.connect() as conn:
            result = conn.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
            count = result.scalar()
            print(f"   {'✅' if count > 0 else '⚪'} {table}: {count} registros")
else:
    print("\n❌ ERRO: Nenhuma tabela foi criada!")
    
print("="*70 + "\n")
PYTHON_EOF

# COMANDO 5: Verificar se o endpoint de login agora funciona
echo ""
echo "=========================================================================="
echo "✅ TABELAS CRIADAS! Agora teste o endpoint:"
echo "=========================================================================="
echo ""
echo "curl -X POST https://api.wolknow.com/v1/auth/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@wolknow.com\",\"username\":\"admin\",\"password\":\"Admin@2025!\"}'"
echo ""
EOF

echo ""
echo "=========================================================================="
echo "⚠️  ATENÇÃO: Se o comando 'alembic upgrade head' falhar com erro de"
echo "    permissão, execute primeiro estas permissões SQL:"
echo "=========================================================================="
echo ""
echo "No Console SQL do banco de dados (não do app):"
echo ""
echo "GRANT ALL PRIVILEGES ON SCHEMA public TO \"holdwallet-db\";"
echo "GRANT CREATE ON SCHEMA public TO \"holdwallet-db\";"
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"holdwallet-db\";"
echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"holdwallet-db\";"
echo ""
echo "=========================================================================="
