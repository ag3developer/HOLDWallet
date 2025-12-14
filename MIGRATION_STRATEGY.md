# 📋 ESTRATÉGIA COMPLETA DE MIGRAÇÃO DE BANCO DE DADOS

**Data**: 14 de Dezembro de 2025  
**Status**: ✅ Pronto para Implementação  
**Origem**: SQLite Local  
**Destino**: PostgreSQL DigitalOcean (Produção)

---

## 📊 SUMMARY EXECUTIVO

### Estado Atual

- **Banco Local**: `holdwallet.db` (108 KB - backup)
- **Banco Remoto**: PostgreSQL DigitalOcean (conectado ✅)
- **Tabelas Identificadas**: 4
- **Dados a Migrar**: 0 linhas (banco de testes vazio)
- **Status**: Pronto para migração quando houver dados reais

### Tabelas para Migrar

```
┌─────────────┬───────┬──────────┬────────────┐
│   Tabela    │ Linhas│ Colunas  │ Dependências
├─────────────┼───────┼──────────┼────────────┤
│ users       │   0   │    9     │ Nenhuma
│ wallets     │   0   │   10     │ users
│ addresses   │   0   │   10     │ wallets
│ transactions│   0   │   13     │ addresses
└─────────────┴───────┴──────────┴────────────┘
```

---

## 🔄 ORDEM DE MIGRAÇÃO

### Fase 1: Tabelas Base (Sem Dependências)

1. **users** - Contém contas e perfis de usuários
   - 9 colunas
   - Sem foreign keys externas
   - **Prioridade**: ⭐⭐⭐ CRÍTICA

### Fase 2: Tabelas de Wallet (Dependem de users)

2. **wallets** - Carteiras de criptomoedas
   - 10 colunas
   - Foreign key: users.id
   - **Prioridade**: ⭐⭐⭐ CRÍTICA

### Fase 3: Endereços (Dependem de wallets)

3. **addresses** - Endereços de blockchain
   - 10 colunas
   - Foreign key: wallets.id
   - **Prioridade**: ⭐⭐ ALTA

### Fase 4: Transações (Dependem de addresses)

4. **transactions** - Histórico de transações
   - 13 colunas
   - Foreign key: addresses.id
   - **Prioridade**: ⭐⭐ ALTA

---

## 🛠️ FERRAMENTAS CRIADAS

Três scripts Python foram criados para automizar o processo:

### 1️⃣ MIGRATION_ANALYSIS.py

**O quê faz**: Analisa o banco local e gera relatório detalhado

```bash
python3 MIGRATION_ANALYSIS.py
```

**Output**:

- Lista todas as tabelas
- Conta linhas por tabela
- Identifica foreign keys e dependências
- Gera `MIGRATION_REPORT.md`

**Resultado Atual**:

```
✅ 4 tabelas identificadas
✅ 0 linhas totais (banco vazio)
✅ Ordem de migração determinada
✅ Relatório gerado
```

---

### 2️⃣ MIGRATION_SCRIPT.py

**O quê faz**: Gera script SQL para migrar dados

```bash
python3 MIGRATION_SCRIPT.py
```

**Output**:

- Gera `MIGRATION_DATA.sql`
- Contém INSERT statements para cada linha
- Ordena conforme dependências
- Pronto para executar em PostgreSQL

**Exemplo de Output**:

```sql
-- ============================================================================
-- Tabela: users (0 linhas)
-- ============================================================================
TRUNCATE TABLE users CASCADE;
-- Tabela vazia, nada a migrar

-- ============================================================================
-- Tabela: wallets (0 linhas)
-- ============================================================================
TRUNCATE TABLE wallets CASCADE;
-- Tabela vazia, nada a migrar
```

---

### 3️⃣ MIGRATION_VALIDATE.py

**O quê faz**: Valida que os dados foram migrados corretamente

```bash
python3 MIGRATION_VALIDATE.py
```

**Verifica**:

- Conecta ao PostgreSQL remoto
- Compara contagem de linhas
- Identifica discrepâncias
- Gera `MIGRATION_VALIDATION.md`

---

## 📋 CHECKLIST DE MIGRAÇÃO

### ✅ PRÉ-MIGRAÇÃO

- [x] Analisar banco local: **DONE**
- [x] Identificar tabelas: **4 tabelas**
- [x] Mapear dependências: **DONE**
- [ ] Backup do banco local: **TODO**
- [ ] Backup do banco remoto: **TODO**

### ✅ MIGRAÇÃO

- [ ] Gerar script SQL: `python3 MIGRATION_SCRIPT.py`
- [ ] Review do script gerado: **MANUAL**
- [ ] Executar em PostgreSQL:
  ```bash
  psql -U holdwallet-db \
    -h app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com \
    -d defaultdb \
    -c "SET sslmode=require" < MIGRATION_DATA.sql
  ```
- [ ] Confirmar execução

### ✅ PÓS-MIGRAÇÃO

- [ ] Validar contagem de linhas: `python3 MIGRATION_VALIDATE.py`
- [ ] Verificar integridade referencial: **MANUAL SQL**
- [ ] Testar login de usuários: **MANUAL**
- [ ] Testar P2P features: **MANUAL**
- [ ] Testar trading features: **MANUAL**

---

## 🔒 SEGURANÇA E BACKUPS

### Antes de Qualquer Migração

```bash
# 1. Backup do banco local
cp holdwallet.db holdwallet_backup_$(date +%Y%m%d_%H%M%S).db

# 2. Backup do banco remoto (via DigitalOcean console)
# Menu: Databases > holdwallet > Backups > Create Backup

# 3. Testar em staging (se disponível)
# Não migrar direto para produção!
```

