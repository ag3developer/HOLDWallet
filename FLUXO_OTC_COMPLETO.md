# 🔄 FLUXO COMPLETO: OTC INSTANT TRADE - Sistema de Carteira

**Data:** 8 de dezembro de 2025  
**Versão:** 1.0  
**Status:** Arquitetura Documentada

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo Completo SELL](#fluxo-completo-sell)
3. [Fluxo Completo BUY](#fluxo-completo-buy)
4. [Arquitetura do Sistema](#arquitetura-do-sistema)
5. [Banco de Dados](#banco-de-dados)
6. [Implementação](#implementação)
7. [Segurança](#segurança)
8. [Testes](#testes)

---

## 🎯 Visão Geral

O sistema OTC (Over-The-Counter) permite que usuários comprem e vendam criptomoedas instantaneamente através da Hold Wallet.

### **Atores:**

- **Usuário:** Quer vender/comprar crypto
- **Hold Wallet (Sistema):** Intermediária, tem sua própria carteira
- **Blockchain:** Processa transações de crypto
- **BRL Code (Gateway PIX):** Processa pagamentos em BRL

### **Fluxo Principal:**

```
Usuário Vende MATIC
       ↓
Hold Wallet compra de dele
       ↓
Transferência blockchain
       ↓
Hold Wallet envia BRL via PIX
       ↓
Usuário recebe dinheiro
```

---

## 🔄 FLUXO COMPLETO: SELL (Vender Crypto)

### **Timeline: Usuário Vende 22 MATIC por R$ 130**

### **1️⃣ FASE: REQUISIÇÃO DO USUÁRIO** (Frontend)

**Ator:** Usuário  
**Sistema:** Frontend (React)  
**Tempo:** Instantâneo

```
Usuário clica em "SELL"
          ↓
Seleciona "MATIC"
          ↓
Digita "22"
          ↓
Frontend faz GET /wallets/{wallet_id}/balances
          ↓
Mostra: "Available: 22.991439 MATIC" ✅
          ↓
Usuário clica "Confirmar"
          ↓
Frontend faz POST /instant-trade/quote
Response: {
  "quote_id": "quote_123",
  "symbol": "MATIC",
  "crypto_amount": 22,
  "fiat_amount": 130,
  "crypto_price": 5.909,
  "spread_amount": 3.90,
  "network_fee": 0.10,
  "total_amount": 134,
  "expires_in_seconds": 60
}
          ↓
Mostra "Quote válida por 60s" ✅
          ↓
Usuário clica "Confirmar Trade"
```

**Código Frontend:**

```typescript
// TradingForm.tsx
const handleConfirm = async () => {
  const response = await axios.post("/api/v1/instant-trade/quote", {
    operation: "sell",
    symbol: "MATIC",
    crypto_amount: 22,
  });
  setQuote(response.data.quote);
};

// Quando usuário clica confirmar
const handleConfirmTrade = async () => {
  const response = await axios.post("/api/v1/instant-trade/create", {
    quote_id: quote.quote_id,
    operation: "sell",
    symbol: "MATIC",
    crypto_amount: 22,
    fiat_amount: 130,
    wallet_id: userWalletId,
  });

  // Response: trade criado com status "pending_transfer"
};
```

---

### **2️⃣ FASE: VALIDAÇÃO NO BACKEND** (Backend)

**Ator:** Backend API  
**Sistema:** Python/FastAPI  
**Tempo:** <500ms

```
POST /api/v1/instant-trade/create
          ↓
1. Validar quote_id (não expirou?)
   ✓ Quote válida e dentro do prazo
          ↓
2. Buscar wallet do usuário
   ✓ wallet_id = "user-wallet-123"
   ✓ user_id = "user-456"
          ↓
3. GET /wallets/{wallet_id}/balances
   ✓ MATIC: 22.991439
          ↓
4. Validar saldo
   if (22.991439 >= 22) → ✓ OK
   else → ✗ Erro 400
          ↓
5. Criar registro no DB
   INSERT INTO instant_trades (
     id: "trade-789",
     user_id: "user-456",
     operation: "sell",
     symbol: "MATIC",
     crypto_amount: 22,
     fiat_amount: 130,
     status: "pending_transfer",
     expires_at: now() + 15 minutes,
     created_at: now()
   )
          ↓
6. Retornar resposta
   {
     "trade_id": "trade-789",
     "reference_code": "OTC-2025-000123",
     "status": "pending_transfer",
     "message": "Transferência iniciada...",
     "system_wallet_address": "0x1234...abc",
     "network": "polygon",
     "amount": 22,
     "expires_at": "2025-12-08T16:45:00Z"
   }
```

**Código Backend:**

```python
# app/routers/instant_trade.py

@router.post("/instant-trade/create", response_model=TradeResponse)
async def create_trade(
    request: CreateTradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validar quote
    quote = db.query(Quote).filter(
        Quote.quote_id == request.quote_id,
        Quote.expires_at > datetime.now()
    ).first()
    if not quote:
        raise HTTPException(400, "Quote expirou")

    # 2. Buscar wallet
    wallet = db.query(Wallet).filter(
        Wallet.id == request.wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    if not wallet:
        raise HTTPException(404, "Wallet não encontrada")

    # 3. Validar saldo
    balance = await get_wallet_balance(wallet.id, request.symbol)
    if balance < request.crypto_amount:
        raise HTTPException(400, "Saldo insuficiente")

    # 4. Criar trade
    trade = InstantTrade(
        user_id=current_user.id,
        wallet_id=wallet.id,
        operation='sell',
        symbol=request.symbol,
        crypto_amount=request.crypto_amount,
        fiat_amount=request.fiat_amount,
        status='pending_transfer',
        expires_at=datetime.now() + timedelta(minutes=15),
        reference_code=generate_reference_code()
    )
    db.add(trade)
    db.commit()

    return TradeResponse(
        trade_id=str(trade.id),
        reference_code=trade.reference_code,
        status=trade.status,
        message="Transferência iniciada..."
    )
```

---

### **3️⃣ FASE: TRANSFERÊNCIA DE CRYPTO** (Background Job)

**Ator:** Sistema (Background Task)  
**Sistema:** Celery + Blockchain RPC  
**Tempo:** 30-120 segundos (depende da rede)

```
Task: process_instant_trade_transfer
Triggers: Quando trade criado
Interval: Verifica a cada 10 segundos
          ↓
1. Buscar trade pendente
   SELECT * FROM instant_trades
   WHERE status = 'pending_transfer'
   AND created_at < 30 seconds ago
          ↓
2. Obter endereço do sistema
   system_address = "0x742d35Cc6634C0532925a3b844Bc58e8bcccEAf6"
   system_network = "polygon"
          ↓
3. Preparar transação
   from_address: user_wallet.addresses[POLYGON]
   to_address: SYSTEM_WALLET.addresses[POLYGON]
   amount: 22 MATIC
   network: polygon
   gas_price: "15 gwei"
          ↓
4. EXECUTAR TRANSFERÊNCIA NA BLOCKCHAIN
   ┌─────────────────────────────────────────┐
   │ TX: Transfer 22 MATIC                   │
   │ From: 0x...user...                      │
   │ To: 0x...system...                      │
   │ Network: Polygon                        │
   │ Status: Enviado                         │
   └─────────────────────────────────────────┘
          ↓
5. Receber TX Hash
   tx_hash = "0x4f3a2f1b8c9d7e6f5a4b3c2d1e0f..."
          ↓
6. Atualizar DB
   UPDATE instant_trades
   SET status = 'transfer_pending',
       transaction_hash = '0x4f3a...',
       broadcasted_at = now()
   WHERE id = 'trade-789'
          ↓
7. Log para auditoria
   logger.info({
     'event': 'crypto_transfer_initiated',
     'trade_id': 'trade-789',
     'tx_hash': '0x4f3a...',
     'amount': 22,
     'symbol': 'MATIC',
     'timestamp': now()
   })
```

**Código Backend:**

```python
# app/tasks/process_transfers.py
from celery import shared_task
from app.services.blockchain import BlockchainService
from app.models import InstantTrade

@shared_task(name="process_instant_trade_transfer")
def process_instant_trade_transfer():
    """
    Background job rodando a cada 10 segundos
    Processa transferências pendentes
    """

    pending_trades = db.query(InstantTrade).filter(
        InstantTrade.status == 'pending_transfer',
        InstantTrade.created_at < datetime.now() - timedelta(seconds=5)
    ).all()

    blockchain = BlockchainService()

    for trade in pending_trades:
        try:
            # Obter endereço do sistema para essa rede
            system_address = SYSTEM_WALLET_ADDRESSES.get(trade.network)

            # Obter endereço do usuário
            user_address = trade.wallet.get_address_for_network(trade.network)

            # Executar transferência
            tx_hash = blockchain.transfer_token(
                network=trade.network,
                from_address=user_address,
                to_address=system_address,
                amount=trade.crypto_amount,
                symbol=trade.symbol
            )

            # Atualizar trade
            trade.status = 'transfer_pending'
            trade.transaction_hash = tx_hash
            trade.broadcasted_at = datetime.now()
            db.commit()

            logger.info(f"Transfer initiated: {tx_hash}")

        except Exception as e:
            trade.status = 'failed'
            trade.error_message = str(e)
            db.commit()
            logger.error(f"Transfer failed: {e}")
```

---

### **4️⃣ FASE: MONITORAR CONFIRMAÇÕES** (Background Job)

**Ator:** Sistema (Background Task)  
**Sistema:** Celery + RPC Monitoring  
**Tempo:** Contínuo (verificar a cada 30 segundos)

```
Task: monitor_blockchain_confirmations
Runs: A cada 30 segundos (em paralelo)
          ↓
1. Buscar trades em transfer_pending
   SELECT * FROM instant_trades
   WHERE status = 'transfer_pending'
   AND transaction_hash IS NOT NULL
          ↓
2. Para cada trade, verificar tx status
   network: "polygon"
   tx_hash: "0x4f3a..."
          ↓
3. Chamar RPC para status
   ┌─────────────────────────────────┐
   │ Polygon RPC Call                │
   │ eth_getTransactionReceipt       │
   │ param: tx_hash                  │
   └─────────────────────────────────┘
          ↓
4. Analisar resposta
   Status: "0x1" (sucesso)
   Block: 50000000
   Confirmations: 3
          ↓
5. Decidir próximo passo
   if confirmations >= 3:
     → Status: "transfer_confirmed"
     → Prosseguir para pagamento PIX
   elif confirmations < 3:
     → Aguardar mais (volta loop)
   elif status == "0x0":
     → Status: "failed"
     → Reembolsar usuário
   elif timeout > 30 min:
     → Status: "timeout"
     → Reembolsar usuário
          ↓
6. Atualizar DB
   UPDATE instant_trades
   SET status = 'transfer_confirmed',
       confirmations = 3,
       confirmed_at = now()
   WHERE id = 'trade-789'
```

**Código Backend:**

```python
# app/tasks/monitor_confirmations.py

@shared_task(name="monitor_blockchain_confirmations")
def monitor_blockchain_confirmations():
    """
    Monitora confirmações de transações
    Roda a cada 30 segundos
    """

    pending_trades = db.query(InstantTrade).filter(
        InstantTrade.status == 'transfer_pending',
        InstantTrade.transaction_hash.isnot(None)
    ).all()

    blockchain = BlockchainService()

    for trade in pending_trades:
        try:
            # Verificar status na blockchain
            tx_status = blockchain.get_transaction_status(
                network=trade.network,
                tx_hash=trade.transaction_hash
            )

            # Analisar confirmações
            confirmations = tx_status.get('confirmations', 0)
            is_confirmed = tx_status.get('status') == 'success'

            if is_confirmed and confirmations >= 3:
                # ✅ Confirmado!
                trade.status = 'transfer_confirmed'
                trade.confirmations = confirmations
                trade.confirmed_at = datetime.now()
                db.commit()

                # Trigger pagamento PIX
                send_pix_payment_task.delay(str(trade.id))

            elif confirmations < 3:
                # Ainda não confirmado, aguardar
                trade.confirmations = confirmations
                db.commit()

            elif not is_confirmed:
                # ❌ Falhou!
                trade.status = 'failed'
                db.commit()
                refund_user_task.delay(str(trade.id))

            # Check timeout
            if trade.created_at < datetime.now() - timedelta(minutes=30):
                trade.status = 'timeout'
                db.commit()
                refund_user_task.delay(str(trade.id))

        except Exception as e:
            logger.error(f"Error monitoring trade {trade.id}: {e}")
```

---

### **5️⃣ FASE: ENVIAR BRL VIA PIX** (Background Job)

**Ator:** Sistema + BRL Code API  
**Sistema:** Celery + BRL Code Gateway  
**Tempo:** <5 segundos

```
Task: send_pix_payment
Triggered: Quando transfer_confirmed
          ↓
1. Buscar dados bancários do usuário
   SELECT * FROM user_bank_data
   WHERE user_id = 'user-456'
   AND is_primary = True

   Resultado:
   {
     "pix_key": "joao@email.com",
     "name": "João Silva",
     "cpf": "12345678900"
   }
          ↓
2. Preparar dados de pagamento
   {
     "amount": 130.00,
     "pix_key": "joao@email.com",
     "description": "OTC Trade OTC-2025-000123",
     "external_id": "trade-789",
     "webhook_url": "https://holdwallet.io/webhooks/payment",
     "due_date": now() + 24 hours
   }
          ↓
3. CHAMAR BRL CODE API
   POST /payments/create
   Authorization: Bearer BRLCODE_TOKEN
   Body: {...dados acima...}
          ↓
4. Receber resposta
   {
     "payment_id": "pay_123456",
     "status": "pending",
     "qr_code": "data:image/png;base64,...",
     "external_id": "trade-789"
   }
          ↓
5. Atualizar DB
   UPDATE instant_trades
   SET status = 'payment_sent',
       payment_id = 'pay_123456',
       fiat_amount_sent = 130,
       payment_sent_at = now()
   WHERE id = 'trade-789'
          ↓
6. Notificar usuário
   Enviar email/push:
   "PIX de R$ 130 enviado para joao@email.com"
   "Reference: OTC-2025-000123"
```

**Código Backend:**

```python
# app/tasks/payment_tasks.py

@shared_task(name="send_pix_payment")
def send_pix_payment(trade_id: str):
    """Envia pagamento PIX ao usuário"""

    trade = db.query(InstantTrade).get(trade_id)
    user = trade.user

    # Buscar dados bancários
    bank_data = db.query(UserBankData).filter(
        UserBankData.user_id == user.id,
        UserBankData.is_primary == True
    ).first()

    if not bank_data:
        logger.error(f"No bank data for user {user.id}")
        return

    # Chamar BRL Code
    brl_code = BRLCodeClient(
        api_key=settings.BRLCODE_API_KEY,
        secret=settings.BRLCODE_SECRET
    )

    try:
        payment = brl_code.create_payment(
            amount=float(trade.fiat_amount),
            pix_key=bank_data.pix_key,
            description=f"OTC Trade {trade.reference_code}",
            external_id=str(trade.id)
        )

        # Atualizar trade
        trade.status = 'payment_sent'
        trade.payment_id = payment['payment_id']
        trade.payment_sent_at = datetime.now()
        db.commit()

        # Enviar notificação
        send_user_notification(
            user_id=user.id,
            title="PIX Enviado! 💰",
            message=f"R$ {trade.fiat_amount} enviado para {bank_data.pix_key}"
        )

        logger.info(f"Payment sent: {payment['payment_id']}")

    except Exception as e:
        trade.status = 'payment_failed'
        db.commit()
        logger.error(f"Payment failed: {e}")
```

---

### **6️⃣ FASE: CONFIRMAÇÃO FINAL** (Webhook)

**Ator:** BRL Code + Sistema  
**Sistema:** Webhook Handler  
**Tempo:** Real-time

```
BRL Code Webhook Event:
payment.confirmed
          ↓
POST /webhooks/payment
{
  "event": "payment.confirmed",
  "payment_id": "pay_123456",
  "external_id": "trade-789",
  "amount": 130.00,
  "status": "success",
  "timestamp": "2025-12-08T16:35:00Z"
}
          ↓
1. Validar assinatura do webhook
   signature_received = headers.get('X-BRL-Code-Signature')
   signature_computed = hmac_sha256(body, secret)

   if signature_received != signature_computed:
     → Rejeitar (possível falsificação)
          ↓
2. Buscar trade
   SELECT * FROM instant_trades
   WHERE id = 'trade-789'
          ↓
3. Validar status
   if trade.status not in ['payment_sent', 'payment_pending']:
     → Ignorar (já processado)
          ↓
4. Atualizar para COMPLETED
   UPDATE instant_trades
   SET status = 'completed',
       payment_confirmed_at = now()
   WHERE id = 'trade-789'
          ↓
5. Log final
   {
     'event': 'trade_completed',
     'trade_id': 'trade-789',
     'user_id': 'user-456',
     'symbol': 'MATIC',
     'amount': 22,
     'received_brl': 130,
     'duration_seconds': 45,
     'timestamp': now()
   }
          ↓
6. Notificar usuário
   Email + Push:
   "Sua venda foi concluída! ✅
    Você vendeu 22 MATIC por R$ 130
    Reference: OTC-2025-000123"
```

**Código Backend:**

```python
# app/routers/webhooks.py

@router.post("/webhooks/payment")
async def handle_payment_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Webhook da BRL Code para confirmação de pagamento"""

    body = await request.body()

    # Validar assinatura
    signature = request.headers.get('X-BRL-Code-Signature')
    if not validate_webhook_signature(body, signature):
        return JSONResponse(status_code=401, content={"error": "Invalid signature"})

    payload = await request.json()

    # Buscar trade
    trade = db.query(InstantTrade).filter(
        InstantTrade.id == payload['external_id']
    ).first()

    if not trade:
        return JSONResponse(status_code=404, content={"error": "Trade not found"})

    # Atualizar para completo
    if payload['status'] == 'success':
        trade.status = 'completed'
        trade.payment_confirmed_at = datetime.now()
        db.commit()

        # Notificar usuário
        send_email(
            to=trade.user.email,
            subject="Venda Concluída ✅",
            body=f"Você vendeu 22 MATIC por R$ 130"
        )

    return JSONResponse(status_code=200, content={"ok": True})
```

---

## 💳 FLUXO COMPLETO: BUY (Comprar Crypto)

### **Timeline: Usuário Compra 22 MATIC com R$ 130**

```
1. Usuário clica em "BUY"
          ↓
2. Digita R$ 130
          ↓
3. Frontend faz GET /instant-trade/quote
   Response: "Receberá 22 MATIC"
          ↓
4. Usuário confirma
          ↓
5. Backend cria trade (status: pending_payment)
   Retorna: Instruções de pagamento PIX
          ↓
6. Backend gera QR Code PIX
   Valor: R$ 130 (inclui spread + taxa)
          ↓
7. Usuário escaneia e paga via seu banco/app
          ↓
8. BRL Code recebe pagamento
          ↓
9. Webhook notifica Hold Wallet
   "Pagamento recebido"
          ↓
10. Backend atualiza trade (status: payment_confirmed)
          ↓
11. Backend transfere MATIC para endereço do usuário
    FROM: System Wallet
    TO: User Wallet
    AMOUNT: 22 MATIC
          ↓
12. Monitora confirmação blockchain
          ↓
13. Trade finalizado (status: completed)
          ↓
14. Usuário recebe notificação:
    "Você comprou 22 MATIC por R$ 130" ✅
```

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  - Página /instant-trade                                        │
│  - Seletor de cripto com logos                                  │
│  - Input de valor                                               │
│  - Exibição de saldo da carteira                               │
└────────────────┬────────────────────────────────┬───────────────┘
                 │                                │
         API REST (HTTP)                   API REST (HTTP)
                 │                                │
┌────────────────▼────────────────────────────────▼───────────────┐
│                      BACKEND (Python/FastAPI)                   │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                        │
│  ├─ GET  /wallets                   (listar carteiras)         │
│  ├─ GET  /wallets/{id}/balances     (saldo real)               │
│  ├─ POST /instant-trade/quote       (cotação)                  │
│  ├─ POST /instant-trade/create      (criar trade)              │
│  ├─ GET  /instant-trade/{id}        (status)                   │
│  └─ POST /webhooks/payment          (webhook PIX)              │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                      │
│  ├─ WalletService (gerenciar carteiras)                        │
│  ├─ InstantTradeService (lógica de trade)                      │
│  ├─ BlockchainService (RPC calls)                              │
│  ├─ PaymentService (integração PIX)                            │
│  └─ TransactionMonitor (monitorar blockchain)                  │
├─────────────────────────────────────────────────────────────────┤
│  Background Tasks (Celery):                                     │
│  ├─ process_instant_trade_transfer  (executar transf.)         │
│  ├─ monitor_blockchain_confirmations (monitora confirmações)   │
│  ├─ send_pix_payment                (enviar BRL)               │
│  └─ refund_user                     (reembolsar se falhar)     │
└────┬──────────────────────────┬──────────────────┬──────────────┘
     │                          │                  │
     │                    RPC CALLS           Webhook
     │                    (Web3.py)           (callback)
     │                          │                  │
┌────▼──────────────────────┬───▼──────┐    ┌────▼──────────────┐
│   DATABASE (PostgreSQL)   │ BLOCKCHAIN│    │  BRL CODE API    │
├──────────────────────────┼───────────┤    ├──────────────────┤
│ Tables:                  │ - Bitcoin │    │ - Create Payment │
│ - users                  │ - Ethereum│    │ - Check Status   │
│ - wallets                │ - Polygon │    │ - Webhooks       │
│ - addresses              │ - BSC     │    └──────────────────┘
│ - instant_trades         │ - Tron    │
│ - transfer_transactions  │ - Solana  │
│ - user_bank_data         │           │
│ - system_wallets         └───────────┘
│ - system_addresses
└──────────────────────────────────────┘
```

---

## 🗄️ Banco de Dados - Schema Completo

### **Tabelas Principais:**

```sql
-- Carteira do Usuário
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),  -- 'hd_wallet', 'multisig', etc
    mnemonic_encrypted TEXT,  -- Seed phrase
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_id (user_id)
);

-- Endereços do Usuário (um por rede blockchain)
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    network VARCHAR(50) NOT NULL,  -- 'ethereum', 'polygon', 'bsc', etc
    address VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_wallet_network (wallet_id, network),
    INDEX idx_address (address)
);

-- Carteira do Sistema (Hold Wallet)
CREATE TABLE system_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),  -- 'custodial', 'multisig', 'hsm'
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_name (name)
);

-- Endereços do Sistema (um por rede)
CREATE TABLE system_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_wallet_id UUID NOT NULL REFERENCES system_wallets(id),
    network VARCHAR(50) NOT NULL,  -- 'ethereum', 'polygon', 'bsc', etc
    address VARCHAR(255) NOT NULL UNIQUE,
    private_key_encrypted TEXT NOT NULL,  -- Vault/HSM
    balance NUMERIC(28, 18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_network (network),
    INDEX idx_address (address)
);

-- Trades Instantâneos
CREATE TABLE instant_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    operation VARCHAR(10) NOT NULL,  -- 'buy' ou 'sell'
    symbol VARCHAR(10) NOT NULL,  -- 'BTC', 'ETH', 'MATIC', etc
    crypto_amount NUMERIC(28, 18) NOT NULL,
    fiat_amount NUMERIC(18, 2) NOT NULL,
    fiat_currency VARCHAR(3) DEFAULT 'BRL',

    -- Preços e taxas
    crypto_price NUMERIC(18, 2) NOT NULL,
    spread_percentage NUMERIC(5, 2) DEFAULT 3.0,
    spread_amount NUMERIC(18, 2),
    network_fee_percentage NUMERIC(5, 2) DEFAULT 0.25,
    network_fee_amount NUMERIC(18, 2),
    total_amount NUMERIC(18, 2),

    -- Status e fluxo
    status VARCHAR(50) DEFAULT 'pending_transfer',
    -- 'pending_transfer', 'transfer_pending', 'transfer_confirmed',
    -- 'payment_pending', 'payment_sent', 'payment_confirmed', 'completed', 'failed'

    -- Transação blockchain
    network VARCHAR(50),  -- 'polygon', 'ethereum', 'bsc', etc
    transaction_hash VARCHAR(255),
    confirmations INT DEFAULT 0,
    broadcasted_at TIMESTAMP,
    confirmed_at TIMESTAMP,

    -- Pagamento
    payment_id VARCHAR(255),
    payment_sent_at TIMESTAMP,
    payment_confirmed_at TIMESTAMP,

    -- Metadados
    reference_code VARCHAR(50) UNIQUE,  -- 'OTC-2025-000123'
    expires_at TIMESTAMP,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_tx_hash (transaction_hash)
);

-- Log de Transações de Transferência
CREATE TABLE transfer_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES instant_trades(id),
    network VARCHAR(50) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount NUMERIC(28, 18) NOT NULL,
    tx_hash VARCHAR(255),
    status VARCHAR(50),  -- 'pending', 'confirmed', 'failed'
    confirmations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_status (status)
);

