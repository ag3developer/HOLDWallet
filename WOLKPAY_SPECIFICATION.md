# 🚀 WOLKPAY - Especificação do Sistema

## 📋 VISÃO GERAL

**WolkPay** é um serviço que permite usuários da WolkNow gerarem faturas de compra de criptomoedas que podem ser pagas por **terceiros**. O sistema garante **compliance** com as regulamentações financeiras, coletando dados completos do pagador para evitar lavagem de dinheiro.

---

## 🎯 OBJETIVO

Permitir que um usuário WolkNow:

1. Crie uma fatura de compra de crypto
2. Compartilhe essa fatura com um terceiro (cliente, familiar, etc.)
3. O terceiro pague via PIX
4. O usuário original receba as criptomoedas

---

## 👥 ATORES DO SISTEMA

| Ator              | Descrição                                           |
| ----------------- | --------------------------------------------------- |
| **Beneficiário**  | Usuário WolkNow que vai RECEBER as criptomoedas     |
| **Pagador**       | Terceira pessoa que vai PAGAR a fatura via PIX      |
| **Admin**         | Equipe WolkNow que aprova pagamentos e envia crypto |
| **Financeiro**    | Equipe que verifica depósitos bancários             |
| **Contabilidade** | Recebe relatórios de taxas e fees para declaração   |

---

## 💰 ESTRUTURA DE TAXAS

| Taxa                | Valor | Descrição                              |
| ------------------- | ----- | -------------------------------------- |
| **Taxa de Serviço** | 3,65% | Comissão da WolkNow pela intermediação |
| **Taxa de Rede**    | 0,15% | Custo de transação blockchain          |
| **Total de Taxas**  | 3,80% | Soma das taxas                         |

### Exemplo de Cálculo:

```
Compra: 100 USDT
Cotação USD/BRL: R$ 6,00
Valor base: R$ 600,00
Taxa de serviço (3,65%): R$ 21,90
Taxa de rede (0,15%): R$ 0,90
TOTAL A PAGAR: R$ 622,80
```

---

