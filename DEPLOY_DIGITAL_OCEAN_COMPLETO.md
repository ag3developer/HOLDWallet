# 🚀 DEPLOY DIGITAL OCEAN - GUIA COMPLETO

**Data:** 11 de Dezembro de 2025  
**Status:** ✅ Pronto para deploy em DigitalOcean  
**Estimativa:** 2-4 horas (backend + frontend)

---

## 📋 CHECKLIST PRÉ-DEPLOY

- [ ] DigitalOcean account criada + cartão ativado
- [ ] SSH key gerada e adicionada ao DigitalOcean
- [ ] Droplet criado (Ubuntu 22.04, 2GB RAM mínimo)
- [ ] Domain registrado e apontando para Droplet
- [ ] Variáveis de ambiente preparadas (`.env.production`)
- [ ] TransfBank API keys obtidas
- [ ] banco de dados PostgreSQL configurado

---

## 1️⃣ CRIAR DROPLET NO DIGITAL OCEAN

### Passo 1.1: Acessar DigitalOcean

1. Ir para https://cloud.digitalocean.com
2. Login com sua conta
3. Clicar em "Create" → "Droplets"

### Passo 1.2: Configurar Droplet

**Recomendação para HOLDWallet:**

```
Region:           São Paulo (spa-1) - Melhor latência Brasil
Image:            Ubuntu 22.04 x64 (LTS)
Size:             Basic - $6/mês (2GB RAM, 1 vCPU, 50GB SSD)
VPC:              Deixar padrão
Backup:           Enabled (adiciona $1.20/mês)
IPv6:             Habilitado
SSH Key:          Criar nova ou usar existente
Hostname:         holdwallet-api (ou seu domínio)
```

**Ou para maior performance:**

```
Size: General Purpose - $12/mês (2GB RAM, 2 vCPU, 60GB SSD)
   → Recomendado para 100+ usuários simultâneos
```

### Passo 1.3: Criar Droplet

1. Clicar "Create Droplet"
2. Aguardar ~1 minuto
3. Guardar o IP da Droplet (exemplo: `123.45.67.89`)

---

## 2️⃣ CONFIGURAR DROPLET INICIAL

### Passo 2.1: SSH para Droplet

```bash
ssh root@123.45.67.89
# Digite "yes" quando pedir confirmação
```

### Passo 2.2: Atualizar Sistema

```bash
apt update
apt upgrade -y
apt install -y curl wget git vim htop
```

### Passo 2.3: Criar Usuário Não-Root

```bash
# Criar usuário 'holdwallet'
adduser holdwallet
# Digite senha forte quando pedir

# Adicionar ao sudo
usermod -aG sudo holdwallet

# Copiar SSH key para novo usuário
mkdir -p /home/holdwallet/.ssh
cp ~/.ssh/authorized_keys /home/holdwallet/.ssh/
chown -R holdwallet:holdwallet /home/holdwallet/.ssh
chmod 700 /home/holdwallet/.ssh
chmod 600 /home/holdwallet/.ssh/authorized_keys
```

### Passo 2.4: Fazer SSH como Novo Usuário

```bash
# Logout do root
exit

# SSH como holdwallet
ssh holdwallet@123.45.67.89
```

---

## 3️⃣ INSTALAR DEPENDÊNCIAS

### Passo 3.1: Node.js (para Frontend)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verificar v18+
npm --version   # Verificar v9+
```

### Passo 3.2: Python (para Backend)

```bash
sudo apt install -y python3.9 python3.9-venv python3-pip
python3.9 --version  # Verificar v3.9+
```

### Passo 3.3: PostgreSQL Client (se usar managed database)

```bash
sudo apt install -y postgresql-client
psql --version
```

### Passo 3.4: Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Passo 3.5: Certbot (SSL/HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 4️⃣ CLONAR REPOSITÓRIO

```bash
cd ~
git clone https://github.com/ag3developer/HOLDWallet.git
cd HOLDWallet
```

---

## 5️⃣ CONFIGURAR BACKEND

### Passo 5.1: Python Virtual Environment

```bash
cd ~/HOLDWallet/backend
python3.9 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Passo 5.2: Variáveis de Ambiente

```bash
# Criar arquivo .env.production
nano .env.production
```

**Conteúdo (.env.production):**

