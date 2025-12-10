# 📋 PADRÃO DE MOEDAS E CONVERSÃO

## 🎯 Regra Ouro

```
BACKEND SEMPRE RETORNA EM USD
FRONTEND CONVERTE PARA BRL CONFORME SETTINGS
```

---

## 🔄 Fluxo de Dados

### Backend (FastAPI)

```
API Retorna:
{
  "balance_usd": "24.88",
  "balance_brl": "(calculado aqui, não mais)",
  "price": 0.67        ← SEMPRE EM USD
}
```

### Frontend (React)

```
1. Recebe dados em USD do backend
2. Lê preferência de moeda em useCurrencyStore.currency
   - Se USD: mostra $24.88
   - Se BRL: converte para R$ 124.40 (USD 24.88 × 5)
   - Se EUR: converte para €22.89 (USD 24.88 × 0.92)
3. Formata usando Intl.NumberFormat
```

---

## 📊 Taxas de Câmbio (USD base)

```typescript
const EXCHANGE_RATES = {
  USD: 1, // Base
  BRL: 5, // 1 USD = 5 BRL
  EUR: 0.92, // 1 USD = 0.92 EUR
};
```

---

## 🛠️ Como Usar em Componentes

### ✅ CORRETO

```tsx
import { useCurrencyStore } from "@/stores/useCurrencyStore";

export const MyComponent = () => {
  const { formatCurrency } = useCurrencyStore();

  // Backend retorna em USD
  const priceUSD = 24.88;

  // Frontend formata conforme preferência
  return <div>{formatCurrency(priceUSD)} // Mostra $24.88 ou R$ 124.40</div>;
};
```

### ❌ ERRADO

```tsx
// NÃO faça conversões manuais
const converted = price * 5; // Errado! Use formatCurrency()

// NÃO solicite BRL do backend
const response = await fetch("/api/prices?currency=brl");
// Sempre solicite USD!
const response = await fetch("/api/prices?currency=usd");
```

---

## 📁 Arquivos Modificados

### Backend

- ✅ `/backend/app/routers/wallets.py`
  - Retorna SEMPRE `balance_usd`
  - Removido `balance_brl` (calculado no frontend)
  - Fallback prices em USD

### Frontend

- ✅ `/Frontend/src/stores/useCurrencyStore.ts`
  - `formatCurrency()` converte USD → moeda selecionada
- ✅ `/Frontend/src/services/currency-converter-service.ts`
  - USD é base (antes era BRL)
  - Taxas: 1 USD = 5 BRL, 1 USD = 0.92 EUR

---

## 📄 Páginas que Precisam Atualizar

- [ ] WalletPage.tsx - Verificar formatCurrency
- [ ] InstantTradePage.tsx - Não mais usar convertFromBRL
- [ ] MarketPricesCarousel.tsx - Não mais usar convertFromBRL
- [ ] P2PPage.tsx - Verificar formatCurrency
- [ ] DashboardPage.tsx - Se tiver saldo total

---

## 🚀 Checklist Final

- ✅ Backend retorna USD
- ✅ Frontend converte conforme settings
- ✅ Taxas de câmbio corretas (1 USD = 5 BRL)
- ✅ formatCurrency() centralizado no Zustand store
- ⏳ Atualizar todas as páginas para usar o padrão

---

## 💡 Exemplo de Conversão Correta

```
Backend retorna: price_usd = 24.88

Se moeda = USD:
  formatCurrency(24.88) → "$24.88"

Se moeda = BRL:
  formatCurrency(24.88) → "R$ 124.40"
  (24.88 × 5 = 124.40)

Se moeda = EUR:
  formatCurrency(24.88) → "€22.89"
  (24.88 × 0.92 = 22.89)
```
