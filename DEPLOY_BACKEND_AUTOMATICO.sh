#!/bin/bash

# 🚀 DEPLOY AUTOMÁTICO - BACKEND NO DROPLET
# IP: 164.92.155.222
# Data: 14 Dezembro 2025

set -e

DROPLET_IP="164.92.155.222"
GITHUB_REPO="https://github.com/ag3developer/HOLDWallet.git"
APP_DIR="/home/holdwallet/HOLDWallet"
BACKEND_DIR="$APP_DIR/backend"

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
echo -e "${BLUE}   🚀 DEPLOY AUTOMÁTICO - BACKEND HOLD WALLET${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# ============================================================
# PASSO 1: CONECTAR E VERIFICAR SISTEMA
# ============================================================

echo -e "\n${YELLOW}PASSO 1: Verificando conexão com Droplet...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH1'
    echo "✓ Conectado ao Droplet"
    
    # Verificar Python 3.12
    python3.12 --version || {
        echo "⚠ Python 3.12 não encontrado, instalando..."
        apt update
        apt install -y python3.12 python3.12-venv python3.12-dev
    }
    
    # Verificar Git
    git --version
    
    echo "✓ Sistema verificado"
BASH1

log "Droplet verificado"

# ============================================================
# PASSO 2: CLONE/UPDATE REPOSITÓRIO
# ============================================================

echo -e "\n${YELLOW}PASSO 2: Clonando/Atualizando repositório...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << BASH2
    cd /home/holdwallet
    
    # Se existe, fazer pull
    if [ -d "HOLDWallet" ]; then
        echo "Atualizando repositório existente..."
        cd HOLDWallet
        git pull origin main
    else
        echo "Clonando repositório..."
        git clone $GITHUB_REPO
        cd HOLDWallet
    fi
    
    echo "✓ Repositório atualizado"
    git log -1 --oneline
BASH2

log "Repositório sincronizado"

# ============================================================
# PASSO 3: CRIAR PYTHON VENV
# ============================================================

echo -e "\n${YELLOW}PASSO 3: Criando Python Virtual Environment...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << BASH3
    cd $BACKEND_DIR
    
    # Se venv existe, remover
    [ -d "venv" ] && rm -rf venv
    
    # Criar novo venv com Python 3.12
    python3.12 -m venv venv
    
    # Ativar e atualizar pip
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel
    
    echo "✓ Virtual Environment criado"
    python --version
BASH3

log "Python venv criado"

# ============================================================
# PASSO 4: INSTALAR DEPENDÊNCIAS
# ============================================================

echo -e "\n${YELLOW}PASSO 4: Instalando dependências Python...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << BASH4
    cd $BACKEND_DIR
    source venv/bin/activate
    
    # Instalar requirements
    pip install -r requirements.txt
    
    echo "✓ Dependências instaladas"
    pip list | head -20
BASH4

log "Dependências instaladas"

# ============================================================
# PASSO 5: CRIAR .ENV.PRODUCTION
# ============================================================

echo -e "\n${YELLOW}PASSO 5: Criando .env.production...${NC}\n"

# Gerar SECRET_KEY seguro
SECRET_KEY=$(openssl rand -hex 32)

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << BASH5
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
JWT_REFRESH_EXPIRATION_DAYS=7

# ============== FRONTEND ==============
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,http://localhost:3000,http://localhost:5173
FRONTEND_URL=https://hold-wallet-deaj.vercel.app
CORS_CREDENTIALS=true

# ============== TRANSFBANK (Configure Later) ==============
TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-transfbank
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret

# ============== BLOCKCHAIN ==============
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BITCOIN_NETWORK=mainnet

# ============== SMTP (Optional - Email) ==============
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
SMTP_FROM_EMAIL=noreply@holdwallet.com

# ============== REDIS (Optional - Caching) ==============
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# ============== MONITORING ==============
SENTRY_ENABLED=false
SENTRY_DSN=
ENVEOF

    chmod 600 $BACKEND_DIR/.env.production
    echo "✓ Arquivo .env.production criado"
    echo "  Localização: $BACKEND_DIR/.env.production"
BASH5

log ".env.production criado"

# ============================================================
# PASSO 6: CRIAR USUÁRIO HOLDWALLET (se não existir)
# ============================================================

echo -e "\n${YELLOW}PASSO 6: Criando usuário holdwallet...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH6'
    # Verificar se usuário existe
    if id -u holdwallet > /dev/null 2>&1; then
        echo "✓ Usuário holdwallet já existe"
    else
        echo "Criando usuário holdwallet..."
        useradd -m -s /bin/bash -d /home/holdwallet holdwallet
        echo "✓ Usuário holdwallet criado"
    fi
    
    # Dar permissão ao aplicativo
    chown -R holdwallet:holdwallet /home/holdwallet/HOLDWallet
    echo "✓ Permissões configuradas"
BASH6

log "Usuário holdwallet configurado"

# ============================================================
# PASSO 7: CRIAR SYSTEMD SERVICE
# ============================================================

echo -e "\n${YELLOW}PASSO 7: Configurando Systemd Service...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH7'
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
    --host 127.0.0.1 \
    --port 8000 \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker

Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=holdwallet-backend

