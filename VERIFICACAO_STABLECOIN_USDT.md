# 📊 VERIFICAÇÃO: Sistema de Stablecoin (USDT/USDC) - HOLDWallet

**Data:** 6 de Dezembro de 2025  
**Objetivo:** Verificar se o sistema de envio e recebimento de USDT está completo

---

## ✅ STATUS GERAL: PARCIALMENTE IMPLEMENTADO

O sistema possui **suporte base** para USDT/USDC, mas **precisa de ajustes e testes completos**.

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### 🔧 Backend - Serviços

#### ✅ Implementado

- [x] **Suporte a USDT/USDC em redes múltiplas**

  - Arquivo: `backend/app/services/wallet_service.py` (linha 25-32)
  - Stablecoins configurados como tipos de rede

- [x] **Price Client com suporte a Stablecoins**

  - Arquivo: `backend/app/clients/price_client.py` (linha 33-34)
  - Mapping: `"usdt": "tether"`, `"usdc": "usd-coin"`

- [x] **Transação Service genérico**

  - Arquivo: `backend/app/services/transaction_service.py`
  - Suporte para `token_address` (endereço do contrato)
  - Suporte para múltiplas redes

- [x] **Validação de endereços ERC-20**

  - Arquivo: `backend/app/services/crypto_service.py` (linha 334, 445)
  - Redes: Ethereum, Polygon, BSC, Base

- [x] **Portfolio Service inclui Stablecoins**

  - Arquivo: `backend/app/services/portfolio/portfolio_service.py`
  - Dados: USDC e USDT configurados

- [x] **P2P Service suporta USDT/USDC**
  - Arquivo: `backend/app/services/p2p/p2p_service.py`
  - Limites: Min 50, Max 100000 para ambos
  - Tempo de escrow: 15 minutos

#### 🔴 Pendente/Incompleto

- [ ] **Contrato ABI para USDT/USDC não encontrado**

  - Não há arquivo com ABI dos contratos ERC-20
  - Necessário para assinatura de transações de tokens

- [ ] **Gastos estimados para tokens**

  - Cálculo de gas para transferência de tokens não documentado
  - Pode estar em `transaction_service.py` mas não verificado

- [ ] **Tratamento específico para diferentes redes**
  - USDT em Tron (TRC-20) - pode precisar de ajuste
  - USDC em Solana - formato diferente
  - USDT em Arbitrum/Optimism - confirmação

---

### 🎨 Frontend - Interface

#### ✅ Implementado

- [x] **Seletor de Stablecoins na carteira**

  - Arquivo: `Frontend/src/pages/wallet/WalletPage.tsx` (linha 56)
  - Default: USDT selecionado
  - Comentário: "Token mais usado"

- [x] **Opções de Stablecoins no dropdown**

  - Arquivo: `Frontend/src/pages/wallet/WalletPage.tsx` (linha 1185)
  - Suporte visual para USDT e USDC

- [x] **Seletor de Rede para tokens**

  - Arquivo: `Frontend/src/pages/wallet/WalletPage.tsx` (linha 1179-1182)
  - Comentário: "Stablecoins (Mais Usados)"

- [x] **Suporte em página de trading (OTC)**

  - Arquivo: `Frontend/src/pages/trading/InstantTradePage.tsx`
  - Pares: USDT incluído em vários pares
  - Exemplo: BTC/USDT, ETH/USDT

- [x] **Portfolio com Stablecoins**

  - Arquivo: `Frontend/src/pages/portfolio/PortfolioPage.tsx` (linha 78)
  - USDT listado com dados de preço

- [x] **P2P com suporte a USDT**

  - Arquivo: `Frontend/src/pages/p2p/CreateOrderPage.tsx` (linha 29)
  - Opção: `{ symbol: 'USDT', name: 'Tether' }`

- [x] **Settings page com informações de redes suportadas**

  - Arquivo: `Frontend/src/pages/wallet/SettingsPage.tsx`
  - Detalha USDT/USDC em cada rede

- [x] **SendConfirmationModal**
  - Arquivo: `Frontend/src/components/wallet/SendConfirmationModal.tsx`
  - Função: Confirmação de transação

#### 🔴 Pendente/Incompleto

- [ ] **Página SendPage.tsx está vazia**

  - Arquivo: `Frontend/src/pages/wallet/SendPage.tsx`
  - Status: **CRÍTICO** - Lógica de envio não implementada

