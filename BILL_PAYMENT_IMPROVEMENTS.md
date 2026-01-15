# Bill Payment - Melhorias Implementadas

## Resumo das Implementacoes

### A) Endpoint de Timeline para Cliente

**Arquivo:** `/backend/app/routers/wolkpay_bill.py`

**Endpoint:** `GET /wolkpay/bill/payment/{payment_id}/timeline`

**Funcionalidades:**

- Timeline completa do pagamento com todas as etapas
- Logs detalhados de cada evento
- Informacoes de blockchain (TX hash, explorer URL, rede)
- Informacoes de pagamento bancario (autenticacao, comprovante, data)

**Exemplo de Response:**

```json
{
  "success": true,
  "payment_id": "uuid",
  "payment_number": "BP-20250127-001",
  "current_status": "paid",
  "timeline": [...],
  "logs": [
    {
      "event": "quote_created",
      "old_status": null,
      "new_status": "pending",
      "timestamp": "2025-01-27T10:00:00Z",
      "actor_type": "user",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "request_id": "uuid"
    }
  ],
  "blockchain": {
    "tx_hash": "0x...",
    "explorer_url": "https://polygonscan.com/tx/0x...",
    "network": "polygon",
    "debited_at": "2025-01-27T10:05:00Z"
  },
  "bank_payment": {
    "authentication": "ABC123",
    "receipt_url": "https://...",
    "paid_at": "2025-01-27T14:00:00Z"
  }
}
```

---

### B) Logs Melhorados com Auditoria

**Arquivos Modificados:**

- `/backend/app/models/wolkpay.py` - WolkPayBillPaymentLog
- `/backend/app/services/wolkpay_bill_service.py` - \_log_event()

**Novos Campos no Log:**

- `ip_address` - Endereco IP do cliente (IPv4/IPv6)
- `user_agent` - User-Agent do navegador/app
- `request_id` - ID unico da requisicao para rastreamento

**Migration:**

```sql
-- /backend/migrations/versions/add_log_audit_fields.sql
ALTER TABLE wolkpay_bill_payment_logs
ADD COLUMN ip_address VARCHAR(45) NULL;

ALTER TABLE wolkpay_bill_payment_logs
ADD COLUMN user_agent VARCHAR(500) NULL;

ALTER TABLE wolkpay_bill_payment_logs
ADD COLUMN request_id VARCHAR(36) NULL;
```

**Classe RequestContext:**

```python
@dataclass
class RequestContext:
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None

    @classmethod
    def from_request(cls, request) -> 'RequestContext':
        # Extrai IP considerando proxies (X-Forwarded-For, X-Real-IP)
        # Extrai User-Agent do header
        # Gera request_id se nao existir
```

---

### C) Campo crypto_tx_hash Separado

**Arquivo:** `/backend/app/models/wolkpay.py`

**Novos Campos no WolkPayBillPayment:**

- `crypto_tx_hash` - TX hash da blockchain (VARCHAR 128, indexado)
- `crypto_explorer_url` - URL do explorer (VARCHAR 500)

**Diferenca de internal_tx_id vs crypto_tx_hash:**

- `internal_tx_id` - ID interno do sistema (UUID)
- `crypto_tx_hash` - Hash real da transacao na blockchain (0x...)

**Migration:**

```sql
-- /backend/migrations/versions/add_crypto_tx_hash_fields.sql
ALTER TABLE wolkpay_bill_payments
ADD COLUMN crypto_tx_hash VARCHAR(128) NULL;

ALTER TABLE wolkpay_bill_payments
ADD COLUMN crypto_explorer_url VARCHAR(500) NULL;

CREATE INDEX ix_wolkpay_bill_crypto_tx_hash
ON wolkpay_bill_payments(crypto_tx_hash);

-- Migrar dados existentes
UPDATE wolkpay_bill_payments
SET crypto_tx_hash = internal_tx_id
WHERE internal_tx_id LIKE '0x%';
```

---

## Arquivos Modificados

1. **Models**

   - `/backend/app/models/wolkpay.py`
     - WolkPayBillPayment: +crypto_tx_hash, +crypto_explorer_url
     - WolkPayBillPaymentLog: +ip_address, +user_agent, +request_id

2. **Service**

   - `/backend/app/services/wolkpay_bill_service.py`
     - +RequestContext dataclass
     - \_log_event(): +ip_address, +user_agent, +request_id
     - quote_bill_payment(): +context parameter
     - confirm_bill_payment(): +context parameter
     - operator_pay_bill(): +context parameter
     - refund_bill_payment(): +context parameter
     - +get_payment_timeline() public method

3. **Router**

   - `/backend/app/routers/wolkpay_bill.py`
     - +import RequestContext
     - quote_bill_payment: extrai contexto e passa para service
     - confirm_bill_payment: extrai contexto e passa para service
     - operator_pay_bill: extrai contexto e passa para service
     - refund_bill_payment: extrai contexto e passa para service
     - +GET /payment/{payment_id}/timeline endpoint

4. **Migrations**
   - `/backend/migrations/versions/add_crypto_tx_hash_fields.sql`
   - `/backend/migrations/versions/add_log_audit_fields.sql`

---

## Como Aplicar as Migrations

```bash
# Conectar ao banco de producao
psql -h host -U user -d database

# Executar migrations
\i /backend/migrations/versions/add_crypto_tx_hash_fields.sql
\i /backend/migrations/versions/add_log_audit_fields.sql
```

---

## Testes

### Timeline Endpoint

```bash
curl -X GET "https://api.example.com/wolkpay/bill/payment/{payment_id}/timeline" \
  -H "Authorization: Bearer {token}"
```

### Verificar Logs com Auditoria

```sql
SELECT
  event,
  new_status,
  ip_address,
  user_agent,
  request_id,
  created_at
FROM wolkpay_bill_payment_logs
WHERE bill_payment_id = 'uuid'
ORDER BY created_at;
```