## 🔄 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO WOLKPAY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ETAPA 1: CRIAÇÃO DA FATURA                        │   │
│  │                    (Beneficiário - Usuário WolkNow)                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  1. Beneficiário acessa WolkPay (logado na WolkNow)                         │
│                         ↓                                                    │
│  2. Seleciona criptomoeda (USDT, BTC, ETH, etc.)                            │
│                         ↓                                                    │
│  3. Digita quantidade desejada (ex: 100 USDT)                               │
│                         ↓                                                    │
│  4. Sistema calcula:                                                         │
│     - Valor em BRL (cotação atual)                                          │
│     - Taxa de serviço (3,65%)                                               │
│     - Taxa de rede (0,15%)                                                  │
│     - TOTAL A PAGAR                                                         │
│                         ↓                                                    │
│  5. Beneficiário clica "Gerar Fatura"                                       │
│                         ↓                                                    │
│  6. Sistema gera fatura com:                                                │
│     - ID único da fatura                                                    │
│     - Link público do checkout                                              │
│     - QR Code do link                                                       │
│     - Validade (15 minutos)                                                 │
│                         ↓                                                    │
│  7. Beneficiário compartilha link via WhatsApp/Email/etc.                   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ETAPA 2: CHECKOUT                                  │   │
│  │                    (Pagador - Terceira Pessoa)                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  8. Pagador abre o link do checkout (página pública)                        │
│                         ↓                                                    │
│  9. Visualiza detalhes da fatura:                                           │
│     - Beneficiário (nome parcial por privacidade)                           │
│     - Criptomoeda e quantidade                                              │
│     - Valor total a pagar                                                   │
│                         ↓                                                    │
│  10. FORMULÁRIO ETAPA 1 - Dados do Pagador:                                 │
│      ┌─────────────────────────────────────────────────────────────────┐    │
│      │ Tipo de Pessoa: ( ) Pessoa Física  ( ) Pessoa Jurídica         │    │
│      │                                                                 │    │
│      │ [Se PF]                        [Se PJ]                          │    │
│      │ - Nome Completo                - Razão Social                   │    │
│      │ - CPF                          - CNPJ                           │    │
│      │ - Data de Nascimento           - Nome Fantasia                  │    │
│      │ - Telefone                     - Inscrição Estadual             │    │
│      │ - E-mail                       - Telefone Comercial             │    │
│      │                                - E-mail Comercial               │    │
│      │                                - Nome do Responsável            │    │
│      │                                - CPF do Responsável             │    │
│      └─────────────────────────────────────────────────────────────────┘    │
│                         ↓                                                    │
│  11. FORMULÁRIO ETAPA 2 - Endereço:                                         │
│      ┌─────────────────────────────────────────────────────────────────┐    │
│      │ - CEP (auto-preenche)                                           │    │
│      │ - Logradouro                                                    │    │
│      │ - Número                                                        │    │
│      │ - Complemento                                                   │    │
│      │ - Bairro                                                        │    │
│      │ - Cidade                                                        │    │
│      │ - Estado (UF)                                                   │    │
│      └─────────────────────────────────────────────────────────────────┘    │
│                         ↓                                                    │
│  12. FORMULÁRIO ETAPA 3 - Termos e Aceites:                                 │
│      ┌─────────────────────────────────────────────────────────────────┐    │
│      │ ☐ Declaro que estou ciente que este pagamento é para           │    │
│      │   aquisição de CRIPTOMOEDAS que serão enviadas para            │    │
│      │   [Nome do Beneficiário].                                       │    │
│      │                                                                 │    │
│      │ ☐ Declaro que os recursos utilizados neste pagamento são       │    │
│      │   de origem lícita e não provêm de atividades ilegais.         │    │
│      │                                                                 │    │
│      │ ☐ Estou ciente que a HOLD DIGITAL ASSETS LTDA é apenas         │    │
│      │   intermediária desta operação e que as criptomoedas           │    │
│      │   serão creditadas na carteira do beneficiário.                │    │
│      │                                                                 │    │
│      │ ☐ Declaro que li e concordo com os Termos de Uso e             │    │
│      │   Política de Privacidade da WolkNow.                          │    │
│      │                                                                 │    │
│      │ ☐ Autorizo o armazenamento dos meus dados para fins de         │    │
│      │   compliance e eventuais auditorias fiscais.                   │    │
│      │                                                                 │    │
│      │ ☐ Declaro que todas as informações prestadas são               │    │
│      │   verdadeiras e assumo responsabilidade legal por elas.        │    │
│      └─────────────────────────────────────────────────────────────────┘    │
│                         ↓                                                    │
│  13. Pagador clica "PAGAR AGORA"                                            │
│                         ↓                                                    │
│  14. Sistema gera QR Code PIX (conta da HOLD DIGITAL ASSETS)                │
│                         ↓                                                    │
│  15. Pagador escaneia e paga                                                │
│                         ↓                                                    │
│  16. Sistema salva toda a operação no banco de dados                        │
│      Status: AGUARDANDO_CONFIRMACAO                                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ETAPA 3: APROVAÇÃO                                 │   │
│  │                    (Admin/Financeiro WolkNow)                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  17. Financeiro verifica depósito na conta bancária                         │
│                         ↓                                                    │
│  18. Admin acessa painel WolkPay no Admin Dashboard                         │
│                         ↓                                                    │
│  19. Visualiza operação pendente com todos os dados:                        │
│      - Dados do Beneficiário                                                │
│      - Dados do Pagador (completos)                                         │
│      - Valor, taxas, crypto                                                 │
│      - Comprovante de aceite dos termos                                     │
│                         ↓                                                    │
│  20. Admin aprova a operação                                                │
│                         ↓                                                    │
│  21. Sistema envia crypto para carteira do Beneficiário                     │
│                         ↓                                                    │
│  22. Status: COMPLETED                                                       │
│                         ↓                                                    │
│  23. Notifica Beneficiário e Pagador por e-mail                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ETAPA 4: RELATÓRIOS                                │   │
│  │                    (Contabilidade/Receita Federal)                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  24. Sistema gera relatórios com:                                           │
│      - Todas as operações do período                                        │
│      - Taxas de serviço arrecadadas                                         │
│      - Taxas de rede cobradas                                               │
│      - Dados fiscais para declaração                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 MODELO DE DADOS

### Tabela: `wolkpay_invoices` (Faturas)

