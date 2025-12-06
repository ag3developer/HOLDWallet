# 🎯 Como Mostrar Saldo Real no Dashboard

## 📊 Status Atual

Atualmente o Dashboard está mostrando:
- ✅ Lista de carteiras (nomes, tipos)
- ✅ Ícones das moedas
- ❌ Saldos MOCK (0.000000 fixo)
- ❌ Valores em R$ MOCK (R$ 0,00 fixo)

## 🔧 O Que Precisa Ser Feito

### 1️⃣ **Backend - Implementar Consulta de Saldo por Rede**

**Arquivo:** `backend/app/routers/wallet.py`

Atualmente existe apenas:
```python
@router.get("/{wallet_id}/balance")
async def get_wallet_balance(wallet_id: str) -> WalletBalanceResponse:
    # Retorna saldo total da carteira
    pass
```

**FALTA criar:**
```python
@router.get("/{wallet_id}/balances")
async def get_wallet_balances_by_network(wallet_id: str) -> Dict[str, NetworkBalance]:
    """
    Retorna saldo de cada rede da carteira
    Exemplo:
    {
        "bitcoin": {
            "network": "bitcoin",
            "balance": "0.00125",
            "balanceUSD": "52.50",
            "balanceBRL": "262.50"
        },
        "ethereum": {
            "network": "ethereum",
            "balance": "0.5",
            "balanceUSD": "1340.00",
            "balanceBRL": "6700.00"
        }
    }
    """
    pass
```

### 2️⃣ **Backend - Implementar Consulta de Blockchain**

**Arquivo:** `backend/app/services/blockchain_service.py` (criar se não existe)

```python
class BlockchainService:
    async def get_balance(self, address: str, network: str) -> Decimal:
        """
        Consulta saldo real na blockchain
        - Bitcoin: usa API Blockchain.info ou Blockchair
        - Ethereum: usa Infura ou Alchemy
        - BSC: usa BSCScan API
        - Polygon: usa PolygonScan API
        - Tron: usa TronGrid API
        - etc...
        """
        if network == "bitcoin":
            return await self._get_bitcoin_balance(address)
        elif network == "ethereum":
            return await self._get_ethereum_balance(address)
        # ... outros
        
    async def _get_bitcoin_balance(self, address: str) -> Decimal:
        # Exemplo usando Blockchain.info API
        url = f"https://blockchain.info/q/addressbalance/{address}"
        response = await httpx.get(url)
        satoshis = int(response.text)
        btc = Decimal(satoshis) / Decimal(100_000_000)
        return btc
```

### 3️⃣ **Frontend - Serviço para Buscar Saldo por Rede**

**Arquivo:** `Frontend/src/services/wallet.ts`

Adicionar novo método:
```typescript
class WalletService {
  // Já existe
  async getWalletBalance(walletId: string): Promise<{ balance: string; balanceUSD: string }> {
    // ...
  }

  // ADICIONAR ESTE
  async getWalletBalancesByNetwork(walletId: string): Promise<Record<string, NetworkBalance>> {
    const response = await apiClient.get<ApiResponse<Record<string, NetworkBalance>>>(`/wallets/${walletId}/balances`)
    return response.data.data || {}
  }
}

interface NetworkBalance {
  network: string
  balance: string
  balanceUSD: string
  balanceBRL: string
}
```

### 4️⃣ **Frontend - Hook para Múltiplos Saldos**

**Arquivo:** `Frontend/src/hooks/useWallet.ts`

Adicionar novo hook:
```typescript
// Buscar saldos de múltiplas carteiras
export function useMultipleWalletBalances(walletIds: string[]) {
  return useQueries({
    queries: walletIds.map(id => ({
      queryKey: ['wallet-balances', id],
      queryFn: () => walletService.getWalletBalancesByNetwork(id),
      staleTime: 30 * 1000, // 30 segundos
      refetchInterval: 60 * 1000, // Atualiza a cada 1 minuto
    }))
  })
}
```

### 5️⃣ **Frontend - Integrar no Dashboard**

**Arquivo:** `Frontend/src/pages/dashboard/DashboardPage.tsx`

