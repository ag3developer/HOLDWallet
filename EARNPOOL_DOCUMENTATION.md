# 📊 EarnPool - Documentação Completa

## 🎯 Visão Geral

O **EarnPool** é um sistema de pool de liquidez que permite aos usuários depositar criptomoedas (USDT) e receber rendimentos semanais. O sistema foi projetado para oferecer uma alternativa de investimento passivo dentro da plataforma HOLD Wallet.

---

## 📁 Estrutura de Arquivos

```
backend/app/
├── models/
│   └── earnpool.py          # Modelos SQLAlchemy (5 tabelas)
├── schemas/
│   └── earnpool.py          # Schemas Pydantic para validação
├── services/
│   └── earnpool_service.py  # Lógica de negócios
├── api/v1/endpoints/
│   └── earnpool.py          # Rotas da API
└── core/
    └── uuid_type.py         # Tipo UUID customizado
```

---

## 🗃️ Modelos de Dados (5 Tabelas)

### 1. `earnpool_config` - Configuração Global

```python
class EarnPoolConfig(Base):
    __tablename__ = "earnpool_config"

    id: UUID                    # PK
    min_deposit: Decimal        # Mínimo para depósito (default: 100 USDT)
    max_deposit: Decimal        # Máximo para depósito (default: 100,000 USDT)
    lock_period_days: int       # Período de lock (default: 365 dias)
    base_apy: Decimal           # APY base (default: 12%)
    early_withdrawal_fee: Decimal  # Taxa de saque antecipado (default: 3%)
    is_active: bool             # Pool ativo?
    total_pool_balance: Decimal # Saldo total do pool
    created_at: datetime
    updated_at: datetime
```

### 2. `earnpool_deposits` - Depósitos dos Usuários

```python
class EarnPoolDeposit(Base):
    __tablename__ = "earnpool_deposits"

    id: UUID                    # PK
    user_id: UUID               # FK → users.id
    amount: Decimal             # Valor depositado
    currency: str               # Moeda (USDT)
    status: str                 # LOCKED, UNLOCKED, WITHDRAWN
    deposited_at: datetime      # Data do depósito
    unlocks_at: datetime        # Data de desbloqueio
    total_yield_earned: Decimal # Total de rendimentos
    created_at: datetime
    updated_at: datetime
```

### 3. `earnpool_withdrawals` - Saques

```python
class EarnPoolWithdrawal(Base):
    __tablename__ = "earnpool_withdrawals"

    id: UUID                    # PK
    user_id: UUID               # FK → users.id
    deposit_id: UUID            # FK → earnpool_deposits.id (opcional)
    amount: Decimal             # Valor solicitado
    fee_amount: Decimal         # Taxa aplicada
    net_amount: Decimal         # Valor líquido
    status: str                 # PENDING, APPROVED, REJECTED, COMPLETED
    requested_at: datetime
    processed_at: datetime      # Quando foi processado
    available_at: datetime      # Quando estará disponível
    created_at: datetime
```

### 4. `earnpool_yields` - Rendimentos Semanais (Pool)

```python
class EarnPoolYield(Base):
    __tablename__ = "earnpool_yields"

    id: UUID                    # PK
    week_start: datetime        # Início da semana
    week_end: datetime          # Fim da semana
    total_pool_balance: Decimal # Saldo do pool na semana
    yield_rate: Decimal         # Taxa de rendimento
    total_yield_amount: Decimal # Total distribuído
    status: str                 # PENDING, PROCESSED
    processed_at: datetime
    created_at: datetime
```

### 5. `earnpool_yield_distributions` - Distribuição Individual

```python
class EarnPoolYieldDistribution(Base):
    __tablename__ = "earnpool_yield_distributions"

    id: UUID                    # PK
    yield_id: UUID              # FK → earnpool_yields.id
    user_id: UUID               # FK → users.id
    deposit_id: UUID            # FK → earnpool_deposits.id
    user_balance: Decimal       # Saldo do usuário
    yield_amount: Decimal       # Valor do rendimento
    created_at: datetime
```

---

## 🔧 Correções Implementadas

### 1. Tipo UUID Customizado

**Problema:** Conflito entre UUID do PostgreSQL e UUID do Python.

**Solução:** Criado tipo customizado em `app/core/uuid_type.py`:

```python
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class UUID(PG_UUID):
    """UUID type that works with PostgreSQL"""
    pass
```

**Uso nos modelos:**

```python
from app.core.uuid_type import UUID

class EarnPoolDeposit(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
```

### 2. Serialização UUID no Pydantic

**Problema:** Pydantic v2 não serializa UUID automaticamente para JSON.

**Solução:** Adicionado `field_validator` nos schemas:

