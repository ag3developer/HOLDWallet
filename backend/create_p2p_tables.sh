#!/bin/bash

# 🚀 Script para criar todas as tabelas P2P de uma vez
# Data: 25/11/2025

echo "=================================="
echo "🗄️  CRIAÇÃO DE TABELAS P2P"
echo "=================================="
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navegar para o diretório do backend
cd "$(dirname "$0")"
echo "📁 Diretório atual: $(pwd)"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "alembic.ini" ]; then
    echo -e "${RED}❌ Erro: alembic.ini não encontrado!${NC}"
    echo "Execute este script do diretório backend/"
    exit 1
fi

echo -e "${BLUE}📋 Tabelas que serão criadas:${NC}"
echo "   1. payment_methods (Métodos de Pagamento)"
echo "   2. p2p_orders (Ordens/Anúncios P2P)"
echo "   3. p2p_trades (Trades/Negociações)"
echo "   4. p2p_messages (Chat dos Trades)"
echo "   5. p2p_disputes (Sistema de Disputas)"
echo "   6. p2p_feedbacks (Avaliações/Reputação)"
echo "   7. user_p2p_stats (Estatísticas dos Usuários)"
echo "   8. p2p_escrow_transactions (Transações de Escrow)"
echo ""

echo -e "${YELLOW}⚠️  ATENÇÃO: Esta operação criará 8 tabelas novas no banco!${NC}"
echo ""
read -p "Deseja continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${RED}❌ Operação cancelada${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Verificando última revisão...${NC}"
alembic current
echo ""

echo -e "${BLUE}🔄 Executando migração...${NC}"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCESSO! Todas as tabelas foram criadas!${NC}"
    echo ""
    echo -e "${BLUE}📊 Verificando estado atual:${NC}"
    alembic current
    echo ""
    echo -e "${GREEN}🎉 Sistema P2P pronto para uso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "  1. ✅ Criar os Models SQLAlchemy"
    echo "  2. ✅ Criar os Schemas Pydantic"
    echo "  3. ✅ Implementar os Endpoints da API"
    echo "  4. ✅ Testar CRUD de cada tabela"
else
    echo ""
    echo -e "${RED}❌ Erro ao executar migração!${NC}"
    echo "Verifique os logs acima para detalhes"
    exit 1
fi
