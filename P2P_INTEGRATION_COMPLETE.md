# 🤝 P2P Integration - Checklist Completo

## 📊 Estado Atual

### ✅ Backend (Implementado)
- ✅ Models: `P2POrder`, `P2PMatch`, `P2PEscrow`, `P2PDispute`
- ✅ Service: `p2p_service.py` com lógica completa
- ✅ Router: `/api/p2p/` com todos os endpoints
- ✅ Sistema de Reputação integrado
- ✅ Chat P2P para trades
- ✅ Payment Methods

### ✅ Frontend (Implementado)
- ✅ Service: `p2pService` com todos os métodos
- ✅ Types: Interfaces completas
- ✅ Page: `P2PPage.tsx` (mock data)

### ⚠️ Pendente (Integração)
- ⏳ Conectar frontend com backend real
- ⏳ Remover mock data
- ⏳ Implementar hooks React Query
- ⏳ Testar fluxo completo
- ⏳ WebSocket para updates em tempo real

---

## 🎯 Plano de Integração

### Fase 1: Hooks React Query (Prioridade Alta)

#### 1.1 Hook: useP2POrders
```typescript
// Frontend/src/hooks/useP2POrders.ts
import { useQuery, useMutation, useQueryClient } from '@tantml:function_calls>
<invoke name="react-query'
import { p2pService } from '@/services/p2p'
import { useToast } from '@/hooks/useToast'

export function useP2POrders(filters?) {
  return useQuery({
    queryKey: ['p2p-orders', filters],
    queryFn: () => p2pService.getOrders(1, 20, filters),
    staleTime: 30000, // 30s
    refetchInterval: 60000, // 1min
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-orders'])
      queryClient.invalidateQueries(['my-orders'])
      showToast('Ordem criada com sucesso!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  return useMutation({
    mutationFn: p2pService.cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-orders'])
      showToast('Ordem cancelada', 'success')
    }
  })
}
```

#### 1.2 Hook: useP2PTrades
```typescript
// Frontend/src/hooks/useP2PTrades.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { p2pService } from '@/services/p2p'

export function useP2PTrades(filters?) {
  return useQuery({
    queryKey: ['p2p-trades', filters],
    queryFn: () => p2pService.getTrades(1, 20, filters),
  })
}

export function useStartTrade() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: p2pService.startTrade,
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-trades'])
      queryClient.invalidateQueries(['p2p-orders'])
    }
  })
}

export function useMarkPaymentSent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tradeId, message }) => 
      p2pService.markPaymentSent(tradeId, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-trades'])
    }
  })
}

export function useReleaseEscrow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: p2pService.releaseEscrow,
    onSuccess: () => {
      queryClient.invalidateQueries(['p2p-trades'])
    }
  })
}
```

#### 1.3 Hook: usePaymentMethods
```typescript
// Frontend/src/hooks/usePaymentMethods.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { p2pService } from '@/services/p2p'

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: p2pService.getPaymentMethods,
  })
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: p2pService.createPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods'])
    }
  })
}
```

---

### Fase 2: Atualizar P2PPage (Prioridade Alta)

#### 2.1 Remover Mock Data e Usar Hooks

```typescript
// Frontend/src/pages/p2p/P2PPage.tsx
import React, { useState } from 'react'
import { useP2POrders, useCreateOrder } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'

export const P2PPage = () => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [selectedFiat, setSelectedFiat] = useState('BRL')
  
  // Fetch real data
  const { data: ordersData, isLoading } = useP2POrders({
    type: activeTab,
    coin: selectedCrypto
  })
  
  const { data: paymentMethods } = usePaymentMethods()
  const createOrderMutation = useCreateOrder()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          className={`px-6 py-3 rounded-lg ${
            activeTab === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200'
          }`}
        >
          🟢 Comprar
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-6 py-3 rounded-lg ${
            activeTab === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200'
          }`}
        >
          🔴 Vender
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {ordersData?.data.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onTrade={handleStartTrade}
          />
        ))}
      </div>
    </div>
  )
}
```

---

### Fase 3: Componentes P2P (Prioridade Média)

#### 3.1 OrderCard Component
```typescript
// Frontend/src/components/p2p/OrderCard.tsx
import React from 'react'
import { P2POrder } from '@/types'
import { Star, Shield, Clock } from 'lucide-react'

