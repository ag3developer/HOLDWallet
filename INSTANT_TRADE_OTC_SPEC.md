# 🚀 INSTANT TRADE OTC - Especificação Completa

## 📌 Visão Geral

Sistema de compra e venda instantânea de criptomoedas através da nossa OTC (Over-The-Counter), permitindo que usuários comprem ou vendam qualquer criptomoeda do nosso portfólio de forma rápida e simples, com spread premium e taxas transparentes.

---

## 🎯 Objetivos

1. **Simplicidade**: Processo de compra/venda em poucos cliques
2. **Transparência**: Usuário vê todas as taxas antes de confirmar
3. **Rapidez**: Transações instantâneas após confirmação de pagamento
4. **Segurança**: Todas as operações registradas no banco de dados
5. **Premium**: Layout moderno e profissional

---

## 💰 Modelo de Negócio

### Taxas
- **Spread OTC**: 3% sobre o valor da operação
- **Taxa de Rede**: 0,25% (gas fee)
- **Taxa Total**: 3,25% sobre o valor

### Exemplo de Compra
```
Valor desejado: R$ 1.000,00
Spread (3%): R$ 30,00
Taxa de rede (0,25%): R$ 2,50
Total a pagar: R$ 1.032,50

BTC recebido: calculado com base no preço atual + spread
```

### Exemplo de Venda
```
Valor em BTC: 0.01 BTC
Preço atual BTC: R$ 300.000,00
Valor bruto: R$ 3.000,00
Spread (3%): R$ 90,00
Taxa de rede (0,25%): R$ 7,50
Total a receber: R$ 2.902,50
```

---

## 🎨 Interface do Usuário (Frontend)

### Layout da Página `/instant-trade`

```
┌─────────────────────────────────────────────────────────┐
│  🔥 INSTANT TRADE OTC - Compra/Venda Instantânea       │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🟢 COMPRAR       │  │ 🔴 VENDER        │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Selecione a Criptomoeda                        │    │
│  │ [🔽 Bitcoin (BTC)                        ]     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Valor em Reais (BRL)                           │    │
│  │ R$ [____________]                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📊 RESUMO DA OPERAÇÃO                          │    │
│  │                                                 │    │
│  │ Preço BTC:          R$ 300.000,00              │    │
│  │ Valor base:         R$ 1.000,00                │    │
│  │ Spread (3%):        R$ 30,00                   │    │
│  │ Taxa rede (0,25%):  R$ 2,50                    │    │
│  │ ─────────────────────────────────              │    │
│  │ TOTAL A PAGAR:      R$ 1.032,50                │    │
│  │ Você receberá:      0.00335832 BTC             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 💳 Método de Pagamento                         │    │
│  │ [🔽 Selecione...                         ]     │    │
│  │  • PIX                                         │    │
│  │  • TED                                         │    │
│  │  • Cartão de Crédito                           │    │
│  │  • PayPal                                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [  🚀 CONTINUAR COM A COMPRA  ]                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Modal de Confirmação

```
┌─────────────────────────────────────────┐
│  ⏱️ CONFIRME SUA OPERAÇÃO              │
│                                          │
│  Você tem 15 minutos para completar     │
│  o pagamento                             │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Timer: 14:59 ⏰                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Operação: COMPRA                       │
│  Criptomoeda: Bitcoin (BTC)             │
│  Valor a pagar: R$ 1.032,50            │
│  Você receberá: 0.00335832 BTC         │
│                                          │
│  Método: PIX                            │
│                                          │
│  ⚠️ ATENÇÃO:                           │
│  • Operação irreversível               │
│  • Pagamento deve ser feito em 15min   │
│  • BTC será creditado automaticamente  │
│                                          │
│  [ CANCELAR ]  [ ✅ CONFIRMAR ]        │
└─────────────────────────────────────────┘
```

### Página de Pagamento (após confirmação)

```
┌─────────────────────────────────────────┐
│  💳 EFETUE O PAGAMENTO                  │
│                                          │
│  ⏱️ Tempo restante: 13:42               │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  █████████████░░░░░░░░░░░░░░░░░  65%   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 📱 PAGAMENTO VIA PIX               │ │
│  │                                    │ │
│  │  [QR CODE]                        │ │
│  │                                    │ │
│  │  Ou copie o código PIX:           │ │
│  │  00020126330014BR.GOV.BCB.PIX... │ │
│  │  [ 📋 COPIAR CÓDIGO ]             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Valor: R$ 1.032,50                    │
│  ID da Operação: #OTC-2025-000123      │
│                                          │
│  🔄 Aguardando confirmação do pagamento│
│                                          │
│  [ ❌ CANCELAR OPERAÇÃO ]              │
└─────────────────────────────────────────┘
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `instant_trades`

