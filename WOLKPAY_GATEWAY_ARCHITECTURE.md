# 🚀 WolkPay Gateway - Arquitetura Completa

## 📌 Visão Geral

**Nome:** WolkPay Gateway  
**Propósito:** Payment Gateway para e-commerce/marketplace aceitar pagamentos em PIX e Criptomoedas  
**Mercado Alvo:** Empresas que querem integrar pagamentos crypto em suas plataformas

---

## 🎯 Funcionalidades Principais

### Para Merchants (Lojistas)

1. **Dashboard Merchant**
   - Cadastro e onboarding
   - API Keys management
   - Configuração de webhooks
   - Relatórios de transações
   - Saldo e saques

2. **API de Pagamentos**
   - Criar cobrança (PIX ou Crypto)
   - Verificar status
   - Cancelar cobrança
   - Webhook de confirmação
   - Reembolso

3. **Métodos de Pagamento**
   - PIX (via Banco do Brasil API) ✅ JÁ TEMOS
   - BTC, ETH, USDT, USDC, etc. (15+ cryptos) ✅ JÁ TEMOS
   - Conversão automática para stablecoin

### Para Clientes Finais

1. **Checkout Público**
   - Página de pagamento white-label
   - QR Code PIX automático ✅ JÁ TEMOS
   - QR Code/Endereço Crypto (NOVO)
   - Timer de expiração
   - Confirmação em tempo real

---

## 🏗️ Arquitetura Técnica

### Backend (FastAPI)

```
backend/app/
├── models/
│   └── gateway/
│       ├── merchant.py          # Modelo do lojista
│       ├── api_key.py           # API Keys do merchant
│       ├── payment.py           # Cobranças/Pagamentos
│       └── settlement.py        # Liquidações/Saques
│
├── routers/
│   └── gateway/
│       ├── merchant.py          # CRUD merchants
│       ├── payments.py          # API de pagamentos
│       ├── webhooks.py          # Webhooks de callback
│       └── checkout.py          # Checkout público
│
├── services/
│   └── gateway/
│       ├── merchant_service.py  # Lógica de merchants
│       ├── payment_service.py   # Lógica de pagamentos
│       └── crypto_payment.py    # Gera endereços únicos
│
└── schemas/
    └── gateway/
        └── *.py                 # Schemas Pydantic
```

### Frontend (React/Vite)

```
Frontend/src/
├── pages/
│   └── gateway/
│       ├── MerchantDashboard.tsx   # Dashboard do lojista
│       ├── MerchantOnboarding.tsx  # Cadastro
│       ├── PaymentsList.tsx        # Lista de cobranças
│       ├── ApiKeysPage.tsx         # Gerenciar API Keys
│       └── CheckoutPage.tsx        # Checkout público
│
├── components/
│   └── gateway/
│       ├── PaymentWidget.tsx       # Widget embedável
│       └── CryptoQRCode.tsx        # QR Code crypto
│
└── services/
    └── gatewayService.ts           # API client
```

---

## 📊 Modelos de Dados

### 1. Merchant (Lojista)

```python
class GatewayMerchant(Base):
    __tablename__ = "gateway_merchants"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"))  # Usuário HOLD

    # Dados da empresa
    business_name = Column(String(255), nullable=False)
    business_document = Column(String(20), nullable=False)  # CNPJ
    business_email = Column(String(255), nullable=False)
    business_phone = Column(String(20))
    website_url = Column(String(500))

    # Configuração
    webhook_url = Column(String(500))          # URL para callbacks
    webhook_secret = Column(String(64))        # HMAC secret
    settlement_crypto = Column(String(10))     # USDT, USDC, BTC, etc.
    settlement_network = Column(String(20))    # polygon, ethereum, etc.
    auto_settlement = Column(Boolean, default=True)  # Sacar automático?

    # Taxas (pode ser customizado por merchant)
    fee_percentage = Column(Numeric(5,2), default=2.00)  # 2%

    # Status
    status = Column(Enum('pending', 'active', 'suspended'), default='pending')
    kyb_status = Column(Enum('pending', 'approved', 'rejected'))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
```

### 2. API Key

