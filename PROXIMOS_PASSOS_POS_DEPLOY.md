# 🚀 PRÓXIMOS PASSOS - PÓS DEPLOY

**Status:** Após o deploy estar completo (quando ver ✅ DEPLOY PRONTO!)

---

## 📋 CHECKLIST GERAL

- [ ] Deploy completado com sucesso
- [ ] Acessar aplicação em http://164.92.155.222
- [ ] Configurar variáveis de ambiente (.env.production)
- [ ] Testar conexão com API
- [ ] Configurar TransfBank
- [ ] Testar fluxo de pagamento
- [ ] Configurar domínio customizado (opcional)
- [ ] Ativar SSL/HTTPS (recomendado)
- [ ] Monitorar logs e performance

---

## ⚡ PASSO 1: VERIFICAR SE DEPLOY FOI SUCESSO

### 1.1 - Acessar a aplicação no navegador

```
http://164.92.155.222
```

Você deve ver a página inicial do HOLD Wallet carregando.

### 1.2 - Verificar status dos serviços

No console do Droplet, execute:

```bash
# Verificar status do backend
systemctl status holdwallet

# Ver últimas linhas do log
journalctl -u holdwallet -n 50

# Verificar se Nginx está rodando
systemctl status nginx

# Verificar porta 8000 (backend)
ss -tlnp | grep 8000
```

**Você deve ver:**

- ✅ `holdwallet.service` → `active (running)`
- ✅ `nginx` → `active (running)`
- ✅ Escutando em `127.0.0.1:8000`

### 1.3 - Teste rápido de API

```bash
# Testar endpoint de saúde
curl http://164.92.155.222/api/v1/health

# Resposta esperada:
# {"status":"ok","timestamp":"2025-12-14T..."}
```

---

## 🔐 PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 2.1 - Editar .env.production

No Droplet, abra o arquivo de configuração:

```bash
ssh root@164.92.155.222
nano /home/holdwallet/APP-HOLDWALLET/backend/.env.production
```

### 2.2 - Campos CRÍTICOS a configurar

**1. Chaves de Segurança:**

```
SECRET_KEY=gera-uma-chave-aleatoria-segura-com-32-caracteres
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

Gere uma chave segura com:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**2. Configuração TransfBank:**

```
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave-da-transfbank
TRANSFBANK_WEBHOOK_SECRET=seu-webhook-secret-transfbank
```

⚠️ **OBTENHA ESSAS CHAVES:**

- Acesse https://www.transfbank.com.br
- Faça login na conta comercial
- Vá para Configurações → API → Gere as chaves
- Salve num arquivo seguro

**3. Blockchain RPC URLs:**

```
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/ADICIONE-SUA-CHAVE-INFURA
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
BITCOIN_NETWORK=mainnet
```

Obtenha chave Infura:

- Acesse https://infura.io
- Crie conta gratuita
- Gere API Key para Ethereum Mainnet

**4. SMTP para emails:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app-específica
```

Para Gmail:

- Ative 2FA
- Gere senha de aplicativo em https://myaccount.google.com/apppasswords
- Use essa senha (não a senha normal)

**5. URLs Públicas:**

```
ALLOWED_ORIGINS=http://164.92.155.222
FRONTEND_URL=http://164.92.155.222
BACKEND_URL=http://164.92.155.222
```

Depois com domínio:

```
ALLOWED_ORIGINS=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://api.seu-dominio.com
```

### 2.3 - Salvar e aplicar mudanças

```bash
# Pressione Ctrl+X, depois Y, depois Enter para salvar no nano

# Reiniciar o serviço para carregar novas variáveis
systemctl restart holdwallet

# Verificar se iniciou sem erros
journalctl -u holdwallet -n 20
```

---

## 💰 PASSO 3: TESTAR FLUXO DE PAGAMENTO TRANSFBANK

### 3.1 - Estrutura de um pagamento TransfBank

```
┌─────────────────────────────────────────┐
│  USUÁRIO CRIA ORDEM DE COMPRA            │
│  (Ex: Comprar R$ 100 em USDT)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  BACKEND GERA DADOS BANCÁRIOS           │
│  - Chave Pix                            │
│  - Ou Dados Bancários TransfBank        │
│  - Validação por 15 minutos             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  USUÁRIO FAZ TRANSFERÊNCIA BANCÁRIA     │
│  (Para a chave/conta gerada)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  WEBHOOK TRANSFBANK NOTIFICA             │
│  - Confirmação de pagamento             │
│  - Valor recebido                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  BACKEND EXECUTA LIBERAÇÃO              │
│  - Transfere cripto para carteira user  │
│  - Atualiza ordem status                │
│  - Envia confirmação email              │
└─────────────────────────────────────────┘
```