| Campo               | Tipo      | Descrição                                                                |
| ------------------- | --------- | ------------------------------------------------------------------------ |
| id                  | UUID      | ID único da fatura                                                       |
| invoice_number      | VARCHAR   | Número legível (WKPAY-2026-0001)                                         |
| beneficiary_id      | UUID      | FK → users (quem recebe crypto)                                          |
| crypto_currency     | VARCHAR   | USDT, BTC, ETH, etc.                                                     |
| crypto_amount       | DECIMAL   | Quantidade de crypto                                                     |
| usd_rate            | DECIMAL   | Cotação USD no momento                                                   |
| brl_rate            | DECIMAL   | Cotação BRL no momento                                                   |
| base_amount_brl     | DECIMAL   | Valor base em BRL                                                        |
| service_fee_percent | DECIMAL   | Taxa de serviço (3.65)                                                   |
| service_fee_brl     | DECIMAL   | Valor da taxa de serviço                                                 |
| network_fee_percent | DECIMAL   | Taxa de rede (0.15)                                                      |
| network_fee_brl     | DECIMAL   | Valor da taxa de rede                                                    |
| total_amount_brl    | DECIMAL   | Total a pagar                                                            |
| checkout_url        | VARCHAR   | URL pública do checkout                                                  |
| checkout_token      | VARCHAR   | Token único para acesso                                                  |
| status              | ENUM      | PENDING, AWAITING_PAYMENT, PAID, APPROVED, COMPLETED, EXPIRED, CANCELLED |
| expires_at          | TIMESTAMP | Data de expiração (15 min)                                               |
| created_at          | TIMESTAMP | Data de criação                                                          |
| updated_at          | TIMESTAMP | Última atualização                                                       |

### Tabela: `wolkpay_payers` (Pagadores)

| Campo              | Tipo      | Descrição                                  |
| ------------------ | --------- | ------------------------------------------ |
| id                 | UUID      | ID único                                   |
| invoice_id         | UUID      | FK → wolkpay_invoices                      |
| person_type        | ENUM      | PF (Pessoa Física) ou PJ (Pessoa Jurídica) |
| **Campos PF:**     |           |                                            |
| full_name          | VARCHAR   | Nome completo                              |
| cpf                | VARCHAR   | CPF (criptografado)                        |
| birth_date         | DATE      | Data de nascimento                         |
| phone              | VARCHAR   | Telefone                                   |
| email              | VARCHAR   | E-mail                                     |
| **Campos PJ:**     |           |                                            |
| company_name       | VARCHAR   | Razão Social                               |
| cnpj               | VARCHAR   | CNPJ (criptografado)                       |
| trade_name         | VARCHAR   | Nome Fantasia                              |
| state_registration | VARCHAR   | Inscrição Estadual                         |
| business_phone     | VARCHAR   | Telefone comercial                         |
| business_email     | VARCHAR   | E-mail comercial                           |
| responsible_name   | VARCHAR   | Nome do responsável                        |
| responsible_cpf    | VARCHAR   | CPF do responsável                         |
| **Endereço:**      |           |                                            |
| zip_code           | VARCHAR   | CEP                                        |
| street             | VARCHAR   | Logradouro                                 |
| number             | VARCHAR   | Número                                     |
| complement         | VARCHAR   | Complemento                                |
| neighborhood       | VARCHAR   | Bairro                                     |
| city               | VARCHAR   | Cidade                                     |
| state              | VARCHAR   | Estado (UF)                                |
| **Compliance:**    |           |                                            |
| ip_address         | VARCHAR   | IP do pagador                              |
| user_agent         | VARCHAR   | Browser/Device                             |
| terms_accepted_at  | TIMESTAMP | Data/hora do aceite                        |
| terms_version      | VARCHAR   | Versão dos termos aceitos                  |
| created_at         | TIMESTAMP | Data de criação                            |

### Tabela: `wolkpay_payments` (Pagamentos)

| Campo               | Tipo      | Descrição                |
| ------------------- | --------- | ------------------------ |
| id                  | UUID      | ID único                 |
| invoice_id          | UUID      | FK → wolkpay_invoices    |
| payer_id            | UUID      | FK → wolkpay_payers      |
| pix_txid            | VARCHAR   | TXID do PIX gerado       |
| pix_qrcode          | TEXT      | Código PIX copia-e-cola  |
| pix_qrcode_image    | TEXT      | Base64 da imagem QR      |
| amount_brl          | DECIMAL   | Valor do PIX             |
| status              | ENUM      | PENDING, PAID, FAILED    |
| paid_at             | TIMESTAMP | Data/hora do pagamento   |
| bank_transaction_id | VARCHAR   | ID da transação bancária |
| created_at          | TIMESTAMP | Data de criação          |

### Tabela: `wolkpay_approvals` (Aprovações)