```python
class GatewayApiKey(Base):
    __tablename__ = "gateway_api_keys"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"))

    # Key info
    name = Column(String(100))  # "Production", "Testing"
    key_prefix = Column(String(8))  # Primeiros 8 chars (wk_live_...)
    key_hash = Column(String(64))   # SHA256 da key completa

    # Permissions
    environment = Column(Enum('live', 'test'), default='test')
    permissions = Column(JSON)  # ['payments.create', 'payments.read']

    # Rate limits
    rate_limit_per_minute = Column(Integer, default=60)

    # Status
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)  # Opcional
```

### 3. Payment (Cobrança)

```python
class GatewayPayment(Base):
    __tablename__ = "gateway_payments"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"))

    # Identificação
    external_id = Column(String(100))        # ID do merchant
    payment_code = Column(String(20))        # GP-2026-XXXXXX

    # Valores
    amount = Column(Numeric(18,2), nullable=False)    # Valor original
    currency = Column(String(3), default='BRL')       # BRL, USD
    fee_amount = Column(Numeric(18,2))                # Taxa
    net_amount = Column(Numeric(18,2))                # Líquido

    # Método de pagamento escolhido
    payment_method = Column(Enum('pix', 'crypto'))

    # Para PIX
    pix_txid = Column(String(100))
    pix_qrcode = Column(Text)
    pix_qrcode_image = Column(Text)  # Base64

    # Para Crypto
    crypto_currency = Column(String(10))   # BTC, ETH, USDT
    crypto_network = Column(String(20))    # bitcoin, ethereum, polygon
    crypto_address = Column(String(100))   # Endereço único gerado
    crypto_amount = Column(Numeric(28,18)) # Quantidade de crypto
    crypto_rate = Column(Numeric(18,8))    # Taxa USD no momento
    tx_hash = Column(String(100))          # Hash da transação

    # Metadata
    description = Column(String(500))
    metadata = Column(JSON)  # Dados extras do merchant

    # Status
    status = Column(Enum(
        'pending',        # Aguardando pagamento
        'processing',     # Detectado, confirmando
        'paid',           # Pago/Confirmado
        'expired',        # Expirou
        'cancelled',      # Cancelado
        'refunded'        # Reembolsado
    ), default='pending')

    # Webhooks
    webhook_sent = Column(Boolean, default=False)
    webhook_sent_at = Column(DateTime)
    webhook_attempts = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    paid_at = Column(DateTime)

    # Dados do pagador (opcional)
    payer_name = Column(String(255))
    payer_email = Column(String(255))
    payer_document = Column(String(20))
```

### 4. Settlement (Liquidação)

```python
class GatewaySettlement(Base):
    __tablename__ = "gateway_settlements"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("gateway_merchants.id"))

    # Valores
    gross_amount = Column(Numeric(18,2))      # Total bruto
    fee_amount = Column(Numeric(18,2))        # Taxas HOLD
    net_amount = Column(Numeric(18,2))        # Líquido

    # Destino
    settlement_crypto = Column(String(10))    # USDT, BTC, etc.
    settlement_network = Column(String(20))   # polygon, bitcoin
    settlement_address = Column(String(100))  # Endereço do merchant

    # Transação
    tx_hash = Column(String(100))

    # Status
    status = Column(Enum('pending', 'processing', 'completed', 'failed'))

    # Timestamps
    created_at = Column(DateTime)
    processed_at = Column(DateTime)

    # Pagamentos incluídos
    payments = relationship("GatewayPayment")
```

---

## 🔌 API Endpoints

### Autenticação

```
Headers:
  Authorization: Bearer wk_live_xxxxxxxxxxxx
  X-Request-Id: uuid (opcional, para idempotência)
```

### Endpoints Principais