```python
from pydantic import field_validator

class EarnPoolDepositResponse(BaseModel):
    id: str
    user_id: str

    @field_validator('id', 'user_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if hasattr(v, 'hex'):  # É um UUID
            return str(v)
        return v

    model_config = ConfigDict(from_attributes=True)
```

### 3. Comparação de Datetime (Timezone-aware vs Naive)

**Problema:** `TypeError: can't compare offset-naive and offset-aware datetimes`

**Solução:** Função helper `ensure_utc()` em `earnpool_service.py`:

```python
from datetime import datetime, timezone

def ensure_utc(dt: datetime) -> datetime:
    """Garante que datetime tenha timezone UTC para comparações seguras."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

# Uso:
now = datetime.now(timezone.utc)
unlocks_at = ensure_utc(deposit.unlocks_at)
is_locked = now < unlocks_at
```

---

## 🛣️ Endpoints da API

### Endpoints Públicos (Sem Autenticação)

| Método | Rota               | Descrição                  |
| ------ | ------------------ | -------------------------- |
| GET    | `/earnpool/config` | Configuração atual do pool |

### Endpoints de Usuário (Requer Autenticação)

| Método | Rota                         | Descrição                       |
| ------ | ---------------------------- | ------------------------------- |
| GET    | `/earnpool/balance`          | Saldo e resumo do usuário       |
| GET    | `/earnpool/history`          | Histórico de depósitos e saques |
| POST   | `/earnpool/deposit/preview`  | Preview de depósito             |
| POST   | `/earnpool/deposit`          | Realizar depósito               |
| POST   | `/earnpool/withdraw/preview` | Preview de saque                |
| POST   | `/earnpool/withdraw`         | Solicitar saque                 |

### Endpoints Admin (Requer Admin + 2FA)

| Método | Rota                                       | Descrição                      |
| ------ | ------------------------------------------ | ------------------------------ |
| GET    | `/earnpool/admin/overview`                 | Visão geral do pool            |
| POST   | `/earnpool/admin/process-yields`           | Processar rendimentos semanais |
| PUT    | `/earnpool/admin/config`                   | Atualizar configuração         |
| GET    | `/earnpool/admin/withdrawals`              | Listar saques pendentes        |
| POST   | `/earnpool/admin/withdrawals/{id}/approve` | Aprovar saque                  |
| POST   | `/earnpool/admin/withdrawals/{id}/reject`  | Rejeitar saque                 |

---

## 🧪 Testes Realizados

### Configuração de Teste

```bash
# Backend rodando em:
http://localhost:8000

# Credenciais de teste:
# Usuário: contato@josecarlosmartins.com / Jcm15!@#
# Admin: admin@wolknow.com / Admin123@@ (requer 2FA)
```

### 1. Teste: Obter Configuração (Público)

```bash
curl -s http://localhost:8000/earnpool/config | jq
```

**Resposta:**

```json
{
  "id": "345134d0-c54a-4c93-8e7a-01000cf1eb4f",
  "min_deposit": 100.0,
  "max_deposit": 100000.0,
  "lock_period_days": 365,
  "base_apy": 12.0,
  "early_withdrawal_fee": 3.0,
  "is_active": true,
  "total_pool_balance": 0.0
}
```

### 2. Teste: Login de Usuário

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "contato@josecarlosmartins.com", "password": "Jcm15!@#"}' | jq
```

**Resposta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "cc98ade4-7d50-48f0-95cd-ff69cb24c259",
    "email": "contato@josecarlosmartins.com",
    "username": "josecarlosmartins"
  }
}
```

### 3. Teste: Saldo do Usuário

```bash
curl -s http://localhost:8000/earnpool/balance \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Resposta (antes de depósitos):**

```json
{
  "total_deposited": 0.0,
  "total_yield_earned": 0.0,
  "pending_withdrawals": 0.0,
  "available_balance": 0.0,
  "locked_until": null,
  "deposits_count": 0
}
```

### 4. Teste: Histórico do Usuário

```bash
curl -s http://localhost:8000/earnpool/history \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Resposta:**

```json
{
  "deposits": [],
  "withdrawals": [],
  "yield_distributions": []
}
```

### 5. Teste: Preview de Depósito

```bash
curl -s -X POST http://localhost:8000/earnpool/deposit/preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "currency": "USDT"}' | jq
```

**Resposta:**

```json
{
  "amount": 500.0,
  "currency": "USDT",
  "lock_period_days": 365,
  "unlocks_at": "2026-03-16T...",
  "estimated_apy": 12.0,
  "estimated_yearly_yield": 60.0,
  "estimated_weekly_yield": 1.15
}
```

### 6. Teste: Realizar Depósito

```bash
curl -s -X POST http://localhost:8000/earnpool/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "currency": "USDT"}' | jq
```

**Resposta:**