### Durante a Migração

```bash
# Usar transação para segurança
BEGIN TRANSACTION;
-- executa MIGRATION_DATA.sql
COMMIT;  -- ou ROLLBACK se algo der errado
```

---

## 🚀 PRÓXIMAS AÇÕES

### Imediatamente (Hoje)

1. ✅ **Análise Completa**: DONE
2. ⏳ **Fazer Backups**: TODO
3. ⏳ **Gerar Script SQL**: TODO

### Quando Houver Dados Reais

1. Executar `MIGRATION_SCRIPT.py`
2. Review e testar script
3. Executar em PostgreSQL
4. Validar com `MIGRATION_VALIDATE.py`
5. Testar aplicação completa

### Pós-Migração

1. Monitorar erros no backend
2. Testar todos os endpoints
3. Verificar data integrity
4. Atualizar documentação

---

## 📊 ESTRUTURA DETALHADA DAS TABELAS

### Tabela: users

```
Colunas: 9
Índices: 4
Foreign Keys: 0
Linhas: 0

Estrutura esperada:
- id (INTEGER, PK)
- email (VARCHAR, UNIQUE)
- username (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- profile_photo (VARCHAR)
- bio (TEXT)
- is_active (BOOLEAN)
- created_at (DATETIME)
- updated_at (DATETIME)
```

### Tabela: wallets

```
Colunas: 10
Índices: 5
Foreign Keys: 1 (users.id)
Linhas: 0

Estrutura esperada:
- id (INTEGER, PK)
- user_id (INTEGER, FK→users)
- address (VARCHAR)
- blockchain (VARCHAR)
- balance (NUMERIC)
- is_active (BOOLEAN)
- created_at (DATETIME)
- updated_at (DATETIME)
- wallet_type (VARCHAR)
- metadata (JSON)
```

### Tabela: addresses

```
Colunas: 10
Índices: 5
Foreign Keys: 1 (wallets.id)
Linhas: 0

Estrutura esperada:
- id (INTEGER, PK)
- wallet_id (INTEGER, FK→wallets)
- address (VARCHAR, UNIQUE)
- label (VARCHAR)
- blockchain (VARCHAR)
- is_active (BOOLEAN)
- created_at (DATETIME)
- updated_at (DATETIME)
- balance (NUMERIC)
- transactions_count (INTEGER)
```

### Tabela: transactions

```
Colunas: 13
Índices: 8
Foreign Keys: 1 (addresses.id)
Linhas: 0

Estrutura esperada:
- id (INTEGER, PK)
- address_id (INTEGER, FK→addresses)
- tx_hash (VARCHAR, UNIQUE)
- from_address (VARCHAR)
- to_address (VARCHAR)
- amount (NUMERIC)
- currency (VARCHAR)
- status (VARCHAR)
- created_at (DATETIME)
- updated_at (DATETIME)
- block_number (INTEGER)
- gas_fee (NUMERIC)
- metadata (JSON)
```

---

## 🔧 COMANDOS ÚTEIS

### Verificar Status da Migração

```bash
# Conectar ao PostgreSQL usando environment variables
psql $DATABASE_URL

# Dentro do psql:
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM wallets;
SELECT COUNT(*) FROM addresses;
SELECT COUNT(*) FROM transactions;
```

### Listar Dados do SQLite Local

```bash
sqlite3 holdwallet.db
sqlite> SELECT * FROM users;
sqlite> SELECT * FROM wallets;
sqlite> SELECT COUNT(*) FROM transactions;
```

### Exportar para CSV (Se Necessário)

```bash
# SQLite
sqlite3 holdwallet.db
.mode csv
.output users.csv
SELECT * FROM users;

# Depois copiar CSV para PostgreSQL
psql ... -c "\COPY users FROM 'users.csv' WITH (FORMAT CSV);"
```

---

## ❓ FAQ

**P: O banco local tem dados reais?**  
R: Não, atualmente está vazio (0 linhas). Pronto para quando houver dados reais.

**P: Como saber quando executar a migração?**  
R: Execute `MIGRATION_ANALYSIS.py` para verificar. Se houver dados (linhas > 0), é hora de migrar.

**P: Posso testar antes de migrar para produção?**  
R: SIM! Execute em um banco de staging primeiro.

**P: E se algo der errado?**  
R: Execute ROLLBACK ou restore do backup. Por isso o MIGRATION_DATA.sql começa com TRUNCATE.

**P: Quanto tempo demora?**  
R: Com 0 linhas, é instantâneo. Com dados reais, depende da quantidade.

**P: Preciso parar a aplicação durante a migração?**  
R: SIM! Recomenda-se manutenção por 5-10 minutos.

---

## 📝 NOTAS IMPORTANTES

1. **Foreign Keys**: A ordem de migração respeita as dependências
2. **AUTO INCREMENT**: SQLite e PostgreSQL podem ter IDs diferentes
3. **TIMESTAMPS**: Verificar formato de data entre os bancos
4. **ENUMS**: Alguns dados podem estar em ENUM, checar conversão
5. **JSON**: PostgreSQL tem suporte melhor, verificar dados JSON

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs do PostgreSQL
2. Rodar MIGRATION_VALIDATE.py para diagnóstico
3. Comparar dados original vs migrado
4. Fazer rollback se necessário

---

**Gerado em**: 2025-12-14 14:02:17  
**Status**: ✅ Pronto para Implementação  
**Próxima Ação**: Aguardar dados reais ou executar teste completo