| Campo            | Tipo      | Descrição                    |
| ---------------- | --------- | ---------------------------- |
| id               | UUID      | ID único                     |
| invoice_id       | UUID      | FK → wolkpay_invoices        |
| approved_by      | UUID      | FK → users (admin)           |
| action           | ENUM      | APPROVED, REJECTED           |
| rejection_reason | TEXT      | Motivo (se rejeitado)        |
| crypto_tx_hash   | VARCHAR   | Hash da transação blockchain |
| notes            | TEXT      | Observações do admin         |
| created_at       | TIMESTAMP | Data da ação                 |

### Tabela: `wolkpay_terms_versions` (Versões dos Termos)

| Campo      | Tipo      | Descrição                 |
| ---------- | --------- | ------------------------- |
| id         | UUID      | ID único                  |
| version    | VARCHAR   | v1.0, v1.1, etc.          |
| content    | TEXT      | Texto completo dos termos |
| active     | BOOLEAN   | Se é a versão atual       |
| created_at | TIMESTAMP | Data de criação           |

### Tabela: `wolkpay_payer_limits` (Controle de Limites por Pagador)

| Campo             | Tipo      | Descrição                       |
| ----------------- | --------- | ------------------------------- |
| id                | UUID      | ID único                        |
| document_type     | ENUM      | CPF ou CNPJ                     |
| document_number   | VARCHAR   | CPF/CNPJ (criptografado)        |
| month_year        | VARCHAR   | Mês/Ano (2026-01)               |
| total_amount_brl  | DECIMAL   | Total transacionado no mês      |
| transaction_count | INTEGER   | Quantidade de transações no mês |
| last_transaction  | TIMESTAMP | Última transação                |
| blocked           | BOOLEAN   | Se está bloqueado               |
| blocked_reason    | TEXT      | Motivo do bloqueio              |
| created_at        | TIMESTAMP | Data de criação                 |
| updated_at        | TIMESTAMP | Última atualização              |

**Regras de Limite:**

- Limite por operação: R$ 15.000,00
- Limite mensal por pagador: R$ 300.000,00
- Sistema verifica antes de permitir pagamento

---

## 💎 CRIPTOMOEDAS SUPORTADAS

Todas as criptomoedas disponíveis no projeto WolkNow:

| Crypto | Nome         | Rede Principal |
| ------ | ------------ | -------------- |
| BTC    | Bitcoin      | Bitcoin        |
| ETH    | Ethereum     | Ethereum       |
| USDT   | Tether       | TRC20/ERC20    |
| USDC   | USD Coin     | ERC20          |
| SOL    | Solana       | Solana         |
| BNB    | Binance Coin | BSC            |
| XRP    | Ripple       | XRP Ledger     |
| ADA    | Cardano      | Cardano        |
| DOGE   | Dogecoin     | Dogecoin       |
| MATIC  | Polygon      | Polygon        |
| LTC    | Litecoin     | Litecoin       |

_A lista será dinâmica baseada nas moedas ativas no sistema._

---

## 🖥️ INTERFACES DO SISTEMA

### 1. Página do Beneficiário (Criar Fatura)

**Rota:** `/wolkpay` (autenticado)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Criar Fatura de Crypto                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Selecione a criptomoeda:                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ BTC  │ │ ETH  │ │ USDT │ │ USDC │ │ SOL  │ │ BNB  │             │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ XRP  │ │ ADA  │ │ DOGE │ │MATIC │ │ LTC  │  ... mais            │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                      │
│                                                                      │
│  Quantidade: [________] USDT                                        │
│                                                                      │
│  ⚠️ Limite por fatura: R$ 15.000,00                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  RESUMO DA FATURA                                               ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │  Quantidade:           100,00 USDT                              ││
│  │  Cotação USD/BRL:      R$ 6,00                                  ││
│  │  Valor base:           R$ 600,00                                ││
│  │  Taxa de serviço (3,65%): R$ 21,90                              ││
│  │  Taxa de rede (0,15%):    R$ 0,90                               ││
│  │  ─────────────────────────────────────────                      ││
│  │  TOTAL A PAGAR:        R$ 622,80                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ⏰ Validade: 15 minutos (devido à volatilidade)                     │
│  Você receberá: 100,00 USDT na sua carteira WolkNow                 │
│                                                                      │
│             ┌──────────────────────────┐                            │
│             │   ⚡ GERAR FATURA        │                            │
│             └──────────────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Fatura Gerada (Compartilhar)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✅ Fatura Gerada com Sucesso!                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Fatura: WKPAY-2026-0001                                            │
│  Valor: R$ 622,80                                                   │
│  Crypto: 100 USDT                                                   │
│  ⏰ Validade: 15 minutos                                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Link do Checkout:                                              ││
│  │  https://wolknow.com/wolkpay/checkout/abc123xyz                 ││
│  │                                            [📋 Copiar Link]     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│       ┌────────────┐                                                │
│       │ QR CODE    │                                                │
│       │ DO LINK    │                                                │
│       └────────────┘                                                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ 📱 WhatsApp    │  │ 📧 E-mail      │  │ 📤 Outros      │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│  ⚠️ ATENÇÃO: Compartilhe agora! A fatura expira em 15 minutos.      │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Status: ⏳ Aguardando pagamento (expira em 14:32)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Checkout Público (Pagador)

**Rota:** `/wolkpay/checkout/:token` (público)

#### Etapa 1 - Dados Pessoais

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Checkout                                              │
│     Pagamento para compra de criptomoedas                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  DETALHES DA FATURA                                             ││
│  │  Beneficiário: J***o M***s (conta verificada ✓)                 ││
│  │  Crypto: 100 USDT                                               ││
│  │  Total a pagar: R$ 622,80                                       ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  ETAPA 1 de 3: Seus Dados                                           │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                      │
│  Tipo de Pessoa:                                                    │
│  ( ) Pessoa Física (CPF)    ( ) Pessoa Jurídica (CNPJ)             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [SE PESSOA FÍSICA]                                             ││
│  │  Nome Completo: [_________________________________]             ││
│  │  CPF: [___.___.___-__]                                          ││
│  │  Data de Nascimento: [__/__/____]                               ││
│  │  Telefone: [(__) _____-____]                                    ││
│  │  E-mail: [_________________________________]                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [SE PESSOA JURÍDICA]                                           ││
│  │  Razão Social: [_________________________________]              ││
│  │  CNPJ: [__.___.___/____-__]                                     ││
│  │  Nome Fantasia: [_________________________________]             ││
│  │  Inscrição Estadual: [_________________________________]        ││
│  │  Telefone Comercial: [(__) _____-____]                          ││
│  │  E-mail Comercial: [_________________________________]          ││
│  │  ─────────────────────────────────────────────────────          ││
│  │  Responsável Legal:                                             ││
│  │  Nome: [_________________________________]                      ││
│  │  CPF: [___.___.___-__]                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│                        [Próximo →]                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Etapa 2 - Endereço

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Checkout                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  ETAPA 2 de 3: Endereço                                             │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                      │
│  CEP: [_____-___]  [🔍 Buscar]                                      │
│                                                                      │
│  Logradouro: [_________________________________]                    │
│  Número: [______]  Complemento: [__________________]                │
│  Bairro: [_________________________________]                        │
│  Cidade: [_________________________________]                        │
│  Estado: [__]                                                       │
│                                                                      │
│              [← Voltar]        [Próximo →]                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Etapa 3 - Termos e Aceite

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Checkout                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  ETAPA 3 de 3: Termos e Condições                                   │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                      │
│  ⚠️ ATENÇÃO: Leia atentamente antes de prosseguir                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ☐ Declaro que estou ciente que este pagamento no valor de      ││
│  │   R$ 622,80 é para aquisição de 100 USDT (criptomoeda) que     ││
│  │   serão enviadas para a carteira de J***o M***s.               ││
│  │                                                                 ││
│  │ ☐ Declaro que os recursos utilizados neste pagamento são de    ││
│  │   origem lícita e não provêm de atividades ilegais, lavagem    ││
│  │   de dinheiro, financiamento ao terrorismo ou qualquer outra   ││
│  │   atividade criminosa.                                         ││
│  │                                                                 ││
│  │ ☐ Estou ciente que a HOLD DIGITAL ASSETS LTDA (CNPJ:           ││
│  │   24.275.355/0001-51) é intermediária desta operação e que     ││
│  │   EU NÃO RECEBEREI as criptomoedas - elas serão creditadas     ││
│  │   exclusivamente na carteira do beneficiário indicado.         ││
│  │                                                                 ││
│  │ ☐ Declaro que li e concordo com os Termos de Uso e Política    ││
│  │   de Privacidade da WolkNow. [Ver termos completos]            ││
│  │                                                                 ││
│  │ ☐ Autorizo o armazenamento dos meus dados pessoais para fins   ││
│  │   de compliance, prevenção à lavagem de dinheiro e eventuais   ││
│  │   auditorias fiscais pelo prazo de 5 (cinco) anos.             ││
│  │                                                                 ││
│  │ ☐ Declaro, sob as penas da lei, que todas as informações       ││
│  │   prestadas neste formulário são verdadeiras e assumo total    ││
│  │   responsabilidade civil e criminal por sua veracidade.        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│              [← Voltar]        [PAGAR AGORA →]                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Etapa 4 - Pagamento PIX (Conta Estática)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Pagamento via PIX                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌────────────────┐                               │
│                    │                │                               │
│                    │   QR CODE      │                               │
│                    │   PIX          │                               │
│                    │                │                               │
│                    └────────────────┘                               │
│                                                                      │
│                   Valor: R$ 622,80                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Favorecido: HOLD DIGITAL ASSETS LTDA                          ││
│  │  CNPJ: 24.275.355/0001-51                                       ││
│  │  Chave PIX: 24275355000151 (CNPJ)                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Código PIX Copia e Cola:                            [📋 Copiar]    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 00020126580014br.gov.bcb.pix0136...                             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ⏰ Esta fatura expira em 15 minutos                                 │
│                                                                      │
│  ⚠️ IMPORTANTE: Pague o valor EXATO de R$ 622,80                    │
│     Valores diferentes serão recusados.                             │
│                                                                      │
│  ⟳ Aguardando confirmação do pagamento...                           │
│     (verificação manual pelo financeiro)                            │
│                                                                      │
│  ───────────────────────────────────────────────────────────────── │
│  📧 Você receberá um e-mail de confirmação quando o pagamento      │
│     for verificado e as criptomoedas forem enviadas.               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Painel Admin - Lista de Operações

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Painel Administrativo                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Pendentes: 5]  [Aprovados]  [Rejeitados]  [Todos]        [📊 Relatórios] │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Fatura      │ Beneficiário │ Pagador      │ Valor     │ Crypto │ Status ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ WKPAY-0001  │ Jânio M.     │ Maria S.     │ R$ 622,80 │ 100 USDT │ ⏳   ││
│  │ WKPAY-0002  │ Carlos R.    │ Empresa XYZ  │ R$ 3.114  │ 500 USDT │ ⏳   ││
│  │ WKPAY-0003  │ Ana P.       │ João Silva   │ R$ 311,40 │ 50 USDT  │ ⏳   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. Painel Admin - Detalhes da Operação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Detalhes da Operação WKPAY-2026-0001                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐            │
│  │ BENEFICIÁRIO               │  │ PAGADOR                    │            │
│  │ Nome: Jânio Martins        │  │ Tipo: Pessoa Física        │            │
│  │ Email: janio@email.com     │  │ Nome: Maria Santos         │            │
│  │ Carteira: 0x1234...5678    │  │ CPF: 123.456.789-00        │            │
│  │ KYC: ✅ Verificado         │  │ Nascimento: 15/03/1985     │            │
│  └────────────────────────────┘  │ Telefone: (11) 99999-9999  │            │
│                                   │ Email: maria@email.com     │            │
│                                   │ ─────────────────────────  │            │
│                                   │ ENDEREÇO:                  │            │
│                                   │ Rua das Flores, 123        │            │
│                                   │ Jardim Primavera           │            │
│                                   │ São Paulo - SP             │            │
│                                   │ CEP: 01234-567             │            │
│                                   │ ─────────────────────────  │            │
│                                   │ IP: 189.123.45.67          │            │
│                                   │ Aceite: 10/01/2026 14:32   │            │
│                                   └────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ DADOS FINANCEIROS                                                       ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Crypto:              100 USDT                                           ││
│  │ Cotação USD/BRL:     R$ 6,00                                            ││
│  │ Valor base:          R$ 600,00                                          ││
│  │ Taxa serviço (3,65%): R$ 21,90   ← RECEITA WOLKNOW                      ││
│  │ Taxa rede (0,15%):    R$ 0,90    ← CUSTO OPERACIONAL                    ││
│  │ Total pago:          R$ 622,80                                          ││
│  │ ──────────────────────────────────────────────────────────────────────  ││
│  │ PIX TXID:            E24275355202601101432abc123                        ││
│  │ Pago em:             10/01/2026 14:35:22                                ││
│  │ Transação bancária:  TRN123456789                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ TERMOS ACEITOS (v1.0 em 10/01/2026 14:32:15)                            ││
│  │ ✅ Ciente que criptomoedas vão para o beneficiário                      ││
│  │ ✅ Declara origem lícita dos recursos                                   ││
│  │ ✅ Ciente que HOLD é intermediária                                      ││
│  │ ✅ Aceita Termos de Uso e Política de Privacidade                       ││
│  │ ✅ Autoriza armazenamento de dados                                      ││
│  │ ✅ Declara veracidade das informações                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Observações do Admin:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [_________________________________________________________________]     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│         ┌────────────────┐              ┌────────────────┐                  │
│         │ ✅ APROVAR     │              │ ❌ REJEITAR    │                  │
│         └────────────────┘              └────────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6. Relatórios para Contabilidade

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔷 WolkPay - Relatório Fiscal                                              │
│     Período: Janeiro/2026                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RESUMO DO PERÍODO                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Total de Operações:        45                                           ││
│  │ Volume Transacionado:      R$ 125.000,00                                ││
│  │ Receita Taxa Serviço:      R$ 4.562,50   (3,65%)                        ││
│  │ Custo Taxa de Rede:        R$ 187,50     (0,15%)                        ││
│  │ Receita Líquida:           R$ 4.375,00                                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  DETALHAMENTO POR OPERAÇÃO                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Data       │ Fatura     │ Pagador     │ CPF/CNPJ    │ Valor   │ Taxa   ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ 10/01/2026 │ WKPAY-0001 │ Maria S.    │ 123.456... │ R$ 622  │ R$ 22  ││
│  │ 10/01/2026 │ WKPAY-0002 │ Empresa XYZ │ 12.345...  │ R$ 3114 │ R$ 113 ││
│  │ ...        │ ...        │ ...         │ ...        │ ...     │ ...    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [📥 Exportar CSV]  [📥 Exportar PDF]  [📥 Exportar XML (SPED)]             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 REQUISITOS DE SEGURANÇA E COMPLIANCE

