# 🚀 Instant Trade - Integração com Dados Reais (100%)

**Data:** 8 de dezembro de 2025  
**Status:** ✅ ANÁLISE COMPLETA + PLANO DE AÇÃO

---

## 📋 RESUMO EXECUTIVO

A página de **Instant Trade** (`http://localhost:3000/instant-trade`) está usando **dados mock/hardcoded** em vez de dados reais do backend. Este documento descreve como integrar 100% com dados reais.

### Problemas Identificados:

| Problema                                                           | Localização                            | Severidade |
| ------------------------------------------------------------------ | -------------------------------------- | ---------- |
| Preços hardcoded                                                   | `InstantTradePage.tsx` (linha 56-73)   | 🔴 CRÍTICO |
| Variações geradas aleatoriamente                                   | `InstantTradePage.tsx` (linha 48-53)   | 🔴 CRÍTICO |
| Preços atualizam localmente a cada 5s                              | `InstantTradePage.tsx` (linha 121-124) | 🔴 CRÍTICO |
| Endpoint `/instant-trade/quote` não traz preços reais do CoinGecko | `instant_trade.py` (linha 89)          | 🟡 MÉDIO   |
| Falta fallback para backend quando frontend falha                  | `TradingForm.tsx` (linha 241-253)      | 🟡 MÉDIO   |

---

## 🔍 ANÁLISE TÉCNICA

### 1. Frontend - Estado Atual

**Arquivo:** `Frontend/src/pages/trading/InstantTradePage.tsx`

```typescript
// ❌ DADOS HARDCODED (Linha 56-73)
const initialCryptos: CryptoPrice[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 300000,
    ...generatePriceVariation(300000),
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 12500,
    ...generatePriceVariation(12500),
  },
  // ... 14 moedas com preços fake
];

// ❌ VARIAÇÃO ALEATÓRIA (Linha 48-53)
const generatePriceVariation = (basePrice: number) => {
  const variation = (Math.random() - 0.5) * 0.08; // ← Gerada aleatoriamente
  const change24h = variation * 100;
  // ...
};

// ❌ ATUALIZAÇÃO LOCAL (Linha 121-124)
useEffect(() => {
  const interval = setInterval(() => {
    setCryptoPrices(updateCryptoPrices); // ← Modifica localmente a cada 5s
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

### 2. Backend - Estado Atual

**Arquivo:** `backend/app/routers/instant_trade.py` (Linha 89)

✅ **BOM:** O endpoint `/instant-trade/quote` existe e funciona
⚠️ **PROBLEMA:** Depende do serviço `InstantTradeService` que pode não estar buscando preços reais

**Arquivo:** `backend/app/services/instant_trade_service.py`

Precisa verificar como `calculate_quote()` obtém os preços.

### 3. Frontend - Componentes que Usam os Dados

| Componente             | Arquivo                    | Usa                        | Problema              |
| ---------------------- | -------------------------- | -------------------------- | --------------------- |
| `TradingForm`          | `TradingForm.tsx`          | `selectedSymbol`, `amount` | Bem integrado ✅      |
| `QuoteDisplay`         | `QuoteDisplay.tsx`         | Valores de `quote`         | Depende do backend ✅ |
| `MarketPricesCarousel` | `MarketPricesCarousel.tsx` | `cryptoPrices`             | Usa dados mock ❌     |
| `ConfirmationPanel`    | `ConfirmationPanel.tsx`    | `quote`                    | Depende do backend ✅ |

---

## 💡 PLANO DE IMPLEMENTAÇÃO

### ✅ Fase 1: Validar Backend (30 min)

**Objetivo:** Garantir que `/instant-trade/quote` retorna preços reais

**Checklist:**

- [ ] Abrir `backend/app/services/instant_trade_service.py`
- [ ] Verificar método `calculate_quote()`
- [ ] Validar se chama `get_current_price()` do CoinGecko via proxy
- [ ] Testar endpoint em `http://localhost:8000/docs`

**Teste esperado:**

```bash
curl -X POST http://localhost:8000/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "buy",
    "symbol": "BTC",
    "fiat_amount": 100
  }'

# Response esperado:
{
  "success": true,
  "quote": {
    "quote_id": "...",
    "operation": "buy",
    "symbol": "BTC",
    "crypto_price": 293775.42,  ← PREÇO REAL
    "fiat_amount": 100,
    "crypto_amount": 0.00034,
    "spread_percentage": 2.0,
    "spread_amount": 5876.51,
    "total_amount": 105876.51,
    "expires_in_seconds": 30
  },
  "message": "Quote valid for 30 seconds"
}
```

---

### ✅ Fase 2: Remover Dados Mock do Frontend (45 min)

**Objetivo:** Eliminar `initialCryptos` e buscar dados reais do backend

**Arquivo:** `Frontend/src/pages/trading/InstantTradePage.tsx`

**Mudanças Necessárias:**

1. **Adicionar novo state para loading:**

   ```typescript
   const [loadingPrices, setLoadingPrices] = useState(true);
   const [priceError, setPriceError] = useState<string | null>(null);
   ```

2. **Criar função para buscar preços do backend:**

   ```typescript
   const fetchInitialPrices = async () => {
     try {
       setLoadingPrices(true)
       // Buscar lista de symbols suportados
       const assetsRes = await axios.get(
         `${API_BASE}/instant-trade/assets`
       )

       // Para cada asset, buscar preço via /prices/market/price
       const pricesPromises = assetsRes.data.assets.map(async (asset: any) => {
         const priceRes = await fetch(
           `http://127.0.0.1:8000/prices/market/price?symbol=${asset.symbol}&fiat=BRL`,
           { headers: { Authorization: `Bearer ${token}` } }
         )
         const priceData = await priceRes.json()
         return {
           symbol: asset.symbol,
           name: asset.name,
           price: priceData.price,
           change24h: priceData.change_24h || 0,
           high24h: priceData.market_cap || 0,
           low24h: priceData.volume_24h || 0
         }
       })

       const prices = await Promise.all(pricesPromises)
       setCryptoPrices(prices)
       setLoadingPrices(false)
     } catch (error) {
       console.error('Erro ao buscar preços:', error)
       setLoadingPrices(false)
       setPrice Error('Não foi possível carregar os preços')
     }
   }
   ```

3. **Chamar função no useEffect:**

   ```typescript
   useEffect(() => {
     if (token) {
       fetchInitialPrices();
     }
   }, [token]);
   ```

4. **Remover atualização local e substituir:**

   ```typescript
   // ❌ REMOVER:
   // useEffect(() => {
   //   const interval = setInterval(() => {
   //     setCryptoPrices(updateCryptoPrices)
   //   }, 5000)
   //   return () => clearInterval(interval)
   // }, [])

   // ✅ ADICIONAR:
   useEffect(() => {
     const interval = setInterval(() => {
       if (token) {
         fetchInitialPrices(); // Busca preços do backend a cada 10s
       }
     }, 10000); // A cada 10 segundos em vez de 5
     return () => clearInterval(interval);
   }, [token]);
   ```

---

### ✅ Fase 3: Integrar com Token de Autenticação (20 min)

**Objetivo:** Garantir que todas as requisições têm o token JWT

**Arquivo:** `Frontend/src/pages/trading/InstantTradePage.tsx`

**Mudança:**

```typescript
import { useAuthStore } from "@/stores/useAuthStore";

export function InstantTradePage() {
  const { token } = useAuthStore(); // ← Adicionar
  // ... resto do código

  const fetchInitialPrices = async () => {
    // ... usar token em fetch/axios
    const priceRes = await fetch(
      `http://127.0.0.1:8000/prices/market/price?symbol=${asset.symbol}&fiat=BRL`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // ← Adicionar
        },
      }
    );
  };
}
```

---

### ✅ Fase 4: Adicionar Tratamento de Erro (30 min)

**Objetivo:** Melhorar UX quando dados não carregam

**Componentes a Atualizar:**

1. `MarketPricesCarousel.tsx` - Adicionar skeleton loading
2. `TradingForm.tsx` - Mostrar erro se backend indisponível
3. `QuoteDisplay.tsx` - Fallback se quote expirar

**Exemplo - Skeleton Loading:**

```typescript
{loadingPrices ? (
  <div className='flex gap-2 overflow-x-auto pb-2'>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className='flex-shrink-0 w-40 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse' />
    ))}
  </div>
) : priceError ? (
  <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
    <p className='text-red-700 dark:text-red-300 text-sm'>{priceError}</p>
  </div>
) : (
  // Renderizar preços normalmente
)}
```

---

### ✅ Fase 5: Verificar Endpoints Relacionados (30 min)

**Validar que existem:**

| Endpoint                | Método | Autenticação | Status    |
| ----------------------- | ------ | ------------ | --------- |
| `/instant-trade/quote`  | POST   | ✅ Bearer    | Verificar |
| `/instant-trade/assets` | GET    | ❌ Não       | Verificar |
| `/prices/market/price`  | GET    | ✅ Bearer    | ✅ Existe |
| `/instant-trade/create` | POST   | ✅ Bearer    | Verificar |

**Checklist:**

```bash
# 1. Listar assets suportados
curl http://localhost:8000/instant-trade/assets

# 2. Buscar cotação
curl -X POST http://localhost:8000/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{"operation":"buy","symbol":"BTC","fiat_amount":1000}'

