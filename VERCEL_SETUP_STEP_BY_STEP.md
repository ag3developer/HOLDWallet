# 🚀 GUIA: Configurar Variáveis de Ambiente no Vercel

## Por Que os Deployments Falharam?

O `vercel.json` estava tentando usar uma variável que não existia:

```json
❌ ERRO ANTERIOR:
"env": {
  "REACT_APP_API_URL": "@react_app_api_url"  // ← Vercel não tem isso!
}
```

## ✅ Agora Como Fazer Funcionar

### Passo 1: Acessar o Vercel Dashboard

1. Abra: https://vercel.com/dashboard
2. Faça login
3. Clique no projeto **hold-wallet-deaj**

### Passo 2: Ir para Settings → Environment Variables

```
Dashboard → hold-wallet-deaj → Settings → Environment Variables
```

### Passo 3: Adicionar a Variável

Clique no botão **"Add New"** ou **"+ New Environment Variable"**

Preencha:

```
Name:  REACT_APP_API_URL
Value: http://164.92.155.222
```

Selecione os ambientes:

```
☑ Production
☑ Preview
☑ Development
```

Clique: **Save**

### Passo 4: Redeploy

Agora volte para a aba **Deployments** e:

1. Clique no último deployment (com ❌ vermelho)
2. Clique no botão **Redeploy**
3. Escolha: **Redeploy without clearing cache**
4. Aguarde 2-3 minutos

## 🎯 Resultado Esperado

```
Antes:  ❌ ❌ ❌  (3 falhados)
Depois: ✅ ✅ ✅  (3 sucesso) + 1 novo ✅
```

## 📝 Checklist

- [ ] Abri Vercel Dashboard
- [ ] Acessei Settings → Environment Variables
- [ ] Adicionei REACT_APP_API_URL = http://164.92.155.222
- [ ] Selecionei todos os ambientes (Production, Preview, Development)
- [ ] Cliquei Save
- [ ] Voltei para Deployments
- [ ] Cliquei Redeploy no último deployment
- [ ] Aguardei 2-3 minutos
- [ ] Vejo ✅ Green no novo deployment
- [ ] Acesso https://hold-wallet-deaj.vercel.app e vejo a página

## 💡 Se Ainda Não Funcionar

```bash
# Verifique o arquivo que foi commitado:
cat Frontend/vercel.json

# Deve estar assim (SEM a seção env):
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [...],
  "headers": [...]
}
```

## 🔗 Links Úteis

- Dashboard: https://vercel.com/dashboard
- Projeto: https://vercel.com/ag3developer/hold-wallet-deaj
- Documentação: https://vercel.com/docs/concepts/projects/environment-variables

---

**Faça isso agora e seu frontend vai ficar ✅ GREEN em poucos minutos!**
