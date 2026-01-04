# 🔧 Guia de Configuração Multi-Ambiente (Local + Produção)

## 📋 Resumo

Este guia explica como configurar o projeto para funcionar simultaneamente em:

- **Desenvolvimento Local:** `localhost:8000` (backend) + `localhost:3000` (frontend)
- **Produção:** `https://api.wolknow.com/v1` (backend) + `https://wolknow.com` (frontend)

---

## 🎯 Como Funciona

### **Detecção Automática de Ambiente**

O arquivo `Frontend/src/config/api.ts` agora detecta automaticamente o ambiente:

```typescript
const isDevelopment = import.meta.env.MODE === "development";
const API_URL =
  import.meta.env.VITE_API_URL ||
  (isDevelopment ? "http://localhost:8000" : "https://api.wolknow.com/v1");
```

**Regras:**

1. Se `VITE_API_URL` está definida → usa essa URL
2. Se não está definida:
   - `MODE === 'development'` → `http://localhost:8000`
   - `MODE === 'production'` → `https://api.wolknow.com/v1`

---

## 🚀 Setup para Desenvolvimento Local

### **1. Configurar Backend (Python/FastAPI)**

```bash
# Terminal 1 - Backend
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

# Ativar ambiente virtual
source venv/bin/activate  # Mac/Linux
# ou
.\venv\Scripts\activate  # Windows

# Instalar dependências (se necessário)
pip install -r requirements.txt

# Rodar backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend estará em:** `http://localhost:8000`

- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

---

### **2. Configurar Frontend (Vite/React)**

```bash
# Terminal 2 - Frontend
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend

# Verificar .env.local
cat .env.local
# Deve ter: VITE_API_URL=http://localhost:8000

# Instalar dependências (se necessário)
npm install

# Rodar frontend
npm run dev
```

**Frontend estará em:** `http://localhost:3000`

---

### **3. Testar Comunicação**

Abra o navegador em `http://localhost:3000` e:

1. Abra DevTools (F12) → Console
2. Você verá:

```
🌍 API Environment: {
  mode: 'development',
  apiUrl: 'http://localhost:8000',
  isDevelopment: true
}
```

3. Tente fazer login
4. No DevTools → Network, veja se as requisições vão para `http://localhost:8000`

---

## 🌐 Ambientes Configurados

### **Ambiente 1: Desenvolvimento Local**

| Componente | URL                          | Como Iniciar                    |
| ---------- | ---------------------------- | ------------------------------- |
| Backend    | `http://localhost:8000`      | `uvicorn app.main:app --reload` |
| Frontend   | `http://localhost:3000`      | `npm run dev`                   |
| Docs API   | `http://localhost:8000/docs` | Automático                      |
| Database   | Local SQLite ou PostgreSQL   | Configurado em `.env`           |

**Arquivo:** `Frontend/.env.local`

```bash
VITE_API_URL=http://localhost:8000
```

---

### **Ambiente 2: Produção (Vercel + Digital Ocean)**

| Componente | URL                               | Deploy             |
| ---------- | --------------------------------- | ------------------ |
| Backend    | `https://api.wolknow.com/v1`      | Digital Ocean Apps |
| Frontend   | `https://wolknow.com`             | Vercel             |
| Docs API   | `https://api.wolknow.com/v1/docs` | Automático         |
| Database   | PostgreSQL (Digital Ocean)        | Gerenciado         |

**Configuração Vercel:**

- Ir em: https://vercel.com/seu-projeto/settings/environment-variables
- Adicionar: `VITE_API_URL=https://api.wolknow.com/v1`

---

## 🔄 Como Trocar Entre Ambientes

### **Opção 1: Usando .env.local (Recomendado)**

Edite `Frontend/.env.local`:

```bash
# Para local:
VITE_API_URL=http://localhost:8000

# Para produção:
# VITE_API_URL=https://api.wolknow.com/v1
```

**Reinicie o frontend:** `Ctrl+C` → `npm run dev`

---

### **Opção 2: Sobrescrever via Linha de Comando**

