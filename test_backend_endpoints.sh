#!/bin/bash

echo "🚀 Testing HOLD Wallet Price Aggregator System"
echo "=============================================="

# Wait for backend to start
echo "⏳ Waiting for backend to be ready..."
sleep 2

# Test 1: Health check
echo ""
echo "📊 TEST 1: Backend Health Check"
curl -s http://localhost:8000/health || echo "❌ Backend not responding"

# Test 2: Get batch prices
echo ""
echo ""
echo "📊 TEST 2: Get Batch Prices (BRL)"
curl -s "http://localhost:8000/api/v1/prices/batch?symbols=BTC,ETH,USDT,SOL&fiat=brl" | python3 -m json.tool || echo "❌ Failed"

# Test 3: Get single price
echo ""
echo ""
echo "📊 TEST 3: Get Single Price (USD)"
curl -s "http://localhost:8000/api/v1/prices/price/BTC?fiat=usd" | python3 -m json.tool || echo "❌ Failed"

# Test 4: Get supported symbols
echo ""
echo ""
echo "📊 TEST 4: Get Supported Symbols"
curl -s "http://localhost:8000/api/v1/prices/supported" | python3 -m json.tool || echo "❌ Failed"

echo ""
echo "=============================================="
echo "✅ Tests completed!"
