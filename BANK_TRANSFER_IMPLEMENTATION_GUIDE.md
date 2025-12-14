# 🏦 HOLD Wallet - Bank Transfer Payment Integration (TransfBank)

**Data:** 11 de Dezembro de 2025  
**Status:** 🟢 Código pronto para integração  
**Tempo para deploy:** 1-2 dias

---

## 📋 O QUE VOCÊ TEM

✅ Dados bancários estruturados no banco de dados  
✅ Modelo P2P completo com suporte a payment methods  
✅ Sistema de reputação com múltiplos payment methods  
✅ Instant Trade já integrado com webhook capability

---

## 🚀 COMO USAR TRANSFERÊNCIA BANCÁRIA AGORA

### Passo 1: Registre seus dados bancários

Você precisa ter uma conta bancária HOLD para receber as transferências:

```
Banco: Itaú (341) ou banco de sua escolha
Agência: 0001 (ou sua agência)
Conta: 12345
Dígito: 6
Nome: HOLD Wallet
CNPJ: XX.XXX.XXX/0001-XX
```

### Passo 2: Configure a chave API do TransfBank

Adicione ao seu `.env`:

```bash
# TransfBank API Configuration
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=sk_live_xxxxxxxxxxxxx
TRANSFBANK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Fallback para PIX (futura integração)
PIX_GATEWAY=transfbank  # ou "dict", "gerencianet", etc
```

### Passo 3: Adicione o router ao seu main.py

```python
# Em backend/app/main.py

from app.routers import bank_transfer_payments

# Registrar o router
app.include_router(bank_transfer_payments.router)
```

### Passo 4: Integre ao Instant Trade

Na sua rota de criar trade, quando o pagamento é necessário:

```python
# Em app/routers/instant_trade.py

from app.services.bank_transfer_service import get_bank_transfer_service

@router.post("/create")
async def create_trade(
    quote_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... validações ...

    # Se pagamento necessário (trade tipo "buy"):
    bank_service = get_bank_transfer_service(db)

    transfer_request = await bank_service.create_transfer_request(
        user_id=str(user.id),
        amount=Decimal(str(trade_data["amount_brl"])),
        description=f"Compra de {quote_data['symbol']}",
        reference_code=f"HOLD-2025-{trade_id}"
    )

    # Retornar instruções de pagamento
    return {
        "trade_id": trade_id,
        "status": "pending_payment",
        "payment_instructions": transfer_request,
        "expires_at": transfer_request["expires_at"]
    }
```

---

## 💡 COMO FUNCIONA O FLUXO

```
1. Usuário cria um trade (BUY de 0.05 BTC)
   ↓
2. Sistema cria uma solicitação de transferência
   ↓
3. Retorna:
   - Conta bancária HOLD para depositar
   - Valor exato: R$ 1.234,56
   - Referência: HOLD-2025-ABC123
   - Prazo: 15 minutos (expires_at)
   ↓
4. Usuário faz transferência de R$ 1.234,56
   - Para: Conta HOLD Wallet
   - Descrição: "HOLD-2025-ABC123" ou outro código
   ↓
5. TransfBank webhook confirma o recebimento
   ↓
6. Sistema completa o trade automaticamente
   - Libera o BTC para a carteira do usuário
   - Gera comprovante
   - Notifica o usuário
```

---

## 📊 ENDPOINTS DISPONÍVEIS

### 1. Listar bancos suportados

```bash
GET /api/v1/payments/bank/banks
Authorization: Bearer {token}

RESPOSTA:
{
  "banks": {
    "001": "Banco do Brasil",
    "033": "Banco Santander",
    "041": "Banco do Estado de São Paulo",
    "104": "Caixa Econômica Federal",
    "237": "Bradesco",
    "341": "Itaú Unibanco",
    ...
  },
  "total": 16
}
```

### 2. Validar conta bancária (Opcional)

```bash
POST /api/v1/payments/bank/validate-account
Authorization: Bearer {token}

{
  "bank_code": "341",
  "agency": "0001",
  "account_number": "12345"
}

RESPOSTA:
{
  "valid": true,
  "message": "Conta válida"
}
```

### 3. Criar solicitação de transferência

```bash
POST /api/v1/payments/bank/create-transfer
Authorization: Bearer {token}

{
  "trade_id": "HOLD-2025-ABC123",
  "amount_brl": 1234.56,
  "description": "Compra de 0.05 BTC"
}

RESPOSTA:
{
  "transfer_id": "TRF_ABC123",
  "status": "pending",
  "amount_brl": 1234.56,
  "bank_account": {
    "bank_code": "341",
    "bank_name": "Itaú Unibanco",
    "agency": "0001",
    "account_number": "12345",
    "account_digit": "6",
    "account_name": "HOLD Wallet"
  },
  "reference_code": "HOLD-2025-ABC123",
  "expires_at": "2025-12-11T20:15:00",
  "instructions": "Faça uma transferência de R$ 1.234,56 para a conta HOLD Wallet..."
}
```

### 4. Consultar status da transferência

