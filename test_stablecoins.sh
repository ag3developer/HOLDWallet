#!/bin/bash

# 🧪 Test Script - Verificar se Stablecoins aparecem na API

echo "================================================"
echo "🧪 STABLECOIN DISPLAY TEST"
echo "================================================"
echo ""

# Variáveis
API_URL="http://localhost:8000"
EMAIL="app@holdwallet.com"
PASSWORD="Abc123@@"

# Step 1: Login
echo "📝 Step 1: Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login bem-sucedido"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Buscar carteiras
echo "📝 Step 2: Buscando carteiras do usuário..."
WALLETS_RESPONSE=$(curl -s -X GET "$API_URL/wallets/" \
  -H "Authorization: Bearer $TOKEN")

WALLET_ID=$(echo $WALLETS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$WALLET_ID" ]; then
  echo "❌ Nenhuma carteira encontrada"
  echo "Response: $WALLETS_RESPONSE"
  exit 1
fi

echo "✅ Carteira encontrada: $WALLET_ID"
echo ""

# Step 3: Buscar saldos COM include_tokens=true
echo "📝 Step 3: Buscando saldos com include_tokens=true..."
BALANCES_WITH_TOKENS=$(curl -s -X GET "$API_URL/wallets/$WALLET_ID/balances?include_tokens=true" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $BALANCES_WITH_TOKENS" | jq '.'
echo ""

# Step 4: Buscar saldos SEM include_tokens (para comparação)
echo "📝 Step 4: Buscando saldos SEM include_tokens (para comparação)..."
BALANCES_WITHOUT_TOKENS=$(curl -s -X GET "$API_URL/wallets/$WALLET_ID/balances" \
  -H "Authorization: Bearer $TOKEN")

echo "Response (sem tokens): $BALANCES_WITHOUT_TOKENS" | jq '.balances | keys'
echo ""

# Step 5: Análise
echo "================================================"
echo "📊 ANÁLISE DOS RESULTADOS"
echo "================================================"
echo ""

# Contar chaves de balances
KEYS_WITH=$(echo $BALANCES_WITH_TOKENS | jq '.balances | keys' | grep -c '.')
KEYS_WITHOUT=$(echo $BALANCES_WITHOUT_TOKENS | jq '.balances | keys' | grep -c '.')

echo "Chaves de balance SEM tokens: $KEYS_WITHOUT"
echo "Chaves de balance COM tokens: $KEYS_WITH"
echo ""

# Procurar por USDT ou USDC
USDT_FOUND=$(echo $BALANCES_WITH_TOKENS | grep -i "usdt" | wc -l)
USDC_FOUND=$(echo $BALANCES_WITH_TOKENS | grep -i "usdc" | wc -l)

if [ $USDT_FOUND -gt 0 ]; then
  echo "✅ USDT encontrado na resposta"
  echo "   Detalhes:"
  echo $BALANCES_WITH_TOKENS | jq '.balances | to_entries[] | select(.key | contains("usdt"))' | jq '.'
else
  echo "❌ USDT NÃO encontrado"
fi

echo ""

if [ $USDC_FOUND -gt 0 ]; then
  echo "✅ USDC encontrado na resposta"
  echo "   Detalhes:"
  echo $BALANCES_WITH_TOKENS | jq '.balances | to_entries[] | select(.key | contains("usdc"))' | jq '.'
else
  echo "❌ USDC NÃO encontrado"
fi

echo ""
echo "================================================"
echo "✅ Teste completo!"
echo "================================================"
