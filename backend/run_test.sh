#!/bin/bash

# Script para executar o teste completo do backend
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

echo "🧪 Iniciando teste completo do backend..."
echo ""

# Ativar virtual env se existir
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Executar teste
python TESTE_COMPLETO_BACKEND.py

echo ""
echo "✅ Teste concluído!"
