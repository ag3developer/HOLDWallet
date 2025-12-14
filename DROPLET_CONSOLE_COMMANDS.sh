# 🚀 COMANDO FINAL - COPIE E COLE NO CONSOLE DO DROPLET
# ============================================================

# Depois que os arquivos foram sincronizados, execute isto:

cd /home/holdwallet/APP-HOLDWALLET/backend

# 1. Criar venv Python
python3.12 -m venv venv --clear
source venv/bin/activate

# 2. Instalar dependências
pip install --upgrade pip setuptools wheel -q
pip install -r requirements.txt -q

# 3. Criar .env.production
cat > .env.production << 'EOF'
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
EOF

chmod 600 .env.production

# 4. Compilar Frontend (se ainda não foi)
cd /home/holdwallet/APP-HOLDWALLET/Frontend
npm install -q
npm run build -q
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/

# 5. Criar Systemd Service
cat > /etc/systemd/system/holdwallet.service << 'EOF'
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
EOF

systemctl daemon-reload
systemctl enable holdwallet
systemctl restart holdwallet

# 6. Configurar Nginx
cat > /etc/nginx/sites-available/holdwallet << 'EOF'
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 7. Verificar status
echo ""
echo "✅ VERIFICANDO STATUS..."
sleep 2
systemctl status holdwallet --no-pager | head -5
echo ""
echo "🌐 Acesse: http://164.92.155.222"
