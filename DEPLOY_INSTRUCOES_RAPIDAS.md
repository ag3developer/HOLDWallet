# 🚀 DEPLOY CORRIGIDO - INSTRUÇÕES RÁPIDAS

## 📍 Problema Encontrado

O repositório `ag3developer/APP-HOLDWALLET` **não existe** no GitHub.

✅ **Solução:** Usar os arquivos locais que você já tem em `/Users/josecarlosmartins/Documents/HOLDWallet`

---

## ⚡ EXECUTAR DEPLOY AGORA

### Opção 1: Via Script (RECOMENDADO)

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet

# Dar permissão
chmod +x DEPLOY_CORRIGIDO.sh

# Executar
./DEPLOY_CORRIGIDO.sh
```

**Tempo esperado:** 10-15 minutos

**O script faz:**

- ✅ Prepara ambiente no Droplet
- ✅ Copia arquivos via rsync
- ✅ Instala dependências Python
- ✅ Compila React
- ✅ Configura Nginx
- ✅ Inicia serviço
- ✅ Testa endpoints

---

## 🔧 Se Preferir Manual (Passo a Passo)

### Passo 1: Conectar ao Droplet e Preparar

```bash
ssh root@164.92.155.222

# Criar diretório
mkdir -p /home/holdwallet
cd /home/holdwallet
rm -rf APP-HOLDWALLET  # Se já existe
```

### Passo 2: Copiar Arquivos (do seu Mac)

```bash
# Em NOVO terminal do seu Mac:
cd /Users/josecarlosmartins/Documents/HOLDWallet

rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.venv' \
    ./ \
    root@164.92.155.222:/home/holdwallet/APP-HOLDWALLET/
```

### Passo 3: Configurar Backend (no Droplet)

```bash
# No Droplet:
cd /home/holdwallet/APP-HOLDWALLET/backend

python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Passo 4: Compilar Frontend (no Droplet)

```bash
cd /home/holdwallet/APP-HOLDWALLET/Frontend

npm install
npm run build

# Copiar para Nginx
mkdir -p /var/www/html
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/
```

### Passo 5: Criar .env.production (no Droplet)

```bash
cat > /home/holdwallet/APP-HOLDWALLET/backend/.env.production << 'EOF'
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:///./holdwallet.db
SECRET_KEY=sua-chave-segura-aqui
JWT_ALGORITHM=HS256
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave
TRANSFBANK_WEBHOOK_SECRET=seu-webhook
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-key
POLYGON_RPC_URL=https://polygon-rpc.com
ALLOWED_ORIGINS=http://164.92.155.222
FRONTEND_URL=http://164.92.155.222
BACKEND_URL=http://164.92.155.222
EOF

chmod 600 /home/holdwallet/APP-HOLDWALLET/backend/.env.production
```

### Passo 6: Criar Systemd Service (no Droplet)

```bash
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
systemctl start holdwallet
```

### Passo 7: Configurar Nginx (no Droplet)

```bash
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
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/holdwallet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Passo 8: Verificar Tudo

```bash
# Ver status
systemctl status holdwallet
systemctl status nginx

# Ver logs
journalctl -u holdwallet -n 20

# Testar
curl http://164.92.155.222/api/v1/health
```

---

## ✅ Quando Terminar

**Acesse no navegador:**

```
http://164.92.155.222
```

Você deve ver a página inicial do HOLD Wallet!

---

## 🆘 Se Algo Der Erro

### Erro: "node_modules: No such file or directory"

```bash
ssh root@164.92.155.222
cd /home/holdwallet/APP-HOLDWALLET/Frontend
npm install
npm run build
```

### Erro: "Port 8000 already in use"

```bash
# Matar processo
ss -tlnp | grep 8000
kill -9 <PID>

# Ou usar outra porta
systemctl stop holdwallet
# Editar service para porta 8001
```

### Erro: "requirements.txt not found"

```bash
# Verificar se arquivo existe
ls -la /home/holdwallet/APP-HOLDWALLET/backend/requirements.txt

# Se não existir, criar um básico
cat > /home/holdwallet/APP-HOLDWALLET/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
sqlalchemy==2.0.23
EOF
```

---

## 📞 DÚVIDAS?

1. **Deploy deu erro?** → Ver logs: `journalctl -u holdwallet -f`
2. **Frontend não carrega?** → Verificar: `ls -la /var/www/html/`
3. **API não responde?** → Testar: `curl http://164.92.155.222:8000/api/v1/health`

---

## 🎯 Próximo Passo

Depois que tudo estiver rodando, consulte o arquivo `PROXIMOS_PASSOS_POS_DEPLOY.md` para:

- Configurar TransfBank
- Testar pagamentos
- Adicionar domínio customizado
- Ativar SSL/HTTPS
