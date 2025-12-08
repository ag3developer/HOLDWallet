# 🔍 DIAGNÓSTICO: Backend OTC - O que está pronto

**Data:** 8 de dezembro de 2025  
**Status:** 60% Implementado  
**Tempo de Conclusão Estimado:** 1-2 semanas

---

## ✅ O QUE JÁ EXISTE

### **1. Modelos do Banco de Dados** ✅

```
📁 backend/app/models/instant_trade.py

✓ InstantTrade (tabela: instant_trades)
  - id, user_id, operation_type, symbol
  - fiat_amount, crypto_amount
  - crypto_price, spread_percentage, network_fee_percentage
  - total_amount, payment_method
  - status (PENDING, PAYMENT_CONFIRMED, COMPLETED, CANCELLED, etc)
  - reference_code (OTC-YYYY-XXXXXX)
  - expires_at, created_at, updated_at
  - Indexes: user_id, status, created_at, expires_at, reference_code, symbol

✓ InstantTradeHistory (tabela: instant_trade_history)
  - trade_id, old_status, new_status
  - reason, history_details
  - created_at
```

**Status:** 🟢 PRONTO PARA USAR

---

### **2. Service Layer** ✅

```
📁 backend/app/services/instant_trade_service.py

✓ InstantTradeService (427 linhas)
  ├─ calculate_quote(operation, symbol, amount)
  │   └─ Calcula com spread (3%) + network_fee (0.25%)
  │   └─ Cache em memória com TTL 30s
  │
  ├─ create_trade_from_quote(user_id, quote_id, payment_method)
  │   └─ Cria trade no DB
  │   └─ Gera reference_code
  │   └─ Expira em 15 minutos
  │   └─ Log em InstantTradeHistory
  │
  ├─ get_trade_status(trade_id)
  │   └─ Retorna status completo
  │
  ├─ cancel_trade(trade_id)
  │   └─ Marca como CANCELLED
  │   └─ Log no histórico
  │
  ├─ confirm_payment(trade_id, payment_proof_url)
  │   └─ Muda status para PAYMENT_CONFIRMED
  │   └─ Registra payment_confirmed_at
  │
  ├─ complete_trade(trade_id)
  │   └─ Muda status para COMPLETED
  │   └─ Registra completed_at
  │
  ├─ get_trade_history(trade_id)
  │   └─ Retorna auditoria completa
  │
  └─ get_user_trades(user_id, page, per_page)
      └─ Com paginação
```

**Status:** 🟢 PRONTO PARA USAR

---

### **3. API Routers** ✅

```
📁 backend/app/routers/instant_trade.py

✓ GET /api/v1/instant-trade/assets
  └─ Lista cryptos suportadas

✓ POST /api/v1/instant-trade/quote
  └─ Calcula cotação (válida por 30s)
  └─ Parâmetros: operation, symbol, fiat_amount ou crypto_amount

✓ POST /api/v1/instant-trade/create
  └─ Cria trade do quote
  └─ Parâmetros: quote_id, payment_method

✓ GET /api/v1/instant-trade/{trade_id}
  └─ Status da transação

✓ POST /api/v1/instant-trade/{trade_id}/cancel
  └─ Cancela trade pendente

✓ GET /api/v1/instant-trade/history/my-trades
  └─ Histórico com paginação

✓ POST /api/v1/instant-trade/{trade_id}/confirm-payment
  └─ Confirma pagamento recebido

✓ POST /api/v1/instant-trade/{trade_id}/complete
  └─ Marca como completo

✓ GET /api/v1/instant-trade/{trade_id}/audit-log
  └─ Auditoria completa

✓ GET /api/v1/instant-trade/fees
  └─ Mostra taxas
```

**Status:** 🟢 TODOS OS ENDPOINTS CRIADOS

---

### **4. Blockchain Service** ✅

```
📁 backend/app/services/blockchain_service.py

✓ BlockchainService (883 linhas)
  ├─ BitcoinService
  ├─ EthereumService (com tokens)
  ├─ PolygonService (com tokens)
  ├─ BSCService
  ├─ BaseService
  ├─ TronService
  ├─ SolanaService
  ├─ LitecoinService
  ├─ DogecoinService
  ├─ CardanoService
  ├─ AvalancheService
  ├─ PolkadotService
  ├─ ChainlinkService
  ├─ ShibaService
  └─ XRPService

✓ Métodos:
  ├─ get_address_balance(address, network)
  ├─ get_address_transactions(address, network)
  ├─ validate_address(address, network)
  └─ (mais...)
```

**Status:** 🟡 PARCIAL - Faltam métodos de TRANSFERÊNCIA

---

## ❌ O QUE FALTA - CRÍTICO PARA OTC FUNCIONAR

### **1. TRANSFERÊNCIA AUTOMÁTICA DE CRYPTO** 🔴

