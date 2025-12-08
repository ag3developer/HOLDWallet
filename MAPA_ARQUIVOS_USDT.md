# 📂 Mapa de Arquivos: Onde Está o Código USDT no HOLDWallet

## 🎯 Estrutura de Suporte USDT

```
HOLDWallet/
├── backend/
│   ├── app/
│   │   ├── config/
│   │   │   └── token_contracts.py ⭐ USDT Config
│   │   │       ├── USDT_CONTRACTS (10 blockchains)
│   │   │       ├── USDC_CONTRACTS (8 blockchains)
│   │   │       ├── ERC20_ABI (Interface de token)
│   │   │       └── get_token_address() func
│   │   │
│   │   ├── services/
│   │   │   ├── wallet_service.py ⭐ Gerador de Endereço
│   │   │   │   ├── coin_types["usdt"] = "60"
│   │   │   │   ├── create_wallet_with_mnemonic()
│   │   │   │   └── generate_address()
│   │   │   │
│   │   │   ├── token_service.py ⭐ Lógica USDT
│   │   │   │   ├── format_amount_for_contract() - converte decimals
│   │   │   │   ├── get_token_info()
│   │   │   │   └── validate_token_and_network()
│   │   │   │
│   │   │   ├── balance_service.py ⭐ Busca Saldos
│   │   │   │   ├── get_token_balance() - saldo USDT
│   │   │   │   └── get_all_balances() - saldos totais
│   │   │   │
│   │   │   └── crypto_service.py ✅ Geração de Keys
│   │   │       ├── generate_wallet_data()
│   │   │       ├── derive_network_address()
│   │   │       └── BIP44 logic
│   │   │
│   │   ├── routers/
│   │   │   ├── tokens.py ⭐ API USDT
│   │   │   │   ├── GET /tokens/available
│   │   │   │   ├── POST /tokens/info
│   │   │   │   ├── POST /tokens/validate
│   │   │   │   ├── GET /tokens/gas-estimate
│   │   │   │   └── + 3 outros endpoints
│   │   │   │
│   │   │   ├── wallet.py ✅ Wallet API
│   │   │   │   ├── POST /wallets/create
│   │   │   │   ├── GET /wallets/addresses
│   │   │   │   └── GET /wallets/{id}
│   │   │   │
│   │   │   └── ... outros routers
│   │   │
│   │   ├── models/
│   │   │   ├── wallet.py ✅ Modelo Wallet
│   │   │   │   └── network: "usdt" (suportado)
│   │   │   │
│   │   │   └── address.py ✅ Modelo Address
│   │   │       └── armazena endereço gerado
│   │   │
│   │   └── main.py ✅ App Principal
│   │       └── include_router(tokens.router)
│   │
│   └── ... outros arquivos
│
└── Frontend/
    ├── src/
    │   ├── pages/
    │   │   └── wallet/
    │   │       ├── WalletPage.tsx ⭐ UI Receber USDT
    │   │       │   ├── Tab "Receive"
    │   │       │   ├── Token selector (USDT, USDC, etc)
    │   │       │   ├── Network selector
    │   │       │   ├── QRCode display
    │   │       │   └── Copy button
    │   │       │
    │   │       └── SendPage.tsx ⭐ UI Enviar USDT
    │   │           ├── Token selector
    │   │           ├── Network selector
    │   │           ├── Amount input
    │   │           ├── Fee estimator
    │   │           └── Send button
    │   │
    │   ├── hooks/
    │   │   ├── useWallets() ✅ Busca carteiras
    │   │   ├── useWalletAddresses() ✅ Busca endereços
    │   │   ├── useSendTransaction() ✅ Envia USDT
    │   │   └── useTransactions() ✅ Histórico
    │   │
    │   ├── services/
    │   │   └── api.ts ✅ Chamadas HTTP
    │   │       ├── GET /wallets
    │   │       ├── GET /wallets/addresses
    │   │       ├── POST /tokens/validate
    │   │       └── + USDT endpoints
    │   │
    │   └── ... outros componentes
    │
    └── ... arquivos frontend
```

