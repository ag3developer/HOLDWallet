# 📋 WolkPay Gateway - Plano de Implementação por Fases

> **Documento de Planejamento e Execução**  
> Data: 10 de Março de 2026  
> Versão: 2.0

---

## 📊 Status Atual

| Fase | Descrição           | Status      | Data        |
| ---- | ------------------- | ----------- | ----------- |
| 1    | Backend Models      | ✅ Completa | 9 Mar 2026  |
| 2    | Schemas Pydantic    | ✅ Completa | 9 Mar 2026  |
| 3    | Services Layer      | ✅ Completa | 9 Mar 2026  |
| 4    | API Routers         | ✅ Completa | 10 Mar 2026 |
| 5    | Landing Page        | ✅ Completa | 10 Mar 2026 |
| 6    | Multi-idioma (i18n) | ✅ Completa | 10 Mar 2026 |
| 7    | Frontend Checkout   | 🔄 Próxima  | -           |
| 8    | Dashboard Merchant  | ⏳ Pendente | -           |
| 9    | SDKs                | ⏳ Pendente | -           |
| 10   | Documentação        | ⏳ Pendente | -           |

**Progresso:** 60% completo (6/10 fases)

---

## 📊 Análise da Estrutura Existente

### Backend - Estrutura Atual

```
backend/app/
├── core/
│   ├── db.py              ✅ Base SQLAlchemy, SessionLocal, get_db
│   └── config.py          ✅ Settings do projeto
│
├── models/                 # 35 arquivos de models
│   ├── wolkpay.py         ✅ BASE PARA GATEWAY (733 linhas)
│   ├── user.py            ✅ Usuários
│   ├── wallet.py          ✅ Carteiras
│   ├── instant_trade.py   ✅ Trades OTC
│   ├── accounting.py      ✅ Contabilidade
│   └── ...
│
├── routers/                # 42 arquivos de rotas
│   ├── wolkpay.py         ✅ Rotas WolkPay existentes
│   ├── webhooks_bb.py     ✅ Webhooks Banco do Brasil
│   ├── admin/             # 24 rotas admin
│   │   ├── wolkpay_admin.py  ✅ Admin WolkPay
│   │   └── ...
│   └── ...
│
├── services/               # 60+ serviços
│   ├── wolkpay_service.py           ✅ Serviço WolkPay (1400+ linhas)
│   ├── banco_brasil_service.py      ✅ API PIX BB
│   ├── system_blockchain_wallet_service.py ✅ Carteira Sistema
│   ├── multi_chain_service.py       ✅ Multi-chain
│   └── ...
│
└── schemas/                # Schemas Pydantic
    ├── wolkpay.py         ✅ Schemas WolkPay
    └── ...
```

### Frontend - Estrutura Atual

```
Frontend/src/
├── pages/
│   ├── wolkpay/           ✅ 4 páginas WolkPay existentes
│   │   ├── WolkPayPage.tsx
│   │   ├── WolkPayCheckoutPage.tsx
│   │   ├── WolkPayWelcomePage.tsx
│   │   └── ...
│   ├── admin/             ✅ ~20 páginas admin
│   └── ...
│
├── services/
│   └── wolkpay.ts         ✅ Serviço WolkPay frontend
│
└── components/
    └── ...
```

### Banco de Dados - Tabelas Existentes Relevantes

```sql
-- Já existentes (reusar)
users                    -- Usuários do sistema
wallets                  -- Carteiras dos usuários
wolkpay_invoices        -- Faturas WolkPay (base para payments)
wolkpay_payers          -- Pagadores (dados KYC)
wolkpay_payments        -- Pagamentos PIX
wolkpay_approvals       -- Aprovações admin
wolkpay_audit_logs      -- Logs de auditoria
accounting_entries      -- Entradas contábeis
system_blockchain_wallet -- Carteira do sistema
```

---

## 🎯 Objetivo Final

Criar um **Payment Gateway** que permita empresas externas (merchants) integrarem pagamentos via:

- **PIX** (já temos 100%)
- **Criptomoedas** (BTC, ETH, USDT, etc.)

---

## 📦 Fase 1: Backend - Models e Database

### 1.1 Criar Arquivo de Models

**Arquivo:** `backend/app/models/gateway.py`

**Tabelas a criar:**

