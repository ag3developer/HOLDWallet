# 🐛 Debug de Conversão de Moedas

## Problema Reportado

Os preços na aba Overview estão mostrando errado quando a moeda está em BRL.

## Checklist de Verificação

### 1. Verificar Moeda Selecionada

```javascript
// Abrir console (F12) e executar:
localStorage.getItem("currency-store");
// Deve retornar algo com: "currency":"BRL"
```

### 2. Verificar Conversão Básica

```javascript
// No console:
const EXCHANGE_RATES = { USD: 1, BRL: 5, EUR: 0.92 };
const amount = 24.88; // preço em USD do backend
const converted = amount * 5; // deveria ser 124.40
console.log(converted); // Resultado esperado: 124.40
```

### 3. Testar formatCurrency manualmente

```javascript
// No console React DevTools:
import { useCurrencyStore } from "@/stores/useCurrencyStore";
const store = useCurrencyStore.getState();
console.log("Moeda atual:", store.currency);
console.log("Formato USD:", store.formatCurrency(24.88, "USD"));
console.log("Formato BRL:", store.formatCurrency(24.88, "BRL"));
console.log("Formato padrão:", store.formatCurrency(24.88));
```

## Possíveis Problemas

### ✗ Problema 1: Moeda não foi salva

**Sintomas:** `localStorage` não tem `currency-store`
**Solução:**

1. Ir em Settings e selecionar BRL
2. Verificar se salvou em localStorage

### ✗ Problema 2: Conversão retornando número errado

**Sintomas:** `convert(24.88, 'USD', 'BRL')` retorna valor errado
**Solução:**

1. Verificar `EXCHANGE_RATES` está correto
2. Verificar logic da função `convert()`

### ✗ Problema 3: formatCurrency não está sendo chamado

**Sintomas:** Cards mostrando `wallet.balanceUSD` hardcoded
**Solução:**

1. Procurar por `$` hardcoded nos componentes
2. Garantir que está usando `formatCurrency()`

### ✗ Problema 4: Component não está re-renderizando

**Sintomas:** Muda settings mas card não atualiza
**Solução:**

1. Verificar se `formatCurrency` está dentro do component
2. Verificar se há `useCurrencyStore()` hook

## Arquivos Críticos

```
Frontend/src/stores/useCurrencyStore.ts
├─ formatCurrency() - Converte USD → moeda selecionada
├─ currency: 'USD' | 'BRL' | 'EUR'
└─ setCurrency() - Salva moeda em localStorage

Frontend/src/services/currency-converter-service.ts
├─ EXCHANGE_RATES = { USD: 1, BRL: 5, EUR: 0.92 }
└─ convert(amount, from, to) - Realiza conversão

Frontend/src/pages/wallet/WalletPage.tsx
├─ const { formatCurrency, currency } = useCurrencyStore()
└─ formatCurrency(wallet.balanceUSD) - Formata valor
```

## Valores Esperados

Se backend retorna: `balance_usd: 24.88`

**Em USD:**

```
Moeda: USD
Valor: 24.88
Exibição: $24.88
```

**Em BRL:**

```
Moeda: BRL
Cálculo: 24.88 × 5 = 124.40
Exibição: R$ 124,40
```

**Em EUR:**

```
Moeda: EUR
Cálculo: 24.88 × 0.92 = 22.89
Exibição: €22,89
```

## Próximos Passos

1. ✅ Executar console.log do localStorage
2. ✅ Testar conversão manualmente
3. ✅ Verificar se WalletPage tem `formatCurrency`
4. ✅ Verificar se cards estão usando `formatCurrency` e não `$` hardcoded
5. ✅ Recarregar página (Ctrl+Shift+R hard refresh)
