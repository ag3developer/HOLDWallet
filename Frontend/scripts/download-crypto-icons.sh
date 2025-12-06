#!/bin/bash

# Script para baixar ícones de criptomoedas do GitHub
# Fonte: https://github.com/spothq/cryptocurrency-icons

echo "📦 Baixando ícones de criptomoedas..."

# Criar diretório para ícones
mkdir -p ../src/assets/crypto-icons

# URL base do repositório
BASE_URL="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color"

# Lista de criptomoedas para baixar
CRYPTOS=(
  "btc"    # Bitcoin
  "eth"    # Ethereum
  "usdt"   # Tether
  "usdc"   # USD Coin
  "bnb"    # Binance Coin
  "matic"  # Polygon
  "trx"    # Tron
  "sol"    # Solana
  "ltc"    # Litecoin
  "doge"   # Dogecoin
  "ada"    # Cardano
  "avax"   # Avalanche
  "dot"    # Polkadot
  "link"   # Chainlink
  "shib"   # Shiba Inu
  "xrp"    # Ripple
  "dai"    # Dai
  "busd"   # Binance USD
)

# Baixar cada ícone
for crypto in "${CRYPTOS[@]}"; do
  echo "⬇️  Baixando $crypto.svg..."
  curl -s "$BASE_URL/$crypto.svg" -o "../src/assets/crypto-icons/$crypto.svg"
  
  if [ $? -eq 0 ]; then
    echo "✅ $crypto.svg baixado com sucesso"
  else
    echo "❌ Erro ao baixar $crypto.svg"
  fi
done

echo ""
echo "🎉 Download concluído!"
echo "📁 Ícones salvos em: src/assets/crypto-icons/"
