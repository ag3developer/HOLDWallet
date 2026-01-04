# 🔗 Integração Instant Trade com Blockchain

## 📋 Resumo Executivo

O sistema Instant Trade OTC está funcionando para **cotações e pedidos**, mas precisa integração completa com a blockchain para **executar as transferências de criptomoedas**.

---

## ✅ O QUE JÁ FUNCIONA

### 1. **Sistema de Cotações**

- ✅ Cálculo de preços com spread (3%) e taxas (0.25%)
- ✅ Conversão USD ↔ BRL usando taxa real
- ✅ Quote válido por 30 segundos
- ✅ Cache de quotes

### 2. **Criação de Pedidos (Orders)**

- ✅ Modelo `InstantTrade` com todos os campos
- ✅ Status: PENDING → PAYMENT_CONFIRMED → COMPLETED
- ✅ Referência única (OTC-2025-XXXXXX)
- ✅ Histórico de mudanças (`InstantTradeHistory`)
- ✅ Frontend mostra histórico de pedidos

### 3. **Pagamento (Frontend)**

- ✅ Seleção de método (PIX, TED, Cartão, Wallet)
- ✅ Confirmação de pedido
- ✅ Exibição de detalhes bancários (PIX, TED)

### 4. **Autenticação**

- ✅ Todos os endpoints protegidos com JWT
- ✅ apiClient com token automático

---

## ❌ O QUE FALTA IMPLEMENTAR

### 🔴 **ALTA PRIORIDADE**

#### 1. **Integração Blockchain para COMPRA**

**Problema:** Quando usuário COMPRA cripto, o sistema não deposita na wallet dele.

**Fluxo Completo de COMPRA:**

```
1. ✅ Usuário: "Quero comprar R$ 100 de USDT"
2. ✅ Sistema: Cria quote (17.868 USDT)
3. ✅ Usuário: Confirma e paga PIX
4. ✅ Sistema: Registra pedido (status: PENDING)
5. ❌ Admin: Confirma pagamento recebido
6. ❌ Sistema: Deposita 17.868 USDT na wallet do usuário
7. ❌ Sistema: Registra tx_hash, network, wallet_address
8. ❌ Sistema: Atualiza status → COMPLETED
```

**Campos já existem no modelo:**

- `wallet_id` - ID da wallet do usuário
- `wallet_address` - Endereço blockchain (0x...)
- `network` - Rede (ethereum, polygon, base, etc)
- `tx_hash` - Hash da transação
- `crypto_amount` - Quantidade a depositar (17.868 USDT)
- `symbol` - Cripto a depositar (USDT)

**O que implementar:**

```python
# backend/app/services/instant_trade_service.py

async def complete_buy_trade(self, trade_id: str, admin_user_id: str) -> Dict[str, Any]:
    """
    Completa uma operação de COMPRA após pagamento confirmado

    1. Busca a wallet do usuário para o símbolo correto
    2. Envia crypto para a wallet via blockchain
    3. Registra tx_hash
    4. Atualiza status para COMPLETED
    """
    trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

    if not trade:
        raise ValidationError("Trade not found")

    if trade.operation_type != "buy":
        raise ValidationError("This trade is not a buy operation")

    if trade.status != TradeStatus.PAYMENT_CONFIRMED:
        raise ValidationError("Payment not confirmed yet")

    # 1. Buscar wallet do usuário para o símbolo
    wallet = self.db.query(Wallet).filter(
        Wallet.user_id == trade.user_id,
        Wallet.network == get_network_for_symbol(trade.symbol)  # USDT → Ethereum/Polygon
    ).first()

    if not wallet:
        raise ValidationError(f"User does not have a {trade.symbol} wallet")

    # 2. Enviar crypto via blockchain
    from app.services.blockchain_service import BlockchainService

    blockchain = BlockchainService(network=wallet.network)

    tx_hash = await blockchain.send_token(
        to_address=wallet.address,
        token_symbol=trade.symbol,
        amount=float(trade.crypto_amount)
    )

    # 3. Atualizar trade com informações blockchain
    trade.wallet_id = wallet.id
    trade.wallet_address = wallet.address
    trade.network = wallet.network
    trade.tx_hash = tx_hash
    trade.status = TradeStatus.COMPLETED
    trade.completed_at = datetime.now()

    # 4. Criar histórico
    history = InstantTradeHistory(
        trade_id=trade.id,
        old_status=TradeStatus.PAYMENT_CONFIRMED,
        new_status=TradeStatus.COMPLETED,
        reason=f"Crypto sent to user wallet. Tx: {tx_hash}",
        changed_by=admin_user_id
    )

    self.db.add(history)
    self.db.commit()

    return {
        "success": True,
        "tx_hash": tx_hash,
        "wallet_address": wallet.address
    }
```