| Tabela                 | Descrição                     |
| ---------------------- | ----------------------------- |
| `gateway_merchants`    | Cadastro de lojistas/empresas |
| `gateway_api_keys`     | Chaves de API dos merchants   |
| `gateway_payments`     | Cobranças/pagamentos          |
| `gateway_settlements`  | Liquidações/saques            |
| `gateway_webhooks_log` | Log de webhooks enviados      |

### 1.2 Estrutura das Tabelas

```python
# gateway_merchants
- id: UUID (PK)
- user_id: FK -> users.id (usuário HOLD vinculado)
- business_name: VARCHAR(255)
- business_document: VARCHAR(20) (CNPJ)
- business_email: VARCHAR(255)
- business_phone: VARCHAR(20)
- website_url: VARCHAR(500)
- logo_url: VARCHAR(500)
- webhook_url: VARCHAR(500)
- webhook_secret: VARCHAR(64)
- settlement_crypto: VARCHAR(10) (USDT, USDC, BTC)
- settlement_network: VARCHAR(20) (polygon, ethereum)
- settlement_address: VARCHAR(100)
- auto_settlement: BOOLEAN (default: false)
- min_settlement_amount: DECIMAL(18,2)
- fee_percentage: DECIMAL(5,2) (default: 2.00)
- status: ENUM (pending, active, suspended, rejected)
- kyb_status: ENUM (pending, approved, rejected)
- kyb_documents: JSON
- created_at: DATETIME
- approved_at: DATETIME
- approved_by: FK -> users.id

# gateway_api_keys
- id: UUID (PK)
- merchant_id: FK -> gateway_merchants.id
- name: VARCHAR(100)
- key_prefix: VARCHAR(12) (wk_live_xxxx ou wk_test_xxxx)
- key_hash: VARCHAR(64) (SHA256)
- environment: ENUM (live, test)
- permissions: JSON
- rate_limit_per_minute: INTEGER (default: 60)
- is_active: BOOLEAN
- last_used_at: DATETIME
- last_used_ip: VARCHAR(45)
- created_at: DATETIME
- expires_at: DATETIME (opcional)
- revoked_at: DATETIME

# gateway_payments
- id: UUID (PK)
- merchant_id: FK -> gateway_merchants.id
- external_id: VARCHAR(100) (ID do merchant)
- payment_code: VARCHAR(20) (GP-2026-XXXXXX)
- amount: DECIMAL(18,2)
- currency: VARCHAR(3) (BRL, USD)
- fee_amount: DECIMAL(18,2)
- net_amount: DECIMAL(18,2)
- description: VARCHAR(500)
- metadata: JSON
- payment_method: ENUM (pix, crypto) (NULL = não escolheu)
- pix_txid: VARCHAR(100)
- pix_qrcode: TEXT
- pix_qrcode_image: TEXT
- crypto_currency: VARCHAR(10)
- crypto_network: VARCHAR(20)
- crypto_address: VARCHAR(100)
- crypto_amount: DECIMAL(28,18)
- crypto_rate: DECIMAL(18,8)
- crypto_tx_hash: VARCHAR(100)
- crypto_confirmations: INTEGER
- status: ENUM (pending, awaiting_payment, processing, paid, expired, cancelled, refunded)
- webhook_url: VARCHAR(500) (override do merchant)
- webhook_sent: BOOLEAN
- webhook_sent_at: DATETIME
- webhook_attempts: INTEGER
- webhook_last_error: TEXT
- redirect_url: VARCHAR(500)
- cancel_url: VARCHAR(500)
- customer_name: VARCHAR(255)
- customer_email: VARCHAR(255)
- customer_document: VARCHAR(20)
- customer_phone: VARCHAR(20)
- expires_at: DATETIME
- paid_at: DATETIME
- created_at: DATETIME
- ip_address: VARCHAR(45)
- user_agent: TEXT

# gateway_settlements
- id: UUID (PK)
- merchant_id: FK -> gateway_merchants.id
- settlement_code: VARCHAR(20) (GS-2026-XXXXXX)
- gross_amount: DECIMAL(18,2)
- fee_amount: DECIMAL(18,2)
- net_amount: DECIMAL(18,2)
- payments_count: INTEGER
- settlement_crypto: VARCHAR(10)
- settlement_network: VARCHAR(20)
- settlement_address: VARCHAR(100)
- tx_hash: VARCHAR(100)
- status: ENUM (pending, processing, completed, failed)
- created_at: DATETIME
- processed_at: DATETIME
- processed_by: FK -> users.id
- error_message: TEXT

# gateway_settlement_items
- id: UUID (PK)
- settlement_id: FK -> gateway_settlements.id
- payment_id: FK -> gateway_payments.id
- amount: DECIMAL(18,2)

# gateway_webhooks_log
- id: UUID (PK)
- payment_id: FK -> gateway_payments.id
- merchant_id: FK -> gateway_merchants.id
- event_type: VARCHAR(50) (payment.paid, payment.expired, etc.)
- url: VARCHAR(500)
- payload: JSON
- response_status: INTEGER
- response_body: TEXT
- attempt_number: INTEGER
- created_at: DATETIME
- duration_ms: INTEGER
```

