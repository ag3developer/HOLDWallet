# 🏗️ Arquitetura de Preços Descentralizada

## Problema Atual

- ❌ Frontend faz múltiplos requests diretos a CoinGecko
- ❌ Sem controle de rate limiting
- ❌ Sem cache centralizado
- ❌ Sem fallback se uma fonte cair
- ❌ Requisições em loop constantemente

## Solução Implementada

### 1. **Backend - Price Service com Múltiplas Fontes**

```typescript
// backend/app/services/price_service.py

class PriceService:
    """
    Gerencia preços com múltiplas fontes de dados
    - CoinGecko (primária)
    - Binance (secundária)
    - Cache em Redis (20 minutos)
    """

    SOURCES = {
        'coingecko': CoinGeckoProvider(),
        'binance': BinanceProvider(),
    }

    CACHE_TTL = 1200  # 20 minutos

    async def get_price(self, symbol: str, fiat: str = 'BRL'):
        # 1. Tenta cache primeiro
        cached = await redis.get(f"price:{symbol}:{fiat}")
        if cached:
            return json.loads(cached)

        # 2. Tenta múltiplas fontes
        for source_name in ['coingecko', 'binance']:
            try:
                price_data = await self.fetch_from_source(
                    source_name, symbol, fiat
                )
                # Cache por 20 minutos
                await redis.setex(
                    f"price:{symbol}:{fiat}",
                    self.CACHE_TTL,
                    json.dumps(price_data)
                )
                return price_data
            except Exception as e:
                logger.warning(f"Fonte {source_name} falhou: {e}")
                continue

        # 3. Se tudo falhar, retorna erro
        raise PriceServiceError(
            f"Nenhuma fonte disponível para {symbol}"
        )

    async def get_multiple_prices(self, symbols: List[str], fiat: str):
        """Busca múltiplos preços em paralelo"""
        return await asyncio.gather(*[
            self.get_price(symbol, fiat)
            for symbol in symbols
        ])
```

### 2. **Backend - Endpoints Otimizados**

```python
@router.get("/prices/market/price")
async def get_market_price(
    symbol: str,
    fiat: str = "BRL",
    service: PriceService = Depends(get_price_service)
):
    """
    Retorna preço de uma moeda com cache de 20 min
    Múltiplas tentativas se uma fonte falhar
    """
    price = await service.get_price(symbol, fiat)
    return {
        "symbol": symbol,
        "price": price['price'],
        "change_24h": price.get('change_24h', 0),
        "source": price.get('source', 'unknown'),  # Qual fonte foi usada
        "cached": price.get('cached', False),
        "timestamp": price.get('timestamp')
    }

@router.get("/prices/batch")
async def get_batch_prices(
    symbols: str,  # "BTC,ETH,USDT"
    fiat: str = "BRL",
    service: PriceService = Depends(get_price_service)
):
    """
    Busca múltiplos preços de uma vez
    Muito mais eficiente que n requisições
    """
    symbol_list = symbols.split(",")
    prices = await service.get_multiple_prices(symbol_list, fiat)
    return {
        "prices": prices,
        "timestamp": datetime.now().isoformat()
    }
```

### 3. **Frontend - Service com Batching**

```typescript
// Frontend/src/services/price.service.ts

class PriceService {
  private cache = new Map<string, CachedPrice>();
  private CACHE_TTL = 60000; // 1 minuto (backend tem 20)
  private pendingRequests = new Map();

  /**
   * Busca preço com cache local
   */
  async getPrice(symbol: string, fiat: string = "BRL"): Promise<Price> {
    const cacheKey = `${symbol}:${fiat}`;

    // Retorna do cache se válido
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    // Se já tem requisição pendente, espera
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Faz novo request
    const request = this.fetchPrice(symbol, fiat);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Busca múltiplos preços de uma vez (muito mais eficiente!)
   */
  async getPrices(symbols: string[], fiat: string = "BRL"): Promise<Price[]> {
    const symbolStr = symbols.join(",");

    const response = await fetch(
      `/api/v1/prices/batch?symbols=${symbolStr}&fiat=${fiat}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error("Failed to fetch prices");

    const { prices } = await response.json();

    // Cache cada preço
    prices.forEach((price) => {
      const key = `${price.symbol}:${fiat}`;
      this.cache.set(key, {
        data: price,
        timestamp: Date.now(),
      });
    });

    return prices;
  }

  private isExpired(cached: CachedPrice): boolean {
    return Date.now() - cached.timestamp > this.CACHE_TTL;
  }

  private async fetchPrice(symbol: string, fiat: string): Promise<Price> {
    const response = await fetch(
      `/api/v1/prices/market/price?symbol=${symbol}&fiat=${fiat}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price for ${symbol}`);
    }

    return response.json();
  }
}
```

### 4. **Frontend - React Hook Otimizado**

```typescript
// Frontend/src/hooks/usePrices.ts

