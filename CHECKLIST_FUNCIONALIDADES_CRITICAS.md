# 🎯 CHECKLIST: Funcionalidades Críticas para 100% do Projeto

**Data:** 05/01/2026  
**Objetivo:** Verificar e concluir todas as funcionalidades de transferência, taxas, bloqueio de saldo e comissões

---

## 📊 RESUMO DO STATUS

| Funcionalidade              | Status  | Prioridade |
| --------------------------- | ------- | ---------- |
| Bloqueio de Saldo (P2P/OTC) | ✅ 90%  | ALTA       |
| Sistema de Escrow           | ✅ 85%  | ALTA       |
| Transferência de Saldo      | ✅ 100% | ALTA       |
| Sistema de Comissões/Taxas  | ✅ 100% | MÉDIA      |
| Wallet do Sistema (Fees)    | ✅ 100% | ALTA       |
| Wallet Blockchain Sistema   | ✅ 100% | ALTA       |
| Admin - Gestão de Taxas     | ✅ 100% | MÉDIA      |

---

## ✅ 1. BLOQUEIO DE SALDO (FREEZE/LOCK)

### 1.1 Backend - Implementado ✅

**Arquivo:** `backend/app/routers/p2p.py`

| Endpoint                    | Status | Descrição                  |
| --------------------------- | ------ | -------------------------- |
| `POST /p2p/wallet/freeze`   | ✅     | Congela saldo para trade   |
| `POST /p2p/wallet/unfreeze` | ✅     | Descongela saldo           |
| `GET /p2p/wallet/balance`   | ✅     | Retorna available + locked |

**Fluxo implementado:**

```
1. User cria ordem de venda → Saldo NÃO é bloqueado ainda
2. Outro user aceita comprar → Sistema bloqueia saldo do vendedor
3. Trade em andamento → Saldo permanece locked
4. Trade completo → Saldo transferido para comprador
5. Trade cancelado → Saldo desbloqueado para vendedor
```

### 1.2 Pendências - Bloqueio

- [ ] **Bloquear ao criar ordem de venda** (Marketplace)

  - Atualmente só bloqueia quando trade inicia
  - Deveria bloquear quando user CRIA a ordem de venda
  - Evita double-selling

- [ ] **Integrar com OTC Instant Trade**
  - `POST /otc/instant/sell` deve verificar e bloquear saldo
  - `POST /otc/instant/buy` deve verificar saldo BRL

---

## ✅ 2. SISTEMA DE ESCROW

### 2.1 Backend - Implementado ✅

**Arquivos:**

- `backend/app/models/p2p.py` - Model P2PEscrow
- `backend/app/services/p2p/p2p_service.py` - initiate_escrow, release_escrow

| Funcionalidade                    | Status     |
| --------------------------------- | ---------- |
| Criar escrow ao iniciar trade     | ✅         |
| Manter saldo locked durante trade | ✅         |
| Liberar escrow ao completar       | ✅         |
| Reembolsar ao cancelar            | ✅         |
| Expiração automática              | 🟡 Parcial |

### 2.2 Pendências - Escrow

- [ ] **Auto-release com timeout**

  - Se vendedor não liberar em X horas → auto-release
  - Background job para verificar trades expirados

- [ ] **Disputa com arbitragem**
  - Admin pode resolver disputas
  - Decidir para quem vai o saldo

---

## ✅ 3. TRANSFERÊNCIA DE SALDO

### 3.1 Backend - Implementado ✅

**Arquivo:** `backend/app/services/wallet_balance_service.py`

```python
# Métodos disponíveis:
WalletBalanceService.freeze_balance()    # Bloquear
WalletBalanceService.unfreeze_balance()  # Desbloquear
WalletBalanceService.transfer_balance()  # Transferir entre users
WalletBalanceService.deposit_balance()   # Adicionar saldo
```

### 3.2 Fluxo de Transferência (Trade Completo)

```
ANTES:
  Vendedor: available=1.0 BTC, locked=0.5 BTC (em trade)
  Comprador: available=0 BTC, locked=10000 BRL (em trade)

DEPOIS (complete_trade):
  Vendedor: available=1.0 BTC, locked=0, +10000 BRL
  Comprador: available=0.5 BTC, locked=0, -10000 BRL
```

### 3.3 Pendências - Transferência

- [ ] **Incluir taxa/comissão na transferência**
  - Antes: Comprador recebe 100% do crypto
  - Depois: Comprador recebe 98%, Sistema recebe 2%

