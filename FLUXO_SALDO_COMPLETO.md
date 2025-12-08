# 🔄 FLUXO COMPLETO DO SISTEMA DE SALDO - HOLD WALLET P2P

## 📊 DIAGRAMA DO FLUXO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    1️⃣ USUÁRIO DEPOSITA USDT                             │
│                                                                           │
│   Usuário envia 1000 USDT para endereço da Hold Wallet (blockchain)    │
│   Blockchain detecta transação ✅                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    2️⃣ WEBHOOK ATUALIZA SALDO                             │
│                                                                           │
│   POST /p2p/wallet/deposit?user_id=123                                 │
│   {                                                                      │
│     "cryptocurrency": "USDT",                                           │
│     "amount": 1000,                                                     │
│     "transaction_hash": "0x123abc...",                                 │
│     "reason": "Blockchain deposit"                                     │
│   }                                                                      │
│                                                                           │
│   RESULTADO:                                                             │
│   - wallet_balances                                                     │
│     • available_balance: 1000 ✅ (pode usar)                            │
│     • locked_balance: 0      (congelado)                                │
│     • total_balance: 1000    (total)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  3️⃣ FRONTEND BUSCA SALDO REAL                            │
│                                                                           │
│   GET /p2p/wallet/balance?user_id=123&cryptocurrency=USDT              │
│                                                                           │
│   RESPONSE:                                                              │
│   {                                                                      │
│     "success": true,                                                    │
│     "data": {                                                           │
│       "user_id": "123",                                                │
│       "cryptocurrency": "USDT",                                        │
│       "available_balance": 1000,    ✅ Mostra no app!                  │
│       "locked_balance": 0,                                             │
│       "total_balance": 1000                                            │
│     }                                                                   │
│   }                                                                      │
│                                                                           │
│   CreateOrderPage.tsx mostra:                                           │
│   "Você tem 1000 USDT disponível para vender"                         │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  4️⃣ USUÁRIO CRIA ORDEM DE VENDA                         │
│                                                                           │
│   POST /p2p/orders?user_id=123                                         │
│   {                                                                      │
│     "type": "sell",                                                     │
│     "coin": "USDT",                                                    │
│     "price": 5.00,                                                     │
│     "amount": 1000,     ← Quer vender 1000 USDT                        │
│     "min_amount": 100,                                                 │
│     "max_amount": 5000,                                                │
│     "fiat_currency": "BRL",                                            │
│     "payment_methods": [1, 2, 3],                                      │
│     "time_limit": 30                                                   │
│   }                                                                      │
│                                                                           │
│   RESULTADO: Ordem criada (SEM congelar saldo ainda)                   │
│   • p2p_orders.id = 5                                                  │
│   • p2p_orders.status = 'active'                                       │
│   • wallet_balances IGUAL: available: 1000, locked: 0                  │
│     (saldo só congela quando alguém inicia TRADE)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              5️⃣ COMPRADOR ENCONTRA ORDEM E INICIA TRADE                 │
│                                                                           │
│   Comprador (user 456) vê a ordem no marketplace                        │
│   POST /p2p/trades?buyer_id=456                                        │
│   {                                                                      │
│     "order_id": 5,                                                      │
│     "amount": 100,      ← Quer comprar 100 USDT                        │
│     "payment_method_id": 1                                             │
│   }                                                                      │
│                                                                           │
│   BACKEND VALIDA:                                                       │
│   ✅ Vendedor (user 123) tem >= 100 USDT?                              │
│      SELECT available_balance FROM wallet_balances                     │
│      WHERE user_id=123 AND cryptocurrency='USDT'                      │
│      → Sim! Tem 1000 USDT ✅                                           │
│                                                                           │
│   CONGELA O SALDO DO VENDEDOR:                                         │
│   UPDATE wallet_balances                                               │
│   SET available_balance -= 100,    (1000 → 900)                        │
│       locked_balance += 100,       (0 → 100)                           │
│   WHERE user_id=123 AND cryptocurrency='USDT'                         │
│                                                                           │
│   RESULTADO:                                                             │
│   • p2p_trades.id = 42 (novo trade criado)                             │
│   • p2p_trades.status = 'pending'                                      │
│   • Saldo do vendedor:                                                 │
│     - available_balance: 900  ← Reduzido                              │
│     - locked_balance: 100     ← Congelado neste trade ❄️               │
│     - total_balance: 1000     ← Igual (apenas moveu)                   │
│                                                                           │
│   RESPOSTA:                                                              │
│   {                                                                      │
│     "success": true,                                                    │
│     "data": {                                                           │
│       "id": "42",                                                      │
│       "status": "pending",                                             │
│       "amount": "100",                                                 │
│       "message": "Trade started successfully"                         │
│     }                                                                   │
│   }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│            6️⃣ DURANTE O TRADE (EM ESCROW)                              │
│                                                                           │
│   Vendedor (123):                                                       │
│   • available_balance: 900  (pode usar em outro trade)                │
│   • locked_balance: 100     (congelado neste trade) ❄️                │
│                                                                           │
│   Comprador marca PAGAMENTO CONFIRMADO                                  │
│   Vendedor marca CRIPTMOEDA ENVIADA                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│             7️⃣ TRADE COMPLETA - LIBERA O SALDO                         │
│                                                                           │
│   POST /p2p/trades/42/complete                                        │
│                                                                           │
│   LIBERA O SALDO CONGELADO:                                            │
│   UPDATE wallet_balances                                               │
│   SET locked_balance -= 100    (100 → 0)  [Vendedor]                  │
│                                                                           │
│   UPDATE wallet_balances                                               │
│   SET available_balance += 100  (0 → 100) [Comprador recebe USDT]     │
│                                                                           │
│   RESULTADO FINAL:                                                      │
│                                                                           │
│   VENDEDOR (user 123):                                                 │
│   • available_balance: 900  (continua usando)                         │
│   • locked_balance: 0       (desbloqueado!) ✅                        │
│   • total_balance: 900      (vendeu 100 USDT)                         │
│   • Recebeu: 500 BRL (100 USDT × 5 BRL/USDT)                         │
│                                                                           │
│   COMPRADOR (user 456):                                                │
│   • available_balance: 100  (recebeu USDT!) ✅                        │
│   • locked_balance: 0                                                 │
│   • total_balance: 100      (comprou 100 USDT)                        │
│                                                                           │
│   TRADE STATUS: 'completed'                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 CONCEITOS PRINCIPAIS

