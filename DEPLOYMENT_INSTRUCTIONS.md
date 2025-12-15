# 🚀 INSTRUÇÕES DE DEPLOY E TESTES

## Status Atual (Teste Executado)

### ✅ LOCAL (localhost:8000) - FUNCIONANDO PERFEITAMENTE

- Root endpoint: ✅ Retorna corretamente
- Login /api/v1: ✅ JWT token válido
- Login /v1 (middleware): ✅ JWT token válido
- **Middleware de reescrita**: ✅ Funcionando

### ❌ PRODUÇÃO (api.wolknow.com) - PRECISA DE AÇÕES

**Problema 1**: Banco de dados em produção não tem as tabelas

- Erro: `relation "users" does not exist`
- Solução: Executar script de inicialização

**Problema 2**: Rota `/v1` não funcionava antes (agora foi corrigido)

- Solução: Adicionei rota `/v1` no código

---

## 📋 PRÓXIMAS AÇÕES

### 1️⃣ FAZER REDEPLOY NO DIGITAL OCEAN

O código foi atualizado com:

- ✅ Suporte a `root_path="/v1"` em produção
- ✅ Rota `/v1` para acesso direto
- ✅ Script de inicialização de DB

**Passos:**

```
1. Abra: https://cloud.digitalocean.com/apps
2. Clique em: wolknow-backend
3. Vá em: Deployments
4. Clique: Create Deployment
5. Aguarde: 10-15 minutos
```

### 2️⃣ INICIALIZAR BANCO DE DADOS EM PRODUÇÃO

Depois que o deploy terminar, execute o script de inicialização:

#### Opção A: Via SSH no Digital Ocean

```bash
# SSH na sua aplicação
ssh seu-usuario@seu-servidor

# Navegue até o projeto
cd /path/to/HOLDWallet

# Execute o script de inicialização
python init_production_db.py
```

#### Opção B: Via Digital Ocean App CLI

```bash
# Se tiver o doctl instalado
doctl apps create-deployment {APP_ID}

# Então depois via console da app:
python init_production_db.py
```

#### Opção C: Diretamente no banco PostgreSQL

Se preferir fazer manualmente:

```sql
-- Conecte ao banco de produção
psql postgresql://user:pass@host/holdwallet

-- Execute o comando SQL do init_production_db
-- (será exibido no console quando rodar o script)
```

### 3️⃣ TESTAR A API EM PRODUÇÃO

Depois que tudo estiver pronto, execute os testes:

```bash
bash test_api_comparison.sh
```

**Você deve ver:**

- ✅ Root endpoint `/v1/` retornando JSON
- ✅ Login `/v1/auth/login` retornando JWT token
- ✅ Login `/api/v1/auth/login` também retornando JWT token
- ✅ Docs `/v1/docs` carregando Swagger UI
- ✅ OpenAPI spec `/v1/openapi.json` carregando

---

## 🔍 CHECKLIST DE CONCLUSÃO

```
[ ] Deploy criado no Digital Ocean (aguardando conclusão)
[ ] Script de inicialização executado
[ ] Banco de dados com tabelas criadas
[ ] Usuário de teste (app@holdwallet.com) criado
[ ] Testes executados com sucesso
[ ] Swagger UI carregando em /v1/docs
[ ] Frontend fazendo login com sucesso
```

---

## 📞 Possíveis Problemas e Soluções

### Erro: "relation users does not exist"

**Causa**: Banco de dados não foi inicializado
**Solução**: Execute `python init_production_db.py`

### Erro: "Failed to load resource: openapi.json"

**Causa**: Swagger não encontra a spec
**Solução**: Verifique se redeploy foi concluído e root_path está `/v1`

### Erro: "Not Found" em /v1/docs

**Causa**: Rota /v1 não foi registrada
**Solução**: Redeploy do código com a nova rota

### Erro: CORS origin not allowed

**Causa**: Frontend não está na whitelist
**Solução**: Adicionar origin em `CORS_ORIGINS` no config.py

---

## 🎯 Próximo Passo

**Você fez o redeploy no Digital Ocean já?** Se não, faça agora:

1. https://cloud.digitalocean.com/apps
2. wolknow-backend → Deployments → Create Deployment
3. Aguarde 10-15 minutos
4. Depois avisa que vamos testar novamente!
