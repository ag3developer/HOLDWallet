# 🚀 INSTRUÇÕES - Console Digital Ocean

## ⚠️ SITUAÇÃO ATUAL

O backend tentou criar as tabelas automaticamente mas falhou com:

```
❌ PERMISSION DENIED - Database user cannot create tables!
```

**Solução:** Executar migrations pelo Console do Digital Ocean (tem as permissões certas).

---

## 📋 PASSO A PASSO (2 minutos)

### 1️⃣ Acessar o Console

1. Abra: https://cloud.digitalocean.com/apps
2. Clique no app **"wolknow-backend"** (ou nome similar)
3. No menu lateral, clique em **"Console"**
4. Aguarde o terminal abrir (tela preta)

### 2️⃣ Executar Migrations

Cole estes comandos **um por vez**:

```bash
# Navegar para o diretório do backend
cd /workspace/backend
```

```bash
# Verificar se alembic está instalado
python -m alembic --version
```

```bash
# Executar migrations (ESTE É O IMPORTANTE!)
python -m alembic upgrade head
```

### 3️⃣ Verificar Sucesso

Você deve ver mensagens como:

```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 1234abcd, Initial migration
INFO  [alembic.runtime.migration] Running upgrade 1234abcd -> 5678efgh, Add users table
...
```

✅ **Se ver várias linhas com "Running upgrade"** = Sucesso! Tabelas criadas!

---

## 🧪 TESTAR IMEDIATAMENTE

Depois das migrations rodarem, teste o registro:

```bash
curl -X POST https://api.wolknow.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wolknow.com","username":"admin","password":"Admin@2025!Strong"}'
```

### Resultado esperado:

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@wolknow.com",
  "is_active": true,
  "created_at": "2025-12-15T..."
}
```

✅ **200 OK** = TUDO FUNCIONANDO! 🎉

---

## 🆘 SE ALEMBIC NÃO ESTIVER INSTALADO

Se o comando `alembic --version` falhar, instale primeiro:

```bash
pip install alembic
```

Depois rode novamente:

```bash
python -m alembic upgrade head
```

---

## 🆘 SE AINDA DER ERRO

### Erro: "can't locate revision identified by 'head'"

Significa que não há migrations. Vamos criar as tabelas direto:

```bash
cd /workspace/backend
python init_db.py
```

### Erro: "permission denied" mesmo no console

Entre em contato com suporte Digital Ocean - o usuário do banco precisa de privilégios CREATE.

---

## 📊 LOGS ATUAIS (para referência)

```
2025-12-15 07:05:33 | app.core.db | ERROR | ❌ PERMISSION DENIED - Database user cannot create tables!
2025-12-15 07:05:33 | app.core.db | ERROR |    Solution: Execute migrations from Digital Ocean Console:
2025-12-15 07:05:33 | app.core.db | ERROR |    cd /workspace/backend && python -m alembic upgrade head
```

---

**⚡ Ação imediata:** Executar os comandos acima no Console do Digital Ocean AGORA!

**⏱️ Tempo:** 2 minutos para criar todas as tabelas.

**🎯 Meta:** Após executar, o sistema estará 100% operacional!
