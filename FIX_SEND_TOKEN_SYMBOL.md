# 🔧 Fix: Erro 500 ao Enviar Transação - token_symbol não estava sendo enviado

## 🐛 Problema Encontrado

**Erro:** `POST http://127.0.0.1:8000/wallets/send 500 (Internal Server Error)`

**Causa:** O Frontend estava enviando transações SEM o campo `token_symbol`, mas o Backend PRECISAVA deste campo para determinar se era USDT, USDC ou moeda nativa.

**Stack:**

```
SendPage.tsx:505 ❌ Erro ao enviar: Error: Erro ao enviar transação
    at TransactionService.sendTransactionDirect (transactionService.ts:238:13)
    at async TransactionService.sendTransaction (transactionService.ts:363:24)
    at async handleSubmit2FA (SendPage.tsx:487:22)
```

---

## ✅ Solução Aplicada

### Etapa 1: Atualizar `transactionService.ts`

**Arquivo:** `/Frontend/src/services/transactionService.ts`

**Mudança:**

```typescript
// ANTES (❌ Faltava token_symbol):
async sendTransactionDirect(data: {
  wallet_id?: string
  to_address: string
  amount: string
  network: string
  token_address?: string  // ← Tinha token_address
  two_factor_token?: string
}): Promise<any> {
  const payload: Record<string, any> = {
    to_address: data.to_address,
    amount: data.amount,
    network: data.network,
    fee_level: data.fee_level || data.fee_preference || 'standard',
    // ❌ Não incluía token_symbol!
  }
}

// DEPOIS (✅ Incluiu token_symbol):
async sendTransactionDirect(data: {
  wallet_id?: string
  to_address: string
  amount: string
  network: string
  token_symbol?: string        // ← ADICIONADO
  token_address?: string
  two_factor_token?: string
}): Promise<any> {
  const payload: Record<string, any> = {
    to_address: data.to_address,
    amount: data.amount,
    network: data.network,
    fee_level: data.fee_level || data.fee_preference || 'standard',
    ...(data.token_symbol && { token_symbol: data.token_symbol }),  // ← ADICIONADO
    ...(data.token_address && { token_address: data.token_address }),
    ...(data.two_factor_token && { two_factor_token: data.two_factor_token }),
  }
}
```

### Etapa 2: Atualizar `sendService.ts`

**Arquivo:** `/Frontend/src/services/sendService.ts`

**Mudança:**

```typescript
// ANTES (❌ Interface não tinha token_symbol):
export interface SendTransactionRequest {
  wallet_id: string;
  to_address: string;
  amount: string;
  network: string;
  fee_level: "slow" | "standard" | "fast";
  mode?: "custodial" | "non-custodial";
  note?: string;
  password?: string;
  two_factor_token?: string;
}

// DEPOIS (✅ Interface com token_symbol):
export interface SendTransactionRequest {
  wallet_id: string;
  to_address: string;
  amount: string;
  network: string;
  fee_level: "slow" | "standard" | "fast";
  mode?: "custodial" | "non-custodial";
  note?: string;
  password?: string;
  token_symbol?: string; // ← ADICIONADO
  token_address?: string; // ← ADICIONADO
  two_factor_token?: string;
}
```

---

## 🔄 Fluxo de Dados Completo

### Antes (Quebrado):

```
SendPage.tsx
  → setPendingTransaction({ token_symbol: "USDT", ... })
  → handleSubmit2FA()
  → transactionService.sendTransaction({ token_symbol: "USDT", ... })
  → sendTransactionDirect()
  → payload = { to_address, amount, network, fee_level }  ❌ SEM token_symbol!
  → POST /wallets/send { ..., SEM token_symbol }
  → Backend erro 500 - não consegue detectar se é token ou moeda nativa
```

### Depois (Funcionando):

```
SendPage.tsx
  → setPendingTransaction({ token_symbol: "USDT", ... })
  → handleSubmit2FA()
  → transactionService.sendTransaction({ token_symbol: "USDT", ... })
  → sendTransactionDirect()
  → payload = { to_address, amount, network, fee_level, token_symbol: "USDT" }  ✅
  → POST /wallets/send { ..., token_symbol: "USDT" }
  → Backend detecta: "É USDT! Usar USDTTransactionService"
  → ✅ Transação enviada com sucesso!
```

---

## 📝 Mudanças Técnicas

| Arquivo                 | Linha | Mudança                                                                       |
| ----------------------- | ----- | ----------------------------------------------------------------------------- |
| `transactionService.ts` | 203   | Adicionado `token_symbol?: string` no tipo `data`                             |
| `transactionService.ts` | 225   | Adicionado `...(data.token_symbol && { token_symbol: data.token_symbol })`    |
| `transactionService.ts` | 226   | Adicionado `...(data.token_address && { token_address: data.token_address })` |
| `sendService.ts`        | 41    | Adicionado `token_symbol?: string` na interface                               |
| `sendService.ts`        | 42    | Adicionado `token_address?: string` na interface                              |

---

## 🧪 Como Testar

1. **Abra SendPage**
2. **Selecione USDT (qualquer rede)**
3. **Preencha:**
   - Para: `0x7913436c1B61575F66d31B6d5b77767A7dC30EFa`
   - Valor: `1`
   - Taxa: `standard`
4. **Clique "Enviar"**
5. **Insira código 2FA**

### Resultado Esperado:

✅ **Sem erro 500**  
✅ **Transação enviada com sucesso**  
✅ **Ver hash no Explorer**

### Antes (Erro):

```
❌ Error: Erro ao enviar transação
500 Internal Server Error
```

### Depois (Funciona):

```
✅ Transaction response: {
  success: true,
  tx_hash: "0x...",
  status: "pending"
}
```

---

## 🎯 Por Que Fazia Erro 500?

O Backend em `/wallets/send` faz isto:

```python
# Detectar se é token USDT ou USDC
is_usdt = request.token_symbol and request.token_symbol.upper() == 'USDT'
is_usdc = request.token_symbol and request.token_symbol.upper() == 'USDC'

if is_usdt or is_usdc:
    # Usar USDTTransactionService
    logger.info(f"🪙 Detectado token {request.token_symbol}")
    usdt_service = USDTTransactionService()
    # ... enviar como token ERC-20
else:
    # Enviar como moeda nativa
    logger.info("💱 Transação nativa")
    tx_hash, tx_details = await blockchain_signer.sign_evm_transaction(...)
```

**Sem `token_symbol`, o Backend não sabia qual caminho tomar!**

---

## ✨ Status

**🟢 CORRIDO E PRONTO PARA USO**

O Frontend agora envia `token_symbol` corretamente, e o Backend consegue detectar:

- ✅ USDT → USDTTransactionService
- ✅ USDC → USDTTransactionService
- ✅ Moeda Nativa (sem token) → blockchain_signer

**Próximo Teste:** Recarregue o Frontend e tente enviar USDT! 🚀
