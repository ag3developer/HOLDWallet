# 🔍 Diagnóstico da Fonte de Dados - CoinGecko vs Binance

## Resposta à Pergunta: "Qual é a fonte de dados que estamos usando para pegar a cotacao binance? usa algum websocket publico?"

### ❌ Resposta: NÃO estamos usando Binance nem WebSocket

Nossa arquitetura **usa CoinGecko API**, não Binance. Detalhes:

---

## 📊 Fonte de Dados Atual

### **CoinGecko API (Gratuita)**

- **URL Base:** `https://api.coingecko.com/api/v3`
- **Endpoint:** `/simple/price`
- **Tipo:** REST API (HTTP)
- **WebSocket:** ❌ Não (REST polling)
- **Autenticação:** Opcional (free tier sem API key)
- **Rate Limit:** 10-50 calls/min (free), ilimitado (pro)
- **Latência:** ~1-2 segundos por request
- **Dados:** Preço, Market Cap, Volume 24h, Change 24h

### Exemplo de Chamada:

```bash
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true"

# Resposta:
{
  "bitcoin": {
    "brl": 543200.50,
    "brl_24h_change": 2.35,
    "brl_market_cap": 10600000000000
  }
}
```

---

## 🏗️ Arquitetura Atual (Após Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                                                             │
│  CreateOrderPage                                            │
│  DashboardPage                                              │
│  usePriceChange24h (Hook)                                   │
│  market-price-service.ts                                    │
│                                                             │
│  Todos chamam: GET /prices/market/price?symbol=X&fiat=BRL  │
└─────────────────────────────────────────────────────────────┘
                           ↓↓↓
                    (Com Retry Logic)
                           ↓↓↓
┌─────────────────────────────────────────────────────────────┐
│               BACKEND (FastAPI)                             │
│                                                             │
│  router: GET /prices/market/price                           │
│  ├─ Mapeia símbolo → CoinGecko ID                           │
│  ├─ Timeout: 10 segundos                                    │
│  ├─ Tratamento de 429/503                                   │
│  └─ Retorna JSON único e simples                            │
└─────────────────────────────────────────────────────────────┘
                           ↓↓↓
              (CORS: sem problema - Backend)
                           ↓↓↓
┌─────────────────────────────────────────────────────────────┐
│          CoinGecko API (Fonte de Verdade)                   │
│                                                             │
│  GET https://api.coingecko.com/api/v3/simple/price         │
│  ├─ Retorna preço em tempo real                             │
│  ├─ ~1s latência                                            │
│  └─ Rate limit: 10-50 calls/min (free)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Atualização de Preços

### Cenário 1: Usuário abre CreateOrderPage

```
1. [Frontend] Monta CreateOrderPage
2. [Frontend] useEffect dispara fetchMarketPrice()
3. [Frontend] fetch() → GET /prices/market/price?symbol=BTC&fiat=BRL
4. [Backend] Recebe request
5. [Backend] Mapeia BTC → bitcoin (CoinGecko ID)
6. [Backend] httpx.AsyncClient().get(CoinGecko API)
7. [CoinGecko] Retorna: {"bitcoin": {"brl": 543200.50, ...}}
8. [Backend] Transforma e retorna ao frontend
9. [Frontend] setBasePrice(543200.50)
10. [UI] Renderiza preço no input
```

### Cenário 2: Erro 503 do CoinGecko

```
1-6. [mesmo que acima]
7. [CoinGecko] Retorna HTTP 503 Service Unavailable
8. [Backend] Detecta 503
9. [Backend] Lança ExternalServiceError
10. [Frontend] Recebe 503
11. [Frontend] Retry logic ativa!
12. [Frontend] Espera 1 segundo
13. [Frontend] Tenta novamente (até 3 vezes total)
14. [CoinGecko] Servidor volta online
15. [UI] Preço aparece com sucesso ✅
```

---

## 🔌 Por Que NÃO Usar WebSocket?

### Vantagens do REST Polling (Atual) ✅

1. **Simples:** Sem manutenção de conexão aberta
2. **Cacheable:** Respostas podem ser cacheadas
3. **Stateless:** Cada request é independente
4. **Reliable:** HTTP é mais confiável que WebSocket
5. **Suporte:** Todos os proxies/firewalls suportam
6. **Custo:** Menos recursos de server

### Desvantagens do WebSocket ❌

1. **Complexo:** Requer infraestrutura de conexão
2. **Stateful:** Servidor precisa manter conexões abertas
3. **Overhead:** Keep-alive messages consomem banda
4. **Firewall:** Alguns firewalls corporativos bloqueiam
5. **Escala:** Difícil de fazer load balancing
6. **Custo:** Mais recursos necessários

