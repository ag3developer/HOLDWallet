# 📊 VISUAL SUMMARY: EarnPool Investor Credits System

## 🎯 Problema → Solução

```
PROBLEMA:
┌─────────────────────────────────────────────┐
│ Investidor depositou 2.779 USDT             │
│ mas sistema não processou automaticamente   │
│ → Não apareceu em nenhuma place             │
└─────────────────────────────────────────────┘
                      ↓
                   SOLUÇÃO
┌─────────────────────────────────────────────┐
│ 1. Admin cria VIRTUAL CREDIT                │
│    └─ 2.779 USDT (manual, sem blockchain)   │
│                                             │
│ 2. Admin calcula PERFORMANCE FEE            │
│    └─ 0.35% de 2.779 = 9,73 USDT           │
│                                             │
│ 3. Sistema cria novo VIRTUAL CREDIT         │
│    └─ 9,73 USDT (taxa creditada)            │
│                                             │
│ 4. Investidor tem 2.788,73 USDT no pool    │
│    └─ Ambos gerando ~0.75% / semana        │
└─────────────────────────────────────────────┘
```

## 📋 3 Formas de Usar

### 1️⃣ SCRIPT PYTHON (Recomendado para setup rápido)

```bash
python scripts/earnpool_investor_setup.py \
  --user-id "uuid" \
  --initial-amount 2779.00 \
  --performance-percentage 0.35 \
  --reason INVESTOR_CORRECTION \
  --period-description "Operações Passadas 2024" \
  --admin-id "admin-uuid"
```

**Vantagens:**

- ✅ Um comando para tudo
- ✅ Logging detalhado
- ✅ Fácil automação em scripts
- ✅ Ideal para bulk processing

### 2️⃣ API REST (Recomendado para integração web)

```bash
# Crédito inicial
POST /admin/earnpool/investor/virtual-credit
{
  "user_id": "uuid",
  "usdt_amount": 2779.00,
  "reason": "INVESTOR_CORRECTION"
}

# Taxa de performance
POST /admin/earnpool/investor/performance-fee
{
  "user_id": "uuid",
  "base_amount_usdt": 2779.00,
  "performance_percentage": 0.35
}

# Verificar
GET /admin/earnpool/investor/uuid/credits
```

**Vantagens:**

- ✅ Integração com frontend admin
- ✅ Requisições HTTP padrão
- ✅ Ideal para web UI
- ✅ Token auth padrão

### 3️⃣ SQL DIRETO (Para casos extremos)

```sql
-- Crédito virtual
INSERT INTO earnpool_virtual_credits (
  id, user_id, usdt_amount, reason,
  credited_by_admin_id
) VALUES (...);

-- Performance fee
INSERT INTO earnpool_performance_fees (
  id, user_id, base_amount_usdt,
  performance_percentage, fee_amount_usdt
) VALUES (...);
```

**Vantagens:**

- ✅ Máximo controle
- ✅ Sem validações (cuidado!)
- ✅ Para casos de data recovery

## 🗂️ Estrutura de Dados

```
INVESTOR (user table)
    ↓
    ├─→ earnpool_virtual_credits
    │   ├─ 2.779 USDT (INVESTOR_CORRECTION)
    │   └─ 9.73 USDT (PERFORMANCE_FEE)
    │
    ├─→ earnpool_performance_fees
    │   └─ 0.35% sobre 2.779 = 9,73 USDT
    │
    └─→ earnpool_deposits (tradicional)
        └─ Optional: depósitos normais também
```

## 💰 Evolução de Saldo

```
SEMANA 0 (Setup):
  Crédito Inicial: 2.779,00 USDT
  + Performance Fee: 9,73 USDT
  ─────────────────────────────
  TOTAL: 2.788,73 USDT ✓

SEMANA 1:
  Saldo anterior: 2.788,73 USDT
  Rendimento (0.75%): 20,92 USDT
  ─────────────────────────────
  NOVO SALDO: 2.809,65 USDT

SEMANA 2:
  Saldo anterior: 2.809,65 USDT
  Rendimento (0.75%): 21,07 USDT
  ─────────────────────────────
  NOVO SALDO: 2.830,72 USDT

SEMANA 4:
  Saldo acumulado: ~2.956 USDT
  → Pode SACAR sem restrições!

MÊS 1 (semana 4):
  Pode sacar: 2.956 USDT
  Período de lock: 30 dias ✓
  ─────────────────────────────
  SAQUE LIBERADO!
```

## 🔐 Auditoria Completa

```
CADA CRÉDITO REGISTRA:

📝 WHO:
   credited_by_admin_id = UUID do admin que criou

🕐 WHEN:
   created_at = Timestamp exato de criação

❓ WHY:
   reason = INVESTOR_CORRECTION / PERFORMANCE_FEE / OTHER
   reason_details = Descrição detalhada
   notes = Observações adicionais

🔗 RELATIONSHIPS:
   - Virtual Credit → User
   - Performance Fee → Virtual Credit (auto-linked)
   - Performance Fee → User

🔍 QUERYABLE:
   SELECT * FROM earnpool_virtual_credits
   WHERE user_id = 'xyz' AND created_at > '2026-02-26'
```

## 📊 Fluxo Completo

