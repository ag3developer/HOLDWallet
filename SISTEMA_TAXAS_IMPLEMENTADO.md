# 💰 SISTEMA DE TAXAS - IMPLEMENTAÇÃO COMPLETA

## Data: 14/07/2025

---

## ✅ O QUE JÁ EXISTIA:

| Item                         | Localização                                     | Status     |
| ---------------------------- | ----------------------------------------------- | ---------- |
| Modelo `SystemWallet`        | `backend/app/models/system_wallet.py`           | ✅ Existia |
| Modelo `FeeHistory`          | `backend/app/models/system_wallet.py`           | ✅ Existia |
| Enums `FeeType`, `FeeStatus` | `backend/app/models/system_wallet.py`           | ✅ Existia |
| Config DEFAULT_SETTINGS fees | `backend/app/routers/admin/settings.py`         | ✅ Existia |
| Bloqueio de saldo no trade   | `backend/app/routers/p2p.py` (linhas 1143-1159) | ✅ Existia |
| API config taxas admin       | `GET/PUT /admin/settings/fees`                  | ✅ Existia |

---

## ✅ O QUE FOI IMPLEMENTADO AGORA:

### 1. **Backend - Registro dos Modelos**

- **Arquivo:** `backend/app/models/__init__.py`
- **Alteração:** Adicionado import e export de `SystemWallet`, `FeeHistory`, `FeeType`, `FeeStatus`

### 2. **Backend - Migration para Tabelas**

- **Arquivo:** `backend/alembic/versions/20250714_create_system_wallet_tables.py`
- **Cria:**
  - Tabela `system_wallets` com balances por crypto
  - Tabela `fee_history` para registro de taxas
  - Insere carteira do sistema padrão `main-system-wallet`

### 3. **Backend - Cobrança de Taxa no complete_trade**

- **Arquivo:** `backend/app/routers/p2p.py` (função `complete_trade`)
- **Taxa:** 0.5% P2P fee
- **Fluxo:**
  1. Calcula `fee_amount_brl = gross_amount * 0.5%`
  2. Calcula `net_amount = gross_amount - fee_amount`
  3. Vendedor recebe `net_amount` (não mais 100%)
  4. Taxa é adicionada ao `system_wallets`
  5. Taxa é registrada em `fee_history`

### 4. **Backend - Router Admin Fees**

- **Arquivo:** `backend/app/routers/admin/fees.py`
- **Endpoints:**
  | Endpoint | Descrição |
  |----------|-----------|
  | `GET /admin/fees/summary` | Resumo de taxas (total, média, breakdown) |
  | `GET /admin/fees/history` | Histórico de taxas com paginação |
  | `GET /admin/fees/daily-revenue` | Receita diária (chart) |
  | `GET /admin/fees/top-fee-payers` | Top traders por volume |
  | `GET /admin/fees/settings` | Configurações de taxas |
  | `PUT /admin/fees/settings` | Atualizar configurações |
  | `GET /admin/fees/system-wallet` | Saldo da carteira do sistema |

### 5. **Backend - Registro do Router**

- **Arquivo:** `backend/app/routers/admin/__init__.py`
- **Alteração:** Adicionado `fees_router` ao `admin_router`

### 6. **Frontend - Página Admin Fees**

- **Arquivo:** `frontend/src/pages/admin/AdminFeesPage.tsx`
- **Features:**
  - Cards de resumo (total fees, transactions, avg fee, volume)
  - Saldo da carteira do sistema
  - Breakdown por tipo de taxa
  - Gráfico de receita diária (barras)
  - Tabela de histórico de taxas com paginação

### 7. **Frontend - Rotas e Menu**

- **Arquivo:** `frontend/src/App.tsx` - Rota `/admin/fees`
- **Arquivo:** `frontend/src/pages/admin/index.ts` - Export da página
- **Arquivo:** `frontend/src/components/layout/AdminSidebar.tsx` - Item no menu

---

## 📋 COMO TESTAR:

### 1. Criar as tabelas no banco:

