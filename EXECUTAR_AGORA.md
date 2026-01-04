# 🚀 INSTRUÇÕES FINAIS - EXECUTAR AGORA

## 📋 COPIE E COLE ESTES COMANDOS NO CONSOLE DO DIGITAL OCEAN:

### ✅ COMANDO 1: Baixar o script de permissões

```bash
cd /workspace && cat > grant_permissions.py << 'SCRIPT_EOF'
from sqlalchemy import create_engine, text

print("🔧 Concedendo permissões...")

url = "postgresql://doadmin:AVNS_ar2Nt97JvtVghkpGJFi@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require"

engine = create_engine(url, echo=False)

with engine.connect() as conn:
    conn.execute(text('GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";'))
    conn.execute(text('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";'))
    conn.execute(text('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";'))
    conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "holdwallet-db";'))
    conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "holdwallet-db";'))
    conn.commit()
    print("✅ Permissões concedidas com sucesso!")

SCRIPT_EOF

python grant_permissions.py
```

### ✅ COMANDO 2: Executar migrations

```bash
cd /workspace/backend && python -m alembic upgrade head
```

### ✅ COMANDO 3: Testar registro de usuário

```bash
curl -X POST https://api.wolknow.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wolknow.com","username":"admin","password":"Admin@2025!Strong"}'
```

---

## 🎯 O QUE ESPERAR:

### Após COMANDO 1:

```
🔧 Concedendo permissões...
✅ Permissões concedidas com sucesso!
```

### Após COMANDO 2:

```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> p2p_complete_001, create p2p tables
INFO  [alembic.runtime.migration] Running upgrade p2p_complete_001 -> bd3e5ab55526, create_instant_trades_tables
```

### Após COMANDO 3:

```json
{
  "id": "uuid-aqui",
  "username": "admin",
  "email": "admin@wolknow.com",
  "is_active": true,
  "created_at": "2025-12-15T..."
}
```

✅ **200 OK** = SISTEMA FUNCIONANDO! 🎉

---

## ⚠️ SE DER ERRO:

Me mostre QUAL comando deu erro e QUAL foi a mensagem exata.

---

**COPIE OS 3 COMANDOS ACIMA E EXECUTE UM POR VEZ NO CONSOLE!** 🚀
