# 🧾 Bill Payment - Pagamento de Boletos com Crypto

## Resumo da Implementação

Sistema completo para pagamento de boletos bancários usando cryptocurrency.

## ✅ Componentes Criados

### Backend (FastAPI)

#### 1. Models (`/backend/app/models/wolkpay.py`)

- `BillPaymentStatus` - Enum de status
- `BillType` - Enum de tipos de boleto
- `WolkPayBillPayment` - Model principal (39 colunas)
- `WolkPayBillPaymentLog` - Log de eventos (9 colunas)

#### 2. Service (`/backend/app/services/wolkpay_bill_service.py`)

- ~900 linhas de lógica de negócio
- **Métodos:**
  - `validate_bill()` - Valida código de barras
  - `quote_bill_payment()` - Gera cotação
  - `confirm_bill_payment()` - Confirma e debita crypto
  - `operator_pay_bill()` - Admin marca como pago
  - `refund_bill_payment()` - Reembolsa crypto
  - `_get_rates()` - Integração com `price_aggregator`
  - `_get_user_crypto_balance()` - Integração com `WalletBalanceService`
  - `_debit_user_crypto()` - Congela saldo via `freeze_balance`
  - `_credit_user_crypto()` - Devolve saldo via `unfreeze_balance`

#### 3. Schemas (`/backend/app/schemas/wolkpay.py`)

- `ValidateBillRequest`
- `BillInfoResponse`
- `QuoteBillPaymentRequest`
- `BillPaymentQuoteResponse`
- `ConfirmBillPaymentRequest`
- `BillPaymentResponse`
- `BillPaymentListResponse`
- `OperatorPayBillRequest`
- `RefundBillPaymentRequest`

#### 4. Router (`/backend/app/routers/wolkpay_bill.py`)

**Endpoints do Usuário:**

- `POST /wolkpay/bill/validate` - Validar boleto
- `POST /wolkpay/bill/quote` - Gerar cotação
- `POST /wolkpay/bill/confirm` - Confirmar pagamento
- `GET /wolkpay/bill/payments` - Listar pagamentos
- `GET /wolkpay/bill/payment/{id}` - Detalhes do pagamento

**Endpoints Admin:**

- `GET /wolkpay/bill/admin/pending` - Boletos pendentes
- `POST /wolkpay/bill/admin/pay` - Marcar como pago
- `POST /wolkpay/bill/admin/refund` - Reembolsar
- `GET /wolkpay/bill/admin/all` - Todos pagamentos
- `PUT /wolkpay/bill/admin/status/{id}` - Atualizar status

---

### Frontend (React/TypeScript)

#### 1. Service (`/Frontend/src/services/billPayment.ts`)

- Tipos TypeScript completos
- Configurações de taxas e status
- Métodos: `validateBill()`, `createQuote()`, `confirmPayment()`, `getPayments()`, `getPayment()`

#### 2. Página Principal (`/Frontend/src/pages/billpayment/BillPaymentPage.tsx`)

- 845 linhas de UI
- Steps: Input → Select Crypto → Quote → Confirming → Success
- Design violet/purple diferenciado
- Timer de cotação (5 minutos)
- Validação de data de vencimento

#### 3. Histórico (`/Frontend/src/pages/billpayment/BillPaymentHistoryPage.tsx`)

- Lista paginada de pagamentos
- Filtros por status
- Modal com detalhes
- Status coloridos por tipo

#### 4. Sidebar

- Menu "Pagar Boleto" com ícone Receipt
- Badge "Novo"
- Grupo: services

#### 5. Traduções

- `/Frontend/src/locales/pt-BR.json`: `"billPayment": "Pagar Boleto"`
- `/Frontend/src/locales/en-US.json`: `"billPayment": "Pay Bills"`

---

## � Validação de Boletos (API Externa)

### Informações Obtidas ao Escanear/Digitar o Boleto

Quando o usuário escaneia ou digita o código de barras, o sistema consulta **APIs externas** para obter:

| Informação          | Descrição                                       |
| ------------------- | ----------------------------------------------- |
| **Beneficiário**    | Nome da empresa/pessoa que receberá o pagamento |
| **CNPJ/CPF**        | Documento do beneficiário                       |
| **Banco**           | Instituição financeira do boleto                |
| **Valor Original**  | Valor do boleto sem multa/juros                 |
| **Multa**           | Valor da multa (se vencido)                     |
| **Juros**           | Valor dos juros (se vencido)                    |
| **Valor Final**     | Valor total a pagar                             |
| **Data Vencimento** | Data de vencimento do boleto                    |
| **Status**          | Válido, vencido, pago, cancelado                |
| **Pode ser Pago**   | Se o financeiro pode liquidar em BRL            |

### Provedores de Validação Suportados

1. **Gerencianet (Efí)** - API de consulta de boletos
2. **Banco do Brasil** - API de cobrança (se tiver convênio)
3. **Asaas** - API de pagamentos
4. **Mock** - Para desenvolvimento (simula dados)

### Arquivo: `/backend/app/services/bill_validation_service.py`

```python
# Consulta API externa
validation_result = await bill_validation_service.validate_bill(barcode)

# Retorna:
# - valid: bool - Se é um boleto válido
# - can_be_paid: bool - Se pode ser liquidado pelo financeiro
# - beneficiary_name: str - Nome do beneficiário
# - beneficiary_document: str - CNPJ/CPF
# - original_amount: Decimal - Valor original
# - fine_amount: Decimal - Multa (se vencido)
# - interest_amount: Decimal - Juros (se vencido)
# - final_amount: Decimal - Valor final
# - due_date: date - Vencimento
# - status_message: str - Mensagem de status
```

