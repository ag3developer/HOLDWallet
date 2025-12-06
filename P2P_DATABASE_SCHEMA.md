# 🗄️ Schema Completo do Banco de Dados - Módulo P2P

## 📋 Checklist de Tabelas Necessárias

### ✅ 1. **payment_methods** (Métodos de Pagamento)
```sql
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,  -- 'PIX', 'Transferência Bancária', 'PayPal', etc
    details TEXT NOT NULL,  -- JSON com dados específicos
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `user_id` - FK para users
- ✅ `type` - Tipo do método
- ✅ `details` - JSON com campos específicos
- ✅ `is_active` - Se está ativo
- ✅ `created_at` - Data criação
- ✅ `updated_at` - Data atualização

---

### ✅ 2. **p2p_orders** (Ordens P2P - Anúncios)
```sql
CREATE TABLE p2p_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
    
    -- Cripto e Fiat
    cryptocurrency VARCHAR(20) NOT NULL,  -- 'BTC', 'ETH', 'USDT'
    fiat_currency VARCHAR(10) NOT NULL DEFAULT 'BRL',  -- 'BRL', 'USD', 'EUR'
    
    -- Preço e Quantidade
    price DECIMAL(20, 8) NOT NULL,  -- Preço por unidade
    total_amount DECIMAL(20, 8) NOT NULL,  -- Quantidade total
    available_amount DECIMAL(20, 8) NOT NULL,  -- Quantidade disponível
    min_order_limit DECIMAL(20, 8) NOT NULL,  -- Limite mínimo
    max_order_limit DECIMAL(20, 8) NOT NULL,  -- Limite máximo
    
    -- Tempo e Condições
    time_limit INTEGER DEFAULT 30,  -- Minutos para pagamento
    payment_methods TEXT,  -- JSON array de IDs dos métodos aceitos
    
    -- Termos
    terms TEXT,  -- Termos e condições da ordem
    auto_reply TEXT,  -- Resposta automática
    
    -- Status e Metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    completed_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 8) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_orders_user_id ON p2p_orders(user_id);
CREATE INDEX idx_p2p_orders_type ON p2p_orders(order_type);
CREATE INDEX idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX idx_p2p_orders_crypto ON p2p_orders(cryptocurrency);
CREATE INDEX idx_p2p_orders_fiat ON p2p_orders(fiat_currency);
CREATE INDEX idx_p2p_orders_created ON p2p_orders(created_at DESC);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `user_id` - Dono da ordem
- ✅ `order_type` - 'buy' ou 'sell'
- ✅ `cryptocurrency` - Cripto negociada
- ✅ `fiat_currency` - Moeda fiat
- ✅ `price` - Preço unitário
- ✅ `total_amount` - Quantidade total
- ✅ `available_amount` - Quantidade disponível
- ✅ `min_order_limit` - Mínimo por trade
- ✅ `max_order_limit` - Máximo por trade
- ✅ `time_limit` - Tempo limite (minutos)
- ✅ `payment_methods` - Métodos aceitos (JSON)
- ✅ `terms` - Termos da ordem
- ✅ `auto_reply` - Resposta automática
- ✅ `status` - Status da ordem
- ✅ `completed_trades` - Trades concluídos
- ✅ `total_volume` - Volume total
- ✅ `created_at` / `updated_at`

---

