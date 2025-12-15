# 🗄️ SQL para Criar Tabelas Faltantes

## ⚠️ IMPORTANTE: Execute no Console do Digital Ocean Database

1. Acesse: https://cloud.digitalocean.com/databases
2. Clique no seu database: `holdwallet-db`
3. Vá na aba **"Console"** ou **"Connection Details"** → **"Web Console"**
4. Cole e execute o SQL abaixo:

---

## 📝 SQL para Executar:

```sql
-- Tabela two_factor_auth
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    backup_codes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enabled_at TIMESTAMP,
    last_used_at TIMESTAMP,
    UNIQUE(user_id)
);

-- Tabela wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    network VARCHAR(50) NOT NULL,
    derivation_path VARCHAR(100),
    encrypted_seed TEXT,
    seed_hash VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela wallet_balance
CREATE TABLE IF NOT EXISTS wallet_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(100),
    balance DECIMAL(38, 18) DEFAULT 0,
    token_address VARCHAR(100),
    decimals INTEGER DEFAULT 18,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_id, token_symbol, token_address)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_wallet_id ON wallet_balance(wallet_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);

-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

---

## ✅ O que esse SQL faz:

1. **two_factor_auth** - Para autenticação 2FA
2. **wallets** - Para carteiras dos usuários
3. **wallet_balance** - Para saldos das carteiras
4. **Índices** - Para performance

---

## 🎯 Depois de executar:

1. Todas as tabelas serão criadas
2. O frontend vai parar de dar erro 500
3. Você poderá usar todas as funcionalidades

---

## 📊 Resultado Esperado:

```
alembic_version
two_factor_auth
users
wallet_balance
wallets
```

Total: 5 tabelas ✅

---

**Cole esse SQL no Console do Digital Ocean e me avise quando completar!** 🚀