### **available_balance** 💵

- Saldo que o usuário pode usar AGORA
- Quando inicia um trade, é reduzido (congelado)

### **locked_balance** ❄️

- Saldo congelado em trades ativos
- Não pode usar, mas continua sendo "seu"
- Quando trade completa, é liberado

### **total_balance** 📊

- `available_balance + locked_balance`
- Seu saldo real na plataforma

---

## 📝 EXEMPLOS DE API

### 1️⃣ Depositar Saldo (Webhook do Blockchain)

```bash
curl -X POST http://localhost:8000/p2p/wallet/deposit?user_id=123 \
  -H "Content-Type: application/json" \
  -d '{
    "cryptocurrency": "USDT",
    "amount": 1000,
    "transaction_hash": "0xabcd1234...",
    "reason": "Blockchain deposit"
  }'

# RESPONSE:
{
  "success": true,
  "data": {
    "cryptocurrency": "USDT",
    "available_balance": 1000,
    "locked_balance": 0,
    "total_balance": 1000,
    "amount_deposited": 1000
  },
  "message": "Deposited 1000 USDT successfully"
}
```

### 2️⃣ Buscar Saldo (Frontend)

```bash
curl http://localhost:8000/p2p/wallet/balance?user_id=123&cryptocurrency=USDT

# RESPONSE:
{
  "success": true,
  "data": {
    "user_id": "123",
    "cryptocurrency": "USDT",
    "available_balance": 1000,
    "locked_balance": 0,
    "total_balance": 1000
  }
}
```

