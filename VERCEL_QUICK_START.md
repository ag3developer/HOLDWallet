# ⚡ DEPLOY RÁPIDO - VERCEL + DROPLET

## 📊 Resumo da Arquitetura

```
Vercel (Frontend)           Droplet (Backend)
https://...vercel.app  ←→  http://164.92.155.222
React Build                FastAPI API
Auto Deploy                SQLite DB
```

---

## 🚀 PASSO 1: Git & GitHub

### 1.1 Fazer commit dos arquivos novos

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet

git add Frontend/vercel.json
git add Frontend/.env.local
git add Frontend/.env.production
git add Frontend/src/config/api.ts

git commit -m "Setup Vercel deployment and API configuration"
git push
```

### 1.2 Verificar que está no GitHub

Acesse: https://github.com/ag3developer/HOLDWallet

- Verifique se `Frontend/vercel.json` está lá
- Verifique se `.env.production` está lá

---

## 🌐 PASSO 2: Deploy no Vercel (5 minutos)

### 2.1 Abrir Vercel

1. Acesse https://vercel.com/
2. Clique **Sign Up** → **Continue with GitHub**
3. Autorize e conecte sua conta GitHub

### 2.2 Importar Projeto

1. Clique **Add New...** → **Project**
2. Procure por `ag3developer/HOLDWallet` (seu repositório)
3. Clique **Import**

### 2.3 Configurar Build

Na tela que aparecer:

```
Project Name:       holdwallet-frontend
Framework:          Vite (auto-detect)
Root Directory:     Frontend/
Build Command:      npm run build
Output Directory:   build
```

**Environment Variables:** Clique **Add**

```
Name:  REACT_APP_API_URL
Value: http://164.92.155.222
```

### 2.4 Deploy!

Clique **Deploy** e aguarde 2-3 minutos.

**Você terá:**
✅ URL: `https://yourproject.vercel.app`
✅ SSL grátis
✅ Auto-deploy a cada push

---

## 🔧 PASSO 3: Atualizar Backend

No Droplet, atualize o arquivo de configuração:

```bash
ssh root@164.92.155.222

# Editar .env.production
nano /home/holdwallet/APP-HOLDWALLET/backend/.env.production
```

Mude a linha de ALLOWED_ORIGINS para:

```
ALLOWED_ORIGINS=https://holdwallet-frontend.vercel.app,http://localhost:3000,http://164.92.155.222
```

E a linha FRONTEND_URL para:

```
FRONTEND_URL=https://holdwallet-frontend.vercel.app
```

Salve (Ctrl+X, Y, Enter) e reinicie:

```bash
systemctl restart holdwallet
```

---

## 📋 CHECKLIST

```
FRONTEND:
  ✅ vercel.json criado
  ✅ .env.local criado
  ✅ .env.production criado
  ✅ src/config/api.ts criado
  ✅ Feito commit no GitHub
  ✅ Projeto importado no Vercel
  ✅ REACT_APP_API_URL configurado
  ✅ Deploy concluído

BACKEND:
  ✅ ALLOWED_ORIGINS atualizado
  ✅ FRONTEND_URL atualizado
  ✅ Service reiniciado
  ✅ CORS verificado

INTEGRAÇÃO:
  ✅ Frontend carrega em Vercel
  ✅ Frontend conecta em 164.92.155.222
  ✅ API responde
```

---

## 🔗 URLs Finais

| Componente            | URL                                    |
| --------------------- | -------------------------------------- |
| **Frontend (Vercel)** | https://holdwallet-frontend.vercel.app |
| **Backend (API)**     | http://164.92.155.222                  |
| **Docs API**          | http://164.92.155.222/docs             |

---

## ✨ Vantagens

✅ Frontend super rápido (CDN global)
✅ Deploy automático com cada push
✅ SSL grátis
✅ Sem custo no Vercel
✅ Backend controlado no Droplet ($12/mês)

---

## 🚨 Se algo der errado

### Frontend não carrega em Vercel

```
Verificar:
1. vercel.json tem "outputDirectory": "build"?
2. REACT_APP_API_URL foi definido?
3. npm run build funciona localmente?
```

Acesse: https://vercel.com/dashboard → seu projeto → Deployments
Procure por erro na aba **Logs**.

### Backend não responde

```bash
ssh root@164.92.155.222

# Ver status
systemctl status holdwallet

# Ver logs
journalctl -u holdwallet -n 50

# Testar API
curl http://164.92.155.222/api/v1/health
```

### CORS error

Verifique:

```bash
# No Droplet
grep ALLOWED_ORIGINS /home/holdwallet/APP-HOLDWALLET/backend/.env.production

# Deve ter:
ALLOWED_ORIGINS=https://holdwallet-frontend.vercel.app,http://localhost:3000,http://164.92.155.222
```

---

**Pronto! Seu app está LIVE! 🎉**
