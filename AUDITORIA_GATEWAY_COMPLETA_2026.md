# 🔍 Auditoria Completa do Módulo WolkPay Gateway

**Data:** 26 de maio de 2026  
**Branch:** `main`  
**Escopo:** Backend + Frontend + Banco de Dados + Integração PIX BB

---

## 🚨 RESUMO EXECUTIVO

Foram identificados **5 problemas CRÍTICOS** e **8 problemas IMPORTANTES** que explicam diretamente os bugs relatados:

1. ❌ Dashboard do merchant zerado → **Mismatch total de nomes de campos entre backend e frontend**
2. ❌ Pagamentos PIX não confirmados automaticamente → **Sistema só depende do webhook do BB (sem fallback de polling), e o `confirm_pix_payment` para no status `CONFIRMED` mas nunca chega em `COMPLETED`**
3. ❌ Admin Wolknow não vê pagamento confirmado → **Filtro do admin usa `status == COMPLETED`, mas pagamentos param em `CONFIRMED`**

---

## 1. 🔥 BUGS CRÍTICOS

### CRÍTICO #1 — Mismatch de Campos `MerchantProfile`

**Sintoma:** Dashboard do cliente exibe "undefined", "Dashboard do Merchant" genérico, nome da empresa não aparece.

**Causa:**  
O backend `MerchantResponse` (`backend/app/schemas/gateway.py` linha 234) retorna:

```python
company_name, trade_name, cnpj, email, phone, website, owner_name, ...
```

Mas o frontend `MerchantProfile` (`Frontend/src/services/gatewayService.ts` linha 30) espera:

```typescript
business_name, business_document, business_email, business_phone, website_url, ...
```

**Resultado:** Dashboard renderiza `merchant?.business_name` → `undefined` → exibe fallback `"Dashboard do Merchant"`. Todos os campos da página de Settings também ficam vazios.

**Impacto:** TODOS os clientes veem dashboard "zerado" no que diz respeito ao nome da empresa, contato, etc.

---

### CRÍTICO #2 — Mismatch de Campos `MerchantStats` (Dashboard ZERADO)

**Sintoma:** Volume Total = R$ 0,00; Transações = 0; Taxa de Sucesso = 0%; Pendentes = 0.

**Causa:**  
O backend `merchant_service.get_merchant_stats()` retorna:

```python
{
  "total_payments": int,
  "total_completed": int,      # ← backend
  "total_pending": int,        # ← backend
  "total_volume_brl": str,
  "total_fees_collected": str,
  "total_settled": str,
  "pending_settlement": str
}
```

Mas o frontend (`GatewayDashboardPage.tsx`) lê:

```typescript
stats?.total_volume; // ← não existe (correto seria total_volume_brl, mas como string)
stats?.total_transactions; // ← não existe (correto seria total_payments)
stats?.success_rate; // ← não existe (não é calculado pelo backend)
stats?.pending_payments; // ← não existe (backend usa total_pending)
stats?.pending_volume; // ← não existe
stats?.volume_change; // ← não existe
stats?.transactions_change; // ← não existe
stats?.today_volume; // ← não existe (backend nem retorna stats de hoje)
stats?.today_transactions; // ← não existe
```

**Resultado:** Como nenhum campo bate, tudo cai no `|| 0`. **Dashboard 100% zerado.**

**Impacto:** TODOS os clientes que processaram pagamentos vêem o dashboard zerado mesmo tendo dados no banco.

---

### CRÍTICO #3 — Pagamentos PIX param em `CONFIRMED` e nunca chegam em `COMPLETED`

**Sintoma:** Cliente pagou, mas dashboard mostra "Pendente" (e admin não detecta).

**Causa:**

1. O método `confirm_pix_payment()` (`payment_service.py` linha 455) seta status para `CONFIRMED` e chama `_auto_complete_payment()`.
2. O frontend `GatewayDashboardPage.tsx` linha 99 considera AMBOS `COMPLETED` e `CONFIRMED` como ícone de sucesso — então o ícone vai mostrar OK, MAS:
3. **As STATS só contam `status == COMPLETED`** (`merchant_service.py` linha 545):
   ```python
   total_completed = query.filter(GatewayPayment.status == GatewayPaymentStatus.COMPLETED).count()
   total_volume = sum(p.amount_requested for p in completed_payments)
   ```