```env
# FastAPI
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://seu-dominio.com

# Database (DigitalOcean Managed)
DATABASE_URL=postgresql://user:password@db-host:5432/holdwallet

# JWT/Auth
SECRET_KEY=seu-secret-key-super-seguro-aleatorio
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# TransfBank
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-transfbank
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret-transfbank

# Blockchain (já deve estar configurado)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-key
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# SMTP (para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# URLs Públicas
FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://api.seu-dominio.com
```

### Passo 5.3: Testar Backend Local

```bash
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Se funcionar (verá "Uvicorn running"), pressione Ctrl+C e continue.

### Passo 5.4: Configurar Systemd Service

```bash
# Criar arquivo de serviço
sudo nano /etc/systemd/system/holdwallet-backend.service
```

**Conteúdo:**

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

```bash
# Ativar serviço
sudo systemctl daemon-reload
sudo systemctl enable holdwallet-backend
sudo systemctl start holdwallet-backend
sudo systemctl status holdwallet-backend
```

---

## 6️⃣ CONFIGURAR FRONTEND

### Passo 6.1: Build React

```bash
cd ~/HOLDWallet/Frontend
npm install
npm run build
```

**Resultado:** pasta `build/` com arquivos estáticos.

### Passo 6.2: Copiar para Nginx

```bash
sudo cp -r ~/HOLDWallet/Frontend/build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

---

## 7️⃣ CONFIGURAR NGINX

### Passo 7.1: Criar Config Nginx

```bash
sudo nano /etc/nginx/sites-available/holdwallet
```

**Conteúdo:**

```nginx
# Backend API
upstream backend {
    server 127.0.0.1:8000;
}

# Servidor principal
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # SSL (será configurado com Certbot)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Raiz do frontend
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
```

### Passo 7.2: Ativar Config

```bash
sudo ln -s /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar sintaxe
sudo systemctl restart nginx
```

---

## 8️⃣ CONFIGURAR SSL/HTTPS

```bash
# Certbot automático
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Aceitar termos
# Email para renovação automática
```

Depois, verificar renovação automática:

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 9️⃣ CONFIGURAR BANCO DE DADOS

### Opção A: Managed PostgreSQL (Recomendado)

1. No DigitalOcean Dashboard → "Databases" → "Create"
2. PostgreSQL 14+
3. Notar a connection string
4. Atualizar `.env.production` com `DATABASE_URL`

### Opção B: PostgreSQL na Droplet (Mais barato)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql

# Criar database e user
CREATE DATABASE holdwallet;
CREATE USER holdwallet_user WITH PASSWORD 'sua-senha-super-forte';
GRANT ALL PRIVILEGES ON DATABASE holdwallet TO holdwallet_user;
\q

# Executar migrations (se tiver alembic)
cd ~/HOLDWallet/backend
source venv/bin/activate
alembic upgrade head
```

---

## 🔟 CONFIGURAR FIREWALL

```bash
# Ativar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS
sudo ufw allow 443/tcp

# Verificar
sudo ufw status
```

---

## 1️⃣1️⃣ MONITORAMENTO & LOGS

### Logs do Backend

```bash
# Ver em tempo real
sudo journalctl -u holdwallet-backend -f

# Últimas 50 linhas
sudo journalctl -u holdwallet-backend -n 50

# Hoje
sudo journalctl -u holdwallet-backend --since today
```

### Logs do Nginx

```bash
# Requisições
tail -f /var/log/nginx/access.log

# Erros
tail -f /var/log/nginx/error.log
```

### Monitoramento de Recursos

```bash
# CPU/RAM/Disk
htop

# Espaço em disco
df -h

# Tipo de uso
du -sh ~/HOLDWallet
```

---

## 1️⃣2️⃣ CONFIGURAR DOMÍNIO

### No seu registrador de domínio:

1. Ir para DNS settings
2. Adicionar **A Record**:
   ```
   Name: @
   Type: A
   Value: 123.45.67.89 (seu IP do Droplet)
   TTL: 3600
   ```
3. Adicionar **CNAME Record** para www:
   ```
   Name: www
   Type: CNAME
   Value: seu-dominio.com
   TTL: 3600
   ```

**Aguardar 5-15 minutos** para propagação DNS.

---

## 1️⃣3️⃣ TESTAR DEPLOY

### Teste 1: Frontend

```bash
# Abrir no navegador
https://seu-dominio.com
# Deve carregar a página
```

### Teste 2: API

```bash
curl https://seu-dominio.com/api/v1/health
# Deve retornar {"status": "ok"}
```

### Teste 3: TransfBank

```bash
curl -X POST https://seu-dominio.com/api/v1/payments/bank/banks \
  -H "Authorization: Bearer seu-jwt-token"
