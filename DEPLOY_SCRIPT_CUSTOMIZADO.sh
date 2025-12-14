#!/bin/bash

# 🚀 DEPLOY AUTOMÁTICO HOLD WALLET
# IP: 164.92.155.222
# Repositório: ag3developer/APP-HOLDWALLET
# Data: 13 Dezembro 2025

set -e  # Exit on error

echo "🚀 INICIANDO DEPLOY DO HOLD WALLET"
echo "=================================="
echo ""

DROPLET_IP="164.92.155.222"
REPO_URL="https://github.com/ag3developer/APP-HOLDWALLET.git"
APP_DIR="/home/holdwallet/APP-HOLDWALLET"
USER="holdwallet"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para printar com cor
log() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ============================================================
# PASSO 1: CONECTAR AO DROPLET E INSTALAR DEPENDÊNCIAS
# ============================================================

echo -e "\n${YELLOW}PASSO 1: Instalando dependências no Droplet...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    # Update sistema
    apt update
    apt upgrade -y
    apt install -y curl wget git vim htop

    # Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs

    # Python
    apt install -y python3.9 python3.9-venv python3-pip

    # Nginx
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx

    # Certbot
    apt install -y certbot python3-certbot-nginx

    # PostgreSQL Client
    apt install -y postgresql-client

    log "Dependências instaladas com sucesso!"
EOF

log "Dependências instaladas"

# ============================================================
# PASSO 2: CLONAR REPOSITÓRIO
# ============================================================

echo -e "\n${YELLOW}PASSO 2: Clonando repositório...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    cd /home
    mkdir -p holdwallet
    cd holdwallet
    
    # Se já existe, remover (para limpar)
    # rm -rf APP-HOLDWALLET
    
    git clone $REPO_URL
    cd APP-HOLDWALLET
    
    echo "✓ Repositório clonado com sucesso!"
    ls -la
EOF

log "Repositório clonado"

# ============================================================
# PASSO 3: CONFIGURAR BACKEND
# ============================================================

echo -e "\n${YELLOW}PASSO 3: Configurando Backend...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    cd $APP_DIR/backend
    
    # Virtual environment
    python3.9 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo "✓ Backend configurado!"
EOF

log "Backend configurado"

# ============================================================
# PASSO 4: CONFIGURAR FRONTEND
# ============================================================

echo -e "\n${YELLOW}PASSO 4: Compilando Frontend...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    cd $APP_DIR/Frontend
    
    npm install
    npm run build
    
    # Copiar para Nginx
    cp -r build/* /var/www/html/
    chown -R www-data:www-data /var/www/html/
    
    echo "✓ Frontend compilado e copiado!"
EOF

log "Frontend compilado"

# ============================================================
# PASSO 5: CRIAR .ENV.PRODUCTION
# ============================================================

echo -e "\n${YELLOW}PASSO 5: Criando .env.production...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    cat > $APP_DIR/backend/.env.production << 'ENVEOF'
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://seu-dominio.com.br

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
FRONTEND_URL=https://seu-dominio.com.br
BACKEND_URL=https://api.seu-dominio.com.br
ENVEOF

    chmod 600 $APP_DIR/backend/.env.production
    echo "✓ Arquivo .env.production criado!"
EOF

log ".env.production criado"

# ============================================================
# PASSO 6: CONFIGURAR SYSTEMD SERVICE
# ============================================================

echo -e "\n${YELLOW}PASSO 6: Configurando Systemd Service...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    cat > /etc/systemd/system/holdwallet-backend.service << 'SVCEOF'
[Unit]
Description=HOLDWallet Backend API
After=network.target

[Service]
Type=notify
User=holdwallet
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
EnvironmentFile=$APP_DIR/backend/.env.production
ExecStart=$APP_DIR/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

    systemctl daemon-reload
    systemctl enable holdwallet-backend
    systemctl start holdwallet-backend
    
    sleep 2
    systemctl status holdwallet-backend
    
    echo "✓ Systemd service configurado!"
EOF

log "Systemd service configurado"

# ============================================================
# PASSO 7: CONFIGURAR NGINX
# ============================================================

echo -e "\n${YELLOW}PASSO 7: Configurando Nginx...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'EOF'
    cat > /etc/nginx/sites-available/holdwallet << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    listen [::]:80;
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

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

    # Enable site
    ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test config
    nginx -t

    # Restart
    systemctl restart nginx
    
    echo "✓ Nginx configurado!"
EOF

log "Nginx configurado"

# ============================================================
# PASSO 8: FIREWALL
# ============================================================

echo -e "\n${YELLOW}PASSO 8: Configurando Firewall...${NC}\n"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << EOF
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw status
    
    echo "✓ Firewall configurado!"
EOF

log "Firewall configurado"

# ============================================================
# TESTES
# ============================================================

echo -e "\n${YELLOW}PASSO 9: Testando Deploy...${NC}\n"

sleep 2

# Teste 1: Backend
echo "🧪 Teste 1: Verificando Backend..."
curl -s http://$DROPLET_IP/api/v1/health || warning "Backend ainda não está respondendo (pode levar alguns segundos)"

# Teste 2: Frontend
echo "🧪 Teste 2: Verificando Frontend..."
curl -s http://$DROPLET_IP/ | grep -q "DOCTYPE" && log "Frontend respondendo" || warning "Frontend ainda carregando"

# ============================================================
# RESUMO
# ============================================================

echo -e "\n"
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✓ DEPLOY COMPLETADO COM SUCESSO!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 INFORMAÇÕES DO DEPLOY:"
echo "  IP Droplet:        164.92.155.222"
echo "  APP Dir:           /home/holdwallet/APP-HOLDWALLET"
echo "  Backend Service:   holdwallet-backend"
echo "  Frontend:          /var/www/html"
echo "  Nginx Config:      /etc/nginx/sites-available/holdwallet"
echo ""
echo "🔗 PRÓXIMOS PASSOS:"
echo "  1. Acesse:         http://164.92.155.222"
echo "  2. Configure:      .env.production com suas chaves"
echo "  3. Restart:        ssh root@164.92.155.222 'systemctl restart holdwallet-backend'"
echo "  4. Logs Backend:   ssh root@164.92.155.222 'journalctl -u holdwallet-backend -f'"
echo ""
echo "💰 CUSTOS MENSAIS:"
echo "  Droplet 2GB:       \$12/mês"
echo "  SSL:               Grátis (Let's Encrypt)"
echo "  ──────────────────────────"
echo "  TOTAL:             \$12/mês"
echo ""
echo "════════════════════════════════════════════════════"
echo ""