```sql
CREATE TABLE instant_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Tipo de operação
    operation_type VARCHAR(10) NOT NULL, -- 'buy' ou 'sell'
    
    -- Criptomoeda
    cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    symbol VARCHAR(10) NOT NULL, -- 'BTC', 'ETH', etc
    
    -- Valores
    fiat_currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    fiat_amount DECIMAL(18, 2) NOT NULL, -- Valor em moeda fiat
    crypto_amount DECIMAL(28, 18) NOT NULL, -- Quantidade de crypto
    
    -- Preços e taxas
    crypto_price DECIMAL(18, 2) NOT NULL, -- Preço da crypto no momento
    spread_percentage DECIMAL(5, 2) NOT NULL DEFAULT 3.00, -- 3%
    spread_amount DECIMAL(18, 2) NOT NULL,
    network_fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.25, -- 0.25%
    network_fee_amount DECIMAL(18, 2) NOT NULL,
    total_amount DECIMAL(18, 2) NOT NULL, -- Valor total (com taxas)
    
    -- Pagamento
    payment_method VARCHAR(50) NOT NULL, -- 'pix', 'ted', 'credit_card', 'paypal'
    payment_id VARCHAR(255), -- ID externo do pagamento (do gateway)
    payment_proof_url VARCHAR(500), -- URL do comprovante
    
    -- Status e timing
    status VARCHAR(20) NOT NULL DEFAULT 'pending', 
    -- 'pending', 'payment_processing', 'payment_confirmed', 
    -- 'completed', 'expired', 'cancelled', 'failed'
    
    expires_at TIMESTAMP NOT NULL, -- Prazo para pagamento (15min)
    payment_confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Blockchain
    wallet_id UUID REFERENCES wallets(id),
    address_id UUID REFERENCES addresses(id),
    transaction_hash VARCHAR(255), -- Hash da transação blockchain
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_operation_type CHECK (operation_type IN ('buy', 'sell')),
    CONSTRAINT chk_status CHECK (status IN (
        'pending', 'payment_processing', 'payment_confirmed', 
        'completed', 'expired', 'cancelled', 'failed'
    ))
);

-- Índices
CREATE INDEX idx_instant_trades_user_id ON instant_trades(user_id);
CREATE INDEX idx_instant_trades_status ON instant_trades(status);
CREATE INDEX idx_instant_trades_created_at ON instant_trades(created_at DESC);
CREATE INDEX idx_instant_trades_expires_at ON instant_trades(expires_at);
```

### Tabela: `instant_trade_history` (Log de mudanças de status)

```sql
CREATE TABLE instant_trade_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES instant_trades(id) ON DELETE CASCADE,
    
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    
    changed_by_user_id UUID REFERENCES users(id),
    reason TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_instant_trade_history_trade_id ON instant_trade_history(trade_id);
```

---

## 🔧 Backend - API Endpoints

### 1. **GET** `/api/instant-trade/quote`
Calcula cotação em tempo real

**Query Params:**
```json
{
  "operation": "buy", // ou "sell"
  "symbol": "BTC",
  "fiat_amount": 1000.00, // ou crypto_amount se for sell
  "fiat_currency": "BRL"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "buy",
    "symbol": "BTC",
    "crypto_price": 300000.00,
    "fiat_amount": 1000.00,
    "crypto_amount": 0.00335832,
    "spread_percentage": 3.00,
    "spread_amount": 30.00,
    "network_fee_percentage": 0.25,
    "network_fee_amount": 2.50,
    "total_amount": 1032.50,
    "expires_in_seconds": 30,
    "quote_id": "quote_abc123xyz"
  }
}
```

### 2. **POST** `/api/instant-trade/create`
Cria uma nova operação OTC

