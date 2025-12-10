# Estratégia de Cache e Rate Limiting para Preços

## Problema Original

- **Muitas requisições:** Cada componente fazia sua própria chamada ao endpoint de preços
- **Rate limiting:** Backend bloqueava após muitas requisições em curto período
- **Performance:** Página carregava lentamente apesar de ter dados em cache

## Solução Implementada

### 3 Camadas de Cache

#### 1️⃣ **Cache em localStorage** (`PriceCache`)

- **TTL:** 5 minutos por moeda/moeda-fiat
- **Escopo:** Global, persiste entre navegações
- **Uso:** Primeira linha de defesa, carrega imediatamente quando app abre
- **Arquivo:** `Frontend/src/services/price-cache.ts`
- **Métodos:**
  - `getPrice(symbol, currency)` - Retorna preço se em cache e válido
  - `setPrice(symbol, price, currency)` - Armazena novo preço
  - `setPrices(prices, currency)` - Batch de preços
  - `clear()` - Limpa tudo (testes)

#### 2️⃣ **Deduplicação de Requisições** (`PriceService`)

- **Problema evitado:** Múltiplas chamadas simultâneas para o mesmo símbolo
- **Solução:** Map de requisições em andamento (`requestQueue`)
- **Efeito:** Se 5 componentes pedem USDT ao mesmo tempo, apenas 1 API call é feita
- **Arquivo:** `Frontend/src/services/price-service.ts`

#### 3️⃣ **Rate Limiting** (5s minimum)

- **Intervalo mínimo:** 5 segundos entre requisições para o mesmo símbolo
- **Implementação:** Map `lastRequestTime` rastreia última requisição
- **Efeito:** Previne spam de requisições para a mesma moeda
- **Arquivo:** `Frontend/src/services/price-service.ts`

### Fluxo de Dados

```
usePrices Hook
    ↓
    ├─ Busca em cache (localStorage) → Retorna imediatamente se válido
    ├─ Se não em cache:
    │  ↓
    │  PriceService.getPrices()
    │  ├─ Verifica requestQueue (deduplicação)
    │  │  └─ Se já fetching → Aguarda resultado em andamento
    │  ├─ Verifica lastRequestTime (rate limiting)
    │  │  └─ Se < 5s desde última → Aguarda intervalo
    │  ├─ Busca do endpoint batch
    │  │  └─ Se falhar → Tenta endpoint alternativo
    │  ├─ Armazena em cache (localStorage)
    │  └─ Retorna preços
    └─ Atualiza estado React + auto-refresh a cada 5s
```

### Endpoints com Fallback

1. **Primário:** `GET /api/v1/prices/batch?symbols=MATIC,BASE&fiat=brl`
   - Mais eficiente para múltiplos símbolos
   - Se falhar:
2. **Alternativo:** `GET /api/v1/prices?symbols=MATIC,BASE&fiat=brl`
   - Fallback quando batch indisponível

### Integração no Hook

```typescript
// usePrices.ts
const { prices, loading, error } = usePrices(["USDT", "MATIC"], "BRL");

// Fluxo:
// 1. Carrega cache imediatamente (se existe e válido)
// 2. Chama PriceService.getPrices() em background
// 3. PriceService verifica deduplicação e rate limiting
// 4. Atualiza estado com preços atualizados
// 5. Auto-refresh a cada 5 segundos (mas com deduplicação)
```

## Benefícios

✅ **Sem Rate Limiting:** Requisições agora respeitam intervalo mínimo  
✅ **Menos API Calls:** Deduplicação reduz carga no servidor  
✅ **Instantâneo:** Cache localStorage carrega imediatamente  
✅ **Sincronizado:** Auto-refresh mantém dados atualizados  
✅ **Resiliente:** Fallback para endpoint alternativo

## Monitoramento

```typescript
// Ver status de requisições em aberto
PriceService.getStatus();
// Output: { queuedRequests: 2, lastRequests: [...] }

// Ver cache
PriceCache.getStatus("BRL");
// Output: { cached: 15, expired: 3 }
```

## Testes

```typescript
// Limpar cache (para simular dados antigos)
PriceCache.clear();
PriceService.clearCache();

// Múltiplos componentes pedindo mesma moeda
const [prices1] = usePrices(["USDT"], "BRL");
const [prices2] = usePrices(["USDT"], "BRL");
const [prices3] = usePrices(["USDT"], "BRL");
// Resultado: 1 API call, 3 componentes com resultado
```

## Próximas Melhorias Possíveis

1. **WebSocket para atualização em tempo real:** Ao invés de polling a cada 5s
2. **Compressão de dados:** Reduzir tamanho das requisições
3. **Service Worker:** Oferecer offline support com cache persistente
4. **Análise de uso:** Rastrear qual moeda é mais requisitada para priorizar

## Referência de Código

| Arquivo               | Responsabilidade                              |
| --------------------- | --------------------------------------------- |
| `usePrices.ts`        | Hook React para buscar e cachear preços       |
| `price-service.ts`    | Lógica centralizada com dedup e rate limiting |
| `price-cache.ts`      | localStorage persistence                      |
| `CreateOrderPage.tsx` | Usa `usePrices()` com cache automático        |
