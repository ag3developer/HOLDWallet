# 🎁 WOLK FRIENDS - Programa de Indicação

## Visão Geral

O **WOLK FRIENDS** é o programa de indicação da WolkNow que recompensa usuários que trazem novos clientes para a plataforma. O modelo é baseado em **revenue share** (compartilhamento de receita), onde o indicador recebe uma porcentagem do spread cobrado nas transações dos seus indicados.

---

## 📊 Modelo de Comissionamento

### Sistema de Tiers (Níveis)

O programa utiliza um sistema progressivo de níveis baseado no número de **indicados ativos**:

| Tier              | Indicados Ativos | Comissão |
| ----------------- | ---------------- | -------- |
| 🥉 **Bronze**     | 0-5              | **20%**  |
| 🥈 **Silver**     | 6-20             | **25%**  |
| 🥇 **Gold**       | 21-50            | **30%**  |
| 💎 **Diamond**    | 51-100           | **35%**  |
| 👑 **Ambassador** | 100+             | **40%**  |

### O que é um "Indicado Ativo"?

Um indicado é considerado **ativo** quando fez pelo menos **1 transação nos últimos 30 dias**.

### Cálculo da Comissão

```
Comissão = Taxa da Transação × (Taxa do Tier / 100)
```

**Exemplo:**

- Indicado faz uma transação de $1.000
- Spread da WolkNow: 3% = $30
- Indicador está no tier Gold (30%)
- Comissão: $30 × 0.30 = **$9.00**

---

## 🔄 Fluxo do Programa

### 1. Geração de Código

```
Usuário abre a página de indicação
     ↓
Sistema gera código único (ex: WOLK-JOSE1234)
     ↓
Usuário compartilha com amigos
```

### 2. Registro de Indicação

```
Amigo se cadastra usando o código
     ↓
Indicação fica com status "PENDING"
     ↓
Indicador pode ver na dashboard
```

### 3. Qualificação

```
Indicado faz primeira transação (≥ $1)
     ↓
Indicação muda para "QUALIFIED"
     ↓
Indicador começa a ganhar comissões
```

### 4. Atividade

```
Indicado continua transacionando
     ↓
Status = "ACTIVE" (conta para tier)

Se não transacionar em 30 dias:
     ↓
Status = "INACTIVE" (não conta para tier)
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **referral_codes** - Códigos de indicação dos usuários
2. **referrals** - Relação entre indicador e indicado
3. **referral_earnings** - Histórico de comissões
4. **referral_config** - Configurações do programa

### Tipos (Enums)

- `referral_tier`: bronze, silver, gold, diamond, ambassador
- `referral_status`: pending, qualified, active, inactive, cancelled

---

## 🔌 API Endpoints

### Endpoints Públicos

| Método | Endpoint                    | Descrição                  |
| ------ | --------------------------- | -------------------------- |
| GET    | `/referral/program-info`    | Informações do programa    |
| GET    | `/referral/validate/{code}` | Valida código de indicação |

### Endpoints Autenticados

| Método | Endpoint              | Descrição                    |
| ------ | --------------------- | ---------------------------- |
| GET    | `/referral/code`      | Obter meu código             |
| GET    | `/referral/stats`     | Estatísticas do programa     |
| GET    | `/referral/earnings`  | Lista de ganhos              |
| GET    | `/referral/list`      | Lista de indicados           |
| POST   | `/referral/apply`     | Aplicar código (no registro) |
| GET    | `/referral/dashboard` | Dashboard completo           |

### Endpoints Admin

| Método | Endpoint                             | Descrição              |
| ------ | ------------------------------------ | ---------------------- |
| GET    | `/admin/referral/stats`              | Estatísticas gerais    |
| GET    | `/admin/referral/dashboard`          | Dashboard com métricas |
| GET    | `/admin/referral/referrers`          | Lista de indicadores   |
| GET    | `/admin/referral/referrals`          | Lista de indicações    |
| GET    | `/admin/referral/earnings`           | Lista de ganhos        |
| GET    | `/admin/referral/config`             | Configuração           |
| PUT    | `/admin/referral/config`             | Atualizar configuração |
| POST   | `/admin/referral/process-inactive`   | Marcar inativos        |
| POST   | `/admin/referral/mark-earnings-paid` | Marcar pagos           |

---

## 📱 Páginas Frontend

### Página do Usuário (`/referral`)

- **Card principal**: Código de indicação com botões de compartilhamento
- **Estatísticas**: Total, ativos, ganhos
- **Tabs**:
  - Meus Indicados: Lista de pessoas indicadas
  - Histórico de Ganhos: Comissões recebidas
  - Tabela de Tiers: Explicação dos níveis

### Compartilhamento

Integração com:

- WhatsApp
- Telegram
- Twitter
- Copiar link

---

## ⚙️ Configurações Ajustáveis

| Parâmetro                    | Padrão | Descrição                    |
| ---------------------------- | ------ | ---------------------------- |
| `min_transaction_to_qualify` | $1.00  | Valor mínimo para qualificar |
| `days_to_consider_active`    | 30     | Dias para considerar ativo   |
| `is_program_active`          | true   | Liga/desliga o programa      |

---

## 🔗 Integração com Transações

Para processar comissões, adicione ao fluxo de transações:

```python
from app.services.referral_service import get_referral_service

# Após transação bem-sucedida
def on_transaction_complete(user_id, transaction):
    db = get_db()
    service = get_referral_service(db)

    # Processa comissão se houver indicador
    service.process_referral_commission(
        referred_user_id=user_id,
        transaction_type="instant_trade",  # ou p2p, swap, etc
        transaction_id=str(transaction.id),
        transaction_amount=transaction.amount,
        fee_amount=transaction.fee  # spread cobrado
    )
```

---

## 📈 Métricas para Acompanhar

1. **Taxa de Conversão**: Indicações que qualificam
2. **Atividade**: % de indicados ativos
3. **Revenue Share Total**: Quanto está sendo pago em comissões
4. **Top Referrers**: Quem está trazendo mais usuários

---

## 🎯 Próximos Passos

1. [ ] Integrar com fluxo de registro (aplicar código automaticamente)
2. [ ] Integrar com instant_trade (processar comissões)
3. [ ] Integrar com P2P (processar comissões)
4. [ ] Criar job para processar inativos diariamente
5. [ ] Criar página admin no frontend
6. [ ] Implementar pagamento automático de comissões

---

## 📁 Arquivos Criados

### Backend

- `app/models/referral.py` - Modelos SQLAlchemy
- `app/services/referral_service.py` - Lógica de negócio
- `app/routers/referral.py` - Endpoints da API
- `app/routers/admin/referral_admin.py` - Endpoints admin
- `migrations/009_create_referral_tables.sql` - Migration SQL

### Frontend

- `src/pages/referral/ReferralPage.tsx` - Página principal
- `src/pages/referral/index.ts` - Exports do módulo

---

**Versão:** 1.0.0  
**Data:** Junho 2025  
**Autor:** WolkNow Team
