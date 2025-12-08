#!/bin/bash

# ============================================
# 🚀 START BACKEND - INTELLIGENT SCRIPT
# ============================================

BACKEND_DIR="/Users/josecarlosmartins/Documents/HOLDWallet/backend"
PORT=8000
DB_FILE="$BACKEND_DIR/holdwallet.db"

echo "=================================================="
echo "🚀 INICIANDO BACKEND HOLDWALLET"
echo "=================================================="

# 1. Verificar se diretório existe
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Diretório não encontrado: $BACKEND_DIR"
    exit 1
fi

# 2. Limpar porta 8000 (matar qualquer processo)
echo "🧹 Limpando porta $PORT..."
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# 3. Verificar se banco de dados existe
if [ ! -f "$DB_FILE" ]; then
    echo "⚠️ Banco de dados não encontrado: $DB_FILE"
    echo "   (será criado quando o backend iniciar)"
fi

# 4. Navegue para o diretório
cd "$BACKEND_DIR" || exit 1

# 5. Verificar se requirements estão instalados
echo "📦 Verificando dependências..."
python3 -c "import uvicorn; import fastapi; import sqlalchemy" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Dependências faltando. Instalando..."
    pip install -r requirements.txt > /dev/null 2>&1
fi

# 6. Iniciar backend
echo ""
echo "✅ Banco de dados: $DB_FILE"
echo "✅ Porta: $PORT"
echo "✅ Modo: DESENVOLVIMENTO (reload ativado)"
echo ""
echo "=================================================="
echo "Iniciando servidor em 3 segundos..."
sleep 2

# Opção 1: Usando python -m uvicorn (mais confiável)
python3 -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload

# Alternativa (Opção 2): Usando run.py
# python3 run.py

# Alternativa (Opção 3): Usando PYTHONPATH
# PYTHONPATH=$BACKEND_DIR uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload
