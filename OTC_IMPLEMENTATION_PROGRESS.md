# 🚀 OTC Implementation Progress

## ✅ FASE 1: Database - CONCLUÍDA

### Tabelas Criadas

1. **`instant_trades`**
   - Armazena todas as operações de compra/venda OTC
   - Campos principais:
     * `operation_type`: 'buy' ou 'sell'
     * `symbol`: 'BTC', 'ETH', etc
     * `fiat_amount`, `crypto_amount`
     * `crypto_price`, `spread_amount`, `network_fee_amount`, `total_amount`
     * `payment_method`: 'pix', 'ted', 'credit_card', 'paypal'
     * `status`: 'pending', 'payment_processing', 'payment_confirmed', 'completed', 'expired', 'cancelled', 'failed'
     * `expires_at`: Prazo de 15 minutos
     * `reference_code`: Código único (ex: OTC-2025-000123)
   
2. **`instant_trade_history`**
   - Log de todas as mudanças de status
   - Auditoria completa

### Índices Criados
- `idx_instant_trades_user_id`
- `idx_instant_trades_status`
- `idx_instant_trades_created_at`
- `idx_instant_trades_expires_at`
- `idx_instant_trades_reference_code`

### Migration
- ✅ Arquivo: `bd3e5ab55526_create_instant_trades_tables.py`
- ✅ Adaptada para SQLite
- ✅ Executada com sucesso

---

## 📋 PRÓXIMOS PASSOS

### FASE 2: Backend - Models e Schemas

1. **Criar Models** (`app/models/instant_trade.py`)
   ```python
   class InstantTrade(Base):
       __tablename__ = 'instant_trades'
       # ... todos os campos
   
   class InstantTradeHistory(Base):
       __tablename__ = 'instant_trade_history'
       # ... todos os campos
   ```

2. **Criar Schemas** (`app/schemas/instant_trade.py`)
   ```python
   class QuoteRequest(BaseModel):
       operation: Literal['buy', 'sell']
       symbol: str
       fiat_amount: Optional[Decimal]
       crypto_amount: Optional[Decimal]
   
   class QuoteResponse(BaseModel):
       operation: str
       symbol: str
       crypto_price: Decimal
       fiat_amount: Decimal
       crypto_amount: Decimal
       spread_amount: Decimal
       network_fee_amount: Decimal
       total_amount: Decimal
       expires_in_seconds: int
       quote_id: str
   
   class CreateTradeRequest(BaseModel):
       quote_id: str
       operation: str
       symbol: str
       fiat_amount: Decimal
       payment_method: str
       wallet_id: int
   
   class TradeResponse(BaseModel):
       trade_id: str
       reference_code: str
       status: str
       expires_at: datetime
       payment_info: dict
   ```

3. **Criar Service** (`app/services/instant_trade_service.py`)
   ```python
   class InstantTradeService:
       async def get_quote(self, request: QuoteRequest) -> QuoteResponse:
           # Buscar preço em tempo real
           # Aplicar spread 3%
           # Calcular taxas
           # Retornar cotação válida por 30s
       
       async def create_trade(self, request: CreateTradeRequest, user_id: int) -> TradeResponse:
           # Validar quote_id
           # Criar registro no DB
           # Gerar reference_code (OTC-2025-XXXXXX)
           # Gerar PIX/QR Code
           # Agendar expiração (15min)
           # Retornar dados de pagamento
       
       async def get_trade_status(self, trade_id: str) -> TradeResponse:
           # Buscar trade no DB
           # Retornar status atual
       
       async def cancel_trade(self, trade_id: str, user_id: int) -> bool:
           # Validar permissão
           # Atualizar status para 'cancelled'
           # Registrar no history
       
       async def confirm_payment(self, trade_id: str, payment_data: dict) -> bool:
           # Webhook de confirmação
           # Atualizar status para 'payment_confirmed'
           # Creditar crypto na carteira
           # Atualizar status para 'completed'
       
       async def check_expired_trades(self):
           # Job assíncrono (rodar a cada minuto)
           # Buscar trades pending com expires_at < now
           # Atualizar status para 'expired'
   ```

4. **Criar Router** (`app/routers/instant_trade.py`)
   ```python
   router = APIRouter(prefix="/instant-trade", tags=["Instant Trade OTC"])
   
   @router.get("/quote")
   async def get_quote(...)
   
   @router.post("/create")
   async def create_trade(...)
   
   @router.get("/{trade_id}")
   async def get_trade_status(...)
   
   @router.post("/{trade_id}/cancel")
   async def cancel_trade(...)
   
   @router.get("/history")
   async def get_history(...)
   
   @router.post("/webhook/payment")  # Interno
   async def payment_webhook(...)
   ```