---

## 🔴 4. SISTEMA DE COMISSÕES/TAXAS (CRÍTICO)

### 4.1 O que existe

**Arquivo:** `backend/app/routers/admin/settings.py`

```python
DEFAULT_SETTINGS = {
    "fees": {
        "otc_spread_percentage": 2.0,      # Spread OTC
        "network_fee_percentage": 0.25,    # Taxa de rede
        "p2p_fee_percentage": 0.5          # Taxa P2P
    }
}
```

### 4.2 O que FALTA implementar

#### 4.2.1 Coletar taxa na conclusão do trade

**Arquivo a modificar:** `backend/app/routers/p2p.py` - `complete_trade()`

```python
# ATUAL (linha ~1340):
# Buyer receives 100% of crypto
buyer_crypto += trade.amount

# PRECISA SER:
fee_percentage = 0.005  # 0.5% (buscar do settings)
fee_amount = trade.amount * fee_percentage
net_amount = trade.amount - fee_amount

# Buyer receives net amount
buyer_crypto += net_amount

# System wallet receives fee
system_wallet_balance += fee_amount

# Registrar fee no balance_history
record_fee_history(fee_amount, trade_id, "p2p_commission")
```

#### 4.2.2 Criar Wallet do Sistema

**Criar arquivo:** `backend/app/models/system_wallet.py`

```python
class SystemWallet(Base):
    __tablename__ = "system_wallets"

    id = Column(UUID, primary_key=True)
    name = Column(String, default="holdwallet_main")

    # Saldos por crypto
    btc_balance = Column(Float, default=0)
    eth_balance = Column(Float, default=0)
    usdt_balance = Column(Float, default=0)
    brl_balance = Column(Float, default=0)

    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

#### 4.2.3 Criar tabela de histórico de taxas

```sql
CREATE TABLE fee_history (
    id UUID PRIMARY KEY,
    trade_id UUID,
    trade_type VARCHAR(20),  -- 'p2p', 'otc', 'instant'
    cryptocurrency VARCHAR(10),
    gross_amount DECIMAL(20,8),
    fee_percentage DECIMAL(5,4),
    fee_amount DECIMAL(20,8),
    net_amount DECIMAL(20,8),
    collected_at TIMESTAMP,
    status VARCHAR(20)  -- 'collected', 'pending', 'refunded'
);
```

---

## 📋 5. CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: Wallet do Sistema (2-3 horas)

- [ ] Criar model `SystemWallet`
- [ ] Criar migration para tabela `system_wallets`
- [ ] Criar `SystemWalletService` com métodos:
  - `get_or_create_system_wallet()`
  - `add_fee_to_system(crypto, amount, reference)`
  - `get_system_balance(crypto)`
  - `get_total_fees_collected(period)`
- [ ] Endpoint admin: `GET /admin/system-wallet/balance`

### FASE 2: Cobrança de Taxa no P2P (2-3 horas)

- [ ] Modificar `complete_trade()` para deduzir taxa
- [ ] Buscar `p2p_fee_percentage` das settings
- [ ] Transferir fee para SystemWallet
- [ ] Registrar em `fee_history`
- [ ] Atualizar response com `fee_collected`

### FASE 3: Cobrança de Taxa no OTC (1-2 horas)

- [ ] Modificar `create_instant_trade()` para incluir spread
- [ ] Spread já calculado no preço (2%)
- [ ] Registrar receita do spread

### FASE 4: Admin - Dashboard de Receitas (2-3 horas)

- [ ] `GET /admin/fees/summary` - Total coletado
- [ ] `GET /admin/fees/history` - Histórico de taxas
- [ ] `GET /admin/fees/by-period` - Por período
- [ ] Frontend: Página de Receitas/Taxas

### FASE 5: Bloqueio ao Criar Ordem (1-2 horas)

- [ ] Modificar `create_order()` para bloquear saldo
- [ ] Se order_type='sell' → freeze crypto
- [ ] Se order_type='buy' → freeze BRL
- [ ] Desbloquear ao cancelar ordem

---

## 🔧 6. CÓDIGO DE REFERÊNCIA

### 6.1 Modificar complete_trade() para cobrar taxa

```python
# backend/app/routers/p2p.py

