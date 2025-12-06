# 🚀 Guia de Execução - Criação das Tabelas P2P

## ✅ Pré-requisitos

Antes de executar a migração, certifique-se de:

1. **Banco de dados ativo:**
   ```bash
   # Verificar se PostgreSQL está rodando
   pg_isready
   ```

2. **Ambiente virtual ativado:**
   ```bash
   source venv/bin/activate  # Linux/Mac
   # ou
   venv\Scripts\activate  # Windows
   ```

3. **Dependências instaladas:**
   ```bash
   pip install alembic sqlalchemy psycopg2-binary
   ```

4. **Configuração do banco:**
   - Verificar `alembic.ini` com connection string correta
   - Verificar `.env` com variáveis de ambiente

---

## 🎯 Opção 1: Script Automático (Recomendado)

### Executar o script helper:

```bash
cd backend
chmod +x create_p2p_tables.sh
./create_p2p_tables.sh
```

**O script irá:**
1. ✅ Verificar se está no diretório correto
2. ✅ Listar todas as tabelas que serão criadas
3. ✅ Pedir confirmação
4. ✅ Executar a migração
5. ✅ Mostrar resultado

---

## 🎯 Opção 2: Comandos Manuais

### 1. Verificar revisão atual:
```bash
cd backend
alembic current
```

### 2. Ver histórico de migrações:
```bash
alembic history
```

### 3. Executar a migração:
```bash
alembic upgrade head
```

### 4. Verificar tabelas criadas:
```bash
# Conectar ao PostgreSQL
psql -U postgres -d holdwallet

# Listar tabelas
\dt

# Ver estrutura de uma tabela
\d payment_methods
\d p2p_orders
\d p2p_trades
```

---

## 🔍 Verificação Pós-Criação

### 1. Verificar todas as tabelas:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'p2p_%' 
   OR table_name = 'payment_methods'
   OR table_name = 'user_p2p_stats'
ORDER BY table_name;
```

**Resultado esperado:**
```
 table_name
--------------------------------
 p2p_disputes
 p2p_escrow_transactions
 p2p_feedbacks
 p2p_messages
 p2p_orders
 p2p_trades
 payment_methods
 user_p2p_stats
(8 rows)
```

### 2. Verificar constraints:
```sql
-- Verificar CHECK constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND (tc.table_name LIKE 'p2p_%' OR tc.table_name IN ('payment_methods', 'user_p2p_stats'))
ORDER BY tc.table_name;
```

### 3. Verificar foreign keys:
```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (tc.table_name LIKE 'p2p_%' OR tc.table_name IN ('payment_methods', 'user_p2p_stats'))
ORDER BY tc.table_name;
```

### 4. Verificar índices:
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'p2p_%' OR tablename IN ('payment_methods', 'user_p2p_stats'))
ORDER BY tablename, indexname;
```

---

## 🧪 Teste Rápido

### Inserir dados de teste:

```sql
-- 1. Inserir método de pagamento (assumindo user_id = 1 existe)
INSERT INTO payment_methods (user_id, type, details) VALUES 
(1, 'PIX', '{"keyType": "CPF", "keyValue": "123.456.789-00", "holderName": "João Silva"}');

-- 2. Inserir ordem P2P
INSERT INTO p2p_orders (
    user_id, order_type, cryptocurrency, fiat_currency, 
    price, total_amount, available_amount, min_order_limit, max_order_limit
) VALUES (
    1, 'sell', 'BTC', 'BRL', 
    350000.00, 1.00000000, 1.00000000, 100.00, 50000.00
);

-- 3. Verificar
SELECT * FROM payment_methods;
SELECT * FROM p2p_orders;
```

---

## ❌ Rollback (Desfazer)

### Se precisar reverter a migração:

```bash
# Ver revisão anterior
alembic history

# Voltar uma revisão
alembic downgrade -1

# Voltar para revisão específica
alembic downgrade <revision_id>
```

**⚠️ ATENÇÃO:** O downgrade irá **DELETAR TODAS AS TABELAS** e seus dados!

---

## 🐛 Troubleshooting

### Erro: "relation already exists"
**Causa:** Tabela já existe no banco

**Solução:**
```sql
-- Verificar se tabelas existem
SELECT tablename FROM pg_tables WHERE tablename LIKE 'p2p_%';

-- Se existirem, dropar manualmente (CUIDADO!)
DROP TABLE IF EXISTS p2p_escrow_transactions CASCADE;
DROP TABLE IF EXISTS user_p2p_stats CASCADE;
DROP TABLE IF EXISTS p2p_feedbacks CASCADE;
DROP TABLE IF EXISTS p2p_disputes CASCADE;
DROP TABLE IF EXISTS p2p_messages CASCADE;
DROP TABLE IF EXISTS p2p_trades CASCADE;
DROP TABLE IF EXISTS p2p_orders CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Depois executar migração novamente
alembic upgrade head
```

### Erro: "connection refused"
**Causa:** PostgreSQL não está rodando ou configuração incorreta

**Solução:**
```bash
# Iniciar PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
# ou usar pg_ctl

# Verificar connection string no alembic.ini
cat alembic.ini | grep sqlalchemy.url
```

### Erro: "foreign key violation"
**Causa:** Tabela `users` não existe

**Solução:**
```sql
-- Verificar se tabela users existe
\dt users

-- Se não existir, criar tabela users primeiro
-- ou ajustar down_revision na migração
```

### Erro: "column already exists"
**Causa:** Executou migração múltiplas vezes

**Solução:**
```bash
# Ver histórico
alembic current

# Marcar como executada sem executar
alembic stamp head
```

---

## 📊 Estatísticas Esperadas

Após execução bem-sucedida:

| Métrica | Valor |
|---------|-------|
| **Tabelas Criadas** | 8 |
| **Colunas Totais** | ~115 |
| **Índices Criados** | 30 |
| **Foreign Keys** | 20+ |
| **Check Constraints** | 8 |
| **Unique Constraints** | 2 |

---

## ✅ Checklist de Validação

Após executar a migração, verificar:

- [ ] Todas as 8 tabelas foram criadas
- [ ] Todos os índices foram criados
- [ ] Todas as foreign keys estão funcionando
- [ ] Check constraints estão ativos
- [ ] Unique constraints estão ativos
- [ ] Dados de teste inserem corretamente
- [ ] Não há erros no log do PostgreSQL

---

## 🚀 Próximos Passos

Após criação bem-sucedida das tabelas:

### 1. Criar Models SQLAlchemy (backend/app/models/)
```python
# payment_method.py
# p2p_order.py
# p2p_trade.py
# p2p_message.py
# p2p_dispute.py
# p2p_feedback.py
# user_p2p_stats.py
# p2p_escrow_transaction.py
```

### 2. Criar Schemas Pydantic (backend/app/schemas/)
```python
# payment_method.py
# p2p_order.py
# p2p_trade.py
# (etc...)
```

### 3. Criar Endpoints (backend/app/routers/)
```python
# payment_methods.py
# p2p_orders.py
# p2p_trades.py
# (etc...)
```

### 4. Testar API
```bash
# Testar cada endpoint
pytest tests/test_payment_methods.py
pytest tests/test_p2p_orders.py
pytest tests/test_p2p_trades.py
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `tail -f logs/app.log`
2. Verificar PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
3. Revisar documentação: `P2P_DATABASE_SCHEMA.md`
4. Consultar checklist completo

---

**Data de Criação:** 25/11/2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para execução
