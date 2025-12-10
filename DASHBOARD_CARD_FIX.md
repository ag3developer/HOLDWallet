# 🎯 Dashboard Cards - Mostrar Quantidade e Valores Corretos

## Problema Identificado

Na página `/dashboard`, os cards de moedas mostram:

- ❌ Quantidade: 0.000000 (correto)
- ❌ Valor: R$ 0,00 (deve mostrar o valor baseado em quantity × unit_price)

## Dados que o Backend Agora Retorna

```json
{
  "network": "ethereum",
  "address": "0x...",
  "balance": "0.5", // Quantidade da moeda
  "price_usd": "3311.31", // Preço unitário em USD
  "balance_usd": "1655.65", // Quantidade × Preço em USD
  "balance_brl": "8278.25" // DEPRECATED - será removido
}
```

## Lógica Correta que o Frontend Deve Usar

```typescript
// ✅ CORRETO:
const quantity = parseFloat(balanceData.balance); // 0.5
const priceUSD = parseFloat(balanceData.price_usd); // 3311.31
const totalUSD = quantity * priceUSD; // 1655.65
const totalBRL = totalUSD * 5; // 8278.25

// ❌ ERRADO (o que estava fazendo):
const totalUSD = parseFloat(balanceData.balance_usd); // 1655.65
// E depois apenas multiplicar por 5 para BRL
```

## Dados Exibidos nos Cards

Para cada card de moeda, exibir:

```
[Moeda] Bitcoin
├─ Quantidade: 0.50 BTC
├─ Preço: $3,311.31 USD
└─ Total: $1,655.65 USD (ou R$ 8.278,25 em BRL)
```

## Estrutura do Card no Dashboard

```tsx
<div className="card">
  <div className="left">
    <span>
      {quantity} {symbol}
    </span>{" "}
    // "0.50 BTC"
    <span>{formatCurrency(totalInSelectedCurrency)}</span>
  </div>
  <div className="right">
    <span>${price}</span> // "$3,311.31"
  </div>
</div>
```

## Arquivos que Precisam de Atualização

1. **Frontend Components:**

   - `/Frontend/src/pages/dashboard/DashboardPage.tsx` - Cards principais
   - `/Frontend/src/pages/wallet/WalletPage.tsx` - Cards de wallet
   - `/Frontend/src/components/CryptoCard.tsx` - Se existir

2. **Frontend Hooks:**

   - `/Frontend/src/hooks/useWallet.ts` - Já retorna dados corretos

3. **Frontend Stores:**
   - `/Frontend/src/stores/useCurrencyStore.ts` - Para formatação

## Exemplo de Implementação Correta

```typescript
function CryptoCard({ network, balance, price_usd }) {
  const { formatCurrency, currency } = useCurrencyStore();

  const quantity = parseFloat(balance);
  const priceUSD = parseFloat(price_usd);
  const totalUSD = quantity * priceUSD;

  return (
    <div className="card">
      <p>
        {quantity.toFixed(6)} {network.toUpperCase()}
      </p>
      <p>{formatCurrency(totalUSD)}</p>
    </div>
  );
}
```

## Status

- ✅ Backend: Retornando `price_usd`
- ✅ Schema: Atualizado com `price_usd`
- ⏳ Frontend: Aguardando atualização dos componentes
- ⏳ Testes: Pendentes

## Próximas Ações

1. Atualizar DashboardPage.tsx para usar `price_usd`
2. Atualizar WalletPage.tsx para usar `price_usd`
3. Testar com dados reais do backend
4. Validar conversão de moedas
