# EarnPool - Especificação Técnica

## Pool de Liquidez com Rendimentos

**Versão:** 1.0.0  
**Data:** Fevereiro 2026  
**Status:** Backend Implementado

---

## 📋 Resumo

EarnPool é um sistema de pool de liquidez onde usuários depositam crypto e recebem rendimentos semanais baseados nas operações reais da plataforma.

### Regras de Negócio

| Parâmetro                     | Valor         | Descrição                            |
| ----------------------------- | ------------- | ------------------------------------ |
| Depósito Mínimo               | $250 USDT     | Valor mínimo para participar         |
| Período de Lock               | 30 dias       | Tempo mínimo de permanência          |
| Prazo de Saque                | D+7           | Dias para processar saque normal     |
| Taxa Admin (antecipado)       | 2%            | Taxa para saque antes de 30 dias     |
| Taxa Operacional (antecipado) | 1%            | Taxa adicional para saque antecipado |
| Meta de Rendimento            | ~0.75%/semana | ~3% ao mês (variável)                |

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`earnpool_config`** - Configurações globais
2. **`earnpool_deposits`** - Depósitos dos usuários
3. **`earnpool_withdrawals`** - Saques solicitados
4. **`earnpool_yields`** - Rendimentos semanais (agregado)
5. **`earnpool_yield_distributions`** - Distribuição individual por usuário

### Diagrama ER Simplificado

```
earnpool_config (1 ativa)
    │
    └── Configura regras para:
            │
            ├── earnpool_deposits (N por user)
            │       │
            │       ├── earnpool_withdrawals (N por deposit)
            │       │
            │       └── earnpool_yield_distributions (N por deposit)
            │               │
            │               └── earnpool_yields (1 por semana)
```

---

## 🔌 API Endpoints

### Usuário (`/earnpool/*`)