**Endpoint no router:**

```python
# backend/app/routers/instant_trade.py

@router.post("/{trade_id}/admin/complete")
async def admin_complete_trade(
    trade_id: str,
    current_user: User = Depends(get_current_admin),  # Só admin
    db: Session = Depends(get_db),
):
    """
    Admin completa uma operação de compra enviando crypto para o usuário
    """
    service = get_instant_trade_service(db)
    result = await service.complete_buy_trade(trade_id, str(current_user.id))
    return result
```

#### 2. **Integração Blockchain para VENDA**

**Fluxo Completo de VENDA:**

```
1. ✅ Usuário: "Quero vender 10 MATIC"
2. ❌ Sistema: Verifica saldo na wallet blockchain do usuário
3. ✅ Sistema: Cria quote (R$ 20,98)
4. ✅ Usuário: Confirma venda
5. ❌ Sistema: Transfere 10 MATIC da wallet do usuário para wallet da plataforma
6. ❌ Sistema: Registra tx_hash
7. ❌ Admin: Processa pagamento fiat (PIX/TED)
8. ❌ Sistema: Atualiza status → COMPLETED
```

**O que implementar:**

```python
# backend/app/services/instant_trade_service.py

async def execute_sell_trade(self, trade_id: str) -> Dict[str, Any]:
    """
    Executa uma operação de VENDA transferindo crypto do usuário para a plataforma

    1. Verifica saldo do usuário
    2. Solicita transferência (usuário precisa aprovar)
    3. Registra tx_hash
    4. Admin processa pagamento fiat
    """
    trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

    if trade.operation_type != "sell":
        raise ValidationError("This trade is not a sell operation")

    # 1. Buscar wallet do usuário
    wallet = self.db.query(Wallet).filter(
        Wallet.user_id == trade.user_id,
        Wallet.network == get_network_for_symbol(trade.symbol)
    ).first()

    if not wallet:
        raise ValidationError("User wallet not found")

    # 2. Verificar saldo
    blockchain = BlockchainService(network=wallet.network)
    balance = await blockchain.get_balance(wallet.address, trade.symbol)

    if balance < float(trade.crypto_amount):
        raise ValidationError(f"Insufficient balance. Required: {trade.crypto_amount}, Available: {balance}")

    # 3. Retornar dados para frontend solicitar assinatura
    platform_wallet = await blockchain.get_platform_wallet_address()

    return {
        "requires_signature": True,
        "from_address": wallet.address,
        "to_address": platform_wallet,
        "amount": float(trade.crypto_amount),
        "token_symbol": trade.symbol,
        "network": wallet.network
    }
```

#### 3. **Painel Admin**

**Frontend: Admin Dashboard**