### 1. Proteção de Dados (LGPD)

- CPF/CNPJ armazenados com criptografia AES-256
- Dados sensíveis mascarados na interface
- Logs de acesso a dados pessoais
- Política de retenção de 5 anos (exigência fiscal)

### 2. Prevenção à Lavagem de Dinheiro (PLD)

- Coleta completa de dados do pagador
- Validação de CPF/CNPJ na Receita Federal
- Limite por operação (sugestão: R$ 10.000)
- Limite mensal por pagador (sugestão: R$ 50.000)
- Alertas para operações suspeitas

### 3. Termos Obrigatórios

- Todos os 6 termos devem ser aceitos
- Registro de IP, data/hora e versão dos termos
- Termos versionados para histórico legal

### 4. Auditoria

- Todas as ações são logadas
- Histórico completo de cada operação
- Relatórios para Receita Federal
- Exportação em formatos fiscais (SPED)

---

## 📁 ESTRUTURA DE ARQUIVOS (SUGESTÃO)

```
Frontend/src/
├── pages/
│   └── wolkpay/
│       ├── WolkPayPage.tsx           # Página principal (criar fatura)
│       ├── InvoiceCreatedPage.tsx    # Fatura criada (compartilhar)
│       ├── CheckoutPage.tsx          # Checkout público (pagador)
│       ├── MyInvoicesPage.tsx        # Minhas faturas (beneficiário)
│       └── components/
│           ├── CryptoSelector.tsx
│           ├── InvoiceSummary.tsx
│           ├── ShareInvoice.tsx
│           ├── CheckoutForm.tsx
│           ├── PayerDataForm.tsx
│           ├── AddressForm.tsx
│           ├── TermsAcceptance.tsx
│           └── PixPayment.tsx

Backend/app/
├── routers/
│   └── wolkpay.py                    # Endpoints WolkPay
├── services/
│   └── wolkpay_service.py            # Lógica de negócio
├── models/
│   └── wolkpay.py                    # Modelos SQLAlchemy
├── schemas/
│   └── wolkpay.py                    # Schemas Pydantic
└── templates/
    └── emails/
        ├── invoice_created.html
        ├── payment_confirmed.html
        └── crypto_sent.html
```

