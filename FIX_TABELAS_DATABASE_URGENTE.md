# 🚨 SOLUÇÃO URGENTE: Tabelas do Banco de Dados Não Existem

## 🔴 PROBLEMA IDENTIFICADO

```
psycopg2.errors.UndefinedTable: relation "users" does not exist
```

**Causa:** As tabelas do banco de dados PostgreSQL NÃO foram criadas. O backend está tentando acessar tabelas que não existem.

**Evidência nos logs:**

```
⚠️  Could not create users: Not an executable object: 'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY)'
```

---

## ✅ SOLUÇÃO: Executar Migrations do Alembic

### **Opção 1: Via Console do Digital Ocean Apps (RECOMENDADO)**

1. **Acesse o Digital Ocean Apps Console:**

   - Vá para https://cloud.digitalocean.com/apps
   - Clique no seu app "wolknow-backend"
   - Clique em "Console" no menu lateral

2. **Execute os comandos de migration:**

```bash
# Verificar o estado atual das migrations
cd /workspace/backend
python -m alembic current

# Executar todas as migrations pendentes
python -m alembic upgrade head

# Verificar se as tabelas foram criadas
python -c "from app.core.db import engine; from sqlalchemy import inspect; insp = inspect(engine); print('Tabelas criadas:', insp.get_table_names())"
```

3. **Reinicie o app:**
   - No Digital Ocean Console, clique em "Settings" > "Restart"

---

### **Opção 2: Adicionar comando de migration ao startup**

Se você quer que as migrations sejam executadas automaticamente toda vez que o app for deployado:

1. **Verifique se existe um arquivo `Procfile` ou script de startup**

2. **Adicione o comando de migration antes de iniciar o servidor:**

```bash
# No Procfile ou script de startup:
python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8080
```

---

### **Opção 3: Criar um Job de Migration no Digital Ocean**

1. **No Digital Ocean Apps Dashboard:**

   - Vá em "Settings" > "Components"
   - Clique em "Add Component"
   - Selecione "Job"

2. **Configure o Job:**
   - **Name:** migration-job
   - **Command:** `python -m alembic upgrade head`
   - **Run On:** Every deploy

Isso executará as migrations automaticamente antes de cada deploy.

---

## 📋 VERIFICAÇÃO PÓS-MIGRAÇÃO

Depois de executar as migrations, teste os endpoints:

```bash
# 1. Verificar se o endpoint de login agora funciona
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Deve retornar: {"detail":"User not found"} ou similar
# (ao invés do erro 500 anterior)

# 2. Teste de registro de usuário
curl -X POST https://api.wolknow.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teste@exemplo.com",
    "username":"testuser",
    "password":"SenhaForte123!"
  }'
```

---

## 🔍 TABELAS QUE DEVEM SER CRIADAS

Após executar as migrations, estas tabelas devem existir:

### **Tabelas Principais:**

- ✅ `users` - Usuários do sistema
- ✅ `wallets` - Carteiras cripto
- ✅ `addresses` - Endereços blockchain
- ✅ `transactions` - Histórico de transações
- ✅ `two_factor_auth` - Autenticação 2FA

### **Tabelas P2P:**

- ✅ `p2p_orders` - Ordens P2P
- ✅ `p2p_matches` - Matches de ordens
- ✅ `p2p_escrows` - Escrow de fundos
- ✅ `p2p_disputes` - Disputas
- ✅ `p2p_chat_rooms` - Salas de chat
- ✅ `p2p_chat_messages` - Mensagens
- ✅ `p2p_file_uploads` - Arquivos upload
- ✅ `p2p_chat_sessions` - Sessões de chat

### **Tabelas de Reputação:**

- ✅ `user_reputations` - Reputação de usuários
- ✅ `user_reviews` - Avaliações
- ✅ `user_badges` - Badges conquistadas
- ✅ `fraud_reports` - Relatórios de fraude

### **Tabelas Trader Profile:**

- ✅ `trader_profiles` - Perfis de traders
- ✅ `trader_stats` - Estatísticas
- ✅ `trade_feedbacks` - Feedbacks
- ✅ `payment_method_verifications` - Verificações de pagamento

### **Tabelas Instant Trade:**

- ✅ `instant_trades` - Trades instantâneos
- ✅ `instant_trade_history` - Histórico de trades

---

## 🚀 COMANDO RÁPIDO (COPIAR E COLAR)

Se você tem acesso SSH ou ao console do Digital Ocean:

```bash
# 1. Entrar no diretório do backend
cd /workspace/backend

# 2. Executar migrations
python -m alembic upgrade head

# 3. Verificar tabelas criadas
python << EOF
from app.core.db import engine
from sqlalchemy import inspect
insp = inspect(engine)
tables = insp.get_table_names()
print(f"\n✅ {len(tables)} tabelas criadas:")
for table in sorted(tables):
    print(f"  - {table}")
EOF

# 4. Reiniciar o serviço (se necessário)
# O Digital Ocean fará isso automaticamente
```

---

## ⚠️ TROUBLESHOOTING

### **Se as migrations falharem:**

1. **Verificar conexão com o banco:**

```bash
python << EOF
from app.core.db import engine
try:
    conn = engine.connect()
    print("✅ Conexão com banco OK")
    conn.close()
except Exception as e:
    print(f"❌ Erro: {e}")
EOF
```

2. **Verificar permissões do usuário do banco:**

```sql
-- Execute no PostgreSQL console do Digital Ocean
GRANT ALL PRIVILEGES ON DATABASE defaultdb TO doadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO doadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO doadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO doadmin;
```

3. **Criar tabelas manualmente (último recurso):**

```bash
python << EOF
from app.core.db import Base, engine
Base.metadata.create_all(bind=engine)
print("✅ Tabelas criadas via SQLAlchemy")
EOF
```

---

## 📊 STATUS ATUAL

- ❌ **Tabelas:** Não existem
- ✅ **Conexão DB:** Funcionando
- ✅ **Backend:** Online
- ✅ **API Root:** Responde corretamente
- ❌ **Login Endpoint:** Erro 500 (tabela users não existe)

---

## 🎯 PRÓXIMOS PASSOS APÓS FIX

1. ✅ Executar migrations
2. ✅ Verificar criação de tabelas
3. ✅ Testar endpoint de login (deve retornar 404 ou erro de credenciais ao invés de 500)
4. ✅ Criar primeiro usuário via endpoint `/v1/auth/register`
5. ✅ Testar autenticação completa
6. ✅ Atualizar frontend com VITE_API_URL correto e fazer novo deploy no Vercel

---

## 📝 NOTAS IMPORTANTES

- **Não executar** `alembic downgrade` em produção (apaga dados)
- As migrations são **idempotentes** (pode executar várias vezes sem problema)
- O Alembic mantém controle de versões na tabela `alembic_version`
- Logs mostram que o backend **tenta** criar tabelas mas usa sintaxe SQL errada
- A solução correta é usar **Alembic migrations**, não CREATE TABLE manual

---

## 🔗 REFERÊNCIAS

- Alembic Docs: https://alembic.sqlalchemy.org/
- Digital Ocean Apps Console: https://cloud.digitalocean.com/apps
- PostgreSQL no Digital Ocean: https://docs.digitalocean.com/products/databases/postgresql/

---

**✅ RESUMO EXECUTIVO:**
Execute `python -m alembic upgrade head` no console do Digital Ocean para criar todas as tabelas do banco de dados. Isso resolverá o erro 500 no endpoint de login.
