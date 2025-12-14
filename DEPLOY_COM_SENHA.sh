#!/bin/bash

# 🚀 DEPLOY COM AUTENTICAÇÃO POR SENHA
# IP: 164.92.155.222

DROPLET_IP="164.92.155.222"
LOCAL_PATH="/Users/josecarlosmartins/Documents/HOLDWallet"
REMOTE_PATH="/home/holdwallet/APP-HOLDWALLET"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 DEPLOY HOLD WALLET${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

# Testar conexão SSH
echo "🔐 Testando conexão SSH com o Droplet..."
if ssh -o ConnectTimeout=5 root@$DROPLET_IP "echo 'Conexão OK'" 2>/dev/null; then
    echo -e "${GREEN}✅ Conexão estabelecida!${NC}\n"
else
    echo -e "❌ Falha na conexão SSH"
    echo "Certifique-se que:"
    echo "  1. O Droplet está ligado"
    echo "  2. Você tem acesso root"
    echo "  3. A senha está correta"
    exit 1
fi

# PASSO 1: Preparar ambiente
echo -e "${BLUE}PASSO 1: Preparando ambiente no Droplet...${NC}"
ssh root@$DROPLET_IP << 'SETUP_EOF'
    mkdir -p /home/holdwallet
    cd /home/holdwallet
    rm -rf APP-HOLDWALLET
    apt update -qq > /dev/null 2>&1
    apt install -y -qq curl wget git vim htop python3.12 python3-pip nginx > /dev/null 2>&1
    echo "✅ Ambiente preparado"
SETUP_EOF

# PASSO 2: Copiar arquivos
echo -e "\n${BLUE}PASSO 2: Sincronizando arquivos...${NC}"
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.venv' \
    --exclude='venv' \
    "$LOCAL_PATH/" \
    root@$DROPLET_IP:$REMOTE_PATH/ > /dev/null 2>&1
echo -e "${GREEN}✅ Arquivos sincronizados${NC}"

# PASSO 3: Backend
echo -e "\n${BLUE}PASSO 3: Configurando Backend...${NC}"
ssh root@$DROPLET_IP << 'BACKEND_EOF'
    cd /home/holdwallet/APP-HOLDWALLET/backend
    python3.12 -m venv venv --clear > /dev/null 2>&1
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel -qq > /dev/null 2>&1
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt -qq > /dev/null 2>&1
    fi
    echo "✅ Backend configurado"
BACKEND_EOF

# PASSO 4: Frontend
echo -e "\n${BLUE}PASSO 4: Compilando Frontend...${NC}"
ssh root@$DROPLET_IP << 'FRONTEND_EOF'
    cd /home/holdwallet/APP-HOLDWALLET/Frontend
    npm install -q > /dev/null 2>&1
    npm run build -q > /dev/null 2>&1
    mkdir -p /var/www/html
    cp -r build/* /var/www/html/
    chown -R www-data:www-data /var/www/html/
    echo "✅ Frontend compilado"
FRONTEND_EOF

# PASSO 5: .env.production
echo -e "\n${BLUE}PASSO 5: Criando .env.production...${NC}"
ssh root@$DROPLET_IP << 'ENV_EOF'
    cat > /home/holdwallet/APP-HOLDWALLET/backend/.env.production << 'ENVEOF'
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
    chmod 600 /home/holdwallet/APP-HOLDWALLET/backend/.env.production
    echo "✅ .env.production criado"
ENV_EOF

# PASSO 6: Systemd Service
echo -e "\n${BLUE}PASSO 6: Configurando Systemd Service...${NC}"
ssh root@$DROPLET_IP << 'SERVICE_EOF'
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

[Install]
WantedBy=multi-user.target
SVCEOF
    systemctl daemon-reload
    systemctl enable holdwallet > /dev/null 2>&1
    systemctl restart holdwallet
    sleep 2
    echo "✅ Systemd service configurado"
SERVICE_EOF

# PASSO 7: Nginx
echo -e "\n${BLUE}PASSO 7: Configurando Nginx...${NC}"
ssh root@$DROPLET_IP << 'NGINX_EOF'
    cat > /etc/nginx/sites-available/holdwallet << 'NGINXEOF'
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF
    ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/ > /dev/null 2>&1
    rm -f /etc/nginx/sites-enabled/default
    nginx -t > /dev/null 2>&1
    systemctl restart nginx
    echo "✅ Nginx configurado"
NGINX_EOF

# PASSO 8: Testes
echo -e "\n${BLUE}PASSO 8: Testando Deploy...${NC}"
sleep 3

echo "Testando Backend..."
curl -s http://$DROPLET_IP/api/v1/health > /dev/null 2>&1 && echo "✅ Backend respondendo" || echo "⚠️ Backend iniciando"

echo "Testando Frontend..."
curl -s http://$DROPLET_IP/ | grep -q "html" && echo "✅ Frontend respondendo" || echo "⚠️ Frontend carregando"

# Resumo Final
echo -e "\n${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETADO COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

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
