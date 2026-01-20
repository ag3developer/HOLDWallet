# 🔒 Sistema de Bloqueio Granular de Wallets - HOLD Wallet

## 📋 Resumo da Implementação

Este documento descreve o sistema de bloqueio granular implementado para proteção contra fraudes.

---

## 🎯 Conceito

Em vez de bloquear completamente uma wallet (que não impede o usuário de usar as chaves externamente), implementamos um **sistema de restrições por tipo de operação** que bloqueia funcionalidades específicas no sistema.

### Tipos de Restrição Disponíveis

| Flag                     | Efeito                            | Endpoint Protegido           |
| ------------------------ | --------------------------------- | ---------------------------- |
| `is_blocked`             | Bloqueio TOTAL da wallet          | Todos os endpoints           |
| `restrict_instant_trade` | Não pode criar trades OTC         | `POST /instant-trade/create` |
| `restrict_deposits`      | Sistema não credita depósitos     | Webhooks de depósito         |
| `restrict_withdrawals`   | Não pode sacar/enviar crypto      | `POST /wallets/send`         |
| `restrict_p2p`           | Não pode usar P2P marketplace     | `POST /p2p/orders`           |
| `restrict_transfers`     | Não pode transferir internamente  | Transfers internas           |
| `restrict_swap`          | Não pode fazer swap entre cryptos | `POST /swap`                 |

---

## 🗃️ Arquivos Modificados/Criados

### Model

- `backend/app/models/wallet.py`
  - Adicionados campos: `is_blocked`, `blocked_at`, `blocked_reason`, `blocked_by`
  - Adicionados campos: `restrict_instant_trade`, `restrict_deposits`, `restrict_withdrawals`, `restrict_p2p`, `restrict_transfers`, `restrict_swap`
  - Adicionado método `is_operation_allowed(operation_type)`
  - Adicionado método `get_restrictions()`

### Serviço

- `backend/app/services/wallet_restriction_service.py` (NOVO)
  - `WalletRestrictionService.check_operation_allowed()` - Verifica se operação é permitida
  - `WalletRestrictionService.get_user_restrictions()` - Retorna todas restrições
  - `WalletRestrictionService.can_credit_deposit()` - Verifica se pode creditar depósito

### Endpoints Admin

- `backend/app/routers/admin/wallets.py`
  - `POST /admin/wallets/{id}/block` - Atualizado com bloqueio granular
  - `POST /admin/wallets/{id}/unblock` - Atualizado para limpar todas restrições
  - `GET /admin/wallets/{id}/restrictions` (NOVO) - Visualizar restrições ativas

### Endpoints Protegidos

- `backend/app/routers/instant_trade.py`
  - `POST /instant-trade/create` - Verificação de `restrict_instant_trade`
- `backend/app/routers/wallets.py`
  - `POST /wallets/send` - Verificação de `restrict_withdrawals`
- `backend/app/routers/p2p.py`
  - `POST /p2p/orders` - Verificação de `restrict_p2p`

### Migration

- `backend/alembic/versions/add_wallet_restrictions.py`
- `backend/apply_wallet_restrictions.sql` (SQL direto para produção)

---

## 🚀 Como Aplicar em Produção

### 1. Aplicar Migration no Banco de Dados

```bash
# Via psql
psql -h <host> -U <user> -d holdwallet_prod -f backend/apply_wallet_restrictions.sql

# Ou via Alembic
cd backend
alembic upgrade head
```

### 2. Deploy do Backend

```bash
git add .
git commit -m "feat: Sistema de bloqueio granular de wallets"
git push origin main
# DigitalOcean fará deploy automático
```

---

## 📝 Exemplos de Uso (Admin API)

### 1. Bloqueio Total

```bash
curl -X POST "https://api.wolknow.com/admin/wallets/{wallet_id}/block" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Suspeita de fraude",
    "freeze_balance": true,
    "block_type": "full"
  }'
```

### 2. Bloquear Apenas Trade Instantâneo

```bash
curl -X POST "https://api.wolknow.com/admin/wallets/{wallet_id}/block" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Investigação em andamento",
    "freeze_balance": false,
    "block_type": "partial",
    "restrict_instant_trade": true
  }'
```

### 3. Bloquear Saques e P2P

```bash
curl -X POST "https://api.wolknow.com/admin/wallets/{wallet_id}/block" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Atividade suspeita detectada",
    "freeze_balance": true,
    "block_type": "partial",
    "restrict_withdrawals": true,
    "restrict_p2p": true
  }'
```

### 4. Ver Restrições Ativas

```bash
curl -X GET "https://api.wolknow.com/admin/wallets/{wallet_id}/restrictions" \
  -H "Authorization: Bearer {admin_token}"
```

Resposta:

```json
{
  "success": true,
  "wallet_id": "xxx",
  "user_email": "user@example.com",
  "blocking": {
    "is_blocked": false,
    "blocked_reason": "Investigação em andamento"
  },
  "restrictions": {
    "instant_trade": true,
    "deposits": false,
    "withdrawals": true,
    "p2p": false,
    "transfers": false,
    "swap": false
  },
  "operations_allowed": {
    "instant_trade": false,
    "deposits": true,
    "withdrawals": false,
    "p2p": true,
    "transfers": true,
    "swap": true
  }
}
```

### 5. Desbloquear Completamente

```bash
curl -X POST "https://api.wolknow.com/admin/wallets/{wallet_id}/unblock" \
  -H "Authorization: Bearer {admin_token}"
```

---

## 🔐 Comportamento do Sistema

### Quando usuário tenta operação bloqueada:

**Resposta HTTP 403:**

```json
{
  "detail": "Sua carteira está temporariamente impedida de realizar trades instantâneos. Entre em contato com o suporte."
}
```

### Mensagens por tipo de bloqueio:

- **instant_trade**: "Sua carteira está temporariamente impedida de realizar trades instantâneos..."
- **deposit**: "Depósitos estão temporariamente suspensos para sua conta..."
- **withdrawal**: "Saques estão temporariamente suspensos para sua conta..."
- **p2p**: "Acesso ao P2P está temporariamente suspenso para sua conta..."
- **transfer**: "Transferências estão temporariamente suspensas para sua conta..."
- **swap**: "Swaps estão temporariamente suspensos para sua conta..."

---

## ✅ Cenários de Uso

| Cenário                       | Ação Recomendada                          |
| ----------------------------- | ----------------------------------------- |
| Suspeita de conta hackeada    | Bloqueio TOTAL + Congelar saldo           |
| Investigação de lavagem       | `restrict_withdrawals` + `restrict_p2p`   |
| Usuário criando muitos trades | `restrict_instant_trade`                  |
| Depósitos suspeitos           | `restrict_deposits`                       |
| Atividade de bot              | `restrict_p2p` + `restrict_instant_trade` |

---

## 📊 Próximos Passos (Opcional)

1. **Frontend Admin**: Adicionar UI para gerenciar restrições
2. **Logs de Auditoria**: Registrar todas mudanças de restrição
3. **Alertas**: Notificar usuário por email quando bloqueado/desbloqueado
4. **Relatórios**: Dashboard com estatísticas de bloqueios

---

**Implementado em:** 20/01/2026  
**Autor:** HOLD Wallet Team
