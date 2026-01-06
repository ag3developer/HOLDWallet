# 🏦 HOLD Wallet - Sistema de Moedas (Enterprise Grade)

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                    │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │ Components  │───>│ useCurrencyStore │───>│ CurrencyManager   │  │
│  │ (UI)        │    │ (Zustand)        │    │ (Singleton)       │  │
│  └─────────────┘    └──────────────────┘    └───────────────────┘  │
│                                                      │              │
│                                                      ▼              │
│                                            ┌──────────────────┐    │
│                                            │ Exchange Rate API│    │
│                                            │ (Real Rates)     │    │
│                                            └──────────────────┘    │
└───────────────────────────────────│─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                     │
│                   (Sempre retorna USD)                              │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔑 Regras de Ouro

### 1. Backend → SEMPRE USD

```python
# ✅ CORRETO
return {"balance": 100.00}  # USD

# ❌ ERRADO
return {"balance": 610.00, "currency": "BRL"}
```

### 2. Frontend → Converte na Exibição

```typescript
// ✅ CORRETO - usar formatCurrency
const { formatCurrency } = useCurrencyStore()
<span>{formatCurrency(price)}</span>  // R$ 610,00 ou $100.00

// ❌ ERRADO - mostrar valor direto
<span>${price}</span>
```

### 3. Enviar ao Backend → Converter para USD

```typescript
// ✅ CORRETO
const { convertToUSD } = useCurrencyStore()
const amountUSD = convertToUSD(valorEmBRL)
api.post('/orders', { amount: amountUSD }) // Envia em USD

// ❌ ERRADO
api.post('/orders', { amount: valorEmBRL }) // Envia em BRL
```

## 📦 Módulos

### CurrencyManager (`/services/currency/CurrencyManager.ts`)

Singleton centralizado que gerencia taxas de câmbio.

```typescript
import { currencyManager, fromUSD, toUSD } from '@/services/currency'

// Converter USD para BRL
const brl = fromUSD(100, 'BRL') // ~610

// Converter BRL para USD
const usd = toUSD(610, 'BRL') // ~100

// Obter taxa
const rate = currencyManager.getRate('USD', 'BRL') // ~6.10

// Status
const status = currencyManager.getStatus()
// { rates: {...}, source: 'api', lastUpdate: Date, isStale: false }
```

### useCurrencyStore (`/stores/useCurrencyStore.ts`)

Store Zustand para componentes React.

```typescript
const {
  currency, // 'USD' | 'BRL' | 'EUR'
  setCurrency, // Mudar moeda
  formatCurrency, // Formatar valor USD → moeda do usuário
  formatCurrencyRaw, // Converter sem formatação
  convertToUSD, // Converter para USD (enviar ao backend)
  getExchangeRate, // Taxa atual
} = useCurrencyStore()
```

### PriceService (`/services/price-service.ts`)

Busca preços de criptomoedas com conversão automática.

```typescript
import PriceService from '@/services/price-service'

// Preços já vêm convertidos para moeda do usuário
const prices = await PriceService.getPrices(['BTC', 'ETH'], 'BRL')
// { BTC: { price: 610000 }, ETH: { price: 18300 } }  // em BRL
```

## 🔄 Fluxo de Dados

### Exibição de Valores

```
Backend (USD) → PriceService → CurrencyManager.convert() → UI (BRL/EUR/USD)
```

### Envio de Valores

```
UI (BRL/EUR) → convertToUSD() → Backend (USD)
```

## ⚡ Cache

### Taxas de Câmbio

- **TTL:** 1 hora
- **Stale:** 24 horas (usa se API falhar)
- **Storage:** localStorage

### Preços de Cripto

- **TTL:** 5 minutos
- **Storage:** localStorage
- **Versionado:** Limpa cache ao atualizar versão

## 🛡️ Fallback

Se a API de câmbio falhar:

1. Tenta usar cache (mesmo expirado, até 24h)
2. Usa taxas de fallback conservadoras:
   - USD: 1
   - BRL: 6.1
   - EUR: 0.92

## 📊 Logs

```
[CurrencyManager] 🏦 Initializing...
[CurrencyManager] ✅ Using cached rates: { USD: 1, BRL: 6.05, EUR: 0.92 }
[PriceService] Converting USD → BRL
[PriceService] Rate: 6.05 (source: cache)
[PriceService] USDT: $1 USD → 6.05 BRL
```

## ✅ Checklist de Implementação

- [ ] Todos os preços do backend vêm em USD
- [ ] Usar `formatCurrency()` para exibir valores
- [ ] Usar `convertToUSD()` antes de enviar ao backend
- [ ] Nunca converter manualmente (sempre usar CurrencyManager)
- [ ] Testar com moedas diferentes (USD, BRL, EUR)

## 🧪 Testes

```typescript
// Verificar taxa atual
console.log(currencyManager.getStatus())

// Testar conversão
console.log(currencyManager.convert(100, 'USD', 'BRL'))

// Limpar cache (desenvolvimento)
currencyManager.clearCache()
```

---

**Versão:** 2.0.0  
**Última atualização:** Janeiro 2026
