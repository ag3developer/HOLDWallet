#!/bin/bash

# Script para gerar e validar variáveis de ambiente para Digital Ocean
# Uso: bash generate_env.sh

echo "🔧 Gerador de Variáveis de Ambiente para Digital Ocean"
echo "======================================================"
echo ""

# 1. Gerar novo SECRET_KEY
echo "1️⃣  Gerando novo SECRET_KEY..."
NEW_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "✅ SECRET_KEY gerada:"
echo "   $NEW_SECRET_KEY"
echo ""

# 2. Validar DATABASE_URL
echo "2️⃣  Validando DATABASE_URL..."
read -p "Informe a senha do PostgreSQL: " DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Senha não fornecida!"
    exit 1
fi

DATABASE_URL="postgresql://doadmin:${DB_PASSWORD}@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb"
echo "✅ DATABASE_URL preparada"
echo ""

# 3. Criar arquivo temporário com todas as variáveis
echo "3️⃣  Criando arquivo de variáveis..."

cat > /tmp/do_env_vars.txt << EOF
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=${DATABASE_URL}
SECRET_KEY=${NEW_SECRET_KEY}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=
TRANSFBANK_WEBHOOK_SECRET=
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
ROOT_PATH=v1
COINGECKO_API_KEY=
POLYGONSCAN_API_KEY=
ETHERSCAN_API_KEY=
BSCSCAN_API_KEY=
BTC_API_URL=https://blockstream.info/api
EOF

echo "✅ Arquivo criado: /tmp/do_env_vars.txt"
echo ""

# 4. Mostrar preview
echo "4️⃣  Preview das variáveis:"
echo "---"
cat /tmp/do_env_vars.txt
echo "---"
echo ""

# 5. Instruções finais
echo "5️⃣  Próximos passos:"
echo ""
echo "   📋 OPÇÃO 1: Copiar arquivo completo"
echo "      cat /tmp/do_env_vars.txt"
echo ""
echo "   📋 OPÇÃO 2: Copiar SECRET_KEY"
echo "      echo \"SECRET_KEY=${NEW_SECRET_KEY}\""
echo ""
echo "   📋 OPÇÃO 3: Copiar DATABASE_URL"
echo "      echo \"DATABASE_URL=${DATABASE_URL}\""
echo ""
echo "   🌐 Acesse: https://cloud.digitalocean.com"
echo "      1. Apps → Sua App → Settings → Environment Variables"
echo "      2. Clique em Edit"
echo "      3. Cole cada linha do arquivo acima"
echo "      4. Clique em Save"
echo "      5. Clique em Redeploy Application"
echo ""
echo "✅ Concluído!"