interface OrderCardProps {
  order: P2POrder
  onTrade: (orderId: string) => void
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onTrade }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {order.user.username[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {order.user.username}
              </span>
              {order.user.isVerified && (
                <Shield className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{order.avgRating.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span>{order.completedTrades} trades</span>
              <span>•</span>
              <span>{order.successRate}% sucesso</span>
            </div>
          </div>
        </div>

        {/* Online Status */}
        {order.isOnline && (
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Online</span>
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Preço</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            R$ {parseFloat(order.price).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Disponível</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {order.amount} {order.coin}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Limites</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            R$ {order.minAmount} - R$ {order.maxAmount}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.paymentMethods.map((method) => (
          <span
            key={method.id}
            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium"
          >
            {method.name}
          </span>
        ))}
      </div>

      {/* Time Limit */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Clock className="w-4 h-4" />
        <span>Limite de pagamento: {order.timeLimit} minutos</span>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onTrade(order.id)}
        className={`mt-6 w-full py-3 rounded-lg font-semibold transition-colors ${
          order.type === 'sell'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {order.type === 'sell' ? 'Comprar' : 'Vender'} {order.coin}
      </button>
    </div>
  )
}
```

#### 3.2 TradeModal Component
```typescript
// Frontend/src/components/p2p/TradeModal.tsx
import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { P2POrder } from '@/types'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { useStartTrade } from '@/hooks/useP2PTrades'

interface TradeModalProps {
  isOpen: boolean
  onClose: () => void
  order: P2POrder
}

export const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, order }) => {
  const [amount, setAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  
  const { data: paymentMethods } = usePaymentMethods()
  const startTradeMutation = useStartTrade()

  const handleStartTrade = async () => {
    try {
      await startTradeMutation.mutateAsync({
        orderId: order.id,
        amount,
        paymentMethodId: selectedPaymentMethod,
      })
      onClose()
    } catch (error) {
      console.error('Failed to start trade:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {order.type === 'sell' ? 'Comprar' : 'Vender'} {order.coin}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quanto você quer {order.type === 'sell' ? 'comprar' : 'vender'}?
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min: ${order.minAmount} - Max: ${order.maxAmount}`}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <span className="absolute right-4 top-3 text-gray-500">
                {order.coin}
              </span>
            </div>
          </div>

          {/* Price Calculation */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Preço</span>
              <span className="font-semibold">R$ {order.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                R$ {(parseFloat(amount || '0') * parseFloat(order.price)).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Método de Pagamento
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione...</option>
              {paymentMethods?.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Atenção!</p>
                <ul className="space-y-1 text-xs">
                  <li>• Você tem {order.timeLimit} minutos para completar o pagamento</li>
                  <li>• Crypto ficará em escrow até confirmação</li>
                  <li>• Não cancele após iniciar o pagamento</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleStartTrade}
              disabled={!amount || !selectedPaymentMethod || startTradeMutation.isPending}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startTradeMutation.isPending ? 'Iniciando...' : 'Iniciar Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Fase 4: Backend Fixes (Prioridade Alta)

#### 4.1 Verificar Endpoints Backend

```bash
# Testar endpoints
curl -X GET "http://localhost:8000/api/p2p/marketplace?asset=BTC" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST "http://localhost:8000/api/p2p/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "order_type": "sell",
    "asset": "BTC",
    "amount": 0.5,
    "price_brl": 210000,
    "payment_methods": ["pix", "ted"],
    "min_order_amount": 1000,
    "max_order_amount": 50000
  }'
```

#### 4.2 Adicionar Autenticação aos Endpoints

```python
# backend/app/routers/p2p.py
from app.core.security import get_current_user
from app.models.user import User

@router.get("/marketplace")
async def get_p2p_marketplace(
    asset: Optional[str] = Query(None),
    order_type: Optional[OrderType] = Query(None),
    payment_method: Optional[PaymentMethod] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⬅️ ADD THIS
):
    """Get P2P marketplace with active orders"""
    # ...

@router.post("/orders")
async def create_p2p_order(
    order_data: CreateOrderRequest,  # Use Pydantic schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⬅️ ADD THIS
):
    """Create a new P2P trading order"""
    try:
        order = await p2p_service.create_p2p_order(
            db,
            current_user.id,  # ⬅️ Use current user
            order_data.order_type,
            order_data.asset,
            order_data.amount,
            order_data.price_brl,
            order_data.payment_methods,
            order_data.min_order_amount,
            order_data.max_order_amount,
            order_data.description,
            order_data.auto_accept
        )
        # ...
```

#### 4.3 Criar Schemas Pydantic

```python
# backend/app/routers/p2p.py
from pydantic import BaseModel, Field
from typing import List, Optional

class CreateOrderRequest(BaseModel):
    order_type: OrderType
    asset: str = Field(..., min_length=2, max_length=10)
    amount: float = Field(..., gt=0)
    price_brl: float = Field(..., gt=0)
    payment_methods: List[PaymentMethod]
    min_order_amount: Optional[float] = Field(None, gt=0)
    max_order_amount: Optional[float] = Field(None, gt=0)
    description: str = Field("", max_length=500)
    auto_accept: bool = False

class StartTradeRequest(BaseModel):
    order_id: str
    amount: float = Field(..., gt=0)
    payment_method_id: str
    message: Optional[str] = Field(None, max_length=500)
```

---

### Fase 5: WebSocket Real-Time (Prioridade Média)

#### 5.1 WebSocket Hook

```typescript
// Frontend/src/hooks/useP2PWebSocket.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from './useWebSocket'

export function useP2PWebSocket() {
  const queryClient = useQueryClient()
  const socket = useWebSocket('/ws/p2p')

  useEffect(() => {
    if (!socket) return

    // Nova ordem criada
    socket.on('order_created', (data) => {
      queryClient.invalidateQueries(['p2p-orders'])
    })

    // Ordem cancelada
    socket.on('order_cancelled', (data) => {
      queryClient.invalidateQueries(['p2p-orders'])
    })

    // Trade iniciado
    socket.on('trade_started', (data) => {
      queryClient.invalidateQueries(['p2p-trades'])
      // Mostrar notificação
    })

    // Pagamento enviado
    socket.on('payment_sent', (data) => {
      queryClient.invalidateQueries(['p2p-trades'])
    })

    // Pagamento confirmado
    socket.on('payment_confirmed', (data) => {
      queryClient.invalidateQueries(['p2p-trades'])
    })

    // Escrow liberado
    socket.on('escrow_released', (data) => {
      queryClient.invalidateQueries(['p2p-trades'])
      queryClient.invalidateQueries(['wallets'])
    })

    return () => {
      socket.off('order_created')
      socket.off('order_cancelled')
      socket.off('trade_started')
      socket.off('payment_sent')
      socket.off('payment_confirmed')
      socket.off('escrow_released')
    }
  }, [socket, queryClient])

  return socket
}
```

---

## ✅ Checklist de Integração

### Backend
- [ ] Adicionar `get_current_user` em todos os endpoints
- [ ] Criar Pydantic schemas para requests
- [ ] Validar UUIDs corretos
- [ ] Testar todos os endpoints com Postman/curl
- [ ] Implementar WebSocket endpoints
- [ ] Adicionar logging detalhado
- [ ] Tratamento de erros robusto

### Frontend
- [ ] Criar hooks React Query
- [ ] Remover mock data da P2PPage
- [ ] Criar componentes OrderCard, TradeModal
- [ ] Implementar TradeChat component
- [ ] Adicionar loading states
- [ ] Adicionar error handling
- [ ] Implementar WebSocket hook
- [ ] Testar fluxo completo

### Testes
- [ ] Teste: Criar ordem
- [ ] Teste: Iniciar trade
- [ ] Teste: Marcar pagamento enviado
- [ ] Teste: Confirmar pagamento
- [ ] Teste: Liberar escrow
- [ ] Teste: Cancelar trade
- [ ] Teste: Abrir disputa
- [ ] Teste: Deixar feedback

---

## 🚀 Próximos Passos

1. **Criar hooks React Query** (`useP2POrders.ts`, `useP2PTrades.ts`)
2. **Atualizar P2PPage** para usar dados reais
3. **Criar componentes** (OrderCard, TradeModal, TradeChat)
4. **Adicionar auth** nos endpoints backend
5. **Testar fluxo completo** de compra/venda
6. **Implementar WebSocket** para updates em tempo real
7. **Polir UX** e adicionar animações

---

## 📝 Notas Importantes

### Estrutura de Dados Backend vs Frontend

**Backend retorna:**
```python
{
    "order_id": "uuid",
    "user_id": "uuid",
    "order_type": "sell",
    "asset": "BTC",
    "amount": 0.5,
    "price_brl": 210000.00,
    ...
}
```

**Frontend espera:**
```typescript
{
    id: string,
    userId: string,
    type: 'buy' | 'sell',
    coin: string,
    amount: string,
    price: string,
    ...
}
```

⚠️ **IMPORTANTE**: Criar adapter/transformer para converter entre formatos!

```typescript
// Frontend/src/utils/p2pAdapters.ts
export function adaptBackendOrderToFrontend(backendOrder: any): P2POrder {
  return {
    id: backendOrder.order_id,
    userId: backendOrder.user_id,
    type: backendOrder.order_type as OrderType,
    coin: backendOrder.asset,
    amount: String(backendOrder.amount),
    price: String(backendOrder.price_brl),
    // ... rest of fields
  }
}
```

---

**Status**: 📝 Documento criado - Pronto para implementação!
**Próximo**: Começar pela Fase 1 (Hooks React Query)
