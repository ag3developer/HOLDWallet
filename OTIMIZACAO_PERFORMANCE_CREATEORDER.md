# ✅ OTIMIZAÇÃO: Performance do CreateOrderPage

## 🐛 Problema Identificado

A página CreateOrder estava **muito lenta** devido a:

1. **Chamadas repetidas ao mesmo endpoint** - `/wallets/` sendo chamado várias vezes
2. **Auto-refresh agressivo** - Preços atualizando a cada 5 segundos
3. **Sem cache** - Cada render buscava wallet ID novamente
4. **Re-renders desnecessários** - Estado sendo atualizado múltiplas vezes

### Logs do Problema:

```
[CreateOrder] Fetching wallet list...  // Chamado múltiplas vezes!
usePrices.ts:104 [usePrices] Auto-refreshing prices...  // A cada 5 segundos!
useWalletBalances.ts:65 [useWalletBalances] No wallet ID provided
CreateOrderPage.tsx:87 [CreateOrder] Balances updated from hook: {} Loading: false
```

## 🎯 Otimizações Aplicadas

### 1. **Cache de Wallet ID com React Query** ✅

**Problema:** `CreateOrderPage` estava fazendo `fetch('/wallets/')` diretamente no `useEffect`, sem cache.

**Solução:** Criado hook `useUserWallet` com React Query:

```typescript
// Frontend/src/hooks/useUserWallet.ts
export const useUserWallet = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["user-wallet", token],
    queryFn: async () => {
      const response = await fetch(`${APP_CONFIG.api.baseUrl}/wallets/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wallets = await response.json();
      return wallets[0];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos ✅
    gcTime: 10 * 60 * 1000, // Manter por 10 minutos ✅
    retry: 2,
  });
};
```

**Benefícios:**

- ✅ Wallet ID buscado uma vez e cacheado por 5 minutos
- ✅ Compartilhado entre componentes (React Query cache global)
- ✅ Retry automático em caso de falha
- ✅ Loading states automáticos

### 2. **Aumento do Intervalo de Auto-Refresh de Preços** ✅

**Problema:** `usePrices` atualizava a cada 5 segundos, gerando tráfego excessivo.

**Antes:**

```typescript
// Frontend/src/hooks/usePrices.ts
const interval = setInterval(() => {
  fetchPrices();
}, 5000); // 5 segundos ❌
```

**Depois:**

```typescript
const interval = setInterval(() => {
  fetchPrices();
}, 30000); // 30 segundos ✅
```

**Benefícios:**

- ✅ 6x menos chamadas à API de preços
- ✅ Preços ainda atualizam frequentemente (30s é aceitável)
- ✅ Reduz carga no servidor e no cliente

### 3. **Aumento do Cache de Balances** ✅

**Problema:** `useWalletBalances` tinha cache de apenas 60 segundos.

**Antes:**

```typescript
// Frontend/src/hooks/useWalletBalances.ts
const CACHE_TTL = 60000; // 60 seconds ❌
```

**Depois:**

```typescript
const CACHE_TTL = 120000; // 120 seconds (2 minutos) ✅
```

**Benefícios:**

- ✅ Balances cacheados por mais tempo
- ✅ Menos chamadas ao backend
- ✅ User pode refresh manual quando necessário

### 4. **Simplificação do CreateOrderPage** ✅

**Antes:**

```typescript
// CreateOrderPage.tsx tinha:
const [walletId, setWalletId] = useState<string | undefined>();

useEffect(() => {
  const fetchWalletId = async () => {
    const response = await fetch(`${API_BASE}/wallets/`); // ❌ Sem cache!
    const wallets = await response.json();
    setWalletId(wallets[0].id);
  };
  fetchWalletId();
}, [token]);

const { balances } = useWalletBalances(walletId);
```

**Depois:**

```typescript
// Muito mais simples e com cache!
const { data: wallet, isLoading: walletLoading } = useUserWallet(); // ✅ Com cache
const { balances, loading: balancesLoading } = useWalletBalances(wallet?.id);

// Combina loading states
setBalancesLoading(balancesLoading || walletLoading);
```

**Benefícios:**

- ✅ Código mais limpo e legível
- ✅ Menos estado local para gerenciar
- ✅ Cache automático via React Query
- ✅ Loading states combinados corretamente

## 📊 Comparação: Antes vs Depois

### Antes (Lento):

```
Tempo: 0s    → Fetch /wallets/ (CreateOrder)
Tempo: 0.5s  → Fetch /wallets/balances
Tempo: 5s    → Refresh preços #1
Tempo: 10s   → Refresh preços #2
Tempo: 15s   → Refresh preços #3
Tempo: 20s   → Refresh preços #4
Tempo: 25s   → Refresh preços #5
Tempo: 30s   → Refresh preços #6

Total em 30s: 8 requisições ❌
```

### Depois (Rápido):

```
Tempo: 0s    → Fetch /wallets/ (useUserWallet com cache)
Tempo: 0.5s  → Fetch /wallets/balances (cache 2 min)
Tempo: 30s   → Refresh preços #1