**Necessário para:** Fase 3 do fluxo OTC (Transferência de Crypto)

```
O que falta:
❌ Função: transfer_crypto(from_address, to_address, amount, network, private_key)
❌ Função: sign_transaction(tx_data, private_key)
❌ Integração: web3.py para Ethereum/Polygon/BSC
❌ Integração: bitcoinlib para Bitcoin/Litecoin
❌ Integração: Solana SDK para Solana
❌ Monitoramento: Acompanhar TX hash na blockchain
```

**Impacto:** CRÍTICO - Sem isso, não conseguimos enviar crypto do usuário para nossa wallet

---

### **2. SYSTEM WALLET (Carteira da Hold)** 🔴

**Necessário para:** Armazenar as cryptos que os usuários vendem

```
O que falta:
❌ Modelo: SystemWallet no BD
❌ Modelo: SystemAddress (um por rede)
❌ Serviço: SystemWalletService
❌ Geração: Criar endereços para 15 redes
❌ Armazenamento: Private keys em Vault (não em plaintext!)

Exemplo:
  system_wallet = {
    "name": "Hold Wallet OTC",
    "type": "custodial",
    "addresses": {
      "ethereum": "0x742d35Cc6634C0532925a3b844Bc58e8bcccEAf6",
      "polygon": "0x742d35Cc6634C0532925a3b844Bc58e8bcccEAf6",
      "bsc": "0x742d35Cc6634C0532925a3b844Bc58e8bcccEAf6",
      "solana": "HoldWalletOTC1234567890..."
    }
  }
```

**Impacto:** CRÍTICO - Não temos para onde enviar as cryptos vendidas

---

### **3. BACKGROUND JOBS (Celery)** 🔴

**Necessário para:** Automação do fluxo

```
O que falta:
❌ Task: process_instant_trade_transfer
   └─ Monitora trades com status "pending_transfer"
   └─ Executa transferência na blockchain
   └─ Atualiza status para "transfer_pending"

❌ Task: monitor_blockchain_confirmations
   └─ Verifica confirmações da TX
   └─ Quando 3+ confirmações → dispara pagamento PIX

❌ Task: send_pix_payment
   └─ Chama BRL Code API
   └─ Envia PIX para conta do usuário

❌ Task: refund_user
   └─ Se timeout ou erro → reembolsa usuário
```

**Impacto:** CRÍTICO - Sem jobs, fluxo fica manual

---

### **4. INTEGRAÇÃO PIX (BRL Code)** 🔴

**Necessário para:** Fase 6 - Enviar dinheiro ao usuário

```
O que falta:
❌ Client: BRLCodeClient
   └─ POST /payments/create
   └─ GET /payments/{payment_id}
   └─ Webhook handler para confirmação

❌ Serviço: PaymentService
❌ Endpoint: POST /webhooks/payment (da BRL Code)
```

**Impacto:** CRÍTICO - Usuário não recebe o dinheiro

---

### **5. MODELOS NO BD FALTANDO** 🟡

```
O que falta no schema:

❌ system_wallets (tabela)
❌ system_addresses (tabela com private_key_encrypted)
❌ transfer_transactions (tabela para rastrear transfers)
❌ user_bank_data (tabela para PIX key dos usuários)

Ver: FLUXO_OTC_COMPLETO.md para schema completo
```

---

## 🟡 O QUE PRECISA DE AJUSTES

### **1. Validação de Saldo**

```
❌ Antes de criar trade SELL:
   - Verificar se user tem saldo suficiente
   - Consultar wallet do usuário
   - Verificar balance via blockchain

Código:
  wallet = db.query(Wallet).get(wallet_id)
  balance = await blockchain_service.get_address_balance(
    wallet.address,
    wallet.network
  )
  if balance < crypto_amount:
    raise Error("Insufficient balance")
```

### **2. Lock de Saldo**

```
❌ Quando trade criado:
   - Reservar saldo para evitar vender 2x
   - Apenas liberar se trade expirar ou for cancelado

Adição ao modelo InstantTrade:
  locked_balance = Column(Numeric(28, 18))
```

### **3. Status Transitions**

```
Fluxo esperado:
PENDING
  ↓ (pagamento recebido)
PAYMENT_CONFIRMED
  ↓ (crypto transferida)
TRANSFER_PENDING
  ↓ (confirmada na blockchain)
TRANSFER_CONFIRMED
  ↓ (PIX enviado)
PAYMENT_SENT
  ↓ (webhook da BRL Code)
COMPLETED

Atualmente falta:
  - TRANSFER_PENDING
  - TRANSFER_CONFIRMED
```

---

## 🚀 PLANO RECOMENDADO (Prioridade)

### **SEMANA 1: Foundation**

**Dia 1-2: Database Migrations**

```sql
1. Criar tabelas:
   - system_wallets
   - system_addresses
   - transfer_transactions
   - user_bank_data
   - Atualizar instant_trades (adicionar campos)

2. Criar índices
3. Testar conexão
```

