# 💰 Como USDT Será Exibido na Visão Geral

## 🎯 Resposta à Sua Pergunta: "Como vai mostrar quanto eu tenho em USDT?"

---

## ✅ Resposta Curta

**O saldo de USDT aparecerá automaticamente na Visão Geral do Wallet (WalletPage) se:**

1. ✅ Você tiver USDT na carteira (em qualquer rede: Polygon, Ethereum, BSC, etc)
2. ✅ Preferência de tokens USDT estiver **ATIVADA** (padrão: SIM)
3. ✅ Quando carregar a página, o backend busca saldos

**Exemplo do que você verá:**

```
┌─────────────────────────────────────────────────┐
│ 📊 VISÃO GERAL - SALDOS DA CARTEIRA             │
├─────────────────────────────────────────────────┤
│                                                  │
│ Bitcoin (BTC): 0 BTC = $0.00                   │
│ Ethereum (ETH): 0.5 ETH = $2,000.00           │
│ Polygon (MATIC): 6 MATIC = $6.50               │
│ Polygon (USDT): 100.50 USDT = $100.50 USD     │  ← AQUI! 🎉
│ BNB Smart Chain (BNB): 0 BNB = $0.00          │
│ BNB Smart Chain (USDT): 50 USDT = $50.00 USD  │  ← Pode ter em várias redes
│                                                  │
│ 💰 TOTAL: $2,157.00 USD                        │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Como Funciona Internamente

### Etapa 1: Backend Busca Saldos

Quando você abre a WalletPage:

```python
# Backend: GET /wallets/{wallet_id}/balances
{
  "balances": {
    "polygon": {
      "network": "polygon",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "6",              # 6 MATIC
      "balance_usd": "6.50",
      "balance_brl": "32.50"
    },

    "polygon_usdt": {              # 🔑 NOVO!
      "network": "polygon (USDT)",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "100.50",         # 100.50 USDT
      "balance_usd": "100.50",
      "balance_brl": "502.50"
    },

    "ethereum": {
      "network": "ethereum",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "0.5",            # 0.5 ETH
      "balance_usd": "2000.00",
      "balance_brl": "10000.00"
    }
  },
  "total_usd": "2107.00"
}
```

### Etapa 2: Backend Calcula Saldos de Tokens

```python
# No backend (wallets.py):
for address_obj in addresses:
    balance_data = await blockchain_service.get_address_balance(
        address_str,
        network_str,
        include_tokens=True  # 🔑 AGORA BUSCA TOKENS!
    )

    # Retorna exemplo:
    # {
    #   "native_balance": "6",
    #   "token_balances": {
    #     "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": {
    #       "balance": "100500000",  # 100.5 USDT (com 6 decimals)
    #       "decimals": 6
    #     }
    #   }
    # }

    # Identifica USDT por endereço do contrato:
    if token_addr == USDT_CONTRACTS["polygon"]:
        # É USDT! Adiciona à resposta como "polygon_usdt"
        balances_by_network["polygon_usdt"] = NetworkBalanceDetail(
            network="polygon (USDT)",
            address=address_str,
            balance="100.50",       # Convertido de wei
            balance_usd="100.50",   # USDT = ~$1.00
            balance_brl="502.50"    # Conversão USD → BRL
        )
```

### Etapa 3: Frontend Itera e Exibe

```typescript
// No WalletPage.tsx:
const wallets = useMemo(() => {
  const expandedWallets = [];

  const balancesData = balanceQuery?.data || {};

  // Itera sobre TODAS as entradas:
  // polygon, polygon_usdt, polygon_usdc, ethereum, ethereum_usdt, etc
  Object.entries(balancesData).forEach(([networkKey, balanceData]) => {
    expandedWallets.push({
      id: networkKey,
      name: balanceData.network, // "Polygon (USDT)"
      symbol: networkKey.includes("usdt")
        ? "USDT"
        : networkKey.includes("usdc")
        ? "USDC"
        : "MATIC", // "USDT"
      balance: parseFloat(balanceData.balance), // 100.50
      balanceUSD: parseFloat(balanceData.balance_usd), // 100.50
      balanceBRL: parseFloat(balanceData.balance_brl), // 502.50
    });
  });

  return expandedWallets;
}, [balanceQuery]);
```

---

## 🎨 Como Será Exibido na UI

### Na Visão Geral (WalletPage)

```
┌─────────────────────────────────────────────────────────────┐
│                     💰 SALDOS                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟠 Bitcoin (BTC)                          0 BTC = $0.00   │
│  🔵 Ethereum (ETH)                    0.5 ETH = $2,000.00  │
│  🟣 Polygon (MATIC)                      6 MATIC = $6.50   │
│  💚 Polygon (USDT)  ← 🎉 NOVO!    100.50 USDT = $100.50   │
│  🟡 BNB Smart Chain (BNB)              0 BNB = $0.00       │
│  💚 BNB Smart Chain (USDT) ← TAMBÉM!  50 USDT = $50.00    │
│                                                              │
│                        Total: $2,157.00                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Em Cada Item de Saldo

