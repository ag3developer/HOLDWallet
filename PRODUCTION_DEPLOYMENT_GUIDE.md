# 🚀 Guia de Deploy em Produção - HOLD Wallet

## 📋 Checklist de Configuração

### Backend (Python/FastAPI)

#### 1. **Preparar Variáveis de Ambiente**

```bash
# Copiar e preencher as variáveis
cp backend/.env.example backend/.env.production
```

**Variáveis CRÍTICAS para produção:**

- ✅ `ENVIRONMENT=production`
- ✅ `DEBUG=false`
- ✅ `SECRET_KEY` - Chave forte e única
- ✅ `DATABASE_URL` - Apontando para BD de produção
- ✅ `ALLOWED_ORIGINS` - URLs do frontend autorizadas
- ✅ `JWT_EXPIRATION_HOURS` - Tempo de expiração do token
- ✅ `REDIS_URL` - Para cache e Celery
- ✅ RPC URLs - Endpoints de blockchain confirmados

#### 2. **Configurar Banco de Dados (DigitalOcean)**

```bash
# String de conexão fornecida:
DATABASE_URL=postgresql://doadmin:PASSWORD@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb

# Pontos importantes:
- Host: app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com
- Porta: 25060
- Banco: defaultdb
- Usuário: doadmin
- Requer SSL: Pode ser necessário adicionar ?ssl=require
```

#### 3. **Executar Migrations**

```bash
# No servidor de produção:
cd backend
python -m alembic upgrade head
```

#### 4. **Instalar Dependências**

```bash
pip install -r requirements.txt
```

#### 5. **Iniciar Backend (com Gunicorn/Uvicorn)**

```bash
# Opção 1: Uvicorn (recomendado para Vercel/Edge)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Opção 2: Gunicorn + Uvicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 6. **Configurar Redis (se necessário)**

```bash
# Verificar se Redis está rodando
redis-cli ping

# Ou usar Redis Cloud/ElastiCache
REDIS_URL=redis://username:password@host:port
```

---

### Frontend (React/Vite)

#### 1. **Preparar Variáveis de Ambiente**

```bash
# .env.production
NODE_ENV=production
VITE_API_URL=https://api.wolknow.com/api/v1
VITE_WS_URL=wss://api.wolknow.com/ws
VITE_APP_URL=https://hold-wallet-deaj.vercel.app
```

#### 2. **Build para Produção**

```bash
cd Frontend
npm install
npm run build
```

Isso irá gerar a pasta `dist/` com os arquivos otimizados.

#### 3. **Deploy no Vercel**

```bash
# Option 1: Via CLI
vercel deploy --prod --env VITE_API_URL=https://api.wolknow.com/api/v1

# Option 2: Via GitHub
# Conecte o repositório no Vercel e configure as env vars no dashboard
```

#### 4. **Configurar Environment Variables no Vercel**

No dashboard do Vercel:

1. Vá para `Settings > Environment Variables`
2. Adicione:
   - `VITE_API_URL`: `https://api.wolknow.com/api/v1`
   - `VITE_WS_URL`: `wss://api.wolknow.com/ws`
   - `VITE_APP_URL`: `https://hold-wallet-deaj.vercel.app`

---

## 🔒 Segurança em Produção

### 1. **CORS Configuration**

```typescript
// Backend deve aceitar:
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com
```

### 2. **HTTPS Obrigatório**

- ✅ Frontend: Vercel fornece automaticamente
- ✅ Backend: Usar certificado SSL/TLS (Let's Encrypt)
- ✅ WebSocket: Usar `wss://` (secure WebSocket)

### 3. **Secrets Seguros**

- 🔐 `SECRET_KEY` - Gerar com: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- 🔐 `JWT_ALGORITHM` - HS256 (HMAC) ou RS256 (RSA) para maior segurança
- 🔐 Banco de dados - Usar managed database com autenticação forte

### 4. **Headers de Segurança**

Frontend já tem CSP configurado em `index.html`:

```html
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
'unsafe-eval' https://static.cloudflareinsights.com; ...
```

---

## 📊 Monitoramento em Produção

### 1. **Logs**

```bash
# Ver logs no servidor
tail -f backend.log

# Log Level em produção: INFO
LOG_LEVEL=info
```

### 2. **Health Check**

```bash
# Endpoint disponível no backend
GET https://api.wolknow.com/health
```

### 3. **Métricas (Opcional)**

- Sentry para error tracking
- Datadog/NewRelic para performance
- CloudFlare Analytics para frontend

---

## 🧪 Testes Pré-Deploy

### 1. **Testar Backend Localmente com vars de produção**

```bash
ENVIRONMENT=production DEBUG=false npm run dev
```

### 2. **Testar CORS**

```bash
curl -H "Origin: https://hold-wallet-deaj.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.wolknow.com/api/v1/auth/login -v
```

### 3. **Testar Login**

```bash
curl -X POST https://api.wolknow.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
```

---

## 📝 Variáveis de Ambiente - Resumo

### Backend (.env.production)

```env
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://doadmin:PASSWORD@...
SECRET_KEY=EQdrBj2LpJJA2_PQRQzR14q75V50mc3m10dJVriqr7Q
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com
FRONTEND_URL=https://hold-wallet-deaj.vercel.app
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
REDIS_URL=redis://localhost:6379/0
ROOT_PATH=v1
```

### Frontend (.env.production)

```env
NODE_ENV=production
VITE_API_URL=https://api.wolknow.com/api/v1
VITE_WS_URL=wss://api.wolknow.com/ws
VITE_APP_URL=https://hold-wallet-deaj.vercel.app
VITE_ENABLE_ANALYTICS=true
```

---

## ⚡ Troubleshooting Comum

### "Network error: No response from server"

- [ ] Backend está rodando?
- [ ] CORS está configurado corretamente?
- [ ] Database está acessível?
- [ ] PORT está exposto (não bloqueado por firewall)?

### "401 Unauthorized"

- [ ] JWT_SECRET_KEY está correto?
- [ ] Token expirou? (verifique JWT_EXPIRATION_HOURS)
- [ ] Token tem formato correto? (Bearer <token>)

### "403 Forbidden"

- [ ] Origin está na whitelist ALLOWED_ORIGINS?
- [ ] Certificado SSL é válido?

---

## 🔄 CI/CD Sugestão

### GitHub Actions para Deploy Automático

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy Backend
        run: |
          git push heroku main

      - name: Deploy Frontend
        run: |
          vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

**⚠️ IMPORTANTE:** Nunca commitar arquivos `.env.production` com secrets reais. Use sistema de secrets do seu hosting (Vercel, Heroku, GitHub Secrets, etc).

**✅ Data de Última Atualização:** 14 de Dezembro de 2025
**✅ Status:** Pronto para Produção