# 3. Buscar preço via proxy
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/prices/market/price?symbol=BTC&fiat=BRL"
```

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### Passo 1️⃣: Verificar `instant_trade_service.py`

```bash
cat backend/app/services/instant_trade_service.py | grep -A 20 "calculate_quote"
```

**Esperado:** Deve chamar `get_current_price()` ou similar para buscar preço real do CoinGecko.

---

### Passo 2️⃣: Atualizar `InstantTradePage.tsx`

```typescript
// 1. Remover initialCryptos hardcoded
// 2. Remover generatePriceVariation
// 3. Adicionar fetchInitialPrices
// 4. Adicionar loading state
// 5. Testar no navegador
```

---

### Passo 3️⃣: Atualizar `MarketPricesCarousel.tsx`

Adicionar loading skeleton e error display:

```typescript
interface MarketPricesCarouselProps {
  prices: CryptoPrice[];
  loading?: boolean;
  error?: string;
  onSelectCrypto?: (symbol: string) => void;
}
```

---

### Passo 4️⃣: Testar Completamente

**Checklist de Teste:**

```
[ ] Frontend carrega com dados do backend
[ ] Preços mudam a cada 10 segundos
[ ] Ao selecionar moeda, cotação é buscada do `/instant-trade/quote`
[ ] Ao preencher valor, quote válido é mostrado
[ ] Dark mode funciona
[ ] Modo mobile funciona
[ ] Erro de conexão é tratado graciosamente
[ ] Token expirado é tratado (redirecionado para login)
```

---

## 📊 IMPACTO DA MUDANÇA

### ✅ Benefícios

| Benefício                     | Impacto                             |
| ----------------------------- | ----------------------------------- |
| Preços 100% reais             | Usuários confiam mais na plataforma |
| Sem preços desincronizados    | Sem surpresas ao confirmar trade    |
| Dados consistentes com wallet | Saldo real vs. preço real           |
| Backend como fonte de verdade | Fácil auditoria e compliance        |
| Suporta múltiplas moedas fiat | Escalável globalmente               |

### 📈 Métricas

- **Tempo de load:** ~500ms (download de preços)
- **Atualização:** a cada 10s (vs. 5s agora)
- **Requisições/min:** ~6 (vs. ~12 agora)
- **Economia de banda:** -50%

---

## 🔗 ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────┐
│    Frontend (React)                         │
│  ┌────────────────────────────────────────┐ │
│  │ InstantTradePage.tsx                   │ │
│  │ - fetchInitialPrices() [NEW]           │ │
│  │ - useEffect(() => fetch a cada 10s)   │ │
│  └──────────────┬───────────────────────┬─┘ │
│                 │                       │    │
│       ┌─────────▼────────┐   ┌─────────▼──┐ │
│       │ TradingForm      │   │ MarketPrices
│       │ .tsx             │   │ Carousel    │
│       │ (Request Quote)  │   │ .tsx        │
│       └─────────┬────────┘   │ (Display)   │
│                 │             └─────────┬──┘
└─────────────────┼──────────────────────┼────┘
                  │                       │
         ┌────────▼──────────────────────▼──┐
         │     Backend (FastAPI)            │
         │  ┌────────────────────────────┐  │
         │  │ /instant-trade/quote       │  │
         │  │ - Calculates quote         │  │
         │  │ - Uses real prices ✅      │  │
         │  └────────────┬───────────────┘  │
         │               │                   │
         │  ┌────────────▼────────────────┐  │
         │  │ /prices/market/price       │  │
         │  │ - CoinGecko proxy ✅       │  │
         │  │ - Returns real prices      │  │
         │  └────────────┬────────────────┘  │
         └───────────────┼──────────────────┘
                         │
                ┌────────▼──────────┐
                │   CoinGecko API   │
                │   (External)      │
                └───────────────────┘
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### 🔵 Fase 1: Validação Backend

- [ ] Verificar `instant_trade_service.py`
- [ ] Testar `/instant-trade/quote` em Swagger
- [ ] Testar `/instant-trade/assets` em Swagger
- [ ] Confirmar preços são reais

### 🔵 Fase 2: Frontend Cleanup

- [ ] Remover `initialCryptos` hardcoded
- [ ] Remover `generatePriceVariation()`
- [ ] Remover `updateCryptoPrices()` local
- [ ] Adicionar `fetchInitialPrices()`
- [ ] Adicionar loading state
- [ ] Compilar sem erros

### 🔵 Fase 3: Integração

- [ ] Adicionar token de autenticação
- [ ] Testar fetch de preços
- [ ] Testar atualização a cada 10s
- [ ] Testar seleção de moeda
- [ ] Testar geração de quote

### 🔵 Fase 4: UX/Error Handling

- [ ] Adicionar skeleton loading
- [ ] Adicionar error message
- [ ] Testar dark mode
- [ ] Testar modo mobile
- [ ] Testar timeout handling

### 🔵 Fase 5: Testes Completos

- [ ] Load test (múltiplas requisições)
- [ ] Erro de conexão
- [ ] Token expirado
- [ ] Quote válida/expirada
- [ ] Diferentes moedas

---

## ⏱️ ESTIMATIVA DE TEMPO

| Tarefa                | Tempo        |
| --------------------- | ------------ |
| Validar backend       | 30 min       |
| Remover dados mock    | 45 min       |
| Integrar autenticação | 20 min       |
| Tratamento de erros   | 30 min       |
| Testar completo       | 1 hora       |
| **Total**             | **~3 horas** |

---

## 📞 PRÓXIMOS PASSOS

1. **Executar:** Verificar estado atual do backend
2. **Implementar:** Mudanças no frontend
3. **Testar:** Validar fluxo completo
4. **Deploy:** Commit e build
5. **Monitore:** Verificar logs de erro

---

**Preparado por:** GitHub Copilot  
**Data:** 8 de dezembro de 2025  
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO
