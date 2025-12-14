# 🚂 DEPLOY NO RAILWAY - Guia Completo

## ✅ Pré-requisitos

1. **Conta no Railway**: https://railway.app
2. **GitHub conectado ao Railway**
3. **Repositório público**: ag3developer/HOLDWallet

## 🔧 PASSO 1: Conectar GitHub ao Railway

### Se sua conta Railway NÃO tem GitHub conectado:

1. Acesse: https://railway.app
2. Faça login com sua conta
3. Vá em: **Account Settings** (canto superior direito)
4. Clique em: **Integrations** ou **Connected Services**
5. Clique: **Connect GitHub**
6. Autorize a aplicação Railway
7. Escolha: **Install on all repositories** OU **Select repositories** e escolha `HOLDWallet`

## 🔗 PASSO 2: Aparecer na Lista de Repositórios

Após conectar GitHub, o Railway vai sincronizar. Se `ag3developer/HOLDWallet` não aparecer:

### Opção A: Forçar Sincronização

1. Vá em: https://railway.app/dashboard
2. Clique: **Create** ou **+ New Project**
3. Clique: **Deploy from GitHub**
4. No dropdown de repositório, procure por `HOLDWallet`
5. Se não aparecer, clique: **Edit GitHub App permissions** (ou similar)
6. Autorize acesso ao repositório

### Opção B: Repositório Precisa Ser Público

```bash
# Verifique se o repositório é público:
# No GitHub: https://github.com/ag3developer/HOLDWallet
# Settings → Visibility → Deve ser "Public"
```

Se privado, mude para público:

1. GitHub → HOLDWallet → Settings
2. Danger Zone → Change repository visibility
3. Selecione: **Public**
4. Confirme

## 🎯 PASSO 3: Criar App no Railway

Após `HOLDWallet` aparecer:

1. Clique no repositório `ag3developer/HOLDWallet`
2. Railway vai detectar automaticamente:
   - **Frontend** (Vite)
   - **Backend** (Python FastAPI)
3. Selecione qual quer fazer deploy (ou ambos)

## ⚙️ PASSO 4: Configurar Backend no Railway

Se o Railway detectou como Python project:

1. **Confirm Python 3.12**

   - Railway deve detectar `python3.12` automaticamente

2. **Build Command**

   ```
   pip install -r backend/requirements.txt
   ```

3. **Start Command**

   ```
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. **Environment Variables**

   - Clique: **+ Add Variable**
   - Adicione todas do `.env.production`:
     ```
     ENVIRONMENT=production
     DEBUG=false
     DATABASE_URL=sqlite:///./holdwallet.db
     SECRET_KEY=seu-valor-aqui
     JWT_ALGORITHM=HS256
     JWT_EXPIRATION_HOURS=24
     ALLOWED_ORIGINS=https://seu-frontend.vercel.app
     FRONTEND_URL=https://seu-frontend.vercel.app
     ```

5. **Deploy**
   - Clique: **Deploy**
   - Aguarde 3-5 minutos

## 🚨 Problema: Repositório Não Aparece?

### Causa 1: Permissões do GitHub

```
Solução: Reconectar GitHub no Railway
1. Settings → Integrations
2. Desconecte GitHub
3. Reconecte GitHub
4. Autorize todos os repositórios
```

### Causa 2: Repositório é Privado

```
Solução: Tornar público
1. GitHub → HOLDWallet → Settings
2. Change visibility → Public
3. Voltar para Railway → Refresh
```

### Causa 3: GitHub App não tem acesso

```
Solução: Autorizar aplicação
1. GitHub → Settings → Applications → Authorized OAuth Apps
2. Procure por "Railway"
3. Clique em "Railway"
4. Autorize acesso a HOLDWallet
```

## 🔍 PASSO 5: Verificar se Railway Acessa Seu Repo

No Railway:

1. Vá em: **Account → Integrations**
2. Clique em **GitHub**
3. Veja a lista de repositórios autorizados
4. Se `HOLDWallet` não estiver, clique **Install** ou **Update**

## 📱 Alternativa: Usar URL Direto do GitHub

Se não quiser que apareça automático:

1. No Railway: **Create → Deploy from GitHub**
2. Copie/cole a URL:
   ```
   https://github.com/ag3developer/HOLDWallet
   ```
3. Clique: **Deploy**

Railway vai clonar diretamente e deploy automaticamente!

## 🎉 Resultado Final

Após tudo configurado:

```
Railroad da sua aplicação:
├── Frontend (Vercel)
│   └── https://hold-wallet-deaj.vercel.app
│
├── Backend (Railway) ← Deploy aqui
│   └── https://seu-app-railway.up.railway.app
│
└── Database (SQLite local)
    └── holdwallet.db
```

## 💡 Dica: Railway vs Droplet

| Aspecto      | Railway       | Droplet      |
| ------------ | ------------- | ------------ |
| Configuração | Automática    | Manual       |
| Custo        | Pay-as-you-go | $12/mês fixo |
| Escala       | Automática    | Manual       |
| Facilidade   | ⭐⭐⭐⭐⭐    | ⭐⭐⭐       |
| Controle     | Moderado      | Completo     |

**Railway é mais fácil para começar!**

---

## 🚀 Resumo Rápido

1. ✅ Repositório é público?
2. ✅ GitHub conectado ao Railway?
3. ✅ Repositório aparece na lista?
4. ✅ Deploy! 🎉

**Qual é a dificuldade que está tendo?**
