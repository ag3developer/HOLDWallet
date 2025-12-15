# 📊 SUMÁRIO: Variáveis de Ambiente - Digital Ocean

## 📍 Localização dos Arquivos

```
HOLDWallet/
├── backend/
│   └── .env.production              ← Arquivo principal com todas as variáveis
├── ENV_COPY_PASTE.md                ← Copiar e colar direto (RECOMENDADO)
├── DIGITAL_OCEAN_SETUP_GUIDE.md     ← Guia passo a passo completo
├── generate_env.sh                  ← Script para gerar variáveis
└── VARIAVEIS_PRODUCAO_RESUMO.md    ← Este arquivo
```

---

## 🚀 PASSO A PASSO RÁPIDO (5 minutos)

### 1. Gerar novas chaves de segurança

```bash
# Gere um novo SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Resultado: xK9_vM2pL5qR8sT3uW6yZ1aB4cD7eF0gH3iJ6kL9m
```

### 2. Preparar DATABASE_URL

- Vá para Digital Ocean → Databases
- Copie a conexão PostgreSQL
- Coloque no lugar de `YOUR_PASSWORD_HERE`

**Exemplo final:**

```
postgresql://doadmin:minhaSenha123@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
```

### 3. Copiar para Digital Ocean

1. Digital Ocean Dashboard → Apps → Sua App
2. Settings → Environment Variables → Edit
3. Copie o conteúdo de `ENV_COPY_PASTE.md`
4. Cole aqui e substitua os placeholders
5. Clique em Save → Redeploy Application

---

## 📋 Todas as Variáveis (29 no total)

| #   | Variável                  | Valor                     | Status           | Tipo        |
| --- | ------------------------- | ------------------------- | ---------------- | ----------- |
| 1   | ENVIRONMENT               | production                | ✅ Fixo          | Obrigatório |
| 2   | DEBUG                     | false                     | ✅ Fixo          | Obrigatório |
| 3   | LOG_LEVEL                 | info                      | ✅ Fixo          | Obrigatório |
| 4   | DATABASE_URL              | postgresql://...          | ⚠️ **ATUALIZAR** | Crítico     |
| 5   | SECRET_KEY                | (gerar novo)              | ⚠️ **ATUALIZAR** | Crítico     |
| 6   | JWT_ALGORITHM             | HS256                     | ✅ Fixo          | Obrigatório |
| 7   | JWT_EXPIRATION_HOURS      | 24                        | ✅ Fixo          | Obrigatório |
| 8   | ALLOWED_ORIGINS           | https://hold-wallet...    | ✅ Fixo          | Obrigatório |
| 9   | FRONTEND_URL              | https://hold-wallet...    | ✅ Fixo          | Obrigatório |
| 10  | ETHEREUM_RPC_URL          | https://eth.drpc.org      | ✅ Fixo          | Obrigatório |
| 11  | POLYGON_RPC_URL           | https://polygon-rpc.com   | ✅ Fixo          | Obrigatório |
| 12  | BSC_RPC_URL               | https://bsc-dataseed...   | ✅ Fixo          | Obrigatório |
| 13  | TRANSFBANK_ENABLED        | false                     | ✅ Fixo          | Opcional    |
| 14  | TRANSFBANK_API_URL        | https://api.transfbank... | ✅ Fixo          | Opcional    |
| 15  | TRANSFBANK_API_KEY        | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 16  | TRANSFBANK_WEBHOOK_SECRET | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 17  | SMTP_ENABLED              | false                     | ✅ Fixo          | Opcional    |
| 18  | SMTP_HOST                 | smtp.gmail.com            | ✅ Fixo          | Opcional    |
| 19  | SMTP_PORT                 | 587                       | ✅ Fixo          | Opcional    |
| 20  | SMTP_USER                 | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 21  | SMTP_PASSWORD             | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 22  | REDIS_URL                 | redis://localhost:6379/0  | ✅ Fixo          | Obrigatório |
| 23  | CELERY_BROKER_URL         | redis://localhost:6379/1  | ✅ Fixo          | Obrigatório |
| 24  | CELERY_RESULT_BACKEND     | redis://localhost:6379/2  | ✅ Fixo          | Obrigatório |
| 25  | ROOT_PATH                 | v1                        | ✅ Fixo          | Obrigatório |
| 26  | COINGECKO_API_KEY         | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 27  | POLYGONSCAN_API_KEY       | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 28  | ETHERSCAN_API_KEY         | (vazio)                   | ⏭️ Se necessário | Opcional    |
| 29  | BSCSCAN_API_KEY           | (vazio)                   | ⏭️ Se necessário | Opcional    |

