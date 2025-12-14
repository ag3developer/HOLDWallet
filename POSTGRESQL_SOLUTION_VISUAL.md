# 📊 VISÃO GERAL - Erro de Privilégios PostgreSQL

## 🔴 O ERRO

```
Insufficient database privileges

Reason: The application encountered permission issues when
attempting to create database tables and types, specifically
with creating an ENUM type and accessing the public schema.
```

---

## ✅ CAUSA

```
┌─────────────────────────────────┐
│  Usuário PostgreSQL             │
│  ↓                              │
│  Permissões Insuficientes:      │
│  ✗ Criar ENUM types             │
│  ✗ Acessar schema public        │
│  ✗ Criar tipos customizados     │
│  ✗ Gerenciar schemas            │
└─────────────────────────────────┘
```

---

## 🟢 A SOLUÇÃO

### **PASSO 1: DigitalOcean Dashboard**

```
1. Ir para: Databases → Seu Cluster Wolknow
2. Clicar na aba: USERS
3. Localizar: seu_usuario
4. Menu: ⋯ → Edit
5. Checkbox: ☑ Superuser
6. Botão: Save
7. Aguardar: ~30 segundos
```

### **PASSO 2: Redeploy no Vercel**

```
1. Ir para: vercel.com → Seu Projeto
2. Clique em: Deployments
3. Último deploy: ⋯ → Redeploy
   OU
   git push origin main
```

### **PASSO 3: Validar**

```bash
curl https://api.wolknow.com/health
```

---

## 🎯 FLUXO VISUAL

```
┌──────────────────────────────────────────┐
│ 1. DO Dashboard                          │
│    └─ Marcar: Superuser ✓              │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ 2. Aguardar aplicação                    │
│    └─ ~30 segundos                      │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ 3. Vercel Redeploy                       │
│    └─ git push ou UI                    │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ 4. Deploy automático                     │
│    └─ ~2 minutos                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ 5. Teste: curl /health                   │
│    └─ Deve retornar: {"status": "ok"}   │
└──────────────────────────────────────────┘
```

---

## 📋 CHECKLIST

```
Pré-Solução:
☐ Acesso ao DigitalOcean Dashboard
☐ Acesso ao Vercel
☐ Database URL disponível

Durante:
☐ Entrar no Dashboard DO
☐ Encontrar o cluster Wolknow
☐ Abrir Users tab
☐ Editar usuário
☐ Marcar Superuser
☐ Salvar
☐ Aguardar 30s

Pós-Solução:
☐ Ir para Vercel
☐ Clicar Redeploy
☐ Aguardar 2 minutos
☐ Testar: curl /health
☐ ✅ Sucesso!
```

---

## 🆘 PLANO B (Se Plano A não funcionar)

Se o Plano A não resolver em 5 minutos:

### Opção 1: Permissões Específicas

```bash
psql postgresql://seu_usuario@host:25060/banco

# Dentro do psql:
GRANT ALL PRIVILEGES ON SCHEMA public TO seu_usuario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seu_usuario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON TYPES TO seu_usuario;

\q
```

### Opção 2: Novo Usuário + Banco

```bash
# Como admin (doadmin)
CREATE USER novo_user WITH PASSWORD 'senha_forte';
CREATE DATABASE wolknow_db OWNER novo_user;
GRANT ALL PRIVILEGES ON DATABASE wolknow_db TO novo_user;

# Atualizar .env em Vercel
DATABASE_URL=postgresql://novo_user:senha@host:25060/wolknow_db?sslmode=require
```

---

## 📞 DEBUG RÁPIDO

Se quiser debugar antes de começar:

```bash
# 1. Teste conexão
psql postgresql://seu_usuario@host:25060/banco

# 2. Dentro do psql:
SELECT current_user;
\dn public
CREATE TYPE test AS ENUM ('a');  # Vai falhar se sem permissão
\q
```

Se o CREATE TYPE falhar → precisa fazer Plano A ou B

---

## 🎉 RESULTADO ESPERADO

Após seguir os passos:

```
❌ ANTES:
   Deploy fail: Insufficient database privileges
   Error: CREATE ENUM failed

✅ DEPOIS:
   Deploy success: Wolknow Backend API
   Status: Healthy
   API: https://api.wolknow.com/health
```

---

**Tempo total: ~5 minutos**

**Dificuldade: ⭐ (Muito Fácil)**

Qualquer dúvida, veja os guias completos:

- `POSTGRESQL_PRIVILEGES_FIX.md` - Detalhado
- `POSTGRESQL_QUICK_FIX.md` - Direto ao ponto