```bash
# Rodar contra backend local
npm run dev

# Rodar contra produção (teste)
VITE_API_URL=https://api.wolknow.com/v1 npm run dev
```

---

### **Opção 3: Múltiplos Arquivos .env**

Criar arquivos específicos:

**Frontend/.env.development**

```bash
VITE_API_URL=http://localhost:8000
```

**Frontend/.env.production**

```bash
VITE_API_URL=https://api.wolknow.com/v1
```

Vite carrega automaticamente baseado em `--mode`:

```bash
npm run dev          # Usa .env.development
npm run build        # Usa .env.production
npm run preview      # Usa .env.production
```

---

## 🧪 Testando Ambos os Ambientes

### **Teste 1: Backend Local + Frontend Local**

```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload

# Terminal 2
cd Frontend && npm run dev
```

Acesse: `http://localhost:3000`

---

### **Teste 2: Backend Produção + Frontend Local**

```bash
# Terminal 1
cd Frontend
echo "VITE_API_URL=https://api.wolknow.com/v1" > .env.local
npm run dev
```

Acesse: `http://localhost:3000` (mas chama API de produção)

⚠️ **Cuidado:** Seus dados de desenvolvimento vão para produção!

---

### **Teste 3: Backend Local + Frontend Produção**

**Não recomendado** (frontend em produção não pode acessar `localhost`)

Alternativa: Use ngrok ou túnel:

```bash
# Expor backend local para internet
ngrok http 8000

# Configurar frontend produção para usar URL do ngrok
# Ex: https://abc123.ngrok.io
```

---

## 📝 Checklist de Desenvolvimento

### **Antes de Começar a Desenvolver:**

- [ ] Backend rodando em `localhost:8000`
- [ ] Frontend rodando em `localhost:3000`
- [ ] `.env.local` configurado: `VITE_API_URL=http://localhost:8000`
- [ ] Console mostra: `apiUrl: 'http://localhost:8000'`
- [ ] Login funciona localmente

---

### **Antes de Fazer Deploy:**

- [ ] Testar localmente (ambos localhost)
- [ ] Commitar mudanças: `git add . && git commit -m "..."`
- [ ] Push para GitHub: `git push origin main`
- [ ] Aguardar deploys automáticos:
  - Vercel (frontend): ~2 minutos
  - Digital Ocean (backend): ~3 minutos
- [ ] Testar em produção: `https://wolknow.com`
- [ ] Verificar logs de erro no console

---

## 🐛 Problemas Comuns

### **Erro: "Network Error" ou "Failed to fetch"**

**Causa:** Frontend tentando acessar backend incorreto

**Solução:**

```bash
# 1. Verificar .env.local
cat Frontend/.env.local

# 2. Verificar console do navegador
# Deve mostrar: apiUrl: 'http://localhost:8000'

# 3. Reiniciar frontend
cd Frontend
npm run dev
```

---

### **Erro: CORS (Cross-Origin)**

**Causa:** Backend não permite requisições do frontend

**Solução:** Verificar `backend/.env` ou `backend/.env.production`:

```bash
ALLOWED_ORIGINS=http://localhost:3000,https://wolknow.com
```

---

### **Erro: "Cannot connect to localhost:8000"**

**Causa:** Backend não está rodando

**Solução:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Verifique: `http://localhost:8000/health`

---

## 📊 Fluxo de Trabalho Completo

### **Desenvolvimento → Produção**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DESENVOLVIMENTO LOCAL                                    │
├─────────────────────────────────────────────────────────────┤
│   Backend:  localhost:8000                                  │
│   Frontend: localhost:3000 → VITE_API_URL=localhost:8000   │
│                                                             │
│   ✓ Desenvolver features                                   │
│   ✓ Testar localmente                                      │
│   ✓ Debugar com console                                    │
└─────────────────────────────────────────────────────────────┘
                         ⬇️
┌─────────────────────────────────────────────────────────────┐
│ 2. COMMIT & PUSH                                            │
├─────────────────────────────────────────────────────────────┤
│   git add .                                                 │
│   git commit -m "feat: adiciona nova funcionalidade"       │
│   git push origin main                                      │
└─────────────────────────────────────────────────────────────┘
                         ⬇️