### 3.2 - Teste Manual de Criação de Ordem

**Via API (usando cURL):**

```bash
# 1. Fazer login (obter token)
curl -X POST http://164.92.155.222/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@example.com",
    "password": "sua-senha"
  }'

# Resposta:
# {"access_token": "eyJ...", "user_id": "..."}

# 2. Criar ordem de compra
TOKEN="cole-o-token-recebido-acima"

curl -X POST http://164.92.155.222/api/v1/orders/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "USDT",
    "amount": 100.00,
    "currency": "BRL",
    "payment_method": "transfbank"
  }'

# Resposta esperada:
# {
#   "order_id": "ORD-...",
#   "status": "awaiting_payment",
#   "bank_data": {
#     "chave_pix": "...",
#     "valor": 100.00,
#     "expira_em": "2025-12-14T10:15:00"
#   }
# }

# 3. Cria um teste de pagamento
curl -X POST http://164.92.155.222/api/v1/orders/ORD-.../simulate_payment \
  -H "Authorization: Bearer $TOKEN"

# O backend simulará recebimento e liberará os ativos
```

**Via Interface (melhor para teste):**

1. Acesse http://164.92.155.222
2. Crie uma conta ou faça login
3. Vá para "Comprar Criptomoedas"
4. Selecione TransfBank como método
5. Confirme a ordem
6. Você verá os dados bancários para transferência

### 3.3 - Verificar Logs de Pagamento

```bash
# Ver logs de transações
ssh root@164.92.155.222
journalctl -u holdwallet -f | grep -i payment

# Ver banco de dados de ordens
sqlite3 /home/holdwallet/APP-HOLDWALLET/backend/holdwallet.db
> SELECT order_id, status, amount, currency FROM orders LIMIT 5;
> .exit
```

---

## 🌐 PASSO 4: CONFIGURAR DOMÍNIO CUSTOMIZADO (OPCIONAL)

### 4.1 - Registrar domínio

1. Compre domínio em (Namecheap, GoDaddy, etc)
2. Aponte para o IP: **164.92.155.222**

### 4.2 - Configurar DNS

**Em seu registrador de domínio:**

```
Tipo: A
Nome: @
Valor: 164.92.155.222
TTL: 3600
```

Para API (se quiser subdomain):

```
Tipo: A
Nome: api
Valor: 164.92.155.222
TTL: 3600
```

### 4.3 - Atualizar Nginx

```bash
ssh root@164.92.155.222
nano /etc/nginx/sites-available/holdwallet
```

Altere a linha:

```nginx
# DE:
server_name _;

# PARA:
server_name seu-dominio.com www.seu-dominio.com;
```

Salve e reinicie:

```bash
nginx -t
systemctl restart nginx
```

### 4.4 - Atualizar .env.production

```bash
nano /home/holdwallet/APP-HOLDWALLET/backend/.env.production
```

Altere:

```
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://seu-dominio.com
```

Reinicie:

```bash
systemctl restart holdwallet
```

---

## 🔒 PASSO 5: ATIVAR SSL/HTTPS (RECOMENDADO)

### 5.1 - Instalar Certbot

```bash
ssh root@164.92.155.222

apt install -y certbot python3-certbot-nginx
```

### 5.2 - Gerar certificado

```bash
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Responda:

- Email: seu-email@example.com
- Aceite termos (A)
- Compartilhar email? (N)

### 5.3 - Verificar renovação automática

```bash
systemctl status certbot.timer

# Deve estar "active"
```

### 5.4 - Atualizar URLs no .env

```bash
nano /home/holdwallet/APP-HOLDWALLET/backend/.env.production
```

Altere:

```
ALLOWED_ORIGINS=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://seu-dominio.com
```

Reinicie:

```bash
systemctl restart holdwallet
```

---

## 📊 PASSO 6: MONITORAR PERFORMANCE

### 6.1 - Ver uso de recursos

```bash
# CPU e Memória em tempo real
htop

# Ver uso de disco
df -h

# Ver uso de memória detalhado
free -h

# Ver consumo da aplicação
ps aux | grep uvicorn
```

**⚠️ Alertas para 2GB Droplet:**

- Memória > 80% = considerar upgrade
- Disco > 85% = limpar logs antigos

### 6.2 - Ver logs em tempo real

```bash
# Backend
journalctl -u holdwallet -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Sistema
dmesg | tail -20
```

### 6.3 - Verificar status de erros

```bash
# Contar erros por tipo
journalctl -u holdwallet | grep ERROR | wc -l

# Ver últimos 100 erros
journalctl -u holdwallet -p err -n 100
```

---

## 🔧 PASSO 7: TROUBLESHOOTING COMUM

### Problema: Backend não inicia

```bash
# Verificar erro
journalctl -u holdwallet -n 50