```typescript
export const DashboardPage = () => {
  const { data: apiWallets } = useWallets()
  
  // ADICIONAR: Buscar saldos de todas as carteiras
  const walletIds = apiWallets?.map(w => w.id) || []
  const balancesQueries = useMultipleWalletBalances(walletIds)
  
  // ADICIONAR: Combinar carteiras com saldos
  const walletsWithBalances = useMemo(() => {
    return apiWallets?.map((wallet, index) => {
      const balancesData = balancesQueries[index]?.data || {}
      return {
        ...wallet,
        networkBalances: balancesData
      }
    })
  }, [apiWallets, balancesQueries])
  
  // No accordion expandido, usar os saldos reais:
  {networks.map((network) => {
    const networkBalance = wallet.networkBalances?.[network.network]
    return (
      <div key={network.network}>
        <p>{networkBalance?.balance || '0.000000'} {network.symbol}</p>
        <p>R$ {networkBalance?.balanceBRL || '0,00'}</p>
      </div>
    )
  })}
}
```

## 🎯 Resumo das Mudanças

### Backend (Python/FastAPI)
1. ✅ Endpoint `/wallets/{id}/balance` (já existe)
2. ❌ **CRIAR** Endpoint `/wallets/{id}/balances` (saldo por rede)
3. ❌ **CRIAR** `BlockchainService` para consultar APIs de blockchain
4. ❌ **CRIAR** Cache de saldos (Redis/SQLite) para evitar muitas consultas

### Frontend (React/TypeScript)
1. ✅ Serviço `getWalletBalance()` (já existe)
2. ❌ **CRIAR** Serviço `getWalletBalancesByNetwork()`
3. ❌ **CRIAR** Hook `useMultipleWalletBalances()`
4. ❌ **INTEGRAR** no Dashboard para mostrar saldos reais

## 🚀 Próximos Passos

### Passo 1: Backend - Criar Endpoint de Saldos
```bash
cd backend
# Editar app/routers/wallet.py
# Adicionar endpoint /wallets/{id}/balances
```

### Passo 2: Backend - Implementar Consulta Blockchain
```bash
# Criar app/services/blockchain_service.py
# Implementar consultas para cada rede
```

### Passo 3: Frontend - Adicionar Serviço
```bash
cd Frontend
# Editar src/services/wallet.ts
# Adicionar getWalletBalancesByNetwork()
```

### Passo 4: Frontend - Criar Hook
```bash
# Editar src/hooks/useWallet.ts
# Adicionar useMultipleWalletBalances()
```

### Passo 5: Frontend - Integrar no Dashboard
```bash
# Editar src/pages/dashboard/DashboardPage.tsx
# Usar o novo hook e mostrar saldos reais
```

## 🔑 APIs de Blockchain Necessárias

Para consultar saldos reais, você precisa de chaves API:

### Bitcoin
- **Blockchain.info** (gratuito, sem chave)
- **Blockchair** (requer API key)

### Ethereum / ERC-20
- **Infura** (gratuito até 100k req/dia)
- **Alchemy** (gratuito até 300M compute units/mês)

### BSC (Binance Smart Chain)
- **BSCScan API** (gratuito, requer chave)

### Polygon
- **PolygonScan API** (gratuito, requer chave)

### Tron
- **TronGrid** (gratuito, requer chave)

### Solana
- **Solana RPC** (gratuito, endpoint público)

## 📝 Exemplo de Resposta do Backend

```json
{
  "success": true,
  "data": {
    "bitcoin": {
      "network": "bitcoin",
      "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "balance": "0.00125000",
      "balanceUSD": "52.50",
      "balanceBRL": "262.50",
      "lastUpdated": "2025-11-25T10:30:00Z"
    },
    "ethereum": {
      "network": "ethereum",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "balance": "0.50000000",
      "balanceUSD": "1340.00",
      "balanceBRL": "6700.00",
      "lastUpdated": "2025-11-25T10:30:00Z"
    }
  }
}
```

## ⚠️ Considerações Importantes

1. **Cache**: Não consulte blockchain a cada request (muito lento)
2. **Rate Limits**: APIs têm limites de requisições
3. **Fallback**: Se API falhar, mostrar último saldo em cache
4. **Loading**: Mostrar skeleton enquanto carrega saldos
5. **Refresh**: Botão para forçar atualização de saldo

## 🎨 UX - Mostrar Loading

Enquanto busca saldos:
```tsx
{isLoadingBalance ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-20"></div>
  </div>
) : (
  <p>{balance} {symbol}</p>
)}
```

---

**Status**: Documento criado em 25/11/2025
**Autor**: GitHub Copilot
**Projeto**: HOLD Wallet Dashboard