```json
{
  "id": "38a60291-d830-4f7f-b67f-d4dff1b095bc",
  "user_id": "cc98ade4-7d50-48f0-95cd-ff69cb24c259",
  "amount": 500.0,
  "currency": "USDT",
  "status": "LOCKED",
  "deposited_at": "2025-03-16T...",
  "unlocks_at": "2026-03-16T...",
  "total_yield_earned": 0.0
}
```

### 7. Teste: Saldo Após Depósito

```bash
curl -s http://localhost:8000/earnpool/balance \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Resposta:**

```json
{
  "total_deposited": 500.0,
  "total_yield_earned": 0.0,
  "pending_withdrawals": 0.0,
  "available_balance": 500.0,
  "locked_until": "2026-03-16T...",
  "deposits_count": 1
}
```

### 8. Teste: Preview de Saque (Antecipado)

```bash
curl -s -X POST http://localhost:8000/earnpool/withdraw/preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' | jq
```

**Resposta:**

```json
{
  "amount": 100.0,
  "fee_percentage": 3.0,
  "fee_amount": 3.0,
  "net_amount": 97.0,
  "is_early_withdrawal": true,
  "available_at": "2026-02-21T..."
}
```

### 9. Teste: Solicitar Saque

```bash
curl -s -X POST http://localhost:8000/earnpool/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' | jq
```

**Resposta:**

```json
{
  "id": "cc3d1906-64dd-4713-97c1-c31b81fe3850",
  "user_id": "cc98ade4-7d50-48f0-95cd-ff69cb24c259",
  "amount": 100.0,
  "fee_amount": 3.0,
  "net_amount": 97.0,
  "status": "PENDING",
  "requested_at": "2025-02-14T...",
  "available_at": "2026-02-21T..."
}
```

### 10. Teste: Saldo Final

```bash
curl -s http://localhost:8000/earnpool/balance \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Resposta:**

```json
{
  "total_deposited": 500.0,
  "total_yield_earned": 0.0,
  "pending_withdrawals": 97.0,
  "available_balance": 403.0,
  "locked_until": "2026-03-16T...",
  "deposits_count": 1
}
```

---

## 🔐 Fluxo de Autenticação Admin (2FA)

### Passo 1: Login Inicial

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@wolknow.com", "password": "Admin123@@"}'
```

**Resposta (2FA Requerido):**

```json
{
  "requires_2fa": true,
  "temp_token": "eyJ...",
  "message": "2FA verification required"
}
```

### Passo 2: Verificar 2FA

```bash
curl -s -X POST http://localhost:8000/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"temp_token": "eyJ...", "code": "123456"}'
```

**Resposta (Sucesso):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "d6447bbd-d8c6-4845-b6fc-76fce8bcd79c",
    "email": "admin@wolknow.com",
    "is_admin": true
  }
}
```

### Passo 3: Usar Token Admin

```bash
curl -s http://localhost:8000/earnpool/admin/overview \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

---

## 📈 Lógica de Negócios

### Depósito

1. Usuário solicita depósito com valor e moeda
2. Sistema valida:
   - Valor entre `min_deposit` e `max_deposit`
   - Pool está ativo
3. Cria registro em `earnpool_deposits` com:
   - Status: `LOCKED`
   - `unlocks_at`: data atual + `lock_period_days`
4. Atualiza `total_pool_balance` na config

### Saque

1. Usuário solicita saque com valor
2. Sistema valida:
   - Saldo disponível suficiente
   - Valor não excede saldo
3. Calcula taxa:
   - Se `now < unlocks_at`: aplica `early_withdrawal_fee`
   - Se `now >= unlocks_at`: sem taxa
4. Cria registro em `earnpool_withdrawals` com:
   - Status: `PENDING`
   - `available_at`: 7 dias após solicitação

### Processamento de Rendimentos (Admin)

1. Admin aciona processamento semanal
2. Sistema:
   - Calcula rendimento: `pool_balance * (base_apy / 52)`
   - Distribui proporcionalmente entre depositantes
   - Atualiza `total_yield_earned` em cada depósito
3. Cria registros em `earnpool_yields` e `earnpool_yield_distributions`

---

## 🚀 Próximos Passos

1. **Frontend EarnPool:**
   - [ ] Página de visualização do pool
   - [ ] Formulário de depósito
   - [ ] Formulário de saque
   - [ ] Histórico de transações
   - [ ] Dashboard de rendimentos

2. **Internacionalização:**
   - [x] Português (pt-BR) ✅
   - [x] Inglês (en-US) ✅
   - [x] Espanhol (es-ES) ✅

3. **Admin Panel:**
   - [ ] Visão geral do pool
   - [ ] Processar rendimentos
   - [ ] Aprovar/rejeitar saques
   - [ ] Configurações do pool

---

## 🌍 Internacionalização (i18n)

### Estrutura de Arquivos

```
Frontend/src/
├── config/
│   └── i18n.ts           # Configuração do i18next
└── locales/
    ├── pt-BR.json        # Português (Brasil)
    ├── en-US.json        # Inglês (EUA)
    ├── es-ES.json        # Espanhol
    ├── zh-CN.json        # Chinês
    ├── ja-JP.json        # Japonês
    └── ko-KR.json        # Coreano
