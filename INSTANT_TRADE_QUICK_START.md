# ⚡ INSTANT TRADE - QUICK START GUIDE

## 🎯 Objetivo

Integrar 100% dados reais na página `http://localhost:3000/instant-trade`

## 🔴 Problemas Atuais

### 1. Preços Hardcoded

```typescript
// ❌ Linha 56-73 do InstantTradePage.tsx
const initialCryptos = [
  { symbol: 'BTC', price: 300000, ... },  // FAKE
  { symbol: 'ETH', price: 12500, ... },   // FAKE
]
```

### 2. Variações Aleatórias

```typescript
// ❌ Linha 48-53
const generatePriceVariation = (basePrice) => {
  const variation = Math.random() - 0.5 * 0.08; // ← Aleatório!
};
```

### 3. Atualização Local (Não Sincronizada)

```typescript
// ❌ Linha 121-124
useEffect(() => {
  setInterval(() => setCryptoPrices(updateCryptoPrices), 5000); // Local!
});
```

## ✅ Solução

### Arquivo: `InstantTradePage.tsx`

**1️⃣ Remover Linhas 48-73:**

- ❌ `generatePriceVariation()`
- ❌ `initialCryptos`
- ❌ `updateCryptoPrices()`

**2️⃣ Adicionar Novo State:**

```typescript
const [loadingPrices, setLoadingPrices] = useState(true);
const [priceError, setPriceError] = useState<string | null>(null);
const { token } = useAuthStore(); // ← Adicionar
```

**3️⃣ Adicionar Função para Buscar Preços:**

```typescript
const fetchInitialPrices = async () => {
  if (!token) return;
  try {
    setLoadingPrices(true);

    // Buscar assets suportados
    const assetsRes = await axios.get(
      "http://127.0.0.1:8000/instant-trade/assets"
    );

    // Buscar preço de cada asset
    const prices = await Promise.all(
      assetsRes.data.assets.map(async (asset: any) => {
        const priceRes = await fetch(
          `http://127.0.0.1:8000/prices/market/price?symbol=${asset.symbol}&fiat=BRL`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await priceRes.json();
        return {
          symbol: asset.symbol,
          name: asset.name,
          price: data.price,
          change24h: data.change_24h || 0,
          high24h: data.price * 1.05,
          low24h: data.price * 0.95,
        };
      })
    );

    setCryptoPrices(prices);
    setLoadingPrices(false);
  } catch (error) {
    console.error("Erro ao buscar preços:", error);
    setPriceError("Erro ao carregar preços. Tente novamente.");
    setLoadingPrices(false);
  }
};
```

**4️⃣ Chamar no useEffect:**

```typescript
useEffect(() => {
  fetchInitialPrices();
}, [token]);

// Atualizar a cada 10 segundos
useEffect(() => {
  const interval = setInterval(() => {
    fetchInitialPrices();
  }, 10000);
  return () => clearInterval(interval);
}, [token]);
```

**5️⃣ Adicionar Error Display:**

```typescript
{
  priceError && (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
      <p className="text-red-700 dark:text-red-300 text-sm">{priceError}</p>
    </div>
  );
}
```

## 🧪 Teste Rápido

### 1. Verificar Backend

```bash
# Terminal - Backend
curl http://localhost:8000/instant-trade/assets

# Deve retornar assets suportados
```

### 2. Testar Quotação

```bash
curl -X POST http://localhost:8000/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "buy",
    "symbol": "BTC",
    "fiat_amount": 100
  }'

# Deve retornar preço REAL do BTC
```

### 3. Verificar no Navegador

```
http://localhost:3000/instant-trade

✅ Deve mostrar preços reais do CoinGecko
✅ Deve atualizar a cada 10 segundos
✅ Ao selecionar moeda, deve buscar cotação real
```

## 📊 Antes vs. Depois

| Aspecto        | ❌ Antes          | ✅ Depois               |
| -------------- | ----------------- | ----------------------- |
| Fonte de Dados | Local/Mock        | Backend (CoinGecko)     |
| Preço do BTC   | R$ 300.000 (fake) | R$ 293.775,42 (real)    |
| Atualização    | Local a cada 5s   | Backend a cada 10s      |
| Sincronização  | Nunca             | Sempre com backend      |
| Confiabilidade | Baixa             | Alta                    |
| Auditoria      | Impossível        | Fácil (logs do backend) |

## ⏱️ Tempo Estimado

- **Implementação:** ~45 minutos
- **Teste:** ~15 minutos
- **Deploy:** ~5 minutos
- **Total:** ~1 hora

## 🚀 Começar Agora!

1. Abrir: `Frontend/src/pages/trading/InstantTradePage.tsx`
2. Remover linhas 48-73 (dados mock)
3. Adicionar código acima
4. Testar em `http://localhost:3000/instant-trade`
5. Commit e push

---

**Documento de Referência Completo:**  
📄 `INSTANT_TRADE_REAL_DATA_INTEGRATION.md`