### Quando Usar WebSocket?

- Real-time trading (updates a cada 100ms)
- Muitos usuários simultâneos
- Trading de alta frequência
- Notificações push

### Nosso Caso: REST é Melhor Porque

- Preço atualiza a cada 5-60 minutos (não real-time)
- Usuários não precisam de updates contínuos
- Backend é simples
- CoinGecko oferece REST, não WebSocket (free)

---

## 📡 Dados Retornados pelo Endpoint

### Request:

```
GET http://127.0.0.1:8000/prices/market/price?symbol=BTC&fiat=BRL
Authorization: Bearer <token>
```

### Response (200 OK):

```json
{
  "symbol": "BTC",
  "price": 543200.5,
  "fiat": "BRL",
  "market_cap": 10600000000000,
  "volume_24h": 280000000000,
  "change_24h": 2.35,
  "timestamp": "2024-12-08T14:30:45.123456+00:00"
}
```

| Campo        | Fonte     | Uso                            |
| ------------ | --------- | ------------------------------ |
| `price`      | CoinGecko | Preço unitário exibido         |
| `market_cap` | CoinGecko | Info do mercado                |
| `volume_24h` | CoinGecko | Info do mercado                |
| `change_24h` | CoinGecko | Variação em % (verde/vermelho) |
| `timestamp`  | Backend   | Saber quando foi obtido        |

---

## 🎯 Moedas Suportadas (16 Total)

Mapeadas de símbolo para CoinGecko ID:

```python
{
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'MATIC': 'matic-network',
    'BNB': 'binancecoin',
    'TRX': 'tron',
    'BASE': 'base',
    'USDT': 'tether',
    'SOL': 'solana',
    'LTC': 'litecoin',
    'DOGE': 'dogecoin',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'SHIB': 'shiba-inu',
    'XRP': 'ripple',
}
```

---

## 💾 Cache & Performance

### Cache no Frontend (5 minutos)

```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Se já temos preço em cache:
const cached = priceCache.get("BTC");
if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
  return cached.data; // ← Use cached, sem chamar API
}
```

### Benefícios:

- ✅ Reduz chamadas ao CoinGecko
- ✅ Resposta instantânea
- ✅ Menos rate limiting
- ✅ Melhor UX

---

## 📊 Comparação: REST vs WebSocket

```
                    REST Polling    WebSocket
────────────────────────────────────────────────
Latência          1-2s             100ms
Bandwidth         Alto (polls)     Baixo (stream)
Complexidade      Baixa            Alta
Infraestrutura    HTTP simples     TCP + upgrade
Escalabilidade    Fácil            Difícil
Firewall-friendly Sim              Às vezes não
Custo             Baixo            Médio
Maintenance       Baixo            Alto
Ideal para        P2P Orders       Trading Real-time
────────────────────────────────────────────────
```

---

## 🚀 Próximas Melhorias (Futuro)

### 1. **Adicionar Cache Backend**

```python
# Cache de 60 segundos no backend
@cached(ttl=60)
async def get_market_price(symbol, fiat):
    # ... chamada ao CoinGecko
```

Reduz requisições ao CoinGecko em 90%.

### 2. **Adicionar WebSocket Opcional**

```javascript
// Para trading real-time futuro
const priceStream = new WebSocket("ws://backend/prices/stream");
priceStream.onmessage = (e) => {
  const { price, timestamp } = JSON.parse(e.data);
  setPrice(price);
};
```

### 3. **Usar Binance WebSocket (Alternativa)**

Se quisermos dados em tempo real:

```javascript
const binance = new WebSocket("wss://stream.binance.com:9443/ws/btcbrl@trade");
binance.onmessage = (e) => {
  const { p } = JSON.parse(e.data); // price
  setPrice(p);
};
```

---

## ✅ Conclusão

**Pergunta:** Qual é a fonte de dados para cotação? Usa WebSocket público?

**Resposta:**

- ✅ Fonte: **CoinGecko API v3** (REST HTTP, não WebSocket)
- ✅ Tipo: **REST Polling** (melhor para nosso caso)
- ✅ Latência: ~1-2 segundos (adequado para P2P)
- ✅ Moedas: 16 criptos suportadas
- ✅ Cache: 5 minutos frontend, futuro 60s backend
- ✅ Status: **Agora funcionando** após fix de retry logic

**Quando mudar para WebSocket?**

- Quando usuários precisarem de updates em tempo real (< 1s)
- Quando tivermos trading de alta frequência
- Quando o volume de requisições aumentar muito (acima de 1000 reqs/min)

Por enquanto: **REST + Retry + Cache = Solução Perfeita** 🎯
