# 🔐 Resolvendo Erro de Permissões PostgreSQL - Wolknow

**Erro**: `Insufficient database privileges` ao criar ENUM types e acessar schema public

**Data**: 14 de Dezembro de 2025

---

## 🎯 Problema

O usuário PostgreSQL não tem permissões para:

1. ✗ Criar ENUM types
2. ✗ Acessar/criar no schema public
3. ✗ Criar extensões
4. ✗ Criar tipos customizados

---

## ✅ Soluções (em ordem de facilidade)

### **OPÇÃO 1: Fazer usuário SUPERUSER (Recomendado para DigitalOcean)**

Se você tem acesso como admin do DigitalOcean Database, execute:

```sql
-- Conectar com usuário admin do cluster
ALTER USER seu_usuario CREATEUSER;
ALTER USER seu_usuario SUPERUSER;
```

**Ou via DigitalOcean Dashboard:**

1. Ir para Databases → seu cluster
2. Users tab
3. Clicar na linha do usuário
4. Habilitar "Superuser" checkbox

---

### **OPÇÃO 2: Conceder Permissões Específicas (Seguro)**

Se NÃO quer fazer superuser, execute como admin:

```sql
-- Conectar com usuário ADMIN/postgres
\c seu_banco seu_usuario_admin

-- 1. Conceder privilégios no schema public
GRANT ALL PRIVILEGES ON SCHEMA public TO seu_usuario;

-- 2. Conceder privilégios padrão para novas tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seu_usuario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO seu_usuario;

-- 3. Conceder privilégios para criar tipos (ENUM)
GRANT CREATE ON SCHEMA public TO seu_usuario;
GRANT USAGE ON SCHEMA public TO seu_usuario;

-- 4. Conceder privilégios padrão para tipos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON TYPES TO seu_usuario;

-- 5. Validar permissões
SELECT * FROM information_schema.role_table_grants
WHERE grantee='seu_usuario' AND privilege_type='USAGE';
```

---

### **OPÇÃO 3: Criar Novo Usuário com Permissões Completas**

Se tiver problemas com usuário existente:

```sql
-- Como admin (postgres)
CREATE USER novo_usuario WITH PASSWORD 'senha_forte_aqui';

-- Fazer owner de um banco novo
CREATE DATABASE wolknow_db OWNER novo_usuario;

-- Conceder privilégios completos
GRANT ALL PRIVILEGES ON DATABASE wolknow_db TO novo_usuario;

-- Conectar como novo_usuario e verificar
\c wolknow_db novo_usuario
\dt  -- Deve listar tabelas sem erro
```

---

### **OPÇÃO 4: Atualizar String de Conexão (se usar novo usuário)**

Se criou novo usuário, atualize seu `.env` no DigitalOcean:

```bash
DATABASE_URL=postgresql://novo_usuario:senha_forte_aqui@host:25060/wolknow_db?sslmode=require
```

---

## 🔧 Verificação Pré-Deploy

Antes de fazer deploy novamente, teste estas queries:

```bash
# 1. Conectar ao banco
psql postgresql://seu_usuario:senha@host:25060/banco

# 2. Dentro do psql, executar:
-- Verificar usuário atual
SELECT current_user;

-- Verificar permissões no schema
\dn public

-- Verificar se consegue criar ENUM
CREATE TYPE test_enum AS ENUM ('value1', 'value2');
DROP TYPE test_enum;

-- Verificar se consegue criar tabela
CREATE TABLE test_table (id SERIAL PRIMARY KEY);
DROP TABLE test_table;
```

Se todas as queries funcionarem, você está pronto para deploy!

---

## 📋 Passo a Passo para DigitalOcean

### Via Dashboard (Recomendado)

1. Ir para **Databases** → seu cluster Wolknow
2. Clicar em **Users** tab
3. Procurar seu usuário na lista
4. Clicar no menu (⋯) → Edit
5. **Habilitar "Superuser"** ✓
6. Clicar **Save**
7. Aguardar aplicação das mudanças (~30 segundos)
8. Fazer deploy novamente no Vercel

### Via SQL (Command Line)

```bash
# 1. Conectar com usuário admin
psql postgresql://doadmin:admin_password@host:25060/defaultdb

# 2. Alterar usuário para superuser
ALTER USER seu_usuario SUPERUSER;

# 3. Verificar
SELECT usename, usesuper FROM pg_user WHERE usename='seu_usuario';

# 4. Sair
\q
```

---

## 🚀 Após Resolver Permissões

### 1. Verificar Conexão Localmente (Opcional)

```bash
cd backend
python -m pytest tests/test_db.py -v
```

### 2. Fazer Deploy em Produção

Via Vercel:

```bash
git add .env.production
git commit -m "fix: update database privileges"
git push origin main
```

Vercel fará auto-deploy e agora deve funcionar!

### 3. Validar Deploy

Após deploy, testar:

```bash
# Health check
curl https://api.wolknow.com/health

# Deve retornar:
# {"status":"healthy","message":"Wolknow API"}
```

---

## 🆘 Se Ainda Não Funcionar

### Debug Step 1: Verificar Logs de Deploy

```bash
# No seu projeto Vercel
vercel logs --follow
```

### Debug Step 2: Testar Conexão Direto

```bash
# Localmente, com sua DATABASE_URL
python3 << 'EOF'
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://seu_usuario:senha@host:25060/banco?sslmode=require"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT current_user;"))
    print("User:", result.fetchone())

    # Testar criar ENUM
    try:
        conn.execute(text("CREATE TYPE test_enum AS ENUM ('a', 'b');"))
        conn.execute(text("DROP TYPE test_enum;"))
        print("✅ ENUM creation works!")
    except Exception as e:
        print(f"❌ ENUM creation failed: {e}")

EOF
```

### Debug Step 3: Verificar Models

Se tiver ENUM customizado nos models:

```bash
grep -r "Enum" backend/app/models/
```

Se encontrar algum, pode ser que precise fazer sem ENUM por enquanto.

---

## 📊 Comparação de Opções

| Opção                         | Facilidade | Segurança  | Tempo  |
| ----------------------------- | ---------- | ---------- | ------ |
| **1. Superuser**              | ⭐⭐⭐⭐⭐ | ⭐⭐       | <1 min |
| **2. Permissões Específicas** | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | 5 min  |
| **3. Novo Usuário**           | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | 5 min  |
| **4. Update String**          | ⭐⭐       | ⭐⭐⭐     | 1 min  |

**Para desenvolvimento**: Opção 1 (Superuser)  
**Para produção**: Opção 2 (Permissões Específicas)

---

## 🎯 Próximos Passos

1. **Escolher uma opção acima** (recomendo Opção 1)
2. **Executar SQL** no DigitalOcean
3. **Testar queries** de verificação
4. **Fazer git push** para novo deploy
5. **Validar** em `https://api.wolknow.com/health`

---

## 📝 Notas Importantes

- ✅ Mudanças de permissões são instantâneas
- ✅ Não precisa recriar banco
- ✅ Não precisa recriar usuário (exceto Opção 3)
- ✅ Deploy automático Vercel vai retomar

---

**Dúvidas? Tente:**

```bash
# Verificar todos os usuários
psql -c "SELECT usename, usesuper FROM pg_user;"

# Verificar todas as databases
psql -l
```
