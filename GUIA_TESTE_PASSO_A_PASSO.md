# 🚀 GUIA PASSO A PASSO - Como Testar o Sistema Corrigido

## ⚡ Quick Start (5 minutos)

### 1. Abra 2 Terminais

**Terminal 1 - Backend**
```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Você verá:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Terminal 2 - Frontend**
```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend
npm run dev
```

Você verá:
```
  VITE v5.4.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
```

### 2. Abra o Navegador

Acesse: **http://localhost:5173**

### 3. Procure pela Página InstantTrade

Clique no menu e procure por "Instant Trade" ou "Comprar/Vender"

### 4. Verifique os Preços

Você deve ver:
- ✅ BTC: R$ XX.XXX,XX
- ✅ ETH: R$ X.XXX,XX
- ✅ USDT: R$ X,XX
- etc...

**SEM ERROS 503 no console** ✅

---

## 🧪 Testes Detalhados

### Teste 1: Verificar Backend Está Rodando

```bash
curl http://localhost:8000/health
```

**Resposta Esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T15:30:00Z"
}
```

---

### Teste 2: Testar Endpoint de Preços (BRL)

```bash
curl "http://localhost:8000/api/v1/prices/batch?symbols=BTC,ETH,USDT,SOL&fiat=brl"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "prices": {
    "BTC": {
      "symbol": "BTC",
      "price": 385000.00,
      "change_24h": 2.5,
      "volume_24h": 1000000.00,
      "source": "coingecko",
      "timestamp": "2025-12-08T15:30:00Z"
    },
    "ETH": { ... },
    "USDT": { ... },
    "SOL": { ... }
  },
  "fiat": "BRL",
  "count": 4,
  "source": "coingecko",
  "timestamp": "2025-12-08T15:30:00Z"
}
```

---

### Teste 3: Testar Endpoint de Preço Único (USD)

```bash
curl "http://localhost:8000/api/v1/prices/price/BTC?fiat=usd"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "prices": {
    "BTC": {
      "symbol": "BTC",
      "price": 98000.50,
      "change_24h": 1.25,
      "market_cap": 1950000000000,
      "volume_24h": 35000000000,
      "source": "coingecko",
      "timestamp": "2025-12-08T15:30:00Z"
    }
  },
  "fiat": "USD",
  "count": 1,
  "source": "coingecko",
  "timestamp": "2025-12-08T15:30:00Z"
}
```

---

### Teste 4: Verificar Console do Frontend

1. Abra http://localhost:5173
2. Pressione **F12** (DevTools)
3. Vá para aba **Console**

**Você NÃO deve ver:**
```
❌ GET http://localhost:3000/api/v1/prices/batch 503
❌ [usePrices] Error fetching prices: AxiosError
```

**Você DEVE ver:**
```
✅ [usePrices] Fetched 8 prices successfully
✅ [usePrices] Cache updated for: brl
✅ InstantTradePage loaded with prices
```

---

### Teste 5: Testar Fallback (Simular Erro CoinGecko)

Se CoinGecko estiver indisponível, o sistema deve usar Binance como fallback automaticamente:

```bash
curl "http://localhost:8000/api/v1/prices/batch?symbols=BTC,ETH,USDT,SOL&fiat=usd"
```

Você verá no response:
```json
{
  "prices": {
    "BTC": { "source": "coingecko" },    // CoinGecko
    "ETH": { "source": "binance" },      // Fallback
    "USDT": { "source": "binance" },     // Fallback
    "SOL": { "source": "coingecko" }     // CoinGecko
  }
}
```

---

## 🔍 Debugar se Encontrar Problemas

### Problema: Ainda recebo 503

**1. Verificar se backend está realmente rodando:**
```bash
ps aux | grep uvicorn
```

