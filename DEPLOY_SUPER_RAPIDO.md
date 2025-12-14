# 🚀 DEPLOY ULTRA RÁPIDO - 10 MINUTOS

**Status:** Droplet já criado ✅  
**IP:** 164.92.155.222  
**Próximo passo:** Enviar código e rodar

---

## 🎯 SUPER RESUMIDO

### Passo 1: Conectar ao Droplet (use Console do DigitalOcean)

No painel do DigitalOcean:

1. Clique no Droplet "APP-HOLDWALLET"
2. Clique no botão azul **"Console"** (canto superior direito)
3. Apareça um terminal preto - pronto! 🖥️

**Ou** (se tiver SSH configurada):

```bash
ssh root@164.92.155.222
```

---

### Passo 2: Colar este bloco gigante (TUDO DE UMA VEZ)

```bash
#!/bin/bash
set -e

# 1. Instalar tudo
apt update && apt upgrade -y
apt install -y curl wget git vim htop nodejs python3.9 python3.9-venv python3-pip nginx certbot

# 2. Clonar repo
cd /home && mkdir -p holdwallet && cd holdwallet
git clone https://github.com/ag3developer/APP-HOLDWALLET.git
cd APP-HOLDWALLET

# 3. Backend
cd backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 4. Frontend
cd ../Frontend
npm install
npm run build
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/
cd ..

# 5. .env
cat > backend/.env.production << 'EOF'
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:///./holdwallet.db
SECRET_KEY=sua-chave-secreta-super-segura
JWT_ALGORITHM=HS256
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave
TRANSFBANK_WEBHOOK_SECRET=seu-webhook
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-key
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
EOF

chmod 600 backend/.env.production

# 6. Service
cat > /etc/systemd/system/holdwallet.service << 'EOF'
[Unit]
Description=HOLD Wallet
After=network.target

[Service]
Type=notify
User=root
WorkingDirectory=/home/holdwallet/APP-HOLDWALLET/backend
Environment="PATH=/home/holdwallet/APP-HOLDWALLET/backend/venv/bin"
EnvironmentFile=/home/holdwallet/APP-HOLDWALLET/backend/.env.production
ExecStart=/home/holdwallet/APP-HOLDWALLET/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 7. Nginx
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
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 8. Start
systemctl daemon-reload
systemctl enable holdwallet
systemctl start holdwallet
systemctl restart nginx

echo "✅ DEPLOY COMPLETO!"
```

---

### Passo 3: Testar

**No navegador:**

```
http://164.92.155.222
```

Deve carregar a página! 🎉

**API:**

```bash
curl http://164.92.155.222/api/v1/health
```

---

## 💰 É ISSO

Pronto! Seu app está rodando por **$12/mês**.

---

## 🔄 Depois (Para atualizar código)

```bash
cd /home/holdwallet/APP-HOLDWALLET
git pull origin main
cd Frontend && npm run build && cp -r build/* /var/www/html/ && cd ..
systemctl restart holdwallet
```

---

**Quer começar agora?** 🚀
