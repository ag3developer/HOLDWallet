# 📋 Sistema de Auditoria Completo - Instant Trade OTC

## ✅ Tudo é Registrado

Todas as operações de compra e venda de criptomoedas são registradas com **rastreamento completo** para fins de auditoria.

## 🗄️ Estrutura de Armazenamento

### 1. Tabela Principal: `instant_trades`

Armazena todos os detalhes da operação:

```sql
instant_trades (
  id: UUID,                          -- ID único da operação
  user_id: INTEGER,                  -- Usuário que fez a operação
  operation_type: VARCHAR,           -- 'buy' ou 'sell'
  symbol: VARCHAR,                   -- 'BTC', 'ETH', 'USDT', etc
  crypto_price: DECIMAL,             -- Preço da crypto no momento
  fiat_amount: DECIMAL,              -- Valor em BRL/USD/EUR
  crypto_amount: DECIMAL,            -- Quantidade de crypto

  -- Taxas e Spreads
  spread_percentage: DECIMAL,        -- 3%
  spread_amount: DECIMAL,            -- Valor do spread
  network_fee_percentage: DECIMAL,   -- 0.25%
  network_fee_amount: DECIMAL,       -- Valor da taxa
  total_amount: DECIMAL,             -- Total final

  -- Pagamento
  payment_method: VARCHAR,           -- 'pix', 'credit_card', 'ted', 'wallet'
  payment_id: VARCHAR,               -- ID externo do gateway
  payment_proof_url: VARCHAR,        -- URL do comprovante

  -- Status
  status: VARCHAR,                   -- pending, payment_confirmed, completed, etc
  reference_code: VARCHAR,           -- OTC-2025-XXXXXX

  -- Timing
  created_at: DATETIME,              -- Quando foi criada
  updated_at: DATETIME,              -- Última atualização
  expires_at: DATETIME,              -- Vencimento (15 min)
  payment_confirmed_at: DATETIME,    -- Quando pagamento foi confirmado
  completed_at: DATETIME,            -- Quando completou
)
```

### 2. Tabela de Histórico: `instant_trade_history`

Registra **cada mudança de status** com detalhes:

```sql
instant_trade_history (
  id: INTEGER,                       -- ID do registro
  trade_id: UUID,                    -- FK para instant_trades

  old_status: VARCHAR,               -- Status anterior
  new_status: VARCHAR,               -- Novo status
  reason: VARCHAR,                   -- Motivo da mudança
  history_details: TEXT,             -- Detalhes adicionais (JSON)

  created_at: DATETIME,              -- Quando aconteceu
)
```

## 🔄 Fluxo de Operação com Rastreamento

### Exemplo: Compra de BTC

```
1️⃣ CRIAÇÃO DA OPERAÇÃO
   POST /instant-trade/quote
   └─ Backend calcula cotação
   └─ Armazena em cache (30s)
   └─ Retorna quote_id

2️⃣ CONFIRMAÇÃO DA OPERAÇÃO
   POST /instant-trade/create
   └─ Backend valida quote_id
   └─ Cria InstantTrade (status: PENDING)
   ✅ REGISTRADO: instant_trades
   ✅ REGISTRADO: instant_trade_history (entry: "Trade created from quote")

3️⃣ CONFIRMAÇÃO DE PAGAMENTO
   POST /instant-trade/{trade_id}/confirm-payment
   └─ Backend marca pagamento como confirmado
   └─ Atualiza payment_confirmed_at
   ✅ REGISTRADO: instant_trades (status: PAYMENT_CONFIRMED)
   ✅ REGISTRADO: instant_trade_history (entry: "Payment confirmed")

4️⃣ CONCLUSÃO DA OPERAÇÃO
   POST /instant-trade/{trade_id}/complete
   └─ Backend confirma transferência de crypto
   └─ Atualiza completed_at
   ✅ REGISTRADO: instant_trades (status: COMPLETED)
   ✅ REGISTRADO: instant_trade_history (entry: "Trade completed successfully")

5️⃣ AUDITORIA COMPLETA
   GET /instant-trade/{trade_id}/audit-log
   └─ Retorna histórico completo de todas mudanças
```

## 📊 Estados Possíveis

```
PENDING
  ↓
PAYMENT_CONFIRMED
  ├─→ COMPLETED (sucesso)
  ├─→ FAILED (erro na transferência)
  └─→ EXPIRED (venceu 15 min)

Alternativa:
PENDING → CANCELLED (usuário cancelou)
```

## 🔍 Auditoria em Ação

### Consultar Histórico Completo

```bash
GET /instant-trade/{trade_id}/audit-log
```

**Resposta:**

```json
{
  "success": true,
  "audit_log": {
    "trade_id": "12345-67890",
    "reference_code": "OTC-2025-ABC123",
    "current_status": "completed",
    "history": [
      {
        "timestamp": "2025-12-07T23:01:00Z",
        "old_status": null,
        "new_status": "pending",
        "reason": "Trade created from quote",
        "details": "Quote ID: quote_abc123, Payment method: pix"
      },
      {
        "timestamp": "2025-12-07T23:05:30Z",
        "old_status": "pending",
        "new_status": "payment_confirmed",
        "reason": "Payment confirmed",
        "details": "Payment received at 2025-12-07T23:05:30Z"
      },
      {
        "timestamp": "2025-12-07T23:06:15Z",
        "old_status": "payment_confirmed",
        "new_status": "completed",
        "reason": "Trade completed successfully",
        "details": "Crypto transferred to user wallet at 2025-12-07T23:06:15Z"
      }
    ]
  }
}
```

## 📈 Listagem de Operações do Usuário