### FASE 3: Frontend - Interface

1. **Criar Página** (`Frontend/src/pages/InstantTradePage.tsx`)
   - Toggle Comprar/Vender
   - Seleção de criptomoeda
   - Input de valor (BRL ou Crypto)
   - Resumo com taxas em tempo real
   - Seleção de método de pagamento
   - Botão "Continuar com a Compra/Venda"

2. **Criar Modal de Confirmação** (`Frontend/src/components/instant-trade/ConfirmModal.tsx`)
   - Timer visual de 15 minutos
   - Resumo completo da operação
   - Avisos importantes
   - Botões Cancelar/Confirmar

3. **Criar Página de Pagamento** (`Frontend/src/components/instant-trade/PaymentPage.tsx`)
   - QR Code PIX
   - Código PIX copy-paste
   - Timer com progress bar
   - Botão para cancelar
   - Polling de status a cada 5s

4. **Criar Tipos** (`Frontend/src/types/index.ts`)
   ```typescript
   interface InstantTrade {
       id: string
       operation: 'buy' | 'sell'
       symbol: string
       fiat_amount: number
       crypto_amount: number
       total_amount: number
       status: TradeStatus
       reference_code: string
       expires_at: string
       payment_method: string
       pix_qr_code?: string
       pix_copy_paste?: string
   }
   
   type TradeStatus = 
       | 'pending'
       | 'payment_processing'
       | 'payment_confirmed'
       | 'completed'
       | 'expired'
       | 'cancelled'
       | 'failed'
   ```

5. **Criar Services** (`Frontend/src/services/instantTradeApi.ts`)
   ```typescript
   export const instantTradeApi = {
       getQuote: async (params: QuoteParams) => {...},
       createTrade: async (data: CreateTradeData) => {...},
       getTradeStatus: async (tradeId: string) => {...},
       cancelTrade: async (tradeId: string) => {...},
       getHistory: async (filters?: Filters) => {...}
   }
   ```

### FASE 4: Integrações

1. **Gateway PIX**
   - Integrar com provedor (ex: PagSeguro, Mercado Pago)
   - Gerar QR Code dinâmico
   - Configurar webhook de confirmação

2. **Cliente de Preços**
   - Integrar com CoinGecko ou Binance API
   - Cache de 30 segundos
   - Fallback em caso de falha

3. **Background Jobs**
   - Criar job para expirar trades pendentes
   - Rodar a cada minuto via APScheduler

---

## 🎯 Configurações Importantes

### Taxas
```python
SPREAD_PERCENTAGE = 3.00  # 3%
NETWORK_FEE_PERCENTAGE = 0.25  # 0.25%
TRADE_EXPIRATION_MINUTES = 15
QUOTE_VALIDITY_SECONDS = 30
```

### Limites
```python
MIN_TRADE_AMOUNT_BRL = 50.00
MAX_TRADE_AMOUNT_BRL = 50000.00
MAX_QUOTES_PER_MINUTE = 5
```

### Métodos de Pagamento
```python
PAYMENT_METHODS = [
    'pix',           # PIX (Brasil)
    'ted',           # Transferência bancária
    'credit_card',   # Cartão de crédito
    'paypal'         # PayPal
]
```

---

## 📝 Reference Code Generator

```python
import random
import string
from datetime import datetime

def generate_reference_code() -> str:
    """
    Gera código único: OTC-2025-000123
    Formato: OTC-{ANO}-{NUMERO_SEQUENCIAL}
    """
    year = datetime.now().year
    # Buscar último número no DB ou usar random
    last_number = get_last_trade_number() or random.randint(1, 999999)
    next_number = last_number + 1
    
    return f"OTC-{year}-{next_number:06d}"
```

---

## ✅ Status Atual

- [x] Especificação completa lida
- [x] Migration criada e executada
- [x] Tabelas `instant_trades` e `instant_trade_history` criadas
- [x] Índices criados
- [x] Trigger de updated_at funcionando
- [ ] Models SQLAlchemy
- [ ] Schemas Pydantic
- [ ] Service layer
- [ ] Router/Endpoints
- [ ] Frontend components
- [ ] Integrações

---

## 🚀 Comando Para Continuar

```bash
# Próximo passo: Criar models
# Arquivo: backend/app/models/instant_trade.py
```

**Status**: Database pronta, pronto para criar models e API! 🎉
