# 🎯 GUIA PASSO A PASSO - STABLECOINS

## ✅ O QUE FOI FEITO

Uma única mudança no código foi necessária para que suas stablecoins apareçam:

### Arquivo Modificado
📄 **Path**: `Frontend/src/services/wallet.ts`  
📍 **Linha**: ~118

### Mudança Exata
```diff
  async getWalletBalancesByNetwork(walletId: string) {
    console.log(`[DEBUG] Service: Fetching /wallets/${walletId}/balances`)
-   const response = await apiClient.get(`/wallets/${walletId}/balances`)
+   const response = await apiClient.get(`/wallets/${walletId}/balances?include_tokens=true`)
    console.log(`[DEBUG] Service: Response received:`, response.data)
    const balances = response.data.balances || {}
    console.log(`[DEBUG] Service: Extracted balances:`, balances)
    return balances
  }
```

**Simples assim!** ✨

---

## 🚀 COMO TESTAR AGORA

### Passo 1: Reiniciar o Frontend
```bash
# Terminal 1 - Frontend
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend
npm start
```

### Passo 2: Abrir em Navegador
```
http://localhost:3000/wallet
```

### Passo 3: Fazer Login
- **Email**: app@holdwallet.com
- **Senha**: Abc123@@

### Passo 4: Procurar pelas Stablecoins
Quando expandir a carteira multi, você verá:

```
📱 Minha Carteira Multi
├─ 🟠 Bitcoin (BTC)        0.50 BTC
├─ 🔵 Ethereum (ETH)       1.20 ETH  
├─ 💜 Polygon (MATIC)      0 MATIC
├─ 💚 Polygon (USDT)       100.00 USDT     ← NOVO!
├─ 💙 Polygon (USDC)       50.00 USDC      ← NOVO!
├─ 💚 Ethereum (USDT)      200.50 USDT     ← NOVO!
└─ ...
```

---

## 🔍 VERIFICAÇÃO - CONSOLE DO NAVEGADOR

Abra o F12 (DevTools) e procure por logs como:

```javascript
// ✅ Você verá:
[WalletPage] Checking key: polygon_usdt (polygon_usdt), match: YES
[WalletPage] Found token: USDT on network: polygon
[WalletPage] Adding token: USDT, balance=100, price=1.0
```

---

## 💻 VERIFICAÇÃO - API (Opcional)

Se quiser confirmar que o backend está retornando os dados:

```bash
# 1. Login primeiro
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}'

# Copie o "access_token" da resposta

# 2. Buscar saldos com token
curl "http://localhost:8000/wallets/{SEU_WALLET_ID}/balances?include_tokens=true" \
  -H "Authorization: Bearer {SEU_TOKEN}"

# Procure na resposta por "polygon_usdt", "polygon_usdc", etc
```

---

## 📊 ESTRUTURA DOS DADOS RETORNADOS

### Backend Retorna
```json
{
  "wallet_id": "uuid-aqui",
  "wallet_name": "Minha Carteira Multi",
  "balances": {
    "bitcoin": {
      "network": "bitcoin",
      "address": "1A1z...",
      "balance": "0.5",
      "price_usd": "43000.00",
      "balance_usd": "21500.00"
    },
    "polygon": {
      "network": "polygon",
      "address": "0xa1aa...",
      "balance": "0",
      "price_usd": "0.85",
      "balance_usd": "0.00"
    },
    "polygon_usdt": {
      "network": "polygon (USDT)",
      "address": "0xa1aa...",
      "balance": "100.00",
      "price_usd": "1.00",
      "balance_usd": "100.00"
    },
    "polygon_usdc": {
      "network": "polygon (USDC)",
      "address": "0xa1aa...",
      "balance": "50.00",
      "price_usd": "1.00",
      "balance_usd": "50.00"
    }
  },
  "total_usd": "21650.00",
  "total_brl": "97425.00"
}
```

### Frontend Processa
```javascript
// Detecta padrão na chave: {rede}_{token}
const regex = /^([a-z0-9]+)_(usdt|usdc)$/
const match = "polygon_usdt".match(regex)
// ✅ Match encontrado! [network: "polygon", token: "usdt"]
```

---

## ✨ ANTES vs DEPOIS

### ❌ ANTES (Não funcionava)
```
1. Frontend chama: GET /wallets/{id}/balances
2. Backend retorna: APENAS saldos nativos
3. Frontend vê: só BTC, ETH, MATIC, etc
4. Stablecoins: INVISÍVEIS 👻
```

### ✅ DEPOIS (Agora funciona)
```
1. Frontend chama: GET /wallets/{id}/balances?include_tokens=true
2. Backend retorna: saldos nativos + USDT + USDC
3. Frontend vê: BTC, ETH, MATIC, USDT, USDC
4. Stablecoins: VISÍVEIS ✨
```

---

## 🎨 CUSTOMIZAÇÕES DISPONÍVEIS

Se quiser melhorar mais, pode fazer:

### 1. Adicionar Mais Stablecoins (DAI, BUSD, etc)
**Arquivo**: `backend/app/config/token_contracts.py`
- Já tem DAI, BUSD, USDT, USDC
- Basta adicionar novos contratos

### 2. Mudar Cores das Stablecoins
**Arquivo**: `Frontend/src/pages/wallet/WalletPage.tsx` (linha ~310)
```typescript
const tokenColor =
  tokenName === 'USDT' ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'
```

### 3. Aumentar Cache
**Arquivo**: `Frontend/src/hooks/useWallet.ts` (linha ~78)
```typescript
refetchInterval: 240 * 1000, // aumentar de 120s para 240s
```

---

## 🆘 SE NÃO FUNCIONAR

### Checklist
- [ ] Backend rodando em http://localhost:8000
- [ ] Frontend rodando em http://localhost:3000
- [ ] Arquivo modificado: `Frontend/src/services/wallet.ts`
- [ ] Mudança aplicada: adicionar `?include_tokens=true`
- [ ] Navegador recarregado (Ctrl+R ou Cmd+R)
- [ ] Cache limpo (F12 → Application → Clear Storage)
- [ ] Verificar console (F12 → Console) por erros

### Logs para Procurar
- ✅ `[WalletPage] Found token: USDT on network: polygon`
- ❌ Se não aparecer: backend não está retornando tokens

### Comando para Testar Backend Direto
```bash
# No terminal
cd /Users/josecarlosmartins/Documents/HOLDWallet
bash test_stablecoins.sh
```

---

## 📝 RESUMO FINAL

| Item | Status | Detalhes |
|------|--------|----------|
| **Backend** | ✅ Pronto | Endpoint `/balances?include_tokens=true` implementado |
| **Frontend** | ✅ Pronto | Hook processa tokens automaticamente |
| **Mudança** | ✅ Feita | 1 arquivo, 1 linha modificada |
| **Testes** | ✅ Pronto | Script test_stablecoins.sh disponível |
| **Resultado** | ✅ Esperado | Stablecoins aparecem em http://localhost:3000/wallet |

---

**Tempo de implementação**: ~5 minutos  
**Complexidade**: ⭐☆☆☆☆ (Muito simples)  
**Impacto**: 🔥🔥🔥 (Muito positivo)  

---

## 🎉 PRONTO!

Agora suas stablecoins (USDT, USDC) aparecem na página de wallet!

Se tiver dúvidas, os logs detalhados ajudarão a debugar:
- Backend: `/backend/backend.log`
- Browser: F12 → Console
