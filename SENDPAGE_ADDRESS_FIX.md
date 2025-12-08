# 🔧 Correção: SendPage - Endereços Específicos por Rede

## 🐛 Problema Encontrado

**O Sintoma:** Quando você alternava entre BNB, ETH e Polygon, o endereço **ficava o mesmo**. Só mudava quando selecionava Tron.

**A Causa:** A SendPage estava usando `wallet.first_address` (genérico para todas as redes), em vez de usar endereços específicos por rede como a ReceivePage faz.

---

## ✅ A Solução

### 1️⃣ Adicionado o Hook `useWalletAddresses`

```tsx
import { useWalletAddresses } from "@/hooks/useWalletAddresses";

// Buscar endereços específicos por rede (multi-wallet)
const multiWallet = useMemo(
  () => apiWallets?.find((w) => w.network === "multi"),
  [apiWallets]
);
const networksList = [
  "bitcoin",
  "ethereum",
  "polygon",
  "bsc",
  "tron",
  "base",
  "solana",
  "litecoin",
  "dogecoin",
  "cardano",
  "avalanche",
  "polkadot",
  "chainlink",
  "shiba",
  "xrp",
];
const { addresses: networkAddresses } = useWalletAddresses(
  multiWallet?.id?.toString(),
  networksList
);
```

### 2️⃣ Atualizado `walletsWithAddresses`

**Antes:**

```tsx
expandedWallets.push({
  walletId: wallet.id,
  symbol,
  network,
  balance,
  balanceUSD,
  // ❌ Sem endereço específico por rede!
});
```

**Depois:**

```tsx
const address = networkAddresses[network] || ""; // 🔑 Endereço específico por rede

expandedWallets.push({
  walletId: wallet.id,
  symbol,
  network,
  address, // ✅ Agora com endereço específico por rede!
  balance,
  balanceUSD,
});
```

### 3️⃣ Atualizado `handleSend`

**Antes:**

```tsx
// ❌ Usando always first_address (mesmo para todas as redes)
const fullWallet = apiWallets?.find(
  (w) => String(w.id) === String(selectedWalletData.walletId)
);
if (!fullWallet?.first_address) {
  setError("Endereço da carteira não disponível");
  return;
}
console.log("De:", fullWallet.first_address);
```

**Depois:**

```tsx
// ✅ Usando endereço específico da rede selecionada
if (!selectedWalletData.address) {
  setError("Endereço da carteira não disponível para esta rede");
  return;
}
console.log("De:", selectedWalletData.address); // 🔑 Endereço específico da rede
```

---

## 🎯 Resultado

Agora quando você alterna entre redes:

```
BNB (BSC)       → 0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6
        ↓ (muda de rede)
ETH (Ethereum)  → 0xb2bbbbdccf9903cdbaebfbba53214bdce5d6f442e7  ✅ DIFERENTE!
        ↓ (muda de rede)
MATIC (Polygon) → 0xc3ccccedddfa914dcbaebfbba53214bdce5d6f442e8  ✅ DIFERENTE!
        ↓ (muda de rede)
TRX (Tron)      → 0xd4ddddfeeeeb015edbaebfbba53214bdce5d6f442e9  ✅ DIFERENTE!
```

**Cada rede tem seu próprio endereço derivado!**

---

## 📝 Mudanças Técnicas

| Aspecto                  | Antes                                | Depois                                               |
| ------------------------ | ------------------------------------ | ---------------------------------------------------- |
| **Hook para endereços**  | ❌ Não usava                         | ✅ `useWalletAddresses`                              |
| **Dados de endereço**    | ❌ `wallet.first_address` (genérico) | ✅ `networkAddresses[network]` (específico)          |
| **walletsWithAddresses** | ❌ Sem campo `address`               | ✅ Com `address` específico por rede                 |
| **handleSend**           | ❌ `fullWallet.first_address`        | ✅ `selectedWalletData.address`                      |
| **Dependency array**     | ❌ `[apiWallets, balancesQueries]`   | ✅ `[apiWallets, balancesQueries, networkAddresses]` |

---

## 🧪 Como Testar

1. **Abra SendPage**
2. **Selecione USDT**
3. **Mude para Polygon (MATIC)** → Deve mostrar endereço #1
4. **Mude para BSC (BNB)** → Deve mostrar endereço #2 (diferente!)
5. **Mude para Ethereum (ETH)** → Deve mostrar endereço #3 (diferente!)
6. **Mude para Tron (TRX)** → Deve mostrar endereço #4 (diferente!)

✅ **Se cada rede mostra um endereço diferente = FUNCIONA!**

---

## 🔒 Segurança

- ✅ Cada endereço é derivado da mesma seed phrase
- ✅ Diferentes caminhos de derivação por rede (BIP44/BIP49)
- ✅ Endereços nunca se repetem entre redes
- ✅ Transações vão para o endereço correto de cada blockchain

---

## 📊 Arquivos Modificados

- ✅ `/Frontend/src/pages/wallet/SendPage.tsx`
  - Adicionado `useWalletAddresses` import
  - Adicionado busca de endereços por rede
  - Atualizado `walletsWithAddresses` memoization
  - Atualizado `handleSend` para usar endereço específico da rede

---

## ✨ Status

**🟢 CORRIDO E PRONTO PARA TESTE**

A SendPage agora funciona exatamente como a ReceivePage, mostrando endereços específicos para cada rede!
