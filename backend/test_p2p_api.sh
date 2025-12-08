#!/bin/bash

# 🧪 P2P Trading API Test Script
# ==============================
#
# Este script testa todo o fluxo P2P via API
# Precisa que o backend esteja rodando em http://localhost:8000

BASE_URL="http://localhost:8000"

echo "================================"
echo "🧪 P2P TRADING API TEST"
echo "================================"
echo ""

# ============================================
# STEP 1: Deposit for User 1 (Seller)
# ============================================
echo "STEP 1️⃣: Depositing 100 USDT for User 1..."
curl -X POST "$BASE_URL/p2p/wallet/deposit?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "cryptocurrency": "USDT",
    "amount": 100,
    "transaction_hash": "0x1111111111",
    "reason": "Test deposit - Seller"
  }' | jq '.'

echo ""
echo "✅ User 1 deposited 100 USDT"
echo ""

# ============================================
# STEP 2: Deposit for User 2 (Buyer)
# ============================================
echo "STEP 2️⃣: Depositing 1000 BRL for User 2..."
curl -X POST "$BASE_URL/p2p/wallet/deposit?user_id=2" \
  -H "Content-Type: application/json" \
  -d '{
    "cryptocurrency": "BRL",
    "amount": 1000,
    "transaction_hash": "0x2222222222",
    "reason": "Test deposit - Buyer"
  }' | jq '.'

echo ""
echo "✅ User 2 deposited 1000 BRL"
echo ""

# ============================================
# STEP 3: Create SELL order
# ============================================
echo "STEP 3️⃣: Creating SELL order..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/p2p/orders?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sell",
    "coin": "USDT",
    "fiat_currency": "BRL",
    "price": 5.0,
    "amount": 100.0,
    "min_amount": 50.0,
    "max_amount": 500.0,
    "payment_methods": [1],
    "time_limit": 30,
    "terms": "Fast payment required",
    "auto_reply": "Thanks for your interest"
  }')

echo "$ORDER_RESPONSE" | jq '.'
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.id')
echo ""
echo "✅ Order created with ID: $ORDER_ID"
echo ""

# ============================================
# STEP 4: Start trade
# ============================================
echo "STEP 4️⃣: Starting trade (User 2 buys 100 USDT)..."
TRADE_RESPONSE=$(curl -s -X POST "$BASE_URL/p2p/trades?buyer_id=2" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": $ORDER_ID,
    \"amount\": 100.0,
    \"payment_method_id\": 1
  }")

echo "$TRADE_RESPONSE" | jq '.'
TRADE_ID=$(echo "$TRADE_RESPONSE" | jq -r '.data.id')
echo ""
echo "✅ Trade started with ID: $TRADE_ID"
echo ""

# ============================================
# STEP 5: Check balances before completion
# ============================================
echo "STEP 5️⃣: Checking balances BEFORE trade completion..."
echo ""
echo "User 1 USDT balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=1&cryptocurrency=USDT" | jq '.data'

echo ""
echo "User 1 BRL balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=1&cryptocurrency=BRL" | jq '.data'

echo ""
echo "User 2 USDT balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=2&cryptocurrency=USDT" | jq '.data'

echo ""
echo "User 2 BRL balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=2&cryptocurrency=BRL" | jq '.data'

echo ""
echo "================================"
echo ""

# ============================================
# STEP 6: Complete trade
# ============================================
echo "STEP 6️⃣: Completing trade..."
curl -s -X POST "$BASE_URL/p2p/trades/$TRADE_ID/complete" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

echo ""
echo "✅ Trade completed"
echo ""

# ============================================
# STEP 7: Check final balances
# ============================================
echo "STEP 7️⃣: Checking FINAL balances AFTER trade completion..."
echo ""
echo "User 1 USDT balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=1&cryptocurrency=USDT" | jq '.data'

echo ""
echo "User 1 BRL balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=1&cryptocurrency=BRL" | jq '.data'

echo ""
echo "User 2 USDT balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=2&cryptocurrency=USDT" | jq '.data'

echo ""
echo "User 2 BRL balance:"
curl -s "$BASE_URL/p2p/wallet/balance?user_id=2&cryptocurrency=BRL" | jq '.data'

echo ""
echo "================================"
echo ""
echo "✅ Test complete!"
echo ""
echo "Expected final balances:"
echo "  User 1: 0 USDT + 500 BRL"
echo "  User 2: 100 USDT + 500 BRL"
echo ""
