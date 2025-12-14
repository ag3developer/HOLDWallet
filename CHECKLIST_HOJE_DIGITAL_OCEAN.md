# ⚡ CHECKLIST HOJE - DIGITAL OCEAN + TRANSFBANK

**Data:** 11 de Dezembro de 2025  
**Sua Ação:** Comece agora  
**Estimativa:** 4 horas total  
**Resultado:** Deploy em produção amanhã

---

## 🎯 OBJETIVO DO DIA

Ter backend + frontend rodando em DigitalOcean + TransfBank configurado.

```
Início:  14:00 BRT
Fim:     18:00 BRT
Resultado: Sistema online em produção
```

---

## HORA 1: DIGITAL OCEAN (14:00-15:00)

### [ ] Conta DigitalOcean

- [ ] Ir para https://cloud.digitalocean.com
- [ ] Criar conta (email + senha)
- [ ] Adicionar cartão de crédito
- [ ] Verificar email de confirmação

### [ ] SSH Key

```bash
# No seu MacBook, generate SSH key (se não tiver)
ssh-keygen -t ed25519 -f ~/.ssh/do_key -C "holdwallet"
cat ~/.ssh/do_key.pub
# Copiar a chave pública
```

- [ ] No DigitalOcean: Settings → Security → SSH Keys → Add Key
- [ ] Colar a chave pública
- [ ] Nome: "holdwallet-macbook"

### [ ] Criar Droplet

1. [ ] Dashboard → Create → Droplets
2. [ ] **Region:** São Paulo (spa-1)
3. [ ] **Image:** Ubuntu 22.04 x64
4. [ ] **Size:** Basic ($6/mês) ou General Purpose ($12/mês)
5. [ ] **SSH Key:** Selecionar "holdwallet-macbook"
6. [ ] **Hostname:** holdwallet-api
7. [ ] Clicar "Create Droplet"
8. [ ] **Anotar IP:** (exemplo 123.45.67.89)

### [ ] Testar SSH

```bash
ssh -i ~/.ssh/do_key root@123.45.67.89
# Deve conectar
exit
```

**Tempo gasto:** ~20 min  
**Status:** ✅

---

## HORA 2: SETUP DROPLET (15:00-16:00)

### [ ] Conectar via SSH

```bash
ssh -i ~/.ssh/do_key root@123.45.67.89
```

### [ ] Atualizar Sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git vim htop nginx postgresql postgresql-contrib
```

### [ ] Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
node --version  # Deve ser v18+
```

### [ ] Python

```bash
apt install -y python3.9 python3.9-venv python3-pip
python3.9 --version  # Deve ser 3.9+
```

### [ ] Criar Usuário

```bash
adduser holdwallet
# Digite senha forte

usermod -aG sudo holdwallet
exit
# Logout
```

### [ ] SSH como holdwallet

```bash
ssh -i ~/.ssh/do_key holdwallet@123.45.67.89
```

**Tempo gasto:** ~20 min  
**Status:** ✅

---

## HORA 3: CLONAR & CONFIGURAR (16:00-17:00)

### [ ] Clonar Repositório

```bash
cd ~
git clone https://github.com/ag3developer/HOLDWallet.git
cd HOLDWallet
```

### [ ] Backend Setup

```bash
cd backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### [ ] Arquivo .env.production

```bash
nano .env.production
```

**Copiar e colar (preencher seus valores):**

```env
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://seu-dominio.com

DATABASE_URL=postgresql://holdwallet_user:SENHA_FORTE@localhost:5432/holdwallet

SECRET_KEY=gerar-com-openssl-rand-hex-32
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=SUA_API_KEY_TRANSFBANK
TRANSFBANK_WEBHOOK_SECRET=SUA_WEBHOOK_SECRET

ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/SUA_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app-google

FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://api.seu-dominio.com
```

**Salvar:** Ctrl+O → Enter → Ctrl+X

### [ ] Testar Backend

```bash
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Se ver "Uvicorn running on http://0.0.0.0:8000" → **OK!**

Pressionar Ctrl+C para parar.

### [ ] Systemd Service

```bash
sudo nano /etc/systemd/system/holdwallet-backend.service
```

**Colar:**

```ini
[Unit]
Description=HOLDWallet Backend
After=network.target

[Service]
Type=notify
User=holdwallet
WorkingDirectory=/home/holdwallet/HOLDWallet/backend
Environment="PATH=/home/holdwallet/HOLDWallet/backend/venv/bin"
EnvironmentFile=/home/holdwallet/HOLDWallet/backend/.env.production
ExecStart=/home/holdwallet/HOLDWallet/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

**Salvar:** Ctrl+O → Enter → Ctrl+X

```bash
sudo systemctl daemon-reload
sudo systemctl enable holdwallet-backend
sudo systemctl start holdwallet-backend
sudo systemctl status holdwallet-backend
```

Deve ver "active (running)" ✅

### [ ] Frontend Build

```bash
cd ~/HOLDWallet/Frontend
npm install
npm run build
```

Aguarde terminar...

### [ ] Deploy Frontend

```bash
sudo cp -r ~/HOLDWallet/Frontend/build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

**Tempo gasto:** ~30 min  
**Status:** ✅

