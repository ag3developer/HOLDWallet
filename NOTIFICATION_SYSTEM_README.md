# 🔔 Sistema de Notificações - WOLK NOW

## Resumo da Implementação

Este documento descreve o sistema de notificações implementado para a plataforma WOLK NOW.

## Estrutura de Arquivos

```
backend/app/services/notifications/
├── __init__.py                    # Exports do módulo
├── email_templates.py             # Templates HTML multilíngue (PT/EN/ES)
├── notification_service.py        # Serviço principal de notificações
└── notification_integration.py    # Funções helper para integração
```

## Funcionalidades

### 1. Notificações de Trading P2P

- ✅ `notify_trade_started` - Quando um trade é iniciado
- ✅ `notify_trade_completed` - Quando um trade é concluído
- ✅ `notify_trade_cancelled` - Quando um trade é cancelado
- ✅ `notify_trade_dispute` - Quando uma disputa é aberta
- ✅ `notify_new_chat_message` - Nova mensagem no chat do trade

### 2. Notificações WolkPay (Invoices)

- ✅ `notify_invoice_created` - Fatura criada
- ✅ `notify_invoice_paid` - Fatura paga
- ✅ `notify_invoice_expired` - Fatura expirada

### 3. Notificações de Pagamento de Boletos

- ✅ `notify_bill_payment_processing` - Boleto sendo processado
- ✅ `notify_bill_payment_completed` - Boleto pago com sucesso
- ✅ `notify_bill_payment_failed` - Falha no pagamento

### 4. Notificações de Wallet

- ✅ `notify_deposit_received` - Depósito recebido
- ✅ `notify_withdrawal_submitted` - Saque enviado
- ✅ `notify_withdrawal_completed` - Saque concluído
- ✅ `notify_withdrawal_failed` - Saque falhou

### 5. Notificações de Conta

- ✅ `notify_welcome` - Email de boas-vindas
- ✅ `notify_kyc_status_change` - Mudança de status KYC

## Integrações Realizadas

### P2P Router (`/backend/app/routers/p2p.py`)

- Linha ~1380: Notificação quando trade é iniciado
- Linha ~1848: Notificação quando trade é completado

### WolkPay Service (`/backend/app/services/wolkpay_service.py`)

- Linha ~257: Notificação quando invoice é criada
- Linha ~1067: Notificação quando invoice é paga/aprovada

### Bill Payment Service (`/backend/app/services/wolkpay_bill_service.py`)

- Linha ~771: Notificação quando crypto é debitada (boleto em processamento)
- Linha ~879: Notificação quando boleto é pago

### Blockchain Deposit Service (`/backend/app/services/blockchain_deposit_service.py`)

- Linha ~444: Notificação quando depósito é confirmado

### Auth Router (`/backend/app/routers/auth.py`)

- Linha ~273: Notificação de boas-vindas após registro

## Suporte Multi-idioma

Todos os templates suportam 3 idiomas:

- 🇧🇷 Português (pt) - padrão
- 🇺🇸 Inglês (en)
- 🇪🇸 Espanhol (es)

O idioma é detectado automaticamente da tabela `user_settings.language`.

## Preferências de Notificação

O sistema respeita as preferências do usuário na tabela `notification_settings`:

- `trade_alerts` - Alertas de trade P2P
- `price_alerts` - Alertas de preço
- `security_alerts` - Alertas de segurança
- `marketing_emails` - Emails de marketing
- `weekly_report` - Relatório semanal

## Como Usar

### Importar funções

```python
from app.services.notifications import (
    notify_trade_started,
    notify_trade_completed,
    fire_and_forget
)
```

### Chamar notificação (fire and forget)

```python
# Fire and forget - não bloqueia a execução
fire_and_forget(notify_trade_started(
    db=db,
    trade_id=str(trade_id),
    buyer_id=str(buyer_id),
    seller_id=str(seller_id),
    cryptocurrency="USDT",
    amount=100.0,
    total_fiat=500.0
))
```

### Chamar notificação (aguardar resultado)

```python
# Aguarda o resultado
await notify_trade_completed(
    db=db,
    trade_id=str(trade_id),
    buyer_id=str(buyer_id),
    seller_id=str(seller_id),
    cryptocurrency="USDT",
    amount=100.0,
    total_fiat=500.0,
    fee_amount=2.5
)
```

## Provider de Email

O sistema usa o **Resend** como provider de email.

### Configuração

- API Key: `RESEND_API_KEY` (variável de ambiente no DigitalOcean)
- FROM Email: `WOLK NOW <hello@wolknow.com>`
- Domínio verificado: `wolknow.com`

## Pendências e Melhorias Futuras

1. **Integrar com chat P2P real** - Quando a tabela `p2p_trade_messages` for implementada
2. **Notificações push** - Adicionar suporte a push notifications mobile
3. **Webhook de eventos** - Para integrações externas
4. **Fila de emails** - Para maior resiliência (RabbitMQ/Redis)
5. **Templates customizáveis** - Admin pode editar templates

## Testes

Para testar as notificações em desenvolvimento:

```python
# test_notifications.py
import asyncio
from app.db.database import get_db_session
from app.services.notifications import notify_welcome

async def test():
    db = next(get_db_session())
    await notify_welcome(
        db=db,
        user_id="test-uuid",
        user_email="test@example.com",
        user_name="Test User"
    )

asyncio.run(test())
```

---

**Data de Implementação:** Janeiro 2026
**Autor:** WOLK NOW Team