# Deve listar os bancos
```

---

## 1️⃣4️⃣ AUTOMAÇÃO & BACKUP

### Backup Automático

```bash
# Criar script de backup
nano ~/backup.sh
```

**Conteúdo:**

```bash
#!/bin/bash
BACKUP_DIR="/home/holdwallet/backups"
DB_NAME="holdwallet"
DB_USER="holdwallet_user"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Manter últimos 7 dias
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup realizado: $BACKUP_DIR/db_$DATE.sql.gz"
```

```bash
# Tornar executável
chmod +x ~/backup.sh

# Adicionar ao crontab (diariamente às 3am)
crontab -e
# Adicionar linha: 0 3 * * * /home/holdwallet/backup.sh
```

---

## 1️⃣5️⃣ TROUBLESHOOTING

### Backend não inicia

```bash
sudo systemctl status holdwallet-backend
sudo journalctl -u holdwallet-backend -n 50
```

### Nginx 502 Bad Gateway

```bash
# Verificar se backend está rodando
sudo systemctl status holdwallet-backend

# Verificar config nginx
sudo nginx -t

# Reiniciar tudo
sudo systemctl restart nginx
sudo systemctl restart holdwallet-backend
```

### SSL Certificate Error

```bash
# Renovar manualmente
sudo certbot renew --dry-run

# Forçar renovação
sudo certbot renew --force-renewal
```

### Erro de permissão

```bash
# Verificar ownership
ls -la /var/www/html
ls -la /home/holdwallet/HOLDWallet/backend/.env.production

# Corrigir se necessário
sudo chown -R www-data:www-data /var/www/html
sudo chown holdwallet:holdwallet /home/holdwallet/HOLDWallet/backend/.env.production
chmod 600 /home/holdwallet/HOLDWallet/backend/.env.production
```

---

## 1️⃣6️⃣ PRÓXIMOS PASSOS (PÓS-DEPLOY)

- [ ] Testar fluxo completo de transação
- [ ] Configurar alertas e monitoramento
- [ ] Adicionar PIX como alternativa (próxima semana)
- [ ] Configurar email transacional
- [ ] Documentar process runbook para ops
- [ ] Adicionar rate limiting e DDoS protection

---

## 📊 RESUMO DE CUSTOS DIGITAL OCEAN

| Item                  | Custo/mês | Nota                      |
| --------------------- | --------- | ------------------------- |
| Droplet (Basic)       | $6        | 2GB RAM, suficiente       |
| Droplet (Recomendado) | $12       | 2GB, 2vCPU para melhor PF |
| Backup do Droplet     | $1.20     | Automático                |
| Database PostgreSQL   | $15       | Managed (recomendado)     |
| Domínio               | $12/ano   | ~$1/mês                   |
| SSL                   | FREE      | Let's Encrypt + Certbot   |
| **TOTAL**             | **$33**   | Por mês (Droplet + DB)    |

---

## 🎯 CHECKLIST FINAL

- [ ] Droplet criada em São Paulo
- [ ] SSH key configurada
- [ ] Dependências instaladas (Node, Python, Postgres, Nginx)
- [ ] Repositório clonado
- [ ] `.env.production` com TransfBank keys
- [ ] Backend rodando (systemd service)
- [ ] Frontend compilado e copiado para `/var/www/html`
- [ ] Nginx configurado com reverse proxy
- [ ] SSL/HTTPS com Certbot
- [ ] Domain apontando para IP do Droplet
- [ ] Testes funcionando
- [ ] Logs sendo monitorados

---

## 💬 SUPORTE

**Erro durante deploy?** Compartilhe:

```bash
# 1. Erro exato
# 2. Comando que rodou
# 3. Output completo
# 4. Arquivo afetado
```

**Exemplo de relatório:**

```
Erro ao instalar dependências backend:
Comando: pip install -r requirements.txt
Error: ModuleNotFoundError: No module named 'fastapi'
Arquivo: requirements.txt
```

---

_Guia completo para DigitalOcean - Dezembro 2025_
