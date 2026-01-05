# 🛡️ ADMIN MODULE - CHECKLIST COMPLETO

## 📋 Documento de Planejamento do Módulo Administrativo

**Projeto:** HOLDWallet  
**Data:** 4 de Janeiro de 2026  
**Status:** ✅ IMPLEMENTAÇÃO EM ANDAMENTO

---

## 🎯 PROGRESSO ATUAL

### Backend (FastAPI)

- ✅ Estrutura de pastas criada (`backend/app/routers/admin/`)
- ✅ `dashboard.py` - Dashboard com estatísticas
- ✅ `users.py` - Gestão completa de usuários
- ✅ `trades.py` - Gestão de trades OTC
- ✅ `p2p.py` - Gestão P2P (ordens, disputas, escrow)
- ✅ `reports.py` - Relatórios e analytics
- ✅ `settings.py` - Configurações do sistema
- ✅ `audit.py` - Logs de auditoria
- ✅ Schemas completos (`backend/app/schemas/admin/`)
- ✅ Services (`backend/app/services/admin/`)
- ✅ Integração no `main.py`

### Frontend (React/TypeScript)

- ✅ Estrutura de pastas criada (`Frontend/src/pages/admin/`)
- ✅ `AdminDashboardPage.tsx` - Dashboard principal
- ✅ `AdminUsersPage.tsx` - Listagem de usuários (com cache)
- ✅ `AdminUserDetailPage.tsx` - Detalhes do usuário
- ✅ `AdminUserEditPage.tsx` - Edição de usuário
- ✅ `AdminTradesPage.tsx` - Gestão de trades (com cache)
- ✅ `AdminP2PPage.tsx` - Gestão P2P e disputas (com cache)
- ✅ `AdminReportsPage.tsx` - Relatórios
- ✅ `AdminSettingsPage.tsx` - Configurações
- ✅ Serviço API (`Frontend/src/services/admin/`)
- ✅ Hooks com React Query (`Frontend/src/hooks/admin/`)
- ✅ Rotas no `App.tsx`
- ✅ Tipo `is_admin` adicionado ao User
- ✅ Sistema de cache com React Query

### 🔴 PRIORIDADE ALTA - Status Atual

| Tabela            | Backend API | Frontend Page | Cache | Status      |
| ----------------- | ----------- | ------------- | ----- | ----------- |
| `users`           | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `wallets`         | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `wallet_balances` | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `transactions`    | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `instant_trades`  | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `p2p_orders`      | ✅          | ✅            | ✅    | ✅ COMPLETO |
| `p2p_matches`     | ⚠️ Parcial  | ⚠️ Parcial    | ❌    | 🔄 FAZER    |
| `p2p_escrows`     | ✅          | ⚠️ Parcial    | ❌    | 🔄 FAZER    |
| `p2p_disputes`    | ✅          | ✅            | ✅    | ✅ COMPLETO |

### Pendente

- ✅ ~~Página de Wallets/Saldos no Admin~~
- ✅ ~~Página de Transações Blockchain no Admin~~
- ⬜ Testes unitários
- ⬜ Testes de integração
- ⬜ Permissões granulares (super_admin)

---

## 📊 ANÁLISE DO BANCO DE DADOS

### Tabelas Existentes no Sistema

| #   | Tabela              | Descrição                    | Prioridade Admin |
| --- | ------------------- | ---------------------------- | ---------------- |
| 1   | `users`             | Usuários do sistema          | 🔴 ALTA          |
| 2   | `wallets`           | Carteiras dos usuários       | 🔴 ALTA          |
| 3   | `addresses`         | Endereços blockchain         | 🟡 MÉDIA         |
| 4   | `transactions`      | Transações blockchain        | 🔴 ALTA          |
| 5   | `instant_trades`    | Operações OTC (compra/venda) | 🔴 ALTA          |
| 6   | `p2p_orders`        | Ordens P2P                   | 🔴 ALTA          |
| 7   | `p2p_matches`       | Trades P2P matcheados        | 🔴 ALTA          |
| 8   | `p2p_escrows`       | Escrow P2P                   | 🔴 ALTA          |
| 9   | `p2p_disputes`      | Disputas P2P                 | 🔴 ALTA          |
| 10  | `trader_profiles`   | Perfis de negociadores       | 🟡 MÉDIA         |
| 11  | `trader_stats`      | Estatísticas de traders      | 🟢 BAIXA         |
| 12  | `user_reputations`  | Reputação dos usuários       | 🟡 MÉDIA         |
| 13  | `user_reviews`      | Avaliações entre usuários    | 🟡 MÉDIA         |
| 14  | `wallet_balances`   | Saldos por cryptocurrency    | 🔴 ALTA          |
| 15  | `balance_history`   | Histórico de saldos          | 🟡 MÉDIA         |
| 16  | `two_factor_auth`   | Configurações 2FA            | 🟡 MÉDIA         |
| 17  | `p2p_chat_rooms`    | Salas de chat P2P            | 🟢 BAIXA         |
| 18  | `p2p_chat_messages` | Mensagens do chat            | 🟢 BAIXA         |
| 19  | `subscriptions`     | Assinaturas/Planos           | 🟡 MÉDIA         |
| 20  | `invoices`          | Faturas                      | 🟡 MÉDIA         |