# Testar manualmente
cd /home/holdwallet/APP-HOLDWALLET/backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Se erro de importação = pip install -r requirements.txt
# Se erro de banco de dados = verificar permissões de arquivo
# Se erro de porta = outra app usando 8000
```

### Problema: Frontend não carrega

```bash
# Verificar arquivos estão presentes
ls -la /var/www/html/

# Recompilar
cd /home/holdwallet/APP-HOLDWALLET/Frontend
npm run build
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html/

# Reiniciar Nginx
systemctl restart nginx
```

### Problema: Pagamentos não funcionam

```bash
# 1. Verificar chaves de API
grep TRANSFBANK /home/holdwallet/APP-HOLDWALLET/backend/.env.production

# 2. Testar conexão com TransfBank
curl -H "Authorization: Bearer CHAVE" \
  https://api.transfbank.com.br/v1/accounts

# 3. Ver logs de webhook
journalctl -u holdwallet | grep webhook
```

### Problema: Certificado SSL expirou

```bash
# Renovar manualmente
certbot renew

# Ver próxima renovação
certbot renew --dry-run
```

---

## 📈 PASSO 8: UPGRADES E OTIMIZAÇÕES

### 8.1 - Se Memória está baixa (< 100MB livre)

**Opção 1: Upgrade Droplet**

```bash
# No painel DigitalOcean: Power Off → Resize → 4GB ou superior
# Reboot necessário: ~2 minutos de downtime
```

**Opção 2: Otimizar aplicação**

```bash
# Reduzir workers de 2 para 1 temporariamente
nano /etc/systemd/system/holdwallet.service

# Mude:
# ExecStart=... --workers 2
# Para:
# ExecStart=... --workers 1

systemctl daemon-reload
systemctl restart holdwallet
```

### 8.2 - Se CPU está acelerada (> 80%)

```bash
# Aumentar cache do Nginx
nano /etc/nginx/sites-available/holdwallet

# Adicione antes de server block:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

# E dentro de location /api/:
proxy_cache my_cache;
proxy_cache_valid 200 10m;
```

### 8.3 - Ativar compressão Gzip

```bash
nano /etc/nginx/sites-available/holdwallet

# Adicione dentro do server block:
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types text/plain text/css text/xml text/javascript
           application/x-javascript application/xml+rss;
```

Salve e reinicie:

```bash
systemctl restart nginx
```

---

## 🎯 CHECKLIST FINAL

```
✅ Deploy completado
  └─ [ ] Acessar http://164.92.155.222
  └─ [ ] Ver "Welcome to HOLD Wallet"

✅ Configuração
  └─ [ ] .env.production preenchido com chaves reais
  └─ [ ] TransfBank API key validada
  └─ [ ] SMTP configurado
  └─ [ ] RPC URLs funcionando

✅ Testes
  └─ [ ] API /health respondendo
  └─ [ ] Login funcionando
  └─ [ ] Criar ordem de compra funciona
  └─ [ ] Receber webhook de pagamento funciona
  └─ [ ] Liberação de cripto funciona

✅ Produção
  └─ [ ] Domínio apontando para Droplet
  └─ [ ] SSL/HTTPS ativado
  └─ [ ] Logs sendo monitorados
  └─ [ ] Backup de banco de dados configurado

✅ Receita
  └─ [ ] TransfBank pagando comissões
  └─ [ ] Dashboard mostrando faturamento
  └─ [ ] Primeiro cliente convertido
```

---

## 📞 SUPORTE RÁPIDO

**Comando para ver tudo em tempo real:**

```bash
# Terminal 1: Logs
ssh root@164.92.155.222
journalctl -u holdwallet -f

# Terminal 2: Recursos
ssh root@164.92.155.222
watch -n 1 'free -h && echo "---" && df -h'

# Terminal 3: Requisições
ssh root@164.92.155.222
tail -f /var/log/nginx/access.log
```

**Resetar para começar do zero:**

```bash
# CUIDADO: Isso deleta tudo!
ssh root@164.92.155.222
systemctl stop holdwallet
rm -rf /home/holdwallet/APP-HOLDWALLET
rm /var/www/html/*
systemctl start holdwallet
```

---

## 🎉 PARABÉNS!

Seu HOLD Wallet está **LIVE** e gerando receita através do TransfBank!

**Próximas metas:**

1. ✅ Aceitar pagamentos bancários
2. 🔜 Integrar mais gateways de pagamento (Stripe, Mercado Pago)
3. 🔜 Adicionar suporte a mais blockchains
4. 🔜 Implementar trading P2P com escrow
5. 🔜 Expandir para outros mercados

**Quer adicionar mais features?** Avise-me!
