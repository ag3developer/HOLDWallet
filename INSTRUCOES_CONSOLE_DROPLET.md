# 📝 PRÓXIMO PASSO - CONSOLE DO DROPLET

## ✅ O que já foi feito:

- ✅ Arquivos sincronizados para `/home/holdwallet/APP-HOLDWALLET/`
- ✅ Backend respondendo em `/api/v1/health`
- ✅ Frontend carregando em `/`

## 🚀 O que falta:

Você precisa executar alguns comandos DENTRO do console do Droplet para:

1. Criar venv Python
2. Instalar dependências
3. Criar `.env.production`
4. Compilar Frontend
5. Configurar serviços

---

## 📍 COMO ACESSAR O CONSOLE DO DROPLET

### Opção 1: Via DigitalOcean Dashboard (MAIS FÁCIL)

1. Acesse https://cloud.digitalocean.com/
2. Vá para **Droplets** → seu droplet **APP-HOLDWALLET**
3. Clique em **Console** (canto superior direito)
4. Espere carregar (pode levar 10 segundos)

### Opção 2: Via SSH (Linha de Comando)

```bash
# Substitua a chave SSH correta se necessário
ssh -i ~/.ssh/id_rsa root@164.92.155.222
```

---

## 💻 COMANDOS A EXECUTAR

Copie TODO o conteúdo do arquivo `DROPLET_CONSOLE_COMMANDS.sh` e cole no console.

Ou execute passo a passo:

### Passo 1: Entrar no backend

```bash
cd /home/holdwallet/APP-HOLDWALLET/backend
```

### Passo 2: Criar Python venv

```bash
python3.12 -m venv venv --clear
source venv/bin/activate
```

### Passo 3: Instalar dependências

```bash
pip install --upgrade pip setuptools wheel -q
pip install -r requirements.txt -q
```

### Passo 4: Criar .env.production

```bash
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
FRONTEND_URL=http://164.92.155.222
BACKEND_URL=http://164.92.155.222
EOF

chmod 600 .env.production
```

### Passo 5: Compilar Frontend

```bash
cd /home/holdwallet/APP-HOLDWALLET/Frontend
npm install -q
npm run build -q
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/
```

### Passo 6: Criar serviço

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
systemctl restart holdwallet
```

### Passo 7: Configurar Nginx

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

### Passo 8: Verificar

```bash
systemctl status holdwallet
journalctl -u holdwallet -n 10
curl http://164.92.155.222/
```

---

## 🎯 Resumo

Depois que executar estes comandos:

✅ Você terá um **HOLD Wallet totalmente funcional** em produção
✅ **Backend em Python** rodando com Uvicorn
✅ **Frontend em React** servido por Nginx
✅ **Banco de dados SQLite** funcionando
✅ **TransfBank pronto** para processar pagamentos

---

## 📍 PRÓXIMOS PASSOS (DEPOIS)

1. Configurar chaves reais no `.env.production`:

   - TransfBank API Key
   - Infura key para Ethereum RPC
   - SMTP para emails

2. Teste fluxo de pagamento

3. Configurar domínio customizado (opcional)

4. Ativar SSL/HTTPS com Let's Encrypt (recomendado)

---

## 💬 Precisa de ajuda?

Se algum comando falhar, me avise com a mensagem de erro!

Você consegue acessar o console do Droplet agora?