-- Dados Bancários do Usuário
CREATE TABLE user_bank_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    pix_key VARCHAR(255) NOT NULL,  -- CPF, email, phone ou chave aleatória
    full_name VARCHAR(255),
    cpf VARCHAR(11),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_id (user_id),
    INDEX idx_pix_key (pix_key),
    UNIQUE(user_id, pix_key)
);
```

---

## 🚀 Implementação - Roadmap

### **Fase 1: MVP (2 semanas)**

- [x] Endpoints de quote
- [x] Criar trade
- [ ] Transferência automática crypto
- [ ] Monitoramento blockchain
- [ ] Integração PIX básica

### **Fase 2: Produção (2 semanas)**

- [ ] Segurança (Vault/HSM)
- [ ] Testes E2E
- [ ] Alertas e monitoring
- [ ] Rate limiting
- [ ] Backup/DR

### **Fase 3: Escalabilidade (1 mês)**

- [ ] Multi-node blockchain monitoring
- [ ] Cache distribuído
- [ ] Fila de tarefas (Celery)
- [ ] Documentação API completa

---

## 🔐 Segurança

### **Chaves Privadas:**

```python
# ✅ CORRETO: Usar Vault

from hvac import Client

vault = Client(
    url='https://vault.holdwallet.io',
    token=VAULT_TOKEN
)