### 1.3 Checklist Fase 1

- [ ] Criar `backend/app/models/gateway.py`
- [ ] Definir todos os Enums (MerchantStatus, PaymentStatus, etc.)
- [ ] Definir model `GatewayMerchant`
- [ ] Definir model `GatewayApiKey`
- [ ] Definir model `GatewayPayment`
- [ ] Definir model `GatewaySettlement`
- [ ] Definir model `GatewaySettlementItem`
- [ ] Definir model `GatewayWebhookLog`
- [ ] Adicionar índices otimizados
- [ ] Importar no `__init__.py`
- [ ] Criar migration (Alembic ou auto-create)
- [ ] Testar criação das tabelas

---

## 📦 Fase 2: Backend - Schemas Pydantic

### 2.1 Criar Schemas

**Arquivo:** `backend/app/schemas/gateway.py`

```python
# Request/Response schemas para:

# Merchant
- MerchantCreate
- MerchantUpdate
- MerchantResponse
- MerchantListResponse

# API Keys
- ApiKeyCreate
- ApiKeyResponse
- ApiKeyListResponse

# Payments
- PaymentCreate (usado pelos merchants via API)
- PaymentResponse
- PaymentListResponse
- PaymentStatusResponse

# Checkout
- CheckoutSelectMethodRequest
- CheckoutPixResponse
- CheckoutCryptoResponse

# Webhooks
- WebhookPayload
- WebhookEventTypes

# Settlements
- SettlementResponse
- SettlementListResponse
- WithdrawRequest
```

### 2.2 Checklist Fase 2

- [ ] Criar `backend/app/schemas/gateway.py`
- [ ] Schemas de Merchant
- [ ] Schemas de API Keys
- [ ] Schemas de Payments
- [ ] Schemas de Checkout
- [ ] Schemas de Webhooks
- [ ] Schemas de Settlements
- [ ] Validações (CNPJ, URLs, etc.)

---

## 📦 Fase 3: Backend - Services

### 3.1 Criar Serviços

**Arquivos a criar:**

| Arquivo                         | Responsabilidade                  |
| ------------------------------- | --------------------------------- |
| `gateway_merchant_service.py`   | CRUD merchants, onboarding        |
| `gateway_api_key_service.py`    | Criar/revogar API keys            |
| `gateway_payment_service.py`    | Criar cobranças, atualizar status |
| `gateway_crypto_service.py`     | Gerar endereços crypto únicos     |
| `gateway_webhook_service.py`    | Enviar webhooks para merchants    |
| `gateway_settlement_service.py` | Processar saques                  |

### 3.2 Lógica Principal

```python
# gateway_payment_service.py

class GatewayPaymentService:

    async def create_payment(self, merchant_id, data) -> GatewayPayment:
        """Cria nova cobrança"""
        # 1. Validar merchant ativo
        # 2. Gerar payment_code único
        # 3. Calcular taxas
        # 4. Definir expiração (15-30 min)
        # 5. Salvar no banco
        # 6. Retornar checkout_url

    async def select_pix_method(self, payment_id) -> dict:
        """Cliente escolheu pagar com PIX"""
        # 1. Gerar cobrança PIX via BB API
        # 2. Atualizar payment com pix_txid, qrcode
        # 3. Retornar QR Code

    async def select_crypto_method(self, payment_id, crypto, network) -> dict:
        """Cliente escolheu pagar com crypto"""
        # 1. Gerar endereço único via HD derivation
        # 2. Buscar cotação atual
        # 3. Calcular crypto_amount
        # 4. Atualizar payment
        # 5. Retornar endereço + QR Code

    async def process_pix_webhook(self, txid) -> None:
        """Recebeu pagamento PIX (webhook BB)"""
        # 1. Encontrar payment pelo txid
        # 2. Atualizar status para paid
        # 3. Disparar webhook para merchant

    async def monitor_crypto_payments(self) -> None:
        """Background task - monitora pagamentos crypto"""
        # 1. Buscar payments crypto pendentes
        # 2. Para cada um, verificar balance do endereço
        # 3. Se recebeu valor correto, atualizar status
        # 4. Enviar webhook para merchant
```

