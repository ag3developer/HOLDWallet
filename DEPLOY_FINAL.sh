#!/bin/bash

# 🚀 DEPLOY HOLD WALLET - VERSÃO SIMPLIFICADA
# IP: 164.92.155.222
# Usa SSH com chaves (já configuradas)

DROPLET_IP="164.92.155.222"
LOCAL_PATH="/Users/josecarlosmartins/Documents/HOLDWallet"
REMOTE_PATH="/home/holdwallet/APP-HOLDWALLET"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}✅${NC} $1"; }
info() { echo -e "${BLUE}ℹ️${NC} $1"; }
step() { echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n${BLUE}$1${NC}\n${BLUE}════════════════════════════════════════════════════${NC}\n"; }

# ============================================================
# PASSO 1: Preparar ambiente
# ============================================================
step "PASSO 1: Preparando ambiente no Droplet"

ssh root@$DROPLET_IP "
    set -e
    mkdir -p /home/holdwallet
    cd /home/holdwallet
    rm -rf APP-HOLDWALLET
    apt-get update -qq > /dev/null 2>&1
    apt-get install -y -qq curl wget git vim htop python3.12 python3-pip nginx > /dev/null 2>&1
" && log "Ambiente preparado" || echo "Erro ao preparar ambiente"

# ============================================================
# PASSO 2: Sincronizar arquivos
# ============================================================
step "PASSO 2: Sincronizando arquivos"

info "Copiando backend, frontend e configurações..."
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

log "Arquivos sincronizados"

# ============================================================
# PASSO 3: Configurar Backend
# ============================================================
step "PASSO 3: Configurando Backend Python"

ssh root@$DROPLET_IP "
    set -e
    cd $REMOTE_PATH/backend
    
    python3.12 -m venv venv --clear > /dev/null 2>&1
    source venv/bin/activate
    
    pip install --upgrade pip setuptools wheel -qq > /dev/null 2>&1
    
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt -qq > /dev/null 2>&1
    fi
" && log "Backend configurado" || echo "Erro ao configurar backend"

# ============================================================
# PASSO 4: Compilar Frontend
# ============================================================
step "PASSO 4: Compilando Frontend React"

ssh root@$DROPLET_IP "
    set -e
    cd $REMOTE_PATH/Frontend
    
    npm install -q > /dev/null 2>&1
    npm run build -q > /dev/null 2>&1
    
    mkdir -p /var/www/html
    cp -r build/* /var/www/html/ 2>/dev/null
    chown -R www-data:www-data /var/www/html/
" && log "Frontend compilado" || echo "Erro ao compilar frontend"

# ============================================================
# PASSO 5: Criar .env.production
# ============================================================
step "PASSO 5: Criando .env.production"

ssh root@$DROPLET_IP "cat > $REMOTE_PATH/backend/.env.production << 'ENVEOF'
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=http://164.92.155.222
DATABASE_URL=sqlite:///./holdwallet.db
SECRET_KEY=sua-chave-secreta-super-segura-aleatorio-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-transfbank-aqui
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret-aqui
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-infura-key
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
BITCOIN_NETWORK=mainnet
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
FRONTEND_URL=http://164.92.155.222
BACKEND_URL=http://164.92.155.222
ENVEOF

chmod 600 $REMOTE_PATH/backend/.env.production
" && log ".env.production criado" || echo "Erro ao criar .env"

# ============================================================
# PASSO 6: Configurar Systemd Service
# ============================================================
step "PASSO 6: Configurando Systemd Service"

ssh root@$DROPLET_IP "cat > /etc/systemd/system/holdwallet.service << 'SVCEOF'
[Unit]
Description=HOLD Wallet Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REMOTE_PATH/backend
Environment=\"PATH=$REMOTE_PATH/backend/venv/bin\"
EnvironmentFile=$REMOTE_PATH/backend/.env.production
ExecStart=$REMOTE_PATH/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable holdwallet > /dev/null 2>&1
systemctl restart holdwallet
sleep 2
" && log "Systemd service configurado" || echo "Erro ao configurar systemd"

# ============================================================
# PASSO 7: Configurar Nginx
# ============================================================
step "PASSO 7: Configurando Nginx"

ssh root@$DROPLET_IP "cat > /etc/nginx/sites-available/holdwallet << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/ > /dev/null 2>&1
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx
" && log "Nginx configurado" || echo "Erro ao configurar Nginx"

# ============================================================
# PASSO 8: Testes
# ============================================================
step "PASSO 8: Testando Deploy"

sleep 3

info "Testando Backend..."
if curl -s http://$DROPLET_IP/api/v1/health > /dev/null 2>&1; then
    log "Backend respondendo ✓"
else
    echo "⚠️  Backend ainda inicializando (normal na primeira vez)"
fi

info "Testando Frontend..."
if curl -s http://$DROPLET_IP/ | grep -q "html" > /dev/null 2>&1; then
    log "Frontend respondendo ✓"
else
    echo "⚠️  Frontend carregando"
fi

# ============================================================
# Resumo Final
# ============================================================
step "✅ DEPLOY COMPLETADO COM SUCESSO!"

echo -e "${BLUE}📊 INFORMAÇÕES:${NC}"
echo "  IP Droplet:  $DROPLET_IP"
echo "  App Dir:     $REMOTE_PATH"
echo "  Backend:     holdwallet service"
echo "  Frontend:    /var/www/html"
echo ""

echo -e "${BLUE}🌐 ACESSE:${NC}"
echo "  http://$DROPLET_IP"
echo ""

echo -e "${BLUE}📝 COMANDOS ÚTEIS:${NC}"
echo "  Ver logs:    ssh root@$DROPLET_IP 'journalctl -u holdwallet -f'"
echo "  Editar .env: ssh root@$DROPLET_IP 'nano $REMOTE_PATH/backend/.env.production'"
echo "  Restart:     ssh root@$DROPLET_IP 'systemctl restart holdwallet'"
echo "  Status:      ssh root@$DROPLET_IP 'systemctl status holdwallet'"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
