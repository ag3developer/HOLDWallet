# 🔧 CORREÇÃO URGENTE: wallet_balance → wallet_balances

## 🚨 PROBLEMA

Criamos a tabela com nome **ERRADO** no PostgreSQL Produção:

- ❌ Criado: `wallet_balance` (SINGULAR)
- ✅ Correto: `wallet_balances` (PLURAL)

O código backend usa `wallet_balances` em **TODO LUGAR**!

---

## 📝 SQL PARA EXECUTAR NO DIGITAL OCEAN

### Passo 1: Renomear tabela antiga (backup)

```sql
ALTER TABLE wallet_balance RENAME TO wallet_balance_OLD_BACKUP;
```

### Passo 2: Criar tabela correta

```sql
CREATE TABLE wallet_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cryptocurrency VARCHAR(50) NOT NULL,
    available_balance DECIMAL(38, 18) DEFAULT 0,
    locked_balance DECIMAL(38, 18) DEFAULT 0,
    total_balance DECIMAL(38, 18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_reason TEXT,
    UNIQUE(user_id, cryptocurrency)
);
```

### Passo 3: Criar índices

```sql
CREATE INDEX idx_wallet_balances_user_id ON wallet_balances(user_id);
CREATE INDEX idx_wallet_balances_cryptocurrency ON wallet_balances(cryptocurrency);
```

### Passo 4: Verificar

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%wallet%' ORDER BY tablename;
```

**Resultado esperado:**

```
wallet_balance_OLD_BACKUP
wallet_balances           ← NOVA TABELA CORRETA
wallets
```

---

## 🎯 COMO EXECUTAR

1. Acesse: https://cloud.digitalocean.com/databases
2. Clique em: **holdwallet-db**
3. Vá em: **Console** ou **Connection Details** → **Web Console**
4. Cole o SQL acima
5. Execute linha por linha

---

## ✅ DEPOIS DA CORREÇÃO

O backend vai funcionar porque agora terá a tabela **wallet_balances** (PLURAL) que o código espera!

---

## 🗑️ Deletar backup (APÓS TESTAR)

Só depois de confirmar que tudo funciona:

```sql
DROP TABLE IF EXISTS wallet_balance_OLD_BACKUP;
```
