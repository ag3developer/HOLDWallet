#!/bin/bash
# Script para testar a API localmente e depois em produção

echo "=========================================="
echo "🧪 TESTE DE API - LOCAL vs PRODUÇÃO"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================
# TESTE 1: LOCAL (localhost:8000)
# ========================
echo -e "${YELLOW}TEST 1: LOCALHOST:8000${NC}"
echo "================================"

echo -e "\n${YELLOW}1.1 - Health Check:${NC}"
curl -s http://localhost:8000/api/v1/health | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}1.2 - Root Endpoint:${NC}"
curl -s http://localhost:8000/ | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}1.3 - Login com /api/v1:${NC}"
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}' | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}1.4 - Login com /v1 (via middleware):${NC}"
curl -s -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}' | jq . 2>/dev/null || echo "❌ Sem resposta"

# ========================
# TESTE 2: PRODUÇÃO (api.wolknow.com)
# ========================
echo -e "\n\n${YELLOW}TEST 2: PRODUÇÃO (api.wolknow.com)${NC}"
echo "=========================================="

echo -e "\n${YELLOW}2.1 - Health Check (/v1):${NC}"
curl -s https://api.wolknow.com/v1/health | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}2.2 - Health Check (/api/v1):${NC}"
curl -s https://api.wolknow.com/api/v1/health | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}2.3 - Root Endpoint (/v1):${NC}"
curl -s https://api.wolknow.com/v1/ | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}2.4 - Root Endpoint (/api/v1):${NC}"
curl -s https://api.wolknow.com/api/v1/ | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}2.5 - Login com /v1:${NC}"
curl -s -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}' | jq . 2>/dev/null || echo "❌ Sem resposta"

echo -e "\n${YELLOW}2.6 - Login com /api/v1:${NC}"
curl -s -X POST https://api.wolknow.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}' | jq . 2>/dev/null || echo "❌ Sem resposta"

# ========================
# RESUMO
# ========================
echo -e "\n\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}📊 RESUMO${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "✅ Se localhost e produção retornam respostas similares:"
echo "   → O código está correto e bem configurado"
echo ""
echo "❌ Se localhost funciona mas produção não:"
echo "   → Pode ser: variáveis de ambiente, banco de dados, ou CORS"
echo ""