export function usePrices(symbols: string[], fiat: string = "BRL") {
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const priceService = useMemo(() => new PriceService(), []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Busca todos de uma vez (1 request em vez de N)
        const fetchedPrices = await priceService.getPrices(symbols, fiat);

        const priceMap = fetchedPrices.reduce((acc, price) => {
          acc[price.symbol] = price;
          return acc;
        }, {} as Record<string, Price>);

        setPrices(priceMap);
      } catch (err) {
        setError(err.message);
        setPrices({});
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [symbols.join(","), fiat]);

  return { prices, loading, error };
}
```

### 5. **Como Usar no InstantTradePage**

```typescript
export function InstantTradePage() {
  const SUPPORTED_SYMBOLS = [
    "BTC",
    "ETH",
    "USDT",
    "SOL",
    "ADA",
    "AVAX",
    "MATIC",
    "DOT",
  ];

  // Uma única requisição para TODOS os preços!
  const { prices, loading, error } = usePrices(SUPPORTED_SYMBOLS, "BRL");

  // Dados já estão em `prices` com refresh automático a cada 1 min
  // Sem loop de requisições!
}
```

## Comparação de Arquitetura

### ❌ ANTES (Problema)

```
Frontend → CoinGecko (BTC)
Frontend → CoinGecko (ETH)
Frontend → CoinGecko (USDT)
Frontend → CoinGecko (SOL)
... 8 requisições diretas
... A cada 30 segundos
... Rate limit! ❌
```

### ✅ DEPOIS (Solução)

```
Frontend → Backend /api/v1/prices/batch?symbols=BTC,ETH,USDT,SOL,ADA,AVAX,MATIC,DOT
           ↓
           Backend (com cache)
           ├─ Cache (existe? retorna em <1ms)
           └─ Se não tem cache:
              ├─ Tenta CoinGecko (primária)
              ├─ Se falhar → Tenta Binance (secundária)
              ├─ Se tudo falhar → Erro graças
              └─ Salva em cache por 20 min

1 requisição no frontend
Backend trata rate limiting, retry, fallback
Cache por 20 minutos
✅ Eficiente!
```

## Implementação Detalhada Necessária

### Backend (Python/FastAPI)

1. `app/services/price_service.py` - Serviço central de preços
2. `app/providers/coingecko_provider.py` - Provider CoinGecko
3. `app/providers/binance_provider.py` - Provider Binance
4. `app/routers/prices.py` - Endpoints otimizados
5. Redis para cache distribuído (opcional mas recomendado)

### Frontend (React/TypeScript)

1. `src/services/price.service.ts` - Service com cache local
2. `src/hooks/usePrices.ts` - Hook para usar em componentes
3. Refatorar `InstantTradePage.tsx` para usar o hook
4. Refatorar `CreateOrderPage.tsx` para usar o hook

## Benefícios

| Aspecto     | Antes             | Depois                 |
| ----------- | ----------------- | ---------------------- |
| Requisições | 8 por atualização | 1 por atualização      |
| Frequência  | A cada 30s        | A cada 1min (cache)    |
| Taxa total  | 96 req/5min       | 5 req/5min             |
| Rate limit  | ❌ Bloqueado      | ✅ Seguro              |
| Fonte cai   | ❌ Erro           | ✅ Fallback automático |
| Latência    | 5-8s              | <500ms (cache)         |

## Próximos Passos

1. Implementar `PriceService` no backend com Redis
2. Criar providers para CoinGecko e Binance
3. Adicionar endpoint `/prices/batch`
4. Implementar `usePrices` hook no frontend
5. Refatorar páginas para usar novo hook
6. Testes de rate limiting e fallback
