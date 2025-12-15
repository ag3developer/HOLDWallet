# 🚨 PROBLEMA DE PERMISSÕES - Soluções Disponíveis

## ❌ ERRO ATUAL

```
psycopg2.errors.InsufficientPrivilege: permission denied for schema public
CREATE TABLE alembic_version
```

✅ **Progresso:** Alembic agora usa PostgreSQL (`Context impl PostgresqlImpl`)  
❌ **Problema:** Usuário `holdwallet-db` não tem permissão CREATE no schema `public`

---

## 🎯 SOLUÇÕES POSSÍVEIS

### **SOLUÇÃO 1: Conceder Permissões (RECOMENDADO)** ⭐

#### Via Dashboard Digital Ocean:

1. Acesse: https://cloud.digitalocean.com/databases
2. Clique no database `holdwallet-db`
3. Vá em **"Users & Databases"**
4. Procure o usuário `holdwallet-db`
5. Verifique se tem permissão **"Read & Write"** ou superior

#### Via SQL (se tiver acesso admin):

```bash
# No Console do PostgreSQL (como doadmin)
GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";
```

---

### **SOLUÇÃO 2: Usar Trusted Sources (Digital Ocean)**

O Digital Ocean pode ter o banco configurado para aceitar conexões apenas de "Trusted Sources".

1. No Dashboard do database
2. Vá em **"Settings"** → **"Trusted Sources"**
3. Adicione o IP do app backend

---

### **SOLUÇÃO 3: Criar Tabelas via SQL Direto** 🔧

Execute este script **NO CONSOLE DO DIGITAL OCEAN**:

```bash
cd /workspace
curl -O https://raw.githubusercontent.com/ag3developer/HOLDWallet/main/create_tables_sql.py
python create_tables_sql.py
```

Ou copie o arquivo `create_tables_sql.py` (que acabei de criar) para o servidor e execute:

```bash
python /path/to/create_tables_sql.py
```

Este script cria as tabelas principais usando SQL direto em vez de Alembic.

---

### **SOLUÇÃO 4: Usar Database Connection Pooler**

O Digital Ocean oferece um "Connection Pooler" que pode ter permissões diferentes:

1. No Dashboard do database
2. Vá em **"Connection Details"**
3. Escolha **"Connection Pooler"** em vez de **"Public network"**
4. Use a nova string de conexão

---

### **SOLUÇÃO 5: Criar Database com outro usuário**

Se você tem acesso ao usuário `doadmin`:

```bash
# Conectar como doadmin
psql postgresql://doadmin:PASSWORD@HOST:25060/holdwallet-db?sslmode=require

# No psql:
GRANT CREATE ON SCHEMA public TO "holdwallet-db";
\q
```

---

## 🎯 QUAL ESCOLHER?

| Solução                    | Dificuldade | Tempo | Recomendado |
| -------------------------- | ----------- | ----- | ----------- |
| **1. Conceder Permissões** | Fácil       | 2 min | ⭐⭐⭐⭐⭐  |
| 2. Trusted Sources         | Média       | 5 min | ⭐⭐⭐      |
| 3. SQL Direto              | Média       | 3 min | ⭐⭐⭐⭐    |
| 4. Connection Pooler       | Fácil       | 2 min | ⭐⭐⭐⭐    |
| 5. Usuário Admin           | Difícil     | 5 min | ⭐⭐        |

---

## 📋 PASSO A PASSO RECOMENDADO

### **OPÇÃO A: Via Dashboard (Mais Fácil)**

1. Acesse: https://cloud.digitalocean.com/databases
2. Entre no banco `holdwallet-db`
3. Clique em **"Users & Databases"**
4. Encontre o usuário `holdwallet-db`
5. Clique em **"⋮"** (três pontos) → **"Edit"**
6. Certifique-se que tem permissão **"All Databases"** ou **"holdwallet-db" com Read/Write**
7. Salve

### **OPÇÃO B: Via Script SQL (Se opção A não funcionar)**

Execute no Console do Digital Ocean (app backend):

```bash
cd /workspace/backend
python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

sqls = [
    'CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username VARCHAR(50) UNIQUE, email VARCHAR(255) UNIQUE, hashed_password VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW());',
    'CREATE TABLE IF NOT EXISTS wallets (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), name VARCHAR(100), network VARCHAR(50), created_at TIMESTAMP DEFAULT NOW());',
]

with engine.connect() as conn:
    for sql in sqls:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f'✅ {sql[:30]}... executado')
        except Exception as e:
            print(f'❌ Erro: {e}')
"
```

---

## ⚡ AÇÃO IMEDIATA

1. **Primeiro:** Tente a **OPÇÃO A** (Dashboard)
2. **Se falhar:** Use a **OPÇÃO B** (Script SQL)
3. **Depois:** Execute `python -m alembic upgrade head` novamente

---

**Me mostre qual opção você vai tentar e o resultado!** 🚀
