# 🧪 Guia de Testes - Validação das Correções

## Preparação Rápida

### 1. **Iniciar Backend** (Terminal 1)
```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python -m uvicorn app.main:app --host localhost --port 8000 --reload
```

### 2. **Iniciar Frontend** (Terminal 2)
```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend
npm run dev
```

---

## ✅ Testes a Realizar

### Teste 1: Preços Carregando
**Local:** http://localhost:3000/trading/instant

**Ações:**
1. Abrir página
2. Aguardar 2-3 segundos
3. Verificar se preços aparecem na tabela

**Esperado:**
- ✅ Preços aparecem rapidamente
- ✅ Console: `[usePrices] Fetched X prices`
- ✅ Network: 1 requisição GET `/api/v1/prices/batch`
- ✅ Sem erros CORS
- ✅ Sem erros 429

---

### Teste 2: Autenticação de Saldos
**Local:** http://localhost:3000/p2p/create-order (após login)

**Ações:**
1. Fazer login primeiro
2. Navegar para criar ordem P2P
3. Aguardar carregamento de saldos

**Esperado:**
- ✅ Saldos carregam dentro de 1-2 segundos
- ✅ Console: `[useWalletBalances] Fetching balances for wallet`
- ✅ Network: requisição GET `/wallets/{id}/balances`
- ✅ Sem erro 403
- ✅ Sem erro "No authentication token found"

---

### Teste 3: Múltiplas Moedas
**Local:** http://localhost:3000/dashboard (após login)

**Ações:**
1. Ir para Dashboard
2. Verificar se múltiplas moedas aparecem com preços

**Esperado:**
- ✅ Pelo menos 8 moedas com preços (BTC, ETH, USDT, SOL, ADA, AVAX, MATIC, DOT)
- ✅ Preços atualizam a cada 5 segundos (da cache)
- ✅ Sem erros repetidos

---

### Teste 4: Verificar Console
**Ação:** Abrir DevTools (F12) → Console

**Procurar por:**
```javascript
// ✅ Esperado ver:
[usePrices] Fetched 8 prices
[useWalletBalances] Fetching balances for wallet
[WalletService] Using token from auth-storage
Cache hit for usd

// ❌ NÃO deve aparecer:
CORS policy
ERR_BAD_RESPONSE 503
No authentication token found
net::ERR_FAILED 429
Maximum update depth exceeded
```

---

### Teste 5: Network Tab
**Local:** http://localhost:3000/trading/instant

**Ações:**
1. Abrir DevTools → Network
2. Limpar requisições (Ctrl+Shift+Delete)
3. Recarregar página
4. Aguardar preços carregarem
5. Verificar requisições

**Esperado:**
- ✅ Nenhuma requisição para `api.coingecko.com`
- ✅ 1 requisição GET `/api/v1/prices/batch`
- ✅ Status 200 (sucesso)
- ✅ Tempo de resposta: ~200-500ms (sem cache)
- ✅ Próximas requisições: ~50-100ms (com cache)

**Requisições Indesejadas:**
- ❌ `https://api.coingecko.com/...` (CORS error)
- ❌ `https://api.binance.com/...` do frontend
- ❌ Status 403 em `/wallets/.../balances`
- ❌ Status 503 em `/api/v1/prices/batch`

---

## 🔍 Verificações Adicionais

### 1. Verificar Cache Funcionando
```javascript
// No DevTools console:
const authState = localStorage.getItem('auth-storage');
JSON.parse(authState)?.state?.token  // Deve retornar um token
```

### 2. Verificar LocalStorage
```javascript
// DevTools → Application → LocalStorage → localhost:3000
// Deve ver:
// - auth-storage (Zustand persisted)
// - authToken (fallback)
```

### 3. Performance
```javascript
// Primeira requisição (sem cache):
// Network: GET /api/v1/prices/batch - ~2-3s

// Próximas requisições (com cache 5min):
// Network: (nenhuma) - ~50ms (lido do cache local)

// Após 5 minutos:
// Automática nova requisição
```

---

## 🐛 Troubleshooting

### Problema: Ainda vê erro 503
**Solução:**
1. Backend está rodando? `http://localhost:8000/docs`
2. Verifique logs do backend para erro
3. Restart backend: `Ctrl+C` e rode novamente

### Problema: Token não encontrado
**Solução:**
1. Faça logout completo
2. Limpe localStorage: `localStorage.clear()`
3. Faça login novamente
4. Verifique `localStorage.getItem('auth-storage')`

### Problema: Saldos não carregam
**Solução:**
1. Verifique se user está autenticado
2. Cheque console para erro de token
3. Verifique se wallet_id está correto
4. Reinicie browser (Ctrl+Shift+Delete cache)

### Problema: Preços não atualizam
**Solução:**
1. Aguarde 5 minutos (TTL do cache)
2. Ou clique em "Refresh" (se houver botão)
3. Ou envie parâmetro `?refresh=true`

---

## 📊 Resultados Esperados

### Primeira Carga (sem cache)
```
Timeline:
0ms    → Página carrega
200ms  → Requisição API enviada
1500ms → Resposta recebida
1800ms → UI atualizada com preços
```

### Carregamentos Subsequentes (com cache)
```
Timeline:
0ms    → Página carrega
50ms   → Cache hit! Preços diretos
```

### Comportamento Ideal
```
✅ Página carrega instantaneamente
✅ Preços aparecem dentro de 2-3 segundos (primeira vez)
✅ Próximas cargas: instantâneas (cache)
✅ Sem erros no console
✅ Sem requisições bloqueadas por CORS
```

---

## 🎯 Checklist de Validação

- [ ] Teste 1: Preços carregam na trading page
- [ ] Teste 2: Saldos carregam após login
- [ ] Teste 3: Múltiplas moedas aparecem
- [ ] Teste 4: Console sem erros
- [ ] Teste 5: Network mostra 1 requisição batch (não múltiplas)
- [ ] Nenhuma requisição direta ao CoinGecko
- [ ] Nenhuma requisição bloqueada por CORS
- [ ] Performance: <3s primeira carga, <100ms com cache
- [ ] Autenticação: Token presente e válido
- [ ] Build: `npm run build` passa sem erros

---

## 💡 Dicas Profissionais

1. **Abra DevTools em duas abas:**
   - Aba 1: Console (logs)
   - Aba 2: Network (requisições)

2. **Use filtros no Network:**
   - `api.coingecko.com` (não deve aparecer)
   - `/prices/batch` (deve aparecer 1x em 5 min)
   - `/wallets/` (múltiplas chamadas ok)

3. **Para medir performance:**
   - Limpe cache: Ctrl+Shift+Delete
   - Abra aba anônima/incógnita
   - Meça tempo até preços aparecerem

4. **Para forçar novo teste:**
   - `localStorage.clear()`
   - Feche todos os tabs
   - Reabra browser
   - Login novamente

---

**Todos os testes passaram? Excelente! Sistema está pronto para produção! 🚀**
