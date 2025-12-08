# 💰 Sistema de Depósitos - Armazenamento no Banco de Dados

## ✅ SIM, O SISTEMA SALVA O DEPÓSITO NO BANCO DE DADOS

Quando um usuário faz um depósito em nossa plataforma, o sistema **automatically salva este montante** em duas tabelas principais do banco de dados:

---

## 📊 Fluxo Completo de Depósito

```
┌─────────────────────────────────────────────────────────────────┐
│  USUÁRIO DEPOSITA USDT NA HOLD WALLET                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  BLOCKCHAIN DETECTA DEPÓSITO                                    │
│  (Transação confirmada na rede)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  WEBHOOK CHAMADO                                                │
│  POST /wallet/deposit (linha 1239 em p2p.py)                   │
│                                                                  │
│  Parâmetros:                                                    │
│  - user_id: 123                                                 │
│  - cryptocurrency: "USDT"                                       │
│  - amount: 1000.00                                              │
│  - transaction_hash: "0x123abc..."                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  🗄️  SALVA NA TABELA: wallet_balances                            │
│                                                                  │
│  INSERT/UPDATE wallet_balances:                                 │
│  ├─ user_id: 123                                                │
│  ├─ cryptocurrency: "USDT"                                      │
│  ├─ available_balance: 1000.00  ← MONTANTE DEPOSITADO           │
│  ├─ locked_balance: 0.0                                         │
│  ├─ total_balance: 1000.00                                      │
│  └─ created_at: CURRENT_TIMESTAMP                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  📝 REGISTRA NA TABELA: balance_history (Auditoria)             │
│                                                                  │
│  INSERT balance_history:                                        │
│  ├─ user_id: 123                                                │
│  ├─ cryptocurrency: "USDT"                                      │
│  ├─ operation_type: "deposit"  ← TIPO DE OPERAÇÃO               │
│  ├─ amount: 1000.00  ← MONTANTE                                 │
│  ├─ balance_before: 0.0                                         │
│  ├─ balance_after: 1000.00                                      │
│  ├─ reference_id: "0x123abc..." (hash da transação)             │
│  ├─ reason: "Blockchain deposit"                                │
│  └─ created_at: CURRENT_TIMESTAMP                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ✅ RESPOSTA RETORNADA                                          │
│                                                                  │
│  {                                                              │
│    "success": true,                                             │
│    "data": {                                                    │
│      "cryptocurrency": "USDT",                                  │
│      "available_balance": 1000.00,                              │
│      "locked_balance": 0.0,                                     │
│      "total_balance": 1000.00,                                  │
│      "amount_deposited": 1000.00                                │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Tabelas de Armazenamento

### 1️⃣ **wallet_balances** (Saldo Principal)

```sql
CREATE TABLE wallet_balances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,                          -- Qual usuário
    cryptocurrency TEXT NOT NULL,                   -- USDT, BTC, ETH...
    available_balance REAL DEFAULT 0.0,             -- ✅ SALDO DISPONÍVEL
    locked_balance REAL DEFAULT 0.0,                -- Congelado em trades
    total_balance REAL DEFAULT 0.0,                 -- Total (disponível + congelado)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Quando foi criado
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Última atualização
    last_updated_reason TEXT,                       -- Por que mudou
    UNIQUE(user_id, cryptocurrency)                 -- Um saldo por cripto/usuário
);
```

**Exemplo de registro:**
```
id: "a1b2c3d4e5f6g7h8"
user_id: "123"
cryptocurrency: "USDT"
available_balance: 1000.00      ← VALOR DEPOSITADO
locked_balance: 0.0
total_balance: 1000.00
created_at: 2025-12-07 14:30:00
updated_at: 2025-12-07 14:30:00
last_updated_reason: "Blockchain deposit"
```

---

### 2️⃣ **balance_history** (Histórico/Auditoria)

```sql
CREATE TABLE balance_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,              -- Qual usuário
    cryptocurrency TEXT NOT NULL,       -- USDT, BTC...
    operation_type TEXT NOT NULL,       -- "deposit", "freeze", "unfreeze"...
    amount REAL NOT NULL,               -- ✅ MONTANTE DA OPERAÇÃO
    balance_before REAL NOT NULL,       -- Saldo anterior
    balance_after REAL NOT NULL,        -- Saldo depois
    locked_before REAL NOT NULL,        -- Congelado antes
    locked_after REAL NOT NULL,         -- Congelado depois
    reference_id TEXT,                  -- Hash da transação blockchain
    reason TEXT,                        -- Motivo da transação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Exemplo de registro:**
