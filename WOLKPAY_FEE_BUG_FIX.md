# 🐛 Correção Crítica - WolkPay Enviando Valor Bruto ao Invés de Líquido

**Data:** 2026-01-20  
**Severidade:** CRÍTICA (Perda Financeira)  
**Status:** ✅ CORRIGIDO

---

## 📋 Problema Identificado

O sistema WolkPay estava enviando o valor **bruto** de crypto para o beneficiário ao invés do valor **líquido** (após descontar as taxas da plataforma).

### Exemplo Real (janiopresidente@gmail.com)

- **Fatura PIX recebido:** R$ 1.286,00
- **Cotação bruta:** ~239 USD
- **Taxa total:** 3.80% (3.65% serviço + 0.15% rede)
- **Valor líquido esperado:** ~231 USD
- **Valor enviado (ERRADO):** 239 USD ❌
- **Prejuízo:** ~8 USD (não cobrou a taxa!)

---

## 🔍 Análise Técnica

### Causa Raiz

No arquivo `wolkpay_service.py`, na função `approve_invoice()`, o sistema criava um `WolkPayTradeAdapter` usando diretamente `invoice.crypto_amount` (valor bruto):

```python
# CÓDIGO ANTIGO (BUG)
class WolkPayTradeAdapter:
    def __init__(self, invoice, wallet_addr, network):
        self.crypto_amount = invoice.crypto_amount  # ❌ BRUTO!
```

### Fluxo do Bug

1. Usuário cria fatura de 239 USDT (valor bruto)
2. Sistema calcula: líquido = 239 \* 0.962 = ~230 USDT
3. Sistema salva `beneficiary_receives_brl` corretamente
4. Pagador paga PIX de R$ 1.286
5. Webhook recebe confirmação
6. **BUG:** Sistema envia 239 USDT ao invés de ~230 USDT

---

## ✅ Correção Aplicada

### 1. Modelo `wolkpay.py`

Adicionado novo campo para rastreabilidade:

```python
# Valor que o beneficiário efetivamente recebe em CRYPTO
beneficiary_receives_crypto = Column(Numeric(28, 18), nullable=True)
```

### 2. Serviço `wolkpay_service.py`

#### Na criação da fatura (`create_invoice`):

```python
if fee_payer == FeePayer.PAYER:
    # Pagador paga taxas: beneficiário recebe valor cheio
    beneficiary_receives_crypto = request.crypto_amount
else:
    # Beneficiário paga taxas: desconta da crypto
    total_fee_percent = service_fee_percent + network_fee_percent
    beneficiary_receives_crypto = request.crypto_amount * (1 - total_fee_percent / 100)
```

#### Na aprovação (`approve_invoice`):

```python
# Prioridade 1: Usar campo beneficiary_receives_crypto
if invoice.beneficiary_receives_crypto:
    crypto_to_send = invoice.beneficiary_receives_crypto
# Prioridade 2: Calcular de beneficiary_receives_brl
elif invoice.beneficiary_receives_brl and invoice.usd_rate and invoice.brl_rate:
    crypto_to_send = invoice.beneficiary_receives_brl / (invoice.usd_rate * invoice.brl_rate)
# Fallback: Calcular com percentuais
else:
    total_fee_percent = service_fee_percent + network_fee_percent
    crypto_to_send = invoice.crypto_amount * (1 - total_fee_percent / 100)

# Adapter agora usa valor LÍQUIDO
trade_adapter = WolkPayTradeAdapter(invoice, wallet_address, network, crypto_to_send)
```

---

## 📁 Arquivos Modificados

| Arquivo                                                        | Modificação                            |
| -------------------------------------------------------------- | -------------------------------------- |
| `backend/app/models/wolkpay.py`                                | + Campo `beneficiary_receives_crypto`  |
| `backend/app/services/wolkpay_service.py`                      | + Cálculo de crypto líquida na criação |
| `backend/app/services/wolkpay_service.py`                      | + Uso de valor líquido na aprovação    |
| `alembic/versions/20260120_add_beneficiary_receives_crypto.py` | Migration para novo campo              |

---

## 🚀 Deploy em Produção

### Passo 1: Aplicar Migration

```bash
# Opção A: Via Alembic
cd backend
alembic upgrade head

# Opção B: SQL Direto (se Alembic não funcionar)
psql -d holdwallet -f add_beneficiary_receives_crypto.sql
```

### Passo 2: Reiniciar Backend

```bash
# Via systemd
sudo systemctl restart holdwallet-backend

# Via Docker
docker-compose restart backend
```

### Passo 3: Verificar Logs

Após deploy, os logs devem mostrar:

```
💰 WolkPay: Fee payer = BENEFICIARY, usando beneficiary_receives_crypto: 230.42 (bruto era 239.50)
🚀 WolkPay: Enviando 230.42 USDT (líquido) para 0x...
```

---

## ⚠️ Ações Pendentes

### Para Faturas Existentes (Não Aprovadas)

O migration atualiza faturas existentes calculando `beneficiary_receives_crypto`:

- Se `fee_payer = PAYER`: mantém valor bruto
- Se `fee_payer = BENEFICIARY`: calcula desconto

### Para Faturas Já Pagas Incorretamente

Identificar faturas COMPLETED onde foi enviado valor incorreto:

```sql
SELECT
    invoice_number,
    beneficiary_id,
    crypto_amount as bruto,
    beneficiary_receives_crypto as liquido_esperado,
    (crypto_amount - beneficiary_receives_crypto) as taxa_nao_cobrada
FROM wolkpay_invoices
WHERE status = 'COMPLETED'
  AND fee_payer = 'BENEFICIARY'
  AND crypto_sent_at < '2026-01-20 XX:XX:XX'  -- Antes do fix
ORDER BY crypto_sent_at DESC;
```

---

## 📊 Cálculo das Taxas

| Variável        | Valor Padrão |
| --------------- | ------------ |
| Taxa de Serviço | 3.65%        |
| Taxa de Rede    | 0.15%        |
| **Total**       | **3.80%**    |

### Fórmula

```
crypto_liquida = crypto_bruta × (1 - taxa_total / 100)
crypto_liquida = crypto_bruta × 0.962
```

### Exemplo

```
Bruto: 239.50 USDT
Líquido: 239.50 × 0.962 = 230.399 USDT
Taxa HOLD: 9.101 USDT (~R$ 49)
```

---

## ✅ Validação

Após deploy, fazer teste com valor pequeno:

1. Criar fatura de 10 USDT
2. Verificar que sistema mostra: "Você receberá ~9.62 USDT"
3. Pagar o PIX
4. Verificar que a TX blockchain envia exatamente 9.62 USDT

---

**Corrigido por:** GitHub Copilot  
**Data da correção:** 2026-01-20