```
┌─────────────────────────────────────────────────────────────┐
│ 💚 Polygon (USDT)                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Saldo: 100.50 USDT                                         │
│  Valor USD: $100.50                                         │
│  Valor BRL: R$ 502.50                                       │
│  Endereço: 0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6     │
│                                                              │
│  [Enviar] [Receber] [Ver no Explorer]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Com Preferências de Tokens

### Se USDT está ATIVADO (Padrão)

```
Mostra:
✅ Polygon (USDT): 100.50 USDT = $100.50
✅ Ethereum (USDT): 50 USDT = $50.00
```

### Se Você Desativa USDT nas Preferências

```
Wallet > Settings > Desativar USDT

Resultado:
❌ Polygon (USDT): DESAPARECE
❌ Ethereum (USDT): DESAPARECE
```

### Se Você Reativa

```
Wallet > Settings > Reativar USDT

Resultado:
✅ Polygon (USDT): 100.50 USDT = $100.50 (REAPARECE)
```

---

## 📱 Estrutura de Dados Completa

### O que o Backend Retorna

```json
{
  "wallet_id": "cdfd5281-483a-4f4b-ad70-290d65d2216d",
  "wallet_name": "Minha Carteira Multi",
  "balances": {
    "bitcoin": {
      "network": "bitcoin",
      "address": "1A1z7agoat...",
      "balance": "0",
      "balance_usd": "0.00",
      "balance_brl": "0.00"
    },

    "ethereum": {
      "network": "ethereum",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "0.5",
      "balance_usd": "2000.00",
      "balance_brl": "10000.00"
    },

    "ethereum_usdt": {
      "network": "ethereum (USDT)",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "50.00",
      "balance_usd": "50.00",
      "balance_brl": "250.00"
    },

    "polygon": {
      "network": "polygon",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "6",
      "balance_usd": "6.50",
      "balance_brl": "32.50"
    },

    "polygon_usdt": {
      "network": "polygon (USDT)",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "100.50",
      "balance_usd": "100.50",
      "balance_brl": "502.50"
    },

    "polygon_usdc": {
      "network": "polygon (USDC)",
      "address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
      "balance": "25.00",
      "balance_usd": "25.00",
      "balance_brl": "125.00"
    }
  },
  "total_usd": "2182.00",
  "total_brl": "10910.00"
}
```

---

## 🔄 Fluxo Completo de Exibição

```
1. Usuário abre WalletPage
   ↓
2. Frontend carrega useMultipleWalletBalances([wallet_id])
   ↓
3. Backend: GET /wallets/{wallet_id}/balances
   ├─ Busca native_balance para cada rede
   ├─ Busca token_balances (USDT, USDC)
   ├─ Identifica por endereço de contrato
   └─ Retorna: polygon, polygon_usdt, polygon_usdc, ethereum, ethereum_usdt...
   ↓
4. Frontend recebe resposta
   ├─ Filtra por tokenPreferences (mostra USDT? SIM)
   ├─ Itera sobre polygon, polygon_usdt, polygon_usdc, ethereum...
   └─ Cria entrada para cada um
   ↓
5. UI Renderiza
   ├─ 🟣 Polygon (MATIC): 6 MATIC = $6.50
   ├─ 💚 Polygon (USDT): 100.50 USDT = $100.50
   ├─ 💚 Polygon (USDC): 25.00 USDC = $25.00
   ├─ 🔵 Ethereum (ETH): 0.5 ETH = $2,000.00
   └─ 💚 Ethereum (USDT): 50.00 USDT = $50.00
   ↓
6. Usuário Vê:
   ✅ "Tenho 100.50 USDT na Polygon = $100.50"
   ✅ "Tenho 50 USDT na Ethereum = $50.00"
   ✅ "Total: $100.50 + $50.00 = $150.50 em USDT"
```

---

## ✅ Checklist de Visualização

- [x] Backend retorna saldos de USDT/USDC
- [x] Frontend filtra por tokenPreferences
- [x] UI mostra "Polygon (USDT)" junto com "Polygon (MATIC)"
- [x] Exibe valores em USD e BRL
- [x] Calcula total geral incluindo tokens
- [x] Permite esconder/mostrar por preferences

---

## 🎯 Resumo Final

**Você receberá USDT:**

```
Visão Geral → "Polygon (USDT): 100.50 USDT = $100.50"
```

**Será mostrado automaticamente se:**

- ✅ Houver USDT na carteira
- ✅ Preferência USDT estiver ativada

**Se não aparecer:**

1. Verifique: Wallet > Settings > USDT está ativado?
2. Verifique: Tem USDT realmente? (Pode estar em 0)
3. Recarregue a página (F5)

**Para enviar USDT recebido:**

- Vá para "Enviar"
- Selecione "USDT" na lista de tokens
- Digite endereço, valor e envie!

---

**Status**: ✅ Pronto para teste!
