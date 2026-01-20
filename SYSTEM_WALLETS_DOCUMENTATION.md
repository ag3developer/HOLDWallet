# 🏦 HOLDWallet - Sistema de Carteiras do Sistema

## Documentação Técnica e Operacional

**Versão:** 2.0  
**Data:** 20 de Janeiro de 2026  
**Status:** Fase de Implementação

---

## 📋 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Atual (v1)](#2-arquitetura-atual-v1)
3. [Nova Arquitetura (v2) - 3 Carteiras](#3-nova-arquitetura-v2---3-carteiras)
4. [Especificação Técnica](#4-especificação-técnica)
5. [Guia Operacional para Admin](#5-guia-operacional-para-admin)
6. [Segurança e Boas Práticas](#6-segurança-e-boas-práticas)
7. [Plano de Implementação](#7-plano-de-implementação)
8. [FAQ - Perguntas Frequentes](#8-faq---perguntas-frequentes)

---

## 1. VISÃO GERAL

### 1.1 O que é o Sistema de Carteiras do Sistema?

O Sistema de Carteiras do Sistema (System Wallets) é o conjunto de carteiras blockchain que pertencem à plataforma HOLDWallet, utilizadas para:

- **Receber taxas e comissões** de trades P2P e OTC
- **Armazenar fundos operacionais** para completar trades de compra
- **Processar operações automáticas** de swap e transferências
- **Custodiar temporariamente** criptoativos durante operações

### 1.2 Redes Suportadas

O sistema suporta **16 redes blockchain**:

| Rede      | Símbolo | Tipo    | Uso Principal                  |
| --------- | ------- | ------- | ------------------------------ |
| Ethereum  | ETH     | EVM     | Taxas, Operações               |
| Polygon   | MATIC   | EVM     | Taxas, Operações (baixo custo) |
| BSC       | BNB     | EVM     | Taxas, Operações               |
| Base      | ETH     | EVM     | Taxas, Operações               |
| Avalanche | AVAX    | EVM     | Taxas                          |
| Bitcoin   | BTC     | UTXO    | Taxas, Custódia                |
| Litecoin  | LTC     | UTXO    | Taxas                          |
| Dogecoin  | DOGE    | UTXO    | Taxas                          |
| Tron      | TRX     | Account | Taxas (USDT-TRC20)             |
| Solana    | SOL     | Account | Taxas, Operações               |
| XRP       | XRP     | Account | Taxas                          |
| Cardano   | ADA     | eUTXO   | Taxas                          |
| Polkadot  | DOT     | Account | Taxas                          |
| Chainlink | LINK    | ERC-20  | Taxas                          |
| Shiba Inu | SHIB    | ERC-20  | Taxas                          |
| Multi     | MULTI   | EVM     | Multi-chain                    |

### 1.3 Tokens Suportados

Além das moedas nativas, o sistema suporta:

- **USDT** - Tether (Ethereum, Polygon, BSC, Tron, Avalanche, Base)
- **USDC** - USD Coin (Ethereum, Polygon, BSC, Avalanche, Base, Solana)
- **DAI** - Dai Stablecoin (redes EVM)
- **TRAY** - Trayon Token (Polygon)

---

## 2. ARQUITETURA ATUAL (v1)

### 2.1 Estrutura Existente

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA ATUAL (v1)                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              main_fees_wallet (única)                   │   │
│   │                                                         │   │
│   │   ├── 🔐 Mnemonic criptografada (12 palavras)          │   │
│   │   ├── 📍 16 endereços (um por rede)                    │   │
│   │   ├── 🔑 Private keys criptografadas                   │   │
│   │   │                                                     │   │
│   │   │   FUNÇÕES:                                          │   │
│   │   │   ├── ✅ Receber taxas P2P                         │   │
│   │   │   ├── ✅ Receber spread OTC                        │   │
│   │   │   ├── ✅ Receber crypto de vendas (SELL)           │   │
│   │   │   ├── ❌ Sacar para Ledger (NÃO IMPLEMENTADO)      │   │
│   │   │   └── ❌ Enviar para usuários (NÃO IMPLEMENTADO)   │   │
│   │   │                                                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Funcionalidades PRONTAS (v1)

#### ✅ Backend - Endpoints Disponíveis

| Endpoint                                                       | Método | Função                    | Status         |
| -------------------------------------------------------------- | ------ | ------------------------- | -------------- |
| `/admin/system-blockchain-wallet/create`                       | POST   | Criar carteira master     | ✅ Funcionando |
| `/admin/system-blockchain-wallet/status`                       | GET    | Status e saldos cache     | ✅ Funcionando |
| `/admin/system-blockchain-wallet/addresses`                    | GET    | Listar todos endereços    | ✅ Funcionando |
| `/admin/system-blockchain-wallet/address/{network}`            | GET    | Endereço de uma rede      | ✅ Funcionando |
| `/admin/system-blockchain-wallet/balance/{network}`            | GET    | Saldo real da blockchain  | ✅ Funcionando |
| `/admin/system-blockchain-wallet/refresh-balances`             | POST   | Atualizar saldos          | ✅ Funcionando |
| `/admin/system-blockchain-wallet/transactions`                 | GET    | Histórico de transações   | ✅ Funcionando |
| `/admin/system-blockchain-wallet/export-private-key/{network}` | GET    | Exportar private key      | ✅ Funcionando |
| `/admin/system-blockchain-wallet/add-missing-networks`         | POST   | Adicionar redes faltantes | ✅ Funcionando |

#### ✅ Frontend - Página Admin

**URL:** `http://localhost:3000/admin/system-wallet`

Funcionalidades disponíveis:

- 👁️ Visualizar saldos por rede
- 🔄 Atualizar saldos da blockchain em tempo real
- 📋 Copiar endereços para depósito
- 🔑 Exportar private key (com aviso de segurança)
- 📜 Ver mnemonic (apenas na criação)
- 📊 Ver histórico de transações

#### ✅ Serviços Backend

```python
# Arquivo: backend/app/services/system_blockchain_wallet_service.py

Funções disponíveis:
├── get_or_create_main_wallet()     # Criar/obter carteira
├── get_all_addresses()             # Listar todos endereços
├── get_receiving_address()         # Endereço para receber
├── get_private_key_for_sending()   # Obter private key (interno)
├── record_incoming_transaction()   # Registrar entrada
├── record_fee_collected()          # Registrar taxa coletada
└── add_missing_network_addresses() # Adicionar redes
```

### 2.3 Funcionalidades NÃO IMPLEMENTADAS (v1)

| Funcionalidade                          | Impacto                                      | Prioridade |
| --------------------------------------- | -------------------------------------------- | ---------- |
| ❌ Sacar para endereço externo (Ledger) | **CRÍTICO** - Não consegue retirar fundos    | 🔴 ALTA    |
| ❌ Enviar crypto para usuários          | **ALTO** - Compras manuais não funcionam     | 🔴 ALTA    |
| ❌ Transferência entre carteiras        | **MÉDIO** - Sem segregação de fundos         | 🟡 MÉDIA   |
| ❌ Múltiplas carteiras (HOT/COLD)       | **MÉDIO** - Risco de segurança               | 🟡 MÉDIA   |
| ❌ Limites de saque diário              | **BAIXO** - Sem proteção automática          | 🟢 BAIXA   |
| ❌ Rebalanceamento automático           | **BAIXO** - Manual é suficiente inicialmente | 🟢 BAIXA   |

### 2.4 Modelo de Dados Atual

```python
# Tabela: system_blockchain_wallets
class SystemBlockchainWallet:
    id: UUID                    # ID único
    name: str                   # "main_fees_wallet"
    wallet_type: str            # "fees" (suporta: fees, hot, cold)
    description: str            # Descrição
    encrypted_seed: str         # Mnemonic criptografada
    seed_hash: str              # Hash para verificação
    is_active: bool             # Ativa ou não
    is_locked: bool             # Bloqueada para saques
    created_by: UUID            # Admin que criou
    created_at: datetime        # Data criação

# Tabela: system_blockchain_addresses
class SystemBlockchainAddress:
    id: int                     # ID auto-increment
    wallet_id: UUID             # FK para wallet
    address: str                # Endereço blockchain
    network: str                # "polygon", "ethereum", etc.
    cryptocurrency: str         # "MATIC", "ETH", etc.
    encrypted_private_key: str  # Private key criptografada
    cached_balance: float       # Saldo em cache
    cached_usdt_balance: float  # USDT em cache
    cached_usdc_balance: float  # USDC em cache
    is_active: bool             # Ativo ou não
    label: str                  # "P2P Fees", etc.

# Tabela: system_wallet_transactions
class SystemWalletTransaction:
    id: UUID                    # ID único
    address_id: int             # FK para address
    tx_hash: str                # Hash da transação
    direction: str              # "in" ou "out"
    amount: float               # Valor
    cryptocurrency: str         # Moeda
    from_address: str           # Origem
    to_address: str             # Destino
    reference_type: str         # "p2p_fee", "otc_spread", etc.
    status: str                 # "pending", "confirmed", "failed"
    created_at: datetime        # Data
```

---

## 3. NOVA ARQUITETURA (v2) - 3 CARTEIRAS

### 3.1 Conceito

A nova arquitetura implementa **3 carteiras segregadas** para maior segurança:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOVA ARQUITETURA (v2) - 3 CARTEIRAS                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ❄️ COLD STORAGE              🔥 HOT OPERATIONS                  │   │
│  │  ┌─────────────────────┐     ┌─────────────────────┐            │   │
│  │  │ Armazena 95% saldo  │     │ Opera com 5% saldo  │            │   │
│  │  │                     │     │                     │            │   │
│  │  │ ├── Acesso manual   │     │ ├── Automático      │            │   │
│  │  │ ├── 2FA + Biometria │     │ ├── Limite $100k/dia│            │   │
│  │  │ ├── Delay 24h       │     │ ├── Envia p/ users  │            │   │
│  │  │ └── Saque → Ledger  │     │ └── Recebe de users │            │   │
│  │  └─────────────────────┘     └─────────────────────┘            │   │
│  │                                                                  │   │
│  │              💰 FEES COLLECTOR                                   │   │
│  │              ┌─────────────────────┐                            │   │
│  │              │ Recebe APENAS taxas │                            │   │
│  │              │                     │                            │   │
│  │              │ ├── P2P: 1%         │                            │   │
│  │              │ ├── OTC: spread     │                            │   │
│  │              │ ├── Swap: 0.5%      │                            │   │
│  │              │ └── Auto → COLD     │                            │   │
│  │              └─────────────────────┘                            │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de Fundos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE ENTRADA                                │
│                                                                         │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │   Trade P2P │──taxa──▶│             │         │             │       │
│  │   (1%)      │         │    💰       │ quando  │    ❄️       │       │
│  └─────────────┘         │   FEES      │──$10k──▶│   COLD      │       │
│                          │  COLLECTOR  │         │  STORAGE    │       │
│  ┌─────────────┐         │             │         │             │       │
│  │  Trade OTC  │─spread─▶│             │         │  (95% do    │       │
│  │  (2-5%)     │         └─────────────┘         │   saldo)    │       │
│  └─────────────┘                                 └─────────────┘       │
│                                                                         │
│  ┌─────────────┐         ┌─────────────┐                               │
│  │    Swap     │──fee───▶│    💰       │                               │
│  │   (0.5%)    │         │   FEES      │                               │
│  └─────────────┘         └─────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO OPERACIONAL                               │
│                                                                         │
│  USUÁRIO VENDE CRYPTO (Recebemos crypto):                               │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │   User      │──USDT──▶│    🔥       │ se      │    ❄️       │       │
│  │   Wallet    │         │    HOT      │─▶$50k──▶│   COLD      │       │
│  └─────────────┘         │ OPERATIONS  │         └─────────────┘       │
│                          └─────────────┘                               │
│                                                                         │
│  USUÁRIO COMPRA CRYPTO (Enviamos crypto):                               │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │    🔥       │──USDT──▶│   User      │ se      │    ❄️       │       │
│  │    HOT      │         │   Wallet    │◀─$10k──▶│   COLD      │       │
│  │ OPERATIONS  │         └─────────────┘         │ (reabastece)│       │
│  └─────────────┘                                 └─────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE SAQUE                                  │
│                                                                         │
│  SACAR PARA LEDGER (Manual pelo Admin):                                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │    ❄️       │  2FA +  │  Delay      │ após    │   LEDGER    │       │
│  │   COLD      │─Biometria─▶│  24h      │─────────▶│  (Externo)  │       │
│  │  STORAGE    │         │             │         │             │       │
│  └─────────────┘         └─────────────┘         └─────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Comparativo de Segurança

| Cenário                  | Arquitetura v1 (1 carteira) | Arquitetura v2 (3 carteiras)    |
| ------------------------ | --------------------------- | ------------------------------- |
| Hacker invade HOT wallet | ❌ **Perde TUDO**           | ✅ Perde apenas 5%              |
| Private key vazada       | ❌ Exposição total          | ✅ Apenas 1 wallet comprometida |
| Admin malicioso          | ❌ Pode drenar tudo         | ✅ COLD tem delay 24h           |
| Bug no código            | ❌ Perde tudo               | ✅ COLD isolada                 |
| Ataque de phishing       | ❌ Risco total              | ✅ Limite diário na HOT         |

### 3.4 Limites e Regras

| Carteira | Saldo Alvo   | Limite Diário  | Autorização     | Delay  |
| -------- | ------------ | -------------- | --------------- | ------ |
| **COLD** | 95% do total | Ilimitado      | 2FA + Biometria | 24h    |
| **HOT**  | 5% do total  | $100,000/dia   | Automático      | Nenhum |
| **FEES** | < $10,000    | Auto-transfere | Automático      | Nenhum |

---

## 4. ESPECIFICAÇÃO TÉCNICA

### 4.1 Novos Endpoints a Implementar

#### 4.1.1 Saque para Endereço Externo (PRIORITÁRIO)

```http
POST /admin/system-blockchain-wallet/send
Content-Type: application/json
Authorization: Bearer {token}
X-2FA-Code: 123456

{
    "wallet_name": "cold_storage",      # Qual carteira usar
    "network": "polygon",               # Rede blockchain
    "to_address": "0x...",              # Endereço Ledger
    "amount": "1000.00",                # Valor
    "token": "USDT",                    # "USDT", "USDC", "native"
    "memo": "Saque mensal para cold storage"  # Opcional
}
```

**Resposta Sucesso:**

```json
{
  "success": true,
  "data": {
    "tx_hash": "0x...",
    "from_address": "0x...",
    "to_address": "0x...",
    "amount": "1000.00",
    "token": "USDT",
    "network": "polygon",
    "status": "pending_confirmation",
    "estimated_confirmation": "2 minutes",
    "explorer_url": "https://polygonscan.com/tx/..."
  }
}
```

**Resposta Erro:**

```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Saldo insuficiente. Disponível: 500.00 USDT",
  "details": {
    "requested": 1000.0,
    "available": 500.0,
    "difference": 500.0
  }
}
```

#### 4.1.2 Criar Nova Carteira

```http
POST /admin/system-blockchain-wallet/create-wallet
Content-Type: application/json
Authorization: Bearer {token}
X-2FA-Code: 123456

{
    "name": "hot_operations",
    "wallet_type": "hot",               # "hot", "cold", "fees"
    "description": "Carteira quente para operações diárias",
    "daily_limit": 100000,              # Limite diário em USD
    "min_balance_alert": 10000,         # Alerta quando abaixo
    "max_balance_auto_transfer": 50000  # Auto-transfere quando acima
}
```

#### 4.1.3 Transferência Interna

```http
POST /admin/system-blockchain-wallet/internal-transfer
Content-Type: application/json
Authorization: Bearer {token}
X-2FA-Code: 123456

{
    "from_wallet": "hot_operations",
    "to_wallet": "cold_storage",
    "network": "polygon",
    "amount": "50000.00",
    "token": "USDT",
    "reason": "Excesso de saldo na HOT"
}
```

#### 4.1.4 Solicitar Reabastecimento

```http
POST /admin/system-blockchain-wallet/request-refill
Content-Type: application/json
Authorization: Bearer {token}

{
    "target_wallet": "hot_operations",
    "source_wallet": "cold_storage",
    "network": "polygon",
    "amount": "30000.00",
    "token": "USDT",
    "urgency": "normal"                 # "normal", "urgent"
}
```

### 4.2 Novos Modelos de Dados

```python
# Adicionar campos à tabela system_blockchain_wallets

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    daily_limit DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    daily_spent DECIMAL(20,2) DEFAULT 0;

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    daily_spent_reset_at TIMESTAMP DEFAULT NOW();

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    min_balance_alert DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    max_balance_auto_transfer DECIMAL(20,2) DEFAULT NULL;

ALTER TABLE system_blockchain_wallets ADD COLUMN IF NOT EXISTS
    auto_transfer_target_wallet VARCHAR(100) DEFAULT NULL;

# Nova tabela para solicitações de transferência
CREATE TABLE IF NOT EXISTS system_wallet_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet_id UUID REFERENCES system_blockchain_wallets(id),
    to_wallet_id UUID REFERENCES system_blockchain_wallets(id),
    to_external_address VARCHAR(255),           -- Se for saque externo
    network VARCHAR(50) NOT NULL,
    token VARCHAR(20) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',       -- pending, approved, executed, rejected, cancelled
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    executed_at TIMESTAMP,
    tx_hash VARCHAR(255),
    delay_until TIMESTAMP,                      -- Para saques com delay
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Service Layer - Novas Funções

```python
# backend/app/services/system_blockchain_wallet_service.py

class SystemBlockchainWalletService:

    # ==================== FUNÇÕES EXISTENTES ====================
    def get_or_create_main_wallet(...)        # ✅ Pronto
    def get_all_addresses(...)                # ✅ Pronto
    def get_receiving_address(...)            # ✅ Pronto
    def get_private_key_for_sending(...)      # ✅ Pronto
    def record_incoming_transaction(...)      # ✅ Pronto
    def record_fee_collected(...)             # ✅ Pronto

    # ==================== NOVAS FUNÇÕES ====================

    async def send_to_external(
        self,
        db: Session,
        wallet_name: str,
        network: str,
        to_address: str,
        amount: Decimal,
        token: str,
        admin_user_id: str,
        memo: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envia crypto da carteira do sistema para endereço externo (Ledger).

        Validações:
        1. Verifica se carteira existe e está ativa
        2. Verifica saldo suficiente
        3. Verifica limite diário (se aplicável)
        4. Verifica delay (se COLD wallet)
        5. Executa transação na blockchain
        6. Registra no histórico
        """
        pass

    async def internal_transfer(
        self,
        db: Session,
        from_wallet: str,
        to_wallet: str,
        network: str,
        amount: Decimal,
        token: str,
        admin_user_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transfere entre carteiras do sistema (HOT ↔ COLD).

        Não precisa de transação blockchain se mesma mnemonic.
        Apenas atualiza registros internos.
        """
        pass

    async def create_additional_wallet(
        self,
        db: Session,
        name: str,
        wallet_type: str,
        description: str,
        admin_user_id: str,
        daily_limit: Optional[Decimal] = None,
        min_balance_alert: Optional[Decimal] = None,
        max_balance_auto_transfer: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Cria carteira adicional (HOT ou COLD).

        Pode usar:
        - Mesma mnemonic (deriva novos endereços com índice diferente)
        - Nova mnemonic (carteira completamente separada)
        """
        pass

    async def check_and_rebalance(
        self,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        Verifica saldos e sugere/executa rebalanceamento.

        Regras:
        - HOT > max_balance → transfere para COLD
        - HOT < min_balance → solicita da COLD
        - FEES > threshold → consolida na COLD
        """
        pass

    async def get_wallet_by_name(
        self,
        db: Session,
        name: str
    ) -> Optional[SystemBlockchainWallet]:
        """Busca carteira pelo nome."""
        pass

    async def validate_external_address(
        self,
        network: str,
        address: str
    ) -> Dict[str, Any]:
        """
        Valida endereço externo antes do saque.

        Verifica:
        - Formato correto para a rede
        - Não é endereço de contrato (opcional)
        - Não está em blacklist
        """
        pass
```

### 4.4 Implementação de Envio Multi-Chain

```python
# backend/app/services/system_wallet_send_service.py

class SystemWalletSendService:
    """Serviço para enviar crypto das carteiras do sistema."""

    async def send_native_token(
        self,
        network: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """
        Envia token nativo (ETH, MATIC, BNB, etc.)
        """
        if network in ['ethereum', 'polygon', 'bsc', 'base', 'avalanche']:
            return await self._send_evm_native(network, from_address, private_key, to_address, amount)
        elif network == 'bitcoin':
            return await self._send_btc(from_address, private_key, to_address, amount)
        elif network == 'tron':
            return await self._send_trx(from_address, private_key, to_address, amount)
        elif network == 'solana':
            return await self._send_sol(from_address, private_key, to_address, amount)
        # ... outras redes

    async def send_erc20_token(
        self,
        network: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        token: str  # "USDT", "USDC", "DAI"
    ) -> Dict[str, Any]:
        """
        Envia token ERC-20 (USDT, USDC, etc.)
        """
        contract_address = self._get_token_contract(network, token)
        # ... implementação

    async def _send_evm_native(self, network, from_addr, pk, to_addr, amount):
        """Envia em redes EVM."""
        from web3 import Web3

        rpc_url = self._get_rpc_url(network)
        w3 = Web3(Web3.HTTPProvider(rpc_url))

        # Construir transação
        nonce = w3.eth.get_transaction_count(from_addr)
        gas_price = w3.eth.gas_price

        tx = {
            'nonce': nonce,
            'to': to_addr,
            'value': w3.to_wei(amount, 'ether'),
            'gas': 21000,
            'gasPrice': gas_price,
            'chainId': self._get_chain_id(network)
        }

        # Assinar e enviar
        signed = w3.eth.account.sign_transaction(tx, pk)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

        return {
            'success': True,
            'tx_hash': tx_hash.hex(),
            'explorer_url': self._get_explorer_url(network, tx_hash.hex())
        }
```

---

## 5. GUIA OPERACIONAL PARA ADMIN

### 5.1 Acessando o Painel

1. Faça login no admin: `https://app.holdwallet.com/admin`
2. No menu lateral, clique em **"System Wallet"**
3. URL direta: `https://app.holdwallet.com/admin/system-wallet`

### 5.2 Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💼 System Wallets Dashboard                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📊 VISÃO GERAL                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Total em Custódia: $520,800.00                                 │   │
│  │  ├── COLD: $485,230.00 (93.2%)                                  │   │
│  │  ├── HOT:  $32,150.00  (6.2%)                                   │   │
│  │  └── FEES: $3,420.00   (0.6%)                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ❄️ COLD STORAGE              🔥 HOT OPERATIONS                         │
│  ┌─────────────────────┐     ┌─────────────────────┐                   │
│  │ $485,230.00         │     │ $32,150.00          │                   │
│  │ ████████████████░░  │     │ ████░░░░░░░░░░░░░░  │                   │
│  │                     │     │                     │                   │
│  │ 🔒 Status: OK       │     │ ✅ Status: OK       │                   │
│  │                     │     │ Limite hoje: $67.8k │                   │
│  │ [Sacar] [Detalhes]  │     │ [Enviar] [Detalhes] │                   │
│  └─────────────────────┘     └─────────────────────┘                   │
│                                                                         │
│  💰 FEES COLLECTOR                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ $3,420.00 │ Coletado hoje: $1,250.00 │ [Consolidar Agora]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Operações Comuns

#### 5.3.1 Verificar Saldos

1. Acesse o dashboard
2. Clique em **"Atualizar Saldos"** para buscar dados em tempo real
3. Os saldos são atualizados automaticamente a cada 5 minutos

#### 5.3.2 Sacar para Ledger (v2)

1. Acesse a carteira **COLD STORAGE**
2. Clique em **"Sacar"**
3. Preencha:
   - **Rede:** Polygon (recomendado para USDT)
   - **Endereço:** Cole o endereço da sua Ledger
   - **Valor:** Ex: 10000
   - **Token:** USDT
4. Confirme com **2FA + Biometria**
5. Aguarde o **delay de 24 horas** (para valores > $50k)
6. Após o delay, a transação será processada

#### 5.3.3 Reabastecer HOT Wallet (v2)

1. Se a HOT estiver com saldo baixo:
   - Um alerta será exibido no dashboard
2. Clique em **"Solicitar Reabastecimento"**
3. Defina o valor (sugestão: $30,000)
4. Confirme com **2FA**
5. A transferência da COLD → HOT será processada

#### 5.3.4 Consolidar Taxas (v2)

1. As taxas acumuladas na FEES são consolidadas automaticamente quando > $10k
2. Para consolidar manualmente:
   - Clique em **"Consolidar Agora"**
   - Confirme a transferência FEES → COLD

### 5.4 Alertas e Notificações

| Alerta             | Condição        | Ação Recomendada             |
| ------------------ | --------------- | ---------------------------- |
| 🔴 **HOT Crítica** | Saldo < $5,000  | Reabastecer imediatamente    |
| 🟡 **HOT Baixa**   | Saldo < $15,000 | Agendar reabastecimento      |
| 🟡 **HOT Alta**    | Saldo > $60,000 | Transferir excesso para COLD |
| 🔵 **FEES Cheia**  | Saldo > $10,000 | Consolidar taxas             |
| 🔴 **COLD Baixa**  | Saldo < $50,000 | Verificar operações          |

### 5.5 Exportar Private Key (Emergência)

**⚠️ USE APENAS EM EMERGÊNCIAS!**

1. Acesse **System Wallet > Configurações**
2. Clique em **"Exportar Private Key"**
3. Selecione a rede
4. Confirme com **2FA + Biometria**
5. A private key será exibida **UMA VEZ**
6. **NUNCA** compartilhe ou salve em local inseguro

---

## 6. SEGURANÇA E BOAS PRÁTICAS

### 6.1 Níveis de Acesso

| Operação              | Nível Mínimo | Autenticação Adicional  |
| --------------------- | ------------ | ----------------------- |
| Visualizar saldos     | Admin        | -                       |
| Atualizar saldos      | Admin        | -                       |
| Ver endereços         | Admin        | -                       |
| Copiar endereços      | Admin        | -                       |
| Transferência interna | Super Admin  | 2FA                     |
| Sacar da HOT          | Super Admin  | 2FA                     |
| Sacar da COLD         | Super Admin  | 2FA + Biometria + Delay |
| Exportar private key  | Super Admin  | 2FA + Biometria         |
| Criar nova carteira   | Super Admin  | 2FA + Biometria         |

### 6.2 Checklist de Segurança

#### Diário

- [ ] Verificar saldos das 3 carteiras
- [ ] Verificar se há alertas pendentes
- [ ] Revisar transações do dia

#### Semanal

- [ ] Atualizar saldos da blockchain
- [ ] Verificar se há consolidação de taxas pendente
- [ ] Revisar limites e thresholds

#### Mensal

- [ ] Auditar histórico de transações
- [ ] Verificar se private keys estão seguras
- [ ] Testar processo de recuperação
- [ ] Revisar acessos de admins

### 6.3 Em Caso de Emergência

#### Suspeita de Invasão

1. **IMEDIATAMENTE:**
   - Acesse: **System Wallet > Emergência > Bloquear Todas**
   - Isso trava todas as carteiras para saques

2. **Em seguida:**
   - Mude a senha do admin comprometido
   - Revogue tokens de acesso
   - Verifique logs de atividade

3. **Recuperação:**
   - Após investigação, desbloqueie uma carteira por vez
   - Considere migrar fundos para novas carteiras

#### Private Key Vazada

1. **IMEDIATAMENTE:**
   - Transfira todos os fundos para nova carteira
   - A carteira comprometida nunca mais deve ser usada

2. **Criar nova carteira:**
   - Use a função "Criar Nova Carteira"
   - Gere nova mnemonic
   - Atualize configurações

### 6.4 Backup e Recuperação

#### O que fazer backup:

- ✅ Mnemonic (12 ou 24 palavras) - **OFFLINE APENAS**
- ✅ Lista de endereços por rede
- ❌ NUNCA salve private keys em arquivos digitais

#### Como fazer backup da mnemonic:

1. Escreva em papel (2 cópias)
2. Guarde em locais diferentes e seguros
3. Considere usar placa de metal para durabilidade
4. **NUNCA** tire foto ou salve digitalmente

#### Recuperação:

1. Com a mnemonic, é possível recuperar TODAS as carteiras
2. Use a função **"Importar Carteira"** no admin
3. Todas as private keys serão regeneradas automaticamente

---

## 7. PLANO DE IMPLEMENTAÇÃO

### 7.1 Cronograma

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CRONOGRAMA DE IMPLEMENTAÇÃO                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FASE 1: Função de Saque (URGENTE)                    ██████░░ 75%     │
│  ├── Tempo estimado: 4-6 horas                                         │
│  ├── Prioridade: 🔴 CRÍTICA                                            │
│  │                                                                      │
│  │   Tarefas:                                                           │
│  │   ├── [x] Analisar estrutura existente                              │
│  │   ├── [x] Documentar especificação                                   │
│  │   ├── [ ] Criar endpoint POST /send                                  │
│  │   ├── [ ] Implementar send_to_external()                            │
│  │   ├── [ ] Adicionar suporte multi-chain                             │
│  │   ├── [ ] Criar modal de saque no frontend                          │
│  │   └── [ ] Testar em testnet                                         │
│  │                                                                      │
│  FASE 2: Múltiplas Carteiras                          ░░░░░░░░ 0%      │
│  ├── Tempo estimado: 6-8 horas                                         │
│  ├── Prioridade: 🟡 ALTA                                               │
│  │                                                                      │
│  │   Tarefas:                                                           │
│  │   ├── [ ] Criar migration para novos campos                         │
│  │   ├── [ ] Implementar create_additional_wallet()                    │
│  │   ├── [ ] Criar endpoint POST /create-wallet                        │
│  │   ├── [ ] Criar as 3 carteiras (COLD, HOT, FEES)                    │
│  │   ├── [ ] Atualizar frontend para múltiplas carteiras               │
│  │   └── [ ] Testar fluxo completo                                     │
│  │                                                                      │
│  FASE 3: Transferências Internas                      ░░░░░░░░ 0%      │
│  ├── Tempo estimado: 4-6 horas                                         │
│  ├── Prioridade: 🟡 MÉDIA                                              │
│  │                                                                      │
│  │   Tarefas:                                                           │
│  │   ├── [ ] Implementar internal_transfer()                           │
│  │   ├── [ ] Criar endpoint POST /internal-transfer                    │
│  │   ├── [ ] Adicionar validações de limite                            │
│  │   ├── [ ] Implementar delay para COLD                               │
│  │   └── [ ] UI para transferências                                    │
│  │                                                                      │
│  FASE 4: Automação                                    ░░░░░░░░ 0%      │
│  ├── Tempo estimado: 4-6 horas                                         │
│  ├── Prioridade: 🟢 BAIXA                                              │
│  │                                                                      │
│  │   Tarefas:                                                           │
│  │   ├── [ ] Job de verificação de saldos                              │
│  │   ├── [ ] Sistema de alertas                                        │
│  │   ├── [ ] Auto-consolidação de FEES                                 │
│  │   ├── [ ] Dashboard de monitoramento                                │
│  │   └── [ ] Notificações por email/telegram                           │
│  │                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Detalhamento Fase 1

#### Backend

1. **Criar schema de request/response:**

```python
# backend/app/schemas/system_wallet.py

class SystemWalletSendRequest(BaseModel):
    wallet_name: str = "main_fees_wallet"
    network: str
    to_address: str
    amount: Decimal
    token: str = "native"
    memo: Optional[str] = None

class SystemWalletSendResponse(BaseModel):
    success: bool
    tx_hash: Optional[str]
    from_address: str
    to_address: str
    amount: str
    token: str
    network: str
    status: str
    explorer_url: Optional[str]
    error: Optional[str]
```

2. **Criar endpoint:**

```python
# backend/app/routers/admin/system_blockchain_wallet.py

@router.post("/send")
async def send_from_system_wallet(
    request: SystemWalletSendRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Verificar 2FA obrigatório
    # Verificar saldo
    # Executar envio
    # Registrar transação
    pass
```

3. **Implementar serviço de envio:**

```python
# backend/app/services/system_wallet_send_service.py

class SystemWalletSendService:
    async def send_from_wallet(self, ...):
        pass
```

#### Frontend

1. **Adicionar botão "Sacar" no dashboard**
2. **Criar modal de saque:**
   - Select de rede
   - Input de endereço (com validação)
   - Input de valor
   - Select de token
   - Confirmação 2FA
3. **Feedback de sucesso/erro**

### 7.3 Arquivos a Criar/Modificar

```
CRIAR:
├── backend/app/services/system_wallet_send_service.py   # Serviço de envio
├── backend/app/schemas/system_wallet.py                  # Schemas
├── backend/alembic/versions/xxx_add_wallet_limits.py    # Migration
└── Frontend/src/components/admin/SystemWalletSendModal.tsx

MODIFICAR:
├── backend/app/routers/admin/system_blockchain_wallet.py # Adicionar endpoints
├── backend/app/services/system_blockchain_wallet_service.py # Novas funções
├── backend/app/models/system_blockchain_wallet.py        # Novos campos
└── Frontend/src/pages/admin/AdminSystemWalletPage.tsx    # UI de saque
```

---

## 8. FAQ - PERGUNTAS FREQUENTES

### 8.1 Operacional

**P: Qual rede devo usar para sacar USDT?**
R: Recomendamos **Polygon** por ter taxas mais baixas ($0.01-0.05) e confirmação rápida (~2 segundos).

**P: Quanto tempo demora um saque?**
R:

- HOT Wallet: Imediato (2-30 segundos dependendo da rede)
- COLD Wallet: 24 horas de delay + tempo de confirmação

**P: Posso cancelar um saque?**
R: Sim, se ainda estiver no período de delay (COLD). Após iniciar a transação blockchain, não é possível cancelar.

**P: O que acontece se eu enviar para o endereço errado?**
R: Transações blockchain são irreversíveis. Sempre verifique o endereço 3x antes de confirmar.

### 8.2 Técnico

**P: Como a private key é protegida?**
R: A private key é criptografada com AES-256 usando a variável `ENCRYPTION_KEY` do ambiente. Apenas o backend pode descriptografá-la.

**P: O que é a mnemonic?**
R: É uma sequência de 12 ou 24 palavras que pode regenerar todas as private keys. Com ela, você pode recuperar todas as carteiras.

**P: Por que as redes EVM compartilham o mesmo endereço?**
R: Redes compatíveis com Ethereum (Polygon, BSC, Base, etc.) usam o mesmo formato de endereço. Uma mnemonic gera o mesmo endereço em todas elas.

### 8.3 Segurança

**P: O que fazer se suspeitar de invasão?**
R:

1. Bloqueie todas as carteiras imediatamente
2. Mude senhas
3. Revogue tokens
4. Verifique logs
5. Transfira fundos para novas carteiras se necessário

**P: Quem tem acesso às carteiras?**
R: Apenas usuários com role "Super Admin" podem executar operações sensíveis. Todas as ações são logadas.

**P: Como é feito o backup?**
R: A mnemonic deve ser escrita em papel e guardada offline em local seguro. Nunca salve digitalmente.

---

## 📞 SUPORTE

Em caso de dúvidas ou emergências:

- **Email:** suporte@holdwallet.com
- **Telegram:** @holdwallet_suporte
- **Documentação:** https://docs.holdwallet.com

---

_Documento gerado em 20/01/2026 | HOLDWallet v2.0_
