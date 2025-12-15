# 🚀 Configuração de Produção - HOLD Wallet

## Backend - Variáveis de Ambiente

Arquivo: `backend/.env.production`

Já foi criado com as seguintes variáveis:

```
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info

DATABASE_URL=postgresql://doadmin:PASSWORD@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb

SECRET_KEY=EQdrBj2LpJJA2_PQRQzR14q75V50mc3m10dJVriqr7Q
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app

ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org

TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1

SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

ROOT_PATH=v1
```

⚠️ **TODO ANTES DE DEPLOY:**

- [ ] Substituir `PASSWORD` no DATABASE_URL com senha real
- [ ] Verificar e testar todas as RPC URLs
- [ ] Confirmar SECRET_KEY (ou gerar nova se necessário)
- [ ] Testar CORS com a URL do frontend
- [ ] Configurar Redis se não usar localhost

---

## Frontend - Variáveis de Ambiente

Arquivo: `Frontend/.env.production`

Já foi criado com:

```
NODE_ENV=production
VITE_API_URL=https://api.wolknow.com/api/v1
VITE_WS_URL=wss://api.wolknow.com/ws
VITE_APP_URL=https://hold-wallet-deaj.vercel.app
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

⚠️ **TODO ANTES DE DEPLOY:**

- [ ] Confirmar URLs estão corretas
- [ ] Se usar Sentry, adicionar token de projeto
- [ ] Testar build local: `npm run build`

---

## Checklist de Deploy

### 1. Backend (Server Python/FastAPI)

- [ ] Cópia `.env.production` para servidor
- [ ] Instalar dependências: `pip install -r requirements.txt`
- [ ] Executar migrations: `alembic upgrade head`
- [ ] Testar conexão banco de dados
- [ ] Iniciar servidor: `uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Verificar endpoints `/health`, `/auth/login`

### 2. Frontend (Vercel)

- [ ] Build local: `npm run build`
- [ ] Teste de build com vars de produção
- [ ] Deploy no Vercel
- [ ] Adicionar env vars no dashboard Vercel
- [ ] Testar login/acesso à aplicação
- [ ] Verificar console do navegador (buscar erros de CSP)

### 3. DNS & HTTPS

- [ ] Certificado SSL válido para api.wolknow.com
- [ ] Certificado SSL válido para wolknow.com
- [ ] CORS headers respondendo corretamente
- [ ] WebSocket secure (wss://) funcionando

### 4. Testes Finais

```bash
# Testar CORS
curl -H "Origin: https://hold-wallet-deaj.vercel.app" \
     -X OPTIONS https://api.wolknow.com/api/v1/auth/login -v

# Testar Login
curl -X POST https://api.wolknow.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'

# Testar Health
curl https://api.wolknow.com/api/v1/health
```

---

## Diferenças Development vs Production

| Item         | Development                  | Production                     |
| ------------ | ---------------------------- | ------------------------------ |
| VITE_API_URL | http://127.0.0.1:8000/api/v1 | https://api.wolknow.com/api/v1 |
| VITE_WS_URL  | ws://127.0.0.1:8000/ws       | wss://api.wolknow.com/ws       |
| DEBUG        | false                        | false                          |
| LOG_LEVEL    | debug                        | info                           |
| ENVIRONMENT  | development                  | production                     |

---

## Segurança

✅ Content Security Policy (CSP) já configurada em `Frontend/index.html`
✅ HTTPS obrigatório (Vercel + certificado backend)
✅ JWT com algoritmo seguro (HS256)
✅ CORS whitelist configurado
✅ Headers de segurança ativados

---

## Suporte & Debugging

Se houver erro **"Network error: No response from server"**:

1. Verificar se backend está rodando: `curl https://api.wolknow.com/health`
2. Verificar logs do backend: `tail -f backend.log`
3. Verificar CORS no navegador: F12 > Console > buscar erros CORS
4. Verificar firewall/security groups (porta 8000/443 liberada?)

---

**Data: 14 de Dezembro de 2025**
**Status: Pronto para Deploy**