| Método | Endpoint                     | Descrição                  |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/earnpool/config`           | Configuração pública       |
| POST   | `/earnpool/deposit/preview`  | Preview antes de depositar |
| POST   | `/earnpool/deposit`          | Criar depósito             |
| POST   | `/earnpool/withdraw/preview` | Preview antes de sacar     |
| POST   | `/earnpool/withdraw`         | Solicitar saque            |
| GET    | `/earnpool/balance`          | Saldo e depósitos ativos   |
| GET    | `/earnpool/history`          | Histórico completo         |
| GET    | `/earnpool/deposit/{id}`     | Detalhes de um depósito    |
| GET    | `/earnpool/withdrawal/{id}`  | Detalhes de um saque       |

### Admin (`/admin/earnpool/*`)

| Método | Endpoint                             | Descrição                         |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/admin/earnpool/overview`           | Dashboard do pool                 |
| GET    | `/admin/earnpool/config`             | Configuração atual                |
| PUT    | `/admin/earnpool/config`             | Atualizar configuração            |
| GET    | `/admin/earnpool/deposits`           | Listar todos depósitos            |
| GET    | `/admin/earnpool/deposit/{id}`       | Detalhes de depósito              |
| GET    | `/admin/earnpool/withdrawals`        | Listar todos saques               |
| POST   | `/admin/earnpool/withdrawal/approve` | Aprovar/rejeitar saque antecipado |
| GET    | `/admin/earnpool/yields`             | Histórico de rendimentos          |
| POST   | `/admin/earnpool/yields/process`     | Processar rendimentos semanais    |
| GET    | `/admin/earnpool/yields/{id}`        | Detalhes de distribuição          |
| GET    | `/admin/earnpool/stats`              | Estatísticas detalhadas           |

---

## 🔄 Fluxos

### Fluxo de Depósito

```
1. Usuário seleciona crypto e quantidade
2. Sistema calcula equivalente em USDT
3. Valida mínimo ($250)
4. Usuário confirma depósito
5. Sistema cria registro com status LOCKED
6. Crypto é transferida para carteira operacional
7. Após 30 dias: status muda para ACTIVE
```

### Fluxo de Saque Normal (após 30 dias)

```
1. Usuário solicita saque
2. Sistema verifica período de lock (já passou)
3. Cria withdrawal com status PENDING
4. D+7: Sistema processa pagamento
5. Status: COMPLETED
```

### Fluxo de Saque Antecipado (antes de 30 dias)

```
1. Usuário solicita saque
2. Sistema verifica período de lock (ainda ativo)
3. Calcula taxas (2% admin + 1% operacional = 3%)
4. Usuário aceita taxas
5. Cria withdrawal com is_early_withdrawal=true
6. Admin aprova ou rejeita
7. Se aprovado: D+7 para processamento
8. Status: COMPLETED ou REJECTED
```

### Fluxo de Distribuição de Rendimentos (Semanal)

```
1. Admin acessa /admin/earnpool/yields/process
2. Informa receita da plataforma no período:
   - OTC trades
   - Boletos pagos
   - Recargas
   - Outros
3. Define % a distribuir para o pool
4. Sistema calcula:
   - Total do pool
   - % de cada usuário
   - Rendimento proporcional
5. Credita rendimentos nos depósitos
6. Atualiza status de depósitos LOCKED → ACTIVE se passaram 30 dias
```

---

## 🧪 Como Testar

### 1. Aplicar Migração

```bash
cd backend
python apply_earnpool_migration.py
```

### 2. Testar Endpoints de Usuário

```bash
# Config (público)
curl http://localhost:8000/earnpool/config

# Preview depósito (autenticado)
curl -X POST http://localhost:8000/earnpool/deposit/preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"crypto_symbol": "ETH", "crypto_amount": 0.1}'

# Criar depósito
curl -X POST http://localhost:8000/earnpool/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"crypto_symbol": "ETH", "crypto_amount": 0.1, "accept_terms": true}'

# Ver saldo
curl http://localhost:8000/earnpool/balance \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Testar Endpoints Admin

```bash
# Overview
curl http://localhost:8000/admin/earnpool/overview \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Atualizar config
curl -X PUT http://localhost:8000/admin/earnpool/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_weekly_yield_percentage": 0.80, "notes": "Ajuste teste"}'

# Processar rendimentos
curl -X POST http://localhost:8000/admin/earnpool/yields/process \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "week_start": "2026-02-10T00:00:00Z",
    "week_end": "2026-02-16T23:59:59Z",
    "platform_revenue_usdt": 5000,
    "revenue_from_otc": 3000,
    "revenue_from_bills": 1500,
    "revenue_from_recharge": 500,
    "percentage_to_pool": 50
  }'
```

---

## 📁 Arquivos Criados

```
backend/
├── app/
│   ├── models/
│   │   └── earnpool.py          # Models SQLAlchemy
│   ├── schemas/
│   │   └── earnpool.py          # Schemas Pydantic
│   ├── services/
│   │   └── earnpool_service.py  # Lógica de negócios
│   └── routers/
│       ├── earnpool.py          # Routes usuário
│       └── admin/
│           └── earnpool_admin.py # Routes admin
├── apply_earnpool_migration.py   # Script de migração
└── EARNPOOL_SPECS.md            # Esta documentação
```

---

## 🔜 Próximos Passos

### Backend (TODOs)

- [ ] Integrar com serviço de preços reais (CoinGecko)
- [ ] Integrar com serviço de wallet para verificar saldo
- [ ] Implementar transferência para carteira operacional
- [ ] Criar job automático para processar saques D+7
- [ ] Criar job automático para atualizar status LOCKED → ACTIVE

### Frontend (Após testes do backend)

- [ ] Página EarnPool no dashboard
- [ ] Modal de depósito
- [ ] Modal de saque
- [ ] Histórico de rendimentos
- [ ] Admin: Dashboard EarnPool
- [ ] Admin: Processar rendimentos
- [ ] Admin: Aprovar saques antecipados

---

## ⚠️ Considerações de Segurança

1. **Rendimentos não são garantidos** - Variável baseado em operações reais
2. **Auditoria completa** - Todas ações são logadas
3. **Aprovação manual** - Saques antecipados requerem admin
4. **Config versionada** - Histórico de mudanças mantido
5. **Taxas claras** - Usuário vê preview antes de confirmar