```
id: "x1y2z3a4b5c6d7e8"
user_id: "123"
cryptocurrency: "USDT"
operation_type: "deposit"           ← TIPO DE OPERAÇÃO
amount: 1000.00                     ← MONTANTE
balance_before: 0.0
balance_after: 1000.00
locked_before: 0.0
locked_after: 0.0
reference_id: "0x123abc..." (hash blockchain)
reason: "Blockchain deposit"
created_at: 2025-12-07 14:30:00
```

---

## 🔄 O Que Acontece em Cada Operação

### Quando Usuário Deposita 1000 USDT:

| Etapa | Tabela | Campo | Valor Antes | Valor Depois | Ação |
|-------|--------|-------|------------|-------------|------|
| 1️⃣ | wallet_balances | available_balance | 0 | 1000 | **SALVO** ✅ |
| 1️⃣ | wallet_balances | total_balance | 0 | 1000 | **SALVO** ✅ |
| 2️⃣ | balance_history | amount | - | 1000 | **REGISTRADO** 📝 |
| 2️⃣ | balance_history | reference_id | - | hash | **RASTREÁVEL** 🔍 |

---

## 💡 Quando o Sistema Salva

✅ **Salva imediatamente quando:**

1. **Usuário deposita via blockchain**
   - Webhook detecta confirmação
   - Chama `POST /wallet/deposit`
   - Registra montante em `wallet_balances.available_balance`

2. **Usuário inicia um trade**
   - Sistema valida saldo disponível
   - Se suficiente: congela o montante
   - Move de `available_balance` para `locked_balance`
   - Registra em `balance_history`

3. **Trade é completado**
   - Sistema libera o saldo congelado
   - Move de `locked_balance` para outra conta (quando necessário)
   - Registra final em `balance_history`

---

## 🔐 Segurança & Auditoria

### Rastreamento Completo:

Cada depósito tem um registro permanente com:
- ✅ **Montante**: Quanto foi depositado
- ✅ **Usuário**: Quem depositou
- ✅ **Data/Hora**: Quando foi depositado
- ✅ **Hash Blockchain**: Prova do depósito
- ✅ **Tipo de Operação**: "deposit"
- ✅ **Histórico de Saldos**: Antes e depois

### Isso permite:
- 📊 Relatórios de depósitos
- 🔍 Auditorias internas
- ⚖️ Compliance/KYC
- 💼 Disputas de transações
- 📈 Análise de volume

---

## 📱 Exemplo de Uso na API

### Requisição de Depósito:
```bash
POST /wallet/deposit?user_id=123
Content-Type: application/json

{
  "cryptocurrency": "USDT",
  "amount": 1000,
  "transaction_hash": "0x123abc...",
  "reason": "Blockchain deposit"
}
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "cryptocurrency": "USDT",
    "available_balance": 1000.00,
    "locked_balance": 0.0,
    "total_balance": 1000.00,
    "amount_deposited": 1000.00
  },
  "message": "Deposited 1000 USDT successfully"
}
```

---

## 📋 Resumo

| Pergunta | Resposta |
|----------|----------|
| Quando usuário deposita, salva no BD? | ✅ **SIM** - Em `wallet_balances` |
| Onde fica o montante? | 📊 `available_balance` |
| Pode recuperar histórico? | ✅ **SIM** - Em `balance_history` |
| É seguro? | ✅ **SIM** - Com hash blockchain |
| Quanto tempo leva? | ⚡ Imediato após webhook |

---

## 🎯 Fluxo Resumido

```
Depósito Blockchain
    ↓
Webhook chamado (POST /wallet/deposit)
    ↓
✅ Cria/atualiza wallet_balances
✅ Registra em balance_history
    ↓
Montante salvo permanentemente no BD
    ↓
Usuário pode usar saldo em trades/ordens
```

---

## 🚀 Próximos Passos

- [ ] Integrar webhook blockchain para detectar depósitos
- [ ] Criar interface no frontend para ver saldo
- [ ] Permitir saques (reverso do depósito)
- [ ] Implementar sistema de comissões
- [ ] Adicionar cálculo de taxas