### 3.3 Checklist Fase 3

- [ ] Criar `backend/app/services/gateway/` (pasta)
- [ ] Criar `gateway_merchant_service.py`
- [ ] Criar `gateway_api_key_service.py`
- [ ] Criar `gateway_payment_service.py`
- [ ] Criar `gateway_crypto_service.py`
- [ ] Criar `gateway_webhook_service.py`
- [ ] Criar `gateway_settlement_service.py`
- [ ] Implementar geração de endereços HD
- [ ] Implementar monitoramento crypto
- [ ] Testes unitários básicos

---

## 📦 Fase 4: Backend - Routers (API)

### 4.1 Estrutura de Rotas

```
/api/v1/gateway/
├── /merchants            # CRUD merchants (requer auth user)
├── /api-keys            # Gerenciar API keys
├── /payments            # API pública para merchants (auth via API key)
├── /checkout/{code}     # Checkout público (sem auth)
├── /webhooks            # Receber callbacks internos
└── /admin/              # Admin HOLD

/gateway/                # Rotas públicas (frontend checkout)
├── /pay/{code}          # Página de pagamento
└── /status/{code}       # Status do pagamento
```

### 4.2 Arquivos a Criar

| Arquivo                  | Descrição                         |
| ------------------------ | --------------------------------- |
| `gateway/merchant.py`    | CRUD de merchants                 |
| `gateway/api_keys.py`    | Gerenciar API keys                |
| `gateway/payments.py`    | API para criar/consultar payments |
| `gateway/checkout.py`    | Checkout público                  |
| `gateway/webhooks.py`    | Webhooks internos                 |
| `admin/gateway_admin.py` | Admin do gateway                  |

### 4.3 Autenticação

```python
# Middleware para autenticar via API Key

async def get_merchant_from_api_key(
    authorization: str = Header(...)
) -> GatewayMerchant:
    """
    Extrai e valida API key do header Authorization.
    Formato: Bearer wk_live_xxxxxxxxxxxx
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")

    api_key = authorization[7:]

    # Validar formato
    if not api_key.startswith(("wk_live_", "wk_test_")):
        raise HTTPException(401, "Invalid API key format")

    # Buscar no banco (por hash)
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    api_key_record = db.query(GatewayApiKey).filter(
        GatewayApiKey.key_hash == key_hash,
        GatewayApiKey.is_active == True
    ).first()

    if not api_key_record:
        raise HTTPException(401, "Invalid API key")

    # Atualizar last_used
    api_key_record.last_used_at = datetime.utcnow()
    db.commit()

    return api_key_record.merchant
```

### 4.4 Checklist Fase 4

- [ ] Criar `backend/app/routers/gateway/` (pasta)
- [ ] Criar `__init__.py` com router principal
- [ ] Criar `merchant.py` - CRUD merchants
- [ ] Criar `api_keys.py` - Gerenciar API keys
- [ ] Criar `payments.py` - API de pagamentos
- [ ] Criar `checkout.py` - Checkout público
- [ ] Criar `webhooks.py` - Webhooks internos
- [ ] Criar `admin/gateway_admin.py` - Admin
- [ ] Middleware de autenticação API Key
- [ ] Rate limiting por API key
- [ ] Registrar routers no `main.py`
- [ ] Testar endpoints com Swagger

---

## 📦 Fase 5: Backend - Integrações

### 5.1 Integrar com PIX BB

**Já temos:** `banco_brasil_service.py` com:

- `criar_cobranca_pix()` ✅
- Webhooks de confirmação ✅

**Precisamos:** Adaptar webhook para identificar payments do Gateway

### 5.2 Integrar com Crypto

**Já temos:** `system_blockchain_wallet_service.py` com:

- Derivação HD de endereços ✅
- 15 redes suportadas ✅

**Precisamos:**

- Derivação especial para payments do Gateway
- Background task para monitorar endereços
- Consolidação de fundos

### 5.3 Checklist Fase 5