- [ ] **Hooks de envio incompletos**

  - Arquivo: `Frontend/src/hooks/useSendTransaction` (referenciado mas não verificado)
  - Precisa implementar lógica para tokens ERC-20

- [ ] **Validação de endereços de tokens**
  - Sem verificação específica para contratos USDT/USDC

---

### 🔗 API Endpoints

#### ✅ Implementado

```
POST /transactions/create
- Suporte a token_address
- Suporte a múltiplas redes
- Estimativa de fees

POST /transactions/sign
- Assinatura genérica

POST /transactions/broadcast
- Broadcast genérico para qualquer rede
```

#### 🔴 Pendente

- [ ] **Endpoint específico para envio de USDT**

  - Usar `/transactions/create` com `token_address`?
  - Precisa de documentação clara

- [ ] **Endpoint de saldo de tokens**
  - Saldo de USDT por carteira/endereço
  - Endpoint: `/wallet/{wallet_id}/balance/usdt` ?

---

## 🔍 Análise Detalhada por Componente

### 1️⃣ Backend - Roteadores

**Arquivo:** `backend/app/routers/transactions.py`

```python
✅ POST /transactions/create
- from_address: Endereço origem
- to_address: Endereço destino
- amount: Valor
- network: Rede (suporta múltiplas)
- fee_preference: slow/standard/fast
- token_address: ENDEREÇO DO CONTRATO USDT/USDC ← CRITICO
```

**Status:** ✅ Endpoint existe, mas:

- Precisa testar com endereço real de USDT
- Precisa confirmar cálculo de decimais (USDT usa 6, não 18)

---

### 2️⃣ Serviço de Transação

**Arquivo:** `backend/app/services/transaction_service.py`

```python
✅ Suporta token_address
✅ Suporta múltiplas redes
✅ Estimativa de fees
✅ Validação de saldo

❌ Conversão de decimais
❌ Validação de contrato USDT/USDC
❌ Tratamento de revert/erro de contrato
```

---

### 3️⃣ Frontend - Página de Envio

**Status:** 🔴 **CRÍTICO**

```
SendPage.tsx → ARQUIVO VAZIO!
```

**O que falta:**

1. Interface para selecionar token (USDT, USDC, etc)
2. Input de quantidade
3. Validação de endereço
4. Estimativa de fees
5. Confirmação de envio

---

## 📱 Fluxo de Envio de USDT (Atual)

```
1. Usuário acessa WalletPage
   ✅ Seleciona USDT do dropdown

2. Clica em "Send" (tab)
   ❌ SendPage vazia - falta implementação

3. Deveria:
   - Escolher qual rede (Polygon, ETH, BSC, etc)
   - Inserir endereço de destino
   - Inserir quantidade
   - Ver taxa de gas
   - Confirmar e assinar
   - Broadcast na rede
```

---

## 🛠️ O Que Funciona Hoje

### ✅ Leitura de Saldos

- Backend: `GET /wallet/{wallet_id}/balance` - suporta múltiplas redes
- Frontend: Mostra saldos em WalletPage

### ✅ Preços

- USDT via CoinGecko (sempre ~$1.00)
- USDC via CoinGecko (sempre ~$1.00)

### ✅ Informações

- Settings page detalha suporte em cada rede
- P2P marketplace já usa USDT/USDC

---

## 🚨 O Que NÃO Funciona

### 🔴 CRÍTICO

1. **SendPage.tsx está vazia**

   - Usuário não consegue enviar USDT
   - Precisa ser preenchida

2. **Token decimals não tratados**

   - USDT: 6 decimais
   - USDC: 6 decimais
   - Código assume 18 (ERC-20 padrão)

3. **ABI dos contratos não encontrado**
   - Não há forma de codificar função transfer
   - Necessário para assinar transação

### 🟠 ALTO

4. **Falta teste end-to-end**

   - Nunca foi testado envio real de USDT
   - Pode ter bugs não documentados

5. **Redes não confirmadas**
   - Qual é o endereço do contrato USDT em cada rede?
   - Qual é o endereço do contrato USDC em cada rede?

---

## 📋 Checklist para Completar

### Fase 1: Backend (Essencial)

- [ ] **Criar arquivo `token_contracts.py`**

  ```python
  USDT_CONTRACTS = {
      'ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      'bsc': '0x55d398326f99059fF775485246999027B3197955',
      'arbitrum': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      'optimism': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      'base': '0x833589fC3F5dA236344f6d5f6644b87cfc8CC28c',  # USDC
      # ... mais redes
  }
  ```