---

## 👥 TIPOS DE USUÁRIO

### Estrutura Atual (User Model)

```python
# Campo is_admin no modelo User
is_admin = Column(Boolean, default=False, nullable=False)
```

### Níveis Propostos

| Nível | Nome          | Permissões                    |
| ----- | ------------- | ----------------------------- |
| 0     | `user`        | Usuário comum (cliente)       |
| 1     | `admin`       | Administrador (is_admin=True) |
| 2     | `super_admin` | Super Admin (futuro)          |

---

## 🔐 FUNCIONALIDADES EXISTENTES (Backend)

### ✅ JÁ IMPLEMENTADO

| Funcionalidade          | Arquivo                   | Endpoint                                         |
| ----------------------- | ------------------------- | ------------------------------------------------ |
| Verificar Admin         | `security.py`             | `get_current_admin()`                            |
| Listar Trades Pendentes | `admin_instant_trades.py` | `GET /admin/instant-trades/pending`              |
| Listar Todos Trades     | `admin_instant_trades.py` | `GET /admin/instant-trades/all`                  |
| Confirmar Pagamento OTC | `admin_instant_trades.py` | `POST /admin/instant-trades/confirm-payment`     |
| Retry Depósito Manual   | `admin_instant_trades.py` | `POST /admin/instant-trades/manual-deposit/{id}` |
| Criar Usuário Admin     | `create_admin.py`         | Script Python                                    |

---

## 📝 CHECKLIST DE FUNCIONALIDADES - MÓDULO ADMIN

### 1. 👥 GESTÃO DE USUÁRIOS

#### 1.1 Listar Usuários

- [ ] `GET /admin/users` - Lista todos os usuários
- [ ] Filtros: status (ativo/inativo), tipo (admin/user), data criação
- [ ] Busca por: email, username, ID
- [ ] Paginação: limit, offset
- [ ] Ordenação: por data, nome, último login

#### 1.2 Detalhes do Usuário

- [ ] `GET /admin/users/{user_id}` - Detalhes completos
  - Dados básicos (email, username, created_at)
  - Status da conta (is_active, is_email_verified)
  - Último login
  - Carteiras vinculadas
  - Saldos por cryptocurrency
  - Total de transações
  - Total de trades P2P
  - Reputação
  - 2FA status

#### 1.3 Editar Usuário

- [ ] `PUT /admin/users/{user_id}` - Editar dados
  - Alterar email
  - Alterar username
  - Ativar/Desativar conta
  - Verificar email manualmente
  - Tornar admin
  - Remover admin

#### 1.4 Ações em Usuários

- [ ] `POST /admin/users/{user_id}/block` - Bloquear usuário
- [ ] `POST /admin/users/{user_id}/unblock` - Desbloquear
- [ ] `POST /admin/users/{user_id}/verify-email` - Verificar email
- [ ] `POST /admin/users/{user_id}/reset-password` - Reset de senha
- [ ] `POST /admin/users/{user_id}/disable-2fa` - Desabilitar 2FA
- [ ] `DELETE /admin/users/{user_id}` - Deletar usuário (soft delete)

---

### 2. 💰 GESTÃO FINANCEIRA

#### 2.1 Trades OTC (Instant Trades)

- [x] `GET /admin/instant-trades/pending` - Pendentes ✅
- [x] `GET /admin/instant-trades/all` - Todos ✅
- [x] `POST /admin/instant-trades/confirm-payment` - Confirmar ✅
- [x] `POST /admin/instant-trades/manual-deposit/{id}` - Retry ✅
- [ ] `GET /admin/instant-trades/stats` - Estatísticas
- [ ] `GET /admin/instant-trades/{id}` - Detalhes de um trade
- [ ] `POST /admin/instant-trades/{id}/cancel` - Cancelar trade
- [ ] `POST /admin/instant-trades/{id}/refund` - Estornar

#### 2.2 Transações Blockchain