---

## 🛣️ ENDPOINTS DA API

| Método     | Rota                               | Descrição            | Auth     |
| ---------- | ---------------------------------- | -------------------- | -------- |
| POST       | `/wolkpay/invoice`                 | Criar fatura         | ✅       |
| GET        | `/wolkpay/invoice/{id}`            | Detalhes da fatura   | ✅       |
| GET        | `/wolkpay/my-invoices`             | Minhas faturas       | ✅       |
| GET        | `/wolkpay/checkout/{token}`        | Dados do checkout    | ❌       |
| POST       | `/wolkpay/checkout/{token}/payer`  | Salvar dados pagador | ❌       |
| POST       | `/wolkpay/checkout/{token}/pay`    | Gerar PIX            | ❌       |
| GET        | `/wolkpay/checkout/{token}/status` | Status pagamento     | ❌       |
| **ADMIN:** |                                    |                      |          |
| GET        | `/admin/wolkpay/pending`           | Operações pendentes  | ✅ Admin |
| GET        | `/admin/wolkpay/{id}`              | Detalhes operação    | ✅ Admin |
| POST       | `/admin/wolkpay/{id}/approve`      | Aprovar              | ✅ Admin |
| POST       | `/admin/wolkpay/{id}/reject`       | Rejeitar             | ✅ Admin |
| GET        | `/admin/wolkpay/reports`           | Relatórios           | ✅ Admin |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Backend