```

### Chaves de Tradução EarnPool

```json
{
  "earnpool": {
    "title": "EarnPool",
    "subtitle": "...",
    "description": "...",
    "poolOverview": "...",
    "yourBalance": "...",
    "totalDeposited": "...",
    "totalYieldEarned": "...",
    "pendingWithdrawals": "...",
    "availableBalance": "...",
    "lockedUntil": "...",
    "depositsCount": "...",
    "poolStats": { ... },
    "deposit": { ... },
    "withdraw": { ... },
    "history": { ... },
    "status": { ... },
    "actions": { ... },
    "errors": { ... }
  }
}
```

### Uso no Componente

```tsx
import { useTranslation } from "react-i18next";

function EarnPoolPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("earnpool.title")}</h1>
      <p>{t("earnpool.subtitle")}</p>

      {/* Com interpolação */}
      <p>
        {t("earnpool.deposit.minAmount", { amount: 100, currency: "USDT" })}
      </p>

      {/* Com warning de taxa */}
      <p>{t("earnpool.withdraw.earlyWithdrawalWarning", { fee: 3 })}</p>
    </div>
  );
}
```

### Idiomas Suportados

| Código | Idioma    | Nome Nativo |
| ------ | --------- | ----------- |
| pt-BR  | Português | Português   |
| en-US  | English   | English     |
| es-ES  | Spanish   | Español     |
| zh-CN  | Chinese   | 中文        |
| ja-JP  | Japanese  | 日本語      |
| ko-KR  | Korean    | 한국어      |

---

## 📝 Notas de Desenvolvimento

- **Data do Teste:** 14 de fevereiro de 2026
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React + TypeScript + Vite
- **Autenticação:** JWT + 2FA (TOTP) para admins
- **Moeda Suportada:** USDT (expansível)
- **Período de Lock:** 365 dias (configurável)
- **APY Base:** 12% (configurável)
- **Taxa de Saque Antecipado:** 3% (configurável)

---

## 🖥️ Frontend - Implementação Completa

### Arquivos Criados

```
Frontend/src/
├── pages/
│   └── earnpool/
│       ├── EarnPoolPage.tsx   # Componente principal (~920 linhas)
│       └── index.ts           # Export module
├── locales/
│   ├── pt-BR.json             # +90 chaves de tradução (earnpool.*)
│   ├── en-US.json             # +90 chaves de tradução (earnpool.*)
│   └── es-ES.json             # +90 chaves de tradução (earnpool.*)
└── components/layout/
    └── Sidebar.tsx            # Atualizado com link EarnPool
```

### Arquivos Modificados

| Arquivo       | Alteração                                                       |
| ------------- | --------------------------------------------------------------- |
| `App.tsx`     | Adicionado import e rota `/earnpool`                            |
| `Sidebar.tsx` | Adicionado link no menu de serviços                             |
| `pt-BR.json`  | Adicionadas traduções para `earnpool.*` e `navigation.earnpool` |
| `en-US.json`  | Adicionadas traduções para `earnpool.*` e `navigation.earnpool` |
| `es-ES.json`  | Adicionadas traduções para `earnpool.*` e `navigation.earnpool` |

### Funcionalidades do Frontend

1. **Dashboard do Pool**
   - Exibição de estatísticas gerais (saldo total, APY, período de lock)
   - Valores mínimo e máximo de depósito
   - Taxa de saque antecipado

2. **Saldo do Usuário**
   - Total depositado
   - Rendimentos acumulados
   - Saques pendentes
   - Saldo disponível
   - Data de desbloqueio (se houver depósitos bloqueados)

3. **Depositar**
   - Formulário com validação
   - Preview antes de confirmar
   - Cálculo automático de rendimento estimado
   - Exibição de data de desbloqueio

4. **Sacar**
   - Formulário com validação
   - Warning de saque antecipado (se aplicável)
   - Cálculo de taxa e valor líquido
   - Preview antes de confirmar

5. **Histórico**
   - Abas separadas: Depósitos / Saques / Rendimentos
   - Status com cores visuais
   - Data e hora formatadas

### Rota Configurada

```tsx
// App.tsx
<Route path="earnpool" element={<EarnPoolPage />} />
```

### Menu de Navegação

```tsx
// Sidebar.tsx
{ name: 'earnpool', href: '/earnpool', icon: TrendingUp, group: 'services', badge: 'Novo' }
```

---

_Documentação gerada automaticamente durante sessão de desenvolvimento._