---

## 🔍 Fluxo de Dados: Criar Carteira USDT

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: Click "Criar Carteira USDT"                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────▼──────────┐
        │ WalletPage.tsx       │
        │ Chamada API:         │
        │ POST /wallets/create │
        │ {                    │
        │   name: "USDT",      │
        │   network: "usdt"    │
        │ }                    │
        └───────────┬──────────┘
                    │ HTTP Request
                    │
┌───────────────────▼─────────────────────────────────────────┐
│ BACKEND: wallet.py (router)                                │
│ @router.post("/create")                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────▼──────────────────────────┐
        │ wallet_service.                      │
        │ create_wallet_with_mnemonic()        │
        │                                      │
        │ 1. get_or_create_master_seed()      │
        │    ↓                                 │
        │    crypto_service.                  │
        │    generate_wallet_data()           │
        │    → Returns: {                      │
        │        mnemonic: "12 words",        │
        │        seed: 64 bytes,              │
        │        encrypted_mnemonic,         │
        │        seed_hash                    │
        │      }                              │
        │                                      │
        │ 2. coin_types["usdt"] = "60"       │
        │    derivation_path =                │
        │      "m/44'/60'/0'"                 │
        │                                      │
        │ 3. Wallet.create() no BD            │
        │    → wallet_id = 123                │
        │                                      │
        │ 4. generate_address()               │
        │    ↓                                 │
        │    crypto_service.                  │
        │    derive_network_address()         │
        │    → address =                       │
        │      0x742d35Cc...                  │
        │                                      │
        │ 5. Address.create() no BD           │
        │    → address_id = 456               │
        └───────────┬──────────────────────────┘
                    │
        ┌───────────▼──────────────────────────┐
        │ Database (SQLite)                    │
        │                                      │
        │ wallets table:                       │
        │ ┌─────────────────────────────────┐ │
        │ │ id  network  user_id  encrypted │ │
        │ │ 123  usdt    user1   seed...    │ │
        │ └─────────────────────────────────┘ │
        │                                      │
        │ addresses table:                     │
        │ ┌──────────────────────────────────┤
        │ │ id  wallet_id  address      net  │ │
        │ │ 456  123    0x742d35Cc...  usdt  │ │
        │ └──────────────────────────────────┘ │
        └───────────┬──────────────────────────┘
                    │ Response JSON
                    │
        ┌───────────▼──────────────────┐
        │ Response:                    │
        │ {                            │
        │   wallet_id: 123,            │
        │   network: "usdt",           │
        │   first_address:             │
        │     0x742d35Cc6634C0532...  │
        │ }                            │
        └───────────┬──────────────────┘
                    │ HTTP Response
                    │
┌───────────────────▼─────────────────────────────────────────┐
│ FRONTEND: WalletPage.tsx                                   │
│ Armazena: wallets[] = [{                                   │
│   id: 123,                                                  │
│   network: "usdt",                                          │
│   address: "0x742d35Cc..."                                 │
│ }]                                                          │
│                                                             │
│ Renderiza:                                                  │
│ ✅ Carteira USDT criada!                                   │
│ 📫 Endereço: 0x742d35Cc...                                 │
│ [Copiar] [Compartilhar] [QR Code]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integração de Arquivos

### 1. Backend - Receber USDT (GET Endereço)

