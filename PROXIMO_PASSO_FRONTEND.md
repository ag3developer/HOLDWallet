# 🎯 PRÓXIMO PASSO: INTEGRAÇÃO FRONTEND

## Status Atual: ✅ Backend 100% Completo

O backend está **100% implementado e testado** com todos os endpoints de saldo funcionando perfeitamente. Agora precisamos conectar isso no Frontend.

---

## 📱 O Que Fazer Agora

### PHASE 1: Display de Saldo (1-2 horas)

#### 1. Criar Hook `useWalletBalance`
**Arquivo:** `Frontend/src/hooks/useWalletBalance.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useWalletBalance(userId?: number) {
  return useQuery({
    queryKey: ['wallet', 'balance', userId],
    queryFn: async () => {
      const { data } = await api.get('/wallet/balance', {
        params: { user_id: userId || 1 }
      });
      return data.data;
    }
  });
}
```

#### 2. Exibir no Dashboard
**Arquivo:** `Frontend/src/pages/Dashboard.tsx`

```typescript
function Dashboard() {
  const { data: balances } = useWalletBalance();

  return (
    <div className="balance-container">
      <h3>💰 Seus Saldos</h3>
      
      {balances?.map((balance) => (
        <div key={balance.cryptocurrency} className="balance-card">
          <h4>{balance.cryptocurrency}</h4>
          <p>💵 Disponível: {balance.available_balance.toFixed(2)}</p>
          <p>🔒 Congelado: {balance.locked_balance.toFixed(2)}</p>
          <p className="total">
            📊 Total: {balance.total_balance.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
}
```

#### 3. Validar ao Criar Ordem
**Arquivo:** `Frontend/src/pages/p2p/CreateOrderPage.tsx`

```typescript
async function createOrder(data: OrderFormData) {
  // 1. Consultar saldo
  const balance = await fetchBalance(data.cryptocurrency);
  
  // 2. Validar
  if (data.orderType === 'sell' && balance.available < data.amount) {
    toast.error(`Você precisa de ${data.amount} ${data.cryptocurrency}`);
    return;
  }
  
  if (data.orderType === 'buy') {
    const totalNeeded = data.amount * data.price;
    if (balance.available < totalNeeded) {
      toast.error(`Você precisa de ${totalNeeded} BRL`);
      return;
    }
  }
  
  // 3. Criar ordem (congelamento automático no backend)
  await api.post('/orders', data);
  toast.success('Ordem criada!');
}
```

---

## �� PHASE 2: Integração de Webhooks (2-3 horas)

### Detectar Depósitos Blockchain

#### Backend Webhook Receiver
**Arquivo:** `backend/app/routers/blockchain_webhooks.py` (novo)

```python
from fastapi import APIRouter, Body

router = APIRouter(tags=["webhooks"])

@router.post("/webhooks/blockchain/deposit")
async def blockchain_deposit_webhook(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Webhook chamado quando blockchain detecta depósito
    
    Payload esperado:
    {
        "tx_hash": "0x123abc...",
        "user_address": "0x456def...",
        "amount": 100,
        "cryptocurrency": "USDT",
        "network": "polygon"
    }
    """
    
    # 1. Encontrar usuário pelo endereço
    user = db.query(User).join(Address).filter(
        Address.address == payload['user_address']
    ).first()
    
    if not user:
        return {"error": "User not found"}
    
    # 2. Chamar /wallet/deposit com os dados
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://localhost:8000/wallet/deposit",
            params={"user_id": user.id},
            json={
                "cryptocurrency": payload['cryptocurrency'],
                "amount": payload['amount'],
                "transaction_hash": payload['tx_hash'],
                "reason": f"Deposit from {payload['network']}"
            }
        )
    
    return {"status": "processed"}
```

#### Frontend: Notificar Depósito
```typescript
import { useEffect } from 'react';

export function DepositListener() {
  useEffect(() => {
    // Polling a cada 10 segundos
    const interval = setInterval(async () => {
      const balance = await fetchBalance('USDT');
      if (balance.available > lastKnownBalance) {
        toast.success(`✅ Depósito de ${balance.available - lastKnownBalance} USDT recebido!`);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
}
```

---

## 💳 PHASE 3: Flow Completo no P2P (1-2 horas)

### Criar Order com Validação

```typescript
function CreateOrderFlow() {
  const { data: balance } = useWalletBalance();

  return (
    <form onSubmit={handleSubmit}>
      <select name="type">
        <option value="buy">Comprar</option>
        <option value="sell">Vender</option>
      </select>
      
      <input name="amount" type="number" />
      
      <input name="price" type="number" />
      
      {/* Exibir saldo em tempo real */}
      {balance && (
        <div className="balance-info">
          <p>Saldo disponível: {balance.available_balance.toFixed(2)}</p>
          <p>Serão congelados: {calculateFrozenAmount(formData).toFixed(2)}</p>
        </div>
      )}
      
      <button type="submit">Criar Ordem</button>
    </form>
  );
}
```

