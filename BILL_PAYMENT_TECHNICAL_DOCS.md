# 📄 Bill Payment - Documentação Técnica

## Sistema de Pagamento de Boletos com Criptomoedas

**Versão:** 1.0.0  
**Data:** 14 de Janeiro de 2026  
**Status:** ✅ Implementado

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
4. [Backend - API](#backend---api)
5. [Frontend - Interface](#frontend---interface)
6. [Scanner de Código de Barras](#scanner-de-código-de-barras)
7. [Modelos de Dados](#modelos-de-dados)
8. [Serviços Integrados](#serviços-integrados)
9. [Taxas e Cálculos](#taxas-e-cálculos)
10. [Segurança](#segurança)
11. [Fluxo Administrativo](#fluxo-administrativo)

---

## 🎯 Visão Geral

O sistema de **Bill Payment** permite que usuários paguem boletos bancários brasileiros utilizando criptomoedas. O processo converte automaticamente o valor em cripto para BRL, debita da carteira do usuário e envia o boleto para liquidação pelo time financeiro.

### Características Principais

- ✅ Suporte a boletos bancários (Títulos) e contas de consumo (Convênios)
- ✅ Scanner de código de barras otimizado para iOS Safari
- ✅ Múltiplas criptomoedas suportadas (BTC, ETH, USDT, SOL, etc.)
- ✅ Cotação em tempo real via Price Aggregator
- ✅ Débito automático com freeze de saldo
- ✅ Validação externa de boletos (Gerencianet, BB, Asaas)
- ✅ Painel administrativo para liquidação

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ BillPayment │  │   History   │  │     BarcodeScanner         │  │
│  │    Page     │  │    Page     │  │  (iOS Safari Optimized)    │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┬───────────────┘  │
│         │                │                       │                   │
│         └────────────────┼───────────────────────┘                   │
│                          │                                           │
│                   ┌──────▼──────┐                                    │
│                   │ billPayment │                                    │
│                   │   Service   │                                    │
│                   └──────┬──────┘                                    │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    wolkpay_bill Router                         │ │
│  │  POST /validate | POST /quote | POST /confirm | GET /payments  │ │
│  │  GET /payment/{id} | POST /admin/pay | POST /admin/refund      │ │
│  └───────────────────────────┬────────────────────────────────────┘ │
│                              │                                       │
│  ┌───────────────────────────▼────────────────────────────────────┐ │
│  │                   WolkPayBillService                           │ │
│  │                                                                │ │
│  │  • validate_bill()      - Valida código de barras              │ │
│  │  • quote_bill_payment() - Calcula cotação e taxas              │ │
│  │  • confirm_bill_payment() - Confirma e debita cripto           │ │
│  │  • process_payment()    - Processa liquidação (admin)          │ │
│  │  • refund_payment()     - Estorna pagamento                    │ │
│  └───────────────────────────┬────────────────────────────────────┘ │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐         │
│  │   Price     │    │   Wallet     │    │  Bill Validation│         │
│  │ Aggregator  │    │  Balance     │    │    Service      │         │
│  │  Service    │    │  Service     │    │  (External API) │         │
│  └─────────────┘    └──────────────┘    └─────────────────┘         │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      DATABASE                                  │ │
│  │  • wolkpay_bill_payments (pagamentos)                          │ │
│  │  • wolkpay_bill_payment_logs (histórico de status)             │ │
│  │  • wallet_balances (saldos dos usuários)                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Funcionamento

### Fluxo Completo do Usuário

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DO USUÁRIO                                   │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ INÍCIO  │
    └────┬────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Abrir Scanner  │────▶│  Escanear ou    │
│  de Código      │     │  Digitar Código │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   POST /validate        │
                    │   Validar Código        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Código Válido?         │
                    └────────────┬────────────┘
                           │           │
                      SIM  │           │  NÃO
                           ▼           ▼
              ┌─────────────────┐  ┌──────────────┐
              │ Exibir Dados do │  │ Mostrar Erro │
              │ Boleto          │  │              │
              └────────┬────────┘  └──────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Selecionar      │
              │ Criptomoeda     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────────────┐
              │   POST /quote           │
              │   Calcular Cotação      │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Exibir:                 │
              │ • Valor BRL             │
              │ • Taxa Serviço (4.75%)  │
              │ • Taxa Rede (0.25%)     │
              │ • Total em Cripto       │
              │ • Cotação Atual         │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Confirmar Pagamento?    │
              └────────────┬────────────┘
                     │           │
                SIM  │           │  NÃO
                     ▼           ▼
        ┌─────────────────┐  ┌──────────────┐
        │ POST /confirm   │  │  Cancelar    │
        │ Confirmar       │  │              │
        └────────┬────────┘  └──────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │ 1. Verificar saldo          │
        │ 2. Freeze saldo (bloquear)  │
        │ 3. Transferir para Sistema  │
        │ 4. Criar registro pagamento │
        │ 5. Status = PENDING         │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Sucesso! Aguardando         │
        │ Processamento Financeiro    │
        └─────────────────────────────┘
```

### Fluxo Administrativo (Liquidação)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUXO ADMINISTRATIVO                                  │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Admin acessa    │
    │ painel          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ GET /admin/pending      │
    │ Listar pendentes        │
    └────────────┬────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ Para cada pagamento:    │
    │ • Ver código de barras  │
    │ • Ver valor BRL         │
    │ • Ver beneficiário      │
    └────────────┬────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ Liquidar boleto no      │
    │ Internet Banking        │
    └────────────┬────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ POST /admin/pay                 │
    │ {                               │
    │   payment_id: "...",            │
    │   bank_receipt: "comprovante",  │
    │   notes: "observações"          │
    │ }                               │
    └────────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ Status = COMPLETED      │
    │ Notificar usuário       │
    └─────────────────────────┘
```

---

## 🔌 Backend - API

### Endpoints Disponíveis

#### **POST /wolkpay/bill/validate**

Valida um código de barras de boleto.

**Request:**

```json
{
  "barcode": "23793.38128 60000.000003 00000.000400 1 84340000012345"
}
```

**Response:**

```json
{
  "valid": true,
  "bill_type": "titulo",
  "barcode": "23793381286000000000300000004001843400001234",
  "barcode_formatted": "23793.38128 60000.000003 00000.000400 1 84340000012345",
  "amount": 123.45,
  "due_date": "2026-01-20",
  "bank_code": "237",
  "bank_name": "Bradesco",
  "beneficiary": {
    "name": "Empresa XYZ LTDA",
    "document": "12.345.678/0001-90"
  },
  "is_payable": true,
  "message": "Boleto válido para pagamento"
}
```

#### **POST /wolkpay/bill/quote**

Calcula cotação para pagamento.

**Request:**

```json
{
  "barcode": "23793381286000000000300000004001843400001234",
  "crypto_symbol": "BTC"
}
```

**Response:**

```json
{
  "quote_id": "uuid-da-cotacao",
  "barcode": "23793381286000000000300000004001843400001234",
  "bill_amount_brl": 123.45,
  "service_fee_brl": 5.86,
  "service_fee_percent": 4.75,
  "network_fee_brl": 0.31,
  "network_fee_percent": 0.25,
  "total_brl": 129.62,
  "crypto_symbol": "BTC",
  "crypto_amount": 0.00002593,
  "crypto_price_brl": 500000.0,
  "user_balance": 0.001,
  "has_sufficient_balance": true,
  "expires_at": "2026-01-14T12:05:00Z",
  "valid_for_seconds": 300
}
```

#### **POST /wolkpay/bill/confirm**

Confirma o pagamento e debita a cripto.

**Request:**

```json
{
  "quote_id": "uuid-da-cotacao",
  "barcode": "23793381286000000000300000004001843400001234",
  "crypto_symbol": "BTC",
  "crypto_amount": 0.00002593
}
```

**Response:**

```json
{
  "success": true,
  "payment_id": "uuid-do-pagamento",
  "status": "pending",
  "message": "Pagamento confirmado! Aguardando processamento.",
  "details": {
    "bill_amount_brl": 123.45,
    "total_charged_brl": 129.62,
    "crypto_debited": 0.00002593,
    "crypto_symbol": "BTC"
  }
}
```

#### **GET /wolkpay/bill/payments**

Lista pagamentos do usuário.

#### **GET /wolkpay/bill/payment/{payment_id}**

Detalhes de um pagamento específico.

#### **GET /wolkpay/bill/admin/pending**

Lista pagamentos pendentes (admin).

#### **POST /wolkpay/bill/admin/pay**

Marca pagamento como pago (admin).

#### **POST /wolkpay/bill/admin/refund**

Estorna um pagamento (admin).

---

## 💻 Frontend - Interface

### Estrutura de Arquivos

```
Frontend/src/
├── pages/
│   └── billpayment/
│       ├── BillPaymentPage.tsx      # Página principal (fluxo de pagamento)
│       └── BillPaymentHistoryPage.tsx # Histórico de pagamentos
├── components/
│   └── scanner/
│       └── BarcodeScanner.tsx        # Scanner de código de barras
├── services/
│   └── billPayment.ts                # Cliente API
└── locales/
    ├── pt-BR/translation.json        # Traduções PT-BR
    └── en-US/translation.json        # Traduções EN-US
```

### Estados da Página Principal

```typescript
type PaymentStep =
  | "input" // Entrada do código
  | "validating" // Validando código
  | "quote" // Exibindo cotação
  | "confirming" // Confirmando pagamento
  | "success" // Sucesso
  | "error"; // Erro
```

### Componentes Principais

#### BillPaymentPage.tsx (~850 linhas)

- Gerencia todo o fluxo de pagamento
- Multi-step form com animações
- Integração com scanner
- Seleção de criptomoeda
- Exibição de cotação com countdown

#### BillPaymentHistoryPage.tsx

- Lista de pagamentos do usuário
- Filtros por status
- Detalhes de cada pagamento

---

## 📷 Scanner de Código de Barras

### Tecnologia

- **Biblioteca:** `@zxing/library` (ZXing - Zebra Crossing)
- **Formatos Suportados:**
  - ITF (Interleaved 2 of 5) - Boletos bancários
  - CODE_128
  - EAN_13
  - QR_CODE (PIX)
  - CODE_39
  - CODABAR

### Otimizações para iOS Safari

```typescript
// Detecção de iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Constraints otimizadas
const constraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: isIOS ? { ideal: 1280, max: 1920 } : { ideal: 1280 },
    height: isIOS ? { ideal: 720, max: 1080 } : { ideal: 720 },
  }
}

// Atributos do video element para Safari
<video
  playsInline           // Obrigatório para iOS
  muted
  autoPlay
  webkit-playsinline="true"
/>
```

### Fluxo do Scanner

```
1. Usuário abre scanner
2. Solicita permissão de câmera (getUserMedia)
3. Stream de vídeo inicializado
4. Loop de scanning a cada 250ms
5. Código detectado → Validação (44-48 dígitos)
6. Feedback visual (2 segundos)
7. Vibração de sucesso
8. Retorna código para página
```

### Tratamento de Erros

| Erro                 | Causa                     | Solução                |
| -------------------- | ------------------------- | ---------------------- |
| NotAllowedError      | Permissão negada          | Orientar configurações |
| NotFoundError        | Sem câmera                | Mensagem informativa   |
| NotReadableError     | Câmera em uso             | Fechar outros apps     |
| OverconstrainedError | Configuração incompatível | Trocar câmera          |
| Timeout              | Câmera não responde       | Retry automático       |

---

## 🗄️ Modelos de Dados

### Tabela: wolkpay_bill_payments

```sql
CREATE TABLE wolkpay_bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Dados do boleto
    barcode VARCHAR(100) NOT NULL,
    barcode_formatted VARCHAR(150),
    bill_type VARCHAR(20) NOT NULL,  -- 'titulo' ou 'convenio'
    bill_amount DECIMAL(15,2) NOT NULL,
    due_date DATE,

    -- Beneficiário
    beneficiary_name VARCHAR(255),
    beneficiary_document VARCHAR(20),
    bank_code VARCHAR(10),
    bank_name VARCHAR(100),

    -- Taxas
    service_fee DECIMAL(15,2) NOT NULL,
    network_fee DECIMAL(15,2) NOT NULL,
    total_brl DECIMAL(15,2) NOT NULL,

    -- Cripto
    crypto_symbol VARCHAR(10) NOT NULL,
    crypto_amount DECIMAL(18,8) NOT NULL,
    crypto_price_brl DECIMAL(15,2) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, processing, completed, failed, refunded, expired

    -- Processamento
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES users(id),
    bank_receipt TEXT,
    admin_notes TEXT,
    failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: wolkpay_bill_payment_logs

```sql
CREATE TABLE wolkpay_bill_payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES wolkpay_bill_payments(id),
    status VARCHAR(20) NOT NULL,
    message TEXT,
    metadata JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enum: BillPaymentStatus

```python
class BillPaymentStatus(str, Enum):
    PENDING = "pending"       # Aguardando processamento
    PROCESSING = "processing" # Em processamento
    COMPLETED = "completed"   # Pago com sucesso
    FAILED = "failed"         # Falhou
    REFUNDED = "refunded"     # Estornado
    EXPIRED = "expired"       # Expirado
```

---

## 🔗 Serviços Integrados

### 1. Price Aggregator Service

Obtém cotações em tempo real de múltiplas exchanges.

```python
from app.services.price_aggregator import PriceAggregatorService

price_service = PriceAggregatorService()
btc_price = await price_service.get_price("BTC", "BRL")
# Retorna: 500000.00
```

### 2. Wallet Balance Service

Gerencia saldos, freeze e transferências.

```python
from app.services.wallet_balance_service import WalletBalanceService

balance_service = WalletBalanceService(db)

# Verificar saldo disponível
balance = await balance_service.get_available_balance(user_id, "BTC")

# Bloquear saldo (freeze)
await balance_service.freeze_balance(user_id, "BTC", amount, reason)

# Transferir para carteira do sistema
await balance_service.transfer_balance(
    from_user_id=user_id,
    to_user_id=SYSTEM_WALLET_ID,
    symbol="BTC",
    amount=amount
)
```

### 3. Bill Validation Service

Valida boletos via APIs externas.

```python
from app.services.bill_validation_service import BillValidationService

validation_service = BillValidationService()
result = await validation_service.validate_bill(barcode)

# Retorna:
# {
#   "valid": True,
#   "beneficiary_name": "Empresa XYZ",
#   "beneficiary_document": "12.345.678/0001-90",
#   "amount": 123.45,
#   "due_date": "2026-01-20",
#   "is_payable": True
# }
```

#### Provedores Suportados:

- **Gerencianet** (Principal)
- **Banco do Brasil**
- **Asaas**
- **Mock** (Desenvolvimento)

---

## 💰 Taxas e Cálculos

### Estrutura de Taxas

| Taxa      | Percentual | Descrição                        |
| --------- | ---------- | -------------------------------- |
| Serviço   | 4.75%      | Taxa da plataforma               |
| Rede      | 0.25%      | Taxa de processamento blockchain |
| **Total** | **5.00%**  | Taxa total                       |

### Fórmula de Cálculo

```python
# Valores
bill_amount = 100.00  # Valor do boleto em BRL
service_fee_rate = 0.0475  # 4.75%
network_fee_rate = 0.0025  # 0.25%

# Cálculo das taxas
service_fee = bill_amount * service_fee_rate  # 4.75
network_fee = bill_amount * network_fee_rate  # 0.25
total_brl = bill_amount + service_fee + network_fee  # 105.00

# Conversão para cripto
crypto_price = 500000.00  # Preço do BTC em BRL
crypto_amount = total_brl / crypto_price  # 0.00021 BTC
```

### Exemplo Prático

```
Boleto: R$ 500,00
├── Taxa Serviço (4.75%): R$ 23,75
├── Taxa Rede (0.25%): R$ 1,25
└── Total: R$ 525,00

Cotação BTC: R$ 500.000,00
Valor em BTC: 0.00105 BTC
```

---

## 🔒 Segurança

### Validações Implementadas

1. **Código de Barras**

   - Validação de comprimento (44-48 dígitos)
   - Validação de dígitos verificadores
   - Detecção de tipo (título/convênio)
   - Validação externa via API

2. **Saldo do Usuário**

   - Verificação de saldo disponível
   - Freeze (bloqueio) antes da transferência
   - Transferência atômica para carteira do sistema

3. **Cotação**

   - Expiração em 5 minutos
   - Verificação de preço no momento da confirmação
   - Tolerância de 2% na variação de preço

4. **Autenticação**
   - JWT Token obrigatório
   - Verificação de usuário ativo
   - Rate limiting por usuário

### Carteira do Sistema

```python
SYSTEM_BLOCKCHAIN_WALLET_ID = "545473df-0dd4-4bfa-a43f-06721a43af63"
```

Todas as criptos debitadas são transferidas para esta carteira controlada pela empresa.

---

## 👨‍💼 Fluxo Administrativo

### Painel de Administração

1. **Listar Pendentes**

   - `GET /wolkpay/bill/admin/pending`
   - Exibe todos os pagamentos aguardando liquidação

2. **Processar Pagamento**

   - Admin acessa Internet Banking
   - Paga o boleto manualmente
   - Registra comprovante no sistema
   - `POST /wolkpay/bill/admin/pay`

3. **Estornar Pagamento**
   - Em caso de falha na liquidação
   - `POST /wolkpay/bill/admin/refund`
   - Cripto é devolvida ao usuário

### Status Flow

```
PENDING ─────┬────▶ PROCESSING ────┬────▶ COMPLETED
             │                     │
             │                     └────▶ FAILED
             │
             └────▶ EXPIRED

COMPLETED ───────▶ REFUNDED (manual)
```

---

## 📱 Experiência do Usuário

### Tempo Médio do Fluxo

| Etapa           | Tempo       |
| --------------- | ----------- |
| Escanear código | 2-5 seg     |
| Validação       | 1-2 seg     |
| Cotação         | 1 seg       |
| Confirmação     | 1-2 seg     |
| **Total**       | **~10 seg** |

### Feedback Visual

- ✅ Animações de loading
- ✅ Vibração no scan
- ✅ Countdown da cotação
- ✅ Mensagens de status claras
- ✅ Histórico detalhado

---

## 🚀 Configuração de Ambiente

### Variáveis de Ambiente (.env)

```bash
# APIs de Validação de Boletos
GERENCIANET_CLIENT_ID=seu_client_id
GERENCIANET_CLIENT_SECRET=seu_client_secret
GERENCIANET_SANDBOX=false

ASAAS_API_KEY=seu_api_key
ASAAS_SANDBOX=false

BB_APP_KEY=seu_app_key
BB_ACCESS_TOKEN=seu_access_token
BB_SANDBOX=false

# Taxas
BILL_PAYMENT_SERVICE_FEE=0.0475
BILL_PAYMENT_NETWORK_FEE=0.0025

# Carteira do Sistema
SYSTEM_BLOCKCHAIN_WALLET_ID=545473df-0dd4-4bfa-a43f-06721a43af63
```

---

## 📊 Métricas e Logs

### Logs de Pagamento

Cada mudança de status é registrada em `wolkpay_bill_payment_logs`:

```json
{
  "payment_id": "uuid",
  "status": "completed",
  "message": "Boleto liquidado com sucesso",
  "metadata": {
    "bank_receipt": "comprovante_123",
    "processed_by": "admin_uuid"
  },
  "created_at": "2026-01-14T12:30:00Z"
}
```

### Métricas Sugeridas

- Taxa de sucesso de pagamentos
- Tempo médio de liquidação
- Volume total processado (BRL/Cripto)
- Distribuição por criptomoeda

---

## 🔮 Roadmap Futuro

1. **Fase 2 - Automação**

   - Integração direta com APIs de pagamento de boletos
   - Liquidação automática sem intervenção manual

2. **Fase 3 - Novos Tipos**

   - Pagamento de PIX com cripto
   - Recarga de celular
   - Pagamento de tributos (DARF, GPS)

3. **Fase 4 - Otimizações**
   - Cache de cotações
   - Batching de pagamentos
   - Relatórios avançados

---

## 📞 Suporte

Para dúvidas técnicas sobre a implementação:

- Código Backend: `/backend/app/services/wolkpay_bill_service.py`
- Código Frontend: `/Frontend/src/pages/billpayment/`
- Scanner: `/Frontend/src/components/scanner/BarcodeScanner.tsx`

---

**Documento criado em:** 14 de Janeiro de 2026  
**Última atualização:** 14 de Janeiro de 2026  
**Versão:** 1.0.0