```
Frontend Request:
  useWalletAddresses(wallet_id=123, networks=['polygon', 'ethereum'])
        │
        ▼
API Call:
  GET /wallets/123/addresses?networks=polygon,ethereum
        │
        ▼
wallet.py router:
  @router.get("/wallets/{wallet_id}/addresses")
        │
        ▼
wallet_service.py:
  get_wallet_addresses(wallet_id, networks)
        │
        ├─▶ Polygon: SELECT from addresses
        │            WHERE wallet_id=123 AND network='polygon'
        │
        └─▶ Ethereum: SELECT from addresses
                     WHERE wallet_id=123 AND network='ethereum'
        │
        ▼
Database:
  📦 wallet 123: 0x742d35Cc6634C0532925a3b844Bc9e7595f42e11
        │
        ▼
Response:
  {
    polygon: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e11",
    ethereum: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e11"
  }
        │
        ▼
Frontend:
  setState({ address: 0x742d35Cc... })
  Renderiza QR Code, Copiar, Compartilhar
```

### 2. Backend - Validar USDT (POST Validar)

```
Frontend: Seleciona Polygon + USDT
  │
  ▼
Chamada:
  POST /api/v1/tokens/validate
  {
    token: "USDT",
    network: "polygon",
    address: "0x742d35Cc..."
  }
  │
  ▼
tokens.py router:
  @router.post("/validate")
  │
  ▼
token_service.py:
  validate_token_and_network(token, network, address)
  │
  ├─▶ token_contracts.py:
  │    USDT_CONTRACTS['polygon']
  │    = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
  │
  ├─▶ Verifica se endereço é Ethereum-style
  │    (começa com 0x, 42 caracteres)
  │    ✅ Válido para Polygon!
  │
  └─▶ Retorna:
      {
        valid: true,
        token_contract: 0xc2132D0...,
        decimals: 6,
        network_config: {...}
      }
```

### 3. Backend - Buscar Saldo USDT

```
Frontend: Abrir aba "Visão Geral"
  │
  ▼
Hook: useWalletBalances(wallet_id, networks)
  │
  ▼
API Call: GET /wallets/123/balances?networks=polygon,ethereum
  │
  ▼
wallet.py router:
  @router.get("/wallets/{wallet_id}/balances")
  │
  ▼
balance_service.py:
  get_all_balances(address, network)
  │
  ├─▶ Para cada rede:
  │    ├─ Native balance (ETH, MATIC, BNB, etc)
  │    │  └─ Balance: 5.3 MATIC
  │    │
  │    ├─ USDT Balance
  │    │  └─ token_contracts.USDT_CONTRACTS['polygon']
  │    │  └─ Contract: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
  │    │  └─ Call: contract.balanceOf(user_address)
  │    │  └─ Result: 5000 USDT
  │    │
  │    └─ USDC Balance
  │       └─ ... similar
  │
  ▼
Response:
  {
    polygon: {
      native: { balance: "5.3", balance_usd: "1590" },
      usdt: { balance: "5000", balance_usd: "5000" },
      usdc: { balance: "2000", balance_usd: "2000" }
    },
    ethereum: {
      native: { balance: "0.1", balance_usd: "300" },
      usdt: { balance: "1000", balance_usd: "1000" },
      usdc: { balance: "500", balance_usd: "500" }
    }
  }
  │
  ▼
Frontend:
  setState({ balances: {...} })
  Renderiza:
  ✅ Saldo total: $9390 USD
  ✅ USDT: 6000
  ✅ USDC: 2500
```

### 4. Frontend - Enviar USDT

```
Frontend: SendPage.tsx
  │
  ├─ Seleciona Token: USDT
  ├─ Seleciona Network: Polygon
  ├─ Digita Endereço: 0x1234...
  ├─ Digita Valor: 100 USDT
  │
  ▼
Validação (Frontend):
  ├─ Endereço válido? ✅
  ├─ Valor > 0? ✅
  ├─ Tem saldo? ✅ (5000 USDT)
  │
  ▼
Chamada: POST /wallets/send
  {
    wallet_id: 123,
    to_address: "0x1234...",
    amount: "100",
    token: "USDT",
    network: "polygon"
  }
  │
  ▼
Backend: transaction.py router
  @router.post("/send")
  │
  ├─▶ token_service.py:
  │    format_amount_for_contract()
  │    100 USDT * 10^6 = 100000000
  │    (porque USDT tem 6 decimals)
  │
  ├─▶ blockchain_service.py:
  │    Cria TX para enviar USDT
  │
  └─▶ web3.py:
       Assina e submete no blockchain
  │
  ▼
Response:
  {
    tx_hash: "0xabcd1234...",
    status: "pending"
  }
  │
  ▼
Frontend:
  Toast: ✅ Transação enviada!
  Hash: 0xabcd1234...
```