[Install]
WantedBy=multi-user.target
SVCEOF

    # Recarregar daemon
    systemctl daemon-reload
    
    # Ativar e iniciar
    systemctl enable holdwallet-backend
    systemctl start holdwallet-backend
    
    # Aguardar inicialização
    sleep 3
    
    # Verificar status
    systemctl status holdwallet-backend
    
    echo "✓ Service holdwallet-backend configurado"
BASH7

log "Systemd service configurado"

# ============================================================
# PASSO 8: CONFIGURAR NGINX (Reverse Proxy)
# ============================================================

echo -e "\n${YELLOW}PASSO 8: Configurando Nginx...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH8'
    # Instalar nginx se não existir
    which nginx > /dev/null || {
        apt update
        apt install -y nginx
    }
    
    # Criar config para backend
    cat > /etc/nginx/sites-available/holdwallet-backend << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 100M;

    # Health check endpoint (sem proxy)
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Bloquear acesso direto fora de /api
    location / {
        return 404;
    }

    # Logs
    access_log /var/log/nginx/holdwallet-backend.access.log;
    error_log /var/log/nginx/holdwallet-backend.error.log;
}
NGINXEOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/holdwallet-backend /etc/nginx/sites-enabled/
    
    # Remover default
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar config
    nginx -t
    
    # Restart nginx
    systemctl restart nginx
    
    echo "✓ Nginx configurado"
BASH8

log "Nginx reverse proxy configurado"

# ============================================================
# PASSO 9: CONFIGURAR FIREWALL
# ============================================================

echo -e "\n${YELLOW}PASSO 9: Configurando Firewall...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH9'
    # Ativar firewall
    ufw --force enable 2>/dev/null || true
    
    # Permitir portas essenciais
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    
    # Negar tudo mais
    ufw default deny incoming
    ufw default allow outgoing
    
    ufw status
    echo "✓ Firewall configurado"
BASH9

log "Firewall configurado"

# ============================================================
# PASSO 10: TESTES
# ============================================================

echo -e "\n${YELLOW}PASSO 10: Testando Deploy...${NC}\n"

# Teste 1: Health Check
echo "🧪 Teste 1: Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://$DROPLET_IP/health")
if [ "$HEALTH" = "200" ]; then
    log "Health check OK (HTTP $HEALTH)"
else
    warn "Health check retornou HTTP $HEALTH (esperado 200)"
fi

# Teste 2: API Health
echo "🧪 Teste 2: API Health Endpoint..."
API_HEALTH=$(curl -s "http://$DROPLET_IP/api/v1/health" 2>/dev/null || echo "error")
if echo "$API_HEALTH" | grep -q "status"; then
    log "API respondendo: $API_HEALTH"
else
    warn "API endpoint pode estar indisponível"
fi

# Teste 3: Verificar processo
echo "🧪 Teste 3: Verificar processo Uvicorn..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BASH10'
    ps aux | grep uvicorn | grep -v grep && echo "✓ Uvicorn rodando"
BASH10

# ============================================================
# RESUMO E PRÓXIMOS PASSOS
# ============================================================

echo -e "\n"
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✓ BACKEND DEPLOY COMPLETADO!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 INFORMAÇÕES DO DEPLOY:"
echo "  Droplet:           $DROPLET_IP"
echo "  App Directory:     $APP_DIR"
echo "  Backend:           $BACKEND_DIR"
echo "  Service:           holdwallet-backend"
echo "  Usuário:           holdwallet"
echo "  API Endpoint:      http://$DROPLET_IP/api"
echo ""
echo "🔗 PRÓXIMOS PASSOS:"
echo ""
echo "  1. Configurar Variáveis de Ambiente:"
echo "     ssh root@$DROPLET_IP"
echo "     nano $BACKEND_DIR/.env.production"
echo ""
echo "  2. Testar API:"
echo "     curl http://$DROPLET_IP/api/v1/health | jq"
echo ""
echo "  3. Ver Logs em Tempo Real:"
echo "     ssh root@$DROPLET_IP 'journalctl -u holdwallet-backend -f'"
echo ""
echo "  4. Reiniciar Serviço:"
echo "     ssh root@$DROPLET_IP 'systemctl restart holdwallet-backend'"
echo ""
echo "  5. Parar Serviço:"
echo "     ssh root@$DROPLET_IP 'systemctl stop holdwallet-backend'"
echo ""
echo "📋 CHECKLIST DE CONFIGURAÇÃO:"
echo "  [ ] .env.production configurado"
echo "  [ ] TRANSFBANK_API_KEY adicionado (se usar)"
echo "  [ ] ALLOWED_ORIGINS verificado"
echo "  [ ] Database inicializado"
echo "  [ ] Frontend testado conectando ao Backend"
echo ""
echo "💾 ARQUIVOS IMPORTANTES:"
echo "  - Service:     /etc/systemd/system/holdwallet-backend.service"
echo "  - Config:      /etc/nginx/sites-available/holdwallet-backend"
echo "  - .env:        $BACKEND_DIR/.env.production"
echo "  - App:         $BACKEND_DIR/app/main.py"
echo ""
echo "════════════════════════════════════════════════════"
echo ""