```yaml
# =====================================
# PAYMENTS (Cobranças)
# =====================================

POST /api/v1/gateway/payments
  # Criar nova cobrança
  Body:
    amount: 100.00
    currency: "BRL"
    payment_methods: ["pix", "crypto"]  # Aceitos
    crypto_currencies: ["BTC", "USDT", "ETH"]  # Cryptos aceitas
    description: "Pedido #12345"
    external_id: "order_12345"
    customer:
      name: "João Silva"
      email: "joao@email.com"
      document: "123.456.789-00"
    metadata:
      order_id: "12345"
      product: "Camiseta"
    redirect_url: "https://loja.com/obrigado"
    webhook_url: "https://loja.com/webhooks/gateway"  # Opcional

  Response:
    id: "pay_abc123"
    payment_code: "GP-2026-001234"
    status: "pending"
    amount: 100.00
    checkout_url: "https://gateway.wolknow.com/pay/abc123"
    expires_at: "2026-03-09T15:00:00Z"

GET /api/v1/gateway/payments/{id}
  # Consultar status da cobrança

GET /api/v1/gateway/payments
  # Listar cobranças (com filtros)
  Query: ?status=paid&from=2026-03-01&to=2026-03-09

POST /api/v1/gateway/payments/{id}/cancel
  # Cancelar cobrança pendente

POST /api/v1/gateway/payments/{id}/refund
  # Reembolsar pagamento (parcial ou total)

# =====================================
# CHECKOUT (Público - sem auth)
# =====================================

GET /gateway/checkout/{payment_code}
  # Página de checkout (HTML ou JSON)
  Accept: text/html → Retorna página
  Accept: application/json → Retorna dados

POST /gateway/checkout/{payment_code}/select-method
  # Cliente escolhe método (PIX ou Crypto)
  Body:
    method: "crypto"
    crypto_currency: "BTC"

  Response (se crypto):
    crypto_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    crypto_amount: "0.00234567"
    crypto_rate: 42650.00
    qr_code: "bitcoin:bc1q...?amount=0.00234567"
    expires_at: "2026-03-09T14:30:00Z"

GET /gateway/checkout/{payment_code}/status
  # Verificar status em tempo real (polling ou SSE)

# =====================================
# WEBHOOKS (Callbacks para merchants)
# =====================================

# HOLD envia para webhook_url do merchant:
POST {merchant_webhook_url}
  Headers:
    X-Gateway-Signature: hmac_sha256(payload, webhook_secret)
    X-Gateway-Event: payment.paid

  Body:
    event: "payment.paid"
    payment_id: "pay_abc123"
    external_id: "order_12345"
    amount: 100.00
    net_amount: 98.00
    paid_at: "2026-03-09T14:25:00Z"
    payment_method: "pix"  # ou "crypto"
    crypto_details:  # se crypto
      currency: "BTC"
      amount: "0.00234567"
      tx_hash: "abc123..."
      network: "bitcoin"

# =====================================
# MERCHANT DASHBOARD
# =====================================

GET /api/v1/gateway/merchant/profile
POST /api/v1/gateway/merchant/profile
  # Atualizar dados do merchant

GET /api/v1/gateway/merchant/api-keys
POST /api/v1/gateway/merchant/api-keys
DELETE /api/v1/gateway/merchant/api-keys/{id}
  # Gerenciar API Keys

GET /api/v1/gateway/merchant/balance
  # Saldo disponível para saque

POST /api/v1/gateway/merchant/withdraw
  # Solicitar saque
  Body:
    amount: 1000.00
    address: "0x..."  # Endereço crypto do merchant

GET /api/v1/gateway/merchant/settlements
  # Histórico de saques
```

---

## 💡 Fluxo de Pagamento Crypto (DIFERENCIAL)

### Problema Atual:

Cada pedido/produto precisa de um endereço/hash único para rastrear o pagamento.

### Solução: Endereços Derivados (HD Wallet)

```python
# Usar derivação HD para gerar endereços únicos por payment

def generate_payment_address(merchant_id: str, payment_id: str, network: str):
    """
    Gera endereço único para o pagamento usando derivação HD.

    Derivation path: m/44'/coin'/merchant_index'/0/payment_index

    Isso permite:
    1. Cada payment tem endereço único
    2. Todos derivam da mesma seed da system_wallet
    3. Podemos monitorar todos os endereços
    4. Identificação automática quando recebe fundos
    """

    # 1. Obter índices
    merchant_index = get_merchant_index(merchant_id)  # Ex: 1, 2, 3...
    payment_index = get_payment_index(payment_id)      # Ex: 1, 2, 3...

    # 2. Gerar endereço usando system_wallet
    from app.services.system_blockchain_wallet_service import get_system_wallet_service

    service = get_system_wallet_service(db)

    # Path customizado para gateway payments
    # m/44'/0'/1000'/merchant_index/payment_index
    custom_path = f"m/44'/0'/1000'/{merchant_index}/{payment_index}"

    address = service.derive_address(network, custom_path)

    return address
```