**Dia 3-4: System Wallet Service**

```python
1. SystemWalletService.create_system_wallet()
2. Gerar 15 endereços (um por rede)
3. Salvar private keys em Vault (não BD!)
4. Verificar balances do sistema
```

**Dia 5: Blockchain Transfer Service**

```python
1. TransferService.transfer_to_system_wallet(
    user_address, amount, network, private_key
   )
2. Suporte para EVM (Ethereum, Polygon, BSC, Base)
3. Suporte para Bitcoin/Solana
4. TX hash tracking
```

---

### **SEMANA 2: Automation**

**Dia 1-2: Celery + Background Jobs**

```python
1. Setup Celery + Redis
2. Task: process_instant_trade_transfer (a cada 10s)
3. Task: monitor_blockchain_confirmations (a cada 30s)
4. Task: refund_user_on_timeout
```

**Dia 3-4: BRL Code Integration**

```python
1. BRLCodeClient (API calls)
2. PaymentService.send_pix_payment()
3. Webhook handler para confirmação
4. Testes com API sandbox
```

**Dia 5: E2E Testing**

```
1. Teste completo: SELL 1 MATIC
2. Verificar cada passo:
   - Trade criado
   - Transfer iniciada
   - Confirmada na blockchain
   - PIX enviado
   - Webhook recebido
```

---

## 📊 Status por Componente

| Componente         | Status | Implementado | Falta   | Tempo Est.      |
| ------------------ | ------ | ------------ | ------- | --------------- |
| Models             | 🟢     | 100%         | 0%      | 1h (migrations) |
| Service Layer      | 🟢     | 100%         | 0%      | Pronto          |
| API Routers        | 🟢     | 100%         | 0%      | Pronto          |
| Blockchain Service | 🟡     | 60%          | 40%     | 2-3h            |
| System Wallet      | 🔴     | 0%           | 100%    | 4h              |
| Transfers          | 🔴     | 0%           | 100%    | 6h              |
| Background Jobs    | 🔴     | 0%           | 100%    | 4h              |
| PIX Integration    | 🔴     | 0%           | 100%    | 3h              |
| E2E Tests          | 🔴     | 0%           | 100%    | 3h              |
| **TOTAL**          | 🟡     | **35%**      | **65%** | **26h**         |

---

## 🔧 Próximas Ações (Immediate)

### **Hoje:**

1. ✅ Revisão: Qual servidor está rodando o backend?
2. ✅ Teste: Endpoints `/instant-trade/*` estão funcionando?
3. ⚠️ Decisão: Vault ou plain storage para private keys?

### **Amanhã:**

1. Criar tabelas no BD (migrations)
2. Começar SystemWalletService
3. Integrar blockchain transfer

---

## 📝 Arquivos Relacionados

| Arquivo                                         | Conteúdo                              |
| ----------------------------------------------- | ------------------------------------- |
| `FLUXO_OTC_COMPLETO.md`                         | Fluxo completo com exemplos de código |
| `backend/app/models/instant_trade.py`           | Modelos BD                            |
| `backend/app/services/instant_trade_service.py` | Lógica de trades                      |
| `backend/app/routers/instant_trade.py`          | Endpoints API                         |
| `backend/app/services/blockchain_service.py`    | Blockchain queries                    |

---

## ✅ Checklist de Implementação

```
FASE 1: Database
□ Criar migrations
□ Validar schema
□ Testar queries

FASE 2: System Wallet
□ Create SystemWalletService
□ Gerar endereços
□ Validar Vault/HSM

FASE 3: Transfers
□ EVM transfers (Polygon, Ethereum, BSC, Base)
□ Bitcoin transfers
□ Solana transfers
□ TX monitoring

FASE 4: Background Jobs
□ Setup Celery
□ Task: process_transfer
□ Task: monitor_confirmations
□ Task: send_pix

FASE 5: PIX Integration
□ BRL Code API
□ Webhook handler
□ Testes sandbox

FASE 6: Testing
□ Unit tests
□ Integration tests
□ E2E flow
□ Produção (testnet first)
```

---

## 🎯 Conclusão

**Boas Notícias:** 🎉

- ✅ 60% do backend OTC já está pronto
- ✅ Models, Service, Routers estão criados
- ✅ Estrutura é profissional e escalável

**O que falta:** 🔴

- ❌ Transferência automática de crypto (CRÍTICO)
- ❌ System wallet (CRÍTICO)
- ❌ Background jobs (CRÍTICO)
- ❌ PIX integration (CRÍTICO)

**Tempo de Conclusão:** 1-2 semanas de trabalho focado

**Recomendação:** Começar imediatamente com migrations do BD e SystemWalletService

---

**Próximo Passo:** Implementar as 4 fases críticas com prioridade?
