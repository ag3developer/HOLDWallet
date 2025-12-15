# ✅ CHECKLIST COMPLETO - Sistema 100% Pronto para api.wolknow.com

**Data:** 15 de dezembro de 2025  
**Objetivo:** Garantir que todo o sistema está configurado e funcionando perfeitamente com api.wolknow.com

---

## 📋 ÍNDICE RÁPIDO

- [1. Infraestrutura](#1-infraestrutura)
- [2. Backend (API)](#2-backend-api)
- [3. Frontend](#3-frontend)
- [4. Banco de Dados](#4-banco-de-dados)
- [5. Segurança](#5-segurança)
- [6. Testes de Conectividade](#6-testes-de-conectividade)
- [7. Testes Funcionais](#7-testes-funcionais)
- [8. Monitoramento](#8-monitoramento)
- [9. Checklist Final](#9-checklist-final)

---

## 1. Infraestrutura

### 1.1 Domínio e DNS

- [ ] **api.wolknow.com** está registrado e ativo
- [ ] DNS aponta para o servidor correto
  ```bash
  # Testar resolução DNS
  nslookup api.wolknow.com
  dig api.wolknow.com
  ```
- [ ] Tempo de propagação DNS completo (até 48h)
- [ ] Certificado SSL/TLS válido e ativo
  ```bash
  # Verificar certificado
  curl -vI https://api.wolknow.com 2>&1 | grep -A 10 "SSL certificate"
  ```
- [ ] Certificado não está expirado
- [ ] Certificado é de autoridade confiável (não self-signed)

### 1.2 Servidor/Hosting

- [ ] Servidor está online e acessível
- [ ] Porta 443 (HTTPS) está aberta
- [ ] Porta 80 (HTTP) redireciona para HTTPS
- [ ] Firewall configurado corretamente
- [ ] Rate limiting configurado (se aplicável)
- [ ] Load balancer configurado (se aplicável)

### 1.3 Digital Ocean (se usar)

- [ ] App está deployada e rodando
- [ ] Status da app: "Running" (não "Deploying" ou "Error")
- [ ] Logs acessíveis e sem erros críticos
- [ ] Recursos (CPU, RAM) dentro dos limites
- [ ] Auto-scaling configurado (opcional)

---

## 2. Backend (API)

### 2.1 Variáveis de Ambiente

- [ ] **ENVIRONMENT=production** configurado
- [ ] **DEBUG=false** em produção
- [ ] **LOG_LEVEL=info** ou **warning**
- [ ] **DATABASE_URL** com senha correta
  ```bash
  # Formato correto:
  # postgresql://doadmin:SENHA_REAL@host:25060/defaultdb
  ```
- [ ] **SECRET_KEY** gerada e única (não a padrão do dev)
  ```bash
  # Gerar nova:
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] **JWT_ALGORITHM=HS256** configurado
- [ ] **JWT_EXPIRATION_HOURS** definido
- [ ] **ALLOWED_ORIGINS** inclui:
  - `https://hold-wallet-deaj.vercel.app`
  - `https://wolknow.com` (se aplicável)
- [ ] **FRONTEND_URL** correto
- [ ] **RPC URLs** testadas e funcionando:
  - [ ] ETHEREUM_RPC_URL
  - [ ] POLYGON_RPC_URL
  - [ ] BSC_RPC_URL
- [ ] **REDIS_URL** configurado e acessível
- [ ] **ROOT_PATH=v1** configurado

### 2.2 Deploy e Código

- [ ] Código mais recente está no repositório Git
- [ ] Branch **main** está atualizado
- [ ] Deploy feito a partir do commit correto
- [ ] Build bem-sucedido (sem erros)
- [ ] Migrations do banco executadas
  ```bash
  python -m alembic upgrade head
  ```
- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Servidor iniciado com Gunicorn/Uvicorn
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
  ```
- [ ] Processo rodando sem travar/crashar

### 2.3 Endpoints Principais

Teste cada endpoint abaixo:

#### Root Endpoint

- [ ] `GET https://api.wolknow.com/v1/`
  ```bash
  curl https://api.wolknow.com/v1/
  ```
  **Esperado:** JSON com informações do sistema

#### Health Check

- [ ] `GET https://api.wolknow.com/v1/health`
  ```bash
  curl https://api.wolknow.com/v1/health
  ```
  **Esperado:** `{"status":"healthy"}` ou similar

#### Documentação Swagger

- [ ] `GET https://api.wolknow.com/v1/docs`
  - Abrir no navegador e verificar se carrega
  - **Esperado:** Interface Swagger UI funcional

#### OpenAPI Spec

- [ ] `GET https://api.wolknow.com/v1/openapi.json`
  ```bash
  curl https://api.wolknow.com/v1/openapi.json
  ```
  **Esperado:** JSON com especificação OpenAPI

#### Autenticação

- [ ] `POST https://api.wolknow.com/v1/auth/login`

  ```bash
  curl -X POST https://api.wolknow.com/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"seu-email@example.com","password":"sua-senha"}'
  ```

  **Esperado:** Token JWT válido

- [ ] `POST https://api.wolknow.com/v1/auth/register`
  ```bash
  curl -X POST https://api.wolknow.com/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"novo@example.com","password":"Senha123!","full_name":"Teste"}'
  ```
  **Esperado:** Usuário criado ou erro de validação

#### Wallets (com autenticação)

- [ ] `GET https://api.wolknow.com/v1/wallets/`
  ```bash
  TOKEN="seu_token_aqui"
  curl https://api.wolknow.com/v1/wallets/ \
    -H "Authorization: Bearer $TOKEN"
  ```
  **Esperado:** Lista de carteiras do usuário

#### Outros Endpoints Críticos

- [ ] P2P Orders
- [ ] Trading
- [ ] Transactions
- [ ] Balances

---

## 3. Frontend

### 3.1 Variáveis de Ambiente (Vercel)

- [ ] **VITE_API_URL=https://api.wolknow.com/v1** ⚠️ IMPORTANTE: Incluir `/v1` no final!
  - Conferir no dashboard do Vercel: Settings → Environment Variables
  - **Correto:** `https://api.wolknow.com/v1` (com `/v1`)
  - **Errado:** `https://api.wolknow.com` (sem `/v1`)
- [ ] **VITE_WS_URL=wss://api.wolknow.com/ws**
- [ ] **VITE_APP_URL=https://hold-wallet-deaj.vercel.app**
- [ ] **NODE_ENV=production**
- [ ] **VITE_ENABLE_ANALYTICS** configurado conforme desejado

### 3.2 Build e Deploy

- [ ] `npm run build` executa sem erros
- [ ] Build otimizado para produção
- [ ] Assets minificados e comprimidos
- [ ] Source maps desabilitados ou protegidos
- [ ] Deploy no Vercel bem-sucedido
- [ ] URL da aplicação acessível: `https://hold-wallet-deaj.vercel.app`

### 3.3 Código Frontend

- [ ] Arquivo `src/config/app.ts` carregando variáveis corretas
  ```typescript
  // Verificar se está assim:
  baseUrl: import.meta.env.VITE_API_URL || "https://api.wolknow.com/v1";
  ```
- [ ] Nenhum hardcoded de `localhost` ou `127.0.0.1` no código
- [ ] Todas chamadas de API usando `API_BASE` ou `APP_CONFIG.api.baseUrl`
- [ ] WebSocket usando `wss://` (não `ws://`)

### 3.4 CORS e Headers

- [ ] Content Security Policy (CSP) configurada
- [ ] CSP permite api.wolknow.com
- [ ] Sem erros de CSP no console do navegador
- [ ] CORS funcionando (sem erros no console)
  ```bash
  # Testar CORS
  curl -H "Origin: https://hold-wallet-deaj.vercel.app" \
       -H "Access-Control-Request-Method: POST" \
       -X OPTIONS https://api.wolknow.com/v1/auth/login -v
  ```
  **Esperado:** Headers `Access-Control-Allow-Origin` presentes

---

## 4. Banco de Dados

### 4.1 PostgreSQL (Digital Ocean)

- [ ] Banco de dados criado e ativo
- [ ] Conexão configurada na string DATABASE_URL
- [ ] Senha correta (não placeholder "PASSWORD")
- [ ] Porta 25060 acessível do servidor
- [ ] SSL habilitado (se necessário)
- [ ] IP do servidor na whitelist (se aplicável)

### 4.2 Schema e Migrations

- [ ] Todas as migrations executadas
  ```bash
  python -m alembic current
  # Deve mostrar a versão mais recente
  ```
- [ ] Tabelas criadas:
  - [ ] `users`
  - [ ] `wallets`
  - [ ] `transactions`
  - [ ] `p2p_orders`
  - [ ] `payment_methods`
  - [ ] Outras tabelas necessárias
- [ ] Usuário de teste criado (se necessário)

### 4.3 Teste de Conexão

- [ ] Conectar via psql
  ```bash
  psql postgresql://doadmin:SENHA@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
  ```
- [ ] Query de teste funciona
  ```sql
  SELECT count(*) FROM users;
  ```

---

## 5. Segurança

### 5.1 Secrets e Chaves

- [ ] **SECRET_KEY** única e forte (não commitada no Git)
- [ ] **JWT_SECRET** diferente entre dev e produção
- [ ] Senhas de banco NÃO estão no código
- [ ] API Keys externas seguras (TransfBank, RPCs)
- [ ] `.env.production` no `.gitignore`
- [ ] Nenhum arquivo `.env` commitado no repositório

### 5.2 HTTPS e Certificados

- [ ] HTTPS obrigatório (HTTP redireciona para HTTPS)
- [ ] Certificado válido (não expirado)
- [ ] TLS 1.2+ habilitado
- [ ] Certificado de CA confiável
- [ ] HSTS headers configurados (opcional)

### 5.3 Headers de Segurança

- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security` (HSTS)
- [ ] Content-Security-Policy configurado

### 5.4 Rate Limiting e Proteção

- [ ] Rate limiting ativo (previne DDoS)
- [ ] Brute force protection no login
- [ ] CORS configurado com origens específicas
- [ ] Validação de input em todos os endpoints
- [ ] Logs de segurança ativos

---

## 6. Testes de Conectividade

### 6.1 Testes Básicos

Execute cada comando e anote o resultado:

```bash
# 1. Ping (DNS)
ping api.wolknow.com

# 2. Curl básico
curl -I https://api.wolknow.com

# 3. Health check
curl https://api.wolknow.com/v1/health

# 4. Root endpoint
curl https://api.wolknow.com/v1/

# 5. Docs
curl https://api.wolknow.com/v1/docs

# 6. OpenAPI
curl https://api.wolknow.com/v1/openapi.json
```

**Resultado esperado para cada:** Status 200 ou JSON válido

### 6.2 Teste de Login Completo

```bash
# Teste de login
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  -v
```

**Checklist:**

- [ ] Status code 200 (sucesso) ou 401 (credenciais inválidas)
- [ ] NÃO recebe 404 (rota não encontrada)
- [ ] NÃO recebe 500 (erro interno)
- [ ] Recebe JSON com `access_token` (se credenciais corretas)
- [ ] Token JWT é válido

### 6.3 Teste de Chamada Autenticada

```bash
# Obter token primeiro
TOKEN=$(curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  -s | jq -r '.access_token')

# Usar token
curl https://api.wolknow.com/v1/wallets/ \
  -H "Authorization: Bearer $TOKEN"
```

**Checklist:**

- [ ] Token obtido com sucesso
- [ ] Requisição autenticada retorna 200
- [ ] Dados corretos retornados

---

## 7. Testes Funcionais

### 7.1 Fluxo de Autenticação

- [ ] **Registro de novo usuário** funciona
  - [ ] Email válido aceito
  - [ ] Senha forte obrigatória
  - [ ] Email duplicado rejeitado
- [ ] **Login** funciona
  - [ ] Credenciais corretas retornam token
  - [ ] Credenciais erradas retornam 401
  - [ ] Token expira após tempo configurado
- [ ] **Logout** funciona (se implementado)
- [ ] **Refresh token** funciona (se implementado)

### 7.2 Wallets e Balances

- [ ] Criar carteira funciona
- [ ] Listar carteiras funciona
- [ ] Ver saldos funciona
- [ ] Saldos corretos (verificar com blockchain)
- [ ] Múltiplas redes suportadas:
  - [ ] Ethereum
  - [ ] Polygon
  - [ ] BSC
  - [ ] Bitcoin (se aplicável)

### 7.3 Transações

- [ ] Enviar transação funciona
- [ ] Histórico de transações funciona
- [ ] Status da transação atualiza corretamente
- [ ] Taxas calculadas corretamente

### 7.4 P2P Trading

- [ ] Criar ordem P2P funciona
- [ ] Listar ordens funciona
- [ ] Aceitar ordem funciona
- [ ] Chat P2P funciona
- [ ] Escrow funciona
- [ ] Liberar fundos funciona

### 7.5 Frontend Integrado

Teste no navegador em `https://hold-wallet-deaj.vercel.app`:

- [ ] **Página de login carrega**
- [ ] **Login funciona** (usuário consegue autenticar)
- [ ] **Dashboard carrega** após login
- [ ] **Saldos aparecem** corretamente
- [ ] **Gráficos carregam** (se aplicável)
- [ ] **Criar ordem P2P** funciona
- [ ] **Ver histórico** funciona
- [ ] **Sem erros no console** do navegador:
  - [ ] Sem erros 404
  - [ ] Sem erros CORS
  - [ ] Sem erros CSP
  - [ ] Sem erros de autenticação não tratados

---

## 8. Monitoramento

### 8.1 Logs

- [ ] Logs acessíveis e legíveis

  ```bash
  # Digital Ocean
  # Apps → Sua App → Logs

  # Ou via SSH
  tail -f /var/log/app.log
  ```

- [ ] Log level apropriado (INFO em produção)
- [ ] Logs não contêm informações sensíveis (senhas, tokens)
- [ ] Erros são logados com stack trace
- [ ] Requests são logados (opcional)

### 8.2 Métricas

- [ ] CPU usage monitorado
- [ ] RAM usage monitorado
- [ ] Request rate monitorado
- [ ] Error rate monitorado
- [ ] Response time monitorado
- [ ] Uptime monitorado

### 8.3 Alertas (opcional mas recomendado)

- [ ] Alerta se API ficar offline
- [ ] Alerta se error rate > threshold
- [ ] Alerta se banco de dados desconectar
- [ ] Alerta se SSL expirar em breve

---

## 9. Checklist Final

### ✅ Pré-Deploy

- [ ] Todas as variáveis de ambiente conferidas
- [ ] SECRET_KEY regenerada
- [ ] Senha do banco configurada
- [ ] Código testado localmente
- [ ] Migrations testadas
- [ ] Build frontend sem erros
- [ ] Git push feito

### ✅ Deploy

- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] DNS propagado
- [ ] SSL ativo
- [ ] Logs sem erros críticos

### ✅ Pós-Deploy

- [ ] Health check retorna 200
- [ ] Login funciona
- [ ] Endpoint principal testado
- [ ] Frontend conecta ao backend
- [ ] Sem erros no console
- [ ] Transação teste bem-sucedida
- [ ] Monitoramento ativo

### ✅ Documentação

- [ ] README atualizado
- [ ] Variáveis documentadas
- [ ] Endpoints documentados (Swagger)
- [ ] Guia de troubleshooting disponível

---

## 🚀 COMANDOS RÁPIDOS DE TESTE

### Teste Completo Automático

Salve como `test_production.sh` e execute:

```bash
#!/bin/bash
echo "🧪 Testando api.wolknow.com..."

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Teste 1: Health
echo -n "1. Health check... "
if curl -s https://api.wolknow.com/v1/health | grep -q "healthy\|ok\|status"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Teste 2: Root
echo -n "2. Root endpoint... "
if curl -s https://api.wolknow.com/v1/ | grep -q "{"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Teste 3: Docs
echo -n "3. Swagger docs... "
if curl -s -o /dev/null -w "%{http_code}" https://api.wolknow.com/v1/docs | grep -q "200"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Teste 4: CORS
echo -n "4. CORS headers... "
if curl -s -H "Origin: https://hold-wallet-deaj.vercel.app" \
    -X OPTIONS https://api.wolknow.com/v1/auth/login -I | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Teste 5: SSL
echo -n "5. SSL certificate... "
if curl -s -I https://api.wolknow.com 2>&1 | grep -q "SSL certificate verify ok"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo "✅ Testes concluídos!"
```

Execute:

```bash
chmod +x test_production.sh
./test_production.sh
```

---

## 📊 SCORECARD

Preencha conforme avança no checklist:

| Categoria          | Progresso    | Status |
| ------------------ | ------------ | ------ |
| 1. Infraestrutura  | \_\_/6       | ⬜     |
| 2. Backend         | \_\_/30      | ⬜     |
| 3. Frontend        | \_\_/12      | ⬜     |
| 4. Banco de Dados  | \_\_/8       | ⬜     |
| 5. Segurança       | \_\_/15      | ⬜     |
| 6. Conectividade   | \_\_/10      | ⬜     |
| 7. Funcionalidades | \_\_/20      | ⬜     |
| 8. Monitoramento   | \_\_/8       | ⬜     |
| **TOTAL**          | **\_\_/109** | **⬜** |

**Legenda:**

- ✅ 90-100%: Pronto para produção
- ⚠️ 70-89%: Quase pronto, revisar itens pendentes
- ❌ <70%: Precisa de mais trabalho

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Problema: 404 Not Found

**Possíveis causas:**

- [ ] ROOT_PATH não configurado
- [ ] Rota não existe no backend
- [ ] Typo na URL

**Solução:**

```bash
# Verificar rotas disponíveis
curl https://api.wolknow.com/v1/docs
```

### Problema: CORS Error

**Possíveis causas:**

- [ ] ALLOWED_ORIGINS não inclui frontend
- [ ] Frontend usando HTTP em vez de HTTPS

**Solução:**

```bash
# Adicionar origin nas variáveis de ambiente
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,http://localhost:3000
```

### Problema: 500 Internal Server Error

**Possíveis causas:**

- [ ] Erro no código
- [ ] Banco de dados inacessível
- [ ] Variável de ambiente faltando

**Solução:**

```bash
# Verificar logs
# Digital Ocean → Apps → Logs
```

### Problema: Frontend não conecta

**Possíveis causas:**

- [ ] VITE_API_URL errado
- [ ] Build não foi feito após mudar variáveis
- [ ] Vercel não tem as variáveis configuradas

**Solução:**

1. Verificar variáveis no Vercel
2. Fazer novo deploy
3. Limpar cache do navegador

---

## 📞 SUPORTE

Se após completar o checklist ainda houver problemas:

1. **Verificar logs:** Digital Ocean → Apps → Logs
2. **Console do navegador:** F12 → Console
3. **Network tab:** F12 → Network → filtrar por "api.wolknow.com"
4. **Testar com Postman/Insomnia:** Para isolar problema frontend vs backend

---

**✅ BOA SORTE!** 🚀

Quando completar 100% do checklist, seu sistema estará pronto para produção!