Total em 30s: 3 requisições ✅
Economia: 62.5% menos requisições!
```

### Cache Benefits:

```
1ª Visita:  Fetch /wallets/          → 200ms
2ª Visita:  Cache hit (5 min)        → 0ms ✅ (instantâneo!)
3ª Visita:  Cache hit                → 0ms ✅
10ª Visita: Cache expired, refetch   → 200ms
```

## 🧪 Como Testar

### 1. **Verificar Cache de Wallet**

1. Abrir DevTools → Network
2. Navegar para CreateOrderPage
3. **Primeira vez:** Deve ver `GET /wallets/`
4. **Navegar para outra página e voltar**
5. **Segunda vez:** NÃO deve ver `GET /wallets/` (cache hit!) ✅

### 2. **Verificar Refresh de Preços**

1. Abrir Console do navegador
2. Filtrar por `[usePrices]`
3. Contar intervalo entre mensagens
4. ✅ Deve ser **~30 segundos** (não 5)

### 3. **Verificar Loading States**

1. Navegar para CreateOrderPage
2. Observar skeleton/loading
3. ✅ Deve carregar **rápido** na segunda visita (cache)

## 📝 Arquivos Modificados

### 1. **`Frontend/src/hooks/useUserWallet.ts`** (NOVO ✨)

- Criado hook com React Query
- Cache de 5 minutos para wallet ID
- Compartilhado globalmente

### 2. **`Frontend/src/hooks/usePrices.ts`**

- **Linha 103-104:** Intervalo mudado de 5000ms → 30000ms
- Auto-refresh reduzido de 5s → 30s

### 3. **`Frontend/src/hooks/useWalletBalances.ts`**

- **Linha 11:** CACHE_TTL mudado de 60000ms → 120000ms
- Cache aumentado de 1min → 2min

### 4. **`Frontend/src/pages/p2p/CreateOrderPage.tsx`**

- **Linha 9:** Adicionado `import { useUserWallet }`
- **Linha 22:** Substituído `useState` + `useEffect` por `useUserWallet()`
- **Linha 54:** Passa `wallet?.id` para `useWalletBalances`
- **Linha 66:** Combina `walletLoading` com `balancesLoading`
- **Removido:** Todo o `useEffect(() => { fetchWalletId() })` (50+ linhas)

## ✅ Checklist

- [x] **Criar useUserWallet hook** - Cache de wallet ID
- [x] **Aumentar intervalo de refresh** - 5s → 30s
- [x] **Aumentar cache de balances** - 60s → 120s
- [x] **Simplificar CreateOrderPage** - Remover fetch manual
- [x] **Combinar loading states** - walletLoading + balancesLoading
- [ ] **Testar performance** - User deve verificar melhoria
- [ ] **Verificar logs** - Menos mensagens repetidas

## 🚀 Próximas Otimizações (Opcional)

### 1. **Adicionar React Query em Outros Hooks**

Converter hooks como `useTraderProfile`, `usePaymentMethods` para usar React Query:

```typescript
// Exemplo:
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await fetch("/p2p/payment-methods");
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};
```

### 2. **Debounce de Inputs**

Para campos como `amount`, `minAmount`, adicionar debounce:

```typescript
import { useDebouncedCallback } from "use-debounce";

const handleAmountChange = useDebouncedCallback((value: string) => {
  setAmount(value);
}, 300); // 300ms de delay
```

### 3. **Lazy Loading de Componentes**

```typescript
const UserProfileSection = lazy(() => import("./UserProfileSection"));
```

### 4. **Virtualization para Listas Longas**

Se houver muitos tokens, usar `react-window` ou `react-virtual`.

## 🎯 Resultados Esperados

### Performance:

- ✅ **Primeira carga:** ~500ms (mesma velocidade)
- ✅ **Segunda carga:** ~100ms (5x mais rápido com cache!)
- ✅ **Navegação:** Instantânea entre páginas
- ✅ **Requisições:** 62% menos tráfego de rede

### Experiência do Usuário:

- ✅ Página carrega mais rápido na segunda visita
- ✅ Menos "flashing" de loading states
- ✅ Menos consumo de banda/dados
- ✅ Melhor experiência em conexões lentas

### Backend:

- ✅ 62% menos carga no servidor
- ✅ Menos requisições simultâneas
- ✅ Melhor escalabilidade

## 📚 Padrões Implementados

### Cache Strategy:

```
┌─────────────────────────────────────────┐
│ Wallet ID (useUserWallet)               │
│ • staleTime: 5 min                      │
│ • gcTime: 10 min                        │
│ • Compartilhado globalmente             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Balances (useWalletBalances)            │
│ • CACHE_TTL: 2 min                      │
│ • In-memory cache                       │
│ • Manual refresh disponível             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Prices (usePrices)                      │
│ • Auto-refresh: 30s                     │
│ • Pode ser desabilitado se necessário   │
└─────────────────────────────────────────┘
```

## ⚠️ Notas Importantes

1. **Cache vs Real-time:**

   - Wallet ID: Raramente muda, cache longo OK ✅
   - Balances: Pode mudar com trades, cache médio OK ✅
   - Prices: Mudam frequentemente, refresh periódico OK ✅

2. **Manual Refresh:**

   - User pode clicar em "Refresh" para forçar atualização
   - Cache é ignorado no refresh manual

3. **Invalidação de Cache:**
   - React Query invalida cache automaticamente
   - Após criar trade, chamar `queryClient.invalidateQueries(['wallet-balances'])`

## 🎉 Status

- ✅ **useUserWallet criado** - Hook com cache de 5 min
- ✅ **usePrices otimizado** - Refresh de 5s → 30s
- ✅ **useWalletBalances otimizado** - Cache de 1min → 2min
- ✅ **CreateOrderPage simplificado** - Removido fetch manual
- ✅ **Documentação completa** - Este arquivo
- ⏳ **Aguardando teste** - User verificar melhoria de performance

**Teste agora e veja a diferença!** 🚀