### ✅ 3. **p2p_trades** (Trades/Negociações Ativas)
```sql
CREATE TABLE p2p_trades (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
    
    -- Participantes
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Valores
    cryptocurrency VARCHAR(20) NOT NULL,
    fiat_currency VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,  -- Quantidade de cripto
    price DECIMAL(20, 8) NOT NULL,  -- Preço unitário
    total_fiat DECIMAL(20, 8) NOT NULL,  -- Total em fiat
    
    -- Pagamento
    payment_method_id INTEGER REFERENCES payment_methods(id),
    payment_proof TEXT,  -- URL/path do comprovante
    
    -- Status e Timeline
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Aguardando pagamento
        'payment_sent',      -- Comprador marcou pagamento enviado
        'payment_confirmed', -- Vendedor confirmou recebimento
        'releasing',         -- Liberando escrow
        'completed',         -- Concluído
        'cancelled',         -- Cancelado
        'disputed'           -- Em disputa
    )),
    
    -- Timestamps importantes
    expires_at TIMESTAMP NOT NULL,  -- Quando expira
    payment_sent_at TIMESTAMP,
    payment_confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Escrow
    escrow_transaction_id INTEGER,  -- FK para transactions se necessário
    escrow_released BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    cancellation_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_trades_order_id ON p2p_trades(order_id);
CREATE INDEX idx_p2p_trades_buyer_id ON p2p_trades(buyer_id);
CREATE INDEX idx_p2p_trades_seller_id ON p2p_trades(seller_id);
CREATE INDEX idx_p2p_trades_status ON p2p_trades(status);
CREATE INDEX idx_p2p_trades_created ON p2p_trades(created_at DESC);
CREATE INDEX idx_p2p_trades_expires ON p2p_trades(expires_at);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `order_id` - FK para ordem
- ✅ `buyer_id` - ID do comprador
- ✅ `seller_id` - ID do vendedor
- ✅ `cryptocurrency` - Cripto
- ✅ `fiat_currency` - Fiat
- ✅ `amount` - Quantidade
- ✅ `price` - Preço
- ✅ `total_fiat` - Total
- ✅ `payment_method_id` - Método usado
- ✅ `payment_proof` - Comprovante
- ✅ `status` - Status do trade
- ✅ `expires_at` - Expiração
- ✅ `payment_sent_at` - Quando enviou
- ✅ `payment_confirmed_at` - Quando confirmou
- ✅ `completed_at` - Quando completou
- ✅ `cancelled_at` - Quando cancelou
- ✅ `escrow_transaction_id` - ID escrow
- ✅ `escrow_released` - Se liberou
- ✅ `cancellation_reason` - Motivo cancelamento
- ✅ `notes` - Notas
- ✅ `created_at` / `updated_at`

---

### ✅ 4. **p2p_messages** (Chat de Trade)
```sql
CREATE TABLE p2p_messages (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES p2p_trades(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    
    -- Metadata
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Anexos
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_messages_trade_id ON p2p_messages(trade_id);
CREATE INDEX idx_p2p_messages_sender_id ON p2p_messages(sender_id);
CREATE INDEX idx_p2p_messages_created ON p2p_messages(created_at DESC);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `trade_id` - FK para trade
- ✅ `sender_id` - Quem enviou
- ✅ `message_type` - Tipo mensagem
- ✅ `content` - Conteúdo
- ✅ `is_read` - Se foi lida
- ✅ `read_at` - Quando leu
- ✅ `attachment_url` - URL anexo
- ✅ `attachment_type` - Tipo anexo
- ✅ `created_at`

---

### ✅ 5. **p2p_disputes** (Disputas)
```sql
CREATE TABLE p2p_disputes (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES p2p_trades(id) ON DELETE CASCADE,
    
    -- Quem abriu a disputa
    opened_by_user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Detalhes
    reason VARCHAR(50) NOT NULL,  -- 'payment_not_received', 'payment_not_sent', 'wrong_amount', 'other'
    description TEXT NOT NULL,
    evidence TEXT,  -- JSON com URLs de evidências
    
    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    
    -- Resolução
    resolution TEXT,
    resolved_by_admin_id INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    
    -- Decisão
    winner_user_id INTEGER REFERENCES users(id),  -- Quem ganhou a disputa
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_disputes_trade_id ON p2p_disputes(trade_id);
CREATE INDEX idx_p2p_disputes_opened_by ON p2p_disputes(opened_by_user_id);
CREATE INDEX idx_p2p_disputes_status ON p2p_disputes(status);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `trade_id` - Trade em disputa
- ✅ `opened_by_user_id` - Quem abriu
- ✅ `reason` - Motivo
- ✅ `description` - Descrição
- ✅ `evidence` - Evidências (JSON)
- ✅ `status` - Status
- ✅ `resolution` - Resolução
- ✅ `resolved_by_admin_id` - Admin
- ✅ `resolved_at` - Quando resolveu
- ✅ `winner_user_id` - Vencedor
- ✅ `created_at` / `updated_at`

---

### ✅ 6. **p2p_feedbacks** (Avaliações)
```sql
CREATE TABLE p2p_feedbacks (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES p2p_trades(id) ON DELETE CASCADE,
    
    -- Quem avaliou e quem recebeu
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Avaliação
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Tipo
    feedback_type VARCHAR(20) CHECK (feedback_type IN ('positive', 'neutral', 'negative')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Garantir uma avaliação por usuário por trade
    CONSTRAINT unique_feedback_per_trade UNIQUE (trade_id, from_user_id)
);

CREATE INDEX idx_p2p_feedbacks_trade_id ON p2p_feedbacks(trade_id);
CREATE INDEX idx_p2p_feedbacks_from_user ON p2p_feedbacks(from_user_id);
CREATE INDEX idx_p2p_feedbacks_to_user ON p2p_feedbacks(to_user_id);
CREATE INDEX idx_p2p_feedbacks_rating ON p2p_feedbacks(rating);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `trade_id` - Trade avaliado
- ✅ `from_user_id` - Quem avaliou
- ✅ `to_user_id` - Quem recebeu
- ✅ `rating` - Nota (1-5)
- ✅ `comment` - Comentário
- ✅ `feedback_type` - Tipo
- ✅ `created_at`
- ✅ UNIQUE constraint

---

### ✅ 7. **user_p2p_stats** (Estatísticas do Usuário)
```sql
CREATE TABLE user_p2p_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Trades
    total_trades INTEGER DEFAULT 0,
    completed_trades INTEGER DEFAULT 0,
    cancelled_trades INTEGER DEFAULT 0,
    
    -- Volume
    total_volume_btc DECIMAL(20, 8) DEFAULT 0,
    total_volume_usd DECIMAL(20, 8) DEFAULT 0,
    
    -- Reputação
    total_rating DECIMAL(3, 2) DEFAULT 0,  -- 0.00 a 5.00
    total_feedbacks INTEGER DEFAULT 0,
    positive_feedbacks INTEGER DEFAULT 0,
    neutral_feedbacks INTEGER DEFAULT 0,
    negative_feedbacks INTEGER DEFAULT 0,
    
    -- Taxas
    completion_rate DECIMAL(5, 2) DEFAULT 0,  -- Porcentagem
    average_payment_time INTEGER DEFAULT 0,  -- Minutos
    average_release_time INTEGER DEFAULT 0,  -- Minutos
    
    -- Badges
    badges TEXT,  -- JSON array de badges conquistados
    
    -- Tempo
    first_trade_at TIMESTAMP,
    last_trade_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_p2p_stats_user_id ON user_p2p_stats(user_id);
CREATE INDEX idx_user_p2p_stats_rating ON user_p2p_stats(total_rating DESC);
CREATE INDEX idx_user_p2p_stats_trades ON user_p2p_stats(completed_trades DESC);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `user_id` - FK único
- ✅ `total_trades` - Total trades
- ✅ `completed_trades` - Completos
- ✅ `cancelled_trades` - Cancelados
- ✅ `total_volume_btc` - Volume BTC
- ✅ `total_volume_usd` - Volume USD
- ✅ `total_rating` - Rating médio
- ✅ `total_feedbacks` - Total feedbacks
- ✅ `positive_feedbacks` - Positivos
- ✅ `neutral_feedbacks` - Neutros
- ✅ `negative_feedbacks` - Negativos
- ✅ `completion_rate` - Taxa conclusão
- ✅ `average_payment_time` - Tempo médio pagamento
- ✅ `average_release_time` - Tempo médio liberação
- ✅ `badges` - Badges (JSON)
- ✅ `first_trade_at` - Primeiro trade
- ✅ `last_trade_at` - Último trade
- ✅ `created_at` / `updated_at`

---

### ✅ 8. **p2p_escrow_transactions** (Transações de Escrow)
```sql
CREATE TABLE p2p_escrow_transactions (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES p2p_trades(id) ON DELETE CASCADE,
    
    -- Valores
    cryptocurrency VARCHAR(20) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    
    -- Tipo de transação
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('lock', 'release', 'refund')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    
    -- Referência blockchain (se aplicável)
    tx_hash VARCHAR(200),
    block_number INTEGER,
    
    -- Metadata
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

CREATE INDEX idx_p2p_escrow_trade_id ON p2p_escrow_transactions(trade_id);
CREATE INDEX idx_p2p_escrow_type ON p2p_escrow_transactions(transaction_type);
CREATE INDEX idx_p2p_escrow_status ON p2p_escrow_transactions(status);
```

**Colunas:**
- ✅ `id` - Primary key
- ✅ `trade_id` - Trade relacionado
- ✅ `cryptocurrency` - Cripto
- ✅ `amount` - Quantidade
- ✅ `transaction_type` - Tipo
- ✅ `status` - Status
- ✅ `tx_hash` - Hash blockchain
- ✅ `block_number` - Bloco
- ✅ `from_user_id` - De quem
- ✅ `to_user_id` - Para quem
- ✅ `notes` - Notas
- ✅ `created_at` / `confirmed_at`

---

## 📊 Resumo das Tabelas

| # | Tabela | Propósito | Colunas | Índices |
|---|--------|-----------|---------|---------|
| 1 | `payment_methods` | Métodos de pagamento dos usuários | 7 | 2 |
| 2 | `p2p_orders` | Ordens/Anúncios P2P | 20 | 6 |
| 3 | `p2p_trades` | Trades/Negociações ativas | 25 | 6 |
| 4 | `p2p_messages` | Chat dos trades | 10 | 3 |
| 5 | `p2p_disputes` | Sistema de disputas | 12 | 3 |
| 6 | `p2p_feedbacks` | Avaliações/Reputação | 8 | 4 |
| 7 | `user_p2p_stats` | Estatísticas dos usuários | 20 | 3 |
| 8 | `p2p_escrow_transactions` | Transações de escrow | 13 | 3 |

**Total: 8 tabelas, 115 colunas, 30 índices**

---

## 🔗 Relacionamentos

```
users (existente)
  ↓
  ├── payment_methods (1:N)
  ├── p2p_orders (1:N)
  ├── p2p_trades (1:N como buyer, 1:N como seller)
  ├── p2p_messages (1:N)
  ├── p2p_disputes (1:N)
  ├── p2p_feedbacks (1:N como from, 1:N como to)
  └── user_p2p_stats (1:1)

p2p_orders
  ↓
  └── p2p_trades (1:N)

p2p_trades
  ↓
  ├── p2p_messages (1:N)
  ├── p2p_disputes (1:1)
  ├── p2p_feedbacks (1:2 - um de cada participante)
  └── p2p_escrow_transactions (1:N)
```

---

## ✅ Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Criar migração Alembic
- [ ] Executar migração
- [ ] Verificar tabelas criadas
- [ ] Testar constraints e índices

### Fase 2: Models SQLAlchemy
- [ ] PaymentMethod model
- [ ] P2POrder model
- [ ] P2PTrade model
- [ ] P2PMessage model
- [ ] P2PDispute model
- [ ] P2PFeedback model
- [ ] UserP2PStats model
- [ ] P2PEscrowTransaction model

### Fase 3: Schemas Pydantic
- [ ] PaymentMethod schemas
- [ ] P2POrder schemas
- [ ] P2PTrade schemas
- [ ] P2PMessage schemas
- [ ] P2PDispute schemas
- [ ] P2PFeedback schemas
- [ ] UserP2PStats schemas
- [ ] P2PEscrowTransaction schemas

### Fase 4: Endpoints API
- [ ] Payment Methods CRUD
- [ ] P2P Orders CRUD
- [ ] P2P Trades endpoints
- [ ] Messages endpoints
- [ ] Disputes endpoints
- [ ] Feedbacks endpoints
- [ ] Stats endpoints

### Fase 5: Business Logic
- [ ] Escrow system
- [ ] Trade lifecycle
- [ ] Dispute resolution
- [ ] Stats calculation
- [ ] Notifications

---

## 🚀 Próximo Passo

Criar o script de migração Alembic que gera todas essas tabelas de uma vez!
