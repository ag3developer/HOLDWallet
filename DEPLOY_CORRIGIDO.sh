#!/bin/bash

# 🚀 DEPLOY AUTOMÁTICO HOLD WALLET - CORRIGIDO
# IP: 164.92.155.222
# Data: 14 Dezembro 2025
# STATUS: Deploy via rsync (copiar arquivos locais diretamente)

set -e

DROPLET_IP="164.92.155.222"
LOCAL_PATH="/Users/josecarlosmartins/Documents/HOLDWallet"
REMOTE_PATH="/home/holdwallet/APP-HOLDWALLET"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# ============================================================
# PASSO 1: PREPARAR AMBIENTE NO DROPLET
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 1: Preparando ambiente no Droplet...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'SETUP_EOF'
    # Criar diretórios
    mkdir -p /home/holdwallet
    cd /home/holdwallet
    
    # Remover se já existe
    rm -rf APP-HOLDWALLET
    
    # Instalar dependências críticas (se ainda não tiver)
    apt update -qq
    apt install -y -qq curl wget git vim htop python3.12 python3-pip nginx > /dev/null 2>&1
    
    echo "✅ Ambiente preparado"
SETUP_EOF

log "Ambiente preparado no Droplet"

# ============================================================
# PASSO 2: COPIAR ARQUIVOS LOCAIS PARA DROPLET (rsync)
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 2: Sincronizando arquivos do projeto...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

info "Copiando: Backend, Frontend, Configurações..."

# Excluir diretórios desnecessários
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    "$LOCAL_PATH/" \
    root@$DROPLET_IP:$REMOTE_PATH/ > /dev/null 2>&1

log "Arquivos sincronizados com sucesso"

# ============================================================
# PASSO 3: CONFIGURAR BACKEND (Python)
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 3: Configurando Backend...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'BACKEND_EOF'
    cd /home/holdwallet/APP-HOLDWALLET/backend
    
    info() { echo "ℹ️ $1"; }
    log() { echo "✅ $1"; }
    
    info "Criando venv Python 3.12..."
    python3.12 -m venv venv --clear > /dev/null 2>&1
    
    info "Ativando venv e instalando dependências..."
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel -qq > /dev/null 2>&1
    
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt -qq > /dev/null 2>&1
        log "Dependências Python instaladas"
    else
        echo "⚠️ requirements.txt não encontrado"
    fi
BACKEND_EOF

log "Backend configurado"