**Legenda:**

- ✅ **Fixo** = Não precisa mudar (já está correto)
- ⚠️ **ATUALIZAR** = Você DEVE atualizar antes de fazer deploy
- ⏭️ **Se necessário** = Deixe vazio ou preencha conforme necessário

---

## ⚠️ CHECKLIST OBRIGATÓRIO

Antes de fazer o redeploy no Digital Ocean:

- [ ] `DATABASE_URL` foi atualizada com a senha real do PostgreSQL
- [ ] `SECRET_KEY` foi regenerada (use o comando Python acima)
- [ ] `ALLOWED_ORIGINS` inclui o domínio do seu frontend
- [ ] `DEBUG=false` em produção
- [ ] `ENVIRONMENT=production`
- [ ] Arquivo `.env.production` **NÃO** foi commitado no Git
- [ ] Redis está rodando ou configurado remotamente
- [ ] Banco de dados PostgreSQL está acessível

---

## 🔍 COMO USAR CADA ARQUIVO

### `ENV_COPY_PASTE.md` (Recomendado)

```
✅ Use este para copiar e colar direto no Digital Ocean
✅ Tem instruções passo a passo
✅ Mostra o que copiar exatamente
```

### `DIGITAL_OCEAN_SETUP_GUIDE.md` (Detalhado)

```
✅ Guia completo com screenshots
✅ Troubleshooting incluído
✅ Múltiplos métodos de deployment
```

### `generate_env.sh` (Automático)

```bash
# Execute no terminal:
bash generate_env.sh

# Ele vai:
# 1. Gerar novo SECRET_KEY
# 2. Pedir a senha do PostgreSQL
# 3. Criar arquivo com todas as variáveis
# 4. Mostrar o que copiar
```

### `backend/.env.production` (Arquivo original)

```
✅ Arquivo que você vai usar no seu repositório
✅ Nunca commitar! (já está no .gitignore)
✅ Template para referência
```

---

## 🌐 Exemplo de Uso Prático

### Seu Frontend está em:

```
https://hold-wallet-deaj.vercel.app
```

### Seu Backend vai estar em:

```
https://api.wolknow.com/api/v1
```

### Database está em:

```
postgresql://doadmin:SENHA@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
```

---

## 🔐 Segurança - Boas Práticas

1. **Nunca commite `.env.production`**

   ```bash
   # Já está no .gitignore:
   echo "backend/.env.production" >> .gitignore
   ```

2. **Use secrets do Digital Ocean**

   - Não coloque valores sensíveis no código
   - Use Environment Variables apenas

3. **Regenere chaves em produção**

   - Nunca use a mesma chave do desenvolvimento
   - Gere novo SECRET_KEY para cada ambiente

4. **Monitore os logs**
   ```bash
   # Depois do deploy, verifique:
   # Digital Ocean → Apps → Sua App → Logs
   ```

---

## 📞 Comandos Úteis

### Gerar novo SECRET_KEY

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Testar conexão com PostgreSQL

```bash
psql postgresql://doadmin:SENHA@host:25060/defaultdb
```

### Verificar variáveis localmente

```bash
# Se tiver arquivo .env.production localmente:
cat backend/.env.production
```

### Ver logs no Digital Ocean

```bash
# Via SSH no droplet:
ssh root@seu-droplet-ip
docker logs -f seu-backend-container
```

---

## ✅ Próximas Etapas

1. **Gerar novas chaves**

   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Preparar DATABASE_URL**

   - Digital Ocean Databases → Connection details

3. **Copiar variáveis**

   - Use `ENV_COPY_PASTE.md`

4. **Fazer Deploy**

   - Digital Ocean Dashboard → Apps → Redeploy

5. **Monitorar**
   - Verificar logs após o deploy
   - Testar endpoints da API

---

**Versão:** 1.0
**Data:** 14 de dezembro de 2025
**Status:** ✅ Pronto para usar em produção
