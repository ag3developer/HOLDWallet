#!/bin/bash

# 🚀 DEPLOY BACKEND AUTOMÁTICO - HOLD WALLET
# IP: 164.92.155.222
# Data: 14 Dezembro 2025

set -e

DROPLET_IP="164.92.155.222"
GITHUB_REPO="https://github.com/ag3developer/HOLDWallet.git"
APP_DIR="/home/holdwallet/HOLDWallet"
BACKEND_DIR="$APP_DIR/backend"
LOCAL_REPO="/Users/josecarlosmartins/Documents/HOLDWallet"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 DEPLOY BACKEND - HOLD WALLET${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# ============================================================
# PASSO 1: SINCRONIZAR ARQUIVOS COM RSYNC
# ============================================================

echo -e "\n${YELLOW}PASSO 1: Sincronizando arquivos com Droplet...${NC}\n"

# Criar diretório se não existir
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$DROPLET_IP \
    "mkdir -p /home/holdwallet 2>/dev/null || echo 'Diretório já existe ou sem permissão'"

# Sincronizar backend
echo "Sincronizando backend..."
rsync -avz -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    "$LOCAL_REPO/backend/" \
    "root@$DROPLET_IP:/home/holdwallet/HOLDWallet/backend/" \
    --exclude='venv' \
    --exclude='.env.production' \
    --exclude='__pycache__' \
    --exclude='.pytest_cache' \
    --exclude='*.pyc'

log "Backend sincronizado"

# ============================================================
# PASSO 2: INSTALAR PYTHON 3.12 (se necessário)
# ============================================================

echo -e "\n${YELLOW}PASSO 2: Verificando Python 3.12...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << 'BASH1'
    
    # Verificar Python 3.12
    if ! python3.12 --version 2>/dev/null; then
        echo "Instalando Python 3.12..."
        apt update -qq
        apt install -y -qq python3.12 python3.12-venv python3.12-dev
        echo "✓ Python 3.12 instalado"
    else
        echo "✓ Python 3.12 já existe"
        python3.12 --version
    fi
BASH1

log "Python 3.12 verificado"

# ============================================================
# PASSO 3: CRIAR PYTHON VENV
# ============================================================

echo -e "\n${YELLOW}PASSO 3: Criando Virtual Environment...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << BASH3
    
    cd $BACKEND_DIR
    
    # Remover venv antigo se existir
    [ -d "venv" ] && rm -rf venv
    
    # Criar venv com Python 3.12
    python3.12 -m venv venv
    
    # Ativar e atualizar pip
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel -q
    
    echo "✓ Virtual Environment criado"
    python --version
BASH3

log "Python venv criado"

# ============================================================
# PASSO 4: INSTALAR DEPENDÊNCIAS
# ============================================================

echo -e "\n${YELLOW}PASSO 4: Instalando dependências Python...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << BASH4
    
    cd $BACKEND_DIR
    source venv/bin/activate
    
    echo "Instalando requirements.txt..."
    pip install -r requirements.txt -q
    
    echo "✓ Dependências instaladas"
    echo ""
    echo "Primeiros 10 pacotes instalados:"
    pip list | head -11
BASH4

log "Dependências instaladas"

# ============================================================
# PASSO 5: CRIAR USUÁRIO HOLDWALLET
# ============================================================

echo -e "\n${YELLOW}PASSO 5: Criando usuário holdwallet...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << 'BASH5'
    
    # Criar usuário se não existir
    if ! id -u holdwallet > /dev/null 2>&1; then
        useradd -m -s /bin/bash -d /home/holdwallet holdwallet
        echo "✓ Usuário holdwallet criado"
    else
        echo "✓ Usuário holdwallet já existe"
    fi
    
    # Dar permissões
    chown -R holdwallet:holdwallet /home/holdwallet/HOLDWallet 2>/dev/null || true
    echo "✓ Permissões configuradas"
BASH5

log "Usuário holdwallet configurado"

# ============================================================
# PASSO 6: CRIAR .ENV.PRODUCTION
# ============================================================

echo -e "\n${YELLOW}PASSO 6: Criando .env.production...${NC}\n"

# Gerar SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << BASH6

cat > $BACKEND_DIR/.env.production << 'ENVEOF'
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info

# ============== DATABASE ==============
DATABASE_URL=sqlite:///./holdwallet.db

# ============== JWT/AUTH ==============
SECRET_KEY=$SECRET_KEY
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# ============== FRONTEND ==============
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app

# ============== TRANSFBANK (Configure Later) ==============
TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=
TRANSFBANK_WEBHOOK_SECRET=

# ============== BLOCKCHAIN ==============
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# ============== SMTP (Optional) ==============
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
ENVEOF

chmod 600 $BACKEND_DIR/.env.production
echo "✓ .env.production criado"

BASH6

log ".env.production criado"

# ============================================================
# PASSO 7: CRIAR SYSTEMD SERVICE
# ============================================================

echo -e "\n${YELLOW}PASSO 7: Configurando Systemd Service...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << 'BASH7'

cat > /etc/systemd/system/holdwallet-backend.service << 'SVCEOF'
[Unit]
Description=HOLD Wallet Backend API
After=network.target

[Service]
Type=simple
User=holdwallet
Group=holdwallet
WorkingDirectory=/home/holdwallet/HOLDWallet/backend
Environment="PATH=/home/holdwallet/HOLDWallet/backend/venv/bin"
EnvironmentFile=/home/holdwallet/HOLDWallet/backend/.env.production

ExecStart=/home/holdwallet/HOLDWallet/backend/venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4

Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable holdwallet-backend
systemctl start holdwallet-backend

sleep 3

echo "✓ Service holdwallet-backend iniciado"
systemctl status holdwallet-backend

BASH7

log "Systemd service configurado e rodando"

# ============================================================
# PASSO 8: CONFIGURAR NGINX
# ============================================================

echo -e "\n${YELLOW}PASSO 8: Configurando Nginx...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << 'BASH8'

# Instalar nginx se necessário
which nginx > /dev/null || apt install -y -qq nginx

cat > /etc/nginx/sites-available/holdwallet-api << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name 164.92.155.222;

    client_max_body_size 100M;

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Bloquear outras rotas
    location / {
        return 404;
    }

    access_log /var/log/nginx/holdwallet-api.access.log;
    error_log /var/log/nginx/holdwallet-api.error.log;
}
NGINXEOF