**Request:**
```json
{
  "quote_id": "quote_abc123xyz",
  "operation": "buy",
  "symbol": "BTC",
  "fiat_amount": 1000.00,
  "payment_method": "pix",
  "wallet_id": "uuid-da-carteira"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trade_id": "uuid-trade",
    "reference_code": "OTC-2025-000123",
    "status": "pending",
    "expires_at": "2025-11-25T16:45:00Z",
    "expires_in_seconds": 900,
    "payment_info": {
      "method": "pix",
      "qr_code": "data:image/png;base64,...",
      "pix_code": "00020126330014BR.GOV.BCB.PIX...",
      "amount": 1032.50
    }
  }
}
```

### 3. **GET** `/api/instant-trade/:trade_id`
Consulta status de uma operação

**Response:**
```json
{
  "success": true,
  "data": {
    "trade_id": "uuid",
    "reference_code": "OTC-2025-000123",
    "operation": "buy",
    "symbol": "BTC",
    "status": "payment_processing",
    "fiat_amount": 1000.00,
    "crypto_amount": 0.00335832,
    "total_amount": 1032.50,
    "payment_method": "pix",
    "expires_at": "2025-11-25T16:45:00Z",
    "created_at": "2025-11-25T16:30:00Z"
  }
}
```

### 4. **POST** `/api/instant-trade/:trade_id/cancel`
Cancela uma operação pendente

**Response:**
```json
{
  "success": true,
  "message": "Operação cancelada com sucesso"
}
```

### 5. **GET** `/api/instant-trade/history`
Lista histórico de operações do usuário

**Query Params:**
- `page`: número da página
- `limit`: itens por página
- `status`: filtrar por status
- `operation`: filtrar por tipo (buy/sell)

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "pages": 5,
      "limit": 10
    }
  }
}
```

### 6. **POST** `/api/instant-trade/webhook/payment` (Interno)
Webhook para receber confirmações de pagamento

**Request:**
```json
{
  "trade_id": "uuid",
  "payment_status": "confirmed",
  "payment_id": "pix_12345",
  "paid_amount": 1032.50,
  "paid_at": "2025-11-25T16:35:00Z"
}
```

---

## 🔄 Fluxo de Operação

### Fluxo de Compra (Buy)

```
1. Usuário acessa /instant-trade
   ↓
2. Seleciona "COMPRAR"
   ↓
3. Escolhe criptomoeda (ex: BTC)
   ↓
4. Digite valor em BRL (ex: R$ 1.000)
   ↓
5. Frontend faz GET /instant-trade/quote
   ↓
6. Sistema retorna cotação com taxas
   ↓
7. Usuário seleciona método de pagamento
   ↓
8. Usuário clica "CONTINUAR"
   ↓
9. Frontend faz POST /instant-trade/create
   ↓
10. Backend cria registro no DB
   ↓
11. Backend gera código PIX/TED/etc
   ↓
12. Frontend mostra página de pagamento
   ↓
13. Timer de 15min inicia
   ↓
14. Usuário faz pagamento
   ↓
15. Gateway envia webhook para /webhook/payment
   ↓
16. Backend verifica pagamento
   ↓
17. Backend atualiza status: payment_confirmed
   ↓
18. Backend credita crypto na carteira do usuário
   ↓
19. Backend atualiza status: completed
   ↓
20. Frontend notifica usuário: "Compra concluída! ✅"
```

### Fluxo de Venda (Sell)

```
1. Usuário acessa /instant-trade
   ↓
2. Seleciona "VENDER"
   ↓
3. Escolhe criptomoeda (ex: ETH)
   ↓
4. Digite quantidade de ETH
   ↓
5. Frontend faz GET /instant-trade/quote
   ↓
6. Sistema retorna quanto receberá em BRL
   ↓
7. Usuário confirma operação
   ↓
8. Frontend faz POST /instant-trade/create
   ↓
9. Backend bloqueia crypto na carteira (hold)
   ↓
10. Backend solicita dados bancários (PIX/TED)
   ↓
11. Backend processa transferência
   ↓
12. Backend debita crypto da carteira
   ↓
13. Backend atualiza status: completed
   ↓
14. Frontend notifica: "Venda concluída! Valor depositado ✅"
```

---

## ⚙️ Lógica de Negócio

### Cálculo de Preços (Compra)

```python
# Preço de mercado
market_price = get_market_price(symbol)

# Preço com spread
otc_price = market_price * (1 + SPREAD_PERCENTAGE / 100)

# Quantidade de crypto que o usuário receberá
crypto_amount = fiat_amount / otc_price