---

## 📋 Checklist de Arquivos USDT

### Backend - Status Implementação

- ✅ `config/token_contracts.py` - USDT configurado
- ✅ `services/wallet_service.py` - Suporta "usdt"
- ✅ `services/token_service.py` - Operações USDT
- ✅ `services/balance_service.py` - Busca saldo USDT
- ✅ `services/crypto_service.py` - Gera chaves
- ✅ `routers/tokens.py` - API USDT (7 endpoints)
- ✅ `routers/wallet.py` - CRUD wallets
- ✅ `models/wallet.py` - Armazena USDT
- ✅ `models/address.py` - Armazena endereços
- ✅ `main.py` - Registra routers
- ⏳ `services/transaction_service.py` - Envio (parcial)
- ⏳ `routers/transaction.py` - TX API (parcial)

### Frontend - Status Implementação

- ✅ `WalletPage.tsx` - UI completa
  - ✅ Tab "Receive" com USDT
  - ✅ Seletor de token
  - ✅ Seletor de rede
  - ✅ QR Code
  - ✅ Copy button
- ✅ `SendPage.tsx` - UI completa
  - ✅ Enviar USDT
  - ✅ Seletor de rede
  - ✅ Validação de endereço
  - ✅ Estimador de taxa
- ✅ `hooks/useWallets()` - Busca carteiras
- ✅ `hooks/useWalletAddresses()` - Busca endereços
- ✅ `hooks/useSendTransaction()` - Envia transação
- ✅ `services/api.ts` - Chamadas HTTP

---

## 🎯 Resumo: Onde Está Cada Funcionalidade

| Funcionalidade          | Arquivo                                   | Status                |
| ----------------------- | ----------------------------------------- | --------------------- |
| **Gerar Endereço USDT** | `wallet_service.py` + `crypto_service.py` | ✅ Pronto             |
| **Validar USDT/Rede**   | `token_service.py`                        | ✅ Pronto             |
| **Buscar Saldo USDT**   | `balance_service.py`                      | ✅ Pronto             |
| **UI Receber USDT**     | `WalletPage.tsx`                          | ✅ Pronto             |
| **UI Enviar USDT**      | `SendPage.tsx`                            | ✅ Pronto             |
| **API USDT**            | `routers/tokens.py`                       | ✅ Pronto             |
| **Enviar USDT Real**    | `transaction_service.py`                  | ⏳ Em desenvolvimento |

---

## 🚀 Como Testar Agora

```bash
# 1. Backend rodando
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python -m uvicorn app.main:app --reload

# 2. Criar carteira USDT
curl -X POST http://localhost:8000/wallets/create \
  -H "Content-Type: application/json" \
  -d '{"name":"USDT","network":"usdt"}' | jq

# 3. Ver endereço gerado
curl http://localhost:8000/wallets/123/addresses | jq

# 4. Validar USDT em Polygon
curl -X POST http://localhost:8000/api/v1/tokens/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"USDT","network":"polygon"}' | jq
```

---

## ✨ Conclusão

Você tem **TUDO** que precisa para receber USDT! 🎉

Os arquivos estão interconectados e funcionando:

- Backend gera endereço ✅
- Frontend mostra endereço ✅
- Sistema valida USDT ✅
- Busca saldo ✅

Faltando: Enviar USDT de verdade (última integração com blockchain)