### Iniciar Trade com Freeze Automático

```typescript
async function initiateTrade(orderId: number, amount: number) {
  // 1. Backend valida saldo
  const response = await api.post('/trades', {
    order_id: orderId,
    amount: amount,
    payment_method_id: 1 // User selected
  });
  
  if (response.status === 402) {
    toast.error('Saldo insuficiente! Faça um depósito');
    return;
  }
  
  // 2. Refresh balances para mostrar congelamento
  queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
  
  toast.success(`Trade iniciado! ${amount} unidades congeladas`);
}
```

### Completar Trade com Liberação de Escrow

```typescript
async function completeTrade(tradeId: number) {
  // 1. Backend libera escrow automaticamente
  await api.post(`/trades/${tradeId}/complete`, {});
  
  // 2. Refresh balances para mostrar resultado final
  queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
  
  toast.success('✅ Trade completo! Saldo transferido');
}
```

---

## 📊 Estado Global (Zustand)

```typescript
import { create } from 'zustand';

interface BalanceStore {
  balances: Record<string, Balance>;
  loading: boolean;
  fetchBalances: (userId: number) => Promise<void>;
  updateBalance: (crypto: string, balance: Balance) => void;
}

export const useBalanceStore = create<BalanceStore>((set) => ({
  balances: {},
  loading: false,
  
  fetchBalances: async (userId) => {
    set({ loading: true });
    const data = await api.get(`/wallet/balance?user_id=${userId}`);
    set({ balances: data, loading: false });
  },
  
  updateBalance: (crypto, balance) => {
    set((state) => ({
      balances: {
        ...state.balances,
        [crypto]: balance
      }
    }));
  }
}));
```

---

## 🎨 UI Components

### BalanceCard Component

```typescript
interface BalanceCardProps {
  cryptocurrency: string;
  available: number;
  locked: number;
  total: number;
}

export function BalanceCard({
  cryptocurrency,
  available,
  locked,
  total
}: BalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <h3 className="text-xl font-bold">{cryptocurrency}</h3>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span>💵 Disponível:</span>
          <span className="font-mono">{available.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>🔒 Congelado:</span>
          <span className="font-mono">{locked.toFixed(2)}</span>
        </div>
        
        <div className="border-t border-white/30 mt-2 pt-2 flex justify-between">
          <span>📊 Total:</span>
          <span className="font-mono font-bold">{total.toFixed(2)}</span>
        </div>
      </div>
      
      {locked > 0 && (
        <div className="mt-4 bg-yellow-400/30 rounded p-2 text-sm">
          ⚠️ {locked.toFixed(2)} {cryptocurrency} congelados em trades
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Roadmap de Implementação

```
SEMANA 1:
├─ Day 1-2: Hook useWalletBalance + Display
├─ Day 3: Validação de saldo ao criar ordem
├─ Day 4: UI da CreateOrderPage melhorada
└─ Day 5: Testes integrados

SEMANA 2:
├─ Day 1-2: Webhook blockchain
├─ Day 3: Notificações de depósito
├─ Day 4: Flow completo no P2P
└─ Day 5: Polish + Testes

SEMANA 3:
├─ Day 1: Sistema de comissões
├─ Day 2: Admin dashboard de saldos
├─ Day 3-4: Security audit + Performance
└─ Day 5: Deploy em staging
```

---

## ✅ Checklist Frontend

- [ ] Hook `useWalletBalance` criado
- [ ] Dashboard mostrando saldos
- [ ] Validação ao criar ordem
- [ ] UI de CreateOrderPage melhorada
- [ ] Freeze/Unfreeze visual
- [ ] Webhook blockchain recebendo
- [ ] Toast notifications
- [ ] Error handling
- [ ] Loading states
- [ ] Refresh automático de balances
- [ ] Tests unitários
- [ ] Tests integrados

---

## 📞 Suporte

Backend está pronto em:
- ✅ `/wallet/deposit` - POST (salvar depósito)
- ✅ `/wallet/balance` - GET (consultar saldo)
- ✅ `/wallet/freeze` - POST (congelar manual)
- ✅ `/wallet/unfreeze` - POST (descongelar manual)
- ✅ `/wallet/history` - GET (histórico)
- ✅ `/trades` - POST (validação + freeze automático)
- ✅ `/trades/{id}/complete` - POST (escrow release)

Frontend pode começar já! 🚀

