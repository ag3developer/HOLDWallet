# Migração de Créditos de Investidores para Produção

Script Python para gerenciar créditos de investidores no banco de dados de produção (PostgreSQL DigitalOcean).

## Requisitos

- Python 3.9+
- Credenciais de banco no arquivo `.env`
- Acesso ao banco de dados PostgreSQL de produção

## Instalação

```bash
pip install sqlalchemy python-dotenv psycopg2-binary
```

## Uso

### 1. Testar conexão com o banco

```bash
python scripts/migrate_investor_credits_prod.py test
```

Resultado esperado:

```
✅ Conexão com banco de dados estabelecida
```

### 2. Criar as tabelas (primeira vez apenas)

```bash
python scripts/migrate_investor_credits_prod.py setup
```

Cria:

- `earnpool_virtual_credits` - Tabela de créditos virtuais
- `earnpool_performance_fees` - Tabela de taxas de performance
- Índices para otimização de queries

### 3. Adicionar crédito virtual para um investidor

```bash
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --amount 2779.00 \
  --reason INVESTOR_CORRECTION \
  --notes "Investidor João Silva - Operações Passadas"
```

**Parâmetros:**

- `--user-id` (obrigatório): UUID do usuário
- `--amount` (obrigatório): Montante em USDT
- `--reason` (opcional): Motivo (padrão: INVESTOR_CORRECTION)
  - `INVESTOR_CORRECTION` - Correção de investidor
  - `MISSING_DEPOSIT` - Depósito faltante
  - `OTHER` - Outro
- `--notes` (opcional): Observações internas
- `--admin-id` (opcional): UUID do admin. Se não informado, usa primeiro admin do banco

### 4. Adicionar taxa de performance

```bash
python scripts/migrate_investor_credits_prod.py add-fee \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --base-amount 2779.00 \
  --performance 0.35 \
  --period "Operações Passadas 2024"
```

**Parâmetros:**

- `--user-id` (obrigatório): UUID do usuário
- `--base-amount` (obrigatório): Base em USDT para cálculo
- `--performance` (obrigatório): Percentual (ex: 0.35 = 0.35%)
- `--period` (opcional): Descrição do período (padrão: "Operações Passadas")
- `--admin-id` (opcional): UUID do admin

**Resultado:**

- Cria registro em `earnpool_performance_fees`
- Cria automaticamente crédito virtual associado com o valor calculado
- Ambos começam a gerar rendimentos semanais

### 5. Verificar totais de um investidor

```bash
python scripts/migrate_investor_credits_prod.py get-totals \
  --user-id "550e8400-e29b-41d4-a716-446655440000"
```

**Saída:**

```
Totais para 550e8400-e29b-41d4-a716-446655440000:
  total_virtual_credits_usdt: $2779.00
  total_performance_fees_usdt: $9.73
  total_investor_balance_usdt: $2788.73
```

## Exemplo Completo: Creditando um Investidor

### Passo 1: Testar conexão

```bash
python scripts/migrate_investor_credits_prod.py test
```

### Passo 2: Criar tabelas (se não existem)

```bash
python scripts/migrate_investor_credits_prod.py setup
```

### Passo 3: Adicionar crédito virtual de 2.779 USDT

```bash
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --amount 2779.00 \
  --notes "João Silva - Investidor X - Operações 2024"
```

### Passo 4: Adicionar taxa de performance de 0.35%

```bash
python scripts/migrate_investor_credits_prod.py add-fee \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --base-amount 2779.00 \
  --performance 0.35 \
  --period "Operações 2024"
```

### Passo 5: Verificar resultado

```bash
python scripts/migrate_investor_credits_prod.py get-totals \
  --user-id "550e8400-e29b-41d4-a716-446655440000"
```

Resultado esperado:

```
Totais para 550e8400-e29b-41d4-a716-446655440000:
  total_virtual_credits_usdt: $2788.73  (2779 + 9.73)
  total_performance_fees_usdt: $9.73    (2779 * 0.35 / 100)
  total_investor_balance_usdt: $2788.73
```

## Logs

Todos os logs são salvos em `migrate_investor_credits.log` e também exibidos no console.

Exemplo de log:

```
2026-02-26 20:15:30,123 - __main__ - INFO - Conectando ao banco: app-1265fb66...
2026-02-26 20:15:31,456 - __main__ - INFO - ✅ Conexão com banco de dados estabelecida
2026-02-26 20:15:32,789 - __main__ - INFO - ✅ Crédito virtual criado: 2779.00 USDT para 550e8400-e29b-41d4-a716-446655440000
```

## Validações

O script valida:

- ✅ Formato UUID do user_id e admin_id
- ✅ Montantes > 0
- ✅ Percentuais entre 0-100%
- ✅ Usuário existe no banco
- ✅ Admin existe no banco (se não informado, usa primeiro admin)
- ✅ Conexão com banco de dados

## Segurança

- 🔐 Credenciais vêm do `.env` (não hardcoded)
- 🔒 Arquivo `.env` está no `.gitignore`
- 🛡️ Usa PREPARED STATEMENTS (proteção contra SQL injection)
- 📝 Audit trail: cada crédito registra admin_id e created_at

## Troubleshooting

### Erro: "DATABASE_URL not found in .env"

```bash
# Verificar se .env existe
cat backend/.env | grep DATABASE_URL
```

### Erro: "Nenhum admin encontrado no banco"

```bash
# Fornecer UUID do admin manualmente
python scripts/migrate_investor_credits_prod.py add-credit \
  --user-id "550e8400..." \
  --amount 2779 \
  --admin-id "11111111-1111-1111-1111-111111111111"
```

### Erro: "UUID inválido"

```bash
# Verificar formato UUID (com hífens)
# Correto: 550e8400-e29b-41d4-a716-446655440000
# Incorreto: 550e8400e29b41d4a716446655440000
```

## API Correspondente

Os dados inseridos por este script podem ser consultados na API do backend:

```bash
# Obter créditos de um investidor
curl -X GET "http://localhost:8000/admin/earnpool/investor/550e8400-e29b-41d4-a716-446655440000/credits" \
  -H "Authorization: Bearer <token>"
```

Resposta:

```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "virtual_credits": [
    {
      "id": "...",
      "usdt_amount": 2779.0,
      "reason": "INVESTOR_CORRECTION",
      "created_at": "2026-02-26T20:15:32"
    }
  ],
  "performance_fees": [
    {
      "id": "...",
      "fee_amount_usdt": 9.73,
      "performance_percentage": 0.35
    }
  ],
  "total_virtual_credits_usdt": 2788.73,
  "total_performance_fees_usdt": 9.73,
  "total_investor_balance_usdt": 2788.73
}
```

## Próximos Passos

Após inserir os créditos:

1. **Frontend Admin**: Acesse `/admin/earnpool` → "Créditos de Investidores"
2. **Buscar investidor**: Digite o UUID e clique em "Buscar"
3. **Verificar saldo**: Deve aparecer os créditos criados
4. **Renderização**: Os créditos começam a gerar rendimentos semanais (~0.75%)

---

**Versão**: 1.0  
**Data**: 26 de fevereiro de 2026  
**Ambiente**: Produção (PostgreSQL DigitalOcean)