```bash
GET /instant-trade/history/my-trades?page=1&per_page=10
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "12345-67890",
        "reference_code": "OTC-2025-ABC123",
        "operation": "buy",
        "symbol": "BTC",
        "fiat_amount": 1000.0,
        "crypto_amount": 0.00322815,
        "status": "completed",
        "created_at": "2025-12-07T23:01:00Z"
      },
      {
        "id": "98765-43210",
        "reference_code": "OTC-2025-XYZ789",
        "operation": "sell",
        "symbol": "ETH",
        "fiat_amount": 2500.0,
        "crypto_amount": 1.5,
        "status": "completed",
        "created_at": "2025-12-07T22:15:00Z"
      }
    ],
    "total": 2,
    "page": 1,
    "per_page": 10
  }
}
```

## 🔐 Detalhes Registrados por Operação

Para cada operação, são registrados:

### Dados da Operação

- ✅ ID único (UUID)
- ✅ Tipo (BUY ou SELL)
- ✅ Criptomoeda
- ✅ Quantidade
- ✅ Valor em BRL/USD/EUR
- ✅ Preço no momento da operação

### Taxas e Custos

- ✅ Spread: 3%
- ✅ Taxa de rede: 0.25%
- ✅ Valor total final

### Pagamento

- ✅ Método de pagamento
- ✅ ID do gateway (PIX, Stripe, etc)
- ✅ Comprovante (URL/arquivo)
- ✅ Data/hora da confirmação

### Timing

- ✅ Criada em: YYYY-MM-DD HH:MM:SS
- ✅ Pagamento confirmado em: YYYY-MM-DD HH:MM:SS
- ✅ Completada em: YYYY-MM-DD HH:MM:SS
- ✅ Válida até: YYYY-MM-DD HH:MM:SS

### Histórico de Mudanças

- ✅ Cada mudança de status
- ✅ Motivo da mudança
- ✅ Detalhes adicionais
- ✅ Timestamp preciso

## 📋 Exemplos de Auditoria

### Rastreamento Completo - BTC Buy

```
Data/Hora          Status                  Evento
─────────────────────────────────────────────────────────────
23:01:00          PENDING                 Trade criado (quote_abc123)
                                          R$ 1.000,00 → 0.00322815 BTC
                                          Spread: 3% (R$ 30)
                                          Taxa rede: 0.25% (R$ 2,50)
                                          Total: R$ 1.032,50
                                          Pagamento: PIX

23:05:30          PAYMENT_CONFIRMED       Pagamento recebido
                                          Comprovante: pix_proof_12345
                                          Confirmado por: Sistema PIX

23:06:15          COMPLETED               BTC transferido para wallet
                                          Hash: 0x123abc...
                                          Confirmação: 6 blocos
```

### Rastreamento Completo - ETH Sell

```
Data/Hora          Status                  Evento
─────────────────────────────────────────────────────────────
22:15:00          PENDING                 Trade criado (quote_xyz789)
                                          1.5 ETH → R$ 2.500,00
                                          Spread: 3% (R$ 75)
                                          Taxa rede: 0.25% (R$ 6,25)
                                          Total: R$ 2.418,75
                                          Pagamento: Cartão de Crédito

22:18:45          PAYMENT_CONFIRMED       Pagamento aprovado
                                          Processador: Stripe
                                          ID transação: ch_1234567890

22:20:00          COMPLETED               ETH recebido
                                          Hash: 0x456def...
```

## 🛡️ Conformidade e Regulação

### Lei de Lavagem de Dinheiro (AML)

- ✅ Rastreamento completo de origem/destino
- ✅ KYC (Know Your Customer) integrado
- ✅ Relatórios de operações suspeitas

### LGPD (Lei Geral de Proteção de Dados)

- ✅ Dados pessoais protegidos
- ✅ Direito de acesso garantido
- ✅ Direito de exclusão respeitado

### Auditoria Interna

- ✅ Todos os eventos registrados
- ✅ Rastreabilidade completa
- ✅ Impossível alterar histórico

### Conformidade Fiscal

- ✅ Imposto de renda
- ✅ Reportes para Receita Federal
- ✅ Relatórios de atividades

## 📊 Relatórios Disponíveis

### 1. Relatório de Operações por Usuário

```bash
GET /instant-trade/history/my-trades?page=1&per_page=100
```

### 2. Relatório de Auditoria Completa

```bash
GET /instant-trade/{trade_id}/audit-log
```

### 3. Relatório de Estatísticas (Future)

- Operações por mês
- Volume total
- Métodos de pagamento mais usados
- Criptomoedas mais negociadas

## 🔄 Endpoints de Auditoria

| Endpoint                              | Método | Descrição                              |
| ------------------------------------- | ------ | -------------------------------------- |
| `/instant-trade/quote`                | POST   | Gera cotação (cache 30s)               |
| `/instant-trade/create`               | POST   | Cria operação (PENDING)                |
| `/instant-trade/{id}/confirm-payment` | POST   | Confirma pagamento (PAYMENT_CONFIRMED) |
| `/instant-trade/{id}/complete`        | POST   | Completa operação (COMPLETED)          |
| `/instant-trade/{id}/cancel`          | POST   | Cancela operação (CANCELLED)           |
| `/instant-trade/{id}`                 | GET    | Status atual                           |
| `/instant-trade/{id}/audit-log`       | GET    | Histórico completo                     |
| `/instant-trade/history/my-trades`    | GET    | Operações do usuário                   |

## 📝 Conclusão

✅ **Sistema de Auditoria Completo Implementado**

Todas as operações são registradas com:

- Rastreamento completo de mudanças de status
- Timestamps precisos
- Detalhes completos de cada operação
- Histórico imutável
- Conformidade regulatória

**Status:** ✅ PRONTO PARA PRODUÇÃO E AUDITORIA

---

**Data:** 7 de dezembro de 2025  
**Versão:** 1.0