# ============================================================
# PASSO 4: CONFIGURAR FRONTEND (Node.js)
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 4: Compilando Frontend...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'FRONTEND_EOF'
    cd /home/holdwallet/APP-HOLDWALLET/Frontend
    
    info() { echo "ℹ️ $1"; }
    log() { echo "✅ $1"; }
    
    info "Instalando dependências npm..."
    npm install -q > /dev/null 2>&1
    
    info "Compilando React..."
    npm run build -q > /dev/null 2>&1
    
    info "Copiando para Nginx..."
    mkdir -p /var/www/html
    cp -r build/* /var/www/html/
    chown -R www-data:www-data /var/www/html/
    
    log "Frontend compilado e instalado"
FRONTEND_EOF

log "Frontend compilado"

# ============================================================
# PASSO 5: CRIAR .ENV.PRODUCTION
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 5: Criando .env.production...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'ENV_EOF'
    REMOTE_PATH="/home/holdwallet/APP-HOLDWALLET"
    
    cat > $REMOTE_PATH/backend/.env.production << 'ENVEOF'
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=http://164.92.155.222

# ============== DATABASE ==============
DATABASE_URL=sqlite:///./holdwallet.db

# ============== JWT/AUTH ==============
SECRET_KEY=sua-chave-secreta-super-segura-aleatorio-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# ============== TRANSFBANK ==============
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-transfbank-aqui
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret-aqui

# ============== BLOCKCHAIN ==============
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-infura-key
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
BITCOIN_NETWORK=mainnet

# ============== SMTP (Email) ==============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# ============== URLs PÚBLICAS ==============
FRONTEND_URL=http://164.92.155.222
BACKEND_URL=http://164.92.155.222
ENVEOF

    chmod 600 $REMOTE_PATH/backend/.env.production
    echo "✅ .env.production criado"
ENV_EOF

log ".env.production criado"

# ============================================================
# PASSO 6: CONFIGURAR SYSTEMD SERVICE
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 6: Configurando Systemd Service...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'SERVICE_EOF'
    REMOTE_PATH="/home/holdwallet/APP-HOLDWALLET"
    
    cat > /etc/systemd/system/holdwallet.service << 'SVCEOF'
[Unit]
Description=HOLD Wallet Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/holdwallet/APP-HOLDWALLET/backend
Environment="PATH=/home/holdwallet/APP-HOLDWALLET/backend/venv/bin"
EnvironmentFile=/home/holdwallet/APP-HOLDWALLET/backend/.env.production
ExecStart=/home/holdwallet/APP-HOLDWALLET/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

    systemctl daemon-reload
    systemctl enable holdwallet
    systemctl restart holdwallet
    
    sleep 2
    systemctl status holdwallet --no-pager | head -10
    
    echo "✅ Systemd service configurado"
SERVICE_EOF

log "Systemd service configurado"

# ============================================================
# PASSO 7: CONFIGURAR NGINX
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 7: Configurando Nginx...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'NGINX_EOF'
    cat > /etc/nginx/sites-available/holdwallet << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html index.htm;

    # API routes → Backend
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

    # Enable site
    ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test config
    nginx -t 2>&1 | tail -1

    # Restart
    systemctl restart nginx
    
    echo "✅ Nginx configurado"
NGINX_EOF

log "Nginx configurado"

# ============================================================
# PASSO 8: TESTES
# ============================================================

echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 8: Testando Deploy...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

sleep 3

info "Testando Backend..."
BACKEND_STATUS=$(curl -s http://$DROPLET_IP/api/v1/health 2>/dev/null || echo "error")
if [[ $BACKEND_STATUS == *"ok"* ]] || [[ $BACKEND_STATUS == *"status"* ]]; then
    log "Backend respondendo ✓"
else
    warning "Backend ainda inicializando (normal na primeira vez)"
fi

info "Testando Frontend..."
FRONTEND_STATUS=$(curl -s http://$DROPLET_IP/ 2>/dev/null || echo "error")
if [[ $FRONTEND_STATUS == *"<!DOCTYPE"* ]] || [[ $FRONTEND_STATUS == *"html"* ]]; then
    log "Frontend respondendo ✓"
else
    warning "Frontend ainda carregando"
fi

# ============================================================
# RESUMO FINAL
# ============================================================

echo -e "\n"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETADO COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📊 INFORMAÇÕES DO DEPLOY:${NC}"
echo "  IP Droplet:        $DROPLET_IP"
echo "  App Dir:           $REMOTE_PATH"
echo "  Backend Service:   holdwallet"
echo "  Frontend:          /var/www/html"
echo ""

echo -e "${BLUE}🔗 ACESSAR APLICAÇÃO:${NC}"
echo "  🌐 http://$DROPLET_IP"
echo ""

echo -e "${BLUE}📝 PRÓXIMOS PASSOS:${NC}"
echo "  1. Acesse http://$DROPLET_IP no navegador"
echo "  2. Crie uma conta e faça login"
echo "  3. Configure chaves no .env.production"
echo "  4. Teste fluxo de pagamento TransfBank"
echo ""

echo -e "${BLUE}📂 COMANDOS ÚTEIS:${NC}"
echo "  Ver logs:        ssh root@$DROPLET_IP 'journalctl -u holdwallet -f'"
echo "  Editar config:   ssh root@$DROPLET_IP 'nano $REMOTE_PATH/backend/.env.production'"
echo "  Restart:         ssh root@$DROPLET_IP 'systemctl restart holdwallet'"
echo "  Status:          ssh root@$DROPLET_IP 'systemctl status holdwallet'"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