```bash
GET /api/v1/payments/bank/transfer/TRF_ABC123
Authorization: Bearer {token}

RESPOSTA:
{
  "transfer_id": "TRF_ABC123",
  "status": "confirmed",
  "amount_received": 1234.56,
  "received_at": "2025-12-11T20:10:00",
  "sender_bank": "341 - Itaú"
}
```

### 5. Webhook de confirmação (TransfBank → Seu servidor)

```bash
POST /api/v1/payments/bank/webhook/transfer
X-TransfBank-Signature: hmac-sha256-signature

{
  "transfer_id": "TRF_ABC123",
  "status": "confirmed",
  "amount_received": 1234.56,
  "received_at": "2025-12-11T20:10:00",
  "sender_name": "João Silva",
  "sender_bank": "341",
  "metadata": {
    "trade_id": "HOLD-2025-ABC123",
    "user_id": "uuid-user"
  }
}
```

---

## 🔐 SEGURANÇA

### Signature Verification (Webhook)

Sempre verifique a signature do webhook:

```python
import hmac
import hashlib
import json

def verify_webhook_signature(body: dict, signature: str, api_key: str) -> bool:
    body_str = json.dumps(body, separators=(',', ':'), sort_keys=True)
    expected_sig = hmac.new(
        api_key.encode(),
        body_str.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_sig, signature)
```

### Best Practices

✅ Nunca exponha API keys  
✅ Sempre verifique signatures de webhooks  
✅ Usar timeout para requests (15s)  
✅ Validar valores e limites de transferência  
✅ Registrar todas as transações  
✅ Implementar retry logic com exponential backoff

---

## 🎯 ROADMAP PIX AUTOMÁTICO (PRÓXIMA FASE)

Depois que TransfBank estiver funcionando:

### Semana 1: PIX Basic

```
- Integrar Dict PIX (Banco Central)
- Gerar QR Code PIX dinâmico
- Receber confirmação via webhook
```

### Semana 2: PIX Advanced

```
- PIX como fallback automático (se banco transfer falhar)
- Suportar múltiplas chaves PIX
- Integrar com mais gateways (Gerencianet, Stone)
```

### Semana 3: PIX Automático

```
- Auto-complete trades com PIX
- 0 segundos de delay
- Melhor experiência do usuário
```

---

## 💰 COMO GERAR REVENUE

### Cenário 1: Usuário quer COMPRAR 0.05 BTC

```
Preço BTC: R$ 250.000
Usuário precisa pagar: R$ 12.500

SEU GANHO:
- Spread 3%: R$ 375
- Taxa de rede: R$ 31,25
- TOTAL: R$ 406,25

TEMPO: Menos de 1 minuto (após confirmação do banco)
```

### Cenário 2: Usuário quer VENDER 0.05 BTC

```
Preço BTC: R$ 250.000
Usuário receberá: R$ 12.500 (menos taxas)

SEU GANHO:
- Spread 3%: R$ 375
- Taxa de rede: R$ 31,25
- TOTAL: R$ 406,25
```

### Estimativa de Revenue (Mensal)

```
Cenário 1: 10 trades/dia de R$ 10k
- Revenue/dia: R$ 1.000 (2x spread + taxa)
- Revenue/mês: R$ 30.000

Cenário 2: 50 trades/dia de R$ 10k
- Revenue/dia: R$ 5.000
- Revenue/mês: R$ 150.000

Cenário 3: 200 trades/dia de R$ 10k
- Revenue/dia: R$ 20.000
- Revenue/mês: R$ 600.000
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Hoje

- [ ] Configurar conta TransfBank (20 min)
- [ ] Adicionar .env variables (5 min)
- [ ] Testar conexão com API (30 min)

### Amanhã

- [ ] Integrar router ao main.py (10 min)
- [ ] Testar criar transferência (30 min)
- [ ] Testar webhook (1 hora)
- [ ] Integrar ao Instant Trade (1-2 horas)

### Depois (Próxima semana)

- [ ] Integrar ao P2P
- [ ] Testar com usuários reais
- [ ] Setup do PIX automático

---

## 🚨 ERROS COMUNS

### Erro 1: "API key inválida"

**Solução:** Verificar .env, reiniciar servidor

### Erro 2: "Webhook não recebido"

**Solução:**

- Verificar firewall/porta aberta
- Configurar URL pública no TransfBank
- Validar que seu servidor é acessível

### Erro 3: "Timeout na validação"

**Solução:** Aumentar timeout em config ou checar API TransfBank

### Erro 4: "Transfer não encontrada"

**Solução:**

- Verificar transfer_id está correto
- Checar se transferência foi criada
- Validar período (transferências expiram em 30 min)

---

## 📞 SUPORTE TransfBank

- Website: https://transfbank.com.br
- Docs: https://docs.transfbank.com.br
- Email: api@transfbank.com.br
- Chat: https://transfbank.com.br/suporte

---

## ✨ PRÓXIMOS PASSOS

1. **Hoje:** Registre-se no TransfBank, pegue API key
2. **Amanhã:** Configure no projeto e teste
3. **Próxima semana:** Deploy para staging
4. **Depois:** Deploy para produção com PIX automático

---

**Status:** 🟢 Pronto para implementar  
**Tempo estimado:** 1-2 dias  
**Complexidade:** Baixa a Média

_Documentação criada: 11 de Dezembro de 2025_