### Monitoramento de Pagamentos Crypto

```python
# Background task para verificar pagamentos

async def monitor_crypto_payments():
    """
    Monitora endereços de pagamento crypto pendentes.
    Executar a cada 30 segundos.
    """

    pending_payments = db.query(GatewayPayment).filter(
        GatewayPayment.payment_method == 'crypto',
        GatewayPayment.status == 'pending',
        GatewayPayment.expires_at > datetime.utcnow()
    ).all()

    for payment in pending_payments:
        # Verificar balance do endereço
        balance = await check_address_balance(
            payment.crypto_address,
            payment.crypto_network
        )

        if balance >= payment.crypto_amount:
            # Pagamento detectado!
            payment.status = 'processing'
            db.commit()

            # Aguardar confirmações
            await wait_for_confirmations(payment)

            # Confirmar pagamento
            payment.status = 'paid'
            payment.paid_at = datetime.utcnow()
            db.commit()

            # Enviar webhook
            await send_webhook(payment.merchant, payment)

            # Mover fundos para carteira principal
            await consolidate_funds(payment)
```

---

## 💰 Modelo de Negócio

### Taxas Sugeridas

| Método | Taxa Padrão | Observação                              |
| ------ | ----------- | --------------------------------------- |
| PIX    | 1.5% - 2.0% | Competitivo com PagSeguro/Mercado Pago  |
| Crypto | 1.0% - 1.5% | + gas fee da rede (cobrado do merchant) |
| Saque  | 0.5%        | Mínimo R$ 5                             |

### Volume Pricing

| Volume Mensal  | PIX        | Crypto     |
| -------------- | ---------- | ---------- |
| Até R$ 50k     | 2.0%       | 1.5%       |
| R$ 50k - 200k  | 1.8%       | 1.3%       |
| R$ 200k - 500k | 1.5%       | 1.0%       |
| Acima R$ 500k  | Negociável | Negociável |

---

## 📅 Roadmap de Implementação

### Fase 1 - MVP (2-3 semanas)

- [ ] Models: Merchant, ApiKey, Payment
- [ ] API: Criar payment, consultar status
- [ ] Checkout: Página pública PIX (reusar WolkPay)
- [ ] Dashboard: Cadastro merchant básico
- [ ] Webhook: Callback para merchants

### Fase 2 - Crypto Payments (2 semanas)

- [ ] Geração de endereços únicos por payment
- [ ] Checkout com opção crypto
- [ ] Monitoramento de endereços
- [ ] Confirmação automática
- [ ] Conversão para stablecoin (opcional)

### Fase 3 - Dashboard Completo (1-2 semanas)

- [ ] Lista de transações
- [ ] API Keys management
- [ ] Relatórios e gráficos
- [ ] Configuração de webhooks
- [ ] Saques/Liquidações

### Fase 4 - Extras (ongoing)

- [ ] Widget embedável (iframe/JS)
- [ ] SDK JavaScript
- [ ] Plugins WooCommerce/Shopify
- [ ] Sandbox para testes
- [ ] Documentação API (Swagger/Redoc)

---

## ✅ O Que Você Já Tem Pronto

1. **Banco do Brasil PIX** ✅
   - `banco_brasil_service.py` - API completa
   - Webhooks funcionando
   - QR Code EMV

2. **Sistema de Carteiras** ✅
   - `system_blockchain_wallet_service.py`
   - Geração de endereços 15 redes
   - Derivação HD

3. **WolkPay Base** ✅
   - Models: Invoice, Payer, Payment
   - Checkout público
   - Geração PIX

4. **Multi-Chain** ✅
   - `multi_chain_service.py`
   - Envio em todas as redes
   - Verificação de saldos

5. **Contabilidade** ✅
   - `AccountingEntry` model
   - Registro de taxas
   - Relatórios

---

## 🎯 Próximos Passos

1. **Criar estrutura de pastas** para o módulo gateway
2. **Criar models** Merchant, ApiKey, Payment
3. **Adaptar WolkPay** para ser base do Gateway
4. **Criar rotas API** para merchants
5. **Dashboard frontend** para merchants

Quer que eu comece a implementar?