```tsx
// Frontend/src/pages/admin/InstantTradeAdminPanel.tsx

interface PendingTrade {
  id: string;
  reference_code: string;
  operation: "buy" | "sell";
  user_email: string;
  symbol: string;
  crypto_amount: number;
  fiat_amount: number;
  total_amount: number;
  payment_method: string;
  payment_proof_url?: string;
  status: string;
  created_at: string;
}

export function InstantTradeAdminPanel() {
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);

  // Buscar pedidos pendentes
  useEffect(() => {
    const fetchPending = async () => {
      const response = await apiClient.get("/admin/instant-trade/pending");
      setPendingTrades(response.data.trades);
    };
    fetchPending();
  }, []);

  // Confirmar pagamento (para COMPRA)
  const confirmPayment = async (tradeId: string) => {
    await apiClient.post(`/admin/instant-trade/${tradeId}/confirm-payment`);
    toast.success("Payment confirmed! Sending crypto to user...");
  };

  // Completar trade (enviar crypto)
  const completeTrade = async (tradeId: string) => {
    const response = await apiClient.post(
      `/admin/instant-trade/${tradeId}/complete`
    );
    toast.success(`Crypto sent! Tx: ${response.data.tx_hash}`);
  };

  return (
    <div className="admin-panel">
      <h1>Instant Trade - Pending Orders</h1>

      {pendingTrades.map((trade) => (
        <div key={trade.id} className="trade-card">
          <div className="trade-header">
            <span>{trade.reference_code}</span>
            <span className={`badge badge-${trade.operation}`}>
              {trade.operation.toUpperCase()}
            </span>
          </div>

          <div className="trade-details">
            <div>User: {trade.user_email}</div>
            <div>
              Crypto: {trade.crypto_amount} {trade.symbol}
            </div>
            <div>Fiat: R$ {trade.total_amount}</div>
            <div>Method: {trade.payment_method}</div>
          </div>

          {trade.payment_proof_url && (
            <a href={trade.payment_proof_url} target="_blank">
              View Payment Proof
            </a>
          )}

          <div className="trade-actions">
            {trade.status === "PENDING" && trade.operation === "buy" && (
              <button onClick={() => confirmPayment(trade.id)}>
                Confirm Payment Received
              </button>
            )}

            {trade.status === "PAYMENT_CONFIRMED" &&
              trade.operation === "buy" && (
                <button onClick={() => completeTrade(trade.id)}>
                  Send Crypto to User
                </button>
              )}

            {trade.operation === "sell" && (
              <button onClick={() => completeTrade(trade.id)}>
                Process Fiat Payment
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 🟡 **MÉDIA PRIORIDADE**

#### 4. **Verificação de Saldo Antes da Venda**

No `TradingForm.tsx`, antes de permitir venda, verificar se usuário tem saldo:

```typescript
const checkBalance = async (symbol: string, amount: number) => {
  const response = await apiClient.get(`/wallets/balance/${symbol}`);

  if (response.data.balance < amount) {
    toast.error(
      `Insufficient balance. You have ${response.data.balance} ${symbol}`
    );
    return false;
  }

  return true;
};
```

#### 5. **Notificações em Tempo Real**

Quando admin completa um pedido, notificar usuário:

- Email: "Your 17.868 USDT has been sent!"
- Push notification
- Update em tempo real no histórico

#### 6. **Retry Logic para Blockchain**

Se transação blockchain falhar:

- Retry automático (3 tentativas)
- Alertar admin se falhar
- Status: FAILED com error_message

---

## 📊 Campos do Modelo InstantTrade

```python
# Campos relacionados à blockchain
wallet_id: str           # ID da wallet do usuário
wallet_address: str      # Endereço blockchain (0x...)
network: str             # ethereum, polygon, base, etc
tx_hash: str             # Hash da transação
crypto_amount: Decimal   # Quantidade de crypto
symbol: str              # BTC, ETH, USDT, MATIC, etc

# Status
PENDING              # Aguardando pagamento
PAYMENT_CONFIRMED    # Pagamento confirmado (admin)
COMPLETED            # Crypto transferido
FAILED               # Erro na transação
CANCELLED            # Cancelado
EXPIRED              # Expirou (15 min)
```

---

## 🔧 Serviços Necessários

### BlockchainService

```python
# backend/app/services/blockchain_service.py

class BlockchainService:
    def __init__(self, network: str):
        self.network = network
        self.web3 = get_web3_instance(network)

    async def send_token(
        self,
        to_address: str,
        token_symbol: str,
        amount: float
    ) -> str:
        """Envia tokens para um endereço"""
        pass

    async def get_balance(
        self,
        address: str,
        token_symbol: str
    ) -> float:
        """Consulta saldo de um endereço"""
        pass

    async def get_platform_wallet_address(self) -> str:
        """Retorna endereço da wallet da plataforma"""
        pass
```

---

## 🎯 Próximos Passos

1. ✅ **Reiniciar backend** (criar tabelas com novos campos)
2. 🔴 **Implementar `complete_buy_trade()`** no service
3. 🔴 **Criar endpoint admin** `/admin/instant-trade/{id}/complete`
4. 🔴 **Criar painel admin** no frontend
5. 🟡 **Implementar BlockchainService**
6. 🟡 **Integrar Web3 para envio de tokens**
7. 🟡 **Testar fluxo completo** com testnet

---

## 💡 Observações Importantes

### **COMPRA (Buy)**

- Usuário paga → Admin confirma → Sistema envia crypto → COMPLETED
- **Wallet destino:** Wallet blockchain do usuário
- **Quem assina tx:** Plataforma (hot wallet)

### **VENDA (Sell)**

- Usuário confirma → Sistema solicita transferência → Usuário assina → Admin paga fiat → COMPLETED
- **Wallet origem:** Wallet blockchain do usuário
- **Quem assina tx:** Usuário (via MetaMask/WalletConnect)

---

## ✅ Checklist de Implementação

- [x] Modelo `InstantTrade` com campos blockchain
- [x] Sistema de cotações funcionando
- [x] Criação de pedidos funcionando
- [x] Histórico de pedidos funcionando
- [ ] Endpoint admin para confirmar pagamento
- [ ] Endpoint admin para completar trade (enviar crypto)
- [ ] BlockchainService para envio de tokens
- [ ] Painel admin frontend
- [ ] Verificação de saldo antes da venda
- [ ] Notificações em tempo real
- [ ] Retry logic para falhas
- [ ] Testes com testnet
- [ ] Documentação para admin

---

**Última atualização:** 15 de dezembro de 2025