- [ ] `GET /admin/transactions` - Listar todas transações
- [ ] `GET /admin/transactions/{id}` - Detalhes
- [ ] `GET /admin/transactions/stats` - Estatísticas
  - Volume por rede (Ethereum, Polygon, Base)
  - Volume por token (BTC, ETH, USDT)
  - Sucesso vs Falha
  - Taxas totais cobradas

#### 2.3 Saldos

- [ ] `GET /admin/balances` - Todos os saldos
- [ ] `GET /admin/balances/user/{user_id}` - Saldos por usuário
- [ ] `GET /admin/balances/summary` - Resumo total da plataforma
- [ ] `POST /admin/balances/adjust` - Ajuste manual (com motivo)
- [ ] `GET /admin/balances/history` - Histórico de alterações

---

### 3. 🤝 GESTÃO P2P

#### 3.1 Ordens P2P

- [ ] `GET /admin/p2p/orders` - Listar todas ordens
- [ ] `GET /admin/p2p/orders/{id}` - Detalhes
- [ ] `PUT /admin/p2p/orders/{id}` - Editar ordem
- [ ] `POST /admin/p2p/orders/{id}/pause` - Pausar
- [ ] `POST /admin/p2p/orders/{id}/activate` - Ativar
- [ ] `DELETE /admin/p2p/orders/{id}` - Remover

#### 3.2 Trades P2P (Matches)

- [ ] `GET /admin/p2p/trades` - Listar todos trades
- [ ] `GET /admin/p2p/trades/{id}` - Detalhes
- [ ] `GET /admin/p2p/trades/active` - Trades em andamento
- [ ] `POST /admin/p2p/trades/{id}/force-complete` - Forçar conclusão
- [ ] `POST /admin/p2p/trades/{id}/cancel` - Cancelar trade

#### 3.3 Escrow

- [ ] `GET /admin/p2p/escrows` - Listar escrows
- [ ] `GET /admin/p2p/escrows/locked` - Fundos travados
- [ ] `POST /admin/p2p/escrows/{id}/release` - Liberar para comprador
- [ ] `POST /admin/p2p/escrows/{id}/return` - Devolver para vendedor

#### 3.4 Disputas

- [ ] `GET /admin/p2p/disputes` - Listar disputas
- [ ] `GET /admin/p2p/disputes/open` - Disputas abertas
- [ ] `GET /admin/p2p/disputes/{id}` - Detalhes
- [ ] `POST /admin/p2p/disputes/{id}/resolve` - Resolver disputa
  - Favor do comprador
  - Favor do vendedor
  - Split (dividir valor)
- [ ] `POST /admin/p2p/disputes/{id}/request-evidence` - Solicitar provas

---

### 4. 📊 RELATÓRIOS E ANALYTICS

#### 4.1 Dashboard Admin

- [ ] `GET /admin/dashboard/summary` - Resumo geral
  - Total de usuários (ativos/inativos)
  - Total de wallets
  - Volume total transacionado (24h, 7d, 30d)
  - Trades OTC pendentes
  - Disputas abertas
  - Receita em taxas

#### 4.2 Relatórios Financeiros

- [ ] `GET /admin/reports/deposits` - Relatório de depósitos
- [ ] `GET /admin/reports/withdrawals` - Relatório de saques
- [ ] `GET /admin/reports/trades` - Relatório de trades
- [ ] `GET /admin/reports/revenue` - Receita (taxas, spreads)
- [ ] `GET /admin/reports/export` - Exportar para CSV/Excel

#### 4.3 Relatórios de Usuários

- [ ] `GET /admin/reports/users/new` - Novos usuários
- [ ] `GET /admin/reports/users/active` - Usuários ativos
- [ ] `GET /admin/reports/users/kyc` - Status KYC
- [ ] `GET /admin/reports/users/2fa` - Adoção de 2FA

---

### 5. ⚙️ CONFIGURAÇÕES DO SISTEMA

#### 5.1 Taxas e Spreads

- [ ] `GET /admin/settings/fees` - Taxas atuais
- [ ] `PUT /admin/settings/fees` - Atualizar taxas
  - Spread OTC (%)
  - Taxa de rede (%)
  - Taxa P2P (%)

#### 5.2 Limites

- [ ] `GET /admin/settings/limits` - Limites atuais
- [ ] `PUT /admin/settings/limits` - Atualizar limites
  - Limite diário por usuário
  - Limite por transação
  - Limite P2P

#### 5.3 Métodos de Pagamento

- [ ] `GET /admin/settings/payment-methods` - Métodos ativos
- [ ] `PUT /admin/settings/payment-methods` - Habilitar/desabilitar

---

### 6. 🔒 SEGURANÇA E AUDITORIA

#### 6.1 Logs de Auditoria

