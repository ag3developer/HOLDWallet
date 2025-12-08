#!/bin/bash

# Script para testar o registro de usuário

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🧪 TESTE DE REGISTRO DE USUÁRIO NO BACKEND             ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Gerar email único com timestamp
TIMESTAMP=$(date +%s)
EMAIL="teste_${TIMESTAMP}@holdwallet.com"
USERNAME="user_${TIMESTAMP}"
PASSWORD="TesteSenha@123"

echo ""
echo "📝 Dados de teste:"
echo "  Email: $EMAIL"
echo "  Username: $USERNAME"
echo "  Password: $PASSWORD"
echo ""

# Fazer a requisição
echo "📤 Enviando POST para http://localhost:8000/auth/register"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL\",
    \"username\":\"$USERNAME\",
    \"password\":\"$PASSWORD\"
  }")

echo "📥 Resposta:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Verificar se foi salvo no banco
echo "🔍 Verificando se foi salvo no banco de dados..."
echo ""

cd /Users/josecarlosmartins/Documents/HOLDWallet

RESULT=$(sqlite3 backend/holdwallet.db "SELECT id, email, username FROM users WHERE email='$EMAIL' LIMIT 1;")

if [ -z "$RESULT" ]; then
    echo "❌ ERRO: Usuário NÃO foi salvo no banco de dados"
    echo ""
    echo "Verificando todas os usuários no banco:"
    sqlite3 -header backend/holdwallet.db "SELECT id, email, username, created_at FROM users LIMIT 5;"
else
    echo "✅ SUCESSO: Usuário foi salvo no banco de dados!"
    echo ""
    echo "Dados do usuário:"
    sqlite3 -header backend/holdwallet.db "SELECT id, email, username, created_at, is_active FROM users WHERE email='$EMAIL';"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
