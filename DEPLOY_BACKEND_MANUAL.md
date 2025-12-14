# 🚀 DEPLOY BACKEND - INSTRUÇÕES MANUAIS

## ⚠️ Situação

- Frontend: ✅ Já está deployado no Vercel
- Backend: ⏳ Pronto para fazer deploy no Droplet 164.92.155.222

O script de deploy automático precisaria de autenticação SSH, que não está configurada ainda.

## 🔧 Solução: Deploy Manual (5-10 minutos)

### PASSO 1: Conectar ao Droplet via SSH

```bash
ssh root@164.92.155.222
```

Se pedira senha, use a senha que você tem do Droplet (verifique seu email da DigitalOcean).

### PASSO 2: Criar Estrutura de Diretórios

```bash
# Criar usuário holdwallet
useradd -m -s /bin/bash holdwallet 2>/dev/null || echo "Usuário já existe"

# Criar diretórios
mkdir -p /home/holdwallet
cd /home/holdwallet
```

### PASSO 3: Clonar Repositório

```bash
# Clone o repositório corrigido com o frontend funcionando
git clone https://github.com/ag3developer/HOLDWallet.git
cd HOLDWallet/backend

# Ajustar permissões
chown -R holdwallet:holdwallet /home/holdwallet/HOLDWallet
```

### PASSO 4: Instalar Python 3.12 (se não existir)

```bash
# Verificar se tem Python 3.12
python3.12 --version

# Se não tiver, instalar:
apt update
apt install -y python3.12 python3.12-venv python3.12-dev build-essential
```

### PASSO 5: Criar Virtual Environment

```bash
cd /home/holdwallet/HOLDWallet/backend

# Criar venv
python3.12 -m venv venv

# Ativar
source venv/bin/activate

# Atualizar pip
pip install --upgrade pip setuptools wheel
```

### PASSO 6: Instalar Dependências Python

```bash
# Ainda dentro do venv ativado
pip install -r requirements.txt
```

Isso vai levar 2-3 minutos instalando todos os pacotes.

### PASSO 7: Criar arquivo .env.production

```bash
cat > /home/holdwallet/HOLDWallet/backend/.env.production << 'EOF'
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info

# ============== DATABASE ==============
DATABASE_URL=sqlite:///./holdwallet.db

# ============== JWT/AUTH ==============
SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# ============== FRONTEND ==============
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app

# ============== TRANSFBANK (Configure depois) ==============
TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=
TRANSFBANK_WEBHOOK_SECRET=

# ============== BLOCKCHAIN ==============
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# ============== SMTP (Opcional) ==============
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF

chmod 600 /home/holdwallet/HOLDWallet/backend/.env.production
```

### PASSO 8: Testar Backend Manualmente

```bash
cd /home/holdwallet/HOLDWallet/backend
source venv/bin/activate

# Iniciar servidor
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Você deve ver:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Pressione `CTRL+C` para parar.

### PASSO 9: Criar Systemd Service

```bash
sudo tee /etc/systemd/system/holdwallet-backend.service > /dev/null << 'EOF'
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
EOF

# Recarregar e iniciar
systemctl daemon-reload
systemctl enable holdwallet-backend
systemctl start holdwallet-backend

# Verificar status
systemctl status holdwallet-backend
```

### PASSO 10: Configurar Nginx (Reverse Proxy)

```bash
# Instalar nginx se necessário
apt install -y nginx

# Criar configuração
sudo tee /etc/nginx/sites-available/holdwallet-api > /dev/null << 'EOF'
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
EOF

# Ativar
ln -sf /etc/nginx/sites-available/holdwallet-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e restart
nginx -t
systemctl restart nginx
```

### PASSO 11: Configurar Firewall

```bash
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw status
```

### PASSO 12: Testar Endpoints

```bash
# Do seu computador local (fora do Droplet):

# Health check
curl http://164.92.155.222/health

# API health
curl http://164.92.155.222/api/v1/health

# Deve responder com JSON
```

## 📊 Verifying Deployment

Após completar os passos acima, você pode verificar:

### Ver Logs em Tempo Real

```bash
ssh root@164.92.155.222
journalctl -u holdwallet-backend -f
```

### Ver Status do Service

```bash
systemctl status holdwallet-backend
```

### Reiniciar Backend

```bash
systemctl restart holdwallet-backend
```

### Ver Processos

```bash
ps aux | grep uvicorn
```

## 🎯 Resultado Final

Quando tudo estiver configurado:

```
Frontend:  ✅ https://hold-wallet-deaj.vercel.app
Backend:   ✅ http://164.92.155.222/api
Login:     ✅ Conecta Frontend → Backend
```

## 🆘 Se Algo Não Funcionar

### Backend não inicia

```bash
# Ver erro detalhado
journalctl -u holdwallet-backend -n 50 -e
```

### API não responde

```bash
# Verificar se Uvicorn está rodando
ps aux | grep uvicorn

# Testar se porta 8000 está aberta
netstat -tlnp | grep 8000
```

### Nginx não responde

```bash
# Testar config
nginx -t

# Ver status
systemctl status nginx

# Ver logs
tail -f /var/log/nginx/holdwallet-api.error.log
```

---

## ⏱️ Tempo Estimado

- Passo 1-4: 1 min
- Passo 5-6: 3 min (instalação de dependências)
- Passo 7-10: 2 min
- Passo 11-12: 1 min
- **Total: ~7 minutos**

**Quer que eu execute isso passo a passo ou tem dúvida em algum deles?**
