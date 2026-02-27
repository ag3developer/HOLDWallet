#!/bin/bash

# Script de exemplo: Creditando o investidor João Silva com 2.779 USDT
# Use este como referência para outros investidores

set -e  # Exit on error

PROJECT_ROOT="/Users/josecarlosmartins/Documents/HOLDWallet/backend"
cd "$PROJECT_ROOT"

echo "🚀 Migrando créditos do investidor para produção"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# UUID do investidor (substitua com o UUID real)
INVESTOR_UUID="550e8400-e29b-41d4-a716-446655440000"
INVESTOR_NAME="João Silva"

echo ""
echo "📋 Detalhes:"
echo "  Investidor: $INVESTOR_NAME"
echo "  UUID: $INVESTOR_UUID"
echo "  Montante: 2.779 USDT"
echo "  Performance: 0.35%"
echo ""

# Passo 1: Testar conexão
echo "1️⃣  Testando conexão com banco de dados..."
python scripts/migrate_investor_credits_prod.py test
echo ""

# Passo 2: Criar tabelas (seguro executar múltiplas vezes)
echo "2️⃣  Criando tabelas de créditos (se não existem)..."
python scripts/migrate_investor_credits_prod.py setup
echo ""

# Passo 3: Adicionar crédito virtual
echo "3️⃣  Adicionando crédito virtual de 2.779 USDT..."
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "$INVESTOR_UUID" \
  --amount 2779.00 \
  --reason INVESTOR_CORRECTION \
  --notes "Investidor $INVESTOR_NAME - Operações Passadas 2024"
echo ""

# Passo 4: Adicionar taxa de performance
echo "4️⃣  Adicionando taxa de performance de 0.35%..."
python scripts/migrate_investor_credits_prod.py add-fee \
  --user-id "$INVESTOR_UUID" \
  --base-amount 2779.00 \
  --performance 0.35 \
  --period "Operações Passadas 2024"
echo ""

# Passo 5: Verificar resultado final
echo "5️⃣  Verificando saldos finais..."
python scripts/migrate_investor_credits_prod.py get-totals \
  --user-id "$INVESTOR_UUID"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migração concluída com sucesso!"
echo ""
echo "📊 O investidor agora tem:"
echo "  • Crédito Virtual: 2.779 USDT"
echo "  • Taxa de Performance: 9.73 USDT (2779 × 0.35%)"
echo "  • Total em Custódia: 2.788,73 USDT"
echo ""
echo "💰 Os créditos começarão a gerar rendimentos semanais (~0.75%)"
echo ""
echo "🔗 Para verificar no frontend, acesse:"
echo "  /admin/earnpool → Créditos de Investidores"
echo "  Digite o UUID: $INVESTOR_UUID"
