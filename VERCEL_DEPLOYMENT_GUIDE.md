# 🚀 DEPLOY FINAL - FRONTEND NO VERCEL + BACKEND NO DROPLET

## 📊 Arquitetura Final

```
┌─────────────────────────────────────────────────────┐
│                    USUÁRIO                          │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  ┌──────────────┐    ┌──────────────────┐
  │   VERCEL     │    │    DROPLET       │
  │  Frontend    │    │  Backend (API)   │
  │  React+TS    │───→│  FastAPI         │
  │ .vercel.json │    │  Port 8000       │
  │              │    │  164.92.155.222  │
  └──────────────┘    └──────────────────┘
```

---

## 🎯 PASSO 1: Preparar Frontend para Vercel

### 1.1 Criar arquivo `vercel.json`

Crie na **raiz** de `/Frontend`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@react_app_api_url"
  }
}
```

### 1.2 Criar arquivo `.env.local` (Vercel)

Crie na **raiz** de `/Frontend`:

```
REACT_APP_API_URL=http://164.92.155.222
```

### 1.3 Criar `.env.production` (Para build)

Crie na **raiz** de `/Frontend`:

```
REACT_APP_API_URL=http://164.92.155.222
```

### 1.4 Atualizar `package.json`

Verifique se tem estas linhas:

```json
{
  "name": "holdwallet-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9",
    "typescript": "^5.0.2"
  }
}
```

---

## 📤 PASSO 2: Deploy no Vercel

### 2.1 Conectar GitHub ao Vercel

1. Acesse https://vercel.com/
2. Clique **Sign Up** → **Continue with GitHub**
3. Autorize o Vercel a acessar seu GitHub
4. Você será redirecionado para o dashboard

### 2.2 Importar Projeto

1. Clique **Add New** → **Project**
2. Selecione seu repositório `HOLDWallet` (ou `ag3developer/HOLDWallet`)
3. Clique **Import**

### 2.3 Configurar Build

Na tela de configuração do Vercel:

**Project Name:** `holdwallet-frontend`

**Framework Preset:** Vite (ou detect automático)

**Root Directory:** `Frontend/` (ou deixar vazio se estiver na raiz)

**Build Command:** `npm run build`

**Output Directory:** `build`

**Environment Variables:**

```
REACT_APP_API_URL = http://164.92.155.222
```

Clique **Deploy**!

### 2.4 Após Deploy

Você terá:

- ✅ URL do Vercel: `https://holdwallet-frontend.vercel.app`
- ✅ Build automático a cada push no GitHub
- ✅ Certificado SSL grátis
- ✅ CDN global

---

## 🔧 PASSO 3: Configurar Backend no Droplet

### 3.1 Atualizar `.env.production` no Droplet

```bash
ssh root@164.92.155.222 'nano /home/holdwallet/APP-HOLDWALLET/backend/.env.production'
```

Mude para:

```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:///./holdwallet.db

# ✨ NOVO: Permitir Vercel como origem
ALLOWED_ORIGINS=https://holdwallet-frontend.vercel.app,http://localhost:3000,http://164.92.155.222

SECRET_KEY=sua-chave-secreta-aqui
JWT_ALGORITHM=HS256
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sua-chave
TRANSFBANK_WEBHOOK_SECRET=seu-webhook
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/seu-key
POLYGON_RPC_URL=https://polygon-rpc.com
FRONTEND_URL=https://holdwallet-frontend.vercel.app
BACKEND_URL=http://164.92.155.222
```

### 3.2 Restart Backend

```bash
ssh root@164.92.155.222 'systemctl restart holdwallet'
```

---

## 🌐 PASSO 4: Configurar CORS Corretamente

### No Backend (`backend/app/main.py`)

Adicione:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... resto do código ...
```

---

## 💻 PASSO 5: Atualizar URLs no Frontend

### No React/TypeScript

Crie `src/config/api.ts`:

```typescript
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const api = {
  baseURL: API_URL,
  endpoints: {
    health: `${API_URL}/api/v1/health`,
    auth: {
      login: `${API_URL}/api/v1/auth/login`,
      signup: `${API_URL}/api/v1/auth/signup`,
    },
    // ... outros endpoints ...
  },
};

export default api;
```

Use em seus componentes:

```typescript
import api from "../config/api";

// Exemplo
const response = await fetch(api.endpoints.auth.login, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

---

## ✅ CHECKLIST FINAL

```
FRONTEND (VERCEL):
  [ ] Criar vercel.json
  [ ] Criar .env.local
  [ ] Criar .env.production
  [ ] Atualizar package.json
  [ ] Push para GitHub
  [ ] Conectar Vercel
  [ ] Configurar env vars no Vercel
  [ ] Deploy automático
  [ ] Testar em https://holdwallet-frontend.vercel.app

BACKEND (DROPLET):
  [ ] Atualizar ALLOWED_ORIGINS no .env.production
  [ ] Adicionar CORSMiddleware no FastAPI
  [ ] Atualizar FRONTEND_URL e BACKEND_URL
  [ ] Restart service
  [ ] Testar comunicação API

INTEGRAÇÃO:
  [ ] Frontend conecta em backend (164.92.155.222)
  [ ] CORS funcionando
  [ ] Auth token funciona
  [ ] APIs retornam dados
```

---

## 🔗 URLS FINAIS

| Componente           | URL                                    |
| -------------------- | -------------------------------------- |
| **Frontend**         | https://holdwallet-frontend.vercel.app |
| **Backend**          | http://164.92.155.222                  |
| **API**              | http://164.92.155.222/api/v1           |
| **Documentação API** | http://164.92.155.222/docs             |

---

## 🎯 PRÓXIMOS PASSOS

1. **Preparar Frontend** (criar arquivos acima)
2. **Push para GitHub**
3. **Conectar Vercel**
4. **Configurar Backend CORS**
5. **Testar integração**

---

## ⚡ VANTAGENS DESSA ARQUITETURA

✅ **Frontend no Vercel:**

- Deploy automático a cada push
- CDN global (rápido)
- SSL grátis
- Sem custo adicional

✅ **Backend no Droplet:**

- Controle total
- Banco de dados local
- Webhooks TransfBank
- $12/mês apenas

**TOTAL:** $12/mês (apenas Droplet!)

---

Quer que eu prepare os arquivos agora?