- [ ] `GET /admin/audit/logs` - Logs de ações admin
- [ ] `GET /admin/audit/user-activity/{user_id}` - Atividade do usuário
- [ ] `GET /admin/audit/login-history` - Histórico de logins

#### 6.2 Segurança

- [ ] `GET /admin/security/suspicious-activity` - Atividades suspeitas
- [ ] `GET /admin/security/failed-logins` - Tentativas de login falhadas
- [ ] `POST /admin/security/force-logout/{user_id}` - Forçar logout

---

### 7. 💬 SUPORTE AO CLIENTE

#### 7.1 Chat/Suporte

- [ ] `GET /admin/support/chats` - Ver chats ativos
- [ ] `GET /admin/support/chats/{room_id}/messages` - Mensagens
- [ ] `POST /admin/support/chats/{room_id}/intervene` - Intervir no chat

---

## 🎨 FRONTEND - PAINEL ADMIN

### Páginas Necessárias

```
Frontend/src/pages/admin/
├── AdminDashboardPage.tsx       # Dashboard principal
├── AdminUsersPage.tsx           # Lista de usuários
├── AdminUserDetailPage.tsx      # Detalhes do usuário
├── AdminTradesPage.tsx          # Trades OTC
├── AdminP2PPage.tsx             # Gestão P2P
├── AdminDisputesPage.tsx        # Disputas
├── AdminReportsPage.tsx         # Relatórios
├── AdminSettingsPage.tsx        # Configurações
└── AdminAuditPage.tsx           # Auditoria
```

### Rotas

```typescript
// App.tsx - Rotas Admin
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboardPage />} />
  <Route path="users" element={<AdminUsersPage />} />
  <Route path="users/:id" element={<AdminUserDetailPage />} />
  <Route path="trades" element={<AdminTradesPage />} />
  <Route path="p2p" element={<AdminP2PPage />} />
  <Route path="disputes" element={<AdminDisputesPage />} />
  <Route path="reports" element={<AdminReportsPage />} />
  <Route path="settings" element={<AdminSettingsPage />} />
  <Route path="audit" element={<AdminAuditPage />} />
</Route>
```

---

## 📁 ESTRUTURA DE ARQUIVOS PROPOSTA

### Backend

```
backend/app/
├── routers/
│   ├── admin_instant_trades.py  ✅ (existente)
│   ├── admin_users.py           ⏳ (criar)
│   ├── admin_p2p.py             ⏳ (criar)
│   ├── admin_reports.py         ⏳ (criar)
│   ├── admin_settings.py        ⏳ (criar)
│   └── admin_audit.py           ⏳ (criar)
├── schemas/
│   └── admin.py                 ⏳ (criar)
└── services/
    └── admin_service.py         ⏳ (criar)
```

### Frontend

```
Frontend/src/
├── pages/admin/                  ⏳ (criar pasta)
│   ├── AdminDashboardPage.tsx
│   ├── AdminUsersPage.tsx
│   └── ...
├── components/admin/             ⏳ (criar pasta)
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── UserCard.tsx
│   └── ...
├── hooks/
│   └── useAdmin.ts              ⏳ (criar)
└── services/
    └── adminService.ts          ⏳ (criar)
```

---

## 📈 PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Fase 1 - Essencial (Semana 1-2)

1. ✅ Listar/gerenciar trades OTC (já existe)
2. ⏳ Listar usuários
3. ⏳ Ver detalhes do usuário
4. ⏳ Bloquear/desbloquear usuário
5. ⏳ Dashboard básico

### Fase 2 - Importante (Semana 3-4)

1. ⏳ Gestão de disputas P2P
2. ⏳ Gestão de escrow
3. ⏳ Relatórios financeiros
4. ⏳ Ajuste de saldos

### Fase 3 - Complementar (Semana 5-6)

1. ⏳ Configurações do sistema
2. ⏳ Logs de auditoria
3. ⏳ Relatórios avançados
4. ⏳ Export de dados

---

## ✅ RESUMO

### O que já existe:

- ✅ Campo `is_admin` no modelo User
- ✅ Função `get_current_admin()` para verificar admin
- ✅ Router `admin_instant_trades.py` com 4 endpoints
- ✅ Script `create_admin.py` para criar admin

### O que falta:

- ❌ Frontend do painel admin (0%)
- ❌ Gestão de usuários via API (0%)
- ❌ Gestão P2P admin (0%)
- ❌ Relatórios e analytics (0%)
- ❌ Configurações do sistema (0%)
- ❌ Logs de auditoria (0%)

### Próximos Passos:

1. Criar routers admin no backend
2. Criar páginas admin no frontend
3. Implementar dashboard admin
4. Testar fluxos de gestão

---

**Documento criado para planejamento do módulo Admin do HOLDWallet**