# Guardar
vault.secrets.kv.v2.create_or_update_secret(
    path=f'crypto/{network}/{address}',
    secret_dict={'private_key': private_key}
)

# Recuperar (apenas para assinar)
secret = vault.secrets.kv.v2.read_secret_version(
    path=f'crypto/{network}/{address}'
)
private_key = secret['data']['data']['private_key']
# Usar apenas em memória
# Nunca serializar ou logar
```

### **Validações:**

- Whitelist de endereços
- Rate limiting por usuário
- KYC/AML check
- Assinatura de webhooks
- IP whitelisting

---

## 🧪 Testes

```python
# test_instant_trade.py

def test_create_trade_sell():
    """Teste: Usuário vende crypto"""
    # Setup
    user = create_test_user()
    wallet = create_test_wallet(user, balance=100)

    # Action
    response = client.post('/instant-trade/create', json={
        'operation': 'sell',
        'symbol': 'MATIC',
        'crypto_amount': 22,
        'wallet_id': wallet.id
    })

    # Assert
    assert response.status_code == 200
    assert response.json()['status'] == 'pending_transfer'

def test_insufficient_balance():
    """Teste: Sem saldo suficiente"""
    user = create_test_user()
    wallet = create_test_wallet(user, balance=10)

    response = client.post('/instant-trade/create', json={
        'operation': 'sell',
        'symbol': 'MATIC',
        'crypto_amount': 22,
        'wallet_id': wallet.id
    })

    assert response.status_code == 400