---

## HORA 4: NGINX + DOMÍNIO (17:00-18:00)

### [ ] Nginx Config

```bash
sudo nano /etc/nginx/sites-available/holdwallet
```

**Colar (substituir "seu-dominio.com"):**

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com www.seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/html;
    index index.html index.htm;

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

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Salvar:** Ctrl+O → Enter → Ctrl+X

```bash
sudo ln -s /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### [ ] SSL com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Responder:

- Email: seu-email@gmail.com
- Aceitar termos: Y
- Compartilhar com EFF: N (ou Y)
- Redirecionar HTTP → HTTPS: 2

### [ ] Apontar Domínio

1. [ ] Abrir seu registrador (Namecheap, GoDaddy, etc)
2. [ ] DNS settings
3. [ ] Adicionar **A Record**:

   - Name: @
   - Type: A
   - Value: 123.45.67.89 (seu IP)
   - TTL: 3600

4. [ ] Adicionar **CNAME Record** para www:
   - Name: www
   - Type: CNAME
   - Value: seu-dominio.com
   - TTL: 3600

**Aguardar 5-15 minutos para DNS propagar**

### [ ] Testar

```bash
# No seu MacBook
curl https://seu-dominio.com/api/v1/health
# Deve retornar algo como: {"status":"ok"}

# Abrir no navegador
open https://seu-dominio.com
# Deve carregar a página
```

**Tempo gasto:** ~30 min  
**Status:** ✅

---

## 📋 VERIFICAÇÃO FINAL

- [ ] Backend rodando: `sudo systemctl status holdwallet-backend`
- [ ] Nginx rodando: `sudo systemctl status nginx`
- [ ] Frontend acessível: https://seu-dominio.com
- [ ] API respondendo: curl https://seu-dominio.com/api/v1/health
- [ ] SSL válido: Certificado automático com Certbot

---

## 🚨 PROBLEMAS COMUNS

### Nginx 502 Bad Gateway

```bash
# Verificar backend
sudo systemctl status holdwallet-backend
sudo journalctl -u holdwallet-backend -n 20

# Reiniciar ambos
sudo systemctl restart nginx
sudo systemctl restart holdwallet-backend
```

### DNS não propagou

```bash
# Verificar DNS
nslookup seu-dominio.com
# Deve retornar seu IP

# Se não funcionar, aguardar mais 10 minutos
```

### Erro de permissão

```bash
# Backend
sudo chown holdwallet:holdwallet /home/holdwallet/HOLDWallet/backend/.env.production
chmod 600 /home/holdwallet/HOLDWallet/backend/.env.production

# Frontend
sudo chown -R www-data:www-data /var/www/html
```

---

## 🎯 AMANHÃ (12 de Dezembro)

Com tudo online, amanhã você vai:

1. **Testar fluxo completo:**

   - [ ] Criar usuário
   - [ ] Fazer login
   - [ ] Criar ordem P2P
   - [ ] Criar trade Instant
   - [ ] Testar pagamento com TransfBank

2. **Ativar para usuários:**

   - [ ] Compartilhar link com beta testers
   - [ ] Monitorar logs em tempo real
   - [ ] Estar pronto para troubleshooting

3. **Começar a gerar revenue:**
   - [ ] Primeiro trade = primeira revenue!
   - [ ] Monitorar conversões
   - [ ] Otimizar UX baseado em feedback

---

## 💡 DICAS

**Conexão segura com DigitalOcean:**

```bash
# Se perder SSH, pode acessar via Console no Dashboard
# Mas melhor manter backup de SSH key:
cp ~/.ssh/do_key ~/.ssh/do_key.backup
chmod 600 ~/.ssh/do_key.backup
```

**Monitorar logs em tempo real:**

```bash
# Em terminal separado
ssh -i ~/.ssh/do_key holdwallet@123.45.67.89
sudo journalctl -u holdwallet-backend -f
```

**Backup rápido do banco:**

```bash
pg_dump -U holdwallet_user holdwallet | gzip > ~/holdwallet_backup_$(date +%Y%m%d).sql.gz
```

---

## 📊 CUSTOS DIGITAL OCEAN

```
Droplet Basic (2GB):    $6/mês
Backup automático:      $1.20/mês
Database PostgreSQL:    $0 (no Droplet) ou $15/mês (managed)
SSL/HTTPS:              $0 (Let's Encrypt)
Domain:                 ~$1/mês
─────────────────────
TOTAL:                  ~$7-8/mês (ou $20/mês com managed DB)
```

---

## ✅ CHECKLIST FINAL

- [ ] Conta DigitalOcean criada
- [ ] Droplet online em São Paulo
- [ ] SSH key configurada
- [ ] Dependências instaladas
- [ ] Backend rodando em 127.0.0.1:8000
- [ ] Frontend compilado e em /var/www/html
- [ ] Nginx configurado com reverse proxy
- [ ] SSL/HTTPS com Certbot
- [ ] Domínio apontando para Droplet
- [ ] https://seu-dominio.com carregando
- [ ] https://seu-dominio.com/api/v1/health respondendo

**Quando todos estiverem ✅, você está ONLINE!**

---

_Pronto? Bora começar agora! 🚀_