@router.post("/trades/{trade_id}/complete")
async def complete_trade(trade_id: int, db: Session = Depends(get_db)):
    # ... código existente ...

    # ADICIONAR: Buscar taxa das configurações
    from app.routers.admin.settings import DEFAULT_SETTINGS
    fee_percentage = DEFAULT_SETTINGS["fees"]["p2p_fee_percentage"] / 100

    # Calcular taxa
    fee_amount = trade.amount * fee_percentage
    net_amount = trade.amount - fee_amount

    # Transferir para comprador (valor líquido)
    db.execute(text("""
        UPDATE wallet_balances
        SET available_balance = available_balance + :amount
        WHERE user_id = :user_id AND cryptocurrency = :crypto
    """), {"user_id": trade.buyer_id, "amount": net_amount, "crypto": trade.cryptocurrency})

    # Transferir taxa para wallet do sistema
    db.execute(text("""
        UPDATE system_wallets
        SET {crypto}_balance = {crypto}_balance + :fee
        WHERE name = 'holdwallet_main'
    """.format(crypto=trade.cryptocurrency.lower())), {"fee": fee_amount})

    # Registrar taxa coletada
    db.execute(text("""
        INSERT INTO fee_history (id, trade_id, trade_type, cryptocurrency,
                                 gross_amount, fee_percentage, fee_amount,
                                 net_amount, collected_at, status)
        VALUES (:id, :trade_id, 'p2p', :crypto, :gross, :pct, :fee, :net,
                CURRENT_TIMESTAMP, 'collected')
    """), {
        "id": str(uuid.uuid4()),
        "trade_id": trade_id,
        "crypto": trade.cryptocurrency,
        "gross": trade.amount,
        "pct": fee_percentage,
        "fee": fee_amount,
        "net": net_amount
    })

    return {
        "success": True,
        "data": {
            "gross_amount": trade.amount,
            "fee_amount": fee_amount,
            "fee_percentage": fee_percentage * 100,
            "net_amount": net_amount
        }
    }
```

### 6.2 Criar endpoint admin para ver taxas coletadas

```python
# backend/app/routers/admin/fees.py

@router.get("/summary")
async def get_fees_summary(
    period: str = Query("today"),  # today, week, month, all
    db: Session = Depends(get_db)
):
    """Resumo de taxas coletadas"""

    # Buscar total por crypto
    result = db.execute(text("""
        SELECT cryptocurrency,
               SUM(fee_amount) as total_fees,
               COUNT(*) as trade_count
        FROM fee_history
        WHERE status = 'collected'
        AND collected_at >= :start_date
        GROUP BY cryptocurrency
    """), {"start_date": get_period_start(period)})

    return {
        "success": True,
        "data": {
            "period": period,
            "fees_by_crypto": [dict(row) for row in result],
            "total_usd_equivalent": calculate_usd_total(result)
        }
    }
```

---

## 📝 7. ORDEM DE EXECUÇÃO RECOMENDADA

```
DIA 1 (4-5 horas):
├── 1. Criar model SystemWallet
├── 2. Criar tabela fee_history
├── 3. Criar SystemWalletService
└── 4. Testar criação de wallet do sistema

DIA 2 (4-5 horas):
├── 5. Modificar complete_trade() com taxa
├── 6. Testar fluxo P2P completo com taxa
├── 7. Criar endpoint admin /fees/summary
└── 8. Testar coleta de taxas

DIA 3 (3-4 horas):
├── 9. Modificar create_order() para bloquear saldo
├── 10. Integrar OTC com sistema de taxas
├── 11. Criar página admin de taxas (frontend)
└── 12. Testes finais end-to-end
```

---

## ✅ 8. VALIDAÇÃO FINAL

Após implementação, verificar:

- [ ] Ao criar ordem SELL → saldo é bloqueado
- [ ] Ao criar ordem BUY → BRL é bloqueado
- [ ] Ao completar trade → taxa é deduzida
- [ ] Taxa vai para wallet do sistema
- [ ] Histórico de taxas é registrado
- [ ] Admin pode ver taxas coletadas
- [ ] Cancelar ordem → saldo desbloqueado
- [ ] Disputa → admin pode resolver

---

## 🎯 CONCLUSÃO

O projeto está **~80% completo** nas funcionalidades de saldo/trade.

**Principais gaps:**

1. ❌ Taxa não está sendo coletada
2. ❌ Não existe wallet do sistema
3. ❌ Saldo não bloqueia ao criar ordem (só no trade)
4. ❌ Admin não vê receita de taxas

**Tempo estimado para 100%:** 2-3 dias de desenvolvimento

---

_Documento gerado em 05/01/2026_