- [ ] Adaptar `webhooks_bb.py` para Gateway payments
- [ ] Criar task de monitoramento crypto
- [ ] Implementar consolidação de fundos
- [ ] Testar fluxo completo PIX
- [ ] Testar fluxo completo Crypto

---

## 📦 Fase 6: Frontend - Dashboard Merchant

### 6.1 Páginas a Criar

```
Frontend/src/pages/gateway/
├── GatewayOnboardingPage.tsx    # Cadastro de merchant
├── GatewayDashboardPage.tsx     # Dashboard principal
├── GatewayPaymentsPage.tsx      # Lista de cobranças
├── GatewayPaymentDetailPage.tsx # Detalhe de uma cobrança
├── GatewayApiKeysPage.tsx       # Gerenciar API keys
├── GatewaySettingsPage.tsx      # Configurações (webhook, etc.)
├── GatewaySettlementsPage.tsx   # Histórico de saques
├── GatewayCheckoutPage.tsx      # Checkout público
└── GatewayDocsPage.tsx          # Documentação da API
```

### 6.2 Componentes

```
Frontend/src/components/gateway/
├── MerchantSidebar.tsx
├── PaymentCard.tsx
├── PaymentStatusBadge.tsx
├── CryptoQRCode.tsx
├── ApiKeyCard.tsx
├── WebhookTester.tsx
└── SettlementCard.tsx
```

### 6.3 Checklist Fase 6

- [ ] Criar estrutura de pastas
- [ ] `GatewayOnboardingPage.tsx`
- [ ] `GatewayDashboardPage.tsx`
- [ ] `GatewayPaymentsPage.tsx`
- [ ] `GatewayApiKeysPage.tsx`
- [ ] `GatewaySettingsPage.tsx`
- [ ] `GatewayCheckoutPage.tsx`
- [ ] Componentes auxiliares
- [ ] Serviço `gatewayService.ts`
- [ ] Rotas no React Router
- [ ] Testes de interface

---

## 📦 Fase 7: Frontend - Checkout Público

### 7.1 Página de Checkout

O checkout público será acessado pelo cliente final através de:

```
https://gateway.wolknow.com/pay/GP-2026-XXXXXX
```

### 7.2 Fluxo do Checkout

```
┌─────────────────┐
│ Escolher Método │
│  [PIX] [Crypto] │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│  PIX  │  │    Crypto    │
│QR Code│  │ Escolher moeda│
└───┬───┘  └──────┬───────┘
    │             │
    ▼             ▼
┌───────────────────────────┐
│   Aguardando Pagamento    │
│      Timer: 14:59         │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   ✓ Pagamento Confirmado  │
│   Redirecionando...       │
└───────────────────────────┘
```

### 7.3 Checklist Fase 7

- [ ] Design responsivo do checkout
- [ ] Integração com API
- [ ] QR Code PIX
- [ ] QR Code Crypto
- [ ] Timer de expiração
- [ ] Status em tempo real (polling/SSE)
- [ ] Página de sucesso
- [ ] Página de erro/expirado
- [ ] Tradução i18n

---

## 📦 Fase 8: Documentação e SDK

### 8.1 Documentação API

- [ ] Swagger/OpenAPI completo
- [ ] Página de documentação
- [ ] Exemplos de código
- [ ] Guia de início rápido

### 8.2 SDK/Plugins

- [ ] SDK JavaScript (npm)
- [ ] Widget embedável
- [ ] (Futuro) Plugin WooCommerce
- [ ] (Futuro) Plugin Shopify

---

## 🚦 Ordem de Execução

| Fase | Nome               | Dependência  | Tempo Estimado |
| ---- | ------------------ | ------------ | -------------- |
| 1    | Models/Database    | -            | 1-2 dias       |
| 2    | Schemas            | Fase 1       | 0.5 dia        |
| 3    | Services           | Fase 1, 2    | 2-3 dias       |
| 4    | Routers            | Fase 1, 2, 3 | 1-2 dias       |
| 5    | Integrações        | Fase 4       | 1-2 dias       |
| 6    | Frontend Dashboard | Fase 4       | 3-4 dias       |
| 7    | Frontend Checkout  | Fase 4       | 2-3 dias       |
| 8    | Docs/SDK           | Fase 4       | 2-3 dias       |

**Total estimado:** 2-3 semanas

---

## ✅ Próximo Passo

**Começar pela Fase 1:** Criar os models do banco de dados.

Quer que eu inicie a implementação da Fase 1?