- [ ] **Implementar conversão de decimals**

  ```python
  def get_token_decimals(token_symbol: str) -> int:
      if token_symbol in ['USDT', 'USDC']:
          return 6
      return 18  # ERC-20 padrão
  ```

- [ ] **Adicionar ABI de token**

  ```python
  USDT_ABI = [...]  # Função transfer(to, amount)
  ```

- [ ] **Testar `/transactions/create` com USDT real**

### Fase 2: Frontend

- [ ] **Implementar SendPage.tsx**

  ```tsx
  - Seletor de token (USDT, USDC, BTC, ETH, etc)
  - Seletor de rede
  - Input de endereço
  - Input de quantidade
  - Estimativa de fees
  - Botão confirmar
  ```

- [ ] **Completar useSendTransaction hook**

  - Suporte a token_address
  - Validação de contrato
  - Assinatura de token transfer

- [ ] **Testes na interface**

---

## 🧪 Testes Necessários

### Backend

```bash
# 1. Criar transação USDT em Polygon
POST /transactions/create
{
  "from_address": "0x...",
  "to_address": "0x...",
  "amount": "10",
  "network": "polygon",
  "token_address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  "fee_preference": "standard"
}

# 2. Assinar transação
POST /transactions/sign
{
  "transaction_id": 1,
  "password": "user_password"
}

# 3. Broadcast
POST /transactions/broadcast
{
  "transaction_id": 1,
  "signed_transaction": "0x..."
}
```

### Frontend

```
1. Abrir WalletPage
2. Selecionar USDT
3. Ir para tab "Send"
4. Inserir endereço de teste
5. Inserir quantidade (ex: 10 USDT)
6. Clicar "Preview"
7. Confirmar
8. Assinar transação
9. Verificar no blockchain explorer
```

---

## 📊 Resumo de Implementação

| Componente        | Status | Prioridade | ETA       |
| ----------------- | ------ | ---------- | --------- |
| Backend Service   | ✅ 70% | 🔴 ALTA    | 1-2 dias  |
| API Endpoints     | ✅ 70% | 🔴 ALTA    | 1 dia     |
| Contratos Token   | ❌ 0%  | 🔴 CRÍTICA | 2-3 horas |
| Frontend SendPage | ❌ 0%  | 🔴 CRÍTICA | 2-3 dias  |
| Testes            | ❌ 0%  | 🟠 ALTA    | 1-2 dias  |
| Documentação      | ✅ 30% | 🟡 MÉDIA   | 1 dia     |

---

## 🎯 Recomendações

### 1. IMEDIATO (Próximas 2 horas)

```
1. Criar arquivo com endereços de contratos USDT/USDC
2. Implementar conversão de decimals
3. Adicionar ABI de token ERC-20
```

### 2. HOJE (Próximas 6 horas)

```
4. Testar envio de USDT no backend
5. Criar testes unitários
6. Documentar endpoints
```

### 3. AMANHÃ

```
7. Implementar SendPage.tsx
8. Completar frontend
9. Testes E2E
10. Deploy
```

---

## 📝 Arquivos Relevantes

```
Backend:
✅ app/main.py - API principal
✅ app/routers/transactions.py - Endpoints
✅ app/services/transaction_service.py - Lógica
✅ app/services/wallet_service.py - Carteiras
❌ app/config/token_contracts.py - NÃO EXISTE

Frontend:
✅ pages/wallet/WalletPage.tsx - Carteira
❌ pages/wallet/SendPage.tsx - VAZIO
✅ hooks/useSendTransaction.ts - Referenciado mas incompleto
✅ components/wallet/SendConfirmationModal.tsx - Modal
```

---

## ✨ Conclusão

**O sistema de USDT está ~60% implementado no backend, mas o frontend está incompleto.**

### Para ter USDT 100% funcional:

1. ✅ Backend: 2-3 horas
2. ❌ Frontend: 2-3 dias
3. ❌ Testes: 1-2 dias

**Total: 3-5 dias de desenvolvimento**

---

**Próximo passo?** Qual fase você quer que eu comece a implementar?

- [ ] Backend completo (contratos + testes)
- [ ] Frontend (SendPage + interface)
- [ ] Ambos

Avisa para eu começar! 🚀
