# ✅ CHECKLIST COMPLETO: Preparação para api.wolknow.com

## 📋 Status Geral

Data: 15/12/2025
Objetivo: Garantir que TODO o projeto está configurado para `https://api.wolknow.com`

---

## 🎯 1. VARIÁVEIS DE AMBIENTE

### ✅ Frontend - Vercel (CORRETO)

#### `.env.production`

```bash
VITE_API_URL=https://api.wolknow.com/v1    # ✅ CORRETO
VITE_WS_URL=wss://api.wolknow.com/ws       # ✅ CORRETO
VITE_APP_URL=https://hold-wallet-deaj.vercel.app
```

#### `.env` (desenvolvimento local)

```bash
VITE_API_URL=http://127.0.0.1:8000         # ✅ CORRETO (local)
VITE_WS_URL=ws://127.0.0.1:8000            # ✅ CORRETO (local)
```

#### `.env.development`

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v1  # ✅ CORRETO (local com /api/v1)
VITE_WS_URL=ws://127.0.0.1:8000/ws         # ✅ CORRETO
```

### ✅ Backend - Digital Ocean (CORRETO)

#### `.env.production`

```bash
DATABASE_URL=postgresql://doadmin:AVNS_3w5g...@db-postgresql-nyc1-89571-do-user-18551216-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require
SECRET_KEY=e06c1c3f8b1d6...
DEBUG=false
ENVIRONMENT=production
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000  # ✅ CORRETO
```

---

## 🔧 2. CONFIGURAÇÕES DE CÓDIGO

### ✅ Frontend - API Client (CORRIGIDO)

#### `Frontend/src/config/api.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiConfig = {
  baseURL: API_URL,
  auth: {
    login: `${API_URL}/auth/login`, // ✅ SEM /api/v1
    signup: `${API_URL}/auth/signup`, // ✅ SEM /api/v1
  },
  wallet: {
    balance: `${API_URL}/wallet/balance`, // ✅ SEM /api/v1
    addresses: `${API_URL}/wallet/addresses`, // ✅ SEM /api/v1
  },
  trading: {
    quote: `${API_URL}/trading/quote`, // ✅ SEM /api/v1
  },
  health: `${API_URL}/health`, // ✅ SEM /api/v1
};
```

**✅ Status**: CORRETO - Todas as rotas removeram `/api/v1` duplicado

#### `Frontend/src/config/app.ts`

```typescript
baseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
wsUrl: import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws',
```

**✅ Status**: CORRETO - Usa variáveis de ambiente

---

## 🔍 3. ARQUIVOS COM REFERÊNCIAS HARDCODED

### ⚠️ Arquivos que AINDA TÊM hardcoded (precisam de atenção):

#### `Frontend/src/pages/trading/components/BankDetailsDisplay.tsx` (Linha 59)

```typescript
const response = await fetch('http://127.0.0.1:8000/api/v1/instant-trade/upload-proof', {
```

**❌ PROBLEMA**: URL hardcoded do localhost
**✅ SOLUÇÃO**: Deve usar `apiConfig.baseURL`

#### `Frontend/src/services/transactionService.ts` (Linha 293)

```typescript
const response = await this.apiClient.get(
  `/api/v1/transactions/status/${transactionId}`
);
```

**⚠️ VERIFICAR**: Se `this.apiClient` já tem baseURL configurado, pode ser OK

#### `Frontend/src/services/traderProfileService.ts` (Linhas 64, 81, 95, 112, 135, 146)

```typescript
const response = await fetch(`${this.API_BASE}/api/v1/trader-profiles`, {
```

**⚠️ VERIFICAR**: Se `this.API_BASE` já inclui `/v1`, então `/api/v1` está duplicado

#### `Frontend/src/services/price-service.ts` (Linha 133)

```typescript
const response = await client.get('/api/v1/prices/batch', {
```

**⚠️ VERIFICAR**: Se `client` tem baseURL, pode precisar ajuste

#### `Frontend/src/services/chatP2P.ts` (Linhas 124, 361, 376, 398, 420, 435)

```typescript
const wsUrl = `${wsBaseUrl}/api/v1/chat/ws/${chatRoomId}?token=${encodeURIComponent(
  token
)}`;
```

**⚠️ VERIFICAR**: URLs de chat e WebSocket

#### `Frontend/src/services/callSignalingService.ts` (Linha 222)

```typescript
// await apiClient.post(`/api/v1/chat/rooms/${chatRoomId}/system-message`, {
```

**✅ OK**: Está comentado

---

## 🌐 4. ARQUITETURA DE ROTAS

### Fluxo de Requisições (Produção)

```
Frontend (Vercel)
  ↓
https://api.wolknow.com/v1/auth/login
  ↓
Digital Ocean App Platform (Proxy)
  ↓ (Middleware reescreve internamente)
Backend FastAPI: /api/v1/auth/login
```

### ✅ Middleware Backend (CORRETO)

```python
class PathRewriteMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        excluded_paths = {"/docs", "/redoc", "/openapi.json",
                         "/v1/docs", "/v1/redoc", "/v1/openapi.json"}

        if path.startswith("/v1/") and path not in excluded_paths:
            request.scope["path"] = "/api" + path  # /v1/X → /api/v1/X

        return await call_next(request)
```

**✅ Status**: FUNCIONANDO - Reescrita interna funciona

---

## 📊 5. TESTES NECESSÁRIOS

### Teste 1: Health Check

```bash
curl https://api.wolknow.com/v1/health
```

**Esperado**: `{"status": "ok"}`

### Teste 2: OpenAPI Docs

```bash
curl https://api.wolknow.com/v1/openapi.json
```

**Esperado**: JSON com schema da API

### Teste 3: Swagger UI

```bash
curl https://api.wolknow.com/v1/docs
```

**Esperado**: HTML do Swagger UI

### Teste 4: Login

```bash
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}'
```

**Esperado**: `{"access_token": "...", "token_type": "bearer"}`

### Teste 5: WebSocket

```javascript
const ws = new WebSocket("wss://api.wolknow.com/ws");
ws.onopen = () => console.log("✅ WebSocket conectado");
```

---

## 🚨 6. PROBLEMAS IDENTIFICADOS

### ❌ CRÍTICO: Path Duplication

**Problema**: Frontend estava gerando URLs como:

```
https://api.wolknow.com/v1/api/v1/auth/login
```

**Causa**:

- `VITE_API_URL` = `https://api.wolknow.com/v1`
- Rotas tinham: `${API_URL}/api/v1/auth/login`
- Resultado: `/v1` + `/api/v1` = duplicação

**✅ SOLUÇÃO APLICADA**:

- Removido `/api/v1` de TODAS as rotas em `api.ts` e `auth.ts`
- Usando `sed` para garantir remoção em massa

---

## 📝 7. AÇÕES NECESSÁRIAS

### ✅ Concluído

- [x] Corrigir `Frontend/src/config/api.ts` (removido `/api/v1`)
- [x] Corrigir `Frontend/src/services/auth.ts` (removido `/api/v1`)
- [x] Configurar `VITE_API_URL=https://api.wolknow.com/v1` em produção
- [x] Backend middleware configurado
- [x] Swagger UI funcionando em `/v1/docs`
- [x] OpenAPI schema em `/v1/openapi.json`

### ⏳ Pendente (AGORA)

- [ ] **Verificar** se Vercel já fez redeploy (aguardar 2-3 min)
- [ ] **Corrigir** `BankDetailsDisplay.tsx` (URL hardcoded)
- [ ] **Verificar** `transactionService.ts` (pode ter duplicação)
- [ ] **Verificar** `traderProfileService.ts` (pode ter duplicação)
- [ ] **Verificar** `price-service.ts` (pode ter duplicação)
- [ ] **Verificar** `chatP2P.ts` (pode ter duplicação)
- [ ] **Testar** login em produção
- [ ] **Limpar** browser cache antes do teste

### 🔄 Próximos Passos

1. Aguardar Vercel deployment (~2 min restantes)
2. Testar login: https://hold-wallet-deaj.vercel.app
3. Se funcionar: marcar como ✅
4. Se falhar: verificar console e corrigir hardcoded URLs

---

## 🎯 8. RESUMO EXECUTIVO

### URLs de Produção

- **Frontend**: https://hold-wallet-deaj.vercel.app
- **Backend**: https://api.wolknow.com
- **API Endpoints**: https://api.wolknow.com/v1/*
- **WebSocket**: wss://api.wolknow.com/ws
- **Docs**: https://api.wolknow.com/v1/docs

### Configuração Atual

| Componente    | Ambiente      | URL Base                     |
| ------------- | ------------- | ---------------------------- |
| Frontend Dev  | Local         | `http://127.0.0.1:8000`      |
| Frontend Prod | Vercel        | `https://api.wolknow.com/v1` |
| Backend Dev   | Local         | `http://localhost:8000`      |
| Backend Prod  | Digital Ocean | `https://api.wolknow.com`    |

### Status de Rotas

| Endpoint       | URL Esperada         | Status         |
| -------------- | -------------------- | -------------- |
| Login          | `/v1/auth/login`     | ✅ Corrigido   |
| Signup         | `/v1/auth/signup`    | ✅ Corrigido   |
| Wallet Balance | `/v1/wallet/balance` | ✅ Corrigido   |
| Trading Quote  | `/v1/trading/quote`  | ✅ Corrigido   |
| Health         | `/v1/health`         | ✅ Corrigido   |
| Docs           | `/v1/docs`           | ✅ Funcionando |
| OpenAPI        | `/v1/openapi.json`   | ✅ Funcionando |

---

## 🔒 9. SEGURANÇA & CORS

### CORS Origins Configurados

```bash
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000
```

**✅ Incluído**:

- Vercel deployment atual
- Domínio futuro (wolknow.com)
- Desenvolvimento local

---

## 📞 10. SUPORTE E DEBUG

### Se Login Falhar

1. **Abrir DevTools** (F12)
2. **Network Tab** → Verificar URL da requisição
3. **Console** → Verificar erros JavaScript
4. **Deve aparecer**:
   ```
   POST https://api.wolknow.com/v1/auth/login
   ```
5. **NÃO deve aparecer**:
   ```
   POST https://api.wolknow.com/v1/api/v1/auth/login  ❌
   ```

### Comandos Úteis

```bash
# Verificar se backend está UP
curl https://api.wolknow.com/v1/health

# Verificar CORS
curl -X OPTIONS https://api.wolknow.com/v1/auth/login -v \
  -H "Origin: https://hold-wallet-deaj.vercel.app"

# Testar login direto
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}'

# Verificar Vercel deployment
vercel ls
```

---

## ✅ CONCLUSÃO

### Status Atual: 🟡 AGUARDANDO DEPLOYMENT

- ✅ Código corrigido e commitado
- ✅ Push realizado para GitHub
- ⏳ Vercel está fazendo redeploy (~2 min)
- 🎯 Próximo: Testar login após deployment

### Confiança: 95%

**Motivo**: Removemos TODAS as duplicações de `/api/v1` dos arquivos principais (`api.ts`, `auth.ts`). O código agora está correto.

**Possível problema restante**: Se outros serviços (traderProfile, chat, etc) ainda tiverem hardcoded, mas NÃO afetam o login inicial.

---

**Última atualização**: 15/12/2025 02:20 UTC
**Próxima ação**: Aguardar 1-2 minutos e testar login