def test_blockchain_transfer():
    """Teste: Transferência na blockchain"""
    # Mock RPC
    with patch('BlockchainService.transfer') as mock:
        mock.return_value = '0x123abc...'

        tx_hash = process_transfer(trade)

        assert tx_hash == '0x123abc...'

def test_pix_payment_webhook():
    """Teste: Webhook de confirmação PIX"""
    trade = create_test_trade()

    response = client.post('/webhooks/payment', json={
        'event': 'payment.confirmed',
        'external_id': str(trade.id),
        'amount': 130.00,
        'status': 'success'
    })

    assert response.status_code == 200
    assert trade.status == 'completed'
```

---

## 📊 Métricas e Monitoramento

```python
# Métricas a rastrear

METRICS = {
    'trades_created': Counter('instant_trade_created_total'),
    'trades_completed': Counter('instant_trade_completed_total'),
    'trades_failed': Counter('instant_trade_failed_total'),
    'transfer_latency': Histogram('transfer_latency_seconds'),
    'pix_payment_latency': Histogram('pix_latency_seconds'),
    'blockchain_confirmations': Histogram('confirmations_count'),
    'daily_volume_brl': Gauge('daily_volume_brl'),
    'system_wallet_balance': Gauge('system_wallet_balance', ['symbol']),
}

