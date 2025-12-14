# 🔑 DEPLOY MANUAL - PASSO A PASSO

**Data:** 14 de Dezembro de 2025  
**IP do Droplet:** 164.92.155.222  
**Repositório:** ag3developer/APP-HOLDWALLET

---

## ⚠️ PRIMEIRO: Configurar SSH Key

### Passo 1.1: Gerar SSH Key (se não tiver)

No seu **Mac**, abra Terminal e execute:

```bash
ssh-keygen -t ed25519 -C "seu-email@example.com"
```

Quando pedir "Enter file in which to save the key", pressione **Enter** para usar o padrão.

### Passo 1.2: Copiar SSH Key Pública

```bash
cat ~/.ssh/id_ed25519.pub
```

**Copie a saída inteira** (começa com `ssh-ed25519`).

### Passo 1.3: Adicionar SSH Key ao DigitalOcean

1. Vá para https://cloud.digitalocean.com
2. Menu lateral → **Settings** → **Security** → **SSH Keys**
3. Clique **Add SSH Key**
4. Cole a chave que copiou
5. Nome: `seu-nome-meu-mac` ou algo assim
6. **Add SSH Key**

### Passo 1.4: Recriar Droplet com SSH Key (OU Usar Console)

**OPÇÃO A:** Se criar novo Droplet:

- Selecione a SSH Key ao criar
- Pronto!

**OPÇÃO B:** Se já tem Droplet sem SSH Key:

- Use o Console do DigitalOcean (botão azul "Console")
- Copie a chave manualmente

---

## 🚀 AGORA SIM: Executar Deploy

### Passo 2.1: Conectar ao Droplet

```bash
ssh root@164.92.155.222
```

**Pressione `yes` se pedir confirmação.**

---

### Passo 2.2: Instalar Dependências

Copie e cole NO TERMINAL DO DROPLET:

```bash
#!/bin/bash

echo "📦 Instalando dependências..."

# Update
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

echo "✓ Dependências instaladas!"
```

**Aguarde ~5-10 minutos** enquanto instala tudo.

---

### Passo 2.3: Clonar Repositório

```bash
cd /home
mkdir -p holdwallet
cd holdwallet

git clone https://github.com/ag3developer/APP-HOLDWALLET.git
cd APP-HOLDWALLET

ls -la
```

Você deve ver:

```
Frontend/
backend/
docs/
.github/
README.md
```

---

### Passo 2.4: Configurar Backend

```bash
cd backend

# Virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Instalar pacotes
pip install --upgrade pip
pip install -r requirements.txt

echo "✓ Backend configurado!"
```

**Isso leva ~3-5 minutos.**

---

### Passo 2.5: Criar .env.production

```bash
cat > .env.production << 'EOF'
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://seu-dominio.com.br

# ============== DATABASE ==============
DATABASE_URL=sqlite:///./holdwallet.db

# ============== JWT/AUTH ==============
SECRET_KEY=gere-uma-chave-aleatoria-super-segura-aqui-123456789abc
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
EOF

chmod 600 .env.production
cat .env.production
```

---

### Passo 2.6: Compilar Frontend

```bash
cd ../Frontend

npm install
npm run build

echo "✓ Frontend compilado!"
```

**Leva ~3-5 minutos.**

---

### Passo 2.7: Copiar Frontend para Nginx

```bash
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/

ls -la /var/www/html/
```

---

### Passo 2.8: Configurar Nginx

```bash
cat > /etc/nginx/sites-available/holdwallet << 'EOF'
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

    # Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable
ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test
nginx -t

# Restart
systemctl restart nginx

echo "✓ Nginx configurado!"
```

---

### Passo 2.9: Criar Systemd Service

```bash
cat > /etc/systemd/system/holdwallet-backend.service << 'EOF'
[Unit]
Description=HOLDWallet Backend API
After=network.target

[Service]
Type=notify
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
EOF

# Ativar
systemctl daemon-reload
systemctl enable holdwallet-backend
systemctl start holdwallet-backend

# Verificar
systemctl status holdwallet-backend

echo "✓ Backend service ativado!"
```

---

### Passo 2.10: Configurar Firewall

```bash
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

echo "✓ Firewall configurado!"
```

---

## ✅ TESTAR DEPLOY

### Teste 1: Abrir no navegador

```
http://164.92.155.222
```

Deve carregar a página do HOLD Wallet!

### Teste 2: API

```bash
curl http://164.92.155.222/api/v1/health
```

Deve retornar:

```json
{ "status": "ok" }
```

### Teste 3: Logs do Backend

```bash
journalctl -u holdwallet-backend -f
```

Pressione `Ctrl+C` para sair.

---

## 📋 CHECKLIST RÁPIDO

```
DENTRO DO DROPLET (164.92.155.222):

[ ] Passo 2.2: Dependências instaladas
[ ] Passo 2.3: Repositório clonado em /home/holdwallet/APP-HOLDWALLET
[ ] Passo 2.4: Backend configurado (venv criado)
[ ] Passo 2.5: .env.production criado
[ ] Passo 2.6: Frontend compilado (npm run build)
[ ] Passo 2.7: Frontend copiado para /var/www/html
[ ] Passo 2.8: Nginx configurado
[ ] Passo 2.9: Service holdwallet-backend ativo
[ ] Passo 2.10: Firewall ativado

TESTES:
[ ] http://164.92.155.222 carrega página
[ ] curl http://164.92.155.222/api/v1/health retorna OK
[ ] journalctl mostra logs do backend
```

---

## 🆘 TROUBLESHOOTING

### "Permission denied (publickey)"

Solução: Use Console do DigitalOcean (botão azul no Droplet)

### "npm: command not found"

```bash
# Verificar Node.js
which node
node --version

# Se não existe, reinstalar
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### "Backend not responding"

```bash
# Verificar se está rodando
systemctl status holdwallet-backend

# Ver erros
journalctl -u holdwallet-backend -n 50

# Restart
systemctl restart holdwallet-backend
```

### "Nginx 502 Bad Gateway"

```bash
# Verificar config
nginx -t

# Restart tudo
systemctl restart nginx
systemctl restart holdwallet-backend

# Verificar logs
tail -f /var/log/nginx/error.log
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Deploy feito
2. 👉 **Apontar Domínio** (DNS A Record para 164.92.155.222)
3. 👉 **Configurar SSL/HTTPS** com Certbot
4. 👉 **Adicionar TransfBank Keys** ao .env.production
5. 👉 **Testar fluxo de pagamento**

---

_Guia de Deploy Manual - Dezembro 2025_