┌─────────────────────────────────────────────────────────────┐
│ 3. DEPLOY AUTOMÁTICO                                        │
├─────────────────────────────────────────────────────────────┤
│   Vercel (Frontend):                                        │
│   → Build automático                                        │
│   → Deploy para https://wolknow.com                         │
│   → Usa VITE_API_URL=https://api.wolknow.com/v1           │
│                                                             │
│   Digital Ocean (Backend):                                  │
│   → Build automático                                        │
│   → Deploy para https://api.wolknow.com                     │
│   → Reinicia servidores                                     │
└─────────────────────────────────────────────────────────────┘
                         ⬇️
┌─────────────────────────────────────────────────────────────┐
│ 4. PRODUÇÃO                                                 │
├─────────────────────────────────────────────────────────────┤
│   Backend:  https://api.wolknow.com/v1                     │
│   Frontend: https://wolknow.com                             │
│                                                             │
│   ✓ Usuários acessam                                       │
│   ✓ Monitorar logs                                         │
│   ✓ Verificar erros                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Comandos Rápidos

### **Iniciar Tudo (2 Terminais)**

```bash
# Terminal 1 - Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd Frontend && npm run dev
```

---

### **Verificar Configuração Atual**

```bash
# Ver variáveis de ambiente
cat Frontend/.env.local

# Ver qual API está sendo usada
# Abra: http://localhost:3000
# Console mostrará: 🌍 API Environment: { apiUrl: '...' }
```

---

### **Trocar para Produção Temporariamente**

```bash
# Frontend contra produção (SEM editar .env.local)
cd Frontend
VITE_API_URL=https://api.wolknow.com/v1 npm run dev
```

---

## 📚 Arquivos Importantes

```
HOLDWallet/
├── Frontend/
│   ├── .env.local          # ← Configuração LOCAL (git ignora)
│   ├── .env.example        # ← Exemplo para referência
│   ├── src/config/api.ts   # ← Detecta ambiente automaticamente
│   └── package.json
│
├── backend/
│   ├── .env                # ← Configuração LOCAL (git ignora)
│   ├── .env.production     # ← Configuração PRODUÇÃO (git ignora)
│   └── app/main.py
│
└── CONFIGURACAO_MULTI_AMBIENTE.md  # ← Este arquivo
```

---

## 🎓 Resumo Final

### **Para Desenvolver:**

```bash
# 1. Iniciar backend local
cd backend && uvicorn app.main:app --reload

# 2. Verificar .env.local
cat Frontend/.env.local
# VITE_API_URL=http://localhost:8000

# 3. Iniciar frontend
cd Frontend && npm run dev

# 4. Acessar
open http://localhost:3000
```

### **Para Deploy:**

```bash
# 1. Commitar mudanças
git add .
git commit -m "feat: nova funcionalidade"

# 2. Push
git push origin main

# 3. Aguardar deploys (automáticos)
# Vercel: ~2 min
# Digital Ocean: ~3 min

# 4. Testar produção
open https://wolknow.com
```

---

## ✅ Pronto!

Agora você pode:

- ✅ Desenvolver localmente (`localhost:8000` + `localhost:3000`)
- ✅ Fazer deploy para produção (push → deploy automático)
- ✅ Trocar entre ambientes facilmente
- ✅ Testar contra produção localmente (se necessário)

---

## 🆘 Precisa de Ajuda?

Se tiver problemas:

1. **Verificar logs:**

```bash
# Backend
tail -f backend/backend.log

# Frontend (console do navegador)
F12 → Console
```

2. **Reiniciar tudo:**

```bash
# Backend
Ctrl+C → uvicorn app.main:app --reload

# Frontend
Ctrl+C → npm run dev
```

3. **Verificar configuração:**

```bash
# API URL que está sendo usada
# Veja no console do navegador: 🌍 API Environment
```

---

**Última atualização:** 15 de dezembro de 2025
**Commit relacionado:** 47cdb779