# Taxas
spread_amount = fiat_amount * (SPREAD_PERCENTAGE / 100)
network_fee_amount = fiat_amount * (NETWORK_FEE_PERCENTAGE / 100)

# Total a pagar
total_amount = fiat_amount + spread_amount + network_fee_amount
```

### Cálculo de Preços (Venda)

```python
# Preço de mercado
market_price = get_market_price(symbol)

# Preço com spread (usuário recebe menos)
otc_price = market_price * (1 - SPREAD_PERCENTAGE / 100)

# Valor bruto em fiat
gross_amount = crypto_amount * otc_price

# Taxas
spread_amount = gross_amount * (SPREAD_PERCENTAGE / 100)
network_fee_amount = gross_amount * (NETWORK_FEE_PERCENTAGE / 100)

# Total que o usuário receberá
net_amount = gross_amount - spread_amount - network_fee_amount
```

### Timer de Expiração

```python
EXPIRATION_TIME = 15 * 60  # 15 minutos em segundos

expires_at = datetime.now() + timedelta(seconds=EXPIRATION_TIME)

# Job assíncrono que roda a cada minuto
async def check_expired_trades():
    expired_trades = db.query(InstantTrade).filter(
        InstantTrade.status == 'pending',
        InstantTrade.expires_at < datetime.now()
    ).all()
    
    for trade in expired_trades:
        trade.status = 'expired'
        db.commit()
        
        # Notificar usuário
        send_notification(trade.user_id, "Operação OTC expirada")
```

---

## 🎨 Design Premium - Cores e Estilos

### Paleta de Cores

```css
/* Compra (Buy) */
--buy-primary: #10B981;    /* Verde */
--buy-hover: #059669;
--buy-light: #D1FAE5;

/* Venda (Sell) */
--sell-primary: #EF4444;   /* Vermelho */
--sell-hover: #DC2626;
--sell-light: #FEE2E2;

/* Neutro */
--neutral-dark: #1F2937;
--neutral-light: #F9FAFB;
--border: #E5E7EB;

/* Gradientes */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Animações

```css
/* Pulse no timer */
@keyframes pulse-timer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Progress bar */
@keyframes progress {
  from { width: 0%; }
  to { width: 100%; }
}
```

---

## 🔒 Segurança

### Validações

1. **Rate Limiting**: Máximo 5 cotações por minuto por usuário
2. **Validação de Valores**: Mínimo R$ 50, Máximo R$ 50.000 por operação
3. **KYC**: Usuário deve ter KYC verificado para operações > R$ 10.000
4. **2FA**: Obrigatório para operações > R$ 5.000
5. **IP Whitelist**: Bloquear IPs suspeitos
6. **Webhook Signature**: Validar assinatura de webhooks de pagamento

### Logs de Auditoria

```python
# Registrar todas as ações críticas
audit_log = {
    "user_id": user.id,
    "action": "instant_trade_created",
    "trade_id": trade.id,
    "operation": "buy",
    "amount": 1032.50,
    "ip_address": request.ip,
    "user_agent": request.user_agent,
    "timestamp": datetime.now()
}
```

---

## 📊 Métricas e Relatórios

### Métricas a Acompanhar

1. **Volume de Transações**: Total BRL transacionado
2. **Taxa de Conversão**: Cotações → Operações completadas
3. **Taxa de Expiração**: % de operações que expiraram
4. **Método de Pagamento Preferido**: PIX, TED, Cartão, PayPal
5. **Criptomoedas Mais Negociadas**: BTC, ETH, etc
6. **Receita de Spread**: Total ganho com spread
7. **Tempo Médio de Pagamento**: Quanto tempo usuários levam para pagar

### Dashboard Admin

```
┌──────────────────────────────────────────────┐
│  📊 INSTANT TRADE OTC - PAINEL ADMIN        │
│                                              │
│  Hoje:                                       │
│  • Volume: R$ 250.430,00                    │
│  • Operações: 87 (64 compra, 23 venda)     │
│  • Receita: R$ 8.139,00                     │
│  • Taxa conversão: 73%                      │
│                                              │
│  [Gráfico de volume por hora]               │
│  [Gráfico de criptomoedas mais negociadas]  │
│  [Tabela de últimas operações]              │
└──────────────────────────────────────────────┘
```

---

## 🚀 Implementação - Ordem de Desenvolvimento