4. **O admin geral (`gateway_admin.py` linha 269)** também só conta `COMPLETED`:
   ```python
   GatewayPayment.status == GatewayPaymentStatus.COMPLETED
   ```

**Resultado:** Pagamento confirmado pelo BB fica em `CONFIRMED`, mas todas as métricas (cliente e admin) usam `COMPLETED`. Resultado: tudo fica zerado mesmo após o pagamento.

**Impacto:** **TODOS** os pagamentos PIX recebidos. Tanto cliente quanto admin não veem como "pago".

---

### CRÍTICO #4 — Não Existe Polling do BB; Depende 100% do Webhook

**Sintoma:** Mesmo que o cliente pague, se o webhook do BB falhar (rede, timeout, URL errada no painel BB), o pagamento **NUNCA** é confirmado.

**Causa:**

- `gateway_callbacks.py /pix/bb` é a ÚNICA forma de confirmação.
- Não há scheduler (APScheduler, cron, etc) chamando `bb_service.verificar_pagamento(txid)` para PIX pendentes.
- O método `bb_service.consultar_cobranca(txid)` existe (`banco_brasil_service.py` linha 566) mas **NUNCA é chamado em background**.
- Nenhum log/registro confirma que a URL do webhook foi configurada no BB (`configurar_webhook()` existe mas não vejo chamada na startup).

**Impacto:** Qualquer falha temporária do webhook = pagamentos perdidos para sempre (até alguém olhar manualmente).

---

### CRÍTICO #5 — Endpoint `/merchants/me/payments` Retorna Estrutura Errada

**Sintoma:** Lista de "Pagamentos Recentes" no dashboard pode estar vazia mesmo havendo dados.

**Causa:**  
Backend (`gateway.py` linha 393) retorna:

```python
PaginatedResponse(
    items=[...],            # ← chave "items"
    total=...,
    page=...,
    ...
)
```

Frontend (`gatewayService.ts` linha 521-533) lê:

```typescript
const response = await apiClient.get("/gateway/merchants/me/payments?...");
return response.data; // espera { payments: [...] }
```

E o consumidor:

```typescript
setRecentPayments(paymentsData.payments || []); // ← acessa .payments mas backend retorna .items
```

**Resultado:** `recentPayments` fica sempre `[]` mesmo com pagamentos no banco.

**Impacto:** Lista de pagamentos recentes sempre vazia no dashboard.

---

## 2. 🟡 PROBLEMAS IMPORTANTES

### IMPORTANTE #1 — Schema `PaymentListItem` (frontend) ≠ Backend

Frontend espera `payment_code`, `payer_name`, `payer_email`, `paid_at`.  
Backend `PaymentListResponse` retorna `payment_id`, `customer_name`, `customer_email`, `confirmed_at`/`completed_at`.

### IMPORTANTE #2 — `WebhookConfig` Frontend lê de endpoint errado

`getWebhookConfig` chama `/gateway/merchants/me` e tenta extrair `webhook_url`/`webhook_secret` do merchant — mas `webhook_secret` não está no schema `MerchantResponse`. Frontend recebe `undefined`.

### IMPORTANTE #3 — Falta Endpoint para Confirmação Manual pelo Admin

Se o webhook falhar, o admin não tem botão "Confirmar Pagamento Manualmente" no `AdminMerchantDetailPage`. Solução só via SQL direto.

### IMPORTANTE #4 — `_auto_complete_payment` Pode Não Estar Sendo Disparado

Precisa verificar se `_auto_complete_payment` realmente roda e move `CONFIRMED → COMPLETED`. Se não roda (ou tem condição que falha), nenhum pagamento será nunca `COMPLETED`.

### IMPORTANTE #5 — Settings Tab Ainda Tem Campos com Nomes Errados

Frontend `GatewaySettingsPage.tsx` envia `business_name` no PUT — mas `MerchantUpdate` schema só aceita `trade_name`, `phone`, `website`, etc. **Salvamentos parciais ou ignorados silenciosamente.**