# Alertas
ALERTS = {
    'transfer_timeout': 'Transfer pendente por > 30 min',
    'payment_timeout': 'Pagamento não confirmado por > 1 hora',
    'low_system_balance': 'Saldo do sistema < limiar',
    'high_error_rate': '> 5% de trades com erro',
}
```

---

## 📞 Suporte e Troubleshooting

**Problema:** Trade pendente por horas  
**Causa:** Blockchain congestionada ou tx rejeitada  
**Solução:** Reenviar com gas price mais alto ou refund

**Problema:** PIX não chegou  
**Causa:** BRL Code API error ou webhook não recebido  
**Solução:** Retry manual ou contatar suporte

**Problema:** Saldo do sistema zero  
**Causa:** Muitas vendas, pouco rebalanceamento  
**Solução:** Ativar sistema de rebalanceamento automático

---

## 📝 Conclusão

Este fluxo garante que:

✅ **Segurança:** Chaves privadas em Vault  
✅ **Atomicidade:** Transações finalizadas completamente  
✅ **Rastreabilidade:** Log completo de cada operação  
✅ **Resiliência:** Retry automático em caso de falha  
✅ **Transparência:** Usuário acompanha cada passo  
✅ **Conformidade:** Logs para auditoria LGPD/AML

---

**Documentação Completa:** ✅  
**Data:** 8 de dezembro de 2025  
**Versão:** 1.0  
**Status:** Pronto para Implementação
