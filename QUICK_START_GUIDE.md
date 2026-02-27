# 🎉 PRONTO PARA PRODUÇÃO - GUIA RÁPIDO

## ⚡ INÍCIO RÁPIDO (5 minutos)

### 1️⃣ Testar

```bash
cd backend
python scripts/migrate_investor_credits_prod.py test
```

### 2️⃣ Setup (Primeira vez)

```bash
python scripts/migrate_investor_credits_prod.py setup
```

### 3️⃣ Adicionar Investidor (Exemplo: João Silva)

```bash
# Crédito Virtual: 2.779 USDT
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --amount 2779.00 \
  --notes "João Silva"

# Taxa de Performance: 0.35% = 9,73 USDT
python scripts/migrate_investor_credits_prod.py add-fee \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --base-amount 2779.00 \
  --performance 0.35
```

### 4️⃣ Verificar

```bash
python scripts/migrate_investor_credits_prod.py get-totals \
  --user-id "550e8400-e29b-41d4-a716-446655440000"
```

### 5️⃣ Conferir no Frontend

- Acesse: `http://localhost:3000/admin/earnpool`
- Clique em: "Créditos de Investidores"
- Digite UUID e clique "Buscar"

---

## 📋 PARÂMETROS

| Comando      | Parâmetros                                                              |
| ------------ | ----------------------------------------------------------------------- |
| `test`       | Nenhum                                                                  |
| `setup`      | Nenhum                                                                  |
| `add-credit` | `--user-id`, `--amount`, `--reason`, `--notes`, `--admin-id`            |
| `add-fee`    | `--user-id`, `--base-amount`, `--performance`, `--period`, `--admin-id` |
| `get-totals` | `--user-id`                                                             |

---

## 🔑 OBRIGATÓRIOS vs OPCIONAIS

```
add-credit:
  ✅ --user-id         (OBRIGATÓRIO)
  ✅ --amount          (OBRIGATÓRIO)
  ❌ --reason          (opcional: padrão INVESTOR_CORRECTION)
  ❌ --notes           (opcional)
  ❌ --admin-id        (opcional: usa primeiro admin se não informado)

add-fee:
  ✅ --user-id         (OBRIGATÓRIO)
  ✅ --base-amount     (OBRIGATÓRIO)
  ✅ --performance     (OBRIGATÓRIO)
  ❌ --period          (opcional: padrão "Operações Passadas")
  ❌ --admin-id        (opcional)

get-totals:
  ✅ --user-id         (OBRIGATÓRIO)
```

---

## 📁 ARQUIVOS

| Arquivo          | Localização                                          | Descrição      |
| ---------------- | ---------------------------------------------------- | -------------- |
| Script Principal | `backend/scripts/migrate_investor_credits_prod.py`   | 400+ linhas    |
| README           | `backend/scripts/MIGRATE_INVESTOR_CREDITS_README.md` | Guia completo  |
| Exemplo          | `backend/scripts/example_migrate_investor.sh`        | Script pronto  |
| Resumo           | `INVESTOR_CREDITS_PRODUCTION_READY.md`               | Este documento |

---

## ✅ CHECKLIST

- [ ] Conectado ao banco de produção
- [ ] Tabelas criadas
- [ ] Admin logado no painel
- [ ] UUID do investidor correto
- [ ] Crédito adicionado
- [ ] Performance fee adicionada (se aplicável)
- [ ] Saldos verificados
- [ ] Frontend mostrando valores corretos

---

## 🔗 RELAÇÃO DE COMPONENTES

```
Migration Script ←→ PostgreSQL DigitalOcean ←→ Backend API ←→ React Frontend
    (Python)                (Produção)        (FastAPI)      (TypeScript)
```

---

## 📊 EXEMPLO COMPLETO

**Investidor:** João Silva  
**UUID:** `550e8400-e29b-41d4-a716-446655440000`

### Dados Inseridos:

- Crédito Virtual: 2.779 USDT
- Performance Fee: 9,73 USDT (0.35%)
- **Total**: 2.788,73 USDT

### Resultado no Banco:

```
earnpool_virtual_credits:
  id: <uuid>
  user_id: 550e8400-e29b-41d4-a716-446655440000
  usdt_amount: 2779.00
  reason: INVESTOR_CORRECTION
  created_at: 2026-02-26 20:15:32

earnpool_performance_fees:
  id: <uuid>
  user_id: 550e8400-e29b-41d4-a716-446655440000
  base_amount_usdt: 2779.00
  performance_percentage: 0.35
  fee_amount_usdt: 9.73
  created_at: 2026-02-26 20:15:33
```

### Frontend (Admin):

```
Créditos Atuais do Investidor
- Créditos Virtuais: $2.788,73
- Taxas de Performance: $9,73
- Total em Custódia: $2.788,73
```

---

## 🎯 COMANDOS DO DIA A DIA

```bash
# Investidor novo
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "..." \
  --amount ... \
  --notes "Nome do Investidor"

# Com taxa de performance
python scripts/migrate_investor_credits_prod.py add-fee \
  --user-id "..." \
  --base-amount ... \
  --performance 0.35

# Verificar saldo
python scripts/migrate_investor_credits_prod.py get-totals --user-id "..."
```

---

## 🆘 PROBLEMAS COMUNS

| Problema                | Solução                                              |
| ----------------------- | ---------------------------------------------------- |
| Connection refused      | Verificar `.env` e VPN/Firewall                      |
| UUID inválido           | Usar formato: `550e8400-e29b-41d4-a716-446655440000` |
| Nenhum admin encontrado | Adicionar `--admin-id "..."` manualmente             |
| Valores não aparecem    | Verificar timezone do servidor vs local              |

---

## 📈 PRÓXIMOS RENDIMENTOS

Uma vez creditados, os saldos:

- ✅ Geram rendimentos semanais (~0.75%)
- ✅ Aparecem no EarnPool do usuário
- ✅ Podem ser sacados após lock period
- ✅ Contribuem para tier leveling

---

## 🔐 CREDENCIAIS

Todas vêm do `.env`:

```env
DATABASE_URL=postgresql://...@app-...do-user-...
```

✅ Seguro (não hardcoded)  
✅ No `.gitignore`  
✅ Produção

---

## 📞 DOCUMENTAÇÃO COMPLETA

- **Guia Detalhado**: `backend/scripts/MIGRATE_INVESTOR_CREDITS_README.md`
- **Código Fonte**: `backend/scripts/migrate_investor_credits_prod.py`
- **Este Guia**: `QUICK_START_GUIDE.md`

---

## ⚙️ FLUXO TÉCNICO

```
1. Script lê .env
2. Conecta PostgreSQL (SSL)
3. Valida UUIDs e valores
4. Insere em 2 tabelas (se fee)
5. Executa transação
6. Retorna logs
7. Frontend carrega via API
8. Admin vê interface
9. Usuário vê no EarnPool
10. Rendimentos gerados semanalmente
```

---

**Status**: ✅ **PRONTO**  
**Versão**: 1.0  
**Data**: 26 de fevereiro de 2026