### IMPORTANTE #6 — Sem Reconciliação Diária

Não existe job que, ao fim do dia, liste todos PIX pendentes e consulte status no BB para detectar pagamentos perdidos pelo webhook.

### IMPORTANTE #7 — Logs de Webhook Recebido do BB Não Persistem

`gateway_callbacks.py` só faz `logger.info`, não grava na tabela `gateway_audit_logs` quando o webhook chega. Difícil debugar.

### IMPORTANTE #8 — Endpoint `getMerchantStats` Não Filtra por Período Padrão

Sem `date_from`/`date_to`, soma todo histórico. Frontend espera comparação "vs período anterior" (`volume_change`), mas backend não calcula.

---

## 3. 📊 MATRIZ DE INCONSISTÊNCIAS BACKEND vs FRONTEND

### MerchantProfile

| Frontend espera      | Backend retorna          | Status |
| -------------------- | ------------------------ | ------ |
| `business_name`      | `company_name`           | ❌     |
| `business_document`  | `cnpj`                   | ❌     |
| `business_email`     | `email`                  | ❌     |
| `business_phone`     | `phone`                  | ❌     |
| `website_url`        | `website`                | ❌     |
| `settlement_crypto`  | `settlement_currency`    | ❌     |
| `settlement_network` | (não existe no Response) | ❌     |
| `fee_percentage`     | `custom_fee_percent`     | ❌     |
| `approved_at`        | `activated_at`           | ❌     |
| `webhook_secret`     | (não retornado)          | ❌     |

### MerchantStats

| Frontend espera         | Backend retorna                 | Status |
| ----------------------- | ------------------------------- | ------ |
| `total_volume`          | `total_volume_brl` (string)     | ❌     |
| `total_transactions`    | `total_payments` (int)          | ❌     |
| `completed_payments`    | `total_completed`               | ❌     |
| `pending_payments`      | `total_pending`                 | ❌     |
| `total_fees_brl`        | `total_fees_collected` (string) | ❌     |
| `net_volume_brl`        | (não existe)                    | ❌     |
| `today_volume_brl`      | (não existe)                    | ❌     |
| `today_payments`        | (não existe)                    | ❌     |
| `this_month_volume_brl` | (não existe)                    | ❌     |
| `success_rate`          | (não calculado)                 | ❌     |
| `volume_change`         | (não calculado)                 | ❌     |

### PaginatedResponse (lista de pagamentos)

| Frontend espera | Backend retorna | Status |
| --------------- | --------------- | ------ |
| `payments[]`    | `items[]`       | ❌     |
| `total_pages`   | `pages`         | ❌     |

---

## 4. 🩺 DIAGNÓSTICO DOS FLUXOS DE PAGAMENTO PIX

### Fluxo Atual (com bugs)

```
1. Cliente paga PIX
2. BB envia POST /gateway/callbacks/pix/bb  ──┐
                                               │ se falhar → pagamento perdido
3. confirm_pix_payment() encontra pelo txid    │
4. Seta status = CONFIRMED ─────────── stops here em muitos casos
5. _auto_complete_payment() deveria mover para COMPLETED
   └→ Não confirmado se funciona em produção
6. Dashboard/Admin consultam status == COMPLETED → 0 resultados
```

### Fluxo Ideal

```
1. Cliente paga PIX
2. BB envia webhook  (fonte primária)
3a. Poller (job a cada 2 min) verifica PIX pendentes com bb_service.consultar_cobranca()
3b. Polling de segurança: pega o que webhook perdeu
4. confirm_pix_payment() → status = CONFIRMED
5. _auto_complete_payment() OU job batch → status = COMPLETED
6. Webhook do MERCHANT é disparado
7. Dashboard/Admin contam tanto CONFIRMED quanto COMPLETED como "pago"
```

---

## 5. 🔧 PLANO DE CORREÇÃO PRIORIZADO

### FASE 1 — Hotfix Imediato (1-2h) — Dashboard volta a mostrar dados

