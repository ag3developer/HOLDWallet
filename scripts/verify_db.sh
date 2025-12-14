#!/bin/bash

# 🔍 HOLD Wallet - Database Verification Script
# Verifica se todas as tabelas foram criadas corretamente no PostgreSQL

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "🔍 HOLD Wallet Database Verification"
echo "=================================="
echo ""

# Configurações
DB_HOST="app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com"
DB_PORT="25060"
DB_USER="holdwallet-db"
DB_NAME="holdwallet-db"
DB_PASSWORD="${1:-AVNS_nUUIAsF6R5bJR3GvmRH}"

# Tabelas esperadas
EXPECTED_TABLES=(
    "users"
    "wallets"
    "addresses"
    "transactions"
    "two_factor_auth"
    "p2p_orders"
    "p2p_matches"
    "p2p_escrow"
    "p2p_disputes"
    "p2p_chat"
    "chat_messages"
    "reputation_scores"
)

# Função para executar query SQL
run_query() {
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "$1"
}

echo "📡 Testando conexão ao banco..."
if run_query "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Conexão bem-sucedida${NC}"
else
    echo -e "${RED}✗ Falha na conexão${NC}"
    exit 1
fi

echo ""
echo "📊 Contando tabelas..."
TABLE_COUNT=$(run_query "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | grep -v count | grep -v "^--" | grep -v "^(" | grep -v "^)" | head -1 | tr -d ' ')

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -lt 12 ]; then
    echo -e "${RED}✗ Apenas $TABLE_COUNT tabelas encontradas (esperado: 12+)${NC}"
else
    echo -e "${GREEN}✓ $TABLE_COUNT tabelas encontradas${NC}"
fi

echo ""
echo "🔐 Verificando tabelas principais..."

for table in "${EXPECTED_TABLES[@]}"; do
    if run_query "\dt $table" 2>&1 | grep -q "$table"; then
        echo -e "${GREEN}  ✓ $table${NC}"
    else
        echo -e "${YELLOW}  ? $table (pode não existir)${NC}"
    fi
done

echo ""
echo "🔑 Verificando coluna 'id' em 'users'..."
if run_query "\d users" 2>&1 | grep -q "id"; then
    echo -e "${GREEN}✓ Coluna 'id' encontrada em 'users'${NC}"
else
    echo -e "${RED}✗ Coluna 'id' NOT FOUND em 'users'${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ Verificação Concluída${NC}"
echo "=================================="