### 3️⃣ Criar Ordem

```bash
curl -X POST http://localhost:8000/p2p/orders?user_id=123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sell",
    "coin": "USDT",
    "price": 5.00,
    "amount": 1000,
    "min_amount": 100,
    "max_amount": 5000,
    "fiat_currency": "BRL",
    "payment_methods": [1, 2],
    "time_limit": 30
  }'

# RESPONSE:
{
  "success": true,
  "data": {
    "id": 5,
    "status": "active"
  }
}

# NOTA: O saldo NÃO é congelado aqui! Apenas quando alguém inicia trade.
```

### 4️⃣ Iniciar Trade (Congela Saldo)

```bash
curl -X POST http://localhost:8000/p2p/trades?buyer_id=456 \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 5,
    "amount": 100,
    "payment_method_id": 1
  }'

# RESPONSE:
{
  "success": true,
  "data": {
    "id": "42",
    "status": "pending",
    "amount": "100"
  },
  "message": "Trade started successfully"
}

# IMPORTANTE: Saldo do vendedor (123) foi congelado:
# antes: available: 1000, locked: 0
# depois: available: 900, locked: 100
```

### 5️⃣ Completar Trade (Libera Saldo)

```bash
curl -X POST http://localhost:8000/p2p/trades/42/complete \
  -H "Content-Type: application/json" \
  -d '{}'

# RESPONSE:
{
  "success": true,
  "data": {
    "trade_id": "42",
    "status": "completed",
    "message": "Balance released successfully"
  }
}

# RESULTADO:
# Vendedor: available: 900, locked: 0  (saldo desbloqueado!)
# Comprador: available: 100, locked: 0  (recebeu USDT!)
```

---

## 📊 TABELAS DO BANCO

### **wallet_balances**

```
id                    | user_id | cryptocurrency | available_balance | locked_balance | total_balance
abcd1234...           | 123     | USDT           | 900              | 100           | 1000
```

### **balance_history** (Auditoria)

```
id          | user_id | cryptocurrency | operation_type | amount | balance_before | balance_after | reason
xyz123...   | 123     | USDT           | deposit        | 1000   | 0             | 1000         | Blockchain deposit
xyz456...   | 123     | USDT           | freeze         | 100    | 1000          | 900          | P2P Trade #42
xyz789...   | 123     | USDT           | unfreeze       | 100    | 900           | 1000         | Trade #42 completed
```

---

## ✅ CHECKLIST - O QUE FOI IMPLEMENTADO

### **Backend** ✅

- [x] Tabelas: `wallet_balances`, `balance_history`
- [x] Endpoint: `POST /wallet/deposit` - Depositar saldo
- [x] Endpoint: `GET /wallet/balance` - Buscar saldo
- [x] Validação: `start_trade` valida saldo antes de congelar
- [x] Congelamento: Saldo congelado automaticamente ao iniciar trade
- [x] Endpoint: `POST /trades/{trade_id}/complete` - Libera saldo
- [x] Auditoria: Todas as operações registradas em `balance_history`

### **Frontend** (Próximo passo)

- [ ] Hook `useWalletBalance` para buscar saldo real
- [ ] Mostrar saldo na `CreateOrderPage`
- [ ] Validação antes de permitir criar ordem
- [ ] Mostrar saldo congelado durante trade

---

## 🚀 PRÓXIMAS AÇÕES

1. **Frontend**: Integrar hook para buscar saldo real
2. **Frontend**: Mostrar saldo no CreateOrderPage
3. **Testes**: Testar fluxo completo de ponta a ponta
4. **Documentação**: Atualizar guia do usuário

---

## 💡 RESUMO SIMPLES

```
DEPÓSITO: Saldo entra disponível (available_balance ↑)
ORDEM: Cria ordem (saldo continua igual)
TRADE: Congela saldo (available ↓, locked ↑)
COMPLETA: Libera saldo (locked ↓, ou transferred para outro user)
```