1. **[BACKEND]** Em `merchant_service.get_merchant_stats()`, alinhar nomes ao frontend (`total_volume`, `total_transactions`, `completed_payments`, `pending_payments`, `today_volume`, `today_transactions`, `success_rate`, etc.).
2. **[BACKEND]** Stats e admin: **incluir status `CONFIRMED` no que conta como "pago"** (não só `COMPLETED`).
3. **[BACKEND]** `/merchants/me/payments`: retornar `payments` em vez de `items` (ou criar segundo endpoint compatível).
4. **[BACKEND]** `MerchantResponse`: adicionar aliases `business_name`, `business_email`, etc. ou criar `MerchantProfileResponse` específico para o dashboard.

### FASE 2 — Confirmação de Pagamento (2-4h) — Pagamentos PIX deixam de ficar "pendurados"

5. **[BACKEND]** Verificar e corrigir `_auto_complete_payment()` para mover `CONFIRMED → COMPLETED` corretamente.
6. **[BACKEND]** Criar job APScheduler que roda a cada 2 minutos:
   - Lista todos os `GatewayPayment` com `payment_method=PIX` e `status in (PENDING, PROCESSING)` criados nas últimas 24h
   - Chama `bb_service.verificar_pagamento(p.pix_txid)`
   - Se pago → chama `confirm_pix_payment()`
7. **[BACKEND]** Criar endpoint admin `POST /admin/gateway/payments/{id}/confirm-manual` para confirmar manualmente (com auditoria).
8. **[BACKEND]** Persistir webhook recebido em `gateway_audit_logs` para auditoria.

### FASE 3 — Frontend (2-3h)

9. **[FRONTEND]** Atualizar tipos `MerchantProfile`, `MerchantStats`, `PaymentListItem`, `PaymentListResponse` para bater com backend.
10. **[FRONTEND]** Refazer `GatewaySettingsPage` para enviar campos corretos no PUT.
11. **[FRONTEND]** Aceitar tanto `payments` quanto `items` na lista (compatibilidade).

### FASE 4 — Painel Admin (1-2h)

12. **[BACKEND/FRONTEND]** Adicionar tab "Reconciliar PIX" no AdminMerchantDetailPage que lista PIX pendentes >30min e permite forçar verificação.
13. **[FRONTEND]** Adicionar coluna "Status Real BB" nos pagamentos do admin para comparar com status local.

---

## 6. 📋 RESUMO DE ARQUIVOS A ALTERAR

| Arquivo                                                         | Alterações                           | Prioridade |
| --------------------------------------------------------------- | ------------------------------------ | ---------- |
| `backend/app/services/gateway/merchant_service.py`              | Rewrite `get_merchant_stats()`       | 🔴 CRÍTICA |
| `backend/app/routers/gateway.py`                                | Endpoint stats + payments retorno    | 🔴 CRÍTICA |
| `backend/app/routers/admin/gateway_admin.py`                    | Filtros incluindo `CONFIRMED`        | 🔴 CRÍTICA |
| `backend/app/services/gateway/payment_service.py`               | Verificar `_auto_complete_payment()` | 🔴 CRÍTICA |
| `backend/app/jobs/pix_reconciliation_job.py`                    | **NOVO**: poller BB                  | 🔴 CRÍTICA |
| `backend/app/main.py`                                           | Registrar scheduler no startup       | 🔴 CRÍTICA |
| `Frontend/src/services/gatewayService.ts`                       | Atualizar tipos                      | 🟡 ALTA    |
| `Frontend/src/pages/gateway/dashboard/GatewayDashboardPage.tsx` | Adaptar leitura                      | 🟡 ALTA    |
| `Frontend/src/pages/gateway/dashboard/GatewaySettingsPage.tsx`  | Campos corretos no PUT               | 🟡 MÉDIA   |

---

## 7. ✅ PRÓXIMOS PASSOS

Quer que eu comece pela **FASE 1** (hotfix dashboard) agora? Em ~1h consigo:

- ✅ Dashboard do cliente parar de mostrar zero
- ✅ Pagamentos `CONFIRMED` contarem como pagos (cliente e admin)
- ✅ Lista de pagamentos recentes aparecer

Depois sigo para FASE 2 (poller PIX) que é o que vai resolver de vez a confirmação automática.
