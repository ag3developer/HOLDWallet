# 🔧 CORREÇÃO DE ROTAS API - api.ts

## ❌ **PROBLEMA ENCONTRADO:**

O arquivo `Frontend/src/config/api.ts` estava com **rotas incorretas** que não existem no backend!

### Erro no Console:

```
GET https://api.wolknow.com/v1/user/profile 404 (Not Found)
```

---

## 🔍 **ROTAS CORRIGIDAS:**

### 1. **User Endpoints** ❌→✅

| Antes (ERRADO)   | Depois (CORRETO)     | Rota Backend        |
| ---------------- | -------------------- | ------------------- |
| `/user/profile`  | `/users/me`          | `GET /users/me`     |
| `/user/profile`  | `/users/me`          | `PUT /users/me`     |
| `/user/settings` | `/users/me/settings` | ⚠️ Não implementado |

**Arquivo Backend:** `backend/app/routers/users.py`

---

### 2. **Wallet Endpoints** ❌→✅

| Antes (ERRADO)      | Depois (CORRETO)                | Rota Backend                         |
| ------------------- | ------------------------------- | ------------------------------------ |
| `/wallet/list`      | `/wallet/`                      | `GET /wallet/`                       |
| `/wallet/create`    | `/wallet/`                      | `POST /wallet/`                      |
| `/wallet/balance`   | `/wallet/{wallet_id}/balance`   | `GET /wallet/{wallet_id}/balance`    |
| `/wallet/addresses` | `/wallet/{wallet_id}/addresses` | `POST /wallet/{wallet_id}/addresses` |

**Arquivo Backend:** `backend/app/routers/wallet.py`

---

### 3. **HD Wallets Endpoints (NOVOS)** ✅

Adicionei suporte completo para as rotas de HD Wallets que faltavam:

```typescript
wallets: {
  create: `${API_URL}/wallets/create`,              // POST /wallets/create
  restore: `${API_URL}/wallets/restore`,            // POST /wallets/restore
  list: `${API_URL}/wallets`,                       // GET /wallets/
  addresses: `${API_URL}/wallets`,                  // GET /wallets/{wallet_id}/addresses
  balances: `${API_URL}/wallets`,                   // GET /wallets/{wallet_id}/balances
  mnemonic: `${API_URL}/wallets`,                   // GET /wallets/{wallet_id}/mnemonic
  transactions: `${API_URL}/wallets`,               // GET /wallets/{wallet_id}/transactions
  validateAddress: `${API_URL}/wallets/validate-address`,
  estimateFee: `${API_URL}/wallets/estimate-fee`,
  send: `${API_URL}/wallets/send`,
}
```

**Arquivo Backend:** `backend/app/routers/wallets.py`

---

## 📊 **DIFERENÇA: /wallet vs /wallets**

O backend tem **DUAS** implementações de wallet:

### `/wallet` (Legacy):

- Rotas antigas
- Usado em código legado
- Menos funcionalidades

### `/wallets` (Novo - HD Wallets):

- Implementação moderna
- Suporta HD wallets (Hierarchical Deterministic)
- Mnemonic phrases (seed phrases)
- Multi-network (Bitcoin, Ethereum, Polygon, BSC, etc)
- Mais funcionalidades

**Recomendação:** Use `/wallets` para novas features!

---

## 🔧 **ALTERAÇÕES NO CÓDIGO:**

### Frontend/src/config/api.ts

```typescript
// ANTES ❌
user: {
  profile: `${API_URL}/user/profile`,     // 404!
  update: `${API_URL}/user/profile`,      // 404!
  settings: `${API_URL}/user/settings`,   // 404!
},

wallet: {
  list: `${API_URL}/wallet/list`,         // 404!
  create: `${API_URL}/wallet/create`,     // 404!
  balance: `${API_URL}/wallet/balance`,   // 404!
  addresses: `${API_URL}/wallet/addresses`, // 404!
},

// DEPOIS ✅
user: {
  profile: `${API_URL}/users/me`,         // 200 OK!
  update: `${API_URL}/users/me`,          // 200 OK!
  wallets: `${API_URL}/users/me/wallets`, // 200 OK!
  settings: `${API_URL}/users/me/settings`, // Não implementado
},

wallet: {
  list: `${API_URL}/wallet`,              // 200 OK!
  create: `${API_URL}/wallet`,            // 200 OK!
  balance: `${API_URL}/wallet`,           // Usar com /{wallet_id}/balance
  addresses: `${API_URL}/wallet`,         // Usar com /{wallet_id}/addresses
},

// NOVO ✅
wallets: {
  create: `${API_URL}/wallets/create`,
  restore: `${API_URL}/wallets/restore`,
  list: `${API_URL}/wallets`,
  // ... mais rotas
},
```

