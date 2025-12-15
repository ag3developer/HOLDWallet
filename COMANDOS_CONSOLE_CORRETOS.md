# 🔧 COMANDOS CORRETOS - Console Digital Ocean

Execute estes comandos **um por vez** no Console do Digital Ocean:

---

## 1️⃣ Verificar quantas tabelas foram criadas:

```bash
python -c "
from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = '"'"'public'"'"'
        ORDER BY tablename;
    '''))
    tables = [row[0] for row in result]
    print(f'Total de tabelas: {len(tables)}')
    for table in tables:
        print(f'  - {table}')
"
```

---

## 2️⃣ Verificar colunas da tabela users:

```bash
python -c "
from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '"'"'users'"'"'
        ORDER BY ordinal_position;
    '''))
    print('Colunas da tabela users:')
    for row in result:
        print(f'  - {row[0]}: {row[1]}')
"
```

---

## 3️⃣ OU use este comando mais simples:

```bash
cd /workspace/backend
python -c "from app.core.db import engine; from sqlalchemy import text; conn = engine.connect(); result = conn.execute(text('SELECT tablename FROM pg_tables WHERE schemaname = \\'public\\' ORDER BY tablename;')); tables = [row[0] for row in result]; print('Total:', len(tables)); [print(f'  - {t}') for t in tables]"
```

---

## 4️⃣ Verificar se a tabela users tem dados:

```bash
python -c "from app.core.db import engine; from sqlalchemy import text; conn = engine.connect(); result = conn.execute(text('SELECT COUNT(*) FROM users;')); print('Total de usuários:', result.fetchone()[0])"
```

---

## 5️⃣ Verificar estrutura simples:

```bash
python -c "from app.core.db import engine; print('Conectado ao:', engine.url)"
```

---

**Cole e execute esses comandos e me mostre o resultado!** 🚀