```bash
cd backend
alembic upgrade head
# OU execute manualmente o SQL da migration
```

### 2. Iniciar backend:

```bash
cd backend
uvicorn app.main:app --reload
```

### 3. Testar endpoints:

```bash
# Resumo de taxas
curl http://localhost:8000/admin/fees/summary?period=month

# Carteira do sistema
curl http://localhost:8000/admin/fees/system-wallet

# Histórico
curl http://localhost:8000/admin/fees/history?page=1&limit=10
```

### 4. Testar cobrança de taxa:

```bash
# Complete um trade P2P
curl -X POST http://localhost:8000/p2p/trades/1/complete \
  -H "Content-Type: application/json" \
  -d '{}'

# Verifique a resposta - deve mostrar fee_amount e net_amount
```

### 5. Frontend:

- Acesse http://localhost:5173/admin/fees
- Verifique cards, gráficos e tabelas

---

## 💡 CONFIGURAÇÃO DE TAXAS:

| Taxa        | Valor | Aplicação                                      |
| ----------- | ----- | ---------------------------------------------- |
| P2P Fee     | 0.5%  | Deduzido do vendedor quando trade é completado |
| OTC Spread  | 3.0%  | Embutido no preço de compra/venda              |
| Network Fee | 0.25% | Taxas de rede blockchain                       |

---

## 🏗️ ESTRUTURA DE TABELAS:

### system_wallets

```sql
CREATE TABLE system_wallets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    btc_balance NUMERIC(18,8) DEFAULT 0,
    eth_balance NUMERIC(18,8) DEFAULT 0,
    usdt_balance NUMERIC(18,8) DEFAULT 0,
    usdc_balance NUMERIC(18,8) DEFAULT 0,
    sol_balance NUMERIC(18,8) DEFAULT 0,
    brl_balance NUMERIC(18,2) DEFAULT 0,
    total_fees_collected_brl NUMERIC(18,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### fee_history

```sql
CREATE TABLE fee_history (
    id VARCHAR(36) PRIMARY KEY,
    trade_id INTEGER,
    transaction_id VARCHAR(36),
    trade_type VARCHAR(50) NOT NULL,  -- p2p_commission, otc_spread, etc
    cryptocurrency VARCHAR(20) NOT NULL,
    fiat_currency VARCHAR(10) DEFAULT 'BRL',
    gross_amount NUMERIC(18,8) NOT NULL,
    fee_percentage NUMERIC(5,2) NOT NULL,
    fee_amount NUMERIC(18,8) NOT NULL,
    net_amount NUMERIC(18,8) NOT NULL,
    fee_amount_brl NUMERIC(18,2),
    payer_user_id VARCHAR(36),
    receiver_user_id VARCHAR(36),
    system_wallet_id VARCHAR(36) REFERENCES system_wallets(id),
    status VARCHAR(20) DEFAULT 'collected',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ CHECKLIST ATUALIZADO:

| Funcionalidade                          | Status              |
| --------------------------------------- | ------------------- |
| ✅ Bloqueio de saldo no início do trade | ✅ Já existia       |
| ✅ Modelos SystemWallet/FeeHistory      | ✅ Já existia       |
| ✅ Tabelas no banco de dados            | ✅ Migration criada |
| ✅ Cobrança de 0.5% no complete_trade   | ✅ Implementado     |
| ✅ Registro em fee_history              | ✅ Implementado     |
| ✅ Atualização do system_wallets        | ✅ Implementado     |
| ✅ API endpoints admin/fees             | ✅ Implementado     |
| ✅ Frontend AdminFeesPage               | ✅ Implementado     |
| ✅ Menu admin com item Taxas            | ✅ Implementado     |

---

## 🚀 PRÓXIMOS PASSOS SUGERIDOS:

1. **Executar migrations em produção** para criar as tabelas
2. **Testar fluxo completo** de trade P2P com taxa
3. **Verificar dashboard** de receitas no admin
4. **Implementar alertas** quando receita atingir metas
5. **Adicionar exportação** de relatórios de taxas (CSV/Excel)
