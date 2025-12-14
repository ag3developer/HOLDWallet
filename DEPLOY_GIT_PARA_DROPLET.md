# 🚀 ENVIAR CÓDIGO PARA DROPLET - GUIA PASSO A PASSO

**Data:** 13 de Dezembro de 2025  
**Objetivo:** Deploy do repositório `ag3developer/APP-HOLDWALLET` para seu Droplet  
**Tempo estimado:** 30 minutos

---

## 📋 INFORMAÇÕES NECESSÁRIAS

Antes de começar, prepare:

```
1. IP do seu Droplet:            _____________________
2. SSH Key:                       Já adicionada ao DO? (Sim/Não)
3. URL do repositório GitHub:    ag3developer/APP-HOLDWALLET
4. Token GitHub (PAT):           _____________________ (opcional, só se privado)
5. Seu domain:                    _____________________ (ex: holdwallet.com.br)
```

---

## OPÇÃO 1: Git Clone (MAIS FÁCIL - Recomendado)

### Passo 1: Conectar ao Droplet

```bash
# Abra terminal no seu Mac
ssh root@SEU_IP_DROPLET

# Exemplo:
# ssh root@123.45.67.89
```

**Quando pedir "Are you sure?", digite `yes` e Enter**

### Passo 2: Criar diretório para aplicação

```bash
cd /home
mkdir -p holdwallet
cd holdwallet
ls -la
```

### Passo 3: Clonar repositório

```bash
# Se repositório é PÚBLICO
git clone https://github.com/ag3developer/APP-HOLDWALLET.git

# Se repositório é PRIVADO (requer token)
# git clone https://seu-token:x-oauth-basic@github.com/ag3developer/APP-HOLDWALLET.git
```

**Aguarde alguns segundos** enquanto o Git baixa tudo (~500MB).

### Passo 4: Verificar estrutura

```bash
cd APP-HOLDWALLET
ls -la
```

Deve ver algo como:

```
.
├── Frontend/
├── backend/
├── docs/
├── .github/
├── .gitignore
├── README.md
└── (outros arquivos)
```

✅ **Pronto!** O código está no Droplet!

---

## OPÇÃO 2: Git Bare Repository (PARA MÚLTIPLOS DEPLOYS)

Se você vai fazer múltiplos deploys (recomendado para atualização automática):

### Passo 1: Criar bare repository no Droplet

```bash
ssh root@SEU_IP_DROPLET

# Criar repositório vazio
mkdir -p /var/repos
cd /var/repos
git clone --bare https://github.com/ag3developer/APP-HOLDWALLET.git holdwallet.git
cd holdwallet.git
```

### Passo 2: Criar hook de deploy automático

```bash
nano hooks/post-receive
```

**Cole este conteúdo:**

```bash
#!/bin/bash
# Hook executado após push para o repositório

WORK_TREE=/home/holdwallet/APP-HOLDWALLET
GIT_DIR=/var/repos/holdwallet.git

# Fazer checkout
git --work-tree=$WORK_TREE --git-dir=$GIT_DIR checkout -f

# Ir para diretório
cd $WORK_TREE

# Mostrar mensagem
echo "✅ Deploy realizado em $(date)"
echo "Branch atual: $(git --work-tree=$WORK_TREE --git-dir=$GIT_DIR rev-parse --abbrev-ref HEAD)"
```

```bash
# Tornar executável
chmod +x hooks/post-receive
```

### Passo 3: Criar diretório de trabalho

```bash
mkdir -p /home/holdwallet/APP-HOLDWALLET
cd /home/holdwallet/APP-HOLDWALLET

# Primeiro checkout
git --work-tree=/home/holdwallet/APP-HOLDWALLET --git-dir=/var/repos/holdwallet.git checkout -f
```

### Passo 4: Adicionar como remote no seu Mac

```bash
# No seu Mac, no diretório do projeto local
cd ~/Documents/HOLDWallet

git remote add droplet ssh://root@SEU_IP_DROPLET/var/repos/holdwallet.git

# Verificar
git remote -v
# Deve mostrar:
# origin    https://github.com/ag3developer/HOLDWallet.git (fetch)
# droplet   ssh://root@SEU_IP_DROPLET/var/repos/holdwallet.git (fetch)
```

### Passo 5: Fazer primeiro push

```bash
# No seu Mac
git push droplet main

# Ou se branch for diferente
git push droplet seu-branch-name
```

**Pronto!** Agora cada `git push droplet` envia código automaticamente para o Droplet!

---

## ✅ DEPOIS DO CLONE/DEPLOY

### Passo A: Configurar dependências

```bash
# SSH para Droplet
ssh root@SEU_IP_DROPLET

# Entrar no repositório
cd /home/holdwallet/APP-HOLDWALLET
```

### Passo B: Instalar dependências Backend

```bash
cd backend

# Criar virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Instalar pacotes
pip install --upgrade pip
pip install -r requirements.txt
```

### Passo C: Instalar dependências Frontend

```bash
cd ../Frontend

# Instalar dependências
npm install

# Compilar para produção
npm run build
```

### Passo D: Copiar Frontend para Nginx