```
           ┌─────────────────────────────┐
           │      ADMIN DASHBOARD        │
           │  /admin/earnpool            │
           └────────┬────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    CREATE      CALCULATE    QUERY
    VIRTUAL     PERFORMANCE  CREDITS
    CREDIT      FEE
        │           │           │
        └───────────┼───────────┘
                    │
           ┌────────▼────────┐
           │  DATABASE       │
           │  ┌────────────┐ │
           │  │ Virtual Cr.│ │
           │  │ 2.779 USDT │ │
           │  └────────────┘ │
           │  ┌────────────┐ │
           │  │ Perf. Fee  │ │
           │  │ 9,73 USDT  │ │
           │  └────────────┘ │
           │  ┌────────────┐ │
           │  │ Virtual Cr.│ │ (fee)
           │  │ 9,73 USDT  │ │
           │  └────────────┘ │
           └────────┬────────┘
                    │
           ┌────────▼────────┐
           │  YIELD ENGINE   │
           │  Semanal (0.75%)│
           └────────┬────────┘
                    │
           ┌────────▼────────┐
           │  INVESTOR WALLET│
           │  2.788,73+ USDT │
           │  (+ rendimentos)│
           └────────────────┘
```

## 🎓 Exemplo Prático Passo-a-Passo

### Setup

```bash
# Terminal
$ python scripts/earnpool_investor_setup.py \
    --user-id "550e8400-e29b-41d4-a716-446655440000" \
    --initial-amount 2779.00 \
    --performance-percentage 0.35 \
    --reason INVESTOR_CORRECTION \
    --period-description "Operações Passadas 2024" \
    --admin-id "550e8400-e29b-41d4-a716-446655440001" \
    --notes "João Silva"
```

### Output

```
2026-02-26 10:30:45 - INFO - 📊 Iniciando setup...
2026-02-26 10:30:45 - INFO - ✅ Virtual Credit: 2.779,00 USDT
2026-02-26 10:30:45 - INFO - ✅ Performance Fee: 9,73 USDT (0.35%)
2026-02-26 10:30:45 - INFO - ✅ Virtual Credit (Taxa): 9,73 USDT

============================================================
✨ SETUP COMPLETO DO INVESTIDOR ✨
============================================================
Usuário: joao@example.com
Crédito Inicial: $2,779.00 USDT
Taxa de Performance: $9.73 USDT (0.35%)
TOTAL CREDITADO: $2,788.73 USDT

Próximas etapas:
1. Investidor passa a gerar rendimentos
2. Saques liberados após 30 dias
3. Histórico completo auditável
============================================================
```

### Verificação

```sql
-- Ver tudo que foi criado
SELECT
  'Virtual Credit' AS tipo,
  usdt_amount,
  reason,
  created_at
FROM earnpool_virtual_credits
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT
  'Performance Fee',
  fee_amount_usdt,
  period_description,
  created_at
FROM earnpool_performance_fees
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```

**Resultado:**

```
tipo             | usdt_amount | reason              | created_at
─────────────────┼─────────────┼─────────────────────┼──────────────────
Virtual Credit   | 2779.00     | INVESTOR_CORRECTION | 2026-02-26 10:30
Performance Fee  | 9.73        | Operações Passadas  | 2026-02-26 10:30
Virtual Credit   | 9.73        | PERFORMANCE_FEE     | 2026-02-26 10:30
```

## ✅ Checklist de Validações

```
✓ Usuário existe no banco
✓ Admin existe no banco
✓ Montante > 0
✓ Taxa entre 0-100%
✓ Créditos linked automaticamente
✓ Histórico auditável
✓ Rendimentos calculados automaticamente
✓ Saques funcionam normalmente
✓ Sem impacto em depósitos tradicionais
```

## 🚀 Deployment

### Local Testing

```bash
# 1. Setup dev
cd /Users/josecarlosmartins/Documents/HOLDWallet

# 2. Get investor UUID
sqlite3 hold_wallet.db "SELECT id FROM users WHERE email = 'investor@email.com';"

# 3. Get admin UUID
sqlite3 hold_wallet.db "SELECT id FROM users WHERE is_admin = true LIMIT 1;"

# 4. Run script
python scripts/earnpool_investor_setup.py \
  --user-id "investor-uuid" \
  --initial-amount 2779.00 \
  --performance-percentage 0.35 \
  --admin-id "admin-uuid"

# 5. Verify
sqlite3 hold_wallet.db "SELECT COUNT(*) FROM earnpool_virtual_credits WHERE user_id = 'investor-uuid';"
```

### Production (Digital Ocean)

```bash
# 1. Migration
alembic upgrade head

# 2. Deploy code
git pull origin main

# 3. Restart services
systemctl restart hold-wallet-api

# 4. Start using
# - Via API endpoints
# - Via script
# - Via admin web UI
```

## 📚 Documentação

```
README_INVESTOR_CREDITS.md
├─ Quick start (this file)
│
EARNPOOL_INVESTOR_SETUP_GUIDE.md
├─ Detailed guide (português)
├─ API examples
├─ SQL queries
└─ Troubleshooting

EARNPOOL_INVESTOR_CREDITS_IMPLEMENTATION.md
├─ Technical architecture
├─ Database schema
├─ Service methods
├─ Security & audit
└─ Complete examples
```

## 🎯 TL;DR (Too Long; Didn't Read)

**Você quer creditar um investidor com 2.779 USDT e taxa de 0.35%?**

```bash
python scripts/earnpool_investor_setup.py \
  --user-id "seu-uuid" \
  --initial-amount 2779.00 \
  --performance-percentage 0.35 \
  --admin-id "seu-admin-uuid"
```

**DONE!** ✅ Investidor tem 2.788,73 USDT gerando ~0.75% por semana.

---

**Versão:** 1.0  
**Data:** 26/02/2026  
**Status:** Pronto para Produção 🚀
