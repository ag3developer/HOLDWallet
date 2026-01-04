# 🔧 CORREÇÃO URGENTE: DATABASE_URL Digital Ocean

## ❌ Problema Identificado

O backend em produção está usando o banco **`defaultdb`** em vez de **`holdwallet-db`**.

Por isso:

- ✅ API funciona e cria usuários
- ❌ Usuários vão para o banco errado (`defaultdb`)
- ❌ Não consigo ver os usuários no banco correto

---

## ✅ Solução

### Passo 1: Atualizar DATABASE_URL no Digital Ocean

1. **Acesse:** https://cloud.digitalocean.com/apps
2. **Entre no seu App** → Settings → Components → **backend**
3. **Clique em "Edit"** nas Environment Variables
4. **Encontre `DATABASE_URL`** e SUBSTITUA por:

```bash
postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require
```

**⚠️ IMPORTANTE:** A única mudança é `defaultdb` → `holdwallet-db` no final

### Passo 2: Aguardar Redeploy

O Digital Ocean vai fazer redeploy automático (2-3 minutos)

### Passo 3: Migrar Usuários (Opcional)

Se quiser manter os usuários criados em `defaultdb`, posso criar um script para migrá-los para `holdwallet-db`.

---

## 📊 Comparação

| Item         | defaultdb (atual)      | holdwallet-db (correto)      |
| ------------ | ---------------------- | ---------------------------- |
| **Usuários** | Novos (criados hoje)   | Antigos (app@holdwallet.com) |
| **Tabelas**  | users, alembic_version | users, alembic_version       |
| **Status**   | ❌ Banco errado        | ✅ Banco correto             |

---

## 🎯 Depois da Correção

Todos os novos usuários serão criados em `holdwallet-db` e você terá acesso a:

- ✅ app@holdwallet.com (com senha resetada)
- ✅ Todos os usuários novos
- ✅ Banco único e correto

---

## 🔐 Credencial Correta Completa

```bash
# Para copiar/colar no Digital Ocean:
DATABASE_URL=postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require
```

---

**Faça essa alteração agora no Digital Ocean e me avise quando completar o deploy!** 🚀