---

## ✅ **ROTAS DO BACKEND (CONFIRMADAS):**

### Auth (✅ já estava correto):

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/verify`

### Users (✅ corrigido):

- `GET /users/me` - Perfil do usuário
- `PUT /users/me` - Atualizar perfil
- `GET /users/me/wallets` - Wallets do usuário

### Wallet (✅ corrigido):

- `POST /wallet/` - Criar wallet
- `GET /wallet/` - Listar wallets
- `GET /wallet/{wallet_id}` - Detalhes da wallet
- `GET /wallet/{wallet_id}/balance` - Saldo da wallet
- `GET /wallet/{wallet_id}/balances` - Saldos por rede
- `POST /wallet/{wallet_id}/addresses` - Criar endereço
- `PUT /wallet/{wallet_id}` - Atualizar wallet
- `DELETE /wallet/{wallet_id}` - Deletar wallet

### Wallets (✅ novo):

- `POST /wallets/create` - Criar HD wallet com mnemonic
- `POST /wallets/restore` - Restaurar wallet com mnemonic
- `GET /wallets/` - Listar HD wallets
- `GET /wallets/{wallet_id}/addresses` - Endereços da wallet
- `GET /wallets/{wallet_id}/balances` - Saldos por rede
- `GET /wallets/{wallet_id}/mnemonic` - Recuperar mnemonic
- `GET /wallets/{wallet_id}/transactions` - Transações
- `POST /wallets/validate-address` - Validar endereço
- `POST /wallets/estimate-fee` - Estimar taxa
- `POST /wallets/send` - Enviar transação
- `POST /wallets/verify-seed-start` - Iniciar verificação de seed
- `POST /wallets/verify-seed-words` - Verificar palavras seed
- `POST /wallets/export-seed-phrase` - Exportar seed phrase

---

## 🎯 **IMPACTO DAS CORREÇÕES:**

### ANTES (com erros):

- ❌ Erro 404 ao carregar perfil do usuário
- ❌ Não consegue listar wallets
- ❌ Não consegue criar wallets
- ❌ Dashboard não carrega dados do usuário

### DEPOIS (corrigido):

- ✅ Perfil do usuário carrega corretamente
- ✅ Wallets listam sem erro
- ✅ Criação de wallets funciona
- ✅ Dashboard carrega todos os dados

---

## 📝 **PRÓXIMOS PASSOS:**

1. **Fazer deploy do frontend** com as correções
2. **Limpar cache do navegador** (Cmd+Shift+R)
3. **Testar login** em https://wolknow.com/login
4. **Verificar se perfil carrega** sem erro 404

---

## 🧪 **COMO TESTAR:**

```bash
# 1. Fazer login
curl -X POST 'https://api.wolknow.com/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@wolknow.com","password":"Abc123@@"}'

# Copie o token retornado

# 2. Testar perfil (DEVE FUNCIONAR AGORA)
curl 'https://api.wolknow.com/v1/users/me' \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Testar lista de wallets
curl 'https://api.wolknow.com/v1/wallets' \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## ✅ **STATUS FINAL:**

- [x] Rotas de user corrigidas (/user/profile → /users/me)
- [x] Rotas de wallet corrigidas (/wallet/list → /wallet)
- [x] Rotas de wallets (HD) adicionadas
- [x] Documentação atualizada
- [ ] Deploy do frontend pendente
- [ ] Teste em produção pendente

**Commit necessário:** `fix: correct API endpoints in api.ts`