### Fase 1: Backend (Prioridade Alta)
1. ✅ Criar model `InstantTrade`
2. ✅ Criar migrations
3. ✅ Implementar endpoint `/quote`
4. ✅ Implementar endpoint `/create`
5. ✅ Implementar endpoint `/status`
6. ✅ Implementar sistema de expiração (background job)

### Fase 2: Frontend (Prioridade Alta)
1. ✅ Criar página `/instant-trade`
2. ✅ Implementar toggle Comprar/Vender
3. ✅ Implementar seleção de crypto
4. ✅ Implementar input de valor
5. ✅ Implementar cálculo em tempo real
6. ✅ Implementar modal de confirmação
7. ✅ Implementar página de pagamento com timer

### Fase 3: Integrações (Prioridade Média)
1. ⏳ Integrar gateway PIX
2. ⏳ Integrar gateway TED
3. ⏳ Integrar gateway Cartão de Crédito
4. ⏳ Integrar PayPal
5. ⏳ Implementar webhooks

### Fase 4: Melhorias (Prioridade Baixa)
1. ⏳ Dashboard admin
2. ⏳ Relatórios e métricas
3. ⏳ Sistema de notificações
4. ⏳ Histórico detalhado
5. ⏳ Exportação de comprovantes

---

## 📝 Notas Técnicas

### Preços em Tempo Real

```python
# Cache de preços (atualiza a cada 30 segundos)
@cache(ttl=30)
async def get_crypto_price(symbol: str) -> Decimal:
    """Busca preço de API externa (CoinGecko, Binance, etc)"""
    price = await fetch_from_external_api(symbol)
    return Decimal(str(price))
```

### Concorrência

```python
# Lock pessimista para evitar race conditions
from sqlalchemy import select, for_update

async def create_trade(user_id, crypto_amount):
    # Bloqueia registro da carteira
    wallet = await db.execute(
        select(Wallet)
        .where(Wallet.user_id == user_id)
        .with_for_update()
    )
    
    if wallet.balance < crypto_amount:
        raise InsufficientBalanceError()
    
    # Cria trade e debita saldo atomicamente
    trade = InstantTrade(...)
    wallet.balance -= crypto_amount
    
    db.add(trade)
    await db.commit()
```

### Performance

```python
# Índices importantes
CREATE INDEX idx_instant_trades_user_status ON instant_trades(user_id, status);
CREATE INDEX idx_instant_trades_expires_pending ON instant_trades(expires_at) 
    WHERE status = 'pending';
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Model `InstantTrade` criado
- [ ] Migrations executadas
- [ ] Endpoint `/quote` funcionando
- [ ] Endpoint `/create` funcionando
- [ ] Endpoint `/status` funcionando
- [ ] Endpoint `/cancel` funcionando
- [ ] Endpoint `/history` funcionando
- [ ] Background job de expiração
- [ ] Testes unitários
- [ ] Testes de integração

### Frontend
- [ ] Página `/instant-trade` criada
- [ ] Toggle Buy/Sell funcionando
- [ ] Seleção de crypto funcionando
- [ ] Input de valor com máscara
- [ ] Cálculo em tempo real
- [ ] Modal de confirmação
- [ ] Página de pagamento
- [ ] Timer visual funcionando
- [ ] QR Code PIX
- [ ] Responsivo mobile
- [ ] Testes E2E

### Integrações
- [ ] Gateway PIX configurado
- [ ] Webhook PIX funcionando
- [ ] Gateway TED configurado
- [ ] Gateway Cartão configurado
- [ ] PayPal configurado

---

## 🎯 KPIs de Sucesso

1. **90% de taxa de conclusão** (operações iniciadas vs completadas)
2. **< 2 minutos** tempo médio de pagamento
3. **R$ 100k+** volume mensal no primeiro mês
4. **4.5+ estrelas** de satisfação do usuário
5. **< 1%** taxa de fraude/chargebacks

---

## 📞 Suporte ao Usuário

### FAQ
- "Quanto tempo leva para receber minha criptomoeda?"
- "Posso cancelar uma operação?"
- "Quais são as taxas?"
- "O que acontece se o pagamento expirar?"
- "É seguro?"

### Chat/Suporte
- Botão de ajuda em todas as telas
- WhatsApp para suporte urgente
- Email para comprovantes

---

**Documento criado em**: 25 de novembro de 2025
**Versão**: 1.0
**Status**: 📝 Especificação completa pronta para implementação