```bash
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

### Passo E: Criar arquivo .env.production

```bash
cd /home/holdwallet/APP-HOLDWALLET/backend
nano .env.production
```

**Cole este template:**

```env
# ============== FASTAPI ==============
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://seu-dominio.com.br

# ============== DATABASE ==============
DATABASE_URL=postgresql://user:password@localhost:5432/holdwallet

# ============== JWT/AUTH ==============
SECRET_KEY=gere-uma-chave-aleatoria-super-segura-aqui
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# ============== TRANSFBANK ==============
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-aqui
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret

# ============== BLOCKCHAIN ==============
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-id
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
BITCOIN_NETWORK=mainnet

# ============== SMTP (Email) ==============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app

# ============== URLs PÚBLICAS ==============
FRONTEND_URL=https://seu-dominio.com.br
BACKEND_URL=https://api.seu-dominio.com.br
```

**Salvar:** Ctrl+X, Y, Enter

### Passo F: Iniciar Backend com Systemd

```bash
# Criar service file
sudo nano /etc/systemd/system/holdwallet-backend.service
```

**Cole:**

```ini
[Unit]
Description=HOLDWallet Backend API
After=network.target

[Service]
Type=notify
User=holdwallet
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
```

```bash
# Ativar
sudo systemctl daemon-reload
sudo systemctl enable holdwallet-backend
sudo systemctl start holdwallet-backend

# Verificar
sudo systemctl status holdwallet-backend
```

---

## 🧪 TESTAR DEPLOY

### Teste 1: Frontend

Abra no navegador:

```
https://seu-dominio.com
```

Deve ver a página inicial do HOLD Wallet.

### Teste 2: API Health

```bash
curl https://seu-dominio.com/api/v1/health
```

Deve retornar:

```json
{ "status": "ok" }
```

### Teste 3: Logs

```bash
# Ver logs do backend
sudo journalctl -u holdwallet-backend -f

# Ver logs do nginx
tail -f /var/log/nginx/error.log
```

---

## 🔄 PARA ATUALIZAR CÓDIGO (Depois de mudanças)

### Se usou Git Clone:

```bash
cd /home/holdwallet/APP-HOLDWALLET
git pull origin main
npm run build (se mudou frontend)
sudo systemctl restart holdwallet-backend
```

### Se usou Bare Repository:

No seu **Mac**:

```bash
cd ~/seu-projeto
git push droplet main
```

**Automático!** O hook `post-receive` já faz tudo.

---

## 🆘 TROUBLESHOOTING

### Erro: "Permission denied (publickey)"

```bash
# Adicione sua SSH key ao Droplet
# No seu Mac:
cat ~/.ssh/id_rsa.pub | ssh root@SEU_IP_DROPLET "cat >> ~/.ssh/authorized_keys"
```

### Erro: "Repository not found"

- Verifique se repositório é público ou requer token
- Se privado, use: `git clone https://token:x-oauth-basic@github.com/ag3developer/APP-HOLDWALLET.git`

### Erro: "Port 8000 already in use"

```bash
# Verificar o que está usando a porta
sudo lsof -i :8000

# Matar processo
sudo kill -9 PID
```

### Backend não inicia

```bash
# Ver erro completo
sudo systemctl status holdwallet-backend -l

# Ver logs
sudo journalctl -u holdwallet-backend -n 100
```

### Frontend não carrega

```bash
# Verificar se arquivos estão em /var/www/html
ls -la /var/www/html

# Verificar permissões
sudo chown -R www-data:www-data /var/www/html
```

---

## 📊 RESUMO DOS COMANDOS

| Ação                    | Comando                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **Conectar ao Droplet** | `ssh root@SEU_IP`                                                                                     |
| **Clonar repo**         | `git clone https://github.com/ag3developer/APP-HOLDWALLET.git`                                        |
| **Instalar backend**    | `cd backend && python3.9 -m venv venv && source venv/bin/activate && pip install -r requirements.txt` |
| **Instalar frontend**   | `cd Frontend && npm install && npm run build`                                                         |
| **Iniciar backend**     | `sudo systemctl start holdwallet-backend`                                                             |
| **Ver logs backend**    | `sudo journalctl -u holdwallet-backend -f`                                                            |
| **Atualizar código**    | `git pull origin main` (clone) ou `git push droplet main` (bare)                                      |

---

## ✨ PRÓXIMOS PASSOS

1. ✅ Clone/Deploy do código
2. ✅ Instalar dependências
3. ✅ Configurar `.env.production`
4. ✅ Iniciar serviços
5. 👉 Configurar domínio DNS
6. 👉 Configurar SSL/HTTPS (Certbot)
7. 👉 Configurar TransfBank webhooks
8. 👉 Testar fluxo completo de pagamento

---

## 💬 QUAL OPÇÃO ESCOLHER?

| Cenário                                    | Recomendação                         |
| ------------------------------------------ | ------------------------------------ |
| **Primeiro deploy, quer fazer uma vez**    | ➜ Opção 1 (Git Clone)                |
| **Vai atualizar código frequentemente**    | ➜ Opção 2 (Bare Repository)          |
| **Múltiplos ambientes (dev/prod/staging)** | ➜ Opção 2 com múltiplos repositórios |

---

_Guia de Deploy Git - Dezembro 2025_