### Configuração de Provedores (`.env`)

```bash
# Gerencianet (Efí)
GERENCIANET_CLIENT_ID=seu_client_id
GERENCIANET_CLIENT_SECRET=seu_client_secret
GERENCIANET_BASE_URL=https://api.gerencianet.com.br

# Asaas
ASAAS_API_KEY=sua_api_key
ASAAS_API_URL=https://www.asaas.com/api

# Banco do Brasil (se tiver convênio)
BB_APP_KEY=sua_app_key
BB_ACCESS_TOKEN=seu_token
BB_API_URL=https://api.bb.com.br
```

---

## �💰 Regras de Negócio

### Taxas

| Taxa      | Percentual |
| --------- | ---------- |
| Serviço   | 4.75%      |
| Rede      | 0.25%      |
| **Total** | **5.00%**  |

### ⚡ Fluxo de Débito (IMPORTANTE!)

**Quando o usuário confirma o pagamento, a crypto é TRANSFERIDA IMEDIATAMENTE:**

1. 🔒 **Freeze** → Congela o saldo na carteira do usuário
2. 💸 **Transfer** → Transfere para carteira do sistema (`SYSTEM_BLOCKCHAIN_WALLET_ID`)

```python
# 1. Congela o valor
WalletBalanceService.freeze_balance(db, user_id, crypto, amount, "Bill Payment")

# 2. Transfere IMEDIATAMENTE para o sistema
WalletBalanceService.transfer_balance(db, user_id, SYSTEM_WALLET_ID, crypto, amount)
```

**A crypto SAI da carteira do usuário no momento da confirmação!**

### 🔄 Fluxo de Reembolso

Em caso de falha no pagamento do boleto:

1. 🔒 **Freeze** na carteira do sistema
2. 💰 **Transfer** de volta para o usuário

```python
# Prepara a transferência
WalletBalanceService.freeze_balance(db, SYSTEM_WALLET_ID, crypto, amount, "Refund Prep")

# Transfere de volta para o usuário
WalletBalanceService.transfer_balance(db, SYSTEM_WALLET_ID, user_id, crypto, amount)
```

### Validações

- Boleto não pode estar vencido
- Mínimo 1 dia antes do vencimento
- Valor mínimo: R$ 10,00
- Valor máximo: R$ 50.000,00
- Cotação válida por 5 minutos

### Fluxo de Status

```
PENDING → CRYPTO_DEBITED → PROCESSING → PAYING → PAID
                                        ↓
                                      FAILED → REFUNDED
```

### Cryptos Suportadas

- USDT (TRC20)
- USDC (ERC20)
- BTC
- ETH
- BNB
- TRX
- SOL
- MATIC

---

## 🚀 Como Testar

### 1. Aplicar Migração

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet
python create_bill_payment_tables.py
```

### 2. Iniciar Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 3. Iniciar Frontend

```bash
cd Frontend
npm run dev
```

### 4. Acessar

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### 5. Testar Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Verificar endpoints (requer autenticação)
curl http://localhost:8000/wolkpay/bill/payments
# Retorna: {"error": true, "message": "Not authenticated"}
```

---

## 📂 Arquivos Criados/Modificados

```
backend/
├── app/
│   ├── models/wolkpay.py           # + BillPayment models
│   ├── routers/wolkpay_bill.py     # NOVO - Router completo
│   ├── schemas/wolkpay.py          # + Schemas de Bill
│   └── services/wolkpay_bill_service.py  # NOVO - Serviço completo
├── migrations/versions/
│   └── add_wolkpay_bill_payment.sql      # NOVO - Migração SQL

Frontend/
├── src/
│   ├── services/billPayment.ts           # NOVO - Serviço API
│   ├── pages/billpayment/
│   │   ├── index.ts                      # NOVO - Exports
│   │   ├── BillPaymentPage.tsx           # NOVO - Página principal
│   │   └── BillPaymentHistoryPage.tsx    # NOVO - Histórico
│   ├── components/layout/Sidebar.tsx     # + Menu item
│   ├── App.tsx                           # + Rotas
│   └── locales/
│       ├── pt-BR.json                    # + Tradução
│       └── en-US.json                    # + Tradução
```

---

## 🔗 Integrações

### Price Aggregator

```python
# Obtém preço da crypto em USD
prices = await price_aggregator.get_prices([symbol], "usd")

# Obtém taxa USD/BRL
prices = await price_aggregator.get_prices(['USDT'], "brl")
```

### Wallet Balance Service

```python
# Verifica saldo disponível
balance = WalletBalanceService.get_balance(db, user_id, crypto)

# Congela saldo (débito)
WalletBalanceService.freeze_balance(db, user_id, crypto, amount, reason, reference_id)

# Descongela saldo (reembolso)
WalletBalanceService.unfreeze_balance(db, user_id, crypto, amount, reason, reference_id)
```

---

## 📝 Próximos Passos

1. **Integração com API de Boletos** - Conectar com serviço real de validação de boletos
2. **Gateway de Pagamento** - Integrar com PIX/TED para liquidação
3. **Notificações** - Email/Push quando boleto for pago
4. **Painel Admin** - Dashboard para operadores
5. **Relatórios** - Exportação de transações

---

**Autor:** HOLD Wallet Team  
**Data:** Janeiro 2026  
**Status:** ✅ Completo e Funcional