Se não aparecer nada, o backend não está rodando. Volte ao Terminal 1 e execute:
```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**2. Verificar se porta 8000 está livre:**
```bash
lsof -i :8000
```

Se aparecer algo, outra aplicação está usando a porta:
```bash
kill -9 <PID>  # Encerrar processo
```

**3. Verificar se dependências Python estão instaladas:**
```bash
cd backend
pip install -r requirements.txt
```

**4. Verificar logs do backend:**
Procure por mensagens de erro no Terminal 1. Exemplo:
```
ERROR: [Errno 48] Address already in use
ERROR: ModuleNotFoundError: No module named 'app'
```

---

### Problema: Frontend não conecta ao backend

**1. Verificar config do API:**

Abrir: `Frontend/src/config/app.ts`

Procure por:
```typescript
api: {
  baseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
```

Deve estar assim: `http://127.0.0.1:8000` (NÃO localhost ou 0.0.0.0)

**2. Verificar CORS no backend:**

Em `backend/app/main.py`, procure por CORSMiddleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Deve estar permitindo
    ...
)
```

**3. Testar requisição manualmente:**

No console do navegador (F12 → Console):
```javascript
fetch('http://127.0.0.1:8000/api/v1/prices/batch?symbols=BTC&fiat=brl')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

Você deve ver a resposta JSON em segundos.

---

### Problema: Preços não atualizam automaticamente

**1. Verificar se useEffect está sendo chamado:**

Em `Frontend/src/hooks/usePrices.ts`, procure por:
```typescript
useEffect(() => {
  fetchPrices()
  const interval = setInterval(fetchPrices, 5000)
  return () => clearInterval(interval)
}, [fetchPrices])
```

**2. Verificar se intervalo está rodando:**

No console (F12):
```javascript
// Verificar se há fetches a cada 5 segundos
// Você deve ver requisições GET a cada 5 segundos na aba Network
```

**3. Verificar se cache está funcionando:**

Primeira requisição: ~2-3 segundos
Segunda requisição (5 segundos depois): <50ms (em cache)

---

## 📊 Monitorar Performance

### Requisições por segundo

No Console do Navegador:
```javascript
// Contar requisições para o endpoint
let count = 0
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name.includes('/prices/batch')) {
      console.log('Requisição para:', entry.name)
      console.log('Tempo:', entry.duration.toFixed(2) + 'ms')
      count++
    }
  })
})
observer.observe({ entryTypes: ['resource'] })
setInterval(() => console.log('Total de requisições:', count), 5000)
```

### Cache effectiveness

No console do backend, você deve ver:
```
INFO: Cache hit for brl
INFO: CoinGecko: Fetched 8 prices successfully
INFO: Cached 8 prices for brl
```

---

## ✅ Validação Final Checklist

- [ ] Backend rodando em http://127.0.0.1:8000
- [ ] Frontend rodando em http://localhost:5173
- [ ] Endpoint /health respondendo
- [ ] Endpoint /api/v1/prices/batch respondendo com preços
- [ ] Frontend carregando preços da InstantTradePage
- [ ] Console do navegador SEM erros 503
- [ ] Preços aparecem em BRL na página
- [ ] Preços atualizam a cada 5 segundos
- [ ] DevTools mostra requisições indo para http://127.0.0.1:8000
- [ ] Cache funciona (segunda requisição mais rápida)

---

## 🎯 Próximos Passos

Se tudo está funcionando:

1. **Build para produção:**
   ```bash
   cd Frontend
   npm run build
   ```

2. **Deploy do backend:**
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Configurar variáveis de ambiente:**
   - Backend: `DATABASE_URL`, `JWT_SECRET`
   - Frontend: `VITE_API_URL` (apontando para IP/domínio de produção)

---

## 📞 Suporte Rápido

| Problema | Solução |
|----------|---------|
| `Module not found` | `pip install -r requirements.txt` |
| `Port already in use` | `lsof -i :8000` + `kill -9 <PID>` |
| `CORS error` | Verificar CORSMiddleware em main.py |
| `Cannot GET /api/v1/prices/batch` | Router não está registrado em main.py |
| `503 Service Unavailable` | Backend não está rodando ou porta errada |
| `Preços vazios` | Verificar conexão com CoinGecko API |

---

**Status**: ✅ **TUDO PRONTO PARA TESTAR**

Qualquer dúvida ou problema, os logs do terminal irão indicar exatamente o que está faltando!
