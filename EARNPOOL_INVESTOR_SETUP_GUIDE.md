# 📊 Setup de Investidores - EarnPool Manual Admin

## 🎯 Visão Geral

Você agora tem 3 formas de creditar investidores que não foram processados automaticamente:

1. **Virtual Credit** - Crédito simples (sem taxa)
2. **Performance Fee** - Taxa sobre montante em custódia
3. **Complete Setup** - Ambos em um call (API)
4. **Script Python** - Para setup em bulk ou automático

---

## 📋 Caso de Uso: Seu Investidor

```
Investidor: João Silva
Depósito Original: 2.779,00 USDT
Taxa de Performance: 0.35% sobre montante
Valor da Taxa: 9,73 USDT
TOTAL A CREDITAR: 2.788,73 USDT
```

---

## 🔧 Opção 1: API REST (Recomendado)

### 1.1 Criar Virtual Credit (Crédito Simples)

**Endpoint:**

```
POST /admin/earnpool/investor/virtual-credit
```

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "usdt_amount": 2779.0,
  "reason": "INVESTOR_CORRECTION",
  "reason_details": "Investidor que entrou por fora do sistema automático",
  "notes": "Referência: João Silva - +55 11 98765-4321"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Crédito virtual de $2779.00 USDT creditado com sucesso ao usuário",
  "virtual_credit": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "usdt_amount": 2779.0,
    "reason": "INVESTOR_CORRECTION",
    "reason_details": "Investidor que entrou por fora do sistema automático",
    "total_yield_earned": 0,
    "credited_at": "2026-02-26T10:30:00",
    "is_active": true,
    "credited_by_admin_id": "seu-admin-id",
    "notes": "Referência: João Silva - +55 11 98765-4321"
  }
}
```

### 1.2 Criar Performance Fee (Taxa de Performance)

**Endpoint:**

```
POST /admin/earnpool/investor/performance-fee
```

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "base_amount_usdt": 2779.0,
  "performance_percentage": 0.35,
  "period_description": "Operações Passadas 2024",
  "notes": "Primeira distribuição de performance para o investidor"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Taxa de performance de $9.7265 USDT calculada e creditada",
  "performance_fee": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "base_amount_usdt": 2779.0,
    "performance_percentage": 0.35,
    "fee_amount_usdt": 9.7265,
    "period_description": "Operações Passadas 2024",
    "status": "CREDITED",
    "credited_at": "2026-02-26T10:31:00",
    "virtual_credit_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
  },
  "virtual_credit": {
    "id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "usdt_amount": 9.7265,
    "reason": "PERFORMANCE_FEE",
    "total_yield_earned": 0,
    "credited_at": "2026-02-26T10:31:00",
    "is_active": true
  },
  "total_credited_usdt": 9.7265
}
```

### 1.3 Verificar Créditos de um Investidor

**Endpoint:**

```
GET /admin/earnpool/investor/550e8400-e29b-41d4-a716-446655440000/credits
```

**Response:**

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "virtual_credits": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "usdt_amount": 2779.0,
      "reason": "INVESTOR_CORRECTION",
      "total_yield_earned": 15.43,
      "is_active": true
    },
    {
      "id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
      "usdt_amount": 9.7265,
      "reason": "PERFORMANCE_FEE",
      "total_yield_earned": 0.05,
      "is_active": true
    }
  ],
  "performance_fees": [
    {
      "id": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
      "base_amount_usdt": 2779.0,
      "performance_percentage": 0.35,
      "fee_amount_usdt": 9.7265,
      "status": "CREDITED"
    }
  ],
  "total_virtual_credits_usdt": 2788.73,
  "total_performance_fees_usdt": 9.7265,
  "total_investor_balance_usdt": 2788.73
}
```

---

## 🐍 Opção 2: Script Python (Para Bulk ou Automação)

### Usar o script:

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet

# Setup simples (apenas crédito)
python scripts/earnpool_investor_setup.py \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --initial-amount 2779.00 \
  --admin-id "seu-admin-uuid-aqui"

# Setup completo (com taxa)
python scripts/earnpool_investor_setup.py \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --initial-amount 2779.00 \
  --performance-percentage 0.35 \
  --reason INVESTOR_CORRECTION \
  --period-description "Operações Passadas 2024" \
  --admin-id "seu-admin-uuid-aqui" \
  --notes "Referência: João Silva"
```

### Output esperado:

```
2026-02-26 10:30:45,123 - earnpool_investor_setup - INFO - 📊 Iniciando setup do investidor joao@example.com
2026-02-26 10:30:45,124 - earnpool_investor_setup - INFO -    Montante: $2779.00 USDT
2026-02-26 10:30:45,125 - earnpool_investor_setup - INFO -    Performance: 0.35%
2026-02-26 10:30:45,200 - earnpool_investor_setup - INFO - ✅ Virtual Credit criado: $2779.00 USDT
2026-02-26 10:30:45,201 - earnpool_investor_setup - INFO - ✅ Performance Fee criado: $9.73 (0.35% de $2779.00)
2026-02-26 10:30:45,202 - earnpool_investor_setup - INFO - ✅ Virtual Credit (Taxa) criado: $9.73 USDT

============================================================
✨ SETUP COMPLETO DO INVESTIDOR ✨
============================================================
Usuário: joao@example.com
Crédito Inicial: $2779.00 USDT
Taxa de Performance: $9.73 USDT (0.35%)
TOTAL CREDITADO: $2788.73 USDT

Próximas etapas:
1. Investidor passa a gerar rendimentos sobre AMBOS os créditos
2. Saques funcionam normalmente após período mínimo
3. Histórico completo de auditoria disponível no banco
============================================================

📊 RESULTADO DO SETUP:
   Crédito Inicial: $2779.0
   Taxa de Performance: $9.7265
   TOTAL: $2788.7265
```

