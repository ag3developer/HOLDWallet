# 🔧 Configurar ROOT_PATH no Digital Ocean

## ❌ Problema Atual

O backend está fazendo redirects 307 que quebram CORS:

```
https://api.wolknow.com/v1/wallets → 307 → https://api.wolknow.com/wallets/
```

Isso causa:

- ❌ CORS block no navegador
- ❌ Dashboard não carrega
- ❌ Todas requisições falham com ERR_FAILED

## ✅ Solução

Configurar a variável de ambiente `ROOT_PATH=/v1` no Digital Ocean Apps Platform.

---

## 📋 Passo a Passo

### 1. Acesse o Digital Ocean Dashboard

1. Vá para: https://cloud.digitalocean.com/apps
2. Clique no app **"holdwallet-backend"** (ou nome similar)

### 2. Configure a Variável de Ambiente

1. Clique na aba **"Settings"** (Configurações)
2. Role até **"App-Level Environment Variables"**
3. Clique em **"Edit"** ou **"Add Variable"**
4. Adicione:
   - **Key:** `ROOT_PATH`
   - **Value:** `/v1`
   - **Encrypt:** ❌ (não é necessário, não é senha)

### 3. Salve e Redeploy

1. Clique em **"Save"** (Salvar)
2. O Digital Ocean vai perguntar se quer fazer **redeploy**
3. Clique em **"Deploy"** ou **"Restart"**
4. Aguarde 2-3 minutos

---

## 🧪 Como Testar

Após o deploy, teste se o redirect sumiu:

```bash
# Antes (com redirect 307):
curl -I https://api.wolknow.com/v1/wallets
# HTTP/2 307
# location: https://api.wolknow.com/wallets/

# Depois (sem redirect):
curl -I https://api.wolknow.com/v1/wallets
# HTTP/2 200 OK
# (ou 401 se não tiver token, mas sem redirect!)
```

---

## 📝 Alterações no Código

### backend/app/main.py

```python
# ANTES (causava redirects):
app = FastAPI(
    title="Wolknow API",
    # ... sem root_path
)

# DEPOIS (usa variável de ambiente):
import os
app = FastAPI(
    title="Wolknow API",
    root_path=os.getenv("ROOT_PATH", ""),  # Lê ROOT_PATH do ambiente
    docs_url="/docs",       # Swagger em /v1/docs
    redoc_url="/redoc",     # ReDoc em /v1/redoc
    openapi_url="/openapi.json",
)
```

---

## 🎯 Por Que Isso Funciona?

### Sem `root_path`:

1. FastAPI pensa que está em `/`
2. Registra rota: `GET /wallets`
3. Nginx/proxy reescreve: `/v1/wallets` → `/wallets`
4. FastAPI recebe: `GET /wallets` ✅
5. MAS retorna redirect: `307 → /wallets/` (sem /v1) ❌

### Com `root_path="/v1"`:

1. FastAPI sabe que está em `/v1`
2. Registra rota: `GET /v1/wallets`
3. Nginx/proxy reescreve: `/v1/wallets` → `/wallets`
4. FastAPI recebe: `GET /wallets` ✅
5. FastAPI sabe adicionar `/v1` nas respostas ✅
6. Sem redirects! ✅

---

## 🚀 Resultado Esperado

Após configurar `ROOT_PATH=/v1`:

✅ **Dashboard carrega rápido**  
✅ **Sem erros CORS**  
✅ **Sem redirects 307**  
✅ **Wallets carregam corretamente**  
✅ **Swagger acessível em:** https://api.wolknow.com/v1/docs  
✅ **ReDoc acessível em:** https://api.wolknow.com/v1/redoc

---

## ⚠️ IMPORTANTE

**NÃO** commite o arquivo `.env.production` no git! Ele contém senhas.

A configuração `ROOT_PATH=/v1` deve ser feita **diretamente no Digital Ocean**, nas variáveis de ambiente do app.

---

## 📚 Referências

- [FastAPI Behind a Proxy](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [Digital Ocean Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)

---

## ✅ Checklist

- [ ] Acessar Digital Ocean Dashboard
- [ ] Adicionar variável `ROOT_PATH=/v1`
- [ ] Salvar e fazer redeploy
- [ ] Aguardar 2-3 minutos
- [ ] Testar com `curl -I https://api.wolknow.com/v1/wallets`
- [ ] Verificar que não há redirect 307
- [ ] Recarregar dashboard (Cmd+R)
- [ ] Confirmar que carrega sem erros CORS

---

**Status do Código:** ✅ Já foi feito push (commit 81b71537)  
**Próximo Passo:** Configurar ROOT_PATH=/v1 no Digital Ocean