- [ ] Criar modelos SQLAlchemy
- [ ] Criar schemas Pydantic
- [ ] Implementar endpoint criar fatura
- [ ] Implementar endpoint checkout público
- [ ] Implementar validação CPF/CNPJ
- [ ] Implementar integração CEP (ViaCEP)
- [ ] Implementar geração PIX
- [ ] Implementar webhook pagamento
- [ ] Implementar endpoints admin
- [ ] Implementar relatórios
- [ ] Implementar envio de e-mails

### Frontend

- [ ] Criar página WolkPay (beneficiário)
- [ ] Criar página fatura gerada
- [ ] Criar página checkout público
- [ ] Implementar formulário pagador PF
- [ ] Implementar formulário pagador PJ
- [ ] Implementar formulário endereço
- [ ] Implementar termos e aceite
- [ ] Implementar tela PIX
- [ ] Criar páginas admin WolkPay
- [ ] Implementar relatórios

### Infraestrutura

- [ ] Criar tabelas no banco
- [ ] Configurar envio de e-mails
- [ ] Configurar PIX (BB ou outro)
- [ ] Testes de segurança
- [ ] Deploy

---

## 📅 ESTIMATIVA DE TEMPO

| Fase                        | Tempo Estimado |
| --------------------------- | -------------- |
| Backend - Modelos e Schemas | 2 horas        |
| Backend - Endpoints         | 8 horas        |
| Backend - Integrações       | 4 horas        |
| Frontend - Páginas          | 8 horas        |
| Frontend - Admin            | 4 horas        |
| Testes                      | 4 horas        |
| **TOTAL**                   | **~30 horas**  |

---

## ✅ DEFINIÇÕES APROVADAS

| Item                          | Definição                                               |
| ----------------------------- | ------------------------------------------------------- |
| **Limite por operação**       | R$ 15.000,00                                            |
| **Limite mensal por pagador** | R$ 300.000,00                                           |
| **Validade da fatura**        | 15 minutos (volatilidade crypto)                        |
| **Criptomoedas suportadas**   | Todas do projeto (BTC, ETH, USDT, USDC, SOL, BNB, etc.) |
| **Método de pagamento PIX**   | Conta Estática (até renovar certificado BB)             |
| **BB-AUTO**                   | Código pronto para ativar quando certificado renovar    |
| **E-mails automáticos**       | ✅ Sim                                                  |
| **Comprovante PDF**           | ✅ Sim                                                  |

---

## ⚠️ REGRAS DE NEGÓCIO IMPORTANTES

### Validade Curta (15 minutos)

A fatura expira em **15 minutos** para proteger contra volatilidade das criptomoedas.

- Se expirar, o beneficiário precisa gerar nova fatura com cotação atualizada
- O pagador vê um timer na tela de pagamento
- Após expirar, a página de checkout mostra "Fatura Expirada"

### Limites Anti-Lavagem

- **Por operação:** Máximo R$ 15.000,00
- **Por pagador/mês:** Máximo R$ 300.000,00
- Sistema bloqueia automaticamente se limite for atingido
- Admin pode consultar histórico de cada CPF/CNPJ

### PIX Conta Estática vs BB-AUTO

**Fase 1 (Atual):** Conta Estática

- PIX vai para conta da HOLD DIGITAL ASSETS
- Financeiro verifica manualmente o depósito
- Admin aprova e envia crypto

**Fase 2 (Após certificado):** BB-AUTO

- PIX dinâmico com TXID único
- Confirmação automática via webhook
- Crypto enviada automaticamente

---

_Documento criado em: 10 de Janeiro de 2026_
_Versão: 1.1 - Definições Aprovadas_