---

## 📊 Como Funciona no Sistema

### Fluxo: Após o Setup

```
1. ADMIN CRIA CRÉDITO
   └─ Virtual Credit: 2.779 USDT (INVESTOR_CORRECTION)
   └─ Performance Fee: 0.35% calculado
   └─ Virtual Credit: 9.73 USDT (PERFORMANCE_FEE)

2. INVESTIDOR RECEBE NO POOL
   └─ Total em custódia: 2.788,73 USDT
   └─ Status: ACTIVE (gerando rendimentos)
   └─ Sem necessidade de blockchain

3. RENDIMENTOS SEMANAIS
   └─ Cada semana: 0.75% ~= 20,92 USDT/semana
   └─ Distribuído proporcionalmente
   └─ Creditado automaticamente

4. SAQUE
   └─ Normal (D+7): sem taxas
   └─ Antecipado: taxa admin + operacional
   └─ Pode sacar em wallet ou PIX
```

### Exemplo de Evolução de Saldo

```
Semana 1:
- Inicial: 2.788,73 USDT
- Rendimento (0.75%): 20,92 USDT
- Saldo: 2.809,65 USDT

Semana 2:
- Anterior: 2.809,65 USDT
- Rendimento (0.75%): 21,07 USDT
- Saldo: 2.830,72 USDT

Semana 4:
- Saldo acumulado: ~2.956 USDT
- Investidor pode sacar livremente
```

---

## 🔐 Segurança & Auditoria

### Todos os dados são rastreáveis:

```sql
-- Ver créditos de um investidor
SELECT * FROM earnpool_virtual_credits
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY credited_at DESC;

-- Ver taxas de performance
SELECT * FROM earnpool_performance_fees
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- Ver histórico completo
SELECT
  'Virtual Credit' AS tipo,
  vc.usdt_amount,
  vc.reason,
  vc.credited_at,
  vc.credited_by_admin_id
FROM earnpool_virtual_credits vc
WHERE vc.user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT
  'Performance Fee' AS tipo,
  pf.fee_amount_usdt,
  pf.period_description,
  pf.created_at,
  pf.created_by_admin_id
FROM earnpool_performance_fees pf
WHERE pf.user_id = '550e8400-e29b-41d4-a716-446655440000'

ORDER BY created_at DESC;
```

---

## ⚙️ Configuração

### Valores padrão (no EarnPool Config)

```
min_deposit_usdt: 250,00
lock_period_days: 30
withdrawal_delay_days: 7
early_withdrawal_admin_fee: 2%
early_withdrawal_op_fee: 1%
target_weekly_yield_percentage: 0.75%
```

### Você pode ajustar via:

```
PUT /admin/earnpool/config
```

---

## 🐛 Troubleshooting

### Erro: "Usuário não encontrado"

```bash
# Verificar ID do usuário no banco
SELECT id, email FROM users WHERE email = 'joao@example.com';

# Usar o ID correto na chamada
```

### Erro: "Admin não encontrado"

```bash
# Verificar seu ID de admin
SELECT id, email FROM users WHERE is_admin = true;

# Usar seu UUID correto em --admin-id
```

### Verificar se tudo foi criado:

```bash
# Via API
curl -H "Authorization: Bearer seu_token" \
  http://localhost:8000/admin/earnpool/investor/550e8400-e29b-41d4-a716-446655440000/credits

# Via SQL
sqlite3 hold_wallet.db "SELECT COUNT(*) FROM earnpool_virtual_credits WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';"
```

---

## 📌 Próximos Passos

1. **Testar com seu investidor:**
   - Use o UUID do investidor real
   - Use seu UUID de admin
   - Verifique que ambos existem no banco

2. **Monitorar no dashboard admin:**
   - Veja `/admin/earnpool/overview`
   - Confirme que o saldo apareceu

3. **Comunicar ao investidor:**
   - Saldo creditado: 2.788,73 USDT
   - Período de lock: 30 dias
   - Rendimento esperado: ~0.75% / semana

4. **Usar em produção:**
   - Depois que testar localmente
   - Deploy para Digital Ocean
   - Configure no admin web

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do backend: `tail -f backend.log`
2. Verifique o banco de dados
3. Use o script com `--help` para ver opções
4. Consulte a documentação: `EARNPOOL_DOCUMENTATION.md`

---

**Criado:** 26/02/2026  
**Versão:** 1.0  
**Autor:** HOLD Wallet Dev Team
