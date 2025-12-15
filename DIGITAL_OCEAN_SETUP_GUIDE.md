# 🚀 Guia de Setup de Variáveis de Ambiente no Digital Ocean

## 📋 Pré-requisitos

- Acesso ao Dashboard do Digital Ocean
- App Platform ativo (Droplet ou App)
- Acesso ao banco de dados PostgreSQL no Digital Ocean

---

## 🔧 Método 1: Via Digital Ocean App Platform (RECOMENDADO)

### Passo 1: Acessar o Digital Ocean Dashboard

1. Vá para [https://cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Faça login com suas credenciais
3. No menu lateral, clique em **Apps** → **Your Apps**
4. Selecione sua aplicação (ex: `hold-wallet-backend`)

### Passo 2: Acessar o Editor de Variáveis de Ambiente

1. Na página da app, clique em **Settings** (ou ⚙️)
2. No menu esquerdo, clique em **Environment Variables**
3. Clique em **Edit** (lápis) ou **Add Environment Variables**

### Passo 3: Inserir as Variáveis

Copie e cole cada linha abaixo no Digital Ocean:

```
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD_HERE@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
SECRET_KEY=EQdrBj2LpJJA2_PQRQzR14q75V50mc3m10dJVriqr7Q
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=
TRANSFBANK_WEBHOOK_SECRET=
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
ROOT_PATH=v1
COINGECKO_API_KEY=
POLYGONSCAN_API_KEY=
ETHERSCAN_API_KEY=
BSCSCAN_API_KEY=
BTC_API_URL=https://blockstream.info/api
```

### Passo 4: Atualizar Variáveis Críticas ⚠️

Você **DEVE** atualizar estas variáveis:

| Variável             | Valor Atual          | O que fazer                                                                           |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | `YOUR_PASSWORD_HERE` | **SUBSTITUA** pela senha real do PostgreSQL                                           |
| `SECRET_KEY`         | `EQdrBj2L...`        | **GERE uma nova** com: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `TRANSFBANK_API_KEY` | Vazio                | **Preencha** se usar TransfBank (senão deixe vazio)                                   |
| `SMTP_USER`          | Vazio                | **Preencha** se quiser enviar emails (senão deixe vazio)                              |
| `SMTP_PASSWORD`      | Vazio                | **Preencha** se quiser enviar emails                                                  |

### Passo 5: Salvar e Deploy

1. Clique em **Save** (botão azul)
2. O Digital Ocean vai pedir confirmação: clique em **Redeploy Application**
3. Aguarde o deployment (isso pode levar 5-10 minutos)
4. Verifique o status em **Deployments**

---

## 🔧 Método 2: Via SSH (Para Droplets)

Se você está usando um **Droplet** (não App Platform):

### Passo 1: Conectar via SSH

```bash
ssh root@SEU_IP_DO_DROPLET
```

### Passo 2: Criar/Editar o arquivo .env

```bash
nano /path/to/app/.env.production
```

### Passo 3: Colar as variáveis

Copie todo o conteúdo do arquivo `.env.production` e cole no editor.

### Passo 4: Salvar

- Pressione `Ctrl + X`
- Pressione `Y` (Yes)
- Pressione `Enter`

### Passo 5: Reiniciar a aplicação

```bash
# Se usando Docker
docker restart your_backend_container

# Se usando systemd
sudo systemctl restart backend

# Se usando Supervisor
sudo supervisorctl restart backend
```

---

## 📝 Checklist de Segurança

- [ ] `DATABASE_URL` foi atualizada com a senha real
- [ ] `SECRET_KEY` foi regenerada (não use a padrão em produção!)
- [ ] `TRANSFBANK_API_KEY` e `TRANSFBANK_WEBHOOK_SECRET` foram preenchidas ou deixadas vazias
- [ ] `SMTP_USER` e `SMTP_PASSWORD` foram configuradas corretamente
- [ ] `ALLOWED_ORIGINS` inclui todos os domínios do seu frontend
- [ ] `DEBUG=false` em produção
- [ ] `ENVIRONMENT=production` está definido

---

## 🔍 Verificar se as Variáveis foram Inseridas Corretamente

### Via Digital Ocean Dashboard

1. Vá para **Settings** → **Environment Variables**
2. Verifique se todas as variáveis aparecem (valores sensíveis estarão mascarados com `***`)

### Via SSH (em um Droplet)

```bash
# Listar todas as variáveis
cat /path/to/app/.env.production

# Ou verificar variáveis específicas
grep "DATABASE_URL" /path/to/app/.env.production
```

### Via Logs da Aplicação

```bash
# Acompanhar os logs
docker logs -f your_backend_container

# Ou se usar systemd
journalctl -u backend -f
```

Procure por mensagens como:

- ✅ `Database connection successful`
- ✅ `Redis connected`
- ✅ `Server running on port 8000`

---

## 🚨 Troubleshooting

### "Environment variable not found"

- Verifique se você clicou em **Save**
- Verifique se você fez **Redeploy Application**
- Aguarde a aplicação reiniciar (leva alguns minutos)

### "Database connection refused"

- Verifique se `DATABASE_URL` tem a senha correta
- Verifique se o IP do Droplet está na whitelist do banco de dados
- Tente: `psql postgresql://doadmin:password@host:25060/defaultdb`

### "Redis connection timeout"

- Se você está usando Redis remoto, atualize `REDIS_URL`
- Se você está usando Redis local, verifique se está rodando: `redis-cli ping`

### "Cannot connect to frontend"

- Verifique se `ALLOWED_ORIGINS` inclui o domínio do seu frontend
- Verifique se `FRONTEND_URL` está correto
- Reinicie a aplicação após mudanças no CORS

---

## 📚 Recursos Úteis

- [Digital Ocean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Digital Ocean Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
- [PostgreSQL Connection String Format](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

## 💡 Dicas Importantes

1. **Nunca commite `.env.production` no Git!** (Já está no `.gitignore`)
2. **Gere novas chaves em produção** - Não use as do desenvolvimento
3. **Teste antes de fazer deploy** - Use um ambiente de staging
4. **Monitore os logs** após o deployment
5. **Faça backup** das variáveis sensíveis em um local seguro

---

**Última atualização:** 14 de dezembro de 2025
**Status:** ✅ Pronto para produção