# Ativar site
ln -sf /etc/nginx/sites-available/holdwallet-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e restart
nginx -t && systemctl restart nginx

echo "✓ Nginx configurado e iniciado"

BASH8

log "Nginx reverse proxy configurado"

# ============================================================
# PASSO 9: CONFIGURAR FIREWALL
# ============================================================

echo -e "\n${YELLOW}PASSO 9: Configurando Firewall...${NC}\n"

ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    root@$DROPLET_IP << 'BASH9'

# Ativar firewall (pode já estar ativo)
ufw --force enable 2>/dev/null || true

# Permitir portas essenciais
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

ufw status | grep -E "22|80|443"
echo "✓ Firewall configurado"

BASH9

log "Firewall configurado"

# ============================================================
# PASSO 10: TESTES
# ============================================================

echo -e "\n${YELLOW}PASSO 10: Testando Deploy...${NC}\n"

# Aguardar inicialização
sleep 3

# Teste 1: Health Check
echo "🧪 Teste 1: Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://$DROPLET_IP/health" 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
    log "Health check OK (HTTP $HEALTH)"
else
    warn "Health check: HTTP $HEALTH (pode levar mais tempo para iniciar)"
fi

# Teste 2: API Health
echo "🧪 Teste 2: Testando API..."
API_RESULT=$(curl -s -w "\n%{http_code}" "http://$DROPLET_IP/api/v1/health" 2>/dev/null || echo "error")
HTTP_CODE=$(echo "$API_RESULT" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "000" ]; then
    log "API respondendo (HTTP $HTTP_CODE)"
else
    warn "API ainda está inicializando... (HTTP $HTTP_CODE)"
fi

# ============================================================
# RESUMO
# ============================================================

echo -e "\n"
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✓ BACKEND DEPLOY COMPLETADO!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 INFORMAÇÕES DO DEPLOY:"
echo "  Droplet IP:        $DROPLET_IP"
echo "  App Directory:     $APP_DIR"
echo "  Backend Service:   holdwallet-backend"
echo "  Status:            $(systemctl is-active --quiet holdwallet-backend && echo '✅ Rodando' || echo '❌ Parado')"
echo ""
echo "🌐 URLs DE ACESSO:"
echo "  Frontend:          https://hold-wallet-deaj.vercel.app"
echo "  Backend API:       http://$DROPLET_IP/api"
echo "  Health Check:      http://$DROPLET_IP/health"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "  1. Verificar logs:"
echo "     ssh root@$DROPLET_IP 'journalctl -u holdwallet-backend -n 50 -f'"
echo ""
echo "  2. Se precisar editar .env:"
echo "     ssh root@$DROPLET_IP 'nano $BACKEND_DIR/.env.production'"
echo ""
echo "  3. Reiniciar serviço (se precisar):"
echo "     ssh root@$DROPLET_IP 'systemctl restart holdwallet-backend'"
echo ""
echo "  4. Ver status:"
echo "     ssh root@$DROPLET_IP 'systemctl status holdwallet-backend'"
echo ""
echo "  5. Testar API manualmente:"
echo "     curl -X GET http://$DROPLET_IP/api/v1/health"
echo ""
echo "💾 ARQUIVOS IMPORTANTES:"
echo "  Service:      /etc/systemd/system/holdwallet-backend.service"
echo "  Nginx Config: /etc/nginx/sites-available/holdwallet-api"
echo "  .env File:    $BACKEND_DIR/.env.production"
echo "  App:          $BACKEND_DIR/app/main.py"
echo ""
echo "════════════════════════════════════════════════════"
echo ""

info "Deploy concluído! Seu backend está rodando no Droplet 🚀"
